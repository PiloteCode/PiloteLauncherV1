// Headless smoke test for the PACKAGED-style build. Launches Electron with show:false,
// loads the built preload + renderer exactly as the app does, and asserts that:
//   - the preload loaded (window.launcher is exposed),
//   - the renderer actually rendered (dynamic-import alias resolution works).
// Run after `electron-vite build`:  pnpm exec electron scripts/verify-build.cjs
// Exits 0 on success, 1 on failure.
const { app, BrowserWindow } = require('electron');
const { join } = require('node:path');

const root = join(__dirname, '..');
const errors = [];
let preloadFailed = false;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(root, 'out/preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on('preload-error', (_e, p, err) => {
    preloadFailed = true;
    errors.push(`preload-error: ${err && err.message ? err.message : err}`);
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    errors.push(`did-fail-load: ${code} ${desc}`);
  });
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3) errors.push(`console-error: ${message}`);
  });

  try {
    await win.loadFile(join(root, 'out/renderer/index.html'));
  } catch (e) {
    errors.push(`loadFile: ${e.message}`);
  }

  // Give the renderer a moment to mount + the router to load the first view.
  await new Promise((r) => setTimeout(r, 2500));

  let probe = { launcher: 'unknown', appHtmlLen: 0 };
  try {
    probe = await win.webContents.executeJavaScript(
      `({ launcher: typeof window.launcher, appHtmlLen: (document.getElementById('app')?.innerHTML.length) || 0 })`,
    );
  } catch (e) {
    errors.push(`probe: ${e.message}`);
  }

  const ok = !preloadFailed && probe.launcher === 'object' && probe.appHtmlLen > 0;
  console.log('=== verify-build ===');
  console.log('window.launcher :', probe.launcher);
  console.log('#app html length:', probe.appHtmlLen);
  console.log('preload failed  :', preloadFailed);
  console.log('result          :', ok ? 'PASS' : 'FAIL');
  for (const e of errors) console.log('  •', e);
  app.exit(ok ? 0 : 1);
});

// Hard timeout so the test never hangs.
setTimeout(() => {
  console.log('=== verify-build === TIMEOUT');
  app.exit(1);
}, 20000);
