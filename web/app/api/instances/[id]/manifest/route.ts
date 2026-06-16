import { prisma } from '@/lib/db';
import { toInstanceManifest } from '@/lib/dto';
import { json, errorResponse, handleError } from '@/lib/api';
import { authorizeInstanceAccess } from '@/lib/access';
import type { ManifestResponse } from '@pilote/types';

/**
 * GET /api/instances/:id/manifest
 *
 * Public instances are open. Private instances require the scoped bearer token
 * returned by /api/instances/unlock (Authorization: Bearer <token> or ?token=).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await ctx.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    if (!instance) {
      return errorResponse('not_found', 'Instance introuvable.');
    }

    const allowed = await authorizeInstanceAccess(req, instance);
    if (!allowed) {
      return errorResponse('unauthorized', 'Token requis pour cette instance privée.');
    }

    const body: ManifestResponse = { manifest: toInstanceManifest(instance) };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}
