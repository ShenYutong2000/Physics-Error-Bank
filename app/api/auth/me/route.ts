import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";
import { sessionCookieName, verifySession } from "@/lib/session";
import { syncUserRoleByEmail } from "@/lib/users-repo";

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
  const norm = normalizeEmail(session.email);
  await syncUserRoleByEmail(norm);
  const user = await prisma.user.findFirst({
    where: { email: { equals: norm, mode: "insensitive" } },
    select: { id: true, email: true, role: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ user: { email: session.email, name: "", role: "STUDENT" } });
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
