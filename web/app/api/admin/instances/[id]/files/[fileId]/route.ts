import { z } from 'zod';
import { prisma } from '@/lib/db';
import { toInstanceDto } from '@/lib/dto';
import { json, errorResponse, handleError, validateJson } from '@/lib/api';
import { requireAdmin } from '@/lib/session';
import { releaseBlob } from '@/lib/storage';
import { FileTargetSchema, type InstanceDto } from '@pilote/types';

/**
 * PATCH  /api/admin/instances/:id/files/:fileId — toggle enabled / move target / rename. [admin]
 * DELETE /api/admin/instances/:id/files/:fileId — remove file, decrement blob refcount. [admin]
 * Both bump the instance version.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchFileSchema = z
  .object({
    enabled: z.boolean().optional(),
    target: FileTargetSchema.optional(),
    path: z.string().min(1).max(512).optional(),
  })
  .refine((v) => v.enabled !== undefined || v.target !== undefined || v.path !== undefined, {
    message: 'At least one of enabled, target, or path is required.',
  });

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; fileId: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id, fileId } = await ctx.params;
    const data = await validateJson(req, PatchFileSchema);

    const file = await prisma.instanceFile.findFirst({
      where: { id: fileId, instanceId: id },
    });
    if (!file) {
      return errorResponse('not_found', 'Fichier introuvable.');
    }

    await prisma.instanceFile.update({
      where: { id: fileId },
      data: {
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.target !== undefined ? { target: data.target } : {}),
        ...(data.path !== undefined ? { path: sanitizeRelPath(data.path) } : {}),
      },
    });

    const updated = await prisma.instance.update({
      where: { id },
      data: { version: { increment: 1 } },
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
  ctx: { params: Promise<{ id: string; fileId: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id, fileId } = await ctx.params;

    const file = await prisma.instanceFile.findFirst({
      where: { id: fileId, instanceId: id },
    });
    if (!file) {
      return errorResponse('not_found', 'Fichier introuvable.');
    }

    await prisma.instanceFile.delete({ where: { id: fileId } });
    await releaseBlob(file.sha1);

    await prisma.instance.update({
      where: { id },
      data: { version: { increment: 1 } },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}

function sanitizeRelPath(name: string): string {
  return name
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg.length > 0 && seg !== '.' && seg !== '..')
    .join('/')
    .trim();
}
