import { prisma, isDatabaseConfigured } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";
import { getAuthSecret, getExpectedCredentials } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";
import { ensureBootstrapUserInPrisma } from "@/lib/users-repo";

export type SessionUser = { email: string; id: string };

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
  try {
    await ensurePrismaUserForSessionEmail(norm);
    const user = await prisma.user.findFirst({
      where: { email: { equals: norm, mode: "insensitive" } },
      select: { id: true, email: true },
    });
    if (!user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
