import { join } from 'node:path';
import type { FileTarget, InstanceFile, InstanceManifest } from '@pilote/types';
import { sha1OfFile } from '../net.js';

/** Map a {@link FileTarget} to its subdirectory inside the instance game dir. */
export function targetSubdir(target: FileTarget): string {
  switch (target) {
    case 'mods':
      return 'mods';
    case 'config':
      return 'config';
    case 'resourcepacks':
      return 'resourcepacks';
    case 'shaderpacks':
      return 'shaderpacks';
    case 'datapacks':
      // Datapacks live per-world; we manage a shared staging dir the launcher links/copies.
      return 'datapacks';
    case 'root':
      return '.';
    default: {
      const exhaustive: never = target;
      return String(exhaustive);
    }
  }
}

/** Absolute on-disk path for a manifest file inside the instance dir. */
export function resolveFilePath(instanceDir: string, file: InstanceFile): string {
  const sub = targetSubdir(file.target);
  return sub === '.' ? join(instanceDir, file.path) : join(instanceDir, sub, file.path);
}

/**
 * A stable, OS-independent key used in the managed-files index to identify a file
 * by its logical location (target + relative path).
 */
export function managedKey(file: Pick<InstanceFile, 'target' | 'path'>): string {
  const rel = targetSubdir(file.target);
  const normalized = file.path.replace(/\\/g, '/');
  return rel === '.' ? normalized : `${rel}/${normalized}`;
}

export interface SyncDiff {
  /** Files to (re)download because they're missing or their SHA-1 differs. */
  toDownload: InstanceFile[];
  /** Currently-managed files no longer in the manifest (or now disabled) — safe to delete. */
  toDelete: string[];
  /** Files already present with a matching hash. */
  unchanged: InstanceFile[];
}

/**
 * The managed-files index persisted in the instance dir. It records exactly which
 * files the launcher wrote, so user-added files are NEVER deleted during sync.
 */
export interface ManagedIndex {
  /** Manifest version this index reflects. */
  version: number;
  /** Map of managedKey -> sha1 of the launcher-written file. */
  files: Record<string, { sha1: string; target: FileTarget; path: string }>;
}

export const EMPTY_INDEX: ManagedIndex = { version: 0, files: {} };

/**
 * Compute the sync diff for a manifest against the local instance dir.
 *
 * A file is downloaded when it is enabled and either missing locally or its on-disk
 * SHA-1 differs from the manifest. A previously-managed file is deleted when it is no
 * longer present (or now disabled) in the manifest. Files not tracked in `index` are
 * treated as user-added and left untouched.
 */
export async function computeDiff(
  manifest: InstanceManifest,
  instanceDir: string,
  index: ManagedIndex,
): Promise<SyncDiff> {
  const enabledFiles = manifest.files.filter((f) => f.enabled !== false);
  const toDownload: InstanceFile[] = [];
  const unchanged: InstanceFile[] = [];

  const desiredKeys = new Set<string>();

  for (const file of enabledFiles) {
    desiredKeys.add(managedKey(file));
    const abs = resolveFilePath(instanceDir, file);
    const actual = await sha1OfFile(abs);
    if (actual === file.sha1.toLowerCase()) {
      unchanged.push(file);
    } else {
      toDownload.push(file);
    }
  }

  // Delete only files we previously managed and that are no longer desired.
  const toDelete: string[] = [];
  for (const [key, record] of Object.entries(index.files)) {
    if (desiredKeys.has(key)) continue;
    const abs = resolveFilePath(instanceDir, { ...record, downloadUrl: '', sizeBytes: 0, enabled: true });
    toDelete.push(abs);
  }

  return { toDownload, toDelete, unchanged };
}

/** Build the next managed index from the full set of enabled manifest files. */
export function buildIndex(manifest: InstanceManifest): ManagedIndex {
  const files: ManagedIndex['files'] = {};
  for (const file of manifest.files) {
    if (file.enabled === false) continue;
    files[managedKey(file)] = {
      sha1: file.sha1.toLowerCase(),
      target: file.target,
      path: file.path,
    };
  }
  return { version: manifest.version, files };
}
