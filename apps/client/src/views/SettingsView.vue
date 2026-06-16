<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { motion } from 'motion-v';
import {
  MemoryStick,
  Folder,
  FolderOpen,
  Moon,
  Sun,
  Languages,
  Info,
  RefreshCw,
  Loader2,
  ExternalLink,
  Check,
} from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import type { Theme, Locale, Settings } from '@pilote/types';
import Sidebar from '@/components/Sidebar.vue';
import { Button, ScrollArea, Slider, Switch } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { getBridge, hasBridge } from '@/lib/bridge';
import { formatRam } from '@/lib/utils';

const settingsStore = useSettingsStore();
const { settings, loaded } = storeToRefs(settingsStore);

const ram = ref<number[]>([4096]);
const checking = ref(false);
const appVersion = ref('');
const totalRamGb = 32; // slider ceiling; per-machine cap is enforced by the core at launch

const ramLabel = computed(() => formatRam(ram.value[0] ?? 4096));

const themeValue = computed<Theme>(() => settings.value?.theme ?? 'dark');
const localeValue = computed<Locale>(() => settings.value?.locale ?? 'fr');
const autoUpdate = computed({
  get: () => settings.value?.autoCheckUpdates ?? true,
  set: (v: boolean) => void settingsStore.update({ autoCheckUpdates: v }),
});

const folders = computed(() => [
  { key: 'instances' as const, label: 'Dossier des instances', path: settings.value?.instancesDir ?? '', open: 'instances' as const },
  { key: 'java' as const, label: 'Dossier Java (JRE)', path: settings.value?.javaDir ?? '', open: 'java' as const },
]);

onMounted(async () => {
  if (!loaded.value) await settingsStore.load();
  if (settings.value) ram.value = [settings.value.globalRamMb];
  if (hasBridge()) {
    try {
      appVersion.value = await getBridge().app.getVersion();
    } catch {
      appVersion.value = '';
    }
  }
});

watch(settings, (s) => {
  if (s) ram.value = [s.globalRamMb];
});

let ramTimer: number | undefined;
watch(ram, (v) => {
  const value = v[0];
  if (value === undefined) return;
  if (ramTimer) window.clearTimeout(ramTimer);
  ramTimer = window.setTimeout(() => {
    void settingsStore.setGlobalRam(value);
  }, 350);
});

async function setTheme(t: Theme): Promise<void> {
  if (t === themeValue.value) return;
  try {
    await settingsStore.setTheme(t);
  } catch (e) {
    toast.error('Impossible de changer le thème', { description: e instanceof Error ? e.message : undefined });
  }
}

async function setLocale(l: Locale): Promise<void> {
  if (l === localeValue.value) return;
  try {
    await settingsStore.setLocale(l);
  } catch (e) {
    toast.error('Impossible de changer la langue', { description: e instanceof Error ? e.message : undefined });
  }
}

async function changeFolder(key: 'instancesDir' | 'javaDir'): Promise<void> {
  const dir = await settingsStore.pickDirectory();
  if (!dir) return;
  try {
    const patch: Partial<Settings> = key === 'instancesDir' ? { instancesDir: dir } : { javaDir: dir };
    await settingsStore.update(patch);
    toast.success('Dossier mis à jour');
  } catch (e) {
    toast.error('Impossible de changer le dossier', { description: e instanceof Error ? e.message : undefined });
  }
}

function openFolder(target: 'instances' | 'java'): void {
  if (hasBridge()) void getBridge().app.openPath(target);
}

function openProjectSite(): void {
  if (hasBridge()) void getBridge().app.openExternal('https://github.com');
}

async function checkUpdates(): Promise<void> {
  if (!hasBridge()) return;
  checking.value = true;
  try {
    const res = await getBridge().updater.check();
    if (res.available) {
      toast.info('Mise à jour disponible', { description: res.version ? `Version ${res.version}` : undefined });
    } else {
      toast.success('Lanceur à jour', { description: 'Vous utilisez la dernière version.' });
    }
  } catch (e) {
    toast.error('Vérification impossible', { description: e instanceof Error ? e.message : undefined });
  } finally {
    checking.value = false;
  }
}
</script>

<template>
  <div class="flex h-full w-full">
    <Sidebar />

    <ScrollArea class="flex-1" viewport-class="px-7 py-6">
      <div class="mx-auto max-w-[720px] animate-fade space-y-5">
        <header>
          <h1 class="text-[22px] font-semibold tracking-tight text-fg-1">Réglages</h1>
          <p class="mt-0.5 text-[13px] text-muted-2">Personnalisez le lanceur et ses ressources.</p>
        </header>

        <!-- Mémoire (RAM) -->
        <section class="rounded-[18px] border border-border bg-surface-elevated p-5">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2 text-accent">
              <MemoryStick class="h-4 w-4" />
            </span>
            <div>
              <h2 class="text-[14px] font-semibold text-fg-1">Mémoire allouée</h2>
              <p class="text-[12px] text-muted-2">RAM par défaut pour chaque instance.</p>
            </div>
            <span class="ml-auto font-mono text-[15px] font-medium text-fg-1">{{ ramLabel }}</span>
          </div>
          <Slider v-model="ram" :min="1024" :max="totalRamGb * 1024" :step="512" />
          <div class="mt-2 flex justify-between font-mono text-[11px] text-muted-3">
            <span>1 Go</span>
            <span>{{ totalRamGb }} Go</span>
          </div>
        </section>

        <!-- Dossiers -->
        <section class="rounded-[18px] border border-border bg-surface-elevated p-5">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2 text-fg-3">
              <Folder class="h-4 w-4" />
            </span>
            <div>
              <h2 class="text-[14px] font-semibold text-fg-1">Dossiers</h2>
              <p class="text-[12px] text-muted-2">Emplacements de stockage du lanceur.</p>
            </div>
          </div>
          <div class="space-y-2.5">
            <div
              v-for="f in folders"
              :key="f.key"
              class="flex items-center gap-3 rounded-[12px] border border-border bg-surface-input p-3"
            >
              <div class="min-w-0 flex-1">
                <p class="text-[12.5px] font-medium text-fg-2">{{ f.label }}</p>
                <p class="truncate font-mono text-[11px] text-muted-2" :title="f.path">{{ f.path || '—' }}</p>
              </div>
              <Button variant="ghost" size="icon-sm" title="Ouvrir" @click="openFolder(f.open)">
                <FolderOpen class="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                @click="changeFolder(f.key === 'instances' ? 'instancesDir' : 'javaDir')"
              >
                Modifier
              </Button>
            </div>
          </div>
        </section>

        <!-- Apparence -->
        <section class="rounded-[18px] border border-border bg-surface-elevated p-5">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2 text-fg-3">
              <Moon class="h-4 w-4" />
            </span>
            <div>
              <h2 class="text-[14px] font-semibold text-fg-1">Apparence</h2>
              <p class="text-[12px] text-muted-2">Thème et langue de l'interface.</p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[13px] text-fg-3">Thème</span>
              <div class="inline-flex rounded-[10px] border border-border-2 bg-surface-input p-1">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-ring"
                  :class="themeValue === 'dark' ? 'bg-surface-2 text-fg-1' : 'text-muted hover:text-fg-2'"
                  @click="setTheme('dark')"
                >
                  <Moon class="h-3.5 w-3.5" /> Sombre
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-ring"
                  :class="themeValue === 'light' ? 'bg-surface-2 text-fg-1' : 'text-muted hover:text-fg-2'"
                  @click="setTheme('light')"
                >
                  <Sun class="h-3.5 w-3.5" /> Clair
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 text-[13px] text-fg-3">
                <Languages class="h-4 w-4 text-muted-2" /> Langue
              </span>
              <div class="inline-flex rounded-[10px] border border-border-2 bg-surface-input p-1">
                <button
                  type="button"
                  class="rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-ring"
                  :class="localeValue === 'fr' ? 'bg-surface-2 text-fg-1' : 'text-muted hover:text-fg-2'"
                  @click="setLocale('fr')"
                >
                  Français
                </button>
                <button
                  type="button"
                  class="rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-ring"
                  :class="localeValue === 'en' ? 'bg-surface-2 text-fg-1' : 'text-muted hover:text-fg-2'"
                  @click="setLocale('en')"
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- À propos -->
        <section class="rounded-[18px] border border-border bg-surface-elevated p-5">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2 text-fg-3">
              <Info class="h-4 w-4" />
            </span>
            <div>
              <h2 class="text-[14px] font-semibold text-fg-1">À propos</h2>
              <p class="text-[12px] text-muted-2">Pilote Project — lanceur Minecraft Java.</p>
            </div>
          </div>

          <div class="flex items-center justify-between border-b border-border py-2.5">
            <span class="text-[13px] text-fg-3">Version</span>
            <span class="font-mono text-[12.5px] text-muted">{{ appVersion ? `v${appVersion}` : '—' }}</span>
          </div>

          <div class="flex items-center justify-between border-b border-border py-2.5">
            <div>
              <p class="text-[13px] text-fg-3">Vérifier au démarrage</p>
              <p class="text-[11.5px] text-muted-2">Rechercher automatiquement les mises à jour.</p>
            </div>
            <Switch v-model="autoUpdate" />
          </div>

          <div class="flex items-center justify-between pt-3">
            <Button variant="link" size="sm" @click="openProjectSite">
              Site du projet
              <ExternalLink class="h-3.5 w-3.5" />
            </Button>
            <Button variant="secondary" size="sm" :disabled="checking" @click="checkUpdates">
              <Loader2 v-if="checking" class="h-3.5 w-3.5 animate-spin" />
              <RefreshCw v-else class="h-3.5 w-3.5" />
              Vérifier les mises à jour
            </Button>
          </div>
        </section>

        <motion.p
          class="flex items-center justify-center gap-1.5 pb-2 pt-1 text-center text-[11.5px] text-muted-3"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
        >
          <Check class="h-3.5 w-3.5 text-success" />
          Les modifications sont enregistrées automatiquement.
        </motion.p>
      </div>
    </ScrollArea>
  </div>
</template>
