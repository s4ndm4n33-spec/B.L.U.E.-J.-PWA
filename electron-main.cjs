/**
 * STANDALONE DESKTOP APP — Electron main process.
 *
 * This makes B.L.U.E.-J. a fully downloadable desktop app.
 * Ships with the Express API server built-in — no cloud needed.
 *
 * Setup:
 *   npm install electron electron-builder --save-dev
 *   Add "main": "electron-main.js" to package.json
 *   Add build script to package.json (see SETUP-STANDALONE.md)
 *
 * The build produces:
 *   - Windows: .exe installer + portable
 *   - macOS: .dmg
 *   - Linux: .AppImage + .deb
 */
const { app, BrowserWindow, Menu, Tray, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Auto-updater — checks GitHub Releases for new versions
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = false; // Ask user first
} catch (_) {
  // electron-updater not installed in dev — ignore
}

let mainWindow;
let apiServer;
let tray;

const API_PORT = 3001;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 375,
    minHeight: 600,
    title: 'B.L.U.E.-J. AI Coding Simulator',
    icon: path.join(__dirname, 'public/icons/icon-512.png'),
    backgroundColor: '#0a0f1a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the built frontend
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startApiServer() {
  return new Promise((resolve) => {
    if (isDev) {
      resolve(); // Dev mode uses the Vite proxy
      return;
    }

    // Start the Express API server as a child process
    const serverPath = path.join(__dirname, 'server/index.js');
    apiServer = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: String(API_PORT),
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
    });

    apiServer.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[API]', msg);
      if (msg.includes('listening') || msg.includes('ready')) {
        resolve();
      }
    });

    apiServer.stderr.on('data', (data) => {
      console.error('[API Error]', data.toString());
    });

    // Resolve after 3 seconds regardless (server might not log "ready")
    setTimeout(resolve, 3000);
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'public/icons/icon-192.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show B.L.U.E.-J.', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('B.L.U.E.-J. AI Coding Simulator');
  tray.setContextMenu(contextMenu);
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `B.L.U.E.-J. v${info.version} is available. Download now?`,
      buttons: ['Download', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to apply?',
      buttons: ['Restart', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  // Check 10s after launch, then every 4 hours
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

app.whenReady().then(async () => {
  await startApiServer();
  createWindow();
  createTray();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (apiServer) {
    apiServer.kill();
  }
});
