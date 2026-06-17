'use client';

import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, Send, DownloadCloud } from 'lucide-react';
import { EASE_OUT } from './motion';

const STEPS = [
  {
    n: '01',
    icon: KeyRound,
    title: 'Tu génères un code',
    body: 'Dans l’admin, tu passes l’instance en privé et tu génères un code. Il ne s’affiche qu’une seule fois — ensuite il est stocké chiffré, impossible à relire.',
  },
  {
    n: '02',
    icon: Send,
    title: 'Tu le donnes à qui tu veux',
    body: 'Le joueur colle le code dans son launcher. S’il est bon, l’instance apparaît chez lui — et seulement chez lui.',
  },
  {
    n: '03',
    icon: ShieldCheck,
    title: 'Personne d’autre ne la voit',
    body: 'L’instance ne sort jamais dans la liste publique, et ses fichiers ne se téléchargent qu’une fois le code validé. Pas de lien qui fuite.',
  },
  {
    n: '04',
    icon: DownloadCloud,
    title: 'Et ça lance',
    body: 'Le launcher récupère juste les fichiers qui manquent, installe le loader et le bon Java, et démarre le jeu.',
  },
];

export function PrivateFlow() {
  return (
    <section
      id="private"
      className="relative scroll-mt-24 border-y border-border-subtle bg-titlebar/40"
    >
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">
              Instances privées
            </p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-fg sm:text-[34px]">
              Privé, et ça le reste.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              Pratique pour les serveurs entre potes, les bêtas, ou un modpack que tu veux
              garder fermé. Un code n’ouvre qu’une seule instance, à qui tu l’as donné.
            </p>

            <div className="mt-6 rounded-card border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed text-muted-2">
              <span className="text-success">POST</span> /api/instances/unlock
              <br />
              <span className="text-muted-3">{'{'}</span> &quot;code&quot;:{' '}
              <span className="text-fg-3">&quot;A1B2-C3D4&quot;</span> <span className="text-muted-3">{'}'}</span>
              <br />
              <span className="text-muted-3">→ 200</span> {'{'} token, expiresAt, instance {'}'}
            </div>
          </div>

          <ol className="relative space-y-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.li
                  key={s.n}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: i * 0.06, ease: EASE_OUT }}
                  className="flex gap-4 rounded-card border border-border bg-surface p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border-2 bg-surface-2 text-accent">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-muted-3">{s.n}</span>
                      <h3 className="text-[15px] font-semibold text-fg-1">{s.title}</h3>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
