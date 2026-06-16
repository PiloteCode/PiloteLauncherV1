import { LauncherError, type MojangLookup } from '@pilote/types';
import { httpRequest } from '../net.js';
import { computeOfflineUuid, formatDashedUuid } from './offline-uuid.js';

export { formatDashedUuid } from './offline-uuid.js';

const PROFILE_API = 'https://api.mojang.com/users/profiles/minecraft';
const SESSION_API = 'https://sessionserver.mojang.com/session/minecraft/profile';

/** Successful response from the Mojang username lookup endpoint. */
interface MojangNameResponse {
  id: string; // undashed uuid
  name: string;
}

/** Response from the session server profile endpoint (base64 textures property). */
interface MojangSessionResponse {
  id: string;
  name: string;
  properties?: Array<{ name: string; value: string; signature?: string }>;
}

interface CacheEntry {
  result: MojangLookup;
  /** epoch ms when this entry was stored. */
  at: number;
}

/** Time-to-live for a positive/negative cache entry (10 minutes). */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Cooldown after a 429 before we hit the Mojang API again. */
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

const cache = new Map<string, CacheEntry>();
let rateLimitedUntil = 0;

function cacheKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Read a still-fresh cache entry, or `undefined`. */
function readFresh(name: string): MojangLookup | undefined {
  const entry = cache.get(cacheKey(name));
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) return undefined;
  return entry.result;
}

/** Read any cache entry regardless of freshness (used as a network-failure fallback). */
function readStale(name: string): MojangLookup | undefined {
  return cache.get(cacheKey(name))?.result;
}

function store(name: string, result: MojangLookup): void {
  cache.set(cacheKey(name), { result, at: Date.now() });
}

/** Build the offline-mode lookup result for a username. */
function offlineResult(name: string): MojangLookup {
  return {
    name,
    uuid: computeOfflineUuid(name),
    uuidSource: 'offline',
  };
}

/**
 * Decode the skin texture URL from a session-server profile's base64 `textures` property.
 */
function extractSkinUrl(profile: MojangSessionResponse): string | undefined {
  const texturesProp = profile.properties?.find((p) => p.name === 'textures');
  if (!texturesProp) return undefined;
  try {
    const json = Buffer.from(texturesProp.value, 'base64').toString('utf8');
    const decoded = JSON.parse(json) as {
      textures?: { SKIN?: { url?: string } };
    };
    return decoded.textures?.SKIN?.url;
  } catch {
    return undefined;
  }
}

/** Fetch the skin URL for a premium profile by its undashed uuid (best-effort). */
async function fetchSkinUrl(undashedId: string, signal?: AbortSignal): Promise<string | undefined> {
  try {
    const res = await httpRequest(`${SESSION_API}/${undashedId}`, {
      retries: 2,
      ...(signal ? { signal } : {}),
    });
    if (res.statusCode === 204) {
      await res.body.dump();
      return undefined;
    }
    const profile = (await res.body.json()) as MojangSessionResponse;
    return extractSkinUrl(profile);
  } catch {
    // Skin is non-critical; ignore failures.
    return undefined;
  }
}

/**
 * Look up a Minecraft username via the Mojang API.
 *
 *  - 200: a premium account — returns the real dashed UUID and (best-effort) skin URL.
 *  - 404/204: no such premium account — returns the canonical offline UUID.
 *  - 429: rate limited — backs off and falls back to cache or offline UUID.
 *  - network failure: returns a cached value if available, else throws.
 *
 * Results are cached in-memory with a short TTL.
 */
export async function lookupProfile(
  name: string,
  options: { signal?: AbortSignal; force?: boolean } = {},
): Promise<MojangLookup> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new LauncherError('validation', 'Username must not be empty', { retryable: false });
  }

  if (!options.force) {
    const fresh = readFresh(trimmed);
    if (fresh) return fresh;
  }

  // Respect an active rate-limit cooldown without hitting the network.
  if (Date.now() < rateLimitedUntil) {
    return readStale(trimmed) ?? offlineResult(trimmed);
  }

  try {
    const res = await httpRequest(`${PROFILE_API}/${encodeURIComponent(trimmed)}`, {
      retries: 2,
      ...(options.signal ? { signal: options.signal } : {}),
    });

    if (res.statusCode === 429) {
      await res.body.dump();
      rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      return readStale(trimmed) ?? offlineResult(trimmed);
    }

    if (res.statusCode === 204 || res.statusCode === 404) {
      await res.body.dump();
      const result = offlineResult(trimmed);
      store(trimmed, result);
      return result;
    }

    const data = (await res.body.json()) as MojangNameResponse;
    const uuid = formatDashedUuid(data.id);
    const skinUrl = await fetchSkinUrl(data.id, options.signal);
    const result: MojangLookup = {
      name: data.name,
      uuid,
      uuidSource: 'mojang',
      ...(skinUrl ? { skinUrl } : {}),
    };
    store(trimmed, result);
    return result;
  } catch (err) {
    if (err instanceof LauncherError && err.kind === 'network') {
      const stale = readStale(trimmed);
      if (stale) return stale;
    }
    if (err instanceof LauncherError) throw err;
    throw new LauncherError('auth', `Mojang lookup failed for "${trimmed}"`, { cause: err });
  }
}

/** Clear the in-memory cache and rate-limit state (useful for tests/manual refresh). */
export function clearLookupCache(): void {
  cache.clear();
  rateLimitedUntil = 0;
}
