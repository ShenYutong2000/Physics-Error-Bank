import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSecret } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName())?.value;
  const secret = getAuthSecret();
  if (!token || !secret) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const session = await verifySession(token, secret);
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/add", "/add/:path*", "/library", "/library/:path*"],
};
