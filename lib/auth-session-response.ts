import { NextResponse } from "next/server";
import { sessionCookieName, sessionMaxAgeSec, signSession } from "@/lib/session";

export async function jsonResponseWithSession(
  email: string,
  secret: string,
): Promise<NextResponse> {
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
