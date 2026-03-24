import { NextResponse } from "next/server";
import { jsonResponseWithSession } from "@/lib/auth-session-response";
import { getAuthSecret, getExpectedCredentials } from "@/lib/auth-config";
import { normalizeEmail } from "@/lib/auth-validation";
import {
  ensureBootstrapUserInPrisma,
  upsertRegisteredUserInPrisma,
} from "@/lib/sync-user-prisma";
import { findUserByEmail, verifyRegisteredUser } from "@/lib/user-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const secret = getAuthSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Server is not configured. Set AUTH_SECRET." },
      { status: 503 },
    );
  }

  const registeredOk = await verifyRegisteredUser(email, password);
  if (registeredOk) {
    const record = await findUserByEmail(email);
    if (record) {
      await upsertRegisteredUserInPrisma(record.email, record.passwordHash);
    }
    return jsonResponseWithSession(email, secret);
  }

  const creds = getExpectedCredentials();
  if (creds && email === creds.email.toLowerCase() && password === creds.password) {
    await ensureBootstrapUserInPrisma(email, password);
    return jsonResponseWithSession(email, secret);
  }

  return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
}
