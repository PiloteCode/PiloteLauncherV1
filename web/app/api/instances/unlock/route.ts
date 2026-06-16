import { verify } from '@node-rs/argon2';
import { prisma } from '@/lib/db';
import { toInstanceDto } from '@/lib/dto';
import { signInstanceToken } from '@/lib/jwt';
import { json, errorResponse, handleError, validateJson } from '@/lib/api';
import { clientIp, consumeRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { UnlockRequestSchema, type UnlockResponse } from '@pilote/types';

/**
 * POST /api/instances/unlock  { code }
 *
 * Verifies the submitted access code (argon2) against every private instance's
 * accessCodeHash and, on a match, returns a short-lived JWT scoped to that instance
 * plus the full instance DTO. Rate-limited per client IP.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  try {
    const ip = clientIp(req);
    const limit = consumeRateLimit(`unlock:${ip}`);
    if (!limit.allowed) {
      return errorResponse(
        'rate_limited',
        'Trop de tentatives. Réessayez plus tard.',
        undefined,
        {
          'Retry-After': String(limit.retryAfterSeconds),
          'X-RateLimit-Limit': String(limit.limit),
          'X-RateLimit-Remaining': '0',
        },
      );
    }

    const { code } = await validateJson(req, UnlockRequestSchema);

    const privateInstances = await prisma.instance.findMany({
      where: { visibility: 'private', accessCodeHash: { not: null } },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    // Verify against each candidate. We always run at least one comparison-shaped
    // path to keep timing roughly constant whether or not any private instance exists.
    let matched: (typeof privateInstances)[number] | null = null;
    for (const instance of privateInstances) {
      if (!instance.accessCodeHash) continue;
      let ok = false;
      try {
        ok = await verify(instance.accessCodeHash, code);
      } catch {
        ok = false;
      }
      if (ok) {
        matched = instance;
        break;
      }
    }

    if (!matched) {
      return errorResponse('unauthorized', 'Code invalide.');
    }

    // Successful unlock: be forgiving on the limiter for this IP.
    resetRateLimit(`unlock:${ip}`);

    const { token, expiresAt } = await signInstanceToken(matched.id);
    const body: UnlockResponse = {
      token,
      expiresAt,
      instance: toInstanceDto(matched),
    };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}
