<script setup lang="ts">
import {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaCorner,
} from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ class?: string; viewportClass?: string }>();
</script>

<template>
  <ScrollAreaRoot :class="cn('relative overflow-hidden', $props.class)" type="hover">
    <ScrollAreaViewport :class="cn('h-full w-full rounded-[inherit]', viewportClass)">
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar
      orientation="vertical"
      class="flex w-2.5 touch-none select-none p-0.5 transition-colors duration-150"
    >
      <ScrollAreaThumb class="relative flex-1 rounded-full bg-[var(--scrollbar-thumb)] hover:bg-[var(--scrollbar-thumb-hover)]" />
    </ScrollAreaScrollbar>
    <ScrollAreaScrollbar
      orientation="horizontal"
      class="flex h-2.5 touch-none select-none flex-col p-0.5 transition-colors duration-150"
    >
      <ScrollAreaThumb class="relative flex-1 rounded-full bg-[var(--scrollbar-thumb)] hover:bg-[var(--scrollbar-thumb-hover)]" />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
