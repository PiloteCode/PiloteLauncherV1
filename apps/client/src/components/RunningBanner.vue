<script setup lang="ts">
import { computed } from 'vue';
import { motion, AnimatePresence } from 'motion-v';
import { Square, Gamepad2 } from 'lucide-vue-next';
import type { InstanceView } from '@pilote/types';
import { Button } from '@/components/ui';

const props = defineProps<{ instances: InstanceView[] }>();
const emit = defineEmits<{ kill: [id: string]; open: [id: string] }>();

const visible = computed(() => props.instances.length > 0);
</script>

<template>
  <AnimatePresence>
    <motion.div
      v-if="visible"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :exit="{ opacity: 0, y: 12 }"
      :transition="{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }"
      class="flex flex-col gap-2 rounded-[14px] border border-success/25 bg-success/[0.07] p-3"
    >
      <div
        v-for="inst in instances"
        :key="inst.id"
        class="flex items-center gap-3"
      >
        <span class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-success/15 text-[var(--success-2)]">
          <Gamepad2 class="h-4 w-4" />
          <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-dot rounded-full border-2 border-bg bg-success" />
        </span>
        <button type="button" class="min-w-0 flex-1 text-left focus-ring" @click="emit('open', inst.id)">
          <p class="truncate text-[13px] font-semibold text-fg-1">{{ inst.name }}</p>
          <p class="text-[11.5px] text-[var(--success-2)]/80">Session en cours</p>
        </button>
        <Button variant="destructive" size="sm" @click="emit('kill', inst.id)">
          <Square class="h-3.5 w-3.5" :fill="'currentColor'" />
          Arrêter
        </Button>
      </div>
    </motion.div>
  </AnimatePresence>
</template>
