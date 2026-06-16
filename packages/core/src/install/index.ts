import type { ModLoader, JavaMajor, InstanceManifest, ProgressEvent } from '@pilote/types';
import { ProgressReporter, type ProgressCallback } from '../progress.js';
import { ensureJava, majorForMc } from '../java/index.js';
import { installVanilla } from './vanilla.js';
import { installLoader } from './loader.js';
import { syncInstance } from '../sync/index.js';

export { getVersionManifest, findVersionEntry, resolveVersionMetadataUrl } from './version-manifest.js';
export { installVanilla, resolveInstalledVersion } from './vanilla.js';
export { installLoader } from './loader.js';
export type { VersionManifest, ManifestVersionEntry } from './version-manifest.js';

export interface InstallPipelineOptions {
  instanceId: string;
  mcVersion: string;
  loader: ModLoader;
  loaderVersion?: string;
  /** The instance's game directory (its own `.minecraft`). */
  gameDir: string;
  /** Root directory where JREs are provisioned. */
  javaDir: string;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}

export interface InstallResult {
  /** The version id to launch (loader profile id, or the vanilla id). */
  versionId: string;
  /** Resolved java executable path. */
  javaPath: string;
  /** Java major version used. */
  javaMajor: JavaMajor;
}

/**
 * Run the full install pipeline for an instance: resolve -> java -> vanilla -> loader,
 * emitting a structured ProgressEvent for every stage. Returns the launch version id
 * and the provisioned java path.
 */
export async function installPipeline(options: InstallPipelineOptions): Promise<InstallResult> {
  const reporter = new ProgressReporter(
    options.instanceId,
    options.onProgress ?? (() => undefined),
  );
  const signal = options.signal;

  // ── resolve ────────────────────────────────────────────────────────────────
  reporter.start('resolve', 'Résolution de la version');
  const major = majorForMc(options.mcVersion);
  reporter.complete('resolve', 'Version résolue');

  // ── java ─────────────────────────────────────────────────────────────────────
  const javaStage = reporter.forStage('java', `Préparation de Java ${major}`);
  javaStage.update(0, 1);
  const javaPath = await ensureJava(major, options.javaDir, (current, total, file) =>
    javaStage.update(current, total || 1, { file }),
  );
  javaStage.update(1, 1);

  // ── vanilla ────────────────────────────────────────────────────────────────
  await installVanilla(options.mcVersion, options.gameDir, {
    ...(options.concurrency !== undefined ? { concurrency: options.concurrency } : {}),
    ...(signal ? { signal } : {}),
    reporter: reporter.forStage('vanilla', `Installation de Minecraft ${options.mcVersion}`),
  });

  // ── loader ─────────────────────────────────────────────────────────────────
  const versionId = await installLoader(
    options.loader,
    options.mcVersion,
    options.loaderVersion,
    options.gameDir,
    {
      ...(options.concurrency !== undefined ? { concurrency: options.concurrency } : {}),
      ...(signal ? { signal } : {}),
      reporter: reporter.forStage('loader', `Installation du loader ${options.loader}`),
    },
  );

  return { versionId, javaPath, javaMajor: major };
}

// ── High-level adapter consumed by the Electron main process ─────────────────────

/** Everything needed to install/update an instance end-to-end (pipeline + file sync). */
export interface InstallContext {
  /** Resolved manifest to install. */
  manifest: InstanceManifest;
  /** Absolute path of this instance's game directory. */
  gameDir: string;
  /** Root directory under which JREs are provisioned. */
  javaDir: string;
  /** Max concurrent downloads. */
  maxConcurrency: number;
  /** Bearer token for private file downloads (omit for public). */
  token?: string;
  /** Base URL used to resolve relative file download URLs. */
  apiBaseUrl: string;
  /** Progress sink invoked for every pipeline step. */
  onProgress: (event: ProgressEvent) => void;
  /** Optional abort signal to cancel the pipeline. */
  signal?: AbortSignal;
}

/** Resolved Java runtime + the launch version id produced by the install. */
export interface ResolvedJava {
  /** Absolute path to the `java`/`javaw` executable. */
  javaPath: string;
  /** Java major version used. */
  major: JavaMajor;
  /** The version id to launch (loader profile id, or the vanilla id). */
  versionId: string;
}

/**
 * Run the full install/update pipeline (JRE + vanilla + loader) and then sync the
 * instance files by SHA-1. Verifies integrity and retries on mismatch. Returns the
 * JRE to launch with plus the resolved launch version id.
 */
export async function installInstance(ctx: InstallContext): Promise<ResolvedJava> {
  const result = await installPipeline({
    instanceId: ctx.manifest.id,
    mcVersion: ctx.manifest.mcVersion,
    loader: ctx.manifest.loader,
    ...(ctx.manifest.loaderVersion ? { loaderVersion: ctx.manifest.loaderVersion } : {}),
    gameDir: ctx.gameDir,
    javaDir: ctx.javaDir,
    concurrency: ctx.maxConcurrency,
    ...(ctx.signal ? { signal: ctx.signal } : {}),
    onProgress: ctx.onProgress,
  });

  // Sync mods/config/resourcepacks/... by SHA-1 (download diff, prune obsolete managed files).
  const syncReporter = new ProgressReporter(ctx.manifest.id, ctx.onProgress).forStage(
    'sync',
    'Synchronisation des fichiers',
  );
  await syncInstance(ctx.manifest, ctx.gameDir, {
    ...(ctx.token ? { token: ctx.token } : {}),
    baseUrl: ctx.apiBaseUrl,
    concurrency: ctx.maxConcurrency,
    ...(ctx.signal ? { signal: ctx.signal } : {}),
    reporter: syncReporter,
  });

  return { javaPath: result.javaPath, major: result.javaMajor, versionId: result.versionId };
}
