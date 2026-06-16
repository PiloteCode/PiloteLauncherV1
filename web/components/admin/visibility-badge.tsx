import { Globe, Lock } from 'lucide-react';
import type { InstanceVisibility } from '@pilote/types';
import { cn } from '@/lib/utils';

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: InstanceVisibility;
  className?: string;
}) {
  const isPrivate = visibility === 'private';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-medium',
        isPrivate
          ? 'border-[color-mix(in_oklch,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] text-accent'
          : 'border-border-2 bg-surface-2 text-muted',
        className,
      )}
    >
      {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      {isPrivate ? 'Privé' : 'Public'}
    </span>
  );
}
