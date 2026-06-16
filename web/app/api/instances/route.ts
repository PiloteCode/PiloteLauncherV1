import { prisma } from '@/lib/db';
import { toInstanceDto } from '@/lib/dto';
import { json, handleError } from '@/lib/api';
import type { ListInstancesResponse } from '@pilote/types';

/**
 * GET /api/instances
 * Returns ONLY public instances. Private instances are never listed; players must
 * unlock them with an access code. Sensitive fields are stripped by the DTO mapper.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const instances = await prisma.instance.findMany({
      where: { visibility: 'public' },
      orderBy: { updatedAt: 'desc' },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    const body: ListInstancesResponse = {
      instances: instances.map(toInstanceDto),
    };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}
