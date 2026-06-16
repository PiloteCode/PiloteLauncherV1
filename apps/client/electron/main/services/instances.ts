import { join } from 'node:path';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { installInstance } from '@pilote/core/install';
import { launchInstance, type GameSession } from '@pilote/core/launch';
import {
  IPC,
  InstanceSchema,
  LaunchOptionsSchema,
  LauncherError,
  type Instance,
  type InstanceManifest,
  type InstanceView,
  type InstanceInstallState,
  type LaunchOptions,
  type ProgressEvent,
  type LogLine,
  type SessionExit,
} from '@pilote/types';
import {
  listPublicInstances,
  unlock as backendUnlock,
  getManifest,
} from '../backend.js';
import {
  getSettings,
  getUnlocked,
  getUnlockedFor,
  upsertUnlocked,
  removeUnlocked,
  getActiveProfile,
  getOverride,
} from '../store.js';
import { sessionLogFile, log } from '../logger.js';
import { broadcast } from '../window.js';
import { toLauncherError } from '@shared/errors.js';

/**
 * Instance orchestration: merges backend public + persisted unlocked private
 * instances with local install state, drives install/launch through `@pilote/core`,
 * forwards progress/log/exit events to the renderer, and tracks running sessions.
 */

// ── Local install marker ───────────────────────────────────────────────────────

const InstallMarkerSchema = z.object({
  instanceId: z.string(),
  version: z.number().int().nonnegative(),
  versionId: z.string(),
  installedAt: z.number().int(),
});
type InstallMarker = z.infer<typeof InstallMarkerSchema>;

const MARKER_FILE = '.pilote-instance.json';

function gameDirFor(instanceId: string): string {
  const safe = instanceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(getSettings().instancesDir, safe);
}

function markerPath(instanceId: string): string {
  return join(gameDirFor(instanceId), MARKER_FILE);
}

async function readMarker(instanceId: string): Promise<InstallMarker | null> {
  const path = markerPath(instanceId);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(await readFile(path, 'utf8'));
    const parsed = InstallMarkerSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function writeMarker(marker: InstallMarker): Promise<void> {
  const dir = gameDirFor(marker.instanceId);
  await mkdir(dir, { recursive: true });
  await writeFile(markerPath(marker.instanceId), JSON.stringify(marker, null, 2), 'utf8');
}

// ── Running session tracking ────────────────────────────────────────────────────

const sessions = new Map<string, GameSession>();
/** Instances currently inside the install/launch pipeline (before "running"). */
const busy = new Set<string>();

export function running(): string[] {
  return [...sessions.keys()];
}

// ── State computation & merging ─────────────────────────────────────────────────

async function computeState(instanceId: string, remoteVersion: number): Promise<{
  state: InstanceInstallState;
  localVersion: number | undefined;
}> {
  if (sessions.has(instanceId)) {
    const marker = await readMarker(instanceId);
    return { state: 'running', localVersion: marker?.version };
  }
  const marker = await readMarker(instanceId);
  if (!marker) return { state: 'not-installed', localVersion: undefined };
  if (marker.version < remoteVersion) {
    return { state: 'update-available', localVersion: marker.version };
  }
  return { state: 'installed', localVersion: marker.version };
}

async function toView(dto: Instance): Promise<InstanceView> {
  const { state, localVersion } = await computeState(dto.id, dto.version);
  return localVersion === undefined ? { ...dto, state } : { ...dto, state, localVersion };
}

/** Public instances from the backend, merged with local install state. */
export async function listPublic(): Promise<InstanceView[]> {
  const dtos = await listPublicInstances();
  return Promise.all(dtos.map(toView));
}

/**
 * Locally persisted unlocked private instances, merged with state. We re-fetch
 * each manifest (with its token) to surface the current remote version; if a
 * token is rejected we keep a degraded view rather than dropping the entry.
 */
export async function listUnlocked(): Promise<InstanceView[]> {
  const entries = getUnlocked();
  const views: InstanceView[] = [];
  for (const entry of entries) {
    try {
      const manifest = await getManifest(entry.instanceId, entry.token);
      const dto = manifestToDto(manifest);
      views.push(await toView(dto));
    } catch (err) {
      log.warn(`Failed to refresh unlocked instance ${entry.instanceId}`, err);
      // Degraded view from the marker so the card still renders.
      const marker = await readMarker(entry.instanceId);
      const dto = InstanceSchema.parse({
        id: entry.instanceId,
        name: entry.instanceId,
        mcVersion: '0.0.0',
        loader: 'vanilla',
        visibility: 'private',
        version: marker?.version ?? 0,
        updatedAt: new Date(0).toISOString(),
      });
      const state: InstanceInstallState = sessions.has(entry.instanceId)
        ? 'running'
        : marker
          ? 'installed'
          : 'not-installed';
      views.push(
        marker
          ? { ...dto, state, localVersion: marker.version }
          : { ...dto, state },
      );
    }
  }
  return views;
}

/** Build a full Instance DTO from a lightweight manifest (private path). */
function manifestToDto(manifest: InstanceManifest): Instance {
  return InstanceSchema.parse({
    id: manifest.id,
    name: manifest.name,
    mcVersion: manifest.mcVersion,
    loader: manifest.loader,
    ...(manifest.loaderVersion ? { loaderVersion: manifest.loaderVersion } : {}),
    recommendedRamMb: manifest.recommendedRamMb,
    visibility: 'private',
    files: manifest.files,
    version: manifest.version,
    updatedAt: new Date().toISOString(),
  });
}

/** Unlock a private instance with an access code; persists the token. */
export async function unlock(code: string): Promise<InstanceView> {
  const res = await backendUnlock(code);
  upsertUnlocked({
    instanceId: res.instance.id,
    token: res.token,
    expiresAt: res.expiresAt,
  });
  return toView(res.instance);
}

/** Forget a previously unlocked private instance (does not delete files). */
export async function forget(instanceId: string): Promise<void> {
  removeUnlocked(instanceId);
}

/** Resolve the full Instance record for the detail screen. */
export async function get(instanceId: string): Promise<Instance> {
  const unlockedEntry = getUnlockedFor(instanceId);
  if (unlockedEntry) {
    const manifest = await getManifest(instanceId, unlockedEntry.token);
    return manifestToDto(manifest);
  }
  const dtos = await listPublicInstances();
  const found = dtos.find((d) => d.id === instanceId);
  if (!found) throw new LauncherError('not-found', `Instance introuvable: ${instanceId}`);
  return found;
}

// ── Manifest + options resolution ───────────────────────────────────────────────

async function resolveManifest(instanceId: string): Promise<InstanceManifest> {
  const unlockedEntry = getUnlockedFor(instanceId);
  return getManifest(instanceId, unlockedEntry?.token);
}

function resolveLaunchOptions(
  instanceId: string,
  recommendedRamMb: number,
  partial?: Partial<LaunchOptions>,
): LaunchOptions {
  const settings = getSettings();
  const override = getOverride(instanceId);

  const maxRamMb =
    partial?.maxRamMb ??
    override?.ramMb ??
    Math.max(recommendedRamMb, settings.globalRamMb);

  const extraJvmArgs = partial?.extraJvmArgs ?? override?.extraJvmArgs ?? [];
  const javaPath = partial?.javaPath ?? override?.javaPath;

  return LaunchOptionsSchema.parse({
    maxRamMb,
    extraJvmArgs,
    ...(javaPath ? { javaPath } : {}),
    ...(partial?.minRamMb !== undefined ? { minRamMb: partial.minRamMb } : {}),
    ...(partial?.width !== undefined ? { width: partial.width } : {}),
    ...(partial?.height !== undefined ? { height: partial.height } : {}),
    ...(partial?.fullscreen !== undefined ? { fullscreen: partial.fullscreen } : {}),
  });
}

function emitProgress(event: ProgressEvent): void {
  broadcast(IPC.events.progress, event);
}

function emitError(instanceId: string, err: unknown): void {
  const serialized = toLauncherError(err).toJSON();
  broadcast(IPC.events.error, { ...serialized, instanceId });
}

// ── Install ─────────────────────────────────────────────────────────────────────

/** Install or update an instance (resolve + download everything). */
export async function install(instanceId: string): Promise<void> {
  if (busy.has(instanceId)) {
    throw new LauncherError('launch', 'Une opération est déjà en cours pour cette instance.');
  }
  busy.add(instanceId);
  try {
    const settings = getSettings();
    const unlockedEntry = getUnlockedFor(instanceId);
    const manifest = await resolveManifest(instanceId);
    const gameDir = gameDirFor(instanceId);
    await mkdir(gameDir, { recursive: true });

    const { versionId } = await installInstance({
      manifest,
      gameDir,
      javaDir: settings.javaDir,
      maxConcurrency: settings.maxConcurrentDownloads,
      ...(unlockedEntry?.token ? { token: unlockedEntry.token } : {}),
      apiBaseUrl: settings.apiBaseUrl,
      onProgress: emitProgress,
    });

    await writeMarker({
      instanceId,
      version: manifest.version,
      versionId,
      installedAt: Date.now(),
    });

    emitProgress({
      instanceId,
      stage: 'done',
      label: 'Installation terminée',
      current: 1,
      total: 1,
      percent: 100,
    });
  } catch (err) {
    emitError(instanceId, err);
    throw toLauncherError(err);
  } finally {
    busy.delete(instanceId);
  }
}

// ── Launch ────────────────────────────────────────────────────────────────────

/** Launch the game, installing/updating first if necessary. */
export async function launch(
  instanceId: string,
  options?: Partial<LaunchOptions>,
): Promise<void> {
  if (sessions.has(instanceId)) {
    throw new LauncherError('launch', 'Cette instance est déjà en cours d’exécution.');
  }
  const profile = getActiveProfile();
  if (!profile) {
    throw new LauncherError('auth', 'Aucun profil actif. Créez un profil avant de jouer.');
  }

  if (busy.has(instanceId)) {
    throw new LauncherError('launch', 'Une opération est déjà en cours pour cette instance.');
  }
  busy.add(instanceId);

  try {
    const settings = getSettings();
    const unlockedEntry = getUnlockedFor(instanceId);
    const manifest = await resolveManifest(instanceId);
    const gameDir = gameDirFor(instanceId);
    await mkdir(gameDir, { recursive: true });

    // Always run the pipeline before launch: it provisions Java, ensures the
    // vanilla/loader install and syncs files by SHA-1 (no-op when up to date).
    const resolvedJava = await installInstance({
      manifest,
      gameDir,
      javaDir: settings.javaDir,
      maxConcurrency: settings.maxConcurrentDownloads,
      ...(unlockedEntry?.token ? { token: unlockedEntry.token } : {}),
      apiBaseUrl: settings.apiBaseUrl,
      onProgress: emitProgress,
    });

    const versionId = resolvedJava.versionId;

    await writeMarker({
      instanceId,
      version: manifest.version,
      versionId,
      installedAt: Date.now(),
    });

    const launchOptions = resolveLaunchOptions(instanceId, manifest.recommendedRamMb, options);
    const javaPath = launchOptions.javaPath ?? resolvedJava.javaPath;
    const logPath = sessionLogFile(instanceId);

    emitProgress({
      instanceId,
      stage: 'launch',
      label: 'Démarrage du jeu',
      current: 1,
      total: 1,
      percent: 100,
    });

    const session = await launchInstance({
      instanceId,
      gameDir,
      javaPath,
      mcVersion: manifest.mcVersion,
      versionId,
      profile,
      options: launchOptions,
      logPath,
      onLog: (line: LogLine) => broadcast(IPC.events.log, line),
      onExit: (exit: SessionExit) => {
        sessions.delete(instanceId);
        broadcast(IPC.events.sessionExit, exit);
      },
    });

    sessions.set(instanceId, session);

    emitProgress({
      instanceId,
      stage: 'running',
      label: 'En cours d’exécution',
      current: 1,
      total: 1,
      percent: 100,
    });
  } catch (err) {
    emitError(instanceId, err);
    throw toLauncherError(err);
  } finally {
    busy.delete(instanceId);
  }
}

/** Kill a running session. */
export async function kill(instanceId: string): Promise<void> {
  const session = sessions.get(instanceId);
  if (!session) {
    throw new LauncherError('not-found', 'Aucune session en cours pour cette instance.');
  }
  session.kill();
  // The core fires onExit which removes the session and broadcasts the exit.
}

/** Forcibly terminate every running session (called on app shutdown). */
export function killAll(): void {
  for (const session of sessions.values()) {
    try {
      session.kill();
    } catch (err) {
      log.warn('Failed to kill session on shutdown', err);
    }
  }
  sessions.clear();
}

/** Delete an instance's local files entirely (kept for completeness/forget flows). */
export async function purgeLocal(instanceId: string): Promise<void> {
  const dir = gameDirFor(instanceId);
  if (existsSync(dir)) await rm(dir, { recursive: true, force: true });
}
