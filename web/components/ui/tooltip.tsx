'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tooltip — Radix-free, hover/focus driven. Keeps the shadcn composition API:
 *   <TooltipProvider><Tooltip><TooltipTrigger/><TooltipContent/></Tooltip></TooltipProvider>
 * Implemented with a positioned absolute bubble relative to the trigger wrapper.
 */

interface TooltipCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const Ctx = React.createContext<TooltipCtx | null>(null);

function useTooltip(): TooltipCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('Tooltip components must be used within <Tooltip>');
  return ctx;
}

function TooltipProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

function Tooltip({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </Ctx.Provider>
  );
}

interface TriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

const TooltipTrigger = React.forwardRef<HTMLSpanElement, TriggerProps>(
  ({ className, children, asChild: _asChild, ...props }, ref) => {
    const { setOpen } = useTooltip();
    return (
      <span
        ref={ref}
        className={cn('inline-flex', className)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        {...props}
      >
        {children}
      </span>
    );
  },
);
TooltipTrigger.displayName = 'TooltipTrigger';

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

const sidePos: Record<NonNullable<ContentProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const TooltipContent = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, side = 'top', children, ...props }, ref) => {
    const { open } = useTooltip();
    if (!open) return null;
    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          'absolute z-50 w-max max-w-xs rounded-md border border-border-2 bg-surface-2 px-2.5 py-1.5 text-[12px] text-fg shadow-dialog',
          'animate-in fade-in-0 zoom-in-95',
          sidePos[side],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
