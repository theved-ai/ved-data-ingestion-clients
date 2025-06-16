const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 180,
    x: undefined, y: undefined,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  win.loadFile('index.html');
  win.setMenu(null);

  ipcMain.handle('set-window', (e, opts) => {
    if (
      opts &&
      Number.isFinite(opts.width) &&
      Number.isFinite(opts.height) &&
      Number.isFinite(opts.x) &&
      Number.isFinite(opts.y)
    ) {
      win.setBounds({
        width: Math.round(opts.width),
        height: Math.round(opts.height),
        x: Math.round(opts.x),
        y: Math.round(opts.y)
      });
    } else {
      console.warn('Invalid set-window args:', opts);
    }
  });
  ipcMain.handle('close-window', () => win.close());

  // Ctrl+Shift+Space toggles
  win.webContents.on('before-input-event', (e, input) => {
    if (input.control && input.shift && input.code === 'Space') {
      win.webContents.send('toggle-expand');
      e.preventDefault();
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', ()=>app.quit());
