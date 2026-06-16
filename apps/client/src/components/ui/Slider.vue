<script setup lang="ts">
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    min?: number;
    max?: number;
    step?: number;
    class?: string;
  }>(),
  { min: 0, max: 100, step: 1 },
);

const model = defineModel<number[]>({ default: () => [0] });
</script>

<template>
  <SliderRoot
    v-model="model"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :class="cn('relative flex w-full touch-none select-none items-center', $props.class)"
  >
    <SliderTrack class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3">
      <SliderRange class="absolute h-full rounded-full bg-accent" />
    </SliderTrack>
    <SliderThumb
      v-for="(_, i) in model"
      :key="i"
      class="block h-4 w-4 rounded-full border-2 border-accent bg-fg shadow-md transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 hover:scale-110"
    />
  </SliderRoot>
</template>
