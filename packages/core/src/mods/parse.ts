import { readFile } from 'node:fs/promises';
import type { ModLoader, ModMetadata } from '@pilote/types';
import {
  readFabricMod,
  readForgeMod,
  readQuiltMod,
  type FabricModMetadata,
  type ForgeModMetadata,
  type QuiltModMetadata,
} from '@xmcl/mod-parser';
import { wrapError } from '../errors.js';

function toStringArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const out = value
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && 'name' in v && typeof (v as { name: unknown }).name === 'string') {
          return (v as { name: string }).name;
        }
        return undefined;
      })
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    return out.length > 0 ? out : undefined;
  }
  if (typeof value === 'string') return [value];
  return undefined;
}

/** Normalize a Fabric metadata object into our shared {@link ModMetadata}. */
function fromFabric(meta: FabricModMetadata): ModMetadata {
  const authors = toStringArray(meta.authors as unknown);
  const deps = meta.depends ? Object.keys(meta.depends) : undefined;
  return {
    loader: 'fabric',
    ...(meta.id ? { modId: meta.id } : {}),
    ...(meta.name ? { name: meta.name } : {}),
    ...(meta.version ? { version: meta.version } : {}),
    ...(authors ? { authors } : {}),
    ...(meta.description ? { description: meta.description } : {}),
    ...(deps && deps.length > 0 ? { dependencies: deps } : {}),
  };
}

/** Normalize a Quilt metadata object into our shared {@link ModMetadata}. */
function fromQuilt(meta: QuiltModMetadata): ModMetadata {
  const ql = (meta as unknown as { quilt_loader?: Record<string, unknown> }).quilt_loader ?? {};
  const md = (ql.metadata as Record<string, unknown> | undefined) ?? {};
  const id = (ql.id as string | undefined) ?? undefined;
  const version = (ql.version as string | undefined) ?? undefined;
  const name = (md.name as string | undefined) ?? undefined;
  const description = (md.description as string | undefined) ?? undefined;
  const contributors = md.contributors ? Object.keys(md.contributors as object) : undefined;
  const depends = ql.depends ? toStringArray(ql.depends) : undefined;
  return {
    loader: 'quilt',
    ...(id ? { modId: id } : {}),
    ...(name ? { name } : {}),
    ...(version ? { version } : {}),
    ...(contributors && contributors.length > 0 ? { authors: contributors } : {}),
    ...(description ? { description } : {}),
    ...(depends ? { dependencies: depends } : {}),
  };
}

/** Normalize a Forge/NeoForge metadata object into our shared {@link ModMetadata}. */
function fromForge(meta: ForgeModMetadata, loader: ModLoader): ModMetadata {
  // Newer mods expose a `modsToml` array; legacy ones use `mcmodInfo`.
  const toml = (meta as unknown as { modsToml?: Array<Record<string, unknown>> }).modsToml;
  const first = toml && toml.length > 0 ? toml[0] : undefined;
  if (first) {
    const authors = toStringArray(first.authors);
    return {
      loader,
      ...(typeof first.modid === 'string' ? { modId: first.modid } : {}),
      ...(typeof first.displayName === 'string' ? { name: first.displayName } : {}),
      ...(typeof first.version === 'string' ? { version: first.version } : {}),
      ...(authors ? { authors } : {}),
      ...(typeof first.description === 'string' ? { description: first.description } : {}),
    };
  }

  const legacy = (meta as unknown as { mcmodInfo?: Array<Record<string, unknown>> }).mcmodInfo;
  const info = legacy && legacy.length > 0 ? legacy[0] : undefined;
  if (info) {
    const authors = toStringArray(info.authorList ?? info.authors);
    const deps = toStringArray(info.dependencies);
    return {
      loader,
      ...(typeof info.modid === 'string' ? { modId: info.modid } : {}),
      ...(typeof info.name === 'string' ? { name: info.name } : {}),
      ...(typeof info.version === 'string' ? { version: info.version } : {}),
      ...(authors ? { authors } : {}),
      ...(typeof info.description === 'string' ? { description: info.description } : {}),
      ...(deps ? { dependencies: deps } : {}),
    };
  }
  return { loader };
}

/**
 * Parse a mod jar file into {@link ModMetadata}, best-effort across loaders.
 * Tries Fabric, then Quilt, then Forge/NeoForge. Returns a metadata object with
 * whatever fields could be extracted; never throws on an unrecognized jar.
 */
export async function parseMod(filePath: string): Promise<ModMetadata> {
  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch (err) {
    throw wrapError('not-found', `Cannot read mod file ${filePath}`, err);
  }

  // Fabric (fabric.mod.json)
  try {
    const fabric = await readFabricMod(buffer);
    if (fabric && (fabric.id || fabric.name)) return fromFabric(fabric);
  } catch {
    /* not a fabric mod */
  }

  // Quilt (quilt.mod.json)
  try {
    const quilt = await readQuiltMod(buffer);
    const ql = (quilt as unknown as { quilt_loader?: { id?: string } }).quilt_loader;
    if (ql && ql.id) return fromQuilt(quilt);
  } catch {
    /* not a quilt mod */
  }

  // Forge / NeoForge (META-INF/mods.toml or mcmod.info). We can't reliably tell
  // Forge from NeoForge from metadata alone; default to 'forge'.
  try {
    const forge = await readForgeMod(buffer);
    const hasData =
      (forge as unknown as { modsToml?: unknown[] }).modsToml?.length ||
      (forge as unknown as { mcmodInfo?: unknown[] }).mcmodInfo?.length;
    if (hasData) return fromForge(forge, 'forge');
  } catch {
    /* not a forge mod */
  }

  // Unknown loader — return an empty-but-valid record.
  return {};
}
