'use client';

import { cn } from '@/lib/utils';

/**
 * Pilote Project brand mark.
 * A rounded square rotated 45°, filled with the accent gradient, with a soft blur glow behind it.
 * Per DESIGN.md window-chrome + landing hero spec.
 */
export function Logo({
  size = 40,
  glow = true,
  className,
}: {
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  const inner = Math.round(size * 0.72);
  const radius = Math.round(size * 0.28);

  return (
    <span
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {glow && (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: size * 1.7,
            height: size * 1.7,
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--accent) 70%, transparent) 0%, transparent 70%)',
            filter: 'blur(14px)',
            opacity: 0.75,
          }}
        />
      )}
      <span
        className="relative block"
        style={{
          width: inner,
          height: inner,
          borderRadius: radius,
          transform: 'rotate(45deg)',
          background: 'linear-gradient(150deg, #60a5fa 0%, var(--accent) 55%, #1d4ed8 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,.35), 0 6px 18px -8px rgba(59,130,246,.7)',
        }}
      >
        <span
          className="absolute block"
          style={{
            inset: Math.round(inner * 0.26),
            borderRadius: Math.round(radius * 0.5),
            background: 'rgba(10,10,11,.55)',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.22)',
          }}
        />
      </span>
    </span>
  );
}
