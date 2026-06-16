import { z } from 'zod';

/** Source of a profile's UUID. */
export const UuidSourceSchema = z.enum([
  'mojang', // resolved from a premium account via the Mojang API
  'offline', // computed MD5 of "OfflinePlayer:{name}" (server offline-mode compatible)
]);
export type UuidSource = z.infer<typeof UuidSourceSchema>;

export const MINECRAFT_NAME_REGEX = /^[A-Za-z0-9_]{3,16}$/;

/**
 * A local, offline game profile. No Microsoft/Mojang auth — we only resolve and persist
 * the real UUID/skin when the username matches a premium account, otherwise we compute the
 * canonical offline UUID so server inventories/permissions stay consistent.
 */
export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string().regex(MINECRAFT_NAME_REGEX),
  /** Canonical dashed UUID. */
  uuid: z.string().uuid(),
  uuidSource: UuidSourceSchema,
  /** URL to the player's skin texture, when premium and resolvable. */
  skinUrl: z.string().url().optional(),
  /** When the Mojang lookup was last performed (epoch ms), for cache/backoff. */
  resolvedAt: z.number().int().optional(),
  createdAt: z.number().int(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Result of a Mojang username -> profile lookup. */
export const MojangLookupSchema = z.object({
  name: z.string(),
  uuid: z.string().uuid(),
  uuidSource: UuidSourceSchema,
  skinUrl: z.string().url().optional(),
});
export type MojangLookup = z.infer<typeof MojangLookupSchema>;
