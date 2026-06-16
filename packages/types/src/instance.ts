import { z } from 'zod';
import { ModLoaderSchema } from './loader.js';

/** Target directory inside the instance folder where a synced file is written. */
export const FileTargetSchema = z.enum([
  'mods',
  'config',
  'resourcepacks',
  'shaderpacks',
  'datapacks',
  'root',
]);
export type FileTarget = z.infer<typeof FileTargetSchema>;

export const InstanceVisibilitySchema = z.enum(['public', 'private']);
export type InstanceVisibility = z.infer<typeof InstanceVisibilitySchema>;

/**
 * A single file tracked by an instance manifest. The launcher syncs these by SHA-1:
 * files present locally with a matching hash are kept, mismatches are re-downloaded,
 * and launcher-managed files no longer in the manifest are deleted.
 */
export const InstanceFileSchema = z.object({
  /** Path relative to the target dir, e.g. "sodium-fabric-0.5.8.jar" or "sub/dir/file.json". */
  path: z.string().min(1),
  target: FileTargetSchema,
  /** Lowercase hex SHA-1 of the file content (also the storage key, content-addressed). */
  sha1: z.string().regex(/^[a-f0-9]{40}$/),
  sizeBytes: z.number().int().nonnegative(),
  /** Absolute or relative URL the client uses to download the file. Private files require a token. */
  downloadUrl: z.string().min(1),
  /** Whether the file is currently enabled (disabled files are not synced to disk). */
  enabled: z.boolean().default(true),
});
export type InstanceFile = z.infer<typeof InstanceFileSchema>;

/** Parsed mod metadata (from @xmcl/mod-parser), surfaced for nice display in the admin. */
export const ModMetadataSchema = z.object({
  modId: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
  loader: ModLoaderSchema.optional(),
  authors: z.array(z.string()).optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});
export type ModMetadata = z.infer<typeof ModMetadataSchema>;

/** Full instance record (server-side / admin view). */
export const InstanceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  /** Cover image URL. May be empty — clients auto-generate an OKLCH cover from the name. */
  cover: z.string().default(''),
  description: z.string().default(''),
  changelog: z.string().default(''),
  mcVersion: z.string().min(1),
  loader: ModLoaderSchema,
  loaderVersion: z.string().optional(),
  recommendedRamMb: z.number().int().min(1024).max(65536).default(4096),
  visibility: InstanceVisibilitySchema,
  files: z.array(InstanceFileSchema).default([]),
  /** Bumped on every mutation; the client compares this to trigger a sync. */
  version: z.number().int().nonnegative().default(1),
  updatedAt: z.string(),
});
export type Instance = z.infer<typeof InstanceSchema>;

/**
 * Public-facing instance DTO (sensitive fields like accessCodeHash are never included).
 * Private instances are returned only after an unlock and carry the same shape.
 */
export const InstanceDtoSchema = InstanceSchema;
export type InstanceDto = z.infer<typeof InstanceDtoSchema>;

/** A lightweight manifest used by the client to drive sync without all admin metadata. */
export const InstanceManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  mcVersion: z.string(),
  loader: ModLoaderSchema,
  loaderVersion: z.string().optional(),
  recommendedRamMb: z.number().int(),
  version: z.number().int(),
  files: z.array(InstanceFileSchema),
});
export type InstanceManifest = z.infer<typeof InstanceManifestSchema>;

/** Local install state of an instance as tracked by the client. */
export const InstanceInstallStateSchema = z.enum([
  'not-installed', // never installed locally — "À télécharger"
  'installed', // up to date — "Installée"
  'update-available', // local version < remote version — "Mise à jour dispo"
  'running', // currently launched
]);
export type InstanceInstallState = z.infer<typeof InstanceInstallStateSchema>;
