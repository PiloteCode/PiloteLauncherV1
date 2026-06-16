import { PrismaClient } from '@prisma/client';
import { auth } from '../lib/auth';

/**
 * Idempotent seed: create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 *
 * We go through Better Auth's sign-up API so the password is hashed exactly the way the
 * runtime expects (same argon2 config as lib/auth.ts) and the User/Account rows are created
 * consistently. Safe to re-run: if the admin already exists we just ensure the role and exit.
 */

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrateur';

  if (!email || !password) {
    console.warn(
      '[seed] ADMIN_EMAIL and ADMIN_PASSWORD are not set — skipping admin creation.',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
      console.log(`[seed] Existing user ${email} promoted to admin.`);
    } else {
      console.log(`[seed] Admin ${email} already exists — nothing to do.`);
    }
    return;
  }

  // Create via Better Auth so the credential account + password hash are written correctly.
  const result = await auth.api.signUpEmail({
    body: { email, password, name },
  });

  if (!result || !('user' in result) || !result.user) {
    throw new Error('[seed] Better Auth sign-up did not return a user.');
  }

  // Ensure the admin role + verified flag (sign-up defaults role via additionalFields,
  // but we set it explicitly to be safe across Better Auth versions).
  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: 'admin', emailVerified: true },
  });

  console.log(`[seed] Created admin ${email}.`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
