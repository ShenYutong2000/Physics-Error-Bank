import { NextResponse } from "next/server";
import { getSessionUserFromRequest, type SessionUser } from "@/lib/api-auth";
import { isDatabaseConfigured } from "@/lib/db";

export async function requireDbAndUser(
  request: Request,
): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Database is not configured. Set DATABASE_URL in .env." },
        { status: 503 },
      ),
    };
  }
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { ok: true, user };
}
