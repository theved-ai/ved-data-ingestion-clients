const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createAudioCaptureStream } = require('./services/audioCapture');
const { transcribeAudio } = require('./services/transcriber');
const logger = require('./utils/logger');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('start-recording', async () => {
    logger.log('Recording started');
    const audioPath = await createAudioCaptureStream();
    const transcript = await transcribeAudio(audioPath);
    return transcript;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});