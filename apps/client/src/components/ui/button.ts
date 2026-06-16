import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button variants styled with the Pilote Project tokens.
 * `default` = accent CTA (used sparingly), `secondary` = surface-2 neutral.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 select-none focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[.985] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-fg shadow-[0_8px_22px_-12px_var(--accent)] hover:brightness-110',
        secondary:
          'bg-surface-2 text-fg-1 border border-border-2 hover:bg-surface-3 hover:border-border-hover',
        outline:
          'border border-border-input bg-transparent text-fg-2 hover:bg-surface-hover hover:text-fg-1 hover:border-border-hover',
        ghost: 'bg-transparent text-fg-3 hover:bg-surface-hover hover:text-fg-1',
        destructive:
          'bg-destructive/15 text-[var(--destructive-2)] border border-destructive/30 hover:bg-destructive/25',
        success:
          'bg-success/15 text-[var(--success-2)] border border-success/30 hover:bg-success/25',
        link: 'bg-transparent text-accent underline-offset-4 hover:underline px-0',
      },
      size: {
        default: 'h-9 px-4 text-[13px] rounded-[10px]',
        sm: 'h-8 px-3 text-[12.5px] rounded-[9px]',
        lg: 'h-11 px-6 text-[14px] rounded-[11px]',
        xl: 'h-12 px-7 text-[15px] rounded-[12px]',
        icon: 'h-9 w-9 rounded-[8px]',
        'icon-sm': 'h-7 w-7 rounded-[7px]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
