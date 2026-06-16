import { z } from 'zod';
import { InstanceDtoSchema, InstanceManifestSchema } from './instance.js';

/**
 * REST contract between the Electron client and the `web` (Next.js) distribution backend.
 * Mirrors openapi.yaml at the repo root. Keep both in sync.
 */

/** GET /api/instances -> public instances only. */
export const ListInstancesResponseSchema = z.object({
  instances: z.array(InstanceDtoSchema),
});
export type ListInstancesResponse = z.infer<typeof ListInstancesResponseSchema>;

/** POST /api/instances/unlock { code } */
export const UnlockRequestSchema = z.object({
  code: z.string().min(1).max(128),
});
export type UnlockRequest = z.infer<typeof UnlockRequestSchema>;

/** -> { token, instance } : short-lived JWT scoped to that one private instance. */
export const UnlockResponseSchema = z.object({
  token: z.string(),
  /** epoch ms expiry of the token. */
  expiresAt: z.number().int(),
  instance: InstanceDtoSchema,
});
export type UnlockResponse = z.infer<typeof UnlockResponseSchema>;

/** GET /api/instances/:id/manifest (Authorization: Bearer <token> required if private). */
export const ManifestResponseSchema = z.object({
  manifest: InstanceManifestSchema,
});
export type ManifestResponse = z.infer<typeof ManifestResponseSchema>;

/** Standard error envelope returned by the API. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** Optional field-level detail for validation errors. */
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Admin: create/update instance payload (multipart handled separately for files). */
export const UpsertInstanceRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  changelog: z.string().optional(),
  mcVersion: z.string().min(1),
  loader: z.enum(['vanilla', 'fabric', 'forge', 'neoforge', 'quilt']),
  loaderVersion: z.string().optional(),
  recommendedRamMb: z.number().int().min(1024).max(65536).optional(),
  visibility: z.enum(['public', 'private']),
  cover: z.string().optional(),
});
export type UpsertInstanceRequest = z.infer<typeof UpsertInstanceRequestSchema>;

/** Admin: response when (re)generating an access code (plaintext shown once). */
export const AccessCodeResponseSchema = z.object({
  instanceId: z.string(),
  code: z.string(),
});
export type AccessCodeResponse = z.infer<typeof AccessCodeResponseSchema>;

/** electron-updater generic provider feed (latest.yml is YAML, but this documents the shape). */
export const UpdateFeedSchema = z.object({
  version: z.string(),
  releaseDate: z.string(),
  files: z.array(
    z.object({
      url: z.string(),
      sha512: z.string(),
      size: z.number().int(),
    }),
  ),
});
export type UpdateFeed = z.infer<typeof UpdateFeedSchema>;
