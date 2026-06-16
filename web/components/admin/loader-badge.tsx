import { LOADER_DOT_COLOR, LOADER_LABEL, type ModLoader } from '@pilote/types';
import { cn } from '@/lib/utils';

/** Loader chip with the design-token dot color, plus optional loader version in mono. */
export function LoaderBadge({
  loader,
  version,
  className,
}: {
  loader: ModLoader;
  version?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border-2 bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-fg-3',
        className,
      )}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: LOADER_DOT_COLOR[loader] }}
        aria-hidden
      />
      {LOADER_LABEL[loader]}
      {version ? <span className="font-mono text-[11px] text-muted-2">{version}</span> : null}
    </span>
  );
}
