import { NextResponse } from "next/server";
import { jsonResponseWithSession } from "@/lib/auth-session-response";
import { getAuthSecret, getExpectedCredentials } from "@/lib/auth-config";
import {
  normalizeEmail,
  STUDENT_EMAIL_REQUIRED_MESSAGE,
} from "@/lib/auth-validation";
import { isDatabaseConfigured } from "@/lib/db";
import { ensureBootstrapUserInPrisma, syncUserRoleByEmail, verifyRegisteredUser } from "@/lib/users-repo";
import { isTeacherEmail } from "@/lib/teacher-role";

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

  const creds = getExpectedCredentials();
  const emailAllowed =
    email.endsWith("@uwcchina.org") ||
    (await isTeacherEmail(email)) ||
    (creds !== null && normalizeEmail(email) === normalizeEmail(creds.email));

  if (!emailAllowed) {
    return NextResponse.json({ error: STUDENT_EMAIL_REQUIRED_MESSAGE }, { status: 400 });
  }

  const secret = getAuthSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Server is not configured. Set AUTH_SECRET." },
      { status: 503 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const registeredOk = await verifyRegisteredUser(email, password);
  if (registeredOk) {
    await syncUserRoleByEmail(email);
    return jsonResponseWithSession(email, secret);
  }

  if (creds && normalizeEmail(email) === normalizeEmail(creds.email) && password === creds.password) {
    await ensureBootstrapUserInPrisma(email, password);
    return jsonResponseWithSession(email, secret);
  }

  return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
}
