import { NextResponse } from "next/server";
import { requireDbAndUser } from "@/lib/api-route-guards";
import { getPaperForAnswering } from "@/lib/papers-repo";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbAndUser(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  try {
    const paper = await getPaperForAnswering(id);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }
    return NextResponse.json(paper);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load paper." }, { status: 500 });
  }
}

