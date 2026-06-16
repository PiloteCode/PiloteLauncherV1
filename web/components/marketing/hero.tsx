'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Apple, Download, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { fadeContainer as container, fadeItem as item } from './motion';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% -5%, color-mix(in oklch, var(--accent) 16%, transparent), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(60% 60% at 50% 30%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(60% 60% at 50% 30%, #000 30%, transparent 75%)',
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-20 pt-36 text-center"
      >
        <motion.div variants={item} className="mb-8">
          <Logo size={84} />
        </motion.div>

        <motion.span
          variants={item}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-2 bg-surface px-3 py-1 text-[12px] font-medium text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Launcher Minecraft Java — Fabric · Forge · NeoForge · Quilt
        </motion.span>

        <motion.h1
          variants={item}
          className="text-balance text-[40px] font-semibold leading-[1.08] tracking-tight text-fg sm:text-[56px]"
        >
          Distribuez vos modpacks.
          <br />
          <span className="text-muted">Vos joueurs jouent en un clic.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted"
        >
          Pilote Project est un launcher custom qui synchronise vos instances par hash,
          se met à jour tout seul et gère les instances publiques comme privées. Profils
          hors-ligne, zéro friction.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-11 gap-2 px-5">
            <Link href="/download">
              <Monitor className="h-[18px] w-[18px]" />
              Windows
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-11 gap-2 px-5">
            <Link href="/download">
              <Apple className="h-[18px] w-[18px]" />
              macOS
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-11 gap-2 px-5">
            <Link href="/download">
              <Download className="h-[18px] w-[18px]" />
              Linux
            </Link>
          </Button>
        </motion.div>

        <motion.p variants={item} className="mt-4 font-mono text-[11px] text-muted-3">
          Gratuit et open-source · Auto-update intégré
        </motion.p>
      </motion.div>
    </section>
  );
}
