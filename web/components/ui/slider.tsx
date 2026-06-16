'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
}

/**
 * Single-thumb Slider with the shadcn API (array value). Radix-free: a native range
 * input drives the value; a styled track + filled range + thumb sit on top (accent).
 */
const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      disabled,
      onValueChange,
      onValueCommit,
      ...props
    },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState<number>(
      value?.[0] ?? defaultValue?.[0] ?? min,
    );
    const current = isControlled ? (value?.[0] ?? min) : internal;
    const pct = max > min ? ((current - min) / (max - min)) * 100 : 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const next = Number(e.target.value);
      if (!isControlled) setInternal(next);
      onValueChange?.([next]);
    };

    const commit = (): void => {
      onValueCommit?.([current]);
    };

    return (
      <div
        ref={ref}
        className={cn('relative flex h-5 w-full touch-none select-none items-center', className)}
        {...props}
      >
        <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3">
          <div className="absolute h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <span
          className="pointer-events-none absolute block h-4 w-4 -translate-x-1/2 rounded-full border border-accent bg-bg shadow"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          onChange={handleChange}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          aria-label="slider"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
