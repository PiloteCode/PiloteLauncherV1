import { LauncherError } from '@pilote/types';

/**
 * Validate a URL before handing it to `shell.openExternal`. Only absolute
 * `https:` URLs are permitted — never `http:`, `file:`, `javascript:`, etc.
 * Throws a typed {@link LauncherError} on rejection.
 */
export function assertSafeExternalUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new LauncherError('validation', `URL invalide: ${raw}`);
  }
  if (url.protocol !== 'https:') {
    throw new LauncherError('validation', `Protocole non autorisé (https requis): ${url.protocol}`);
  }
  if (!url.hostname) {
    throw new LauncherError('validation', 'Hôte manquant dans l’URL.');
  }
  return url;
}

/**
 * Validate that a candidate base URL is a syntactically valid http(s) URL.
 * Used when persisting `apiBaseUrl`.
 */
export function isValidApiBaseUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
