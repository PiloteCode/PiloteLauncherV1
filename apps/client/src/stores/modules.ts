import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import type { ModuleView } from '@pilote/types';
import { getBridge, hasBridge } from '@/lib/bridge';
import { useInstancesStore } from '@/stores/instances';
import { useProfilesStore } from '@/stores/profiles';
import { BUILTIN_MODULE_IMPLS } from '@/modules/builtin';
import type { ModuleAction, ModuleContext, ModuleEvent, ModuleSettingField } from '@/modules/sdk';

interface ModuleUi {
  summary: string | null;
  actions: ModuleAction[];
  settingsFields: ModuleSettingField[];
}

/**
 * Module runtime. Loads the launcher's modules, runs the enabled ones, feeds them
 * launcher events (session start/stop, profile/instance changes, a periodic tick) and
 * collects the little UI each one contributes to its card in the Modules view.
 */
export const useModulesStore = defineStore('modules', () => {
  const modules = ref<ModuleView[]>([]);
  const loaded = ref(false);
  const ui = ref<Record<string, ModuleUi>>({});

  const handlers = new Map<string, Set<(e: ModuleEvent) => void>>();
  const cleanups = new Map<string, () => void>();
  const started = new Set<string>();
  const settingsCache = new Map<string, Record<string, unknown>>();
  let disposers: Array<() => void> = [];

  function ensureUi(id: string): ModuleUi {
    if (!ui.value[id]) ui.value[id] = { summary: null, actions: [], settingsFields: [] };
    return ui.value[id]!;
  }

  function dispatch(event: ModuleEvent): void {
    for (const set of handlers.values()) {
      for (const handler of set) {
        try {
          handler(event);
        } catch (err) {
          console.error('[modules] handler error', err);
        }
      }
    }
  }

  function makeContext(view: ModuleView): ModuleContext {
    const instances = useInstancesStore();
    const profiles = useProfilesStore();
    const id = view.id;
    const set = handlers.get(id) ?? new Set();
    handlers.set(id, set);

    return {
      manifest: view,
      on(handler) {
        set.add(handler);
        return () => set.delete(handler);
      },
      launcher: {
        activeProfile: () => profiles.active,
        instances: () => instances.all,
        runningIds: () => instances.runningIds,
        instanceById: (iid: string) => instances.byId(iid),
        setInstanceRam: async (instanceId: string, ramMb: number) => {
          await getBridge().settings.setOverride({ instanceId, ramMb });
        },
      },
      capabilities: getBridge().capabilities,
      storage: {
        get: <T>(key: string, fallback: T): T => {
          const v = settingsCache.get(id)?.[key];
          return (v === undefined ? fallback : (v as T));
        },
        set: async (key: string, value: unknown) => {
          const next = { ...(settingsCache.get(id) ?? {}), [key]: value };
          settingsCache.set(id, next);
          const entry = modules.value.find((m) => m.id === id);
          if (entry) entry.settings = next;
          await getBridge().modules.setSettings(id, next);
        },
        all: () => settingsCache.get(id) ?? {},
      },
      ui: {
        setSummary: (text) => {
          ensureUi(id).summary = text;
        },
        setActions: (actions) => {
          ensureUi(id).actions = actions;
        },
        setSettingsFields: (fields) => {
          ensureUi(id).settingsFields = fields;
        },
      },
      toast: (message, kind) => {
        if (kind === 'success') toast.success(message);
        else if (kind === 'error') toast.error(message);
        else toast(message);
      },
      log: (...args) => console.log(`[module:${id}]`, ...args),
    };
  }

  async function start(id: string): Promise<void> {
    if (started.has(id)) return;
    const impl = BUILTIN_MODULE_IMPLS[id];
    const view = modules.value.find((m) => m.id === id);
    if (!impl || !view) return;
    ensureUi(id);
    started.add(id);
    try {
      const cleanup = await impl.setup(makeContext(view));
      cleanups.set(id, typeof cleanup === 'function' ? cleanup : () => undefined);
    } catch (err) {
      console.error(`[modules] failed to start "${id}"`, err);
      started.delete(id);
    }
  }

  function stop(id: string): void {
    cleanups.get(id)?.();
    cleanups.delete(id);
    handlers.delete(id);
    started.delete(id);
    ui.value[id] = { summary: null, actions: [], settingsFields: [] };
  }

  async function setEnabled(id: string, enabled: boolean): Promise<void> {
    await getBridge().modules.setEnabled(id, enabled);
    const entry = modules.value.find((m) => m.id === id);
    if (entry) entry.enabled = enabled;
    if (enabled) await start(id);
    else stop(id);
  }

  /** Install (enable + run) a module by id — used by the marketplace deep-link. */
  async function install(id: string): Promise<ModuleView | null> {
    const view = await getBridge().modules.install(id);
    const idx = modules.value.findIndex((m) => m.id === id);
    if (idx >= 0) modules.value[idx] = view;
    else modules.value.push(view);
    settingsCache.set(id, view.settings);
    await start(id);
    return view;
  }

  /** Persist a module's settings and restart it so the change takes effect. */
  async function saveSettings(id: string, settings: Record<string, unknown>): Promise<void> {
    await getBridge().modules.setSettings(id, settings);
    settingsCache.set(id, settings);
    const entry = modules.value.find((m) => m.id === id);
    if (entry) entry.settings = settings;
    if (started.has(id)) {
      stop(id);
      await start(id);
    }
  }

  async function load(): Promise<void> {
    if (!hasBridge()) return;
    const list = await getBridge().modules.list();
    modules.value = list;
    for (const m of list) {
      settingsCache.set(m.id, m.settings);
      ensureUi(m.id);
    }
  }

  async function init(): Promise<void> {
    if (loaded.value || !hasBridge()) return;
    await load();
    loaded.value = true;

    const instances = useInstancesStore();
    const profiles = useProfilesStore();

    for (const m of modules.value) if (m.enabled) await start(m.id);

    // Session start/stop derived from the running set.
    disposers.push(
      watch(
        () => instances.runningIds.slice(),
        (next, prev) => {
          const before = prev ?? [];
          for (const id of next) {
            if (!before.includes(id)) {
              dispatch({
                type: 'session:start',
                instanceId: id,
                instanceName: instances.byId(id)?.name ?? id,
              });
            }
          }
          for (const id of before) {
            if (!next.includes(id)) {
              dispatch({
                type: 'session:stop',
                instanceId: id,
                instanceName: instances.byId(id)?.name ?? id,
              });
            }
          }
        },
      ),
    );

    disposers.push(
      watch(
        () => profiles.active,
        (profile) => dispatch({ type: 'profile:change', profile }),
      ),
    );

    disposers.push(
      watch(
        () => instances.all,
        (list) => dispatch({ type: 'instances:change', instances: list }),
        { deep: false },
      ),
    );

    const tick = window.setInterval(() => dispatch({ type: 'tick' }), 30_000);
    disposers.push(() => window.clearInterval(tick));
  }

  function dispose(): void {
    for (const id of [...started]) stop(id);
    for (const d of disposers) d();
    disposers = [];
    loaded.value = false;
  }

  return { modules, loaded, ui, init, dispose, setEnabled, install, saveSettings, load };
});
