<script setup lang="ts">
import { TabsContent } from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ value: string; class?: string }>();
</script>

<template>
  <TabsContent :value="value" :class="cn('focus:outline-none', $props.class)">
    <slot />
  </TabsContent>
</template>
