import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";

export type UserRoleName = "STUDENT" | "TEACHER";

/** Built-in defaults; merged with TEACHER_EMAILS (comma-separated). Cached for process lifetime. */
const DEFAULT_TEACHER_EMAILS = ["yutshen@uwcchina.org"] as const;

let cachedTeacherEmailsFromEnv: Set<string> | null = null;

function getTeacherEmailsFromEnv(): Set<string> {
  if (!cachedTeacherEmailsFromEnv) {
    const raw = process.env.TEACHER_EMAILS ?? "";
    const fromEnv = raw.split(",").map((s) => normalizeEmail(s)).filter(Boolean);
    cachedTeacherEmailsFromEnv = new Set([
      ...DEFAULT_TEACHER_EMAILS.map((s) => normalizeEmail(s)),
      ...fromEnv,
    ]);
  }
  return cachedTeacherEmailsFromEnv;
}

export async function isTeacherEmail(emailRaw: string): Promise<boolean> {
  const email = normalizeEmail(emailRaw);
  if (!email) return false;
  if (getTeacherEmailsFromEnv().has(email)) return true;
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

