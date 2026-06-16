<script setup lang="ts">
import { TabsRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ class?: string }>();
const model = defineModel<string>();
</script>

<template>
  <TabsRoot v-model="model" :class="cn($props.class)">
    <slot />
  </TabsRoot>
</template>
