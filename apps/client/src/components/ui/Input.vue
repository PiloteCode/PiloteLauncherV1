<script setup lang="ts">
import { cn } from '@/lib/utils';

defineProps<{ class?: string; mono?: boolean }>();
const model = defineModel<string | number>();
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'flex h-10 w-full rounded-[10px] border border-border-input bg-surface-input px-3.5 text-[13.5px] text-fg-1 placeholder:text-muted-2 transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        mono && 'font-mono tracking-wide',
        $props.class,
      )
    "
  />
</template>
