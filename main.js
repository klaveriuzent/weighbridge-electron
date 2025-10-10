// ===================================================
// Main Process - Electron Entry Point
// ===================================================
const { app, BrowserWindow, ipcMain } = require("electron");
const { SerialPort } = require("serialport");
const path = require("path");
const fs = require("fs");
const DigestFetch = require("digest-fetch").default;
const ort = require("onnxruntime-node");
const sharp = require("sharp");

let mainWindow = null;
let currentPort = null;
let plateSession = null;

// Nonaktifkan cache GPU Windows
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

// ===================================================
// Fungsi utama untuk membuat jendela Electron
// ===================================================
function createWindow() {
    const isDev = process.env.NODE_ENV === "development";
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
    } else {
        const distPath = path.join(__dirname, "dist", "index.html");
        mainWindow.loadFile(distPath);
    }
}

// ===================================================
// Serial Port Handlers
// ===================================================
ipcMain.handle("list-serial-ports", async () => {
    try {
        const ports = await SerialPort.list();
        return ports.map((p) => ({
            path: p.path,
            manufacturer: p.manufacturer,
            serialNumber: p.serialNumber,
            vendorId: p.vendorId,
            productId: p.productId,
        }));
    } catch (err) {
        console.error("❌ Gagal membaca COM port:", err);
        return [];
    }
});

ipcMain.handle("open-serial-port", async (_event, pathName) => {
    try {
        if (currentPort && currentPort.isOpen) currentPort.close();
        currentPort = new SerialPort({ path: pathName, baudRate: 9600 });
        currentPort.on("data", (data) => {
            const text = data.toString().trim();
            if (mainWindow) mainWindow.webContents.send("serial-data", text);
        });
        return { status: "opened", path: pathName };
    } catch (err) {
        console.error("❌ Gagal membuka port:", err);
        return { status: "error", message: err.message };
    }
});

ipcMain.handle("close-serial-port", async () => {
    try {
        if (currentPort && currentPort.isOpen) {
            currentPort.close();
            currentPort = null;
            return { status: "closed" };
        }
        return { status: "no_port" };
    } catch (err) {
        console.error("❌ Gagal menutup port:", err);
        return { status: "error", message: err.message };
    }
});

// ===================================================
// CCTV Fetch Handler (Digest Auth Hikvision)
// ===================================================
ipcMain.handle("fetch-cctv-image", async (_event, { link, username, password }) => {
    try {
        if (!link || !username || !password)
            return { status: "error", message: "Parameter tidak lengkap" };

        console.log("📸 Fetch CCTV (Digest Auth) from:", link);
        const client = new DigestFetch(username, password, { algorithm: "MD5" });
        const res = await client.fetch(link, {
            method: "GET",
            headers: { Accept: "image/jpeg", "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        const base64Image = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
        return { status: "success", image: base64Image };
    } catch (err) {
        console.error("❌ Gagal ambil gambar CCTV:", err);
        return { status: "error", message: err.message };
    }
});

// ===================================================
// Utils
// ===================================================
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function iou(boxA, boxB) {
    const x1 = Math.max(boxA.x, boxB.x);
    const y1 = Math.max(boxA.y, boxB.y);
    const x2 = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
    const y2 = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);
    const w = Math.max(0, x2 - x1);
    const h = Math.max(0, y2 - y1);
    const inter = w * h;
    const union = boxA.w * boxA.h + boxB.w * boxB.h - inter;
    return inter / union;
}

// ===================================================
// YOLOv2-style Decoder (sesuai C# ExtractBoxes())
// ===================================================
function decodeYoloCustom(output, anchors, labels, probThreshold = 0.1, iouThreshold = 0.45) {
    const [batch, C, H, W] = output.dims;
    const data = output.data;
    const numAnchors = anchors.length / 2;
    const numClasses = (C / numAnchors) - 5;
    const stride = H * W;
    const boxes = [];

    for (let gridY = 0; gridY < H; gridY++) {
        for (let gridX = 0; gridX < W; gridX++) {
            let offset = 0;
            const base = gridX + gridY * W;

            for (let a = 0; a < numAnchors; a++) {
                const tx = data[base + (offset++ * stride)];
                const ty = data[base + (offset++ * stride)];
                const tw = data[base + (offset++ * stride)];
                const th = data[base + (offset++ * stride)];
                const tobj = data[base + (offset++ * stride)];

                const x = (sigmoid(tx) + gridX) / W;
                const y = (sigmoid(ty) + gridY) / H;
                const w = Math.exp(tw) * anchors[a * 2] / W;
                const h = Math.exp(th) * anchors[a * 2 + 1] / H;

                const objectness = sigmoid(tobj);
                const classProbs = [];
                for (let j = 0; j < numClasses; j++) {
                    classProbs.push(data[base + (offset++ * stride)]);
                }

                // softmax
                const max = Math.max(...classProbs);
                const exp = classProbs.map((v) => Math.exp(v - max));
                const sum = exp.reduce((a, b) => a + b);
                const probs = exp.map((v) => (v / sum) * objectness);

                const maxProb = Math.max(...probs);
                if (maxProb > probThreshold) {
                    boxes.push({
                        x: x - w / 2,
                        y: y - h / 2,
                        w,
                        h,
                        confidence: maxProb,
                        label: labels[probs.indexOf(maxProb)],
                    });
                }
            }
        }
    }

    // Non-Maximum Suppression (NMS)
    boxes.sort((a, b) => b.confidence - a.confidence);
    const selected = [];
    boxes.forEach((box) => {
        if (!selected.some((b) => iou(b, box) > iouThreshold)) selected.push(box);
    });

    console.log("📊 [DEBUG] Total box sebelum filter:", boxes.length);
    if (boxes.length) {
    const avgConf = (boxes.reduce((a, b) => a + b.confidence, 0) / boxes.length).toFixed(3);
    console.log(`📊 [DEBUG] Rata-rata confidence: ${avgConf}`);
    }

    return selected;
}

// ===================================================
// IPC Handler: Jalankan Deteksi Plat Nomor
// ===================================================
ipcMain.handle("run-plate-detection", async (_event, imageInput) => {
    try {
        if (!plateSession) throw new Error("Model belum siap");
        if (!imageInput) throw new Error("Input gambar kosong");

        let imageBuffer = null;
        if (typeof imageInput === "string" && imageInput.startsWith("data:image")) {
            const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, "");
            imageBuffer = Buffer.from(base64Data, "base64");
        } else if (fs.existsSync(imageInput)) {
            imageBuffer = fs.readFileSync(imageInput);
        } else {
            throw new Error("Input gambar tidak valid");
        }

        const meta = await sharp(imageBuffer).metadata();
        const origW = meta.width || 0;
        const origH = meta.height || 0;
        if (!origW || !origH) throw new Error("Metadata gambar tidak valid");

        const inputSize = 416;
        const resized = await sharp(imageBuffer)
            .resize(inputSize, inputSize, { fit: "fill" })
            .removeAlpha()
            .raw()
            .toBuffer();

        // ==================================================
        // 🔁 Buat tensor NCHW (Channel, Height, Width)
        // ==================================================
        const size = inputSize * inputSize;
        const floatCHW = new Float32Array(3 * size);

        // Gunakan BGR jika model dilatih dari OpenCV
        for (let i = 0; i < size; i++) {
            floatCHW[i] = resized[i * 3 + 2] / 255.0;       // B
            floatCHW[size + i] = resized[i * 3 + 1] / 255.0; // G
            floatCHW[2 * size + i] = resized[i * 3] / 255.0; // R
        }

        console.log("🧠 [DEBUG] Tensor sample (first 12):", Array.from(floatCHW.slice(0, 12)));

        // Tensor sesuai format model: NCHW
        const inputTensor = new ort.Tensor("float32", floatCHW, [1, 3, inputSize, inputSize]);
        const feeds = { [plateSession.inputNames[0]]: inputTensor };

        const results = await plateSession.run(feeds);
        const output = results[plateSession.outputNames[0]];

        console.log("🧩 [ONNX] Output dims:", output.dims);

        const anchors = [0.573, 0.677, 1.87, 2.06, 3.34, 5.47, 7.88, 3.53, 9.77, 9.17];
        const labels = ["plate"];
        const detections = decodeYoloCustom(output, anchors, labels, 0.01, 0.45);

        console.log(`📊 [DEBUG] Total box sebelum filter: ${detections.length}`);
        if (detections.length === 0) {
            console.warn("⚠️ [ONNX] Tidak ada objek terdeteksi");
            return { status: "no_plate", message: "Tidak ada plat terdeteksi" };
        }

        const best = detections.sort((a, b) => b.confidence - a.confidence)[0];
        console.log(`📊 [ONNX] Confidence tertinggi: ${(best.confidence * 100).toFixed(1)}%`);

        const x1 = Math.max(0, Math.floor(best.x * origW));
        const y1 = Math.max(0, Math.floor(best.y * origH));
        const w = Math.max(10, Math.floor(best.w * origW));
        const h = Math.max(10, Math.floor(best.h * origH));
        const x2 = Math.min(origW - 1, x1 + w);
        const y2 = Math.min(origH - 1, y1 + h);

        console.log(`🧭 [ONNX] Crop box: x=${x1}, y=${y1}, w=${w}, h=${h}`);

        const croppedBuffer = await sharp(imageBuffer)
            .extract({ left: x1, top: y1, width: w, height: h })
            .jpeg()
            .toBuffer();

        const base64Cropped = `data:image/jpeg;base64,${croppedBuffer.toString("base64")}`;

        console.log(`✅ [ONNX] Plat terdeteksi (confidence ${(best.confidence * 100).toFixed(1)}%)`);

        return {
            status: "success",
            confidence: best.confidence,
            box: { x1, y1, x2, y2 },
            croppedImage: base64Cropped,
        };
    } catch (err) {
        console.error("🟥 [ONNX] Gagal deteksi plat:", err.message);
        return { status: "error", message: err.message };
    }
});

// ===================================================
// App Lifecycle
// ===================================================
app.whenReady().then(async () => {
    try {
        const modelPath = path.join(__dirname, "models", "plate_detector.onnx");
        console.log("🧠 [ONNX] Loading model from:", modelPath);
        plateSession = await ort.InferenceSession.create(modelPath);
        console.log("✅ [ONNX] Model loaded!");
    } catch (err) {
        console.error("❌ [ONNX] Failed to load model:", err);
    }

    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
