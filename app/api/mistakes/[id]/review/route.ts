import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { recordManualReviewForUser } from "@/lib/mistakes-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
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

  try {
    const r = await recordManualReviewForUser(user.id, id, { expectedUpdatedAt });
    if (r.kind === "not_found") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (r.kind === "conflict") {
      return NextResponse.json(
        {
          error:
            "This mistake was updated elsewhere. Please refresh and try again.",
          code: "CONFLICT",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ mistake: r.mistake });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to record review." }, { status: 500 });
  }
}
