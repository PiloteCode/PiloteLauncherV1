import type { LauncherBridge } from '@pilote/types';

/**
 * Typed accessor for the IPC surface injected by the Electron preload script.
 * The renderer never imports @pilote/core or node modules directly — every
 * privileged operation goes through this bridge.
 */
export function getBridge(): LauncherBridge {
  const bridge = (window as Window & { launcher?: LauncherBridge }).launcher;
  if (!bridge) {
    throw new Error(
      'window.launcher is unavailable — the preload bridge did not initialise. ' +
        'The renderer must run inside the Electron shell.',
    );
  }
  return bridge;
}

/** True when running inside the Electron shell with the bridge available. */
export function hasBridge(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { launcher?: LauncherBridge }).launcher);
}
