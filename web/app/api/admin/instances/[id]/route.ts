import { prisma } from '@/lib/db';
import { toInstanceDto } from '@/lib/dto';
import { json, errorResponse, handleError, validateJson } from '@/lib/api';
import { requireAdmin } from '@/lib/session';
import { releaseBlob } from '@/lib/storage';
import { UpsertInstanceRequestSchema, type InstanceDto } from '@pilote/types';

/**
 * PUT    /api/admin/instances/:id  — update fields, bump version. [admin]
 * DELETE /api/admin/instances/:id  — delete instance + release blob refs. [admin]
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const data = await validateJson(req, UpsertInstanceRequestSchema);

    const existing = await prisma.instance.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('not_found', 'Instance introuvable.');
    }

    const updated = await prisma.instance.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description ?? '',
        changelog: data.changelog ?? '',
        cover: data.cover ?? '',
        mcVersion: data.mcVersion,
        loader: data.loader,
        loaderVersion: data.loaderVersion ?? null,
        recommendedRamMb: data.recommendedRamMb ?? existing.recommendedRamMb,
        visibility: data.visibility,
        version: { increment: 1 },
      },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    const dto: InstanceDto = toInstanceDto(updated);
    return json(dto);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const existing = await prisma.instance.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!existing) {
      return errorResponse('not_found', 'Instance introuvable.');
    }

    // Delete the instance (cascades to InstanceFile rows) then release each blob ref.
    await prisma.instance.delete({ where: { id } });
    for (const file of existing.files) {
      await releaseBlob(file.sha1);
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
