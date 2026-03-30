import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { updateUserName } from "@/lib/users-repo";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name : "";
  const result = await updateUserName(guard.user.id, name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

