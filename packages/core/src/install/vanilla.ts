import { LauncherError } from '@pilote/types';
import { MinecraftFolder, Version, type ResolvedVersion } from '@xmcl/core';
import { install, installDependencies } from '@xmcl/installer';
import { findVersionEntry } from './version-manifest.js';
import { wrapAsync } from '../errors.js';
import type { StageReporter } from '../progress.js';

export interface InstallVanillaOptions {
  /** Number of concurrent downloads inside the installer. Default 8. */
  concurrency?: number;
  signal?: AbortSignal;
  /** Reports progress within the `vanilla` stage. */
  reporter?: StageReporter;
}

/**
 * Build the options object passed to @xmcl/installer's `install`/`installDependencies`.
 * We bridge the installer's per-task download progress into our single stage bar.
 * Typed as a loose record so we stay compatible across installer minor versions.
 */
function buildInstallerOptions(opts: InstallVanillaOptions): Record<string, unknown> {
  const concurrency = Math.max(1, opts.concurrency ?? 8);
  let total = 0;
  let current = 0;

  return {
    side: 'client',
    throwErrorImmediately: false,
    overwriteWhen: 'checksumNotMatchOrEmpty',
    // Aggregate progress callback supported by the installer's download options.
    onDownloadUpdate: (task: { total?: number; progress?: number; from?: string }) => {
      if (typeof task.total === 'number' && task.total > total) total = task.total;
      if (typeof task.progress === 'number') current = task.progress;
      opts.reporter?.update(current, total || 1, {
        ...(task.from ? { file: basename(task.from) } : {}),
      });
    },
    // Parallel download pool size (option name varies across installer versions).
    maxConcurrency: concurrency,
    librariesDownloadConcurrency: concurrency,
    assetsDownloadConcurrency: concurrency,
    assetsHost: 'https://resources.download.minecraft.net',
  };
}

function basename(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

/**
 * Install a vanilla Minecraft version: client jar + libraries + assets + natives,
 * into `gameDir` (a standard `.minecraft`-style folder). Returns the resolved version.
 */
export async function installVanilla(
  mcVersion: string,
  gameDir: string,
  options: InstallVanillaOptions = {},
): Promise<ResolvedVersion> {
  return wrapAsync('network', `Failed to install Minecraft ${mcVersion}`, async () => {
    const mc = MinecraftFolder.from(gameDir);
    options.reporter?.update(0, 1, { label: `Installation de Minecraft ${mcVersion}` });

    const entry = await findVersionEntry(mcVersion, options.signal ? { signal: options.signal } : {});
    const minecraftVersion = {
      id: entry.id,
      type: entry.type,
      url: entry.url,
      time: entry.time,
      releaseTime: entry.releaseTime,
      sha1: entry.sha1,
    };

    const installerOptions = buildInstallerOptions(options);

    // `install` downloads the version json + client jar; then resolve & install deps.
    await install(
      minecraftVersion as unknown as Parameters<typeof install>[0],
      mc,
      installerOptions as unknown as Parameters<typeof install>[2],
    );

    const resolved = await Version.parse(mc, mcVersion);
    await installDependencies(
      resolved as unknown as Parameters<typeof installDependencies>[0],
      installerOptions as unknown as Parameters<typeof installDependencies>[1],
    );

    if (options.signal?.aborted) {
      throw new LauncherError('network', 'Install aborted', { retryable: false });
    }

    options.reporter?.update(1, 1);
    return resolved;
  });
}

/** Resolve an already-installed version's metadata from disk. */
export async function resolveInstalledVersion(
  versionId: string,
  gameDir: string,
): Promise<ResolvedVersion> {
  const mc = MinecraftFolder.from(gameDir);
  return wrapAsync('launch', `Failed to resolve installed version ${versionId}`, () =>
    Version.parse(mc, versionId),
  );
}
