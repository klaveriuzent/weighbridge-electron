// ===================================================
// Main Process - Electron Entry Point
// ===================================================
const { app, BrowserWindow, ipcMain } = require('electron');
const { SerialPort } = require('serialport');
const path = require('path');
const fs = require('fs');
const DigestFetch = require('digest-fetch').default;
const ort = require('onnxruntime-node');
const sharp = require('sharp');

let mainWindow = null;
let currentPort = null;
let plateSession = null;

// Nonaktifkan cache GPU Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// ===================================================
// Fungsi utama untuk membuat jendela Electron
// ===================================================
function createWindow() {
    const isDev = process.env.NODE_ENV === 'development';
    console.log('🔍 [MAIN] Preload path:', path.join(__dirname, 'preload.js'));

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        console.log('🔹 DEV MODE → load http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.session.clearCache();
        mainWindow.webContents.reloadIgnoringCache();
        mainWindow.webContents.openDevTools();

        // Ctrl+R / F5 reload manual
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if ((input.key === 'r' && input.control) || input.key === 'F5') {
                console.log('🔁 Manual reload triggered');
                mainWindow.webContents.reloadIgnoringCache();
                event.preventDefault();
            }
        });
    } else {
        const distPath = path.join(__dirname, 'dist', 'index.html');
        console.log('🔹 PROD MODE → load', distPath);
        mainWindow.loadFile(distPath);
    }
}

// ===================================================
// IPC Handler: List Port Serial
// ===================================================
ipcMain.handle('list-serial-ports', async () => {
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
        console.error('❌ Gagal membaca COM port:', err);
        return [];
    }
});

// ===================================================
// IPC Handler: Buka Port Serial
// ===================================================
ipcMain.handle('open-serial-port', async (_event, pathName) => {
    try {
        if (currentPort && currentPort.isOpen) {
            console.log('⚙️ Menutup port sebelumnya...');
            currentPort.close();
        }

        console.log(`🔌 Membuka port ${pathName} ...`);
        currentPort = new SerialPort({
            path: pathName,
            baudRate: 9600,
            autoOpen: true,
        });

        currentPort.on('data', (data) => {
            const text = data.toString().trim();
            console.log('📥 Data diterima:', text);
            if (mainWindow) mainWindow.webContents.send('serial-data', text);
        });

        currentPort.on('close', () => {
            console.log('🔒 Port ditutup.');
            if (mainWindow) mainWindow.webContents.send('serial-status', 'closed');
        });

        currentPort.on('error', (err) => {
            console.error('⚠️ Serial error:', err.message);
            if (mainWindow) mainWindow.webContents.send('serial-error', err.message);
        });

        return { status: 'opened', path: pathName };
    } catch (err) {
        console.error('❌ Gagal membuka port:', err);
        return { status: 'error', message: err.message };
    }
});

// ===================================================
// IPC Handler: Tutup Port Serial
// ===================================================
ipcMain.handle('close-serial-port', async () => {
    try {
        if (currentPort && currentPort.isOpen) {
            currentPort.close();
            currentPort = null;
            return { status: 'closed' };
        }
        return { status: 'no_port' };
    } catch (err) {
        console.error('❌ Gagal menutup port:', err);
        return { status: 'error', message: err.message };
    }
});

// ===================================================
// IPC Handler: Ambil Gambar CCTV Hikvision (Digest Auth)
// ===================================================
ipcMain.handle('fetch-cctv-image', async (_event, { link, username, password }) => {
    try {
        if (!link || !username || !password) {
            return { status: 'error', message: 'Parameter tidak lengkap' };
        }

        console.log('📸 Fetch CCTV (Digest Auth) from:', link);
        const client = new DigestFetch(username, password, { algorithm: 'MD5' });
        const res = await client.fetch(link, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
                Accept: 'image/jpeg',
            },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer = await res.arrayBuffer();
        const base64Image = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;

        return { status: 'success', image: base64Image };
    } catch (err) {
        console.error('❌ Gagal ambil gambar CCTV:', err);
        return { status: 'error', message: err.message };
    }
});

// ===================================================
// Utils: Sigmoid + Softmax + YOLOv3 Decoder
// ===================================================
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b);
    return exps.map(v => v / sum);
}

function decodeYoloV3(output, anchors, inputSize, confThreshold = 0.25) {
    const [batch, C, gridH, gridW] = output.dims;
    const data = output.data;
    const numAnchors = anchors.length;
    const stride = C / numAnchors;
    const numClasses = Math.max(0, Math.round(stride - 5));

    const boxes = [];

    for (let a = 0; a < numAnchors; a++) {
        const [anchorW, anchorH] = anchors[a];
        for (let gy = 0; gy < gridH; gy++) {
            for (let gx = 0; gx < gridW; gx++) {
                const cellIndex = gy * gridW + gx;
                const base = a * stride * gridH * gridW + cellIndex;

                const tx = data[base];
                const ty = data[base + gridH * gridW];
                const tw = data[base + 2 * gridH * gridW];
                const th = data[base + 3 * gridH * gridW];
                const tobj = sigmoid(data[base + 4 * gridH * gridW]);

                if (tobj < confThreshold) continue;

                const clsScores = [];
                for (let c = 0; c < numClasses; c++) {
                    clsScores.push(data[base + (5 + c) * gridH * gridW]);
                }
                const clsProbs = softmax(clsScores);
                const maxProb = numClasses > 0 ? Math.max(...clsProbs) : 1.0;
                const conf = tobj * maxProb;
                if (conf < confThreshold) continue;

                const bx = (sigmoid(tx) + gx) / gridW;
                const by = (sigmoid(ty) + gy) / gridH;
                const bw = (Math.exp(tw) * anchorW) / inputSize;
                const bh = (Math.exp(th) * anchorH) / inputSize;

                boxes.push({
                    x1: (bx - bw / 2) * inputSize,
                    y1: (by - bh / 2) * inputSize,
                    x2: (bx + bw / 2) * inputSize,
                    y2: (by + bh / 2) * inputSize,
                    confidence: conf,
                });
            }
        }
    }
    return boxes;
}

// ===================================================
// IPC Handler: Jalankan Deteksi Plat Nomor (ONNX)
// ===================================================
ipcMain.handle('run-plate-detection', async (_event, imageInput) => {
    try {
        if (!plateSession) throw new Error('Model belum siap');
        if (!imageInput) throw new Error('Input gambar kosong');

        let imageBuffer = null;
        if (typeof imageInput === 'string' && imageInput.startsWith('data:image')) {
            const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
        } else if (fs.existsSync(imageInput)) {
            imageBuffer = fs.readFileSync(imageInput);
        } else {
            throw new Error('Input gambar tidak valid');
        }

        const meta = await sharp(imageBuffer).metadata();
        const origW = meta.width || 0;
        const origH = meta.height || 0;
        if (!origW || !origH) throw new Error('Metadata gambar tidak valid');

        const inputSize = 416;
        const scale = Math.min(inputSize / origW, inputSize / origH);
        const newW = Math.round(origW * scale);
        const newH = Math.round(origH * scale);
        const padX = Math.floor((inputSize - newW) / 2);
        const padY = Math.floor((inputSize - newH) / 2);

        const resized = await sharp(imageBuffer)
            .resize(newW, newH)
            .extend({
                top: padY,
                bottom: padY,
                left: padX,
                right: padX,
                background: { r: 0, g: 0, b: 0 },
            })
            .removeAlpha()
            .raw()
            .toBuffer();

        const size = inputSize * inputSize;
        const floatCHW = new Float32Array(3 * size);
        for (let i = 0; i < size; i++) {
            floatCHW[i] = resized[i * 3] / 255;
            floatCHW[size + i] = resized[i * 3 + 1] / 255;
            floatCHW[2 * size + i] = resized[i * 3 + 2] / 255;
        }

        const inputTensor = new ort.Tensor('float32', floatCHW, [1, 3, inputSize, inputSize]);
        const feeds = { [plateSession.inputNames[0]]: inputTensor };
        const results = await plateSession.run(feeds);

        const output = results[plateSession.outputNames[0]];
        if (!output || !output.data) throw new Error('Output model tidak valid');

        console.log('🧩 [ONNX] Output dims:', output.dims);

        const anchors = [
            [116, 90],
            [156, 198],
            [373, 326],
        ];
        const boxes = decodeYoloV3(output, anchors, inputSize, 0.25);

        if (!boxes.length) {
            console.warn('⚠️ [ONNX] Tidak ada objek terdeteksi');
            return { status: 'no_plate', message: 'Tidak ada plat atau mobil terdeteksi di CCTV' };
        }

        const best = boxes.reduce((a, b) => (a.confidence > b.confidence ? a : b));
        console.log(`📊 [ONNX] Confidence tertinggi: ${(best.confidence * 100).toFixed(2)}%`);

        const scaleX = origW / inputSize;
        const scaleY = origH / inputSize;
        let x1 = Math.floor(best.x1 * scaleX);
        let y1 = Math.floor(best.y1 * scaleY);
        let x2 = Math.floor(best.x2 * scaleX);
        let y2 = Math.floor(best.y2 * scaleY);

        if (x2 <= x1) x2 = x1 + 50;
        if (y2 <= y1) y2 = y1 + 20;

        x1 = Math.max(0, Math.min(x1, origW - 1));
        y1 = Math.max(0, Math.min(y1, origH - 1));
        x2 = Math.max(0, Math.min(x2, origW - 1));
        y2 = Math.max(0, Math.min(y2, origH - 1));

        const width = Math.max(30, x2 - x1);
        const height = Math.max(15, y2 - y1);

        console.log(`🧭 [ONNX] Crop box: x=${x1}, y=${y1}, w=${width}, h=${height}`);

        const croppedBuffer = await sharp(imageBuffer)
            .extract({ left: x1, top: y1, width, height })
            .jpeg()
            .toBuffer();

        const base64Cropped = `data:image/jpeg;base64,${croppedBuffer.toString('base64')}`;

        console.log(`✅ [ONNX] Plat terdeteksi (confidence ${(best.confidence * 100).toFixed(1)}%)`);

        return {
            status: 'success',
            confidence: best.confidence,
            box: { x1, y1, x2, y2 },
            croppedImage: base64Cropped,
        };
    } catch (err) {
        console.error('🟥 [ONNX] Gagal deteksi plat:', err.message);
        return { status: 'error', message: err.message };
    }
});

// ===================================================
// App Lifecycle
// ===================================================
app.whenReady().then(async () => {
    try {
        const modelPath = path.join(__dirname, 'models', 'plate_detector.onnx');
        console.log('🧠 [ONNX] Loading model from:', modelPath);
        plateSession = await ort.InferenceSession.create(modelPath);
        console.log('✅ [ONNX] Model loaded!');
        console.log('Inputs:', plateSession.inputNames);
        console.log('Outputs:', plateSession.outputNames);
    } catch (err) {
        console.error('❌ [ONNX] Failed to load model:', err);
    }

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
