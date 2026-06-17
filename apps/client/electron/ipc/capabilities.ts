import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC } from '@pilote/types';
import { systemMemoryMb, pingServer, discordActivity } from '../main/capabilities.js';
import { wrap } from './wrap.js';

const DiscordActivity = z
  .object({
    details: z.string().max(128).optional(),
    state: z.string().max(128).optional(),
    largeImageKey: z.string().max(256).optional(),
    largeImageText: z.string().max(128).optional(),
    startTimestamp: z.number().int().optional(),
  })
  .nullable();

/** Register main-backed capability handlers modules call through the bridge. */
export function registerCapabilityHandlers(): void {
  ipcMain.handle(
    IPC.capabilities.systemMemoryMb,
    wrap(async () => systemMemoryMb()),
  );

  ipcMain.handle(
    IPC.capabilities.pingServer,
    wrap(async (_e, host, port) =>
      pingServer(
        z.string().min(1).max(255).parse(host),
        port === undefined ? undefined : z.number().int().min(1).max(65535).parse(port),
      ),
    ),
  );

  ipcMain.handle(
    IPC.capabilities.discordActivity,
    wrap(async (_e, activity) => {
      await discordActivity(DiscordActivity.parse(activity));
    }),
  );
}
