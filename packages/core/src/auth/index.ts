import type { MojangLookup, Profile } from '@pilote/types';
import { lookupProfile } from './mojang.js';

export { computeOfflineUuid, formatDashedUuid, stripDashes } from './offline-uuid.js';
export { lookupProfile, formatDashedUuid as formatUuid, clearLookupCache } from './mojang.js';

/** A {@link Profile} without the persistence-managed fields the caller assigns. */
export type ResolvedProfile = Omit<Profile, 'id' | 'createdAt'>;

/**
 * Resolve a username into a Profile-shaped object (UUID + source + optional skin),
 * ready for the caller to persist with an `id` and `createdAt`. Uses the Mojang
 * lookup (premium -> real UUID/skin, otherwise the offline UUID).
 */
export async function resolveProfile(
  name: string,
  options: { signal?: AbortSignal; force?: boolean } = {},
): Promise<ResolvedProfile> {
  const lookup: MojangLookup = await lookupProfile(name, options);
  return {
    name: lookup.name,
    uuid: lookup.uuid,
    uuidSource: lookup.uuidSource,
    resolvedAt: Date.now(),
    ...(lookup.skinUrl ? { skinUrl: lookup.skinUrl } : {}),
  };
}
