// ===================================================
// preload.js
// ===================================================
const { contextBridge, ipcRenderer } = require('electron')

// Debug: pastikan preload benar-benar dimuat
console.log('[PRELOAD] ✅ preload.js loaded')

contextBridge.exposeInMainWorld('electronAPI', {
    // === INVOKE HANDLERS ===
    listSerialPorts: () => ipcRenderer.invoke('list-serial-ports'),
    openSerialPort: (path) => ipcRenderer.invoke('open-serial-port', path),
    closeSerialPort: () => ipcRenderer.invoke('close-serial-port'),

    // === EVENT LISTENERS ===
    onSerialData: (callback) => ipcRenderer.on('serial-data', (_, data) => callback(data)),
    onSerialError: (callback) => ipcRenderer.on('serial-error', (_, error) => callback(error)),
    onSerialStatus: (callback) => ipcRenderer.on('serial-status', (_, status) => callback(status)),

    // === FETCH ===
    fetchCctvImage: (data) => ipcRenderer.invoke('fetch-cctv-image', data),

    // === ADDITIONAL ===
    runPlateDetection: async (imagePath) => {
        try {
            const result = await ipcRenderer.invoke('run-plate-detection', imagePath);
            return result;
        } catch (err) {
            console.error('Gagal menjalankan deteksi plat:', err);
            return { error: err.message };
        }
    },
})
