import { join } from 'node:path';
import { app, BrowserWindow, shell, session } from 'electron';
import { registerIpc } from '../ipc/index.js';
import { initLogger, log } from './logger.js';
import { initUpdater, maybeAutoCheck } from './updater.js';
import { killAll } from './services/instances.js';
import { assertSafeExternalUrl } from '@shared/security.js';

/**
 * Electron main entry. Enforces a single instance, creates the frameless launcher
 * window with a hardened webPreferences (contextIsolation on, nodeIntegration off),
 * loads the renderer (dev server in development, built index.html in production),
 * registers all typed IPC handlers, and wires the auto-updater.
 */

let mainWindow: BrowserWindow | null = null;

function rendererDevUrl(): string | undefined {
  // electron-vite injects the dev server URL at build time.
  return process.env.ELECTRON_RENDERER_URL;
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox must be false so the preload can `require` Node built-ins for the bridge.
      sandbox: false,
      webSecurity: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Open all target=_blank / window.open links externally, never in-app, https-only.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const safe = assertSafeExternalUrl(url);
      void shell.openExternal(safe.toString());
    } catch (err) {
      log.warn(`Blocked window.open to ${url}`, err);
    }
    return { action: 'deny' };
  });

  // Block in-app navigation away from the renderer origin.
  win.webContents.on('will-navigate', (event, url) => {
    const devUrl = rendererDevUrl();
    const isDev = devUrl ? url.startsWith(devUrl) : false;
    const isFile = url.startsWith('file://');
    if (!isDev && !isFile) {
      event.preventDefault();
      try {
        const safe = assertSafeExternalUrl(url);
        void shell.openExternal(safe.toString());
      } catch {
        /* ignore non-https navigations */
      }
    }
  });

  const devUrl = rendererDevUrl();
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

/** Apply a strict Content-Security-Policy to the renderer in production. */
function applyCsp(): void {
  const devUrl = rendererDevUrl();
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // In dev, electron-vite needs a loose CSP for HMR; in prod we lock it down.
    const csp = devUrl
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob: https:; connect-src 'self' ws: http://localhost:* http://127.0.0.1:* https:;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

// ── Single-instance lock ────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initLogger();

    // Harden permission requests: deny everything the launcher doesn't need.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
      callback(false);
    });
    applyCsp();

    mainWindow = createWindow();
    registerIpc(mainWindow);
    initUpdater();

    void maybeAutoCheck().catch((err) => log.warn('Auto update check failed', err));

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        registerIpc(mainWindow);
      }
    });
  }).catch((err) => {
    log.error('Failed during app startup', err);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    killAll();
  });
}
