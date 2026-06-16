<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from 'reka-ui';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonVariants } from './button';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    as?: string;
    asChild?: boolean;
    class?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>(),
  {
    variant: 'secondary',
    size: 'default',
    as: 'button',
    asChild: false,
    type: 'button',
    disabled: false,
  },
);

const classes = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), props.class));
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="classes"
    :type="as === 'button' ? type : undefined"
    :disabled="disabled || undefined"
  >
    <slot />
  </Primitive>
</template>
