'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select — Radix-free dropdown select with the shadcn composition API:
 *   <Select value onValueChange><SelectTrigger><SelectValue/></SelectTrigger>
 *     <SelectContent><SelectItem value>…</SelectItem></SelectContent></Select>
 *
 * The selected item's label is captured by registering items in context so
 * <SelectValue/> can render it (matching Radix behaviour). Closes on outside-click
 * and Escape. Anchored absolutely under the trigger (single-screen admin/marketing use).
 */

interface SelectCtx {
  value: string | undefined;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  register: (value: string, label: React.ReactNode) => void;
  labels: Map<string, React.ReactNode>;
}
const Ctx = React.createContext<SelectCtx | null>(null);

function useSelect(): SelectCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('Select parts must be used within <Select>');
  return ctx;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps): React.JSX.Element {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue);
  const [open, setOpen] = React.useState(false);
  const current = isControlled ? value : internal;
  // Stable label registry across renders.
  const labelsRef = React.useRef<Map<string, React.ReactNode>>(new Map());
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  const register = React.useCallback((v: string, label: React.ReactNode) => {
    const prev = labelsRef.current.get(v);
    if (prev !== label) {
      labelsRef.current.set(v, label);
      force();
    }
  }, []);

  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternal(v);
      onValueChange?.(v);
      setOpen(false);
    },
    [isControlled, onValueChange],
  );

  return (
    <Ctx.Provider
      value={{ value: current, setValue, open, setOpen, register, labels: labelsRef.current }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </Ctx.Provider>
  );
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, disabled, ...props }, ref) => {
    const { open, setOpen } = useSelect();
    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-border-input bg-surface-input px-3 py-2 text-[13.5px] text-fg shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
          '[&>span]:line-clamp-1',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className={cn('size-4 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
    );
  },
);
SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

function SelectValue({ placeholder, className }: SelectValueProps): React.JSX.Element {
  const { value, labels } = useSelect();
  const label = value !== undefined ? labels.get(value) : undefined;
  const display = label ?? value;
  return (
    <span className={cn(display === undefined && 'text-muted-2', className)}>
      {display ?? placeholder ?? ''}
    </span>
  );
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'item-aligned' | 'popper';
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect();
    const localRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

    React.useEffect(() => {
      if (!open) return;
      const onClick = (e: MouseEvent): void => {
        if (localRef.current && !localRef.current.contains(e.target as Node)) {
          // Defer so the trigger's own click can toggle correctly.
          const trigger = (e.target as HTMLElement).closest('[role="combobox"]');
          if (!trigger) setOpen(false);
        }
      };
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') setOpen(false);
      };
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onClick);
        document.removeEventListener('keydown', onKey);
      };
    }, [open, setOpen]);

    // Items must always render (even when closed) so labels register for SelectValue.
    return (
      <>
        {/* Hidden registration pass keeps the label map populated. */}
        <div className="hidden" aria-hidden>
          {children}
        </div>
        {open && (
          <div
            ref={localRef}
            role="listbox"
            className={cn(
              'absolute left-0 top-[calc(100%+4px)] z-50 max-h-72 w-full min-w-[8rem] overflow-auto rounded-[10px] border border-border-2 bg-surface-hover p-1 text-fg shadow-[0_22px_50px_-18px_rgba(0,0,0,.8)]',
              'animate-in fade-in-0 zoom-in-95',
              className,
            )}
            {...props}
          >
            {children}
          </div>
        )}
      </>
    );
  },
);
SelectContent.displayName = 'SelectContent';

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const { value: selected, setValue, register } = useSelect();
    const isSelected = selected === value;

    React.useEffect(() => {
      register(value, children);
    }, [register, value, children]);

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        data-disabled={disabled ? '' : undefined}
        onClick={() => {
          if (!disabled) setValue(value);
        }}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-[7px] py-1.5 pl-8 pr-2 text-[13.5px] outline-none transition-colors',
          'hover:bg-surface-2 focus:bg-surface-2',
          isSelected && 'text-fg-1',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex size-4 items-center justify-center">
            <Check className="size-4 text-accent" />
          </span>
        )}
        {children}
      </div>
    );
  },
);
SelectItem.displayName = 'SelectItem';

function SelectGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div role="group" className={className} {...props} />;
}

function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-2', className)}
      {...props}
    />
  );
}

function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('-mx-1 my-1 h-px bg-border-2', className)} {...props} />;
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
};
