import { BUILTIN_MODULES, LauncherError, type ModuleView } from '@pilote/types';
import {
  getModuleState,
  setModuleEnabled as persistEnabled,
  setModuleSettings as persistSettings,
} from '../store.js';

/**
 * Module registry on the main side. The built-in manifests come from @pilote/types
 * (the shared source of truth); the launcher only persists each module's enabled flag
 * and settings. "Installing" a built-in module simply enables it.
 */

function toView(id: string): ModuleView {
  const listing = BUILTIN_MODULES.find((m) => m.id === id);
  if (!listing) throw new LauncherError('not-found', `Module introuvable: ${id}`);
  const state = getModuleState(id);
  // Spread suppresses excess-property checks; the extra listing fields are harmless over IPC.
  return { ...listing, enabled: state?.enabled ?? false, settings: state?.settings ?? {} };
}

export function list(): ModuleView[] {
  return BUILTIN_MODULES.map((m) => toView(m.id));
}

export function setEnabled(id: string, enabled: boolean): void {
  toView(id); // throws if unknown
  persistEnabled(id, enabled);
}

export function getSettings(id: string): Record<string, unknown> {
  return toView(id).settings;
}

export function setSettings(id: string, settings: Record<string, unknown>): void {
  toView(id);
  persistSettings(id, settings);
}

/** Install a module by id. Built-ins just get enabled. Returns the resulting view. */
export function install(id: string): ModuleView {
  toView(id);
  persistEnabled(id, true);
  return toView(id);
}
