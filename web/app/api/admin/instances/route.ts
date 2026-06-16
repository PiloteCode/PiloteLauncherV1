import { prisma } from '@/lib/db';
import { toInstanceDto } from '@/lib/dto';
import { json, handleError, validateJson } from '@/lib/api';
import { requireAdmin } from '@/lib/session';
import {
  UpsertInstanceRequestSchema,
  type ListInstancesResponse,
  type InstanceDto,
} from '@pilote/types';

/**
 * GET  /api/admin/instances  — list ALL instances (public + private). [admin]
 * POST /api/admin/instances  — create an instance. [admin]
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const instances = await prisma.instance.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { files: { orderBy: { path: 'asc' } } },
    });
    const body: ListInstancesResponse = { instances: instances.map(toInstanceDto) };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const data = await validateJson(req, UpsertInstanceRequestSchema);

    const created = await prisma.instance.create({
      data: {
        name: data.name,
        description: data.description ?? '',
        changelog: data.changelog ?? '',
        cover: data.cover ?? '',
        mcVersion: data.mcVersion,
        loader: data.loader,
        loaderVersion: data.loaderVersion ?? null,
        recommendedRamMb: data.recommendedRamMb ?? 4096,
        visibility: data.visibility,
        version: 1,
      },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    const dto: InstanceDto = toInstanceDto(created);
    return json(dto, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
