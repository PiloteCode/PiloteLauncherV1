import { join } from 'node:path';
import { app } from 'electron';
import log from 'electron-log/main';

/**
 * electron-log setup. The main log rotates per app session under
 * `userData/logs/main-<timestamp>.log`; game-session logs are written separately
 * by the instances service. Console + file transports are both enabled.
 */

let initialized = false;
let mainLogPath = '';

/** Absolute directory where all launcher logs live. */
export function logsDir(): string {
  return join(app.getPath('userData'), 'logs');
}

/** Absolute path of the current main-process log file. */
export function mainLogFile(): string {
  return mainLogPath;
}

/** Build the absolute path of a per-game-session log file. */
export function sessionLogFile(instanceId: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(logsDir(), `session-${safeId}-${stamp}.log`);
}

/**
 * Initialize logging. Safe to call once after `app` is ready (it reads
 * `app.getPath('userData')`).
 */
export function initLogger(): void {
  if (initialized) return;
  initialized = true;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mainLogPath = join(logsDir(), `main-${stamp}.log`);

  log.transports.file.resolvePathFn = () => mainLogPath;
  log.transports.file.level = 'info';
  log.transports.console.level = app.isPackaged ? 'warn' : 'debug';
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  // Capture renderer-side console + unhandled errors into the same file.
  log.initialize();
  log.errorHandler.startCatching({ showDialog: false });

  log.info(`Pilote Project launcher starting — v${app.getVersion()}`);
  log.info(`userData: ${app.getPath('userData')}`);
}

export { log };
