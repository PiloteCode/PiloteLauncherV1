import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight gate for the admin area.
 *
 * Edge middleware cannot run the Prisma/Better-Auth server (Node-only), so we only
 * check for the PRESENCE of a Better Auth session cookie here and redirect to the
 * login page when it is missing. Full session validation happens server-side in the
 * admin route handlers and `requireAdmin()` (which a forged cookie cannot pass).
 */

// Better Auth session cookie names (and their __Secure- prefixed prod variants).
const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => {
    const cookie = req.cookies.get(name);
    return Boolean(cookie?.value);
  });
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Allow the login page and the auth endpoints through unauthenticated.
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!hasSessionCookie(req)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.search = '';
      const target = pathname + (req.nextUrl.search || '');
      loginUrl.searchParams.set('redirect', target);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
