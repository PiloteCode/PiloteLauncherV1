'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Client wrapper around next-themes. Used by the root layout to toggle the
 * `dark`/`light` class on <html>. Dark is the default.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps): React.JSX.Element {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
