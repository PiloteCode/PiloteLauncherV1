import type { ModuleManifest, Profile, InstanceView, LauncherBridge } from '@pilote/types';

/**
 * The SDK a module receives in `setup(ctx)`. A module observes launcher events, reads
 * (limited) launcher state, uses main-backed capabilities, persists its own settings,
 * and contributes a little UI (a status line, action buttons, settings fields) to its
 * card in the Modules view. Modules never touch the filesystem or network directly.
 */

export interface ModuleAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'secondary' | 'destructive';
}

export interface ModuleSettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  placeholder?: string;
  help?: string;
}

export type ModuleEvent =
  | { type: 'session:start'; instanceId: string; instanceName: string }
  | { type: 'session:stop'; instanceId: string; instanceName: string }
  | { type: 'profile:change'; profile: Profile | null }
  | { type: 'instances:change'; instances: InstanceView[] }
  | { type: 'tick' };

export interface ModuleContext {
  readonly manifest: ModuleManifest;

  /** Subscribe to launcher events. Returns an unsubscribe fn (auto-cleaned on disable). */
  on(handler: (e: ModuleEvent) => void): () => void;

  /** Read-only-ish access to launcher state. */
  launcher: {
    activeProfile(): Profile | null;
    instances(): InstanceView[];
    runningIds(): string[];
    instanceById(id: string): InstanceView | undefined;
    /** Persist a per-instance RAM override (MB). Requires the 'overrides' permission. */
    setInstanceRam(instanceId: string, ramMb: number): Promise<void>;
  };

  /** Main-process capabilities (system RAM, server ping, Discord presence). */
  capabilities: LauncherBridge['capabilities'];

  /** Per-module persisted key/value store (saved with the module's settings). */
  storage: {
    get<T>(key: string, fallback: T): T;
    set(key: string, value: unknown): Promise<void>;
    all(): Record<string, unknown>;
  };

  /** Contribute UI to the module's card in the Modules view. */
  ui: {
    setSummary(text: string | null): void;
    setActions(actions: ModuleAction[]): void;
    setSettingsFields(fields: ModuleSettingField[]): void;
  };

  toast(message: string, kind?: 'success' | 'error' | 'info'): void;
  log(...args: unknown[]): void;
}

/** A module implementation. `id` must match a manifest in the registry. */
export interface PiloteModule {
  id: string;
  /** Called when the module is enabled. May return a cleanup fn called on disable. */
  setup(ctx: ModuleContext): void | (() => void) | Promise<void | (() => void)>;
}
