import { LauncherError, type ErrorKind } from '@pilote/types';

export { LauncherError } from '@pilote/types';
export type { ErrorKind, SerializedError } from '@pilote/types';

/**
 * Wrap any thrown value into a {@link LauncherError} of the given kind, preserving
 * the original as the error cause. If the value is already a LauncherError it is
 * returned unchanged so the original kind/retryable flags survive.
 */
export function wrapError(kind: ErrorKind, message: string, cause: unknown): LauncherError {
  if (cause instanceof LauncherError) {
    return cause;
  }
  return new LauncherError(kind, message, { cause });
}

/** Run an async operation, re-wrapping any failure as a typed {@link LauncherError}. */
export async function wrapAsync<T>(
  kind: ErrorKind,
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    throw wrapError(kind, message, cause);
  }
}

/** True when an unknown value is a {@link LauncherError}. */
export function isLauncherError(value: unknown): value is LauncherError {
  return value instanceof LauncherError;
}

/** Extract a short, human-readable message from any thrown value. */
export function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
