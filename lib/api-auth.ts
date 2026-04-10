import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";
import { getAuthSecret, getExpectedCredentials } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";
import { ensureBootstrapUserInPrisma, syncUserRoleByEmail } from "@/lib/users-repo";

export type SessionUser = { email: string; id: string; role: "STUDENT" | "TEACHER"; name: string };

/** Cold DB / pool warmup on serverless can fail once; retry before surfacing an error. */
const SESSION_DB_ATTEMPTS = 3;

function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1017", "P2024"].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Error) {
    return /connection|timeout|ECONNRESET|ECONNREFUSED|closed the connection|Server has closed/i.test(
      error.message,
    );
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Session cookie proves login, but mistake APIs need a `users` row (UUID).
 * If the row is missing, only env bootstrap credentials can recreate it (dev / admin login).
 */
async function ensurePrismaUserForSessionEmail(email: string): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const norm = normalizeEmail(email);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return;

  const creds = getExpectedCredentials();
  if (creds && norm === normalizeEmail(creds.email)) {
    await ensureBootstrapUserInPrisma(norm, creds.password);
  }
}

function cookieValueFromRequest(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    const v = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return undefined;
}

export async function getSessionUserFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  if (!isDatabaseConfigured()) return null;
  const token = cookieValueFromRequest(request, sessionCookieName());
  const secret = getAuthSecret();
  if (!token || !secret) return null;
  const session = await verifySession(token, secret);
  if (!session) return null;
  const norm = normalizeEmail(session.email);
  for (let attempt = 0; attempt < SESSION_DB_ATTEMPTS; attempt += 1) {
    try {
      await ensurePrismaUserForSessionEmail(norm);
      await syncUserRoleByEmail(norm);
      const user = await prisma.user.findFirst({
        where: { email: { equals: norm, mode: "insensitive" } },
        select: { id: true, email: true, role: true, name: true },
      });
      if (!user) return null;
      return { id: user.id, email: user.email, role: user.role, name: user.name };
    } catch (e) {
      const canRetry = attempt < SESSION_DB_ATTEMPTS - 1 && isTransientDbError(e);
      if (canRetry) {
        await sleep(50 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Session resolution failed.");
}
