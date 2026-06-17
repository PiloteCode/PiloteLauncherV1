import electronUpdater from 'electron-updater';
import { IPC } from '@pilote/types';
import { broadcast } from './window.js';
import { log } from './logger.js';
import { getSettings } from './store.js';

/**
 * Auto-update wiring via electron-updater. Status is pushed to the renderer on
 * `IPC.events.updaterStatus`. The feed/provider is configured in
 * electron-builder.yml (GitHub Releases by default).
 */

const { autoUpdater } = electronUpdater;

type UpdaterStatus =
  | { status: 'checking' }
  | { status: 'available'; version?: string }
  | { status: 'downloading'; percent?: number }
  | { status: 'ready'; version?: string }
  | { status: 'none' }
  | { status: 'error' };

let wired = false;
let updateReady = false;

function emit(payload: UpdaterStatus): void {
  broadcast(IPC.events.updaterStatus, payload);
}

/** Wire updater event handlers. Idempotent. */
export function initUpdater(): void {
  if (wired) return;
  wired = true;

  // Fully automatic: silently download new versions and install them on the next quit.
  // The renderer still gets status events (and shows a "ready, installs on restart" toast).
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = log;

  autoUpdater.on('checking-for-update', () => emit({ status: 'checking' }));

  autoUpdater.on('update-available', (info) => {
    emit({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    updateReady = false;
    emit({ status: 'none' });
  });

  autoUpdater.on('download-progress', (progress) => {
    emit({ status: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true;
    emit({ status: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    log.error('Updater error', err);
    emit({ status: 'error' });
  });
}

/**
 * Check for an update. Returns whether one is available. Disabled (returns no
 * update) when not packaged, since electron-updater requires a packaged app.
 */
export async function check(): Promise<{ available: boolean; version?: string }> {
  initUpdater();
  const { app } = await import('electron');
  if (!app.isPackaged) {
    emit({ status: 'none' });
    return { available: false };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    const info = result?.updateInfo;
    if (!info) return { available: false };
    const available = info.version !== app.getVersion();
    return available
      ? { available: true, version: info.version }
      : { available: false };
  } catch (err) {
    log.error('checkForUpdates failed', err);
    emit({ status: 'error' });
    return { available: false };
  }
}

/** Download the pending update (if any) and quit+install once downloaded. */
export async function downloadAndInstall(): Promise<void> {
  initUpdater();
  const { app } = await import('electron');
  if (!app.isPackaged) return;

  if (updateReady) {
    autoUpdater.quitAndInstall(false, true);
    return;
  }
  emit({ status: 'downloading', percent: 0 });
  await autoUpdater.downloadUpdate();
  autoUpdater.quitAndInstall(false, true);
}

/** Run a startup check when the user has opted in. */
export async function maybeAutoCheck(): Promise<void> {
  if (getSettings().autoCheckUpdates) {
    await check();
  }
}
