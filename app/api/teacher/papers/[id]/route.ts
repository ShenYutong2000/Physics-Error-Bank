import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { deletePaperForTeacher } from "@/lib/papers-repo";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  try {
    const result = await deletePaperForTeacher(id, guard.user.id);
    if (result === "not_found") {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }
    if (result === "forbidden") {
      return NextResponse.json({ error: "You can only delete papers you created." }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete paper." }, { status: 500 });
  }
}
