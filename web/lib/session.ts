import { headers } from 'next/headers';
import { auth } from './auth';
import { HttpError } from './api';

/**
 * Admin session helpers built on Better Auth. Players never authenticate; these
 * guard the /api/admin/* routes and admin pages.
 */

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Resolve the current Better Auth session from request cookies/headers.
 * Returns null when there is no valid session.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const requestHeaders = await headers();
  // Next's ReadonlyHeaders is structurally a Headers; Better Auth reads from it.
  const result = await auth.api.getSession({ headers: requestHeaders as unknown as Headers });
  if (!result?.user) return null;

  const user = result.user as {
    id: string;
    email: string;
    name: string;
    role?: string | null;
  };
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? 'admin',
  };
}

/**
 * Require an authenticated admin. Throws HttpError(401) when unauthenticated.
 * Use at the top of every /api/admin route handler.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new HttpError('unauthorized', 'Authentication required.');
  }
  return session;
}
