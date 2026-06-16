import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { LauncherError, type InstanceManifest } from '@pilote/types';
import { downloadToFile, runPool } from '../net.js';
import type { StageReporter } from '../progress.js';
import {
  buildIndex,
  computeDiff,
  EMPTY_INDEX,
  resolveFilePath,
  type ManagedIndex,
  type SyncDiff,
} from './manifest.js';

export {
  computeDiff,
  buildIndex,
  resolveFilePath,
  targetSubdir,
  managedKey,
  EMPTY_INDEX,
} from './manifest.js';
export type { SyncDiff, ManagedIndex } from './manifest.js';

/** Name of the managed-files index stored at the root of each instance dir. */
const INDEX_FILENAME = '.pilote-managed.json';

export interface SyncOptions {
  /** Bearer token for private instances (sent as `Authorization: Bearer <token>`). */
  token?: string;
  /** Base URL used to resolve relative `downloadUrl`s (the distribution backend). */
  baseUrl: string;
  /** Max concurrent downloads. Default 8. */
  concurrency?: number;
  signal?: AbortSignal;
  reporter?: StageReporter;
}

export interface SyncResult {
  downloaded: number;
  deleted: number;
  unchanged: number;
}

function indexPath(instanceDir: string): string {
  return join(instanceDir, INDEX_FILENAME);
}

/** Load the managed-files index for an instance dir, or the empty index. */
export async function loadManagedIndex(instanceDir: string): Promise<ManagedIndex> {
  try {
    const raw = await readFile(indexPath(instanceDir), 'utf8');
    const parsed = JSON.parse(raw) as Partial<ManagedIndex>;
    if (parsed && typeof parsed === 'object' && parsed.files) {
      return { version: parsed.version ?? 0, files: parsed.files };
    }
    return { ...EMPTY_INDEX };
  } catch {
    return { ...EMPTY_INDEX };
  }
}

async function saveManagedIndex(instanceDir: string, index: ManagedIndex): Promise<void> {
  await mkdir(instanceDir, { recursive: true });
  await writeFile(indexPath(instanceDir), JSON.stringify(index, null, 2), 'utf8');
}

/** Resolve a (possibly relative) download URL against the base URL. Private auth is carried by the bearer header. */
function resolveDownloadUrl(downloadUrl: string, baseUrl: string): string {
  try {
    return new URL(downloadUrl).toString();
  } catch {
    return new URL(downloadUrl, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
  }
}

/**
 * Synchronise an instance's files against its manifest. Only changed files are
 * downloaded (verified by SHA-1), obsolete launcher-managed files are deleted, and
 * user-added files are never touched. The managed-files index is persisted afterwards.
 */
export async function syncInstance(
  manifest: InstanceManifest,
  instanceDir: string,
  options: SyncOptions,
): Promise<SyncResult> {
  if (!options.baseUrl) {
    throw new LauncherError('validation', 'syncInstance requires a baseUrl', { retryable: false });
  }
  await mkdir(instanceDir, { recursive: true });

  const index = await loadManagedIndex(instanceDir);
  const diff: SyncDiff = await computeDiff(manifest, instanceDir, index);

  const totalFiles = diff.toDownload.length;
  let completed = 0;
  // Track bytes per in-flight file so the aggregate bar reflects real transfer.
  const fileBytes = new Map<string, { current: number; total: number }>();

  const concurrency = Math.max(1, options.concurrency ?? 8);
  const headers: Record<string, string> = options.token
    ? { authorization: `Bearer ${options.token}` }
    : {};

  options.reporter?.update(0, Math.max(totalFiles, 1), {
    label: totalFiles > 0 ? `Synchronisation (${totalFiles} fichiers)` : 'Synchronisation',
  });

  const reportAggregate = (file: string, speedBps: number) => {
    let aggCurrent = completed;
    let aggTotal = totalFiles;
    if (totalFiles <= 0) {
      options.reporter?.update(1, 1, { file });
      return;
    }
    // Add fractional progress of in-flight files for a smooth bar.
    for (const v of fileBytes.values()) {
      if (v.total > 0) aggCurrent += Math.min(1, v.current / v.total);
    }
    options.reporter?.update(Math.min(aggCurrent, aggTotal), aggTotal, { file, speedBps });
  };

  await runPool(diff.toDownload, concurrency, async (file) => {
    if (options.signal?.aborted) {
      throw new LauncherError('network', 'Sync aborted', { retryable: false });
    }
    const dest = resolveFilePath(instanceDir, file);
    const url = resolveDownloadUrl(file.downloadUrl, options.baseUrl);
    await mkdir(dirname(dest), { recursive: true });

    await downloadToFile(url, dest, {
      sha1: file.sha1,
      headers,
      ...(options.signal ? { signal: options.signal } : {}),
      onProgress: (p) => {
        fileBytes.set(file.path, { current: p.current, total: p.total });
        reportAggregate(file.path, p.speedBps);
      },
    });

    fileBytes.delete(file.path);
    completed += 1;
    reportAggregate(file.path, 0);
  });

  // Delete obsolete managed files (best-effort; never user files).
  let deleted = 0;
  for (const abs of diff.toDelete) {
    try {
      await rm(abs, { force: true });
      deleted += 1;
    } catch {
      // ignore deletion failures (file may already be gone)
    }
  }

  // Persist the new managed index reflecting the now-on-disk state.
  await saveManagedIndex(instanceDir, buildIndex(manifest));

  options.reporter?.update(Math.max(totalFiles, 1), Math.max(totalFiles, 1));

  return {
    downloaded: diff.toDownload.length,
    deleted,
    unchanged: diff.unchanged.length,
  };
}
