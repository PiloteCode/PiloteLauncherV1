<script setup lang="ts">
import { computed } from 'vue';
import { cn, clamp } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    value?: number;
    class?: string;
    /** Add the shimmer sheen sweep over the fill. */
    shimmer?: boolean;
    /** Use success-green for the fill instead of accent. */
    success?: boolean;
    /** Indeterminate when total is unknown. */
    indeterminate?: boolean;
  }>(),
  { value: 0, shimmer: false, success: false, indeterminate: false },
);

const pct = computed(() => clamp(props.value, 0, 100));
</script>

<template>
  <div
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-surface-3', $props.class)"
    role="progressbar"
    :aria-valuenow="indeterminate ? undefined : pct"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="relative h-full rounded-full transition-[width] duration-300 ease-out"
      :class="success ? 'bg-success' : 'bg-accent'"
      :style="{ width: indeterminate ? '40%' : `${pct}%` }"
    >
      <div
        v-if="shimmer"
        class="absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />
    </div>
  </div>
</template>
