import type { BrowserWindow } from 'electron';
import { registerAppHandlers } from './app.js';
import { registerSettingsHandlers } from './settings.js';
import { registerProfileHandlers } from './profiles.js';
import { registerInstanceHandlers } from './instances.js';
import { registerUpdaterHandlers } from './updater.js';

/**
 * Register every IPC handler. Window-scoped handlers (frameless controls) bind to
 * the supplied window; the rest are global. Call exactly once after the window is
 * created. Each handler validates its payload with Zod and serializes errors via
 * the `wrap` helper.
 */
export function registerIpc(win: BrowserWindow): void {
  registerAppHandlers(win);
  registerSettingsHandlers();
  registerProfileHandlers();
  registerInstanceHandlers();
  registerUpdaterHandlers();
}
