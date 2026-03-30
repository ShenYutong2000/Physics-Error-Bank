import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { parseTagNamesFromUnknown } from "@/lib/mistake-input";
import { deleteMistakeImageFile } from "@/lib/mistake-files";
import { deleteMistakeForUser, updateMistakeForUser } from "@/lib/mistakes-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  const { user } = guard;

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
  const expectedUpdatedAt =
    typeof (body as { expectedUpdatedAt?: unknown }).expectedUpdatedAt === "string"
      ? (body as { expectedUpdatedAt: string }).expectedUpdatedAt
      : "";
  if (!expectedUpdatedAt) {
    return NextResponse.json(
      { error: "Body must include expectedUpdatedAt for optimistic locking." },
      { status: 400 },
    );
  }
  let tagNames: string[];
  try {
    tagNames = parseTagNamesFromUnknown(o.tags);
  } catch {
    return NextResponse.json(
      { error: "Body must include tags: string[] and optional notes: string." },
      { status: 400 },
    );
  }

  try {
    const mistake = await updateMistakeForUser(user.id, id, {
      notes: notes.trim(),
      tagNames,
      expectedUpdatedAt,
    });
    if (mistake.kind === "not_found") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (mistake.kind === "conflict") {
      return NextResponse.json(
        {
          error:
            "This mistake was updated elsewhere. Please refresh and try again.",
          code: "CONFLICT",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ mistake: mistake.mistake });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    if (msg.includes("At least one tag")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes("Only preset A-E tags are allowed")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update mistake." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  const { user } = guard;

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
