'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dialog — Radix-free modal with the shadcn composition API. Controlled or uncontrolled
 * via `open`/`onOpenChange`. Renders into a portal on <body>, traps Escape, locks scroll,
 * and animates with the DESIGN.md `dialog` keyframe (.animate-dialog in globals.css).
 */

interface DialogCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const Ctx = React.createContext<DialogCtx | null>(null);

function useDialog(): DialogCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('Dialog parts must be used within <Dialog>');
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps): React.JSX.Element {
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

  return <Ctx.Provider value={{ open: value, setOpen }}>{children}</Ctx.Provider>;
}

interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { setOpen } = useDialog();
    const handleClick = (e: React.MouseEvent): void => {
      onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      setOpen(true);
    };
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
      return React.cloneElement(child, {
        onClick: (e: React.MouseEvent) => {
          child.props.onClick?.(e);
          setOpen(true);
        },
      });
    }
    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    );
  },
);
DialogTrigger.displayName = 'DialogTrigger';

function DialogClose({
  asChild = false,
  children,
  onClick,
  ...props
}: TriggerProps): React.JSX.Element {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        setOpen(false);
      },
    });
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { open, setOpen } = useDialog();
    const mounted = useMounted();

    React.useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') setOpen(false);
      };
      document.addEventListener('keydown', onKey);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = prevOverflow;
      };
    }, [open, setOpen]);

    if (!mounted || !open) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-in fade-in-0"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative z-10 w-full max-w-lg rounded-[16px] border border-border-2 bg-surface p-6 shadow-dialog animate-dialog',
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-[7px] p-1 text-muted-2 opacity-80 transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>,
      document.body,
    );
  },
);
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left', className)}
      {...props}
    />
  );
}
DialogHeader.displayName = 'DialogHeader';

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-[16px] font-semibold leading-none tracking-tight text-fg-1', className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-[13.5px] text-muted', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
