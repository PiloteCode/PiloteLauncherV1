<script setup lang="ts">
import { computed } from 'vue';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-[11px] font-medium leading-none',
  {
    variants: {
      variant: {
        default: 'border-border-2 bg-surface-2 text-fg-3',
        outline: 'border-border-2 bg-transparent text-muted',
        accent: 'border-accent/30 bg-accent/12 text-accent',
        success: 'border-success/30 bg-success/12 text-[var(--success-2)]',
        warning: 'border-[#e8a33d]/30 bg-[#e8a33d]/12 text-[#e8a33d]',
        destructive: 'border-destructive/30 bg-destructive/12 text-[var(--destructive-2)]',
        glass: 'border-white/10 bg-black/40 text-fg-1 backdrop-blur-sm',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

const props = defineProps<{ variant?: BadgeVariants['variant']; class?: string }>();
const classes = computed(() => cn(badgeVariants({ variant: props.variant }), props.class));
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
