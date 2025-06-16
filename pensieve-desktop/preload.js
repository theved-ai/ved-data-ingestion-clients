const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  setWindow: opts => ipcRenderer.invoke('set-window', opts),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onToggleExpand: cb => ipcRenderer.on('toggle-expand', cb)
});
