<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    /** Edge size of the rotated square, in px. */
    size?: number;
    /** Show the soft accent glow behind the mark. */
    glow?: boolean;
    /** Animate the glow (splash) — pulse + float. */
    animated?: boolean;
    class?: string;
  }>(),
  { size: 13, glow: true, animated: false },
);

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${Math.max(2, Math.round(props.size * 0.28))}px`,
}));

const glowStyle = computed(() => ({
  width: `${props.size * 2.4}px`,
  height: `${props.size * 2.4}px`,
}));
</script>

<template>
  <div
    :class="cn('relative inline-flex items-center justify-center', $props.class)"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <div
      v-if="glow"
      class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/60 blur-xl"
      :class="animated && 'animate-glow'"
      :style="glowStyle"
    />
    <div
      class="relative bg-gradient-to-br from-accent to-[#1e40af] shadow-[0_2px_8px_-2px_var(--accent)]"
      :class="animated ? 'animate-float' : 'rotate-45'"
      :style="boxStyle"
    />
  </div>
</template>
