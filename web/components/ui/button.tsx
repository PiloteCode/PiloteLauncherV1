'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button — new-york shadcn API, Radix-free. Supports `asChild` by cloning the single
 * child element and merging className (covers the common <Button asChild><Link/></Button>).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[13.5px] font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg hover:bg-accent/90 shadow-sm',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline:
          'border border-border-input bg-transparent text-fg hover:bg-surface-hover hover:border-border-hover',
        secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
        ghost: 'text-fg hover:bg-surface-hover',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-[9px] px-3 text-[12px]',
        lg: 'h-10 rounded-[11px] px-6',
        icon: 'h-9 w-9 rounded-[8px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
        ...props,
      });
    }

    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
