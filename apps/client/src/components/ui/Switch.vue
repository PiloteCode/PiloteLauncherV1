<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { cn } from '@/lib/utils';

defineProps<{ class?: string; disabled?: boolean }>();
const model = defineModel<boolean>({ default: false });
</script>

<template>
  <SwitchRoot
    v-model="model"
    :disabled="disabled"
    :class="
      cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-3',
        $props.class,
      )
    "
  >
    <SwitchThumb
      class="pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
    />
  </SwitchRoot>
</template>
