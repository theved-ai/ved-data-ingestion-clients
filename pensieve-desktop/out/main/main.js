"use strict";
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
if (require("electron-squirrel-startup")) {
  app.quit();
}
app.disableHardwareAcceleration();
const WINDOW_WIDTH = 400;
const WINDOW_HEIGHT = 200;
let mainWindow;
const createWindow = async () => {
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.floor((width - WINDOW_WIDTH) / 2);
    const y = Math.floor((height - WINDOW_HEIGHT) / 2);
    mainWindow = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      x,
      y,
      frame: false,
      resizable: true,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(app.getAppPath(), "out/preload/preload.js"),
        webSecurity: true,
        sandbox: true,
        devTools: !!process.env["ELECTRON_RENDERER_URL"]
      }
    });
    if (process.env["ELECTRON_RENDERER_URL"]) {
      mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
      mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
      mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
    ipcMain.handle("set-window", (_, { width: width2, height: height2, x: x2, y: y2 }) => {
      if (mainWindow) {
        const bounds = { width: width2, height: height2 };
        if (x2 !== void 0 && y2 !== void 0) {
          bounds.x = x2;
          bounds.y = y2;
        }
        mainWindow.setBounds(bounds);
      }
    });
    ipcMain.handle("close-window", () => {
      if (mainWindow) {
        mainWindow.close();
      }
    });
    const { globalShortcut } = require("electron");
    globalShortcut.register("CommandOrControl+Shift+Space", () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    });
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
      console.error("Failed to load:", { errorCode, errorDescription });
    });
    mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
      console.log(`[Renderer ${level}] ${message} at ${sourceId}:${line}`);
    });
  } catch (error) {
    console.error("Fatal error during app initialization:", error);
    app.quit();
  }
};
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error("Failed to start application:", error);
  app.quit();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
app.on("will-quit", () => {
  const { globalShortcut } = require("electron");
  globalShortcut.unregisterAll();
});
