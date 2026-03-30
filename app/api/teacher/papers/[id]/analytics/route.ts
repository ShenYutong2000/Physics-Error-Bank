import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { getTeacherPaperAnalytics } from "@/lib/papers-repo";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "all" ? "all" : "latest";
  try {
    const analytics = await getTeacherPaperAnalytics(id, mode);
    if (!analytics) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    return NextResponse.json(analytics);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}

