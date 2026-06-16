import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

// Geist + Geist Mono are variable fonts: the full 400–700 axis is available without
// declaring discrete weights (declaring `weight` on a variable font is rejected by next/font).
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Pilote Project',
    template: '%s — Pilote Project',
  },
  description:
    'Pilote Project — un launcher Minecraft Java moderne, sobre et premium. Synchronisation des instances, mods et mises à jour.',
  applicationName: 'Pilote Project',
  authors: [{ name: 'Pilote Project' }],
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
