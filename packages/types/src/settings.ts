import { z } from 'zod';

export const ThemeSchema = z.enum(['dark', 'light']);
export type Theme = z.infer<typeof ThemeSchema>;

export const LocaleSchema = z.enum(['fr', 'en']);
export type Locale = z.infer<typeof LocaleSchema>;

/** Persisted launcher settings. */
export const SettingsSchema = z.object({
  /** Global default RAM (MB), overridable per instance. */
  globalRamMb: z.number().int().min(1024).max(65536).default(4096),
  /** Root directory where instances are stored. */
  instancesDir: z.string(),
  /** Root directory where provisioned JREs live. */
  javaDir: z.string(),
  theme: ThemeSchema.default('dark'),
  locale: LocaleSchema.default('fr'),
  /** Base URL of the distribution backend (the Next.js `web` app). */
  apiBaseUrl: z.string().url(),
  /** Max concurrent downloads in the pool. */
  maxConcurrentDownloads: z.number().int().min(1).max(32).default(8),
  /** Accent color (defaults to the cold blue from the design). */
  accentColor: z.string().default('#3b82f6'),
  /** Whether to auto-check for launcher updates on startup. */
  autoCheckUpdates: z.boolean().default(true),
});
export type Settings = z.infer<typeof SettingsSchema>;

/** Per-instance overrides stored locally. */
export const InstanceOverrideSchema = z.object({
  instanceId: z.string(),
  ramMb: z.number().int().min(1024).max(65536).optional(),
  javaPath: z.string().optional(),
  extraJvmArgs: z.array(z.string()).optional(),
});
export type InstanceOverride = z.infer<typeof InstanceOverrideSchema>;

/** A persisted unlocked private instance (token + cached DTO id). */
export const UnlockedInstanceSchema = z.object({
  instanceId: z.string(),
  token: z.string(),
  /** epoch ms when the JWT expires; refreshed on demand. */
  expiresAt: z.number().int(),
});
export type UnlockedInstance = z.infer<typeof UnlockedInstanceSchema>;
