import { LauncherError, type ModLoader } from '@pilote/types';
import { MinecraftFolder } from '@xmcl/core';
import * as installer from '@xmcl/installer';
import { fetchJson } from '../net.js';
import type { StageReporter } from '../progress.js';

export interface InstallLoaderOptions {
  concurrency?: number;
  signal?: AbortSignal;
  reporter?: StageReporter;
}

const FABRIC_META = 'https://meta.fabricmc.net/v2/versions/loader';
const QUILT_META = 'https://meta.quiltmc.org/v3/versions/loader';

interface FabricLoaderEntry {
  loader: { version: string; stable: boolean };
}

interface QuiltLoaderEntry {
  loader: { version: string };
}

/** Resolve the latest stable Fabric loader version for a Minecraft version. */
async function latestFabricLoader(mcVersion: string, signal?: AbortSignal): Promise<string> {
  const list = await fetchJson<FabricLoaderEntry[]>(
    `${FABRIC_META}/${encodeURIComponent(mcVersion)}`,
    { retries: 3, ...(signal ? { signal } : {}) },
  );
  const stable = list.find((e) => e.loader.stable) ?? list[0];
  if (!stable) {
    throw new LauncherError('not-found', `No Fabric loader available for ${mcVersion}`, {
      retryable: false,
    });
  }
  return stable.loader.version;
}

/** Resolve the latest Quilt loader version for a Minecraft version. */
async function latestQuiltLoader(mcVersion: string, signal?: AbortSignal): Promise<string> {
  const list = await fetchJson<QuiltLoaderEntry[]>(
    `${QUILT_META}/${encodeURIComponent(mcVersion)}`,
    { retries: 3, ...(signal ? { signal } : {}) },
  );
  const first = list[0];
  if (!first) {
    throw new LauncherError('not-found', `No Quilt loader available for ${mcVersion}`, {
      retryable: false,
    });
  }
  return first.loader.version;
}

/** Generic dynamic accessor so we tolerate minor API-name differences across installer versions. */
function fn<T extends (...args: never[]) => unknown>(name: string): T {
  const candidate = (installer as unknown as Record<string, unknown>)[name];
  if (typeof candidate !== 'function') {
    throw new LauncherError('launch', `@xmcl/installer is missing required export "${name}"`, {
      retryable: false,
    });
  }
  return candidate as T;
}

/**
 * Install a mod loader on top of an already-installed vanilla version and return the
 * resolved version id to launch (e.g. "fabric-loader-0.16.9-1.21").
 *
 * Forge/NeoForge run the official installer's processors (no hand-parsing). Fabric/Quilt
 * just install the loader profile json. When `loaderVersion` is undefined we resolve the
 * latest version dynamically from each loader's meta API.
 */
export async function installLoader(
  loader: ModLoader,
  mcVersion: string,
  loaderVersion: string | undefined,
  gameDir: string,
  options: InstallLoaderOptions = {},
): Promise<string> {
  const mc = MinecraftFolder.from(gameDir);
  const signal = options.signal;
  options.reporter?.update(0, 1, { label: `Installation du loader ${loader}` });

  if (loader === 'vanilla') {
    options.reporter?.update(1, 1);
    return mcVersion;
  }

  const installOpts: Record<string, unknown> = {
    side: 'client',
  };
  const concurrency = Math.max(1, options.concurrency ?? 8);

  switch (loader) {
    case 'fabric': {
      const version = loaderVersion ?? (await latestFabricLoader(mcVersion, signal));
      // installFabric({ minecraftVersion, version }, minecraftLocation) -> resolved id
      const installFabric = fn<
        (
          opt: { minecraftVersion: string; version: string },
          loc: MinecraftFolder,
          extra?: Record<string, unknown>,
        ) => Promise<string>
      >('installFabric');
      const resolved = await installFabric(
        { minecraftVersion: mcVersion, version },
        mc,
        installOpts,
      );
      options.reporter?.update(1, 1);
      return typeof resolved === 'string' ? resolved : `fabric-loader-${version}-${mcVersion}`;
    }

    case 'quilt': {
      const version = loaderVersion ?? (await latestQuiltLoader(mcVersion, signal));
      const installQuilt = fn<
        (
          opt: { minecraftVersion: string; version: string },
          loc: MinecraftFolder,
          extra?: Record<string, unknown>,
        ) => Promise<string>
      >('installQuiltVersion');
      const resolved = await installQuilt(
        { minecraftVersion: mcVersion, version },
        mc,
        installOpts,
      );
      options.reporter?.update(1, 1);
      return typeof resolved === 'string' ? resolved : `quilt-loader-${version}-${mcVersion}`;
    }

    case 'forge': {
      const getForgeVersionList = fn<
        (opt: { minecraft: string }) => Promise<{
          versions: Array<{ version: string; type?: string; mcversion?: string }>;
        }>
      >('getForgeVersionList');
      let version = loaderVersion;
      if (!version) {
        const list = await getForgeVersionList({ minecraft: mcVersion });
        const recommended =
          list.versions.find((v) => v.type === 'recommended') ?? list.versions[0];
        if (!recommended) {
          throw new LauncherError('not-found', `No Forge version available for ${mcVersion}`, {
            retryable: false,
          });
        }
        version = recommended.version;
      }
      // installForge({ version, mcversion }, location, options) — runs processors.
      const installForge = fn<
        (
          opt: { version: string; mcversion: string },
          loc: MinecraftFolder,
          extra?: Record<string, unknown>,
        ) => Promise<string>
      >('installForge');
      const resolved = await installForge(
        { version, mcversion: mcVersion },
        mc,
        withProgress(installOpts, options, concurrency),
      );
      options.reporter?.update(1, 1);
      return typeof resolved === 'string' ? resolved : `${mcVersion}-forge-${version}`;
    }

    case 'neoforge': {
      const getNeoForgeVersionList = fn<
        (opt: { minecraft?: string; version?: string }) => Promise<{ versions: string[] }>
      >('getNeoForgeVersionList');
      let version = loaderVersion;
      if (!version) {
        const list = await getNeoForgeVersionList({ minecraft: mcVersion });
        const latest = list.versions[list.versions.length - 1];
        if (!latest) {
          throw new LauncherError('not-found', `No NeoForge version available for ${mcVersion}`, {
            retryable: false,
          });
        }
        version = latest;
      }
      const installNeoForged = fn<
        (
          project: 'neoforge',
          version: string,
          loc: MinecraftFolder,
          extra?: Record<string, unknown>,
        ) => Promise<string>
      >('installNeoForged');
      const resolved = await installNeoForged(
        'neoforge',
        version,
        mc,
        withProgress(installOpts, options, concurrency),
      );
      options.reporter?.update(1, 1);
      return typeof resolved === 'string' ? resolved : `neoforge-${version}`;
    }

    default: {
      const exhaustive: never = loader;
      throw new LauncherError('launch', `Unsupported loader: ${String(exhaustive)}`, {
        retryable: false,
      });
    }
  }
}

/** Attach a download-progress bridge + concurrency to forge/neoforge install options. */
function withProgress(
  base: Record<string, unknown>,
  options: InstallLoaderOptions,
  concurrency: number,
): Record<string, unknown> {
  let total = 0;
  let current = 0;
  return {
    ...base,
    maxConcurrency: concurrency,
    onDownloadUpdate: (task: { total?: number; progress?: number; from?: string }) => {
      if (typeof task.total === 'number' && task.total > total) total = task.total;
      if (typeof task.progress === 'number') current = task.progress;
      options.reporter?.update(current, total || 1);
    },
  };
}
