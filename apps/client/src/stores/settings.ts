import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Settings, Theme, Locale } from '@pilote/types';
import { getBridge } from '@/lib/bridge';

/**
 * Launcher settings store, backed by window.launcher.settings.
 * Applies the theme to <html> whenever it changes.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref<string | null>(null);

  const theme = computed<Theme>(() => settings.value?.theme ?? 'dark');
  const locale = computed<Locale>(() => settings.value?.locale ?? 'fr');
  const globalRamMb = computed(() => settings.value?.globalRamMb ?? 4096);
  const apiBaseUrl = computed(() => settings.value?.apiBaseUrl ?? '');
  const autoCheckUpdates = computed(() => settings.value?.autoCheckUpdates ?? true);

  function applyTheme(t: Theme): void {
    const root = document.documentElement;
    root.classList.toggle('dark', t === 'dark');
    root.classList.toggle('light', t === 'light');
  }

  function applyAccent(color: string | undefined): void {
    if (color) document.documentElement.style.setProperty('--accent', color);
  }

  async function load(): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      const s = await getBridge().settings.get();
      settings.value = s;
      applyTheme(s.theme);
      applyAccent(s.accentColor);
      loaded.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  async function update(patch: Partial<Settings>): Promise<void> {
    const next = await getBridge().settings.update(patch);
    settings.value = next;
    applyTheme(next.theme);
    applyAccent(next.accentColor);
  }

  async function setTheme(t: Theme): Promise<void> {
    applyTheme(t); // optimistic for snappy toggle
    await update({ theme: t });
  }

  async function setLocale(l: Locale): Promise<void> {
    await update({ locale: l });
  }

  async function setGlobalRam(mb: number): Promise<void> {
    await update({ globalRamMb: mb });
  }

  async function pickDirectory(): Promise<string | null> {
    return getBridge().settings.pickDirectory();
  }

  return {
    settings,
    loading,
    loaded,
    error,
    theme,
    locale,
    globalRamMb,
    apiBaseUrl,
    autoCheckUpdates,
    load,
    update,
    setTheme,
    setLocale,
    setGlobalRam,
    pickDirectory,
    applyTheme,
  };
});
