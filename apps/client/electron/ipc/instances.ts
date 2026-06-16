import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC, UnlockRequestSchema, LaunchOptionsSchema } from '@pilote/types';
import * as instances from '../main/services/instances.js';
import { wrap } from './wrap.js';

const IdSchema = z.string().min(1);
const LaunchOptionsPatchSchema = LaunchOptionsSchema.partial();

/** Register instance IPC handlers. */
export function registerInstanceHandlers(): void {
  ipcMain.handle(
    IPC.instances.listPublic,
    wrap(async () => instances.listPublic()),
  );

  ipcMain.handle(
    IPC.instances.listUnlocked,
    wrap(async () => instances.listUnlocked()),
  );

  ipcMain.handle(
    IPC.instances.unlock,
    wrap(async (_e, rawCode: unknown) => {
      const { code } = UnlockRequestSchema.parse({ code: rawCode });
      return instances.unlock(code);
    }),
  );

  ipcMain.handle(
    IPC.instances.forget,
    wrap(async (_e, rawId: unknown) => {
      const id = IdSchema.parse(rawId);
      await instances.forget(id);
    }),
  );

  ipcMain.handle(
    IPC.instances.get,
    wrap(async (_e, rawId: unknown) => {
      const id = IdSchema.parse(rawId);
      return instances.get(id);
    }),
  );

  ipcMain.handle(
    IPC.instances.install,
    wrap(async (_e, rawId: unknown) => {
      const id = IdSchema.parse(rawId);
      await instances.install(id);
    }),
  );

  ipcMain.handle(
    IPC.instances.launch,
    wrap(async (_e, rawId: unknown, rawOptions: unknown) => {
      const id = IdSchema.parse(rawId);
      const options =
        rawOptions === undefined || rawOptions === null
          ? undefined
          : LaunchOptionsPatchSchema.parse(rawOptions);
      await instances.launch(id, options);
    }),
  );

  ipcMain.handle(
    IPC.instances.kill,
    wrap(async (_e, rawId: unknown) => {
      const id = IdSchema.parse(rawId);
      await instances.kill(id);
    }),
  );

  ipcMain.handle(
    IPC.instances.running,
    wrap(async () => instances.running()),
  );
}
