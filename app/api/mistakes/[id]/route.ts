import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteMistakeImageFile } from "@/lib/mistake-files";
import { deleteMistakeForUser, updateMistakeForUser } from "@/lib/mistakes-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  if (!isDatabaseConfigured()) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const o = body as { notes?: unknown; tags?: unknown };
  const notes = typeof o.notes === "string" ? o.notes : "";
  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string")) {
    return NextResponse.json(
      { error: "Body must include tags: string[] and optional notes: string." },
      { status: 400 },
    );
  }
  const tagNames = o.tags as string[];

  try {
    const mistake = await updateMistakeForUser(user.id, id, {
      notes: notes.trim(),
      tagNames,
    });
    if (!mistake) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ mistake });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    if (msg.includes("At least one tag")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update mistake." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Ctx) {
  if (!isDatabaseConfigured()) {
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
