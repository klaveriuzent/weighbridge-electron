// ===================================================
// Main Process - Electron Entry Point
// ===================================================
const { app, BrowserWindow, ipcMain } = require('electron');
const { SerialPort } = require('serialport');
const path = require('path');

let mainWindow = null;  // 🔹 simpan window utama
let currentPort = null; // 🔹 simpan port aktif agar bisa ditutup ulang

// Turn off GPU cache di Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// ===================================================
// Fungsi utama untuk membuat jendela
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
// IPC Handler: Buka Port Serial dan Kirim Data ke Renderer
// ===================================================
ipcMain.handle('open-serial-port', async (_event, path) => {
    try {
        // Tutup port sebelumnya jika masih terbuka
        if (currentPort && currentPort.isOpen) {
            console.log('⚙️ Menutup port sebelumnya...');
            currentPort.close();
        }

        console.log(`🔌 Membuka port ${path} ...`);
        currentPort = new SerialPort({
            path,
            baudRate: 9600,
            autoOpen: true,
        });

        // Saat data diterima dari COM port
        currentPort.on('data', (data) => {
            const text = data.toString().trim();
            console.log('📥 Data diterima:', text);
            if (mainWindow) {
                mainWindow.webContents.send('serial-data', text); // ✅ kirim ke renderer dengan aman
            }
        });

        currentPort.on('close', () => {
            console.log('🔒 Port ditutup.');
            if (mainWindow) mainWindow.webContents.send('serial-status', 'closed');
        });

        currentPort.on('error', (err) => {
            console.error('⚠️ Serial error:', err.message);
            if (mainWindow) mainWindow.webContents.send('serial-error', err.message);
        });

        return { status: 'opened', path };
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
// App Lifecycle
// ===================================================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
