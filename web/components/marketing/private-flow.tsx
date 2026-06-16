'use client';

import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, Send, DownloadCloud } from 'lucide-react';
import { EASE_OUT } from './motion';

const STEPS = [
  {
    n: '01',
    icon: KeyRound,
    title: 'Vous générez un code',
    body: 'Dans l’admin, vous activez la visibilité privée et générez un code d’accès. Seul son hash argon2 est stocké — le code en clair ne s’affiche qu’une fois.',
  },
  {
    n: '02',
    icon: Send,
    title: 'Le joueur déverrouille',
    body: 'Le joueur saisit le code dans le launcher. POST /api/instances/unlock vérifie le hash et renvoie un JWT à courte durée de vie, lié à cette seule instance.',
  },
  {
    n: '03',
    icon: ShieldCheck,
    title: 'Le manifeste se débloque',
    body: 'Le manifeste et chaque URL de fichier privé exigent ce jeton. Aucune instance privée n’apparaît jamais dans la liste publique.',
  },
  {
    n: '04',
    icon: DownloadCloud,
    title: 'Sync & lancement',
    body: 'Le launcher télécharge uniquement les fichiers manquants par hash, installe le loader et le bon Java, puis lance le jeu.',
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
              Un code. Un jeton. Zéro fuite.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              Le flux privé est pensé pour les communautés fermées : serveurs entre amis,
              bêtas, modpacks payants. Le code n’ouvre l’accès qu’à une instance, et le jeton
              expire vite.
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
