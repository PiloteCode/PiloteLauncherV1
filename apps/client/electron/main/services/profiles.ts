import { randomUUID } from 'node:crypto';
import { resolveProfile } from '@pilote/core/auth';
import {
  MINECRAFT_NAME_REGEX,
  ProfileSchema,
  LauncherError,
  type Profile,
  type MojangLookup,
} from '@pilote/types';
import {
  getProfiles,
  getActiveProfile,
  setActiveProfileId,
  upsertProfile,
  removeProfile as removeStoredProfile,
} from '../store.js';
import { toLauncherError } from '@shared/errors.js';

/**
 * Profile management. UUID/skin resolution is delegated to `@pilote/core/auth`
 * (Mojang lookup with cache/backoff, offline fallback). Profiles are persisted
 * via the typed store.
 */

function assertValidName(name: string): void {
  if (!MINECRAFT_NAME_REGEX.test(name)) {
    throw new LauncherError(
      'validation',
      'Pseudo invalide : 3 à 16 caractères (lettres, chiffres, underscore).',
    );
  }
}

export function list(): Profile[] {
  return getProfiles();
}

export function getActive(): Profile | null {
  return getActiveProfile();
}

export function setActive(id: string): void {
  setActiveProfileId(id);
}

/** Resolve a username via Mojang/offline without persisting anything. */
export async function lookup(name: string): Promise<MojangLookup> {
  assertValidName(name);
  try {
    return await resolveProfile(name);
  } catch (err) {
    throw toLauncherError(err, 'auth');
  }
}

/** Create & persist a profile from a username (resolves UUID/skin). */
export async function create(name: string): Promise<Profile> {
  assertValidName(name);

  const existing = getProfiles().find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    throw new LauncherError('validation', `Un profil « ${name} » existe déjà.`);
  }

  let resolved: MojangLookup;
  try {
    resolved = await resolveProfile(name);
  } catch (err) {
    throw toLauncherError(err, 'auth');
  }

  const profile: Profile = ProfileSchema.parse({
    id: randomUUID(),
    name: resolved.name,
    uuid: resolved.uuid,
    uuidSource: resolved.uuidSource,
    ...(resolved.skinUrl ? { skinUrl: resolved.skinUrl } : {}),
    resolvedAt: Date.now(),
    createdAt: Date.now(),
  });

  const saved = upsertProfile(profile);

  // First profile becomes active automatically.
  if (!getActiveProfile()) setActiveProfileId(saved.id);

  return saved;
}

export function remove(id: string): void {
  const exists = getProfiles().some((p) => p.id === id);
  if (!exists) throw new LauncherError('not-found', `Profil introuvable: ${id}`);
  removeStoredProfile(id);
}
