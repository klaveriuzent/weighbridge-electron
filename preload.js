console.log('✅ [PRELOAD] Loaded preload script');

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    listSerialPorts: () => ipcRenderer.invoke('list-serial-ports'),
});