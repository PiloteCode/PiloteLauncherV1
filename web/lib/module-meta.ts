import {
  Gauge,
  MessageCircle,
  Puzzle,
  Signal,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleCategory, ModulePermission } from '@pilote/types';

/**
 * UI metadata for module listings: maps the registry's icon-name strings to the
 * matching lucide components, and gives categories / permissions human French
 * labels for the marketplace. Kept here so the page (server) and the card
 * (client) share exactly the same mappings.
 */

/** Icon-name (from the module manifest) → lucide component, with a safe fallback. */
const MODULE_ICONS: Record<string, LucideIcon> = {
  'message-circle': MessageCircle,
  timer: Timer,
  signal: Signal,
  gauge: Gauge,
};

/** Resolve a manifest icon name to its lucide component (Puzzle as fallback). */
export function moduleIcon(name: string): LucideIcon {
  return MODULE_ICONS[name] ?? Puzzle;
}

/** Short, human category names (French). */
export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  social: 'Social',
  stats: 'Statistiques',
  performance: 'Performance',
  server: 'Serveur',
  utility: 'Utilitaire',
};

/** Short, human permission names (French) — what each capability lets a module do. */
export const PERMISSION_LABELS: Record<ModulePermission, string> = {
  sessions: 'Parties en cours',
  profiles: 'Profil actif',
  instances: 'Liste des instances',
  overrides: 'Réglages d’instance',
  system: 'Infos de la machine',
  network: 'Accès réseau',
  discord: 'Discord',
  storage: 'Réglages du module',
  ui: 'Panneau dans le launcher',
};
