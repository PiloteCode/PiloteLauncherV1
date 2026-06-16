import { join } from 'node:path';
import { app } from 'electron';
import Conf from 'conf';
import {
  SettingsSchema,
  ProfileSchema,
  UnlockedInstanceSchema,
  InstanceOverrideSchema,
  LauncherError,
  type Settings,
  type Profile,
  type UnlockedInstance,
  type InstanceOverride,
} from '@pilote/types';
import { log } from './logger.js';

/**
 * Typed persistence layer backed by `conf`. Everything read back from disk is
 * re-validated with the `@pilote/types` Zod schemas so corrupt/old data can never
 * propagate into the app. Writes are validated before persisting.
 */

interface StoreShape {
  settings: Settings;
  profiles: Profile[];
  activeProfileId: string | null;
  unlocked: UnlockedInstance[];
  overrides: InstanceOverride[];
}

let conf: Conf<StoreShape> | undefined;

function defaultSettings(): Settings {
  const userData = app.getPath('userData');
  const apiBaseUrl = process.env.PILOTE_API_BASE_URL?.trim() || 'http://localhost:3000';
  // Parse through the schema so every defaulted field is populated.
  return SettingsSchema.parse({
    instancesDir: join(userData, 'instances'),
    javaDir: join(userData, 'java'),
    apiBaseUrl,
  });
}

function getConf(): Conf<StoreShape> {
  if (!conf) {
    const defaults = defaultSettings();
    conf = new Conf<StoreShape>({
      projectName: 'pilote-project',
      // Schemaless on the conf side; we enforce shape with Zod ourselves.
      defaults: {
        settings: defaults,
        profiles: [],
        activeProfileId: null,
        unlocked: [],
        overrides: [],
      },
    });
  }
  return conf;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(): Settings {
  const raw = getConf().get('settings');
  const parsed = SettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Recover gracefully from a corrupt/partial settings blob.
  log.warn('Settings invalid on disk, restoring defaults', parsed.error.flatten());
  const fresh = defaultSettings();
  getConf().set('settings', fresh);
  return fresh;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const current = getSettings();
  const next = SettingsSchema.parse({ ...current, ...patch });
  getConf().set('settings', next);
  return next;
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export function getProfiles(): Profile[] {
  const raw = getConf().get('profiles');
  const parsed = ProfileSchema.array().safeParse(raw);
  if (parsed.success) return parsed.data;
  log.warn('Profiles invalid on disk, resetting', parsed.error.flatten());
  getConf().set('profiles', []);
  return [];
}

export function setProfiles(profiles: Profile[]): void {
  const validated = ProfileSchema.array().parse(profiles);
  getConf().set('profiles', validated);
}

export function upsertProfile(profile: Profile): Profile {
  const validated = ProfileSchema.parse(profile);
  const profiles = getProfiles();
  const idx = profiles.findIndex((p) => p.id === validated.id);
  if (idx >= 0) profiles[idx] = validated;
  else profiles.push(validated);
  setProfiles(profiles);
  return validated;
}

export function removeProfile(id: string): void {
  const profiles = getProfiles().filter((p) => p.id !== id);
  setProfiles(profiles);
  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles[0]?.id ?? null);
  }
}

export function getActiveProfileId(): string | null {
  const raw = getConf().get('activeProfileId');
  return typeof raw === 'string' ? raw : null;
}

export function setActiveProfileId(id: string | null): void {
  if (id !== null) {
    const exists = getProfiles().some((p) => p.id === id);
    if (!exists) throw new LauncherError('not-found', `Profil introuvable: ${id}`);
  }
  getConf().set('activeProfileId', id);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return getProfiles().find((p) => p.id === id) ?? null;
}

// ── Unlocked private instances ─────────────────────────────────────────────────

export function getUnlocked(): UnlockedInstance[] {
  const raw = getConf().get('unlocked');
  const parsed = UnlockedInstanceSchema.array().safeParse(raw);
  if (parsed.success) return parsed.data;
  log.warn('Unlocked instances invalid on disk, resetting', parsed.error.flatten());
  getConf().set('unlocked', []);
  return [];
}

export function setUnlocked(list: UnlockedInstance[]): void {
  const validated = UnlockedInstanceSchema.array().parse(list);
  getConf().set('unlocked', validated);
}

export function upsertUnlocked(entry: UnlockedInstance): UnlockedInstance {
  const validated = UnlockedInstanceSchema.parse(entry);
  const list = getUnlocked();
  const idx = list.findIndex((u) => u.instanceId === validated.instanceId);
  if (idx >= 0) list[idx] = validated;
  else list.push(validated);
  setUnlocked(list);
  return validated;
}

export function getUnlockedFor(instanceId: string): UnlockedInstance | null {
  return getUnlocked().find((u) => u.instanceId === instanceId) ?? null;
}

export function removeUnlocked(instanceId: string): void {
  setUnlocked(getUnlocked().filter((u) => u.instanceId !== instanceId));
}

// ── Per-instance overrides ─────────────────────────────────────────────────────

export function getOverride(instanceId: string): InstanceOverride | null {
  const raw = getConf().get('overrides');
  const parsed = InstanceOverrideSchema.array().safeParse(raw);
  if (!parsed.success) {
    log.warn('Overrides invalid on disk, resetting', parsed.error.flatten());
    getConf().set('overrides', []);
    return null;
  }
  return parsed.data.find((o) => o.instanceId === instanceId) ?? null;
}

export function setOverride(override: InstanceOverride): void {
  const validated = InstanceOverrideSchema.parse(override);
  const raw = getConf().get('overrides');
  const parsed = InstanceOverrideSchema.array().safeParse(raw);
  const list = parsed.success ? parsed.data : [];
  const idx = list.findIndex((o) => o.instanceId === validated.instanceId);
  if (idx >= 0) list[idx] = validated;
  else list.push(validated);
  getConf().set('overrides', list);
}
