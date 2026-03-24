import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";

export async function GET() {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const secret = getAuthSecret();
  if (!token || !secret) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const session = await verifySession(token, secret);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: { email: session.email } });
}
