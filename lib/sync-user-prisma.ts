import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password-hash";

export function isDatabaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Keep Postgres users row in sync after a successful password login (registered account). */
export async function upsertRegisteredUserInPrisma(
  email: string,
  passwordHash: string,
): Promise<void> {
  if (!isDatabaseEnabled()) return;
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
}

/** Bootstrap / env-only accounts: create a DB row on first login so mistakes have a user id. */
export async function ensureBootstrapUserInPrisma(
  email: string,
  plainPassword: string,
): Promise<void> {
  if (!isDatabaseEnabled()) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  await prisma.user.create({
    data: { email, passwordHash: hashPassword(plainPassword) },
  });
}
