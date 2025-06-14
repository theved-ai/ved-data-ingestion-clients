const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setWindow: (opts) => ipcRenderer.send('set-window', opts),
  closeWindow: () => ipcRenderer.send('close-window'),
  snapBall: () => ipcRenderer.send('snap-ball'),
  onToggleExpand: (callback) => ipcRenderer.on('toggle-expand', callback),
});
