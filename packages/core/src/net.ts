import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { request, Agent, interceptors, type Dispatcher } from 'undici';
import { LauncherError } from '@pilote/types';

/**
 * Shared dispatcher that transparently follows up to 5 redirects. Mojang/Adoptium/Forge
 * download endpoints redirect (often to a CDN/GitHub), so redirect-following is required.
 */
const redirectDispatcher = new Agent().compose(interceptors.redirect({ maxRedirections: 5 }));

/** Options shared by all network helpers. */
export interface FetchOptions {
  /** Per-attempt timeout in ms (headers + body). Default 30s. */
  timeoutMs?: number;
  /** Number of retry attempts after the first try. Default 4. */
  retries?: number;
  /** Base delay for exponential backoff in ms. Default 400ms. */
  backoffBaseMs?: number;
  /** Abort signal to cancel the request. */
  signal?: AbortSignal;
  /** Extra request headers. */
  headers?: Record<string, string>;
  method?: Dispatcher.HttpMethod;
}

const DEFAULTS = {
  timeoutMs: 30_000,
  retries: 4,
  backoffBaseMs: 400,
} as const;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LauncherError('network', 'Request aborted', { retryable: false }));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new LauncherError('network', 'Request aborted', { retryable: false }));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Backoff with full jitter, capped at 10s. */
function backoffDelay(attempt: number, base: number): number {
  const exp = Math.min(base * 2 ** attempt, 10_000);
  return Math.floor(Math.random() * exp);
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' ||
      err.name === 'TimeoutError' ||
      (err as { code?: string }).code === 'ABORT_ERR')
  );
}

/**
 * Low-level request with timeout, retry and exponential backoff. Retries on network
 * errors and retryable HTTP statuses (honouring `Retry-After` on 429/503).
 */
export async function httpRequest(
  url: string,
  options: FetchOptions = {},
): Promise<Dispatcher.ResponseData> {
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
  const retries = options.retries ?? DEFAULTS.retries;
  const backoffBaseMs = options.backoffBaseMs ?? DEFAULTS.backoffBaseMs;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (options.signal?.aborted) {
      throw new LauncherError('network', `Aborted while requesting ${url}`, { retryable: false });
    }
    try {
      const res = await request(url, {
        method: options.method ?? 'GET',
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
        dispatcher: redirectDispatcher,
        ...(options.headers ? { headers: options.headers } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      });

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return res;
      }

      // Drain the body so the socket can be reused.
      await res.body.dump();

      if (RETRYABLE_STATUS.has(res.statusCode) && attempt < retries) {
        const retryAfter = res.headers['retry-after'];
        const explicit = parseRetryAfter(Array.isArray(retryAfter) ? retryAfter[0] : retryAfter);
        await sleep(explicit ?? backoffDelay(attempt, backoffBaseMs), options.signal);
        lastError = new LauncherError('network', `HTTP ${res.statusCode} from ${url}`);
        continue;
      }

      throw new LauncherError('network', `HTTP ${res.statusCode} from ${url}`, {
        retryable: RETRYABLE_STATUS.has(res.statusCode),
      });
    } catch (err) {
      if (isAbortError(err)) {
        throw new LauncherError('network', `Request to ${url} timed out or was aborted`, {
          cause: err,
          retryable: false,
        });
      }
      if (err instanceof LauncherError && !err.retryable) {
        throw err;
      }
      lastError = err;
      if (attempt < retries) {
        await sleep(backoffDelay(attempt, backoffBaseMs), options.signal);
        continue;
      }
    }
  }
  throw new LauncherError('network', `Failed to fetch ${url} after ${retries + 1} attempts`, {
    cause: lastError,
  });
}

function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 30_000));
  return undefined;
}

/** Fetch a URL and return the body as a UTF-8 string. */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const res = await httpRequest(url, options);
  return res.body.text();
}

/** Fetch a URL and parse the JSON body. */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const res = await httpRequest(url, options);
  try {
    return (await res.body.json()) as T;
  } catch (err) {
    throw new LauncherError('network', `Invalid JSON from ${url}`, { cause: err });
  }
}

/** Fetch a URL and return the raw bytes. */
export async function fetchBuffer(url: string, options: FetchOptions = {}): Promise<Buffer> {
  const res = await httpRequest(url, options);
  const ab = await res.body.arrayBuffer();
  return Buffer.from(ab);
}

/** Compute the lowercase hex SHA-1 of an existing file, or `null` if it does not exist. */
export async function sha1OfFile(filePath: string): Promise<string | null> {
  try {
    const hash = createHash('sha1');
    await pipeline(createReadStream(filePath), hash);
    return hash.digest('hex');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export interface DownloadProgress {
  /** Bytes downloaded so far for this file. */
  current: number;
  /** Total bytes for this file (0 if unknown). */
  total: number;
  /** Instantaneous transfer speed in bytes/second. */
  speedBps: number;
  /** Destination path of the file being written. */
  file: string;
}

export interface DownloadOptions {
  /** Expected lowercase hex SHA-1; verified after download (throws 'integrity' on mismatch). */
  sha1?: string;
  onProgress?: (p: DownloadProgress) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * Stream a URL to `dest`, resuming a partial `.part` download where the server
 * supports HTTP range requests, verifying SHA-1 if provided. The file is written
 * atomically: bytes go to `<dest>.part` and are renamed into place on success.
 */
export async function downloadToFile(
  url: string,
  dest: string,
  options: DownloadOptions = {},
): Promise<void> {
  const retries = options.retries ?? DEFAULTS.retries;
  const timeoutMs = options.timeoutMs ?? 120_000;

  // Fast path: a correct file already exists on disk.
  if (options.sha1) {
    const existing = await sha1OfFile(dest);
    if (existing === options.sha1.toLowerCase()) {
      const finalSize = await fileSize(dest);
      options.onProgress?.({ current: finalSize, total: finalSize, speedBps: 0, file: dest });
      return;
    }
  }

  await mkdir(dirname(dest), { recursive: true });
  const partPath = `${dest}.part`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (options.signal?.aborted) {
      throw new LauncherError('network', `Aborted downloading ${url}`, { retryable: false });
    }

    const resumeFrom = await fileSize(partPath);
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (resumeFrom > 0) headers['range'] = `bytes=${resumeFrom}-`;

    try {
      const res = await request(url, {
        method: 'GET',
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
        dispatcher: redirectDispatcher,
        headers,
        ...(options.signal ? { signal: options.signal } : {}),
      });

      const status = res.statusCode;
      if (status === 416) {
        // Requested range not satisfiable — our .part is stale/oversized. Restart clean.
        await res.body.dump();
        await rm(partPath, { force: true });
        lastError = new LauncherError('network', `Range not satisfiable for ${url}`);
        continue;
      }
      if (status < 200 || status >= 300) {
        await res.body.dump();
        if (RETRYABLE_STATUS.has(status) && attempt < retries) {
          await sleep(backoffDelay(attempt, DEFAULTS.backoffBaseMs), options.signal);
          lastError = new LauncherError('network', `HTTP ${status} downloading ${url}`);
          continue;
        }
        throw new LauncherError('network', `HTTP ${status} downloading ${url}`, {
          retryable: RETRYABLE_STATUS.has(status),
        });
      }

      const resumed = status === 206;
      const startOffset = resumed ? resumeFrom : 0;
      if (!resumed && resumeFrom > 0) {
        // Server ignored our range; truncate the partial file and start over.
        await rm(partPath, { force: true });
      }

      const contentLength = Number(
        Array.isArray(res.headers['content-length'])
          ? res.headers['content-length'][0]
          : res.headers['content-length'],
      );
      const total = Number.isFinite(contentLength) ? startOffset + contentLength : 0;

      let received = startOffset;
      let windowBytes = 0;
      let windowStart = Date.now();
      let speedBps = 0;

      const reportProgress = (chunkLen: number) => {
        received += chunkLen;
        windowBytes += chunkLen;
        const now = Date.now();
        const elapsed = now - windowStart;
        if (elapsed >= 250) {
          speedBps = (windowBytes / elapsed) * 1000;
          windowBytes = 0;
          windowStart = now;
        }
        options.onProgress?.({ current: received, total, speedBps, file: dest });
      };

      const out = createWriteStream(partPath, { flags: resumed ? 'a' : 'w' });
      const bodyStream = res.body as unknown as Readable;
      bodyStream.on('data', (chunk: Buffer) => reportProgress(chunk.length));

      await pipeline(bodyStream, out, options.signal ? { signal: options.signal } : {});

      // Verify integrity before committing.
      if (options.sha1) {
        const actual = await sha1OfFile(partPath);
        if (actual !== options.sha1.toLowerCase()) {
          await rm(partPath, { force: true });
          throw new LauncherError(
            'integrity',
            `SHA-1 mismatch for ${dest}: expected ${options.sha1}, got ${actual ?? 'none'}`,
            { retryable: true },
          );
        }
      }

      await rm(dest, { force: true });
      await rename(partPath, dest);
      const finalSize = await fileSize(dest);
      options.onProgress?.({ current: finalSize, total: finalSize || total, speedBps: 0, file: dest });
      return;
    } catch (err) {
      if (isAbortError(err)) {
        throw new LauncherError('network', `Download of ${url} aborted`, {
          cause: err,
          retryable: false,
        });
      }
      // Integrity failures are retryable but we keep the typed kind.
      if (err instanceof LauncherError && err.kind === 'integrity') {
        lastError = err;
        if (attempt < retries) {
          await sleep(backoffDelay(attempt, DEFAULTS.backoffBaseMs), options.signal);
          continue;
        }
        throw err;
      }
      if (err instanceof LauncherError && !err.retryable) {
        throw err;
      }
      lastError = err;
      if (attempt < retries) {
        await sleep(backoffDelay(attempt, DEFAULTS.backoffBaseMs), options.signal);
        continue;
      }
    }
  }

  await rm(partPath, { force: true });
  throw new LauncherError('network', `Failed to download ${url} after ${retries + 1} attempts`, {
    cause: lastError,
  });
}

async function fileSize(filePath: string): Promise<number> {
  try {
    const st = await stat(filePath);
    return st.isFile() ? st.size : 0;
  } catch {
    return 0;
  }
}

/**
 * A bounded concurrency pool. Runs `worker` over `items` with at most `size`
 * in flight, preserving result order and failing fast on the first rejection.
 */
export async function runPool<T, R>(
  items: readonly T[],
  size: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const concurrency = Math.max(1, Math.floor(size));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let failed: unknown;

  async function run(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length || failed !== undefined) return;
      const item = items[index];
      if (item === undefined) continue;
      try {
        results[index] = await worker(item, index);
      } catch (err) {
        failed = err;
        return;
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  if (failed !== undefined) throw failed;
  return results;
}
