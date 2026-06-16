<script setup lang="ts">
import { DialogPortal, DialogOverlay, DialogContent, DialogClose } from 'reka-ui';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

withDefaults(
  defineProps<{ class?: string; showClose?: boolean }>(),
  { showClose: true },
);
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade data-[state=closed]:opacity-0"
    />
    <DialogContent
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-border-2 bg-surface p-6 shadow-dialog focus:outline-none data-[state=open]:animate-dialog',
          $props.class,
        )
      "
    >
      <slot />
      <DialogClose
        v-if="showClose"
        class="no-drag absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-2 transition-colors hover:bg-surface-hover hover:text-fg-1 focus-ring"
        aria-label="Fermer"
      >
        <X class="h-4 w-4" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
