const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Disable hardware acceleration for transparency to work correctly on some systems.
app.disableHardwareAcceleration();

const ORB_SIZE = { width: 84, height: 84 };
const WIDGET_SIZE = { width: 360, height: 200 };

let mainWindow;

const createWindow = async () => {
  try {
    // Center the window on the primary display.
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.floor((width - ORB_SIZE.width) / 2);
    const y = Math.floor((height - ORB_SIZE.height) / 2);

    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: ORB_SIZE.width,
      height: ORB_SIZE.height,
      x,
      y,
      frame: false,
      resizable: false,
      transparent: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(app.getAppPath(), 'out/preload/preload.js'),
        webSecurity: true,
        sandbox: true,
        devTools: !!process.env['ELECTRON_RENDERER_URL'],
      },
    });

    // Load the app
    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    // Handle window being closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Handle window resizing/positioning from renderer
    ipcMain.on('set-window', (event, { width, height, x, y, animate = true }) => {
      if (mainWindow) {
        const currentBounds = mainWindow.getBounds();
        const newBounds = {
          width: width !== undefined ? Math.round(width) : currentBounds.width,
          height: height !== undefined ? Math.round(height) : currentBounds.height,
          x: x !== undefined ? Math.round(x) : currentBounds.x,
          y: y !== undefined ? Math.round(y) : currentBounds.y,
        };
        mainWindow.setBounds(newBounds, animate);
      }
    });

    // Handle window close from renderer
    ipcMain.on('close-window', () => {
      if (mainWindow) {
        mainWindow.close();
      }
    });

    // Global shortcut to toggle the widget
    const { globalShortcut } = require('electron');
    globalShortcut.register('CommandOrControl+Shift+P', () => {
      mainWindow.webContents.send('toggle-widget');
    });

    // Handle any uncaught errors in the renderer process
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', { errorCode, errorDescription });
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer ${level}] ${message} at ${sourceId}:${line}`);
    });

  } catch (error) {
    console.error('Fatal error during app initialization:', error);
    app.quit();
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Set up global shortcuts
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('Failed to start application:', error);
  app.quit();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up on app quit
app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
});
