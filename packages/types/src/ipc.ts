import type { Instance, InstanceDto, InstanceInstallState } from './instance.js';
import type { Profile, MojangLookup } from './profile.js';
import type { LaunchOptions, ProgressEvent, LogLine, SessionExit } from './launch.js';
import type { Settings, InstanceOverride, UnlockedInstance } from './settings.js';
import type { SerializedError } from './errors.js';

/**
 * The complete typed IPC surface exposed to the renderer as `window.launcher`.
 * The preload bridges each method to a main-process handler; every payload is
 * validated with Zod in the main process before doing any work.
 *
 * Request/response methods are `invoke`-style (return Promises).
 * Event subscriptions return an unsubscribe function.
 */

/** A combined instance + local state, as the renderer consumes it. */
export interface InstanceView extends InstanceDto {
  state: InstanceInstallState;
  /** Local installed manifest version, if any. */
  localVersion?: number;
}

export interface LauncherBridge {
  // ── App / meta ────────────────────────────────────────────────────────────
  app: {
    getVersion(): Promise<string>;
    /** Frameless window controls. */
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    openExternal(url: string): Promise<void>;
    openPath(target: 'logs' | 'instances' | 'java'): Promise<void>;
  };

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;
    pickDirectory(): Promise<string | null>;
    getOverride(instanceId: string): Promise<InstanceOverride | null>;
    setOverride(override: InstanceOverride): Promise<void>;
  };

  // ── Profiles (offline auth + UUID) ───────────────────────────────────────────
  profiles: {
    list(): Promise<Profile[]>;
    getActive(): Promise<Profile | null>;
    setActive(id: string): Promise<void>;
    /** Resolve a username via Mojang (cached + backoff) without persisting. */
    lookup(name: string): Promise<MojangLookup>;
    /** Create & persist a profile from a username (resolves UUID/skin). */
    create(name: string): Promise<Profile>;
    remove(id: string): Promise<void>;
  };

  // ── Instances ────────────────────────────────────────────────────────────────
  instances: {
    /** Public instances from the backend, merged with local install state. */
    listPublic(): Promise<InstanceView[]>;
    /** Locally persisted unlocked private instances, merged with state. */
    listUnlocked(): Promise<InstanceView[]>;
    /** Unlock a private instance with an access code; persists token on success. */
    unlock(code: string): Promise<InstanceView>;
    /** Forget a previously unlocked private instance. */
    forget(instanceId: string): Promise<void>;
    /** Full record incl. changelog/description for the detail screen. */
    get(instanceId: string): Promise<Instance>;
    /** Install or update (resolves + downloads everything via the pipeline). */
    install(instanceId: string): Promise<void>;
    /** Launch the game. Emits progress, then logs, then a session-exit event. */
    launch(instanceId: string, options?: Partial<LaunchOptions>): Promise<void>;
    /** Kill a running session. */
    kill(instanceId: string): Promise<void>;
    /** Currently running instance ids. */
    running(): Promise<string[]>;
  };

  // ── Updater ──────────────────────────────────────────────────────────────────
  updater: {
    check(): Promise<{ available: boolean; version?: string }>;
    downloadAndInstall(): Promise<void>;
  };

  // ── Events (main -> renderer) ─────────────────────────────────────────────────
  on: {
    progress(cb: (e: ProgressEvent) => void): () => void;
    log(cb: (e: LogLine) => void): () => void;
    sessionExit(cb: (e: SessionExit) => void): () => void;
    error(cb: (e: SerializedError & { instanceId?: string }) => void): () => void;
    updaterStatus(
      cb: (e: { status: 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error'; version?: string; percent?: number }) => void,
    ): () => void;
  };
}

/** Channel name constants, shared between preload and main handlers. */
export const IPC = {
  app: {
    getVersion: 'app:getVersion',
    minimize: 'app:minimize',
    toggleMaximize: 'app:toggleMaximize',
    close: 'app:close',
    openExternal: 'app:openExternal',
    openPath: 'app:openPath',
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    pickDirectory: 'settings:pickDirectory',
    getOverride: 'settings:getOverride',
    setOverride: 'settings:setOverride',
  },
  profiles: {
    list: 'profiles:list',
    getActive: 'profiles:getActive',
    setActive: 'profiles:setActive',
    lookup: 'profiles:lookup',
    create: 'profiles:create',
    remove: 'profiles:remove',
  },
  instances: {
    listPublic: 'instances:listPublic',
    listUnlocked: 'instances:listUnlocked',
    unlock: 'instances:unlock',
    forget: 'instances:forget',
    get: 'instances:get',
    install: 'instances:install',
    launch: 'instances:launch',
    kill: 'instances:kill',
    running: 'instances:running',
  },
  updater: {
    check: 'updater:check',
    downloadAndInstall: 'updater:downloadAndInstall',
  },
  events: {
    progress: 'evt:progress',
    log: 'evt:log',
    sessionExit: 'evt:sessionExit',
    error: 'evt:error',
    updaterStatus: 'evt:updaterStatus',
  },
} as const;

export type { UnlockedInstance };
