import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/api-route-guards";
import { submitPaperAttempt } from "@/lib/papers-repo";
import type { ChoiceOption } from "@/lib/paper-types";

function toChoiceOption(raw: string): ChoiceOption {
  const v = raw.trim().toUpperCase();
  if (v === "A" || v === "B" || v === "C" || v === "D") return v;
  return "BLANK";
}

export const runtime = "nodejs";

type SubmitBody = {
  answers?: Array<{ questionNumber?: unknown; answer?: unknown }>;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireStudent(request);
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const answers = Array.isArray(body.answers)
    ? body.answers
        .map((a) => ({
          questionNumber: typeof a.questionNumber === "number" ? a.questionNumber : NaN,
          answer: typeof a.answer === "string" ? toChoiceOption(a.answer) : ("BLANK" as const),
        }))
        .filter((a) => Number.isFinite(a.questionNumber) && a.questionNumber > 0)
    : [];
  try {
    const result = await submitPaperAttempt({
      paperId: id,
      userId: guard.user.id,
      answers,
    });
    return NextResponse.json({ paperId: id, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit paper.";
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not submit paper." }, { status: 500 });
  }
}

