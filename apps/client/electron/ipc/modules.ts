import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC } from '@pilote/types';
import * as modules from '../main/services/modules.js';
import { wrap } from './wrap.js';

const Id = z.string().min(1).max(128);
const Settings = z.record(z.string(), z.unknown());

/** Register module (plugin) IPC handlers. */
export function registerModuleHandlers(): void {
  ipcMain.handle(
    IPC.modules.list,
    wrap(async () => modules.list()),
  );

  ipcMain.handle(
    IPC.modules.setEnabled,
    wrap(async (_e, id, enabled) => {
      modules.setEnabled(Id.parse(id), z.boolean().parse(enabled));
    }),
  );

  ipcMain.handle(
    IPC.modules.getSettings,
    wrap(async (_e, id) => modules.getSettings(Id.parse(id))),
  );

  ipcMain.handle(
    IPC.modules.setSettings,
    wrap(async (_e, id, settings) => {
      modules.setSettings(Id.parse(id), Settings.parse(settings));
    }),
  );

  ipcMain.handle(
    IPC.modules.install,
    wrap(async (_e, id) => modules.install(Id.parse(id))),
  );
}
