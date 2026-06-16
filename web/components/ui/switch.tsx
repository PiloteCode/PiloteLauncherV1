'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Switch — controlled or uncontrolled toggle. Radix-free; renders a button with
 * role="switch" and data-state so the Tailwind variants animate the thumb.
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
    const isControlled = checked !== undefined;
    const [internal, setInternal] = React.useState<boolean>(defaultChecked ?? false);
    const value = isControlled ? checked : internal;

    const toggle = (): void => {
      if (disabled) return;
      const next = !value;
      if (!isControlled) setInternal(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={value}
        data-state={value ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        onClick={toggle}
        className={cn(
          'peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          value ? 'bg-accent' : 'bg-surface-3',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block h-[16px] w-[16px] rounded-full bg-white shadow-lg ring-0 transition-transform',
            value ? 'translate-x-[16px]' : 'translate-x-0',
          )}
        />
      </button>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
