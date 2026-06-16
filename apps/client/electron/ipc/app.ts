import { join } from 'node:path';
import { ipcMain, app, shell, type BrowserWindow } from 'electron';
import { z } from 'zod';
import { IPC } from '@pilote/types';
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from '../main/window.js';
import { getSettings } from '../main/store.js';
import { logsDir } from '../main/logger.js';
import { assertSafeExternalUrl } from '@shared/security.js';
import { wrap } from './wrap.js';

const OpenPathTargetSchema = z.enum(['logs', 'instances', 'java']);

/** Register app/meta + frameless-window IPC handlers. */
export function registerAppHandlers(win: BrowserWindow): void {
  ipcMain.handle(
    IPC.app.getVersion,
    wrap(async () => app.getVersion()),
  );

  ipcMain.handle(
    IPC.app.minimize,
    wrap(async () => {
      minimizeWindow(win);
    }),
  );

  ipcMain.handle(
    IPC.app.toggleMaximize,
    wrap(async () => {
      toggleMaximizeWindow(win);
    }),
  );

  ipcMain.handle(
    IPC.app.close,
    wrap(async () => {
      closeWindow(win);
    }),
  );

  ipcMain.handle(
    IPC.app.openExternal,
    wrap(async (_e, rawUrl: unknown) => {
      const url = z.string().parse(rawUrl);
      const safe = assertSafeExternalUrl(url);
      await shell.openExternal(safe.toString());
    }),
  );

  ipcMain.handle(
    IPC.app.openPath,
    wrap(async (_e, rawTarget: unknown) => {
      const target = OpenPathTargetSchema.parse(rawTarget);
      const settings = getSettings();
      const dir =
        target === 'logs'
          ? logsDir()
          : target === 'instances'
            ? settings.instancesDir
            : settings.javaDir;
      await shell.openPath(join(dir));
    }),
  );
}
