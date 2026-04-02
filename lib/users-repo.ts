import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/auth-validation";
import { hashPassword, verifyPassword } from "@/lib/password-hash";
import {
  normalizeRecoveryAnswer,
  validateRecoveryAnswersForSignup,
} from "@/lib/recovery-questions";
import { getRoleForEmail, type UserRoleName } from "@/lib/teacher-role";

/** Matches `users` table after migrations (`name`, `role`, …). */
type UserAuthRow = {
  id: string;
  email: string;
  name: string;
  role: UserRoleName;
  passwordHash: string;
  createdAt: Date;
};

type UserBootstrapRow = UserAuthRow & {
  recoveryAnswer1Hash: string | null;
  recoveryAnswer2Hash: string | null;
  recoveryAnswer3Hash: string | null;
};

/** Cast: some IDE caches may lag behind `prisma generate` and omit new columns on `UserSelect`. */
const selectUserForAuth = {
  id: true,
  email: true,
  name: true,
  role: true,
  passwordHash: true,
  createdAt: true,
} as const satisfies Record<string, boolean>;

const selectUserForBootstrap = {
  id: true,
  email: true,
  name: true,
  role: true,
  passwordHash: true,
  recoveryAnswer1Hash: true,
  recoveryAnswer2Hash: true,
  recoveryAnswer3Hash: true,
  createdAt: true,
} as const satisfies Record<string, boolean>;

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  role: UserRoleName;
  passwordHash: string;
  createdAt: string;
};

function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  if (!isDatabaseConfigured()) return null;
  const norm = normalizeEmail(email);
  const row = (await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: selectUserForAuth as Prisma.UserSelect,
  })) as UserAuthRow | null;
  if (!row) return null;
  return mapUserAuthRow(row);
}

function mapUserAuthRow(row: UserAuthRow): StoredUser {
  return {
    id: row.id,
    email: normalizeEmail(row.email),
    name: row.name,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
  };
}

async function syncBootstrapUserIfNeeded(existing: UserBootstrapRow, normEmail: string): Promise<void> {
  const role = await getRoleForEmail(normEmail);
  if (existing.role !== role || !existing.name.trim()) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role,
        name: existing.name.trim() ? existing.name : normEmail.split("@")[0],
      } as Prisma.UserUpdateInput,
    });
  }
}

function generateOneTimeLoginPassword(): string {
  return randomBytes(18).toString("base64url");
}

export async function createRegisteredUser(
  email: string,
  name: string,
  plainPassword: string,
  recoveryAnswers: [string, string, string],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Database is not configured. Set DATABASE_URL." };
  }
  const recoveryErr = validateRecoveryAnswersForSignup(recoveryAnswers);
  if (recoveryErr) {
    return { ok: false, error: recoveryErr };
  }
  const norm = normalizeEmail(email);
  const normalizedName = name.trim();
  if (!normalizedName) {
    return { ok: false, error: "Name is required." };
  }
  const existing = await findUserByEmail(norm);
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const passwordHash = hashPassword(plainPassword);
  const recoveryAnswer1Hash = hashPassword(normalizeRecoveryAnswer(recoveryAnswers[0]));
  const recoveryAnswer2Hash = hashPassword(normalizeRecoveryAnswer(recoveryAnswers[1]));
  const recoveryAnswer3Hash = hashPassword(normalizeRecoveryAnswer(recoveryAnswers[2]));
  const role = await getRoleForEmail(norm);
  try {
    await prisma.user.create({
      data: {
        email: norm,
        name: normalizedName,
        role,
        passwordHash,
        recoveryAnswer1Hash,
        recoveryAnswer2Hash,
        recoveryAnswer3Hash,
      } as Prisma.UserCreateInput,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    console.error(e);
    return { ok: false, error: "Could not create account (database error)." };
  }
  return { ok: true };
}

export async function recoverAccountWithAnswers(
  email: string,
  answers: [string, string, string],
): Promise<
  { ok: true; newPassword: string } | { ok: false; error: string; status: number }
> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Database is not configured. Set DATABASE_URL.", status: 503 };
  }
  const norm = normalizeEmail(email);
  const row = await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: {
      id: true,
      recoveryAnswer1Hash: true,
      recoveryAnswer2Hash: true,
      recoveryAnswer3Hash: true,
    },
  });
  if (!row) {
    return { ok: false, error: "No account found for this email.", status: 404 };
  }
  if (!row.recoveryAnswer1Hash || !row.recoveryAnswer2Hash || !row.recoveryAnswer3Hash) {
    return {
      ok: false,
      error:
        "This account has no security answers on file. Sign in another way or ask a teacher for help.",
      status: 400,
    };
  }
  const a1 = normalizeRecoveryAnswer(answers[0]);
  const a2 = normalizeRecoveryAnswer(answers[1]);
  const a3 = normalizeRecoveryAnswer(answers[2]);
  const ok1 = verifyPassword(row.recoveryAnswer1Hash, a1);
  const ok2 = verifyPassword(row.recoveryAnswer2Hash, a2);
  const ok3 = verifyPassword(row.recoveryAnswer3Hash, a3);
  if (!ok1 || !ok2 || !ok3) {
    return { ok: false, error: "Answers do not match our records.", status: 401 };
  }
  const newPassword = generateOneTimeLoginPassword();
  await prisma.user.update({
    where: { id: row.id },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { ok: true, newPassword };
}

export async function verifyRegisteredUser(email: string, plainPassword: string): Promise<boolean> {
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user) return false;
  return verifyPassword(user.passwordHash, plainPassword);
}

export async function syncUserRoleByEmail(email: string): Promise<void> {
  const norm = normalizeEmail(email);
  const existing = await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: { id: true },
  });
  if (!existing) return;
  const role = await getRoleForEmail(norm);
  await prisma.user.update({
    where: { id: existing.id },
    data: { role } as Prisma.UserUpdateInput,
  });
}

export async function changePasswordForUser(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Database is not configured. Set DATABASE_URL.", status: 503 };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      status: 400,
    };
  }
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!row) {
    return { ok: false, error: "User not found.", status: 404 };
  }
  if (!verifyPassword(row.passwordHash, currentPassword)) {
    return { ok: false, error: "Current password is incorrect.", status: 401 };
  }
  if (verifyPassword(row.passwordHash, newPassword)) {
    return {
      ok: false,
      error: "New password must be different from your current password.",
      status: 400,
    };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { ok: true };
}

/** Dev / env bootstrap: create a DB row on first login so mistakes have a user id. */
export async function ensureBootstrapUserInPrisma(
  email: string,
  plainPassword: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const norm = normalizeEmail(email);
  const existing = (await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: selectUserForBootstrap as Prisma.UserSelect,
  })) as UserBootstrapRow | null;
  if (existing) {
    await syncBootstrapUserIfNeeded(existing, norm);
    return;
  }
  const role = await getRoleForEmail(norm);
  await prisma.user.create({
    data: {
      email: norm,
      name: norm.split("@")[0],
      role,
      passwordHash: hashPassword(plainPassword),
    } as Prisma.UserCreateInput,
  });
}

export async function updateUserName(
  userId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedName = name.trim();
  if (!normalizedName) return { ok: false, error: "Name is required." };
  await prisma.user.update({
    where: { id: userId },
    data: { name: normalizedName } as Prisma.UserUpdateInput,
  });
  return { ok: true };
}

/** For teacher dropdowns: all student accounts. */
export async function listStudentUsersBrief(): Promise<
  Array<{ id: string; name: string; email: string }>
> {
  if (!isDatabaseConfigured()) return [];
  return prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });
}
