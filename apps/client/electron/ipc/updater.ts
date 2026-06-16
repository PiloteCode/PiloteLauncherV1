import { ipcMain } from 'electron';
import { IPC } from '@pilote/types';
import { check, downloadAndInstall } from '../main/updater.js';
import { wrap } from './wrap.js';

/** Register updater IPC handlers. */
export function registerUpdaterHandlers(): void {
  ipcMain.handle(
    IPC.updater.check,
    wrap(async () => check()),
  );

  ipcMain.handle(
    IPC.updater.downloadAndInstall,
    wrap(async () => {
      await downloadAndInstall();
    }),
  );
}
