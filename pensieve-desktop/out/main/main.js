"use strict";
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
if (require("electron-squirrel-startup")) {
  app.quit();
}
app.disableHardwareAcceleration();
const ORB_SIZE = { width: 84, height: 84 };
let mainWindow;
const createWindow = async () => {
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.floor((width - ORB_SIZE.width) / 2);
    const y = Math.floor((height - ORB_SIZE.height) / 2);
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
    ipcMain.on("set-window", (event, { width: width2, height: height2, x: x2, y: y2, animate = true }) => {
      if (mainWindow) {
        const currentBounds = mainWindow.getBounds();
        const newBounds = {
          width: width2 !== void 0 ? Math.round(width2) : currentBounds.width,
          height: height2 !== void 0 ? Math.round(height2) : currentBounds.height,
          x: x2 !== void 0 ? Math.round(x2) : currentBounds.x,
          y: y2 !== void 0 ? Math.round(y2) : currentBounds.y
        };
        mainWindow.setBounds(newBounds, animate);
      }
    });
    ipcMain.on("close-window", () => {
      if (mainWindow) {
        mainWindow.close();
      }
    });
    const { globalShortcut } = require("electron");
    globalShortcut.register("CommandOrControl+Shift+P", () => {
      mainWindow.webContents.send("toggle-widget");
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
