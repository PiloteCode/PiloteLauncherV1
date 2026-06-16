<script setup lang="ts">
import { computed } from 'vue';
import { motion } from 'motion-v';
import { Play, Download, RefreshCw, Lock, Loader2, Check, type LucideIcon } from 'lucide-vue-next';
import type { InstanceView, InstanceInstallState } from '@pilote/types';
import { LOADER_DOT_COLOR, LOADER_LABEL } from '@pilote/types';
import { coverGradient, initials } from '@/lib/cover';
import { Button } from '@/components/ui';

const props = defineProps<{
  instance: InstanceView;
  /** Effective state (running computed by the store). */
  state: InstanceInstallState;
  /** True while a download/launch for THIS instance is in flight. */
  busy?: boolean;
}>();

const emit = defineEmits<{
  play: [id: string];
  install: [id: string];
  update: [id: string];
  open: [id: string];
}>();

const gradient = computed(() => coverGradient(props.instance.name));
const mark = computed(() => initials(props.instance.name));
const isPrivate = computed(() => props.instance.visibility === 'private');
const loaderColor = computed(() => LOADER_DOT_COLOR[props.instance.loader]);
const loaderLabel = computed(() => LOADER_LABEL[props.instance.loader]);

const status = computed<{ label: string; tone: 'success' | 'warning' | 'muted' | 'running' }>(() => {
  switch (props.state) {
    case 'installed':
      return { label: 'Installée', tone: 'success' };
    case 'update-available':
      return { label: 'Mise à jour dispo', tone: 'warning' };
    case 'running':
      return { label: 'En cours', tone: 'running' };
    default:
      return { label: 'À télécharger', tone: 'muted' };
  }
});

const action = computed<{ label: string; variant: 'default' | 'secondary' | 'success'; icon: LucideIcon }>(() => {
  switch (props.state) {
    case 'installed':
      return { label: 'Jouer', variant: 'default', icon: Play };
    case 'running':
      return { label: 'En jeu', variant: 'success', icon: Check };
    case 'update-available':
      return { label: 'Mettre à jour', variant: 'secondary', icon: RefreshCw };
    default:
      return { label: 'Télécharger', variant: 'secondary', icon: Download };
  }
});

function primaryAction(): void {
  if (props.busy || props.state === 'running') return;
  if (props.state === 'installed') emit('play', props.instance.id);
  else if (props.state === 'update-available') emit('update', props.instance.id);
  else emit('install', props.instance.id);
}

function playFab(): void {
  if (props.busy || props.state === 'running') return;
  if (props.state === 'not-installed') emit('install', props.instance.id);
  else emit('play', props.instance.id);
}
</script>

<template>
  <motion.div
    class="group relative overflow-hidden rounded-card border border-border bg-surface"
    :whileHover="{ y: -4 }"
    :transition="{ type: 'spring', stiffness: 320, damping: 26 }"
    style="will-change: transform"
  >
    <!-- Cover -->
    <button
      type="button"
      class="relative block h-[118px] w-full overflow-hidden text-left focus-ring"
      :style="{ background: gradient }"
      @click="emit('open', instance.id)"
      :aria-label="`Ouvrir ${instance.name}`"
    >
      <!-- initials watermark -->
      <span
        class="pointer-events-none absolute -right-3 bottom-[-18px] select-none text-[88px] font-bold leading-none text-white/10"
      >
        {{ mark }}
      </span>
      <!-- subtle top shade for badge legibility -->
      <span class="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/30 to-transparent" />

      <!-- loader + MC badges (top-left) -->
      <div class="absolute left-2.5 top-2.5 flex items-center gap-1.5">
        <span class="inline-flex items-center gap-1.5 rounded-[6px] border border-white/10 bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <span class="h-2 w-2 rounded-full" :style="{ background: loaderColor }" />
          {{ loaderLabel }}
        </span>
        <span class="inline-flex items-center rounded-[6px] border border-white/10 bg-black/45 px-2 py-1 font-mono text-[10.5px] text-white backdrop-blur-sm">
          {{ instance.mcVersion }}
        </span>
      </div>

      <!-- lock badge (top-right) -->
      <span
        v-if="isPrivate"
        class="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-[7px] border border-white/10 bg-black/50 text-white backdrop-blur-sm"
        title="Instance privée"
      >
        <Lock class="h-3 w-3" />
      </span>

      <!-- play FAB (bottom-right, on hover) -->
      <span
        class="absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_-8px_var(--accent)] transition-transform duration-150 hover:scale-110"
        :class="busy || state === 'running' ? 'pointer-events-none' : ''"
        data-fab
        @click.stop="playFab"
      >
        <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
        <Play v-else class="h-4 w-4" :fill="state !== 'not-installed' ? 'currentColor' : 'none'" />
      </span>
    </button>

    <!-- Body -->
    <div class="flex flex-col gap-3 p-3.5">
      <div class="flex items-start justify-between gap-2">
        <button
          type="button"
          class="min-w-0 text-left focus-ring"
          @click="emit('open', instance.id)"
        >
          <h3 class="truncate text-[14px] font-semibold text-fg-1">{{ instance.name }}</h3>
          <div class="mt-1 flex items-center gap-1.5">
            <span
              class="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11px] font-medium"
              :class="{
                'bg-success/12 text-[var(--success-2)]': status.tone === 'success',
                'bg-[#e8a33d]/12 text-[#e8a33d]': status.tone === 'warning',
                'bg-success/12 text-[var(--success-2)] [&_span]:animate-pulse-dot': status.tone === 'running',
                'bg-surface-2 text-muted-2': status.tone === 'muted',
              }"
            >
              <span
                v-if="status.tone === 'success' || status.tone === 'running'"
                class="h-1.5 w-1.5 rounded-full bg-success"
              />
              {{ status.label }}
            </span>
          </div>
        </button>
      </div>

      <Button
        :variant="action.variant"
        size="sm"
        class="w-full"
        :disabled="busy || state === 'running'"
        @click="primaryAction"
      >
        <Loader2 v-if="busy" class="h-3.5 w-3.5 animate-spin" />
        <component v-else :is="action.icon" class="h-3.5 w-3.5" />
        {{ busy ? 'En cours…' : action.label }}
      </Button>
    </div>
  </motion.div>
</template>

<style scoped>
/* Play FAB hidden by default, revealed on card hover. */
[data-fab] {
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.group:hover [data-fab] {
  opacity: 1;
  transform: scale(1);
}
</style>
