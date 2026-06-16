'use client';

import { Globe, Lock } from 'lucide-react';
import type { InstanceVisibility } from '@pilote/types';
import { cn } from '@/lib/utils';

const OPTIONS: {
  value: InstanceVisibility;
  label: string;
  hint: string;
  icon: typeof Globe;
}[] = [
  {
    value: 'public',
    label: 'Publique',
    hint: 'Visible par tous dans le launcher.',
    icon: Globe,
  },
  {
    value: 'private',
    label: 'Privée',
    hint: 'Accessible uniquement avec un code.',
    icon: Lock,
  },
];

export function VisibilityToggle({
  value,
  onChange,
  disabled,
}: {
  value: InstanceVisibility;
  onChange: (v: InstanceVisibility) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Visibilité">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-[12px] border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              active
                ? 'border-accent bg-[color-mix(in_oklch,var(--accent)_10%,transparent)]'
                : 'border-border-input bg-surface-input hover:border-border-hover',
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', active ? 'text-accent' : 'text-muted-2')} />
              <span
                className={cn(
                  'text-[13.5px] font-medium',
                  active ? 'text-fg' : 'text-fg-3',
                )}
              >
                {o.label}
              </span>
            </span>
            <span className="text-[12px] leading-snug text-muted-2">{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
