import type { Instance, InstanceFile } from '@pilote/types';

/** OKLCH cover generator from DESIGN.md (no invented artwork). */
export function hueFromName(s: string): number {
  s = s || 'x';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function coverGradient(name: string): string {
  const h = hueFromName(name);
  const h2 = (h + 28) % 360;
  return `linear-gradient(150deg, oklch(0.55 0.115 ${h}), oklch(0.40 0.10 ${h2}))`;
}

export function initials(s: string): string {
  return (s || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'MC';
}

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Total size of a file list. */
export function totalSize(files: InstanceFile[]): number {
  return files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
}

/** Short SHA-1 for display (first 10 hex chars). */
export function shortHash(sha1: string): string {
  return sha1.slice(0, 10);
}

/** Relative-ish date formatting (FR). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Extract a human error message from an API error response body or thrown error. */
export async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body?.error?.message) return body.error.message;
  } catch {
    /* not JSON */
  }
  return `Erreur ${res.status}`;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Typed JSON fetch helper that throws a readable Error on non-2xx. */
export async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await readApiError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Files grouped by their target folder, in a stable order. */
export const TARGET_ORDER: InstanceFile['target'][] = [
  'mods',
  'config',
  'resourcepacks',
  'shaderpacks',
  'datapacks',
  'root',
];

export const TARGET_LABEL: Record<InstanceFile['target'], string> = {
  mods: 'mods',
  config: 'config',
  resourcepacks: 'resourcepacks',
  shaderpacks: 'shaderpacks',
  datapacks: 'datapacks',
  root: 'racine',
};

export function instanceFileCount(instance: Pick<Instance, 'files'>): number {
  return instance.files?.length ?? 0;
}
