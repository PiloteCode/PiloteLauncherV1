'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { EASE_OUT } from './motion';

export function DownloadCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="relative overflow-hidden rounded-panel border border-border bg-surface px-8 py-16 text-center"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(50% 80% at 50% 0%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 70%)',
          }}
        />
        <div className="relative mx-auto flex max-w-xl flex-col items-center">
          <Logo size={56} />
          <h2 className="mt-7 text-[30px] font-semibold tracking-tight text-fg sm:text-[38px]">
            Prêt à distribuer votre modpack ?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Installez le launcher, créez votre première instance dans l’admin, et partagez
            le lien. Vos joueurs sont en jeu en quelques minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 gap-2 px-5">
              <Link href="/download">
                <Download className="h-[18px] w-[18px]" />
                Télécharger le launcher
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-11 gap-2 px-5">
              <Link href="/admin">
                Ouvrir l’admin
                <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
