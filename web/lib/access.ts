import { isTokenValidFor } from './jwt';
import { prisma } from './db';

/**
 * Helpers for authorizing access to private instances and their files.
 */

/** Extract a bearer token from the Authorization header or a ?token= query param. */
export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth) {
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match?.[1]) return match[1].trim();
  }
  const url = new URL(req.url);
  const q = url.searchParams.get('token');
  return q && q.length > 0 ? q : null;
}

/**
 * Authorize a request for a specific instance. Public instances are always allowed.
 * Private instances require a valid token scoped to that instance.
 * Returns the visibility so callers can branch, and whether access is granted.
 */
export async function authorizeInstanceAccess(
  req: Request,
  instance: { id: string; visibility: string },
): Promise<boolean> {
  if (instance.visibility !== 'private') return true;
  const token = extractToken(req);
  if (!token) return false;
  return isTokenValidFor(token, instance.id);
}

/**
 * Decide whether a content-addressed blob may be served to this request.
 * A blob is freely downloadable if it is referenced by at least one PUBLIC instance.
 * If it is referenced ONLY by private instances, the request must carry a valid token
 * scoped to one of those instances.
 *
 * Returns null when the hash is referenced by no instance file (caller -> 404 unless
 * the blob exists for non-instance use, which it shouldn't for protected content).
 */
export async function authorizeBlobAccess(
  req: Request,
  sha1: string,
): Promise<{ allowed: boolean; referenced: boolean }> {
  const refs = await prisma.instanceFile.findMany({
    where: { sha1 },
    select: { instance: { select: { id: true, visibility: true } } },
  });

  if (refs.length === 0) {
    return { allowed: false, referenced: false };
  }

  const hasPublic = refs.some((r) => r.instance.visibility !== 'private');
  if (hasPublic) {
    return { allowed: true, referenced: true };
  }

  // Private-only: need a token valid for one of the referencing instances.
  const token = extractToken(req);
  if (!token) return { allowed: false, referenced: true };

  const privateIds = Array.from(new Set(refs.map((r) => r.instance.id)));
  for (const id of privateIds) {
    if (await isTokenValidFor(token, id)) {
      return { allowed: true, referenced: true };
    }
  }
  return { allowed: false, referenced: true };
}
