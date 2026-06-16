import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile, rm, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { prisma } from './db';

/**
 * Content-addressed blob storage.
 *
 * Blobs are keyed by the lowercase hex SHA-1 of their bytes and stored at
 * `STORAGE_DIR/{ab}/{sha1}` (the first two hex chars form a fan-out directory).
 * A `StoredFile` row tracks size + refcount so blobs can be garbage-collected
 * when the last referencing InstanceFile is removed.
 *
 * Two drivers are supported via STORAGE_DRIVER: `local` (default) and `s3`.
 */

export type StorageDriver = 'local' | 's3';

export interface BlobInfo {
  sha1: string;
  sizeBytes: number;
}

function driver(): StorageDriver {
  return process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
}

function storageRoot(): string {
  const dir = process.env.STORAGE_DIR && process.env.STORAGE_DIR.length > 0
    ? process.env.STORAGE_DIR
    : './storage';
  return resolve(process.cwd(), dir);
}

/** Compute the lowercase hex SHA-1 of a buffer. Also the content-addressed key. */
export function sha1OfBuffer(buffer: Buffer): string {
  return createHash('sha1').update(buffer).digest('hex');
}

function blobPath(sha1: string): string {
  const fanout = sha1.slice(0, 2);
  return join(storageRoot(), fanout, sha1);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Store a blob (idempotent). Computes the SHA-1, writes the bytes if not already
 * present, and increments the StoredFile refcount. Returns the hash + size.
 */
export async function putBlob(buffer: Buffer): Promise<BlobInfo> {
  const sha1 = sha1OfBuffer(buffer);
  const sizeBytes = buffer.byteLength;

  const existing = await prisma.storedFile.findUnique({ where: { sha1 } });

  if (existing) {
    // Bytes already exist on the backend; ensure they're physically present
    // (self-heal if the on-disk copy went missing) then bump the refcount.
    if (!(await blobExists(sha1))) {
      await writeBytes(sha1, buffer);
    }
    await prisma.storedFile.update({
      where: { sha1 },
      data: { refCount: { increment: 1 } },
    });
    return { sha1, sizeBytes: existing.sizeBytes };
  }

  await writeBytes(sha1, buffer);
  await prisma.storedFile.create({
    data: { sha1, sizeBytes, refCount: 1 },
  });
  return { sha1, sizeBytes };
}

/**
 * Decrement a blob's refcount; physically delete the bytes + row when it hits zero.
 * Safe to call for unknown hashes (no-op).
 */
export async function releaseBlob(sha1: string): Promise<void> {
  const existing = await prisma.storedFile.findUnique({ where: { sha1 } });
  if (!existing) return;

  if (existing.refCount <= 1) {
    await prisma.storedFile.delete({ where: { sha1 } }).catch(() => undefined);
    await deleteBytes(sha1);
    return;
  }
  await prisma.storedFile.update({
    where: { sha1 },
    data: { refCount: { decrement: 1 } },
  });
}

/** Whether the bytes for a hash physically exist on the backend. */
export async function blobExists(sha1: string): Promise<boolean> {
  if (driver() === 's3') {
    return s3().exists(sha1);
  }
  try {
    await access(blobPath(sha1), FS.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Return a readable stream + size for a stored blob, or null if the bytes are missing.
 */
export async function getBlobStream(
  sha1: string,
): Promise<{ stream: Readable; sizeBytes: number } | null> {
  if (driver() === 's3') {
    return s3().getStream(sha1);
  }
  const path = blobPath(sha1);
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    return { stream: createReadStream(path), sizeBytes: s.size };
  } catch {
    return null;
  }
}

// ── Driver internals ──────────────────────────────────────────────────────────

async function writeBytes(sha1: string, buffer: Buffer): Promise<void> {
  if (driver() === 's3') {
    await s3().put(sha1, buffer);
    return;
  }
  const path = blobPath(sha1);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}

async function deleteBytes(sha1: string): Promise<void> {
  if (driver() === 's3') {
    await s3().delete(sha1);
    return;
  }
  await rm(blobPath(sha1), { force: true });
}

// ── S3 driver ───────────────────────────────────────────────────────────────
// Uses @aws-sdk/client-s3 if installed. Loaded lazily so the local driver never
// requires the SDK to be present.

interface S3Driver {
  put(sha1: string, buffer: Buffer): Promise<void>;
  delete(sha1: string): Promise<void>;
  exists(sha1: string): Promise<boolean>;
  getStream(sha1: string): Promise<{ stream: Readable; sizeBytes: number } | null>;
}

let s3Singleton: S3Driver | null = null;

function s3(): S3Driver {
  if (s3Singleton) return s3Singleton;
  s3Singleton = createS3Driver();
  return s3Singleton;
}

function s3Key(sha1: string): string {
  return `${sha1.slice(0, 2)}/${sha1}`;
}

function createS3Driver(): S3Driver {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('STORAGE_DRIVER=s3 but S3_BUCKET is not configured');
  }

  // Lazy, cached client. We require() inside so the dependency is optional.
  let clientPromise: Promise<{
    client: unknown;
    cmd: {
      Put: new (i: Record<string, unknown>) => unknown;
      Get: new (i: Record<string, unknown>) => unknown;
      Head: new (i: Record<string, unknown>) => unknown;
      Delete: new (i: Record<string, unknown>) => unknown;
    };
  }> | null = null;

  async function load() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      let mod: Record<string, unknown>;
      try {
        // Optional peer dependency — only needed when STORAGE_DRIVER=s3. The specifier is
        // built indirectly so the bundler/types don't require it to be installed.
        const pkg = ['@aws-sdk', 'client-s3'].join('/');
        mod = (await import(/* webpackIgnore: true */ pkg)) as Record<string, unknown>;
      } catch {
        throw new Error(
          'STORAGE_DRIVER=s3 requires the optional dependency "@aws-sdk/client-s3" to be installed.',
        );
      }
      const S3Client = mod.S3Client as new (cfg: Record<string, unknown>) => unknown;
      const config: Record<string, unknown> = {
        region: process.env.S3_REGION || 'auto',
        forcePathStyle: true,
      };
      if (process.env.S3_ENDPOINT) config.endpoint = process.env.S3_ENDPOINT;
      if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        };
      }
      return {
        client: new S3Client(config),
        cmd: {
          Put: mod.PutObjectCommand as new (i: Record<string, unknown>) => unknown,
          Get: mod.GetObjectCommand as new (i: Record<string, unknown>) => unknown,
          Head: mod.HeadObjectCommand as new (i: Record<string, unknown>) => unknown,
          Delete: mod.DeleteObjectCommand as new (i: Record<string, unknown>) => unknown,
        },
      };
    })();
    return clientPromise;
  }

  async function send(command: unknown): Promise<Record<string, unknown>> {
    const { client } = await load();
    const c = client as { send: (cmd: unknown) => Promise<Record<string, unknown>> };
    return c.send(command);
  }

  return {
    async put(sha1, buffer) {
      const { cmd } = await load();
      await send(new cmd.Put({ Bucket: bucket, Key: s3Key(sha1), Body: buffer }));
    },
    async delete(sha1) {
      const { cmd } = await load();
      await send(new cmd.Delete({ Bucket: bucket, Key: s3Key(sha1) })).catch(() => undefined);
    },
    async exists(sha1) {
      const { cmd } = await load();
      try {
        await send(new cmd.Head({ Bucket: bucket, Key: s3Key(sha1) }));
        return true;
      } catch {
        return false;
      }
    },
    async getStream(sha1) {
      const { cmd } = await load();
      try {
        const res = await send(new cmd.Get({ Bucket: bucket, Key: s3Key(sha1) }));
        const body = res.Body;
        if (!body) return null;
        const sizeBytes =
          typeof res.ContentLength === 'number' ? (res.ContentLength as number) : 0;
        return { stream: body as Readable, sizeBytes };
      } catch {
        return null;
      }
    },
  };
}
