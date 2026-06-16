<script setup lang="ts">
import { computed } from 'vue';
import { motion, AnimatePresence } from 'motion-v';
import { Loader2, Check, X, Package } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useDownloadsStore, STAGE_STEPS } from '@/stores/downloads';
import { Button, Progress } from '@/components/ui';
import { formatSpeed } from '@/lib/utils';

const downloads = useDownloadsStore();
const { active, stepStatus, cancelling } = storeToRefs(downloads);

const visible = computed(() => active.value !== null);
const percent = computed(() => active.value?.percent ?? 0);
const speed = computed(() => formatSpeed(active.value?.speedBps));
const currentFile = computed(() => active.value?.file ?? active.value?.label ?? '');
const title = computed(() => active.value?.instanceName || 'Installation');

async function cancel(): Promise<void> {
  await downloads.cancel();
}
</script>

<template>
  <AnimatePresence>
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-8"
    >
      <motion.div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
      />
      <motion.div
        class="relative w-full max-w-[440px] rounded-[18px] border border-border-2 bg-surface p-7 shadow-dialog"
        :initial="{ opacity: 0, y: 14, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 10, scale: 0.98 }"
        :transition="{ duration: 0.22, ease: 'easeOut' }"
      >
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent/12 text-accent">
            <Package class="h-4 w-4" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-[14px] font-semibold text-fg-1">{{ title }}</p>
            <p class="text-[11.5px] text-muted-2">Préparation de l'instance</p>
          </div>
        </div>

        <!-- big percent + speed -->
        <div class="mt-6 flex items-end justify-between">
          <span class="font-mono text-[44px] font-medium leading-none tracking-tight text-fg-1">{{ percent }}%</span>
          <span class="font-mono text-[13px] font-medium text-success">{{ speed }}</span>
        </div>

        <Progress :value="percent" shimmer class="mt-4 h-2.5" />

        <!-- current file -->
        <p class="mt-3 truncate font-mono text-[11.5px] text-muted-2" :title="currentFile">
          {{ currentFile }}
        </p>

        <!-- step list -->
        <ul class="mt-5 space-y-2.5">
          <li
            v-for="step in STAGE_STEPS"
            :key="step.stage"
            class="flex items-center gap-2.5 text-[12.5px]"
            :class="{
              'text-fg-1': stepStatus[step.stage] === 'active',
              'text-muted': stepStatus[step.stage] === 'done',
              'text-muted-3': stepStatus[step.stage] === 'pending',
            }"
          >
            <span class="flex h-5 w-5 items-center justify-center">
              <Loader2 v-if="stepStatus[step.stage] === 'active'" class="h-4 w-4 animate-spin text-accent" />
              <Check v-else-if="stepStatus[step.stage] === 'done'" class="h-4 w-4 text-success" />
              <span v-else class="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            </span>
            {{ step.label }}
          </li>
        </ul>

        <div class="mt-6 flex justify-end">
          <Button variant="ghost" size="sm" :disabled="cancelling" @click="cancel">
            <X class="h-3.5 w-3.5" />
            {{ cancelling ? 'Annulation…' : 'Annuler' }}
          </Button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
</template>
