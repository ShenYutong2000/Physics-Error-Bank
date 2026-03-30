import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { createPaper, listPapers } from "@/lib/papers-repo";

export const runtime = "nodejs";

type CreateBody = {
  title?: unknown;
  year?: unknown;
  session?: unknown;
  questionCount?: unknown;
};

export async function GET(request: Request) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  try {
    const papers = await listPapers({ includeUnpublished: true });
    return NextResponse.json({ papers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load papers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const year = typeof body.year === "number" ? body.year : NaN;
  const session = body.session === "MAY" || body.session === "NOV" ? body.session : "";
  const questionCount =
    typeof body.questionCount === "number" ? Math.max(1, Math.min(60, Math.floor(body.questionCount))) : 30;
  if (!title || !Number.isFinite(year) || !session) {
    return NextResponse.json({ error: "title, year and session are required." }, { status: 400 });
  }
  try {
    const paper = await createPaper({
      title,
      year,
      session,
      questionCount,
      createdById: guard.user.id,
    });
    return NextResponse.json({ paper });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create paper.";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Paper for this year/session already exists." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not create paper." }, { status: 500 });
  }
}

