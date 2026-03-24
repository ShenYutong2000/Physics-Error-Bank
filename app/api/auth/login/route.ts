import { NextResponse } from "next/server";
import { getAuthSecret, getExpectedCredentials } from "@/lib/auth-config";
import { sessionCookieName, sessionMaxAgeSec, signSession } from "@/lib/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const creds = getExpectedCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Server is not configured for sign-in. Set AUTH_EMAIL and AUTH_PASSWORD." },
      { status: 503 },
    );
  }

  const secret = getAuthSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Server is not configured. Set AUTH_SECRET." },
      { status: 503 },
    );
  }

  if (email !== creds.email.toLowerCase() || password !== creds.password) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = await signSession(email, secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: sessionMaxAgeSec(),
    path: "/",
  });
  return res;
}
