<script setup lang="ts">
import { TabsList } from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ class?: string }>();
</script>

<template>
  <TabsList
    :class="cn('inline-flex items-center gap-1 rounded-[10px] border border-border-2 bg-surface-input p-1', $props.class)"
  >
    <slot />
  </TabsList>
</template>
