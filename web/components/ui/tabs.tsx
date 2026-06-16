'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabs — Radix-free, shadcn composition API. Controlled (`value`) or uncontrolled
 * (`defaultValue`). TabsTrigger sets the active value; TabsContent renders when active.
 */

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}
const Ctx = React.createContext<TabsCtx | null>(null);

function useTabs(): TabsCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('Tabs parts must be used within <Tabs>');
  return ctx;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState<string>(defaultValue ?? '');
    const current = isControlled ? value : internal;

    const setValue = React.useCallback(
      (v: string) => {
        if (!isControlled) setInternal(v);
        onValueChange?.(v);
      },
      [isControlled, onValueChange],
    );

    return (
      <Ctx.Provider value={{ value: current, setValue }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </Ctx.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1 rounded-[10px] bg-surface-2 p-1 text-muted',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: active, setValue } = useTabs();
    const selected = active === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={selected}
        data-state={selected ? 'active' : 'inactive'}
        onClick={() => setValue(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-3 py-1 text-[13px] font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          selected ? 'bg-surface text-fg-1 shadow-sm' : 'text-muted hover:text-fg-3',
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: active } = useTabs();
    if (active !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        data-state="active"
        className={cn('mt-2 focus-visible:outline-none', className)}
        {...props}
      />
    );
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
