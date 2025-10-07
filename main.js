// ===================================================
// Main Process - Electron Entry Point
// ===================================================
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Turn off GPU cache di Windows (mencegah caching UI berat)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function createWindow() {
    const isDev = process.env.NODE_ENV === 'development';

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // optional
            contextIsolation: true,
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
// App Lifecycle
// ===================================================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});