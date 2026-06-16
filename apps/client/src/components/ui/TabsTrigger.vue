<script setup lang="ts">
import { TabsTrigger } from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ value: string; class?: string }>();
</script>

<template>
  <TabsTrigger
    :value="value"
    :class="
      cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors focus-ring data-[state=active]:bg-surface-2 data-[state=active]:text-fg-1 hover:text-fg-2',
        $props.class,
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
