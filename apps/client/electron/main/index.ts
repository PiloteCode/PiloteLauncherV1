import { join, resolve } from 'node:path';
import { app, BrowserWindow, shell, session } from 'electron';
import { IPC } from '@pilote/types';
import icon from '../../resources/icon.png?asset';
import { registerIpc } from '../ipc/index.js';
import { initLogger, log } from './logger.js';
import { initUpdater, maybeAutoCheck } from './updater.js';
import { killAll } from './services/instances.js';
import * as moduleService from './services/modules.js';
import { assertSafeExternalUrl } from '@shared/security.js';

const PROTOCOL = 'pilote';

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
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
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

  // Allow opening DevTools (F12 / Ctrl+Shift+I) — handy with the hidden "jeveuxdev" dev mode.
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    const mod = input.control || input.meta;
    if (input.key === 'F12' || (mod && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
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
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

// ── Deep links (pilote://) ──────────────────────────────────────────────────────

/** Parse a pilote:// URL into an action + id (supports a few URL shapes). */
function parseDeepLink(url: string): { action?: string; id?: string } {
  try {
    const u = new URL(url);
    const seg = [u.hostname, ...u.pathname.split('/')].map((s) => s.trim()).filter(Boolean);
    if (seg[0] === 'install-module' || seg[0] === 'modules') return { action: 'install', id: seg[1] };
    if (seg[0] === 'module' && seg[1] === 'install') return { action: 'install', id: seg[2] };
    return { action: seg[0], id: seg[1] };
  } catch {
    return {};
  }
}

/** Handle an incoming deep link: run the action (e.g. install a module) + notify the UI. */
function handleDeepLink(url: string | undefined): void {
  if (!url || !url.startsWith(`${PROTOCOL}://`)) return;
  const { action, id } = parseDeepLink(url);
  log.info(`Deep link received: ${url} (action=${action ?? '?'}, id=${id ?? '?'})`);
  if (action === 'install' && id) {
    try {
      moduleService.install(id);
    } catch (err) {
      log.warn(`Deep-link install failed for "${id}"`, err);
    }
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const send = () => mainWindow?.webContents.send(IPC.events.deepLink, { url, action, id });
    if (mainWindow.webContents.isLoading()) mainWindow.webContents.once('did-finish-load', send);
    else send();
  }
}

function deepLinkFromArgv(argv: string[]): string | undefined {
  return argv.find((a) => a.startsWith(`${PROTOCOL}://`));
}

/** Register the launcher as the handler for pilote:// links. */
function registerProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    // Dev: point the OS at this electron binary + entry script.
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [resolve(process.argv[1] ?? '')]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

// ── Single-instance lock ────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  registerProtocol();

  app.on('second-instance', (_event, argv) => {
    const link = deepLinkFromArgv(argv);
    if (link) {
      handleDeepLink(link);
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // macOS delivers deep links via open-url.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
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

    // Handle a pilote:// link the app may have been cold-started with (Windows/Linux).
    handleDeepLink(deepLinkFromArgv(process.argv));

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
