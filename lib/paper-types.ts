/**
 * Paper / MCQ feature types. Kept separate from `lib/types.ts` so we do not
 * declare `ChoiceOption` there — that name is already exported by Prisma.
 */
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

export type { ChoiceOption } from "@prisma/client";
