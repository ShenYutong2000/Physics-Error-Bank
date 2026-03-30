import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { getAttemptDetail } from "@/lib/papers-repo";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  try {
    const detail = await getAttemptDetail(id, guard.user.id);
    if (!detail) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load attempt." }, { status: 500 });
  }
}

