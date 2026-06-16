import { request } from 'undici';
import {
  ListInstancesResponseSchema,
  UnlockResponseSchema,
  ManifestResponseSchema,
  ApiErrorSchema,
  LauncherError,
  type InstanceDto,
  type UnlockResponse,
  type InstanceManifest,
} from '@pilote/types';
import { getSettings } from './store.js';
import { log } from './logger.js';

/**
 * HTTP client for the Pilote Project distribution API (the Next.js `web` app),
 * implemented against `openapi.yaml`. All responses are validated with the
 * `@pilote/types` Zod schemas; failures surface as typed {@link LauncherError}s.
 */

const REQUEST_TIMEOUT_MS = 30_000;

function baseUrl(): string {
  return getSettings().apiBaseUrl.replace(/\/+$/, '');
}

/** Resolve a (possibly relative) download URL against the configured API base. */
export function resolveDownloadUrl(downloadUrl: string): string {
  try {
    // Absolute URL — keep as-is.
    return new URL(downloadUrl).toString();
  } catch {
    // Relative — resolve against the API base.
    const path = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
    return `${baseUrl()}${path}`;
  }
}

async function readJson(body: import('undici').Dispatcher.ResponseData['body']): Promise<unknown> {
  const text = await body.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function apiErrorMessage(payload: unknown, fallback: string): string {
  const parsed = ApiErrorSchema.safeParse(payload);
  if (parsed.success) return parsed.data.error.message;
  return fallback;
}

interface GetOptions {
  token?: string;
}

async function getJson(path: string, opts: GetOptions = {}): Promise<unknown> {
  const url = `${baseUrl()}${path}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;

  let res: import('undici').Dispatcher.ResponseData;
  try {
    res = await request(url, {
      method: 'GET',
      headers,
      headersTimeout: REQUEST_TIMEOUT_MS,
      bodyTimeout: REQUEST_TIMEOUT_MS,
    });
  } catch (err) {
    log.error(`GET ${path} failed`, err);
    throw new LauncherError('network', `Connexion au serveur impossible (${path}).`, {
      cause: err,
      retryable: true,
    });
  }

  const payload = await readJson(res.body);

  if (res.statusCode === 404) {
    throw new LauncherError('not-found', apiErrorMessage(payload, 'Ressource introuvable.'));
  }
  if (res.statusCode === 401 || res.statusCode === 403) {
    throw new LauncherError('auth', apiErrorMessage(payload, 'Accès non autorisé.'));
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new LauncherError(
      'network',
      apiErrorMessage(payload, `Erreur serveur (${res.statusCode}).`),
      { retryable: res.statusCode >= 500 },
    );
  }
  return payload;
}

/** GET /api/instances — public instances only. */
export async function listPublicInstances(): Promise<InstanceDto[]> {
  const payload = await getJson('/api/instances');
  const parsed = ListInstancesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LauncherError('validation', 'Réponse serveur invalide (liste des instances).', {
      cause: parsed.error,
    });
  }
  return parsed.data.instances;
}

/** POST /api/instances/unlock — exchange an access code for a scoped token + DTO. */
export async function unlock(code: string): Promise<UnlockResponse> {
  const url = `${baseUrl()}/api/instances/unlock`;
  let res: import('undici').Dispatcher.ResponseData;
  try {
    res = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code }),
      headersTimeout: REQUEST_TIMEOUT_MS,
      bodyTimeout: REQUEST_TIMEOUT_MS,
    });
  } catch (err) {
    log.error('POST /api/instances/unlock failed', err);
    throw new LauncherError('network', 'Connexion au serveur impossible.', {
      cause: err,
      retryable: true,
    });
  }

  const payload = await readJson(res.body);

  if (res.statusCode === 401) {
    throw new LauncherError('auth', apiErrorMessage(payload, 'Code invalide ou déjà utilisé.'));
  }
  if (res.statusCode === 429) {
    throw new LauncherError('auth', 'Trop de tentatives. Réessayez dans un instant.', {
      retryable: true,
    });
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new LauncherError(
      'network',
      apiErrorMessage(payload, `Erreur serveur (${res.statusCode}).`),
      { retryable: res.statusCode >= 500 },
    );
  }

  const parsed = UnlockResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LauncherError('validation', 'Réponse serveur invalide (unlock).', {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** GET /api/instances/:id/manifest — token required for private instances. */
export async function getManifest(instanceId: string, token?: string): Promise<InstanceManifest> {
  const payload = await getJson(`/api/instances/${encodeURIComponent(instanceId)}/manifest`, {
    token,
  });
  const parsed = ManifestResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LauncherError('validation', 'Réponse serveur invalide (manifeste).', {
      cause: parsed.error,
    });
  }
  return parsed.data.manifest;
}
