import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[7px] border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-accent-fg',
        secondary: 'border-border-2 bg-surface-2 text-fg-3',
        outline: 'border-border-2 text-fg-3',
        success: 'border-transparent bg-success/15 text-success',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
