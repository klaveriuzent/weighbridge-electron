const { ipcRenderer } = require('electron');

document.getElementById('btnRead').addEventListener('click', async () => {
    const value = await ipcRenderer.invoke('read-scale');
    document.getElementById('weight').textContent = value;
});
