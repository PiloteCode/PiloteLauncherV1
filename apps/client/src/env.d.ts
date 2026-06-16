/// <reference types="vite/client" />

import type { LauncherBridge } from '@pilote/types';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare global {
  interface Window {
    /** Typed IPC surface injected by the Electron preload script. */
    launcher: LauncherBridge;
  }
}

export {};
