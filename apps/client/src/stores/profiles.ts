import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Profile, MojangLookup } from '@pilote/types';
import { getBridge } from '@/lib/bridge';

/**
 * Offline game profiles store. Backed by window.launcher.profiles.
 * No Microsoft/Mojang auth — usernames resolve to a real or canonical-offline UUID.
 */
export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<Profile[]>([]);
  const activeId = ref<string | null>(null);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref<string | null>(null);

  const active = computed<Profile | null>(
    () => profiles.value.find((p) => p.id === activeId.value) ?? null,
  );
  const hasProfile = computed(() => profiles.value.length > 0);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const bridge = getBridge();
      const [list, current] = await Promise.all([
        bridge.profiles.list(),
        bridge.profiles.getActive(),
      ]);
      profiles.value = list;
      activeId.value = current?.id ?? null;
      loaded.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  /** Resolve a username without persisting (live onboarding preview). */
  async function lookup(name: string): Promise<MojangLookup> {
    return getBridge().profiles.lookup(name);
  }

  async function create(name: string): Promise<Profile> {
    const profile = await getBridge().profiles.create(name);
    if (!profiles.value.some((p) => p.id === profile.id)) {
      profiles.value = [...profiles.value, profile];
    }
    // First profile becomes active automatically.
    if (!activeId.value) {
      await setActive(profile.id);
    }
    return profile;
  }

  async function setActive(id: string): Promise<void> {
    await getBridge().profiles.setActive(id);
    activeId.value = id;
  }

  async function remove(id: string): Promise<void> {
    await getBridge().profiles.remove(id);
    profiles.value = profiles.value.filter((p) => p.id !== id);
    if (activeId.value === id) {
      const next = profiles.value[0];
      activeId.value = next ? next.id : null;
      if (next) await getBridge().profiles.setActive(next.id);
    }
  }

  return {
    profiles,
    activeId,
    active,
    hasProfile,
    loading,
    loaded,
    error,
    load,
    lookup,
    create,
    setActive,
    remove,
  };
});
