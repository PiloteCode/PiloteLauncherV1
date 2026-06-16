'use client';

import * as React from 'react';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DropdownMenu — Radix-free, shadcn composition API. Anchored absolutely under the
 * trigger, closes on outside-click / Escape / item selection. Supports the common
 * exports the pages use: Trigger, Content, Item, CheckboxItem, RadioItem/RadioGroup,
 * Label, Separator, Group, Sub*, Shortcut.
 */

interface MenuCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  align: 'start' | 'center' | 'end';
}
const Ctx = React.createContext<MenuCtx | null>(null);

function useMenu(): MenuCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('DropdownMenu parts must be used within <DropdownMenu>');
  return ctx;
}

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function DropdownMenu({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: DropdownMenuProps): React.JSX.Element {
  const isControlled = open !== undefined;
  const [internal, setInternal] = React.useState<boolean>(defaultOpen ?? false);
  const value = isControlled ? open : internal;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setInternal(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange],
  );
  return (
    <Ctx.Provider value={{ open: value, setOpen, align: 'start' }}>
      <div className="relative inline-block text-left">{children}</div>
    </Ctx.Provider>
  );
}

interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { open, setOpen } = useMenu();
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
      return React.cloneElement(child, {
        onClick: (e: React.MouseEvent) => {
          child.props.onClick?.(e);
          setOpen(!open);
        },
      });
    }
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          onClick?.(e);
          setOpen(!open);
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

const alignClass: Record<NonNullable<DropdownMenuContentProps['align']>, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, align = 'end', ...props }, ref) => {
    const { open, setOpen } = useMenu();
    const localRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

    React.useEffect(() => {
      if (!open) return;
      const onClick = (e: MouseEvent): void => {
        const target = e.target as HTMLElement;
        if (localRef.current && !localRef.current.contains(target)) {
          if (!target.closest('[aria-haspopup="menu"]')) setOpen(false);
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

    if (!open) return null;

    return (
      <div
        ref={localRef}
        role="menu"
        className={cn(
          'absolute top-[calc(100%+6px)] z-50 min-w-[10rem] overflow-hidden rounded-[10px] border border-border-2 bg-surface-hover p-1 text-fg shadow-[0_22px_50px_-18px_rgba(0,0,0,.8)]',
          'animate-in fade-in-0 zoom-in-95',
          alignClass[align],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
  /** When false, the menu stays open after click (default: close). */
  closeOnSelect?: boolean;
  variant?: 'default' | 'destructive';
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, disabled, closeOnSelect = true, variant = 'default', onClick, ...props }, ref) => {
    const { setOpen } = useMenu();
    return (
      <div
        ref={ref}
        role="menuitem"
        data-disabled={disabled ? '' : undefined}
        onClick={(e) => {
          if (disabled) return;
          onClick?.(e);
          if (closeOnSelect) setOpen(false);
        }}
        className={cn(
          'relative flex cursor-pointer select-none items-center gap-2 rounded-[7px] px-2 py-1.5 text-[13.5px] outline-none transition-colors',
          'hover:bg-surface-2 focus:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0',
          variant === 'destructive' && 'text-destructive hover:bg-destructive/10',
          inset && 'pl-8',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export interface DropdownMenuCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked = false, onCheckedChange, disabled, ...props }, ref) => (
    <div
      ref={ref}
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => {
        if (!disabled) onCheckedChange?.(!checked);
      }}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-[7px] py-1.5 pl-8 pr-2 text-[13.5px] outline-none transition-colors hover:bg-surface-2',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        {checked && <Check className="size-4 text-accent" />}
      </span>
      {children}
    </div>
  ),
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// Radio group context.
interface RadioCtx {
  value: string | undefined;
  onValueChange?: (v: string) => void;
}
const RadioContext = React.createContext<RadioCtx>({ value: undefined });

export interface DropdownMenuRadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: DropdownMenuRadioGroupProps): React.JSX.Element {
  return (
    <RadioContext.Provider value={{ value, onValueChange }}>
      <div role="group" {...props}>
        {children}
      </div>
    </RadioContext.Provider>
  );
}

export interface DropdownMenuRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const ctx = React.useContext(RadioContext);
    const { setOpen } = useMenu();
    const selected = ctx.value === value;
    return (
      <div
        ref={ref}
        role="menuitemradio"
        aria-checked={selected}
        onClick={() => {
          if (disabled) return;
          ctx.onValueChange?.(value);
          setOpen(false);
        }}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-[7px] py-1.5 pl-8 pr-2 text-[13.5px] outline-none transition-colors hover:bg-surface-2',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...props}
      >
        <span className="absolute left-2 flex size-4 items-center justify-center">
          {selected && <Circle className="size-2 fill-accent text-accent" />}
        </span>
        {children}
      </div>
    );
  },
);
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-2 py-1.5 text-[12px] font-semibold text-fg-2', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('-mx-1 my-1 h-px bg-border-2', className)} {...props} />
  ),
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span className={cn('ml-auto text-[11px] tracking-widest text-muted-2', className)} {...props} />
  );
}

function DropdownMenuGroup({ children, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div role="group" {...props}>
      {children}
    </div>
  );
}

// Sub-menu: rendered inline (expand on hover) to avoid a second portal layer.
function DropdownMenuSub({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="relative">{children}</div>;
}

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-[7px] px-2 py-1.5 text-[13.5px] outline-none hover:bg-surface-2',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" />
  </div>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mt-1 min-w-[8rem] rounded-[10px] border border-border-2 bg-surface-hover p-1 shadow-[0_22px_50px_-18px_rgba(0,0,0,.8)]',
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

function DropdownMenuPortal({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
};
