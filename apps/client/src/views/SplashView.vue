<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { motion } from 'motion-v';
import { Download, AlertCircle, RefreshCw } from 'lucide-vue-next';
import Logo from '@/components/Logo.vue';
import { Progress, Button } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { useProfilesStore } from '@/stores/profiles';
import { useInstancesStore } from '@/stores/instances';
import { getBridge, hasBridge } from '@/lib/bridge';

/**
 * Real startup loader. First it enforces updates: a packaged build checks for a newer
 * version and, if one exists, downloads it (real progress) and installs it on restart —
 * there is no way to skip and keep using an old version. Only once we're on the latest
 * (or there's no update) does it load profiles + instances and route into the app.
 */
type Phase = 'checking' | 'updating' | 'installing' | 'init' | 'error';

const router = useRouter();
const settings = useSettingsStore();
const profiles = useProfilesStore();
const instances = useInstancesStore();

const phase = ref<Phase>('checking');
const progress = ref(0);
const updateVersion = ref('');
const errorMsg = ref('');

let unStatus: (() => void) | null = null;
let proceeded = false;

const statusLabel = computed(() => {
  switch (phase.value) {
    case 'checking':
      return 'Vérification des mises à jour…';
    case 'updating':
      return `Téléchargement de la mise à jour${updateVersion.value ? ` ${updateVersion.value}` : ''}`;
    case 'installing':
      return 'Installation — redémarrage…';
    case 'init':
      return progress.value < 60 ? 'Initialisation' : 'Chargement des instances';
    default:
      return 'Connexion impossible';
  }
});

/** Once we're confirmed on the latest version: load real data, then route. */
async function proceed(): Promise<void> {
  if (proceeded) return;
  proceeded = true;
  phase.value = 'init';
  progress.value = 20;
  await settings.load();
  await profiles.load();
  progress.value = 60;
  await instances.load();
  progress.value = 100;
  const destination = hasBridge() && !profiles.hasProfile ? '/onboarding' : '/home';
  void router.replace(destination);
}

function onStatus(e: { status: string; version?: string; percent?: number }): void {
  switch (e.status) {
    case 'checking':
      phase.value = 'checking';
      break;
    case 'available':
      phase.value = 'updating';
      updateVersion.value = e.version ? `v${e.version}` : '';
      progress.value = e.percent ?? 0;
      break;
    case 'downloading':
      phase.value = 'updating';
      progress.value = e.percent ?? 0;
      break;
    case 'ready':
      // Mandatory: install the new version and relaunch. No skip.
      phase.value = 'installing';
      progress.value = 100;
      void getBridge().updater.downloadAndInstall();
      break;
    case 'none':
      void proceed();
      break;
    case 'error':
      phase.value = 'error';
      errorMsg.value = 'Impossible de vérifier la mise à jour. Vérifie ta connexion et réessaie.';
      break;
  }
}

async function start(): Promise<void> {
  phase.value = 'checking';
  progress.value = 0;
  errorMsg.value = '';
  // No update mechanism outside the packaged shell — just load.
  if (!hasBridge()) {
    void proceed();
    return;
  }
  try {
    await getBridge().updater.check();
  } catch {
    phase.value = 'error';
    errorMsg.value = 'Impossible de vérifier la mise à jour. Vérifie ta connexion et réessaie.';
  }
}

onMounted(() => {
  if (hasBridge()) unStatus = getBridge().on.updaterStatus(onStatus);
  void start();
});

onBeforeUnmount(() => {
  unStatus?.();
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
    <div
      class="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
    />

    <motion.div
      class="relative flex flex-col items-center"
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, ease: 'easeOut' }"
    >
      <Logo :size="42" animated class="mb-7" />
      <h1 class="text-[22px] font-semibold tracking-tight text-fg-1">Pilote Project</h1>

      <!-- Update-check failure: blocking, retry only (no way to continue on an old version) -->
      <div v-if="phase === 'error'" class="mt-7 flex w-[320px] flex-col items-center gap-4 text-center">
        <div class="flex h-11 w-11 items-center justify-center rounded-full border border-border-2 bg-surface-2 text-destructive">
          <AlertCircle class="h-5 w-5" />
        </div>
        <p class="text-[12.5px] text-muted-2">{{ errorMsg }}</p>
        <Button variant="secondary" size="sm" class="gap-2" @click="start">
          <RefreshCw class="h-4 w-4" />
          Réessayer
        </Button>
      </div>

      <!-- Normal flow: checking / updating / installing / init -->
      <template v-else>
        <p class="mt-1.5 flex items-center gap-2 text-[13px] text-muted-2">
          <Download
            v-if="phase === 'updating' || phase === 'installing'"
            class="h-3.5 w-3.5 text-accent"
          />
          {{ statusLabel }}
        </p>

        <div class="mt-8 w-[320px]">
          <Progress :value="progress" shimmer />
          <p
            v-if="phase === 'updating'"
            class="mt-3 text-center font-mono text-[12px] text-muted-2"
          >
            {{ Math.round(progress) }}%
          </p>
        </div>
      </template>
    </motion.div>
  </div>
</template>
