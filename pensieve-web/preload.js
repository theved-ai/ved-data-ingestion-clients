const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startRecording: () => ipcRenderer.invoke('start-recording')
});