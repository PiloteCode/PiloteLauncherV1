/**
 * @pilote/core — the pure-Node launcher core.
 *
 * Wraps @xmcl/core, @xmcl/installer and @xmcl/mod-parser into a typed, progress-aware
 * pipeline: profile resolution, Java provisioning, vanilla + loader installation,
 * instance file sync, game launch, and mod parsing. No Electron, no DOM.
 */

// Errors
export {
  LauncherError,
  wrapError,
  wrapAsync,
  isLauncherError,
  errorMessage,
} from './errors.js';
export type { ErrorKind, SerializedError } from './errors.js';

// Networking
export {
  httpRequest,
  fetchText,
  fetchJson,
  fetchBuffer,
  sha1OfFile,
  downloadToFile,
  runPool,
} from './net.js';
export type { FetchOptions, DownloadOptions, DownloadProgress } from './net.js';

// Progress
export {
  ProgressReporter,
  StageReporter,
  computeOverallPercent,
  fractionOf,
  STAGE_WEIGHTS,
} from './progress.js';
export type { ProgressCallback } from './progress.js';

// Auth
export {
  resolveProfile,
  lookupProfile,
  computeOfflineUuid,
  formatDashedUuid,
  stripDashes,
  clearLookupCache,
} from './auth/index.js';
export type { ResolvedProfile } from './auth/index.js';

// Java
export {
  majorForMc,
  ensureJava,
  ensureJavaForMc,
  clearJavaCache,
} from './java/index.js';
export type { EnsureJavaProgress } from './java/index.js';

// Install
export {
  installPipeline,
  installVanilla,
  installLoader,
  resolveInstalledVersion,
  getVersionManifest,
  findVersionEntry,
  resolveVersionMetadataUrl,
} from './install/index.js';
export type {
  InstallPipelineOptions,
  InstallResult,
  VersionManifest,
  ManifestVersionEntry,
} from './install/index.js';

// Sync
export {
  syncInstance,
  computeDiff,
  buildIndex,
  loadManagedIndex,
  resolveFilePath,
  targetSubdir,
  managedKey,
  EMPTY_INDEX,
} from './sync/index.js';
export type { SyncOptions, SyncResult, SyncDiff, ManagedIndex } from './sync/index.js';

// Launch
export {
  launch,
  killSession,
  runningSessions,
  getSession,
} from './launch/index.js';
export type {
  LaunchInput,
  LaunchProfileInput,
  SessionHandle,
} from './launch/index.js';

// Mods
export { parseMod } from './mods/parse.js';
