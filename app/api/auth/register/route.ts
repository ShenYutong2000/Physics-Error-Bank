import { NextResponse } from "next/server";
import { jsonResponseWithSession } from "@/lib/auth-session-response";
import { getAuthSecret } from "@/lib/auth-config";
import {
  isStudentSchoolEmail,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  STUDENT_EMAIL_REQUIRED_MESSAGE,
} from "@/lib/auth-validation";
import { isDatabaseConfigured } from "@/lib/db";
import { createRegisteredUser } from "@/lib/users-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    recoveryAnswer1?: string;
    recoveryAnswer2?: string;
    recoveryAnswer3?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const recoveryAnswer1 = typeof body.recoveryAnswer1 === "string" ? body.recoveryAnswer1 : "";
  const recoveryAnswer2 = typeof body.recoveryAnswer2 === "string" ? body.recoveryAnswer2 : "";
  const recoveryAnswer3 = typeof body.recoveryAnswer3 === "string" ? body.recoveryAnswer3 : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!recoveryAnswer1 || !recoveryAnswer2 || !recoveryAnswer3) {
    return NextResponse.json(
      { error: "All three security questions must be answered." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!isStudentSchoolEmail(email)) {
    return NextResponse.json({ error: STUDENT_EMAIL_REQUIRED_MESSAGE }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
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

  const created = await createRegisteredUser(email, password, [
    recoveryAnswer1,
    recoveryAnswer2,
    recoveryAnswer3,
  ]);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 409 });
  }

  return jsonResponseWithSession(email, secret);
}
