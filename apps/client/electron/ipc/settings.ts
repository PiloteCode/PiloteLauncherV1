import { ipcMain, dialog, BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC,
  SettingsSchema,
  InstanceOverrideSchema,
  LauncherError,
} from '@pilote/types';
import {
  getSettings,
  updateSettings,
  getOverride,
  setOverride,
} from '../main/store.js';
import { isValidApiBaseUrl } from '@shared/security.js';
import { wrap } from './wrap.js';

/** Patch payload: a partial of Settings (every field optional). */
const SettingsPatchSchema = SettingsSchema.partial();

/** Register settings IPC handlers. */
export function registerSettingsHandlers(): void {
  ipcMain.handle(
    IPC.settings.get,
    wrap(async () => getSettings()),
  );

  ipcMain.handle(
    IPC.settings.update,
    wrap(async (_e, rawPatch: unknown) => {
      const patch = SettingsPatchSchema.parse(rawPatch);
      if (patch.apiBaseUrl !== undefined && !isValidApiBaseUrl(patch.apiBaseUrl)) {
        throw new LauncherError('validation', 'URL d’API invalide (http/https requis).');
      }
      return updateSettings(patch);
    }),
  );

  ipcMain.handle(
    IPC.settings.pickDirectory,
    wrap(async () => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      const result = win
        ? await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
        : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0] ?? null;
    }),
  );

  ipcMain.handle(
    IPC.settings.getOverride,
    wrap(async (_e, rawId: unknown) => {
      const id = z.string().min(1).parse(rawId);
      return getOverride(id);
    }),
  );

  ipcMain.handle(
    IPC.settings.setOverride,
    wrap(async (_e, rawOverride: unknown) => {
      const override = InstanceOverrideSchema.parse(rawOverride);
      setOverride(override);
    }),
  );
}
