'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { BUILTIN_MODULES } from '@pilote/types';
import { Button } from '@/components/ui/button';
import { moduleIcon } from '@/lib/module-meta';
import { EASE_OUT } from './motion';

export function ModulesTeaser(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="rounded-panel border border-border bg-surface p-8 sm:p-10"
      >
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">Modules</p>
            <h2 className="mt-3 text-[26px] font-semibold tracking-tight text-fg sm:text-[32px]">
              Ajoute juste ce qu’il te faut
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Des petits modules à activer dans le launcher : ta partie sur Discord, ton temps
              de jeu, le statut de ton serveur, la bonne mémoire automatiquement.
            </p>
            <Button asChild size="lg" className="mt-7 gap-2">
              <Link href="/modules">
                Voir les modules
                <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {BUILTIN_MODULES.map((m, i) => {
              const Icon = moduleIcon(m.icon);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: EASE_OUT }}
                  className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-border-2 bg-surface-2 text-accent"
                  title={m.name}
                >
                  <Icon className="h-6 w-6" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
