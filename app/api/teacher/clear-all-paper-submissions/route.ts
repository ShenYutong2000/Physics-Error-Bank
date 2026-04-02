import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { clearAllStudentPaperAttemptsEverywhere } from "@/lib/papers-repo";

export const runtime = "nodejs";

/** Remove all student paper attempts on every paper. */
export async function POST(request: Request) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  try {
    const { deletedCount } = await clearAllStudentPaperAttemptsEverywhere();
    return NextResponse.json({ ok: true, deletedCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to clear all submissions." }, { status: 500 });
  }
}
