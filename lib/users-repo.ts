import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";
import { hashPassword, verifyPassword } from "@/lib/password-hash";

export type StoredUser = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  if (!isDatabaseConfigured()) return null;
  const norm = normalizeEmail(email);
  const row = await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
  });
  if (!row) return null;
  return {
    email: normalizeEmail(row.email),
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createRegisteredUser(
  email: string,
  plainPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Database is not configured. Set DATABASE_URL." };
  }
  const norm = normalizeEmail(email);
  const existing = await findUserByEmail(norm);
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const passwordHash = hashPassword(plainPassword);
  try {
    await prisma.user.create({ data: { email: norm, passwordHash } });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    console.error(e);
    return { ok: false, error: "Could not create account (database error)." };
  }
  return { ok: true };
}

export async function verifyRegisteredUser(email: string, plainPassword: string): Promise<boolean> {
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user) return false;
  return verifyPassword(user.passwordHash, plainPassword);
}

/** Dev / env bootstrap: create a DB row on first login so mistakes have a user id. */
export async function ensureBootstrapUserInPrisma(
  email: string,
  plainPassword: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const norm = normalizeEmail(email);
  const existing = await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
  });
  if (existing) return;
  await prisma.user.create({
    data: { email: norm, passwordHash: hashPassword(plainPassword) },
  });
}
