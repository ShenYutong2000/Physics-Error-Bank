/**
 * Paper / MCQ feature types. Kept separate from `lib/types.ts` so we do not
 * declare `ChoiceOption` there — that name is already exported by Prisma.
 */
import type { ChoiceOption } from "@prisma/client";

/** Default MCQ count for new papers and when question upload is empty. */
export const DEFAULT_PAPER_QUESTION_COUNT = 40;

export type ExamSession = "MAY" | "NOV";

export type PaperSummary = {
  id: string;
  title: string;
  year: number;
  session: ExamSession;
  questionCount: number;
  publishedAt: string | null;
};

export type TagCountRow = { tag: string; count: number };
export type TagMasteryRow = {
  tag: string;
  correct: number;
  total: number;
  masteryPercent: number;
};

export type { ChoiceOption };

/** Normalize client/API answer strings to a stored choice (or BLANK). */
export function normalizePaperChoice(raw: string): ChoiceOption {
  const v = raw.trim().toUpperCase();
  if (v === "A" || v === "B" || v === "C" || v === "D") return v;
  return "BLANK";
}
