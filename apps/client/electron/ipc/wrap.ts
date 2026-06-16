import type { IpcMainInvokeEvent } from 'electron';
import { ZodError } from 'zod';
import { LauncherError } from '@pilote/types';
import { log } from '../main/logger.js';

/**
 * Wrap an `ipcMain.handle` callback so that any thrown value is converted into a
 * serialized {@link LauncherError}. Electron rejects the renderer's `invoke`
 * Promise with the thrown Error; we attach the serialized payload as the message
 * (JSON) and tag the error so the preload can rebuild a typed error.
 *
 * Zod validation failures become `validation` errors. This guarantees every IPC
 * payload is validated before any side effect runs (the handlers parse with Zod
 * up-front and rely on this wrapper to serialize failures).
 */
export type Handler<R> = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<R>;

export function wrap<R>(handler: Handler<R>): Handler<R> {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      const launcherError =
        err instanceof LauncherError
          ? err
          : err instanceof ZodError
            ? new LauncherError('validation', 'Données invalides.', { cause: err })
            : err instanceof Error
              ? new LauncherError('unknown', err.message, { cause: err })
              : new LauncherError('unknown', 'Erreur inconnue.');

      log.error(`IPC handler failed: ${launcherError.kind} — ${launcherError.message}`);

      // Encode the serialized error as JSON so the preload can reconstruct it.
      const wireError = new Error(JSON.stringify(launcherError.toJSON()));
      wireError.name = 'LauncherError';
      throw wireError;
    }
  };
}
