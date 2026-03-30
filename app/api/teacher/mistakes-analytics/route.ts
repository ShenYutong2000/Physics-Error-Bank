import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { getStudentMistakeAnalyticsForTeacher } from "@/lib/teacher-mistake-analytics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  try {
    const data = await getStudentMistakeAnalyticsForTeacher();
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
