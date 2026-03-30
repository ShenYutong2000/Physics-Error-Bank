import { prisma } from "@/lib/db";
import type { ChoiceOption, ExamSession, PaperSummary, TagCountRow } from "@/lib/paper-types";
import { canonicalizePaperThemeLabel, normalizePaperTheme } from "@/lib/paper-themes";

type PaperQuestionInput = {
  number: number;
  correctAnswer: ChoiceOption;
  theme: string;
};

type SubmitAnswerInput = {
  questionNumber: number;
  answer: ChoiceOption;
};

function toPaperSummary(row: {
  id: string;
  title: string;
  year: number;
  session: ExamSession;
  questionCount: number;
  publishedAt: Date | null;
}): PaperSummary {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    session: row.session,
    questionCount: row.questionCount,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

function normalizeChoice(value: string): ChoiceOption {
  const v = value.trim().toUpperCase();
  if (v === "A" || v === "B" || v === "C" || v === "D") return v;
  return "BLANK";
}

/** One theme label per wrong answer (Theme A–E or Theme M). */
function toThemeCountRows(themes: string[]): TagCountRow[] {
  const map = new Map<string, number>();
  themes.forEach((theme) => {
    const canonical = canonicalizePaperThemeLabel(theme);
    if (!canonical) return;
    map.set(canonical, (map.get(canonical) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "en"));
}

export async function listPapers(input: { includeUnpublished: boolean }): Promise<PaperSummary[]> {
  const rows = await prisma.paper.findMany({
    where: input.includeUnpublished ? undefined : { publishedAt: { not: null } },
    orderBy: [{ year: "desc" }, { session: "desc" }],
    select: {
      id: true,
      title: true,
      year: true,
      session: true,
      questionCount: true,
      publishedAt: true,
    },
  });
  return rows.map(toPaperSummary);
}

export async function createPaper(input: {
  title: string;
  year: number;
  session: ExamSession;
  questionCount: number;
  createdById: string;
}): Promise<PaperSummary> {
  const row = await prisma.paper.create({
    data: {
      title: input.title.trim(),
      year: input.year,
      session: input.session,
      questionCount: input.questionCount,
      createdById: input.createdById,
    },
    select: {
      id: true,
      title: true,
      year: true,
      session: true,
      questionCount: true,
      publishedAt: true,
    },
  });
  return toPaperSummary(row);
}

export async function upsertPaperQuestions(paperId: string, questions: PaperQuestionInput[]): Promise<void> {
  const normalized = questions
    .map((q) => ({
      number: q.number,
      correctAnswer: q.correctAnswer === "BLANK" ? ("A" as ChoiceOption) : q.correctAnswer,
      theme: normalizePaperTheme(q.theme),
    }))
    .sort((a, b) => a.number - b.number);
  await prisma.$transaction(async (tx) => {
    await tx.paperQuestion.deleteMany({ where: { paperId } });
    if (normalized.length > 0) {
      await tx.paperQuestion.createMany({
        data: normalized.map((q) => ({
          paperId,
          number: q.number,
          correctAnswer: q.correctAnswer,
          theme: q.theme,
        })),
      });
    }
    await tx.paper.update({
      where: { id: paperId },
      data: { questionCount: normalized.length || 30 },
    });
  });
}

export async function publishPaper(paperId: string, publish: boolean): Promise<PaperSummary> {
  const row = await prisma.paper.update({
    where: { id: paperId },
    data: { publishedAt: publish ? new Date() : null },
    select: {
      id: true,
      title: true,
      year: true,
      session: true,
      questionCount: true,
      publishedAt: true,
    },
  });
  return toPaperSummary(row);
}

export async function getPaperForAnswering(paperId: string): Promise<{
  paper: PaperSummary;
  questions: Array<{ number: number }>;
} | null> {
  const row = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      questions: {
        select: { number: true },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!row || !row.publishedAt) return null;
  return {
    paper: toPaperSummary(row),
    questions: row.questions.map((q) => ({ number: q.number })),
  };
}

export async function submitPaperAttempt(input: {
  paperId: string;
  userId: string;
  answers: SubmitAnswerInput[];
}): Promise<{
  attemptId: string;
  submittedAt: string;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  wrongQuestions: Array<{
    questionNumber: number;
    studentAnswer: ChoiceOption;
    correctAnswer: ChoiceOption;
    theme: string;
  }>;
  wrongTagCounts: TagCountRow[];
}> {
  const paper = await prisma.paper.findUnique({
    where: { id: input.paperId },
    include: {
      questions: {
        orderBy: { number: "asc" },
        select: { number: true, correctAnswer: true, theme: true },
      },
    },
  });
  if (!paper || !paper.publishedAt) {
    throw new Error("Paper not found or not published.");
  }
  const answersByNumber = new Map<number, ChoiceOption>();
  input.answers.forEach((a) => {
    answersByNumber.set(a.questionNumber, normalizeChoice(a.answer));
  });
  const judged = paper.questions.map((q) => {
    const studentAnswer = answersByNumber.get(q.number) ?? "BLANK";
    const isCorrect = studentAnswer === q.correctAnswer;
    return {
      questionNumber: q.number,
      studentAnswer,
      correctAnswer: q.correctAnswer as ChoiceOption,
      isCorrect,
      theme: q.theme,
    };
  });
  const correctCount = judged.filter((j) => j.isCorrect).length;
  const wrongQuestions = judged
    .filter((j) => !j.isCorrect)
    .map(({ questionNumber, studentAnswer, correctAnswer, theme }) => ({
      questionNumber,
      studentAnswer,
      correctAnswer,
      theme,
    }));
  const wrongCount = wrongQuestions.length;
  const accuracy = paper.questions.length > 0 ? Number(((correctCount / paper.questions.length) * 100).toFixed(2)) : 0;
  const wrongTagCounts = toThemeCountRows(wrongQuestions.map((q) => q.theme));

  const result = await prisma.$transaction(async (tx) => {
    await tx.paperAttempt.updateMany({
      where: { paperId: input.paperId, userId: input.userId, isLatest: true },
      data: { isLatest: false },
    });
    const attempt = await tx.paperAttempt.create({
      data: {
        paperId: input.paperId,
        userId: input.userId,
        correctCount,
        wrongCount,
        accuracy,
        isLatest: true,
      },
      select: { id: true, submittedAt: true },
    });
    if (judged.length > 0) {
      await tx.paperAttemptAnswer.createMany({
        data: judged.map((j) => ({
          attemptId: attempt.id,
          questionNumber: j.questionNumber,
          studentAnswer: j.studentAnswer,
          correctAnswer: j.correctAnswer,
          isCorrect: j.isCorrect,
          themeSnapshot: j.theme,
        })),
      });
    }
    return attempt;
  });
  return {
    attemptId: result.id,
    submittedAt: result.submittedAt.toISOString(),
    correctCount,
    wrongCount,
    accuracy,
    wrongQuestions,
    wrongTagCounts,
  };
}

export async function getAttemptDetail(attemptId: string, userId: string) {
  const row = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: true },
  });
  if (!row) return null;
  const wrongQuestions = row.answers
    .filter((a) => !a.isCorrect)
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .map((a) => ({
      questionNumber: a.questionNumber,
      studentAnswer: a.studentAnswer as ChoiceOption,
      correctAnswer: a.correctAnswer as ChoiceOption,
      theme: a.themeSnapshot,
    }));
  return {
    attempt: {
      id: row.id,
      paperId: row.paperId,
      submittedAt: row.submittedAt.toISOString(),
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      accuracy: Number(row.accuracy),
    },
    wrongQuestions,
    wrongTagCounts: toThemeCountRows(wrongQuestions.map((q) => q.theme)),
  };
}

export async function getTeacherPaperAnalytics(paperId: string, mode: "latest" | "all") {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: {
      id: true,
      title: true,
      year: true,
      session: true,
      questionCount: true,
      publishedAt: true,
    },
  });
  if (!paper) return null;
  const attempts = await prisma.paperAttempt.findMany({
    where: {
      paperId,
      ...(mode === "latest" ? { isLatest: true } : {}),
      user: { role: "STUDENT" },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      answers: { where: { isCorrect: false }, select: { themeSnapshot: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  const overall = toThemeCountRows(
    attempts.flatMap((a) => a.answers.map((ans) => ans.themeSnapshot).filter(Boolean)),
  );
  const byStudent = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      attemptCount: number;
      latestAttemptId: string | null;
      latestSubmittedAt: string | null;
      latestAccuracy: number | null;
      themes: string[];
    }
  >();
  attempts.forEach((attempt) => {
    const existing = byStudent.get(attempt.userId);
    if (!existing) {
      byStudent.set(attempt.userId, {
        userId: attempt.userId,
        name: attempt.user.name,
        email: attempt.user.email,
        attemptCount: 1,
        latestAttemptId: attempt.id,
        latestSubmittedAt: attempt.submittedAt.toISOString(),
        latestAccuracy: Number(attempt.accuracy),
        themes: attempt.answers.map((a) => a.themeSnapshot).filter(Boolean),
      });
      return;
    }
    existing.attemptCount += 1;
    existing.themes.push(...attempt.answers.map((a) => a.themeSnapshot).filter(Boolean));
  });
  const students = Array.from(byStudent.values())
    .map((s) => ({
      userId: s.userId,
      name: s.name,
      email: s.email,
      attemptCount: s.attemptCount,
      latestAttemptId: s.latestAttemptId,
      latestSubmittedAt: s.latestSubmittedAt,
      latestAccuracy: s.latestAccuracy,
      wrongTagCounts: toThemeCountRows(s.themes),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  const averageAccuracy = attempts.length
    ? Number((attempts.reduce((sum, a) => sum + Number(a.accuracy), 0) / attempts.length).toFixed(2))
    : 0;
  return {
    paper: toPaperSummary(paper),
    mode,
    overall: {
      studentCount: byStudent.size,
      attemptCount: attempts.length,
      averageAccuracy,
      wrongTagCounts: overall,
    },
    students,
  };
}

