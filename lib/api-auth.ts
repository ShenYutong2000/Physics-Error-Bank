import { prisma } from "@/lib/db";
import { getAuthSecret } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";

export type SessionUser = { email: string; id: string };

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
  const token = cookieValueFromRequest(request, sessionCookieName());
  const secret = getAuthSecret();
  if (!token || !secret) return null;
  const session = await verifySession(token, secret);
  if (!session) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true, email: true },
    });
    if (!user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
