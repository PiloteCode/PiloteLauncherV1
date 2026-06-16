<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ class?: string; disabled?: boolean }>();
const emit = defineEmits<{ select: [event: Event] }>();
</script>

<template>
  <DropdownMenuItem
    :disabled="disabled"
    :class="
      cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] text-fg-3 outline-none transition-colors data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg-1 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        $props.class,
      )
    "
    @select="emit('select', $event)"
  >
    <slot />
  </DropdownMenuItem>
</template>
