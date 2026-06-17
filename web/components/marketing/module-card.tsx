'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { ModuleListing } from '@pilote/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, moduleIcon, PERMISSION_LABELS } from '@/lib/module-meta';
import { EASE_OUT } from './motion';

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function ModuleCard({ module }: { module: ModuleListing }): React.JSX.Element {
  const Icon = moduleIcon(module.icon);
  const [opening, setOpening] = useState(false);

  function handleInstall() {
    // Hand the module off to the launcher. The OS silently ignores this if the
    // launcher isn't installed, so we always surface a hint pointing to /download.
    if (typeof window !== 'undefined') {
      window.location.href = `pilote://module/install/${module.id}`;
    }
    setOpening(true);
    toast('Ouverture du launcher…', {
      description: 'Pas encore installé ? Télécharge-le, c’est rapide.',
      action: {
        label: 'Télécharger',
        onClick: () => {
          if (typeof window !== 'undefined') window.location.href = '/download';
        },
      },
    });
  }

  return (
    <motion.div
      variants={item}
      className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface p-6 transition-colors hover:border-border-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-border-2 bg-surface-2 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="secondary">{CATEGORY_LABELS[module.category]}</Badge>
      </div>

      <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-fg-1">{module.name}</h3>
      <p className="mt-1 text-[13px] font-medium text-accent">{module.tagline}</p>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{module.description}</p>

      {module.permissions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Accès demandés
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {module.permissions.map((perm) => (
              <span
                key={perm}
                className="rounded-[7px] border border-border-2 bg-surface-2 px-2 py-0.5 text-[11px] leading-none text-fg-3"
              >
                {PERMISSION_LABELS[perm]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 pt-1">
        <Button type="button" onClick={handleInstall} className="w-full gap-2">
          <Download className="h-4 w-4" />
          Installer
        </Button>

        <p
          className={cn(
            'flex items-center justify-center gap-1.5 text-[12px] text-muted-2 transition-opacity',
            opening ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          aria-hidden={!opening}
        >
          <Check className="h-3.5 w-3.5 text-success" />
          Ouverture du launcher…{' '}
          <Link href="/download" className="text-accent hover:underline">
            Pas encore installé ?
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
