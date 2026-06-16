import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-[10px] border border-border-input bg-surface-input px-3 py-1 text-[13.5px] text-fg shadow-sm transition-colors',
        'placeholder:text-muted-2 file:border-0 file:bg-transparent file:text-[13.5px] file:font-medium file:text-fg',
        'focus-visible:outline-none focus-visible:border-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
