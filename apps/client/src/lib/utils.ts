import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and de-duplicate Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a byte count into a human-readable string (e.g. "12.4 MB"). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  const k = 1024;
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Format a transfer speed in bytes/second into "X Mo/s". */
export function formatSpeed(bps: number | undefined): string {
  if (!bps || bps <= 0) return '—';
  return `${formatBytes(bps)}/s`;
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Megabytes -> "X Go" / "X Mo" label for the RAM slider. */
export function formatRam(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} Go`;
  }
  return `${mb} Mo`;
}

/** Relative "il y a …" formatter for ISO timestamps. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const day = Math.round(hr / 24);
  if (day < 30) return `il y a ${day} j`;
  const month = Math.round(day / 30);
  if (month < 12) return `il y a ${month} mois`;
  return `il y a ${Math.round(month / 12)} an(s)`;
}

/** Shorten a hash/uuid for compact mono display. */
export function shortHash(value: string, head = 8): string {
  if (value.length <= head) return value;
  return value.slice(0, head);
}
