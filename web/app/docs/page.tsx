'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import 'swagger-ui-react/swagger-ui.css';
import './swagger-theme.css';
import { Logo } from '@/components/marketing/logo';

// swagger-ui-react touches the DOM on mount; load it client-only.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center font-mono text-[12px] text-muted-3">
      Chargement de la documentation…
    </div>
  ),
});

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-[15px] font-semibold tracking-tight">Pilote Project</span>
            <span className="ml-1 rounded-md border border-border-2 px-2 py-0.5 font-mono text-[11px] text-muted-2">
              API
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold tracking-tight">L’API</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Ce que le launcher appelle pour lister les instances et télécharger les fichiers.
            Les routes sous <code className="font-mono text-[13px] text-fg-3">/admin</code> demandent
            d’être connecté.
          </p>
        </div>
        <div className="swagger-wrap rounded-card border border-border bg-surface p-1">
          <SwaggerUI url="/api/openapi" docExpansion="list" deepLinking />
        </div>
      </main>
    </div>
  );
}
