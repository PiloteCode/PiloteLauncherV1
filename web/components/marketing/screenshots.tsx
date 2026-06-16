'use client';

import { motion } from 'framer-motion';
import { EASE_OUT } from './motion';

/**
 * Subtle device frames containing striped SVG placeholders — we do NOT invent artwork.
 * Mono captions describe each screen of the launcher (per DESIGN.md key screens).
 */
const SHOTS: { caption: string; ratio: string }[] = [
  { caption: 'home — bibliothèque / grille d’instances', ratio: '16 / 10' },
  { caption: 'download — overlay de progression', ratio: '16 / 10' },
  { caption: 'code — déverrouillage instance privée', ratio: '16 / 10' },
];

function StripedPlaceholder({ caption }: { caption: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-input">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern
            id={`stripes-${caption.replace(/\W/g, '')}`}
            width="14"
            height="14"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="14" height="14" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="14" stroke="var(--border-2)" strokeWidth="7" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#stripes-${caption.replace(/\W/g, '')})`} />
      </svg>
      <div className="absolute inset-0 flex items-end p-3">
        <span className="rounded-md border border-border-2 bg-bg/80 px-2 py-1 font-mono text-[11px] text-muted-2 backdrop-blur">
          {caption}
        </span>
      </div>
    </div>
  );
}

export function Screenshots() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">Aperçu</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-fg sm:text-[34px]">
          Une interface sobre, pensée pour jouer
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Cadres de prévisualisation — les captures réelles arrivent avec la première
          release publique.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {SHOTS.map((s, i) => (
          <motion.figure
            key={s.caption}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT }}
            className="overflow-hidden rounded-card border border-border bg-surface p-2 shadow-card"
          >
            {/* device chrome bar */}
            <div className="flex items-center gap-1.5 px-2 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-border-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-2" />
            </div>
            <div
              className="overflow-hidden rounded-[10px] border border-border-2"
              style={{ aspectRatio: s.ratio }}
            >
              <StripedPlaceholder caption={s.caption} />
            </div>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
