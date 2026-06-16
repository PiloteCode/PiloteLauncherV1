import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { hash, verify } from '@node-rs/argon2';
import { prisma } from './db';

/**
 * Argon2id parameters used for Better Auth password hashing. We delegate to @node-rs/argon2
 * (the same native lib used for access codes) so the deployment ships a single hashing impl.
 */
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

function appUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  );
}

/**
 * Better Auth server instance.
 * - Email + password only (admins). Players never authenticate here.
 * - Prisma adapter against the SQLite/Postgres schema.
 * - Sign-ups disabled at runtime via the API route guard; the seed creates the first admin.
 */
export const auth = betterAuth({
  appName: 'Pilote Project',
  baseURL: appUrl(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === 'production'
      ? (() => {
          throw new Error('BETTER_AUTH_SECRET is required in production');
        })()
      : 'dev-insecure-secret-change-me'),
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 256,
    password: {
      hash: (password: string) => hash(password, ARGON2_OPTS),
      verify: ({ hash: stored, password }: { hash: string; password: string }) =>
        verify(stored, password, ARGON2_OPTS),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'admin',
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
});

export type Auth = typeof auth;
