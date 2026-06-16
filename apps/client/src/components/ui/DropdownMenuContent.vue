<script setup lang="ts">
import { DropdownMenuPortal, DropdownMenuContent } from 'reka-ui';
import { cn } from '@/lib/utils';

withDefaults(
  defineProps<{
    class?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
  }>(),
  { side: 'bottom', align: 'start', sideOffset: 8, alignOffset: 0 },
);
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :align-offset="alignOffset"
      :class="
        cn(
          'z-50 min-w-[220px] rounded-[14px] border border-border-2 bg-surface-hover p-1.5 shadow-dropdown focus:outline-none data-[state=open]:animate-dialog',
          $props.class,
        )
      "
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
