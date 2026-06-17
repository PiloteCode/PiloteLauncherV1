'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

const LINKS: { href: string; label: string }[] = [
  { href: '/#features', label: 'Fonctionnalités' },
  { href: '/#private', label: 'Instances privées' },
  { href: '/modules', label: 'Modules' },
  { href: '/download', label: 'Télécharger' },
  { href: '/docs', label: 'API' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled
          ? 'border-b border-border-subtle bg-bg/80 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[15px] font-semibold tracking-tight text-fg">Pilote Project</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 text-muted hover:text-fg sm:inline-flex"
          >
            <a
              href="https://github.com/PiloteCode/PiloteLauncherV1"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <Github className="h-[18px] w-[18px]" />
            </a>
          </Button>
          <Button asChild size="sm" className="h-9 gap-1.5">
            <Link href="/download">
              <Download className="h-4 w-4" />
              Télécharger
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
