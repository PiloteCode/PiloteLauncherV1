import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { json, errorResponse, handleError } from '@/lib/api';
import { parseYaml } from '@/lib/yaml';

/**
 * GET /api/openapi
 *
 * Reads the repo's `openapi.yaml`, parses it to JSON, and returns it so the docs page
 * can feed it directly to swagger-ui-react via the `spec` prop (no extra fetch / CORS).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Candidate locations for the spec: repo root (monorepo) first, then the web cwd.
const CANDIDATES = [
  join(process.cwd(), '..', 'openapi.yaml'),
  join(process.cwd(), 'openapi.yaml'),
];

export async function GET(): Promise<Response> {
  try {
    let raw: string | null = null;
    for (const path of CANDIDATES) {
      try {
        raw = await readFile(path, 'utf8');
        break;
      } catch {
        // try next candidate
      }
    }

    if (raw === null) {
      return errorResponse('not_found', 'Spécification OpenAPI introuvable.');
    }

    const spec = parseYaml(raw);
    return json(spec, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return handleError(err);
  }
}
