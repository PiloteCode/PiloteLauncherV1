import { LauncherError, type SerializedError, type ErrorKind } from '@pilote/types';

/**
 * Coerce any thrown value into a {@link LauncherError}. Already-typed launcher
 * errors are returned unchanged; everything else is wrapped with a best-effort
 * kind so the renderer always receives a clean, serializable error.
 */
export function toLauncherError(err: unknown, fallbackKind: ErrorKind = 'unknown'): LauncherError {
  if (err instanceof LauncherError) return err;
  if (err instanceof Error) {
    return new LauncherError(fallbackKind, err.message, { cause: err });
  }
  return new LauncherError(fallbackKind, typeof err === 'string' ? err : 'Unknown error');
}

/** Serialize any thrown value to the wire shape the renderer consumes. */
export function serializeError(err: unknown, fallbackKind: ErrorKind = 'unknown'): SerializedError {
  return toLauncherError(err, fallbackKind).toJSON();
}
