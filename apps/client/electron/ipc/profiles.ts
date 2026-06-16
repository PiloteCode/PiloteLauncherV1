import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC } from '@pilote/types';
import * as profiles from '../main/services/profiles.js';
import { wrap } from './wrap.js';

const NameSchema = z.string().min(1).max(64);
const IdSchema = z.string().min(1);

/** Register profile IPC handlers. */
export function registerProfileHandlers(): void {
  ipcMain.handle(
    IPC.profiles.list,
    wrap(async () => profiles.list()),
  );

  ipcMain.handle(
    IPC.profiles.getActive,
    wrap(async () => profiles.getActive()),
  );

  ipcMain.handle(
    IPC.profiles.setActive,
    wrap(async (_e, rawId: unknown) => {
      const id = IdSchema.parse(rawId);
      profiles.setActive(id);
    }),
  );

  ipcMain.handle(
    IPC.profiles.lookup,
    wrap(async (_e, rawName: unknown) => {
      const name = NameSchema.parse(rawName);
      return profiles.lookup(name);
    }),
  );

  ipcMain.handle(
    IPC.profiles.create,
    wrap(async (_e, rawName: unknown) => {
      const name = NameSchema.parse(rawName);
      return profiles.create(name);
    }),
  );

  ipcMain.handle(
    IPC.profiles.remove,
    wrap(async (_e, rawId: unknown) => {
      const id = IdSchema.parse(rawId);
      profiles.remove(id);
    }),
  );
}
