'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { Logo } from './logo';

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/#features' },
      { label: 'Instances privées', href: '/#private' },
      { label: 'Télécharger', href: '/download' },
    ],
  },
  {
    title: 'Développeurs',
    links: [
      { label: 'Documentation API', href: '/docs' },
      { label: 'Panneau admin', href: '/admin' },
      {
        label: 'GitHub',
        href: 'https://github.com/PiloteCode/PiloteLauncherV1',
        external: true,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-titlebar/50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-[15px] font-semibold tracking-tight text-fg">
                Pilote Project
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
              Launcher Minecraft Java custom pour distribuer et synchroniser vos instances,
              publiques comme privées.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-fg-3">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-muted transition-colors hover:text-fg"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[13px] text-muted transition-colors hover:text-fg"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-start gap-2.5 rounded-card border border-border-2 bg-surface/60 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-2" />
          <p className="text-[12px] leading-relaxed text-muted-2">
            <span className="font-medium text-muted">Avertissement.</span> Pilote Project
            utilise des profils hors-ligne (offline mode). L’authentification hors-ligne ne
            fonctionne que sur les serveurs configurés en{' '}
            <code className="font-mono text-muted">online-mode=false</code>. Ce projet n’est
            pas affilié à Mojang ou Microsoft.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border-subtle pt-6 sm:flex-row">
          <p className="font-mono text-[11px] text-muted-3">
            © {new Date().getFullYear()} Pilote Project · MIT
          </p>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-[12px] text-muted-2 hover:text-fg">
              API
            </Link>
            <Link href="/admin" className="text-[12px] text-muted-2 hover:text-fg">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
