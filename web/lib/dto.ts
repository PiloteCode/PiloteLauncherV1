import type { Instance as PrismaInstance, InstanceFile as PrismaInstanceFile } from '@prisma/client';
import {
  type InstanceDto,
  type InstanceFile,
  type InstanceManifest,
  type ModLoader,
  type FileTarget,
  type ModMetadata,
  ModLoaderSchema,
  FileTargetSchema,
  ModMetadataSchema,
} from '@pilote/types';

/**
 * Mappers from Prisma rows to the public DTO / manifest shapes defined in @pilote/types.
 * Sensitive fields (accessCodeHash) are never copied. Download URLs are absolute,
 * built from APP_URL so the Electron client can fetch them directly.
 */

type PrismaInstanceWithFiles = PrismaInstance & { files: PrismaInstanceFile[] };

function appUrl(): string {
  const url =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000';
  return url.replace(/\/+$/, '');
}

/** Absolute download URL for a content-addressed blob. */
export function downloadUrlFor(sha1: string): string {
  return `${appUrl()}/api/files/${sha1}`;
}

function coerceLoader(value: string): ModLoader {
  const parsed = ModLoaderSchema.safeParse(value);
  return parsed.success ? parsed.data : 'vanilla';
}

function coerceTarget(value: string): FileTarget {
  const parsed = FileTargetSchema.safeParse(value);
  return parsed.success ? parsed.data : 'root';
}

/** Parse the JSON-encoded ModMetadata column, tolerating null / malformed values. */
export function parseModMetadata(raw: string | null | undefined): ModMetadata | undefined {
  if (!raw) return undefined;
  try {
    const parsed = ModMetadataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function toInstanceFile(file: PrismaInstanceFile): InstanceFile {
  return {
    path: file.path,
    target: coerceTarget(file.target),
    sha1: file.sha1,
    sizeBytes: file.sizeBytes,
    downloadUrl: downloadUrlFor(file.sha1),
    enabled: file.enabled,
  };
}

/** Full instance DTO (admin + unlocked-private view). Excludes accessCodeHash. */
export function toInstanceDto(instance: PrismaInstanceWithFiles): InstanceDto {
  return {
    id: instance.id,
    name: instance.name,
    cover: instance.cover,
    description: instance.description,
    changelog: instance.changelog,
    mcVersion: instance.mcVersion,
    loader: coerceLoader(instance.loader),
    ...(instance.loaderVersion ? { loaderVersion: instance.loaderVersion } : {}),
    recommendedRamMb: instance.recommendedRamMb,
    visibility: instance.visibility === 'private' ? 'private' : 'public',
    files: instance.files.map(toInstanceFile),
    version: instance.version,
    updatedAt: instance.updatedAt.toISOString(),
  };
}

/**
 * Lightweight manifest used by the launcher to drive sync.
 * Only ENABLED files are included — disabled files are not synced to disk.
 */
export function toInstanceManifest(instance: PrismaInstanceWithFiles): InstanceManifest {
  return {
    id: instance.id,
    name: instance.name,
    mcVersion: instance.mcVersion,
    loader: coerceLoader(instance.loader),
    ...(instance.loaderVersion ? { loaderVersion: instance.loaderVersion } : {}),
    recommendedRamMb: instance.recommendedRamMb,
    version: instance.version,
    files: instance.files.filter((f) => f.enabled).map(toInstanceFile),
  };
}
