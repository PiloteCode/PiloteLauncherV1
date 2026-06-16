import type { LauncherBridge } from '@pilote/types';

/**
 * Ambient typing for the bridge exposed by the preload. The renderer accesses the
 * entire typed IPC surface through `window.launcher`.
 */
declare global {
  interface Window {
    launcher: LauncherBridge;
  }
}

export {};
