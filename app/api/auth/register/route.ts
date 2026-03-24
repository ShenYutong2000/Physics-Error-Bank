import { NextResponse } from "next/server";
import { jsonResponseWithSession } from "@/lib/auth-session-response";
import { getAuthSecret } from "@/lib/auth-config";
import { isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/auth-validation";
import { createRegisteredUser } from "@/lib/user-store";

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

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
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

  const created = await createRegisteredUser(email, password);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 409 });
  }

  return jsonResponseWithSession(email, secret);
}
