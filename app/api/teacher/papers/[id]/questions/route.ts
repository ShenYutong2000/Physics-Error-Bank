import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-route-guards";
import { getPaperQuestionsWithAnswers, upsertPaperQuestions } from "@/lib/papers-repo";
import { normalizePaperTheme } from "@/lib/paper-themes";

export const runtime = "nodejs";

/** List saved correct answers and themes (teachers only). */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  try {
    const questions = await getPaperQuestionsWithAnswers(id);
    if (!questions) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }
    return NextResponse.json({ questions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load questions." }, { status: 500 });
  }
}

type Body = {
  questions?: Array<{
    number?: unknown;
    correctAnswer?: unknown;
    theme?: unknown;
  }>;
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireTeacher(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rows = Array.isArray(body.questions) ? body.questions : [];
  const questions = rows.map((q) => ({
    number: typeof q.number === "number" ? q.number : NaN,
    correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer.toUpperCase() : "",
    theme: typeof q.theme === "string" ? q.theme : "",
  }));
  if (questions.length === 0) {
    return NextResponse.json({ error: "questions is required." }, { status: 400 });
  }
  for (const q of questions) {
    if (!Number.isInteger(q.number) || q.number < 1) {
      return NextResponse.json({ error: "question number must be a positive integer." }, { status: 400 });
    }
    if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
      return NextResponse.json({ error: "correctAnswer must be A/B/C/D." }, { status: 400 });
    }
    try {
      normalizePaperTheme(q.theme);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid theme.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
  try {
    await upsertPaperQuestions(
      id,
      questions.map((q) => ({
        number: q.number,
        correctAnswer: q.correctAnswer as "A" | "B" | "C" | "D",
        theme: q.theme,
      })),
    );
    return NextResponse.json({ ok: true, questionCount: questions.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update questions.";
    if (msg.includes("Theme") || msg.includes("theme")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update questions." }, { status: 500 });
  }
}
