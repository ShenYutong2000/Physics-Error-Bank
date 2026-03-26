import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { changePasswordForUser } from "@/lib/users-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required." },
      { status: 400 },
    );
  }

  const result = await changePasswordForUser(guard.user.id, currentPassword, newPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
