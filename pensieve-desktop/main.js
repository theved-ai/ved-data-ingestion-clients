const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const WIDGET_WIDTH = 360, WIDGET_HEIGHT = 70, BALL_SIZE = 60;
  const SIDE_MARGIN = 16, BOTTOM_MARGIN = 16;

  // Start at bottom right
  const startX = width - WIDGET_WIDTH - SIDE_MARGIN;
  const startY = height - WIDGET_HEIGHT - BOTTOM_MARGIN;

  win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: startX,
    y: startY,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: true,
    skipTaskbar: true,
    hasShadow: false, // <-- important for clean circle!
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    }
  });

  win.loadFile('index.html');
  win.show();

  ipcMain.on('set-window', (e, { width, height, x, y }) => {
    if (typeof width === "number" && typeof height === "number") {
      win.setSize(width, height);
    }
    if (typeof x === "number" && typeof y === "number") {
      win.setPosition(x, y);
    }
  });

  ipcMain.on('close-window', () => app.quit());
}

app.whenReady().then(() => {
  createWindow();

  // Global shortcut to toggle expand/collapse and show window if hidden
  const shortcut = 'Control+Shift+Space';
  globalShortcut.register(shortcut, () => {
    if (win) {
      win.show();
      win.webContents.send('toggle-expand');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
