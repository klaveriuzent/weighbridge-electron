const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const Database = require('better-sqlite3');

let mainWindow;
const db = new Database('data.db');

// buat tabel kalau belum ada
db.prepare('CREATE TABLE IF NOT EXISTS weights (id INTEGER PRIMARY KEY, value TEXT, time TEXT)').run();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// handle baca dari timbangan
ipcMain.handle('read-scale', async () => {
    const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
    return new Promise((resolve) => {
        port.on('data', (data) => {
            const value = data.toString().trim();
            db.prepare('INSERT INTO weights (value, time) VALUES (?, ?)').run(value, new Date().toISOString());
            resolve(value);
        });
    });
});
