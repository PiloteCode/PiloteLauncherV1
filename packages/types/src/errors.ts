import { z } from 'zod';

/** Typed error categories surfaced to the UI. */
export const ErrorKindSchema = z.enum([
  'network', // fetch/download failure, timeouts
  'integrity', // SHA-1 mismatch after download
  'java', // JRE provisioning/exec failure
  'launch', // process spawn / classpath failure
  'auth', // Mojang lookup / unlock failure
  'validation', // bad payload (Zod)
  'not-found', // instance/file missing
  'unknown',
]);
export type ErrorKind = z.infer<typeof ErrorKindSchema>;

export interface SerializedError {
  kind: ErrorKind;
  message: string;
  /** Optional cause chain for logs. */
  cause?: string;
  retryable: boolean;
}

/** Domain error used across core + IPC. Serializes cleanly over the IPC boundary. */
export class LauncherError extends Error {
  readonly kind: ErrorKind;
  readonly retryable: boolean;

  constructor(kind: ErrorKind, message: string, options?: { cause?: unknown; retryable?: boolean }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'LauncherError';
    this.kind = kind;
    this.retryable = options?.retryable ?? (kind === 'network' || kind === 'integrity');
  }

  toJSON(): SerializedError {
    return {
      kind: this.kind,
      message: this.message,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
      retryable: this.retryable,
    };
  }
}
