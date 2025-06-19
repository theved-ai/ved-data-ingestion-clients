const { contextBridge, ipcRenderer } = require('electron');

// White-listed channels
const validChannels = {
  send: ['set-window', 'close-window'],
  receive: ['toggle-expand']
};

// Expose protected methods to the renderer
contextBridge.exposeInMainWorld('electron', {
  // Send message to main process
  send: (channel, data) => {
    if (validChannels.send.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive message from main process
  receive: (channel, callback) => {
    if (validChannels.receive.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },
  
  // Invoke method in main process and get result
  invoke: (channel, data) => {
    if (validChannels.send.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(`Invalid channel: ${channel}`);
  },
  
  // Close window
  close: () => ipcRenderer.send('close-window'),
  
  // Set window bounds
  setWindow: (opts) => ipcRenderer.send('set-window', opts),
  
  // Platform information
  platform: process.platform,
  
  // Versions
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Preload:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Preload:', reason);
});
