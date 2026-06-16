import { createAuthClient } from 'better-auth/react';

function baseURL(): string {
  if (typeof window !== 'undefined') {
    // Same-origin: the admin UI is served by this app.
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    'http://localhost:3000'
  );
}

/**
 * Better Auth browser client used by the admin UI (login form, session hooks).
 * Talks to /api/auth/* on the same origin.
 */
export const authClient = createAuthClient({
  baseURL: baseURL(),
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
