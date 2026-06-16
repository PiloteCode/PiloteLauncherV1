import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  InstanceView,
  Instance,
  InstanceInstallState,
  LaunchOptions,
} from '@pilote/types';
import { getBridge } from '@/lib/bridge';
import { useDownloadsStore } from '@/stores/downloads';

/**
 * Library store: public + unlocked private instances merged with local install state.
 * Tracks running ids via session-exit events and the running() query.
 */
export const useInstancesStore = defineStore('instances', () => {
  const publicInstances = ref<InstanceView[]>([]);
  const unlockedInstances = ref<InstanceView[]>([]);
  const runningIds = ref<string[]>([]);

  const loading = ref(false);
  const loaded = ref(false);
  const error = ref<string | null>(null);
  const offline = ref(false);

  let exitUnsub: (() => void) | null = null;

  const all = computed<InstanceView[]>(() => [...publicInstances.value, ...unlockedInstances.value]);

  function byId(id: string): InstanceView | undefined {
    return all.value.find((i) => i.id === id);
  }

  function isRunning(id: string): boolean {
    return runningIds.value.includes(id);
  }

  /** Effective state including the live running flag. */
  function stateOf(view: InstanceView): InstanceInstallState {
    return isRunning(view.id) ? 'running' : view.state;
  }

  function applyRunning(view: InstanceView): InstanceView {
    return isRunning(view.id) ? { ...view, state: 'running' } : view;
  }

  async function refreshRunning(): Promise<void> {
    try {
      runningIds.value = await getBridge().instances.running();
    } catch {
      runningIds.value = [];
    }
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    offline.value = false;
    try {
      const bridge = getBridge();
      const [pub, unlocked] = await Promise.all([
        bridge.instances.listPublic(),
        bridge.instances.listUnlocked(),
      ]);
      publicInstances.value = pub.map(applyRunning);
      unlockedInstances.value = unlocked.map(applyRunning);
      await refreshRunning();
      loaded.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      offline.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function get(id: string): Promise<Instance> {
    return getBridge().instances.get(id);
  }

  function patchState(id: string, state: InstanceInstallState, localVersion?: number): void {
    const patch = (list: InstanceView[]) =>
      list.map((i) =>
        i.id === id ? { ...i, state, localVersion: localVersion ?? i.localVersion } : i,
      );
    publicInstances.value = patch(publicInstances.value);
    unlockedInstances.value = patch(unlockedInstances.value);
  }

  /** Unlock a private instance with an access code; persists & adds to the library. */
  async function unlock(code: string): Promise<InstanceView> {
    const view = await getBridge().instances.unlock(code);
    const merged = applyRunning(view);
    const existingIdx = unlockedInstances.value.findIndex((i) => i.id === merged.id);
    if (existingIdx >= 0) {
      const next = [...unlockedInstances.value];
      next[existingIdx] = merged;
      unlockedInstances.value = next;
    } else {
      unlockedInstances.value = [...unlockedInstances.value, merged];
    }
    return merged;
  }

  async function forget(id: string): Promise<void> {
    await getBridge().instances.forget(id);
    unlockedInstances.value = unlockedInstances.value.filter((i) => i.id !== id);
  }

  async function install(id: string): Promise<void> {
    const view = byId(id);
    const downloads = useDownloadsStore();
    downloads.begin(id, view?.name ?? '');
    try {
      await getBridge().instances.install(id);
      patchState(id, 'installed', view?.version);
    } catch (e) {
      downloads.clear();
      throw e;
    }
  }

  async function launch(id: string, options?: Partial<LaunchOptions>): Promise<void> {
    const view = byId(id);
    const downloads = useDownloadsStore();
    downloads.begin(id, view?.name ?? '');
    try {
      await getBridge().instances.launch(id, options);
      if (!runningIds.value.includes(id)) runningIds.value = [...runningIds.value, id];
      patchState(id, 'running', view?.version);
    } catch (e) {
      downloads.clear();
      throw e;
    }
  }

  async function kill(id: string): Promise<void> {
    await getBridge().instances.kill(id);
    runningIds.value = runningIds.value.filter((r) => r !== id);
    patchState(id, 'installed');
  }

  /** Subscribe to session-exit so running banners clear themselves. */
  function init(): void {
    if (exitUnsub) return;
    const downloads = useDownloadsStore();
    exitUnsub = downloads.onExit((e) => {
      runningIds.value = runningIds.value.filter((r) => r !== e.instanceId);
      const view = byId(e.instanceId);
      if (!view) return;
      // A running session implies the instance is installed; recompute against remote version.
      const next: InstanceInstallState =
        view.localVersion !== undefined && view.localVersion < view.version
          ? 'update-available'
          : 'installed';
      patchState(e.instanceId, next);
    });
  }

  function dispose(): void {
    exitUnsub?.();
    exitUnsub = null;
  }

  return {
    publicInstances,
    unlockedInstances,
    runningIds,
    loading,
    loaded,
    error,
    offline,
    all,
    byId,
    isRunning,
    stateOf,
    load,
    get,
    unlock,
    forget,
    install,
    launch,
    kill,
    refreshRunning,
    patchState,
    init,
    dispose,
  };
});
