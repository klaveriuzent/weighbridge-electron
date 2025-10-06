try {
    require('electron-reloader')(module);
} catch (_) { }

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // optional
            contextIsolation: true,
        },
    });

    // Saat development → load dari Vite dev server
    if (!app.isPackaged) {
        win.loadURL('http://localhost:5173');
    } else {
        // Saat production → load hasil build React (dist)
        win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});