'use client';

import { motion, type Variants } from 'framer-motion';
import {
  Boxes,
  FileCheck2,
  Lock,
  Puzzle,
  RefreshCw,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT } from './motion';

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  span?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Boxes,
    title: 'Instances publiques & privées',
    body: 'Publiez vos modpacks ouverts à tous, ou gardez-les privés derrière un code d’accès à usage unique. Vous décidez qui rejoint.',
    span: true,
  },
  {
    icon: FileCheck2,
    title: 'Synchronisation par hash',
    body: 'Chaque fichier est adressé par son SHA-1. Le launcher ne télécharge que ce qui a changé et supprime ce qui n’est plus au manifeste.',
  },
  {
    icon: RefreshCw,
    title: 'Mises à jour automatiques',
    body: 'Le launcher se met à jour tout seul. Et dès que tu modifies une instance, les joueurs récupèrent les nouveaux fichiers au prochain lancement.',
  },
  {
    icon: UserRound,
    title: 'Profils hors-ligne',
    body: 'Pas d’authentification Microsoft. Les joueurs choisissent un pseudo et un UUID dérivé. Fonctionne sur les serveurs en online-mode=false.',
  },
  {
    icon: Puzzle,
    title: 'Fabric · Forge · NeoForge · Quilt',
    body: 'Tous les principaux loaders sont installés automatiquement avec la bonne version de Java (8 / 17 / 21).',
  },
  {
    icon: Lock,
    title: 'Accès privé verrouillé',
    body: 'Les fichiers d’une instance privée ne sortent jamais sans le bon code. Pas de lien public qui traîne dans la nature.',
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
          Pourquoi Pilote
        </p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-fg sm:text-[34px]">
          Tout le pipeline de distribution, intégré
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          De l’upload des mods à la machine du joueur — sans serveur de fichiers à bricoler,
          sans script de sync à maintenir.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              variants={item}
              className={cn(
                'group relative overflow-hidden rounded-card border border-border bg-surface p-6 transition-colors hover:border-border-hover',
                f.span && 'sm:col-span-2 lg:col-span-1',
              )}
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-border-2 bg-surface-2 text-accent">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <h3 className="text-[15px] font-semibold text-fg-1">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
