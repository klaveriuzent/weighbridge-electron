// ===================================================
// Main Process - Electron Entry Point
// ===================================================
const { app, BrowserWindow, ipcMain } = require('electron');
const { SerialPort } = require('serialport');
const path = require('path');

// Turn off GPU cache di Windows (mencegah caching UI berat)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// ===================================================
// Fungsi utama untuk membuat jendela
// ===================================================
function createWindow() {
    const isDev = process.env.NODE_ENV === 'development';

    console.log('🔍 [MAIN] Preload path:', path.join(__dirname, 'preload.js'));

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        // ===================================================
        // Development Mode (React + Vite)
        // ===================================================
        console.log('🔹 DEV MODE → load http://localhost:5173');
        win.loadURL('http://localhost:5173');

        // Bersihkan cache supaya UI selalu update
        win.webContents.session.clearCache();
        win.webContents.reloadIgnoringCache();

        // Buka DevTools otomatis
        win.webContents.openDevTools();

        // Tambahkan shortcut manual reload (Ctrl+R / F5)
        win.webContents.on('before-input-event', (event, input) => {
            if ((input.key === 'r' && input.control) || input.key === 'F5') {
                console.log('🔁 Manual reload triggered');
                win.webContents.reloadIgnoringCache();
                event.preventDefault();
            }
        });
    } else {
        // ===================================================
        // Production Mode (Build dari dist)
        // ===================================================
        const distPath = path.join(__dirname, 'dist', 'index.html');
        console.log('🔹 PROD MODE → load', distPath);
        win.loadFile(distPath);
    }
}

// ===================================================
// IPC Handler untuk mendeteksi port COM yang terhubung
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
// App Lifecycle
// ===================================================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});