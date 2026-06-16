import { LauncherError } from '@pilote/types';
import { fetchJson } from '../net.js';

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

/** One entry in the Mojang version manifest. */
export interface ManifestVersionEntry {
  id: string;
  type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta';
  url: string;
  time: string;
  releaseTime: string;
  sha1: string;
  complianceLevel: number;
}

export interface VersionManifest {
  latest: { release: string; snapshot: string };
  versions: ManifestVersionEntry[];
}

interface CacheState {
  manifest: VersionManifest;
  at: number;
}

/** Cache the manifest for 5 minutes; it changes rarely. */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: CacheState | undefined;

/** Fetch the Mojang version manifest (v2), cached in-memory. */
export async function getVersionManifest(
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<VersionManifest> {
  if (!options.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.manifest;
  }
  const manifest = await fetchJson<VersionManifest>(MANIFEST_URL, {
    retries: 4,
    ...(options.signal ? { signal: options.signal } : {}),
  });
  cache = { manifest, at: Date.now() };
  return manifest;
}

/** Find the manifest entry for a specific Minecraft version id. */
export async function findVersionEntry(
  mcVersion: string,
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<ManifestVersionEntry> {
  const manifest = await getVersionManifest(options);
  const entry = manifest.versions.find((v) => v.id === mcVersion);
  if (!entry) {
    throw new LauncherError('not-found', `Minecraft version "${mcVersion}" not found in manifest`, {
      retryable: false,
    });
  }
  return entry;
}

/** Resolve the metadata (per-version JSON) URL for a Minecraft version. */
export async function resolveVersionMetadataUrl(
  mcVersion: string,
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<string> {
  const entry = await findVersionEntry(mcVersion, options);
  return entry.url;
}

/** The latest release id reported by the manifest. */
export async function latestRelease(options: { signal?: AbortSignal } = {}): Promise<string> {
  const manifest = await getVersionManifest(options);
  return manifest.latest.release;
}
