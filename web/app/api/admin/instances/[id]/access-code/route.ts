import { randomInt } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { prisma } from '@/lib/db';
import { json, errorResponse, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/session';
import type { AccessCodeResponse } from '@pilote/types';

/**
 * POST /api/admin/instances/:id/access-code
 *
 * Generates (or rotates) the access code for an instance: produces a fresh random
 * code, stores ONLY its argon2 hash, forces visibility=private, bumps the version,
 * and returns the plaintext code exactly once. [admin]
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

// Unambiguous alphabet (no 0/O, 1/I/L) for human-typeable codes.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUPS = 3;
const GROUP_LEN = 4;

function generateCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = '';
    for (let i = 0; i < GROUP_LEN; i++) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const instance = await prisma.instance.findUnique({ where: { id } });
    if (!instance) {
      return errorResponse('not_found', 'Instance introuvable.');
    }

    const code = generateCode();
    const accessCodeHash = await hash(code, ARGON2_OPTS);

    await prisma.instance.update({
      where: { id },
      data: {
        accessCodeHash,
        visibility: 'private',
        version: { increment: 1 },
      },
    });

    const body: AccessCodeResponse = { instanceId: id, code };
    return json(body);
  } catch (err) {
    return handleError(err);
  }
}
