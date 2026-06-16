/**
 * Auto-generated instance covers & profile avatars — no invented artwork.
 * Derive a stable hue from the name and render a subtle OKLCH gradient + initials.
 * Mirrors the reference algorithm in DESIGN.md exactly.
 */

/** Deterministic hue [0,360) derived from a string. */
export function hueFromName(s: string): number {
  const str = s || 'x';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

/** Two-stop OKLCH cover gradient for an instance card. */
export function coverGradient(name: string): string {
  const h = hueFromName(name);
  const h2 = (h + 28) % 360;
  return `linear-gradient(150deg, oklch(0.55 0.115 ${h}), oklch(0.40 0.10 ${h2}))`;
}

/** Flat OKLCH fill for a profile avatar chip. */
export function avatarColor(name: string): string {
  const h = hueFromName(name);
  return `oklch(0.55 0.115 ${h})`;
}

/** Up-to-two-character uppercase initials, alnum only; falls back to "MC". */
export function initials(s: string): string {
  return (s || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'MC';
}
