import { json } from '@/lib/api';
import { BUILTIN_MODULES, type ListModulesResponse } from '@pilote/types';

/**
 * GET /api/modules
 * Lists the modules available in the marketplace. For now this is the launcher's
 * built-in library (the single source of truth lives in @pilote/types).
 */
export const runtime = 'nodejs';

export function GET(): Response {
  const body: ListModulesResponse = { modules: BUILTIN_MODULES };
  return json(body);
}
