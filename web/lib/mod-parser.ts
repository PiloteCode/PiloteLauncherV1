import { inflateRawSync } from 'node:zlib';
import type { ModMetadata, ModLoader } from '@pilote/types';

/**
 * Dependency-free, best-effort Minecraft mod metadata parser.
 *
 * A `.jar` is a ZIP archive. We read the End-Of-Central-Directory record, walk the
 * central directory, and extract the loader manifest entries we care about:
 *   - fabric.mod.json            (Fabric)
 *   - quilt.mod.json             (Quilt)
 *   - META-INF/mods.toml         (Forge / NeoForge, newer)
 *   - META-INF/neoforge.mods.toml(NeoForge, current)
 *   - mcmod.info                 (Forge, legacy 1.12-)
 *
 * Only DEFLATE (method 8) and STORE (method 0) entries are handled — the two methods
 * the JDK jar tool actually emits. Anything we cannot confidently parse returns
 * `undefined`, never a fabricated value.
 */

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

const TARGET_ENTRIES = new Set([
  'fabric.mod.json',
  'quilt.mod.json',
  'META-INF/mods.toml',
  'META-INF/neoforge.mods.toml',
  'mcmod.info',
]);

interface CentralEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/** Parse a jar buffer for the first loader manifest we recognise. */
export function parseModMetadata(buffer: Buffer): ModMetadata | undefined {
  try {
    const entries = readCentralDirectory(buffer);
    if (!entries) return undefined;

    const byName = new Map<string, CentralEntry>();
    for (const e of entries) {
      if (TARGET_ENTRIES.has(e.name)) byName.set(e.name, e);
    }

    const fabric = byName.get('fabric.mod.json');
    if (fabric) {
      const meta = parseFabric(readEntry(buffer, fabric), 'fabric');
      if (meta) return meta;
    }
    const quilt = byName.get('quilt.mod.json');
    if (quilt) {
      const meta = parseQuilt(readEntry(buffer, quilt));
      if (meta) return meta;
    }
    const neoToml = byName.get('META-INF/neoforge.mods.toml');
    if (neoToml) {
      const meta = parseModsToml(readEntry(buffer, neoToml), 'neoforge');
      if (meta) return meta;
    }
    const forgeToml = byName.get('META-INF/mods.toml');
    if (forgeToml) {
      const meta = parseModsToml(readEntry(buffer, forgeToml), 'forge');
      if (meta) return meta;
    }
    const legacy = byName.get('mcmod.info');
    if (legacy) {
      const meta = parseMcmodInfo(readEntry(buffer, legacy));
      if (meta) return meta;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ── ZIP reading ───────────────────────────────────────────────────────────────

function readCentralDirectory(buf: Buffer): CentralEntry[] | null {
  const eocd = findEocd(buf);
  if (eocd < 0) return null;

  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);

  const entries: CentralEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CEN_SIG) break;
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const uncompressedSize = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function findEocd(buf: Buffer): number {
  // Scan backwards for the EOCD signature; comment can be up to 64KB.
  const minPos = Math.max(0, buf.length - (0xffff + 22));
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

function readEntry(buf: Buffer, entry: CentralEntry): string {
  const lo = entry.localHeaderOffset;
  if (lo + 30 > buf.length || buf.readUInt32LE(lo) !== LOC_SIG) {
    throw new Error('bad local header');
  }
  const nameLen = buf.readUInt16LE(lo + 26);
  const extraLen = buf.readUInt16LE(lo + 28);
  const dataStart = lo + 30 + nameLen + extraLen;
  const data = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) {
    return buf.toString('utf8', dataStart, dataStart + entry.uncompressedSize);
  }
  if (entry.method === 8) {
    return inflateRawSync(data).toString('utf8');
  }
  throw new Error(`unsupported compression method ${entry.method}`);
}

// ── Per-loader parsers ──────────────────────────────────────────────────────────

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function toAuthorList(value: unknown): string[] | undefined {
  if (!value) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const a of arr) {
    if (typeof a === 'string' && a.trim()) out.push(a.trim());
    else if (a && typeof a === 'object' && 'name' in a) {
      const name = (a as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) out.push(name.trim());
    }
  }
  return out.length ? out : undefined;
}

function compact(meta: ModMetadata): ModMetadata | undefined {
  const hasContent =
    meta.modId || meta.name || meta.version || meta.description || meta.authors;
  return hasContent ? meta : undefined;
}

function parseFabric(text: string, loader: ModLoader): ModMetadata | undefined {
  const data = safeJson(text);
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const meta: ModMetadata = { loader };
  const id = asString(o.id);
  if (id) meta.modId = id;
  const name = asString(o.name) ?? id;
  if (name) meta.name = name;
  const version = asString(o.version);
  if (version) meta.version = version;
  const description = asString(o.description);
  if (description) meta.description = description;
  const authors = toAuthorList(o.authors);
  if (authors) meta.authors = authors;
  const depends = o.depends && typeof o.depends === 'object'
    ? Object.keys(o.depends as Record<string, unknown>)
    : undefined;
  if (depends && depends.length) meta.dependencies = depends;
  return compact(meta);
}

function parseQuilt(text: string): ModMetadata | undefined {
  const data = safeJson(text);
  if (!data || typeof data !== 'object') return undefined;
  const loaderObj = (data as Record<string, unknown>).quilt_loader;
  if (!loaderObj || typeof loaderObj !== 'object') return undefined;
  const o = loaderObj as Record<string, unknown>;
  const md = (o.metadata && typeof o.metadata === 'object'
    ? (o.metadata as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const meta: ModMetadata = { loader: 'quilt' };
  const id = asString(o.id);
  if (id) meta.modId = id;
  const name = asString(md.name) ?? id;
  if (name) meta.name = name;
  const version = asString(o.version);
  if (version) meta.version = version;
  const description = asString(md.description);
  if (description) meta.description = description;
  const contributors = md.contributors && typeof md.contributors === 'object'
    ? Object.keys(md.contributors as Record<string, unknown>)
    : undefined;
  if (contributors && contributors.length) meta.authors = contributors;
  return compact(meta);
}

function parseModsToml(text: string, loader: ModLoader): ModMetadata | undefined {
  // Minimal TOML reader for the well-known keys in a [[mods]] block.
  const lines = text.split(/\r?\n/);
  let inMods = false;
  const fields: Record<string, string> = {};
  let topAuthors: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = stripTomlComment(lines[i] ?? '').trim();
    if (!line) continue;
    if (line.startsWith('[[mods]]')) {
      if (inMods) break; // only the first mod block
      inMods = true;
      continue;
    }
    if (line.startsWith('[')) {
      if (inMods) break;
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let rawValue = line.slice(eq + 1).trim();

    // Multi-line triple-quoted strings: collect until the closing delimiter.
    const triple = rawValue.startsWith('"""') ? '"""' : rawValue.startsWith("'''") ? "'''" : null;
    if (triple && !(rawValue.length >= 6 && rawValue.endsWith(triple))) {
      const parts = [rawValue.slice(3)];
      i++;
      while (i < lines.length) {
        const cur = lines[i] ?? '';
        const closeIdx = cur.indexOf(triple);
        if (closeIdx >= 0) {
          parts.push(cur.slice(0, closeIdx));
          break;
        }
        parts.push(cur);
        i++;
      }
      rawValue = parts.join('\n').trim();
      if (inMods) fields[key] = rawValue;
      else if (key === 'authors') topAuthors = rawValue;
      continue;
    }

    const value = unquoteToml(rawValue);
    if (inMods) {
      fields[key] = value;
    } else if (key === 'authors') {
      topAuthors = value;
    }
  }

  const meta: ModMetadata = { loader };
  if (fields.modId) meta.modId = fields.modId;
  if (fields.displayName) meta.name = fields.displayName;
  else if (fields.modId) meta.name = fields.modId;
  if (fields.version && fields.version !== '${file.jarVersion}') meta.version = fields.version;
  if (fields.description) meta.description = fields.description.trim();
  const authors = fields.authors ?? topAuthors;
  if (authors) {
    const list = authors.split(/,|&| and /i).map((a) => a.trim()).filter(Boolean);
    if (list.length) meta.authors = list;
  }
  return compact(meta);
}

function parseMcmodInfo(text: string): ModMetadata | undefined {
  const data = safeJson(text);
  let entry: Record<string, unknown> | undefined;
  if (Array.isArray(data)) {
    entry = data[0] as Record<string, unknown> | undefined;
  } else if (data && typeof data === 'object') {
    const list = (data as Record<string, unknown>).modList;
    if (Array.isArray(list)) entry = list[0] as Record<string, unknown> | undefined;
    else entry = data as Record<string, unknown>;
  }
  if (!entry) return undefined;

  const meta: ModMetadata = { loader: 'forge' };
  const id = asString(entry.modid);
  if (id) meta.modId = id;
  const name = asString(entry.name) ?? id;
  if (name) meta.name = name;
  const version = asString(entry.version);
  if (version) meta.version = version;
  const description = asString(entry.description);
  if (description) meta.description = description;
  const authors = toAuthorList(entry.authorList ?? entry.authors);
  if (authors) meta.authors = authors;
  return compact(meta);
}

// ── small utilities ─────────────────────────────────────────────────────────────

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some manifests contain trailing commas / comments; do a lenient cleanup pass.
    try {
      const cleaned = text
        .replace(/\/\/.*$/gm, '')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      return undefined;
    }
  }
}

function stripTomlComment(line: string): string {
  // Remove a trailing # comment that is not inside a quoted string.
  let inStr = false;
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === quote) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
    } else if (c === '#') {
      return line.slice(0, i);
    }
  }
  return line;
}

function unquoteToml(value: string): string {
  let v = value.trim();
  if (v.startsWith("'''") && v.endsWith("'''") && v.length >= 6) {
    return v.slice(3, -3).trim();
  }
  if (v.startsWith('"""') && v.endsWith('"""') && v.length >= 6) {
    return v.slice(3, -3).trim();
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}
