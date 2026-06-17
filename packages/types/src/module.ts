import { z } from 'zod';

/**
 * Module (plugin) contract shared between the launcher, the modules themselves and the
 * web marketplace. The launcher ships a built-in library; the marketplace can list more.
 */

export const ModuleCategorySchema = z.enum([
  'social', // Discord, presence, sharing
  'stats', // playtime, history
  'performance', // RAM, JVM tuning
  'server', // server status, pinging
  'utility', // everything else
]);
export type ModuleCategory = z.infer<typeof ModuleCategorySchema>;

/** Capabilities a module declares up front (shown to the user, gate main-process access). */
export const ModulePermissionSchema = z.enum([
  'sessions', // observe game session start/stop + logs
  'profiles', // read the active profile
  'instances', // read the instance list / install state
  'overrides', // read & write per-instance settings (e.g. RAM)
  'system', // read host info (memory, cpu count)
  'network', // ping/query remote servers
  'discord', // drive Discord Rich Presence
  'storage', // persist its own settings
  'ui', // contribute a panel/widget to the launcher
]);
export type ModulePermission = z.infer<typeof ModulePermissionSchema>;

export const ModuleManifestSchema = z.object({
  /** kebab-case unique id, e.g. "discord-rpc". */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().default(''),
  author: z.string().default('Pilote Project'),
  category: ModuleCategorySchema.default('utility'),
  /** lucide-vue icon name used in the UI. */
  icon: z.string().default('puzzle'),
  homepage: z.string().url().optional(),
  permissions: z.array(ModulePermissionSchema).default([]),
  /** True for modules bundled with the launcher (install = just enable). */
  builtin: z.boolean().default(false),
});
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;

/** A marketplace entry: the manifest plus listing metadata served by the backend. */
export const ModuleListingSchema = ModuleManifestSchema.extend({
  /** Short tagline for the marketplace card. */
  tagline: z.string().default(''),
  /** Optional URL to the module bundle (only for non-builtin remote modules). */
  entryUrl: z.string().url().optional(),
  screenshots: z.array(z.string()).default([]),
  /** Rough install count / popularity, purely cosmetic. */
  installs: z.number().int().nonnegative().default(0),
});
export type ModuleListing = z.infer<typeof ModuleListingSchema>;

export const ListModulesResponseSchema = z.object({
  modules: z.array(ModuleListingSchema),
});
export type ListModulesResponse = z.infer<typeof ListModulesResponseSchema>;

/** Per-module persisted state in the launcher (enabled flag + free-form settings). */
export const ModuleStateSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(false),
  settings: z.record(z.string(), z.unknown()).default({}),
});
export type ModuleState = z.infer<typeof ModuleStateSchema>;

/** A module as the renderer lists it: manifest + live state. */
export interface ModuleView extends ModuleManifest {
  enabled: boolean;
  settings: Record<string, unknown>;
}

/**
 * The launcher's built-in module library. The manifests live here (single source of
 * truth) so the launcher, the modules and the web marketplace all agree; each module's
 * actual behaviour is implemented in the renderer keyed by `id`.
 */
export const BUILTIN_MODULES: ModuleListing[] = [
  {
    id: 'discord-rpc',
    name: 'Discord Rich Presence',
    version: '1.0.0',
    description:
      "Montre sur ton Discord l'instance à laquelle tu joues, avec le loader et le temps de jeu.",
    tagline: 'Affiche ta partie sur Discord',
    author: 'Pilote Project',
    category: 'social',
    icon: 'message-circle',
    permissions: ['sessions', 'profiles', 'discord'],
    builtin: true,
    screenshots: [],
    installs: 0,
  },
  {
    id: 'playtime-tracker',
    name: 'Temps de jeu',
    version: '1.0.0',
    description:
      'Compte le temps passé sur chaque instance et te montre tes stats et ton historique.',
    tagline: 'Tes heures de jeu, par instance',
    author: 'Pilote Project',
    category: 'stats',
    icon: 'timer',
    permissions: ['sessions', 'storage', 'ui'],
    builtin: true,
    screenshots: [],
    installs: 0,
  },
  {
    id: 'server-status',
    name: 'Statut serveur',
    version: '1.0.0',
    description:
      "Ping le serveur d'une instance et affiche le nombre de joueurs en ligne et la latence.",
    tagline: 'Joueurs en ligne en direct',
    author: 'Pilote Project',
    category: 'server',
    icon: 'signal',
    permissions: ['instances', 'network', 'ui'],
    builtin: true,
    screenshots: [],
    installs: 0,
  },
  {
    id: 'ram-auto-tuner',
    name: 'Auto-réglage RAM',
    version: '1.0.0',
    description:
      'Détecte la RAM de ta machine et propose une allocation adaptée pour chaque instance.',
    tagline: 'La bonne RAM, automatiquement',
    author: 'Pilote Project',
    category: 'performance',
    icon: 'gauge',
    permissions: ['system', 'overrides', 'instances'],
    builtin: true,
    screenshots: [],
    installs: 0,
  },
];

/** Look up a built-in module listing by id. */
export function findBuiltinModule(id: string): ModuleListing | undefined {
  return BUILTIN_MODULES.find((m) => m.id === id);
}
