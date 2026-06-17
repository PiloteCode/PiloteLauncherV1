import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC } from '@pilote/types';
import type {
  LauncherBridge,
  Settings,
  Profile,
  MojangLookup,
  Instance,
  InstanceView,
  InstanceOverride,
  LaunchOptions,
  ProgressEvent,
  LogLine,
  SessionExit,
  ModuleView,
  ServerPing,
  DiscordActivity,
  SerializedError,
} from '@pilote/types';

/**
 * Preload bridge. Exposes a single `window.launcher` object implementing the
 * `LauncherBridge` contract. Every request method proxies to `ipcRenderer.invoke`
 * with the matching channel constant; every event method subscribes via
 * `ipcRenderer.on` and returns an unsubscribe function.
 *
 * The main process serializes domain errors as JSON in the rejected Error's
 * message (see ipc/wrap.ts); we rethrow a reconstructed `SerializedError` so the
 * renderer always receives a typed `{ kind, message, retryable }` shape.
 */

const VALID_KINDS = new Set<string>([
  'network',
  'integrity',
  'java',
  'launch',
  'auth',
  'validation',
  'not-found',
  'unknown',
]);

function asSerializedError(value: unknown): SerializedError | null {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { kind?: unknown }).kind === 'string' &&
    VALID_KINDS.has((value as { kind: string }).kind) &&
    typeof (value as { message?: unknown }).message === 'string'
  ) {
    const v = value as { kind: string; message: string; cause?: unknown; retryable?: unknown };
    const out: SerializedError = {
      kind: v.kind as SerializedError['kind'],
      message: v.message,
      retryable: v.retryable === true,
    };
    if (typeof v.cause === 'string') out.cause = v.cause;
    return out;
  }
  return null;
}

/**
 * Reconstruct a typed {@link SerializedError} from the wire format produced by the
 * main process. The main process throws an Error whose message is the JSON of a
 * SerializedError; Electron prefixes the rejected message with
 * `"Error invoking remote method 'CHANNEL': LauncherError: <json>"`, so we extract
 * the embedded JSON object from anywhere in the string.
 */
function reviveError(err: unknown): never {
  if (err instanceof Error && typeof err.message === 'string') {
    const start = err.message.indexOf('{');
    const end = err.message.lastIndexOf('}');
    if (start !== -1 && end > start) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(err.message.slice(start, end + 1));
      } catch {
        parsed = undefined;
      }
      const serialized = asSerializedError(parsed);
      if (serialized) throw serialized;
    }
  }
  const fallback: SerializedError = {
    kind: 'unknown',
    message: err instanceof Error ? err.message : 'Erreur inconnue.',
    retryable: false,
  };
  throw fallback;
}

async function invoke<R>(channel: string, ...args: unknown[]): Promise<R> {
  try {
    return (await ipcRenderer.invoke(channel, ...args)) as R;
  } catch (err) {
    reviveError(err);
  }
}

/** Subscribe to a main->renderer event channel; returns an unsubscribe fn. */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const launcher: LauncherBridge = {
  app: {
    getVersion: () => invoke<string>(IPC.app.getVersion),
    minimize: () => invoke<void>(IPC.app.minimize),
    toggleMaximize: () => invoke<void>(IPC.app.toggleMaximize),
    close: () => invoke<void>(IPC.app.close),
    openExternal: (url: string) => invoke<void>(IPC.app.openExternal, url),
    openPath: (target: 'logs' | 'instances' | 'java') =>
      invoke<void>(IPC.app.openPath, target),
  },

  settings: {
    get: () => invoke<Settings>(IPC.settings.get),
    update: (patch: Partial<Settings>) => invoke<Settings>(IPC.settings.update, patch),
    pickDirectory: () => invoke<string | null>(IPC.settings.pickDirectory),
    getOverride: (instanceId: string) =>
      invoke<InstanceOverride | null>(IPC.settings.getOverride, instanceId),
    setOverride: (override: InstanceOverride) =>
      invoke<void>(IPC.settings.setOverride, override),
  },

  profiles: {
    list: () => invoke<Profile[]>(IPC.profiles.list),
    getActive: () => invoke<Profile | null>(IPC.profiles.getActive),
    setActive: (id: string) => invoke<void>(IPC.profiles.setActive, id),
    lookup: (name: string) => invoke<MojangLookup>(IPC.profiles.lookup, name),
    create: (name: string) => invoke<Profile>(IPC.profiles.create, name),
    remove: (id: string) => invoke<void>(IPC.profiles.remove, id),
  },

  instances: {
    listPublic: () => invoke<InstanceView[]>(IPC.instances.listPublic),
    listUnlocked: () => invoke<InstanceView[]>(IPC.instances.listUnlocked),
    unlock: (code: string) => invoke<InstanceView>(IPC.instances.unlock, code),
    forget: (instanceId: string) => invoke<void>(IPC.instances.forget, instanceId),
    get: (instanceId: string) => invoke<Instance>(IPC.instances.get, instanceId),
    install: (instanceId: string) => invoke<void>(IPC.instances.install, instanceId),
    launch: (instanceId: string, options?: Partial<LaunchOptions>) =>
      invoke<void>(IPC.instances.launch, instanceId, options),
    kill: (instanceId: string) => invoke<void>(IPC.instances.kill, instanceId),
    running: () => invoke<string[]>(IPC.instances.running),
  },

  updater: {
    check: () => invoke<{ available: boolean; version?: string }>(IPC.updater.check),
    downloadAndInstall: () => invoke<void>(IPC.updater.downloadAndInstall),
  },

  modules: {
    list: () => invoke<ModuleView[]>(IPC.modules.list),
    setEnabled: (id: string, enabled: boolean) =>
      invoke<void>(IPC.modules.setEnabled, id, enabled),
    getSettings: (id: string) =>
      invoke<Record<string, unknown>>(IPC.modules.getSettings, id),
    setSettings: (id: string, settings: Record<string, unknown>) =>
      invoke<void>(IPC.modules.setSettings, id, settings),
    install: (id: string) => invoke<ModuleView>(IPC.modules.install, id),
  },

  capabilities: {
    systemMemoryMb: () => invoke<number>(IPC.capabilities.systemMemoryMb),
    pingServer: (host: string, port?: number) =>
      invoke<ServerPing>(IPC.capabilities.pingServer, host, port),
    discordActivity: (activity: DiscordActivity | null) =>
      invoke<void>(IPC.capabilities.discordActivity, activity),
  },

  on: {
    progress: (cb: (e: ProgressEvent) => void) => subscribe(IPC.events.progress, cb),
    log: (cb: (e: LogLine) => void) => subscribe(IPC.events.log, cb),
    sessionExit: (cb: (e: SessionExit) => void) => subscribe(IPC.events.sessionExit, cb),
    error: (cb: (e: SerializedError & { instanceId?: string }) => void) =>
      subscribe(IPC.events.error, cb),
    updaterStatus: (
      cb: (e: {
        status: 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error';
        version?: string;
        percent?: number;
      }) => void,
    ) => subscribe(IPC.events.updaterStatus, cb),
    deepLink: (cb: (e: { url: string; action?: string; id?: string }) => void) =>
      subscribe(IPC.events.deepLink, cb),
  },
};

contextBridge.exposeInMainWorld('launcher', launcher);
