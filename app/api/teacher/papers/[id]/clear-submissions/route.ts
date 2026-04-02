import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { clearStudentAttemptsForPaper } from "@/lib/papers-repo";

export const runtime = "nodejs";

/** Remove all student submissions for this paper so they can submit again. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  try {
    const result = await clearStudentAttemptsForPaper(id);
    if (result === "not_found") {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to clear submissions." }, { status: 500 });
  }
}
