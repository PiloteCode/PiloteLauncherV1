'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Sonner toaster wired to the active theme, styled with the Pilote tokens.
 * Toasts appear bottom-right (DESIGN.md). Re-exports `toast` for callers.
 */
function Toaster({ ...props }: ToasterProps): React.JSX.Element {
  const { theme = 'dark' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface-2 group-[.toaster]:text-fg group-[.toaster]:border-border-2 group-[.toaster]:shadow-dialog group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted',
          actionButton:
            'group-[.toast]:bg-accent group-[.toast]:text-accent-fg group-[.toast]:rounded-md',
          cancelButton:
            'group-[.toast]:bg-surface-3 group-[.toast]:text-muted group-[.toast]:rounded-md',
          error: 'group-[.toaster]:border-destructive/40',
          success: 'group-[.toaster]:border-success/40',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--surface-2)',
          '--normal-text': 'var(--fg)',
          '--normal-border': 'var(--border-2)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
