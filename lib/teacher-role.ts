import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";

export type UserRoleName = "STUDENT" | "TEACHER";

function parseTeacherEmailsFromEnv(): Set<string> {
  const raw = process.env.TEACHER_EMAILS ?? "";
  const defaults = ["yutshen@uwcchina.org"];
  const fromEnv = raw.split(",").map((s) => normalizeEmail(s)).filter(Boolean);
  return new Set(
    [...defaults, ...fromEnv].map((s) => normalizeEmail(s)).filter(Boolean),
  );
}

export async function isTeacherEmail(emailRaw: string): Promise<boolean> {
  const email = normalizeEmail(emailRaw);
  if (!email) return false;
  const envSet = parseTeacherEmailsFromEnv();
  if (envSet.has(email)) return true;
  if (!isDatabaseConfigured()) return false;
  // Use $queryRaw so we do not depend on PrismaClient delegate typings when `prisma generate` is stale.
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM teacher_email_allowlist WHERE LOWER(email) = LOWER(${email}) LIMIT 1`,
  );
  return rows.length > 0;
}

export async function getRoleForEmail(email: string): Promise<UserRoleName> {
  return (await isTeacherEmail(email)) ? "TEACHER" : "STUDENT";
}

