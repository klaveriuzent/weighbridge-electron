const { app, BrowserWindow } = require('electron');
const path = require('path');

// Turn Off GPU cache di Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Auto reload -> development (opsional)
try {
    require('electron-reloader')(module);
} catch (_) { }

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // optional
            contextIsolation: true,
        },
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        console.log('🔹 DEV MODE → load http://localhost:5173');
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        const distPath = path.join(__dirname, 'dist', 'index.html');
        console.log('🔹 PROD MODE → load', distPath);
        win.loadFile(distPath);
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
