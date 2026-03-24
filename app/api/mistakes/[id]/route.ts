import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api-auth";
import { isDatabaseEnabled } from "@/lib/sync-user-prisma";
import { deleteMistakeImageFile } from "@/lib/mistake-files";
import { deleteMistakeForUser } from "@/lib/mistakes-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Ctx) {
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL in .env." },
      { status: 503 },
    );
  }

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  try {
    const removed = await deleteMistakeForUser(user.id, id);
    if (!removed) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await deleteMistakeImageFile(removed.imageKey);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete mistake." }, { status: 500 });
  }
}
