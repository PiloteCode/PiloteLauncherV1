import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

/**
 * Better Auth request handler. Mounts every Better Auth endpoint under /api/auth/*
 * (sign-in, sign-out, get-session, etc.). Node runtime is required (Prisma + argon2).
 */
export const runtime = 'nodejs';

export const { GET, POST } = toNextJsHandler(auth);
