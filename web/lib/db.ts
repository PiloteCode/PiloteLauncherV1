import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient singleton. In dev, Next.js hot-reloads modules which would otherwise
 * spawn a new client (and connection pool) on every reload — we cache it on globalThis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
