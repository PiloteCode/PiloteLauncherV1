<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { motion } from 'motion-v';
import {
  ArrowLeft,
  Play,
  Download,
  RefreshCw,
  Square,
  Lock,
  Loader2,
  MemoryStick,
  Trash2,
  RotateCcw,
  FileBox,
} from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import type { Instance, InstanceOverride } from '@pilote/types';
import { LOADER_DOT_COLOR, LOADER_LABEL } from '@pilote/types';
import { Button, ScrollArea, Slider, Badge, Skeleton, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { useInstancesStore } from '@/stores/instances';
import { useSettingsStore } from '@/stores/settings';
import { useDownloadsStore } from '@/stores/downloads';
import { useProfilesStore } from '@/stores/profiles';
import { getBridge, hasBridge } from '@/lib/bridge';
import { coverGradient, initials } from '@/lib/cover';
import { formatBytes, formatRam } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';

const props = defineProps<{ id: string }>();
const router = useRouter();
const instancesStore = useInstancesStore();
const settingsStore = useSettingsStore();
const downloads = useDownloadsStore();
const profiles = useProfilesStore();

const { active: activeDownload } = storeToRefs(downloads);
const { settings } = storeToRefs(settingsStore);

const instance = ref<Instance | null>(null);
const override = ref<InstanceOverride | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const ramOverride = ref<number[]>([4096]);
const useOverride = ref(false);
const tab = ref('description');
const totalRamGb = 32;

const view = computed(() => instancesStore.byId(props.id));
const state = computed(() => (view.value ? instancesStore.stateOf(view.value) : 'not-installed'));
const isRunning = computed(() => instancesStore.isRunning(props.id));
const busy = computed(() => activeDownload.value?.instanceId === props.id);

const gradient = computed(() => coverGradient(instance.value?.name ?? props.id));
const mark = computed(() => initials(instance.value?.name ?? ''));
const loaderColor = computed(() => (instance.value ? LOADER_DOT_COLOR[instance.value.loader] : '#fff'));
const loaderLabel = computed(() => (instance.value ? LOADER_LABEL[instance.value.loader] : ''));

const totalSize = computed(() =>
  (instance.value?.files ?? []).reduce((sum, f) => sum + (f.enabled ? f.sizeBytes : 0), 0),
);
const fileCount = computed(() => (instance.value?.files ?? []).filter((f) => f.enabled).length);

const descriptionHtml = computed(() => renderMarkdown(instance.value?.description ?? ''));
const changelogHtml = computed(() => renderMarkdown(instance.value?.changelog ?? ''));

const primaryLabel = computed(() => {
  switch (state.value) {
    case 'running':
      return 'En jeu';
    case 'installed':
      return 'Jouer';
    case 'update-available':
      return 'Mettre à jour';
    default:
      return 'Télécharger & jouer';
  }
});

/** True while we programmatically hydrate values — suppresses the save watcher. */
const hydrating = ref(true);

async function loadAll(): Promise<void> {
  loading.value = true;
  error.value = null;
  hydrating.value = true;
  try {
    if (!instancesStore.loaded) await instancesStore.load();
    if (!settingsStore.loaded) await settingsStore.load();
    instance.value = await instancesStore.get(props.id);
    useOverride.value = false;
    ramOverride.value = [instance.value.recommendedRamMb];

    if (hasBridge()) {
      const ov = await getBridge().settings.getOverride(props.id);
      override.value = ov;
      if (ov?.ramMb) {
        useOverride.value = true;
        ramOverride.value = [ov.ramMb];
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
    // Allow the watcher to react to user changes after hydration settles.
    void nextTick(() => {
      hydrating.value = false;
    });
  }
}

onMounted(loadAll);
watch(() => props.id, loadAll);

let saveTimer: number | undefined;
watch([ramOverride, useOverride], () => {
  if (!hasBridge() || hydrating.value) return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void persistOverride();
  }, 400);
});

async function persistOverride(): Promise<void> {
  if (!hasBridge()) return;
  const payload: InstanceOverride = {
    instanceId: props.id,
    ...(useOverride.value && ramOverride.value[0] !== undefined ? { ramMb: ramOverride.value[0] } : {}),
    ...(override.value?.javaPath ? { javaPath: override.value.javaPath } : {}),
    ...(override.value?.extraJvmArgs ? { extraJvmArgs: override.value.extraJvmArgs } : {}),
  };
  try {
    await getBridge().settings.setOverride(payload);
    override.value = payload;
  } catch (e) {
    toast.error('Sauvegarde impossible', { description: e instanceof Error ? e.message : undefined });
  }
}

const effectiveRam = computed(() =>
  useOverride.value && ramOverride.value[0] !== undefined
    ? ramOverride.value[0]
    : settings.value?.globalRamMb ?? instance.value?.recommendedRamMb ?? 4096,
);

async function primary(): Promise<void> {
  if (isRunning.value || busy.value) return;
  if (!profiles.hasProfile) {
    toast.error('Aucun profil', { description: "Créez d'abord un profil de jeu." });
    void router.push('/onboarding');
    return;
  }
  try {
    if (state.value === 'update-available') {
      await instancesStore.install(props.id);
    }
    const ramMb = useOverride.value ? ramOverride.value[0] : undefined;
    await instancesStore.launch(props.id, ramMb ? { maxRamMb: ramMb } : undefined);
  } catch (e) {
    toast.error('Lancement impossible', { description: e instanceof Error ? e.message : undefined });
  }
}

async function stop(): Promise<void> {
  try {
    await instancesStore.kill(props.id);
  } catch (e) {
    toast.error("Impossible d'arrêter", { description: e instanceof Error ? e.message : undefined });
  }
}

function resetRam(): void {
  useOverride.value = false;
  ramOverride.value = [instance.value?.recommendedRamMb ?? 4096];
}

async function reinstall(): Promise<void> {
  try {
    await instancesStore.install(props.id);
    toast.success('Réinstallation terminée');
  } catch (e) {
    toast.error('Réinstallation impossible', { description: e instanceof Error ? e.message : undefined });
  }
}
</script>

<template>
  <ScrollArea class="h-full w-full">
    <div class="animate-fade pb-10">
      <!-- Cover header -->
      <div class="relative h-[220px] w-full overflow-hidden" :style="{ background: gradient }">
        <span class="pointer-events-none absolute -right-6 bottom-[-40px] select-none text-[200px] font-bold leading-none text-white/10">
          {{ mark }}
        </span>
        <div class="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />

        <div class="absolute left-5 top-5">
          <button
            type="button"
            class="no-drag inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-white/10 bg-black/40 px-3 text-[12.5px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-ring"
            @click="router.back()"
          >
            <ArrowLeft class="h-4 w-4" /> Retour
          </button>
        </div>
      </div>

      <div class="mx-auto -mt-12 max-w-[860px] px-7">
        <!-- Loading -->
        <template v-if="loading">
          <Skeleton class="h-8 w-1/2" />
          <Skeleton class="mt-3 h-4 w-1/3" />
          <Skeleton class="mt-6 h-40 w-full" />
        </template>

        <template v-else-if="error">
          <div class="rounded-card border border-destructive/25 bg-destructive/[0.07] p-6 text-center">
            <p class="text-[14px] font-semibold text-fg-1">Impossible de charger l'instance</p>
            <p class="mt-1 text-[12.5px] text-muted">{{ error }}</p>
            <Button variant="secondary" size="sm" class="mt-4" @click="loadAll">Réessayer</Button>
          </div>
        </template>

        <template v-else-if="instance">
          <!-- Title row -->
          <div class="flex items-end justify-between gap-4">
            <div class="min-w-0">
              <div class="mb-2 flex items-center gap-2">
                <Badge variant="default" class="gap-1.5">
                  <span class="h-2 w-2 rounded-full" :style="{ background: loaderColor }" />
                  {{ loaderLabel }}
                  <span v-if="instance.loaderVersion" class="font-mono text-muted-3">{{ instance.loaderVersion }}</span>
                </Badge>
                <Badge variant="default" class="font-mono">{{ instance.mcVersion }}</Badge>
                <Badge v-if="instance.visibility === 'private'" variant="accent" class="gap-1">
                  <Lock class="h-3 w-3" /> Privée
                </Badge>
              </div>
              <h1 class="truncate text-[26px] font-semibold leading-tight tracking-tight text-fg-1">{{ instance.name }}</h1>
              <div class="mt-2 flex items-center gap-3 text-[12px] text-muted-2">
                <span class="inline-flex items-center gap-1.5"><FileBox class="h-3.5 w-3.5" /> {{ fileCount }} fichiers</span>
                <span class="font-mono">{{ formatBytes(totalSize) }}</span>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <Button v-if="isRunning" variant="destructive" size="lg" @click="stop">
                <Square class="h-4 w-4" :fill="'currentColor'" /> Arrêter
              </Button>
              <Button v-else variant="default" size="lg" :disabled="busy" @click="primary">
                <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
                <Play v-else-if="state === 'installed'" class="h-4 w-4" :fill="'currentColor'" />
                <RefreshCw v-else-if="state === 'update-available'" class="h-4 w-4" />
                <Download v-else class="h-4 w-4" />
                {{ busy ? 'En cours…' : primaryLabel }}
              </Button>
            </div>
          </div>

          <!-- Tabs: description / changelog -->
          <motion.div
            class="mt-7"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.28 }"
          >
            <Tabs v-model="tab">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="changelog">Changelog</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
              </TabsList>

              <TabsContent value="description" class="mt-5">
                <div
                  v-if="instance.description"
                  class="prose-pilote selectable text-[13.5px] leading-relaxed text-fg-3"
                  v-html="descriptionHtml"
                />
                <p v-else class="text-[13px] text-muted-2">Aucune description fournie.</p>
              </TabsContent>

              <TabsContent value="changelog" class="mt-5">
                <div
                  v-if="instance.changelog"
                  class="prose-pilote selectable text-[13.5px] leading-relaxed text-fg-3"
                  v-html="changelogHtml"
                />
                <p v-else class="text-[13px] text-muted-2">Aucun changelog disponible.</p>
              </TabsContent>

              <TabsContent value="settings" class="mt-5 space-y-5">
                <!-- RAM override -->
                <div class="rounded-[16px] border border-border bg-surface-elevated p-5">
                  <div class="mb-4 flex items-center gap-2.5">
                    <span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2 text-accent">
                      <MemoryStick class="h-4 w-4" />
                    </span>
                    <div class="flex-1">
                      <h3 class="text-[14px] font-semibold text-fg-1">Mémoire (override)</h3>
                      <p class="text-[12px] text-muted-2">
                        {{ useOverride ? 'Spécifique à cette instance.' : `Valeur globale : ${formatRam(settings?.globalRamMb ?? 4096)}` }}
                      </p>
                    </div>
                    <label class="flex cursor-pointer items-center gap-2 text-[12px] text-fg-3">
                      <input type="checkbox" v-model="useOverride" class="h-4 w-4 accent-[var(--accent)]" />
                      Personnaliser
                    </label>
                  </div>

                  <div :class="!useOverride && 'pointer-events-none opacity-50'">
                    <div class="mb-2 flex items-center justify-between">
                      <span class="text-[12.5px] text-muted">Allocation</span>
                      <span class="font-mono text-[14px] font-medium text-fg-1">{{ formatRam(effectiveRam) }}</span>
                    </div>
                    <Slider v-model="ramOverride" :min="1024" :max="totalRamGb * 1024" :step="512" />
                    <div class="mt-2 flex items-center justify-between">
                      <span class="font-mono text-[11px] text-muted-3">recommandé : {{ formatRam(instance.recommendedRamMb) }}</span>
                      <Button variant="ghost" size="sm" :disabled="!useOverride" @click="resetRam">
                        <RotateCcw class="h-3.5 w-3.5" /> Réinitialiser
                      </Button>
                    </div>
                  </div>
                </div>

                <!-- Maintenance -->
                <div class="flex items-center justify-between rounded-[16px] border border-border bg-surface-elevated p-5">
                  <div>
                    <h3 class="text-[14px] font-semibold text-fg-1">Réinstaller</h3>
                    <p class="text-[12px] text-muted-2">Re-vérifie et re-télécharge tous les fichiers.</p>
                  </div>
                  <Button variant="secondary" size="sm" :disabled="busy || isRunning" @click="reinstall">
                    <Trash2 class="h-3.5 w-3.5" /> Réinstaller
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </template>
      </div>
    </div>
  </ScrollArea>
</template>

<style scoped>
.prose-pilote :deep(h1),
.prose-pilote :deep(h2),
.prose-pilote :deep(h3) {
  color: var(--fg-1);
  font-weight: 600;
  margin: 1.1em 0 0.5em;
}
.prose-pilote :deep(h1) { font-size: 18px; }
.prose-pilote :deep(h2) { font-size: 16px; }
.prose-pilote :deep(h3) { font-size: 14px; }
.prose-pilote :deep(p) { margin: 0.6em 0; }
.prose-pilote :deep(a) { color: var(--accent); }
.prose-pilote :deep(code) {
  font-family: 'Geist Mono', ui-monospace, monospace;
  background: var(--surface-2);
  border: 1px solid var(--border-2);
  border-radius: 5px;
  padding: 1px 5px;
  font-size: 0.88em;
}
.prose-pilote :deep(pre) {
  background: var(--surface-input);
  border: 1px solid var(--border-2);
  border-radius: 10px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 0.8em 0;
}
.prose-pilote :deep(pre code) { background: transparent; border: 0; padding: 0; }
.prose-pilote :deep(ul),
.prose-pilote :deep(ol) { margin: 0.6em 0; padding-left: 1.4em; }
.prose-pilote :deep(li) { margin: 0.25em 0; }
.prose-pilote :deep(ul) { list-style: disc; }
.prose-pilote :deep(ol) { list-style: decimal; }
.prose-pilote :deep(strong) { color: var(--fg-2); font-weight: 600; }
.prose-pilote :deep(hr) { border: 0; border-top: 1px solid var(--border-2); margin: 1.2em 0; }
.prose-pilote :deep(blockquote) {
  border-left: 3px solid var(--border-input);
  padding-left: 12px;
  color: var(--muted);
  margin: 0.8em 0;
}
</style>
