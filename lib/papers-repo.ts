import { prisma } from "@/lib/db";
import {
  DEFAULT_PAPER_QUESTION_COUNT,
  normalizePaperChoice,
  type ChoiceOption,
  type ExamSession,
  type TagMasteryRow,
  type PaperSummary,
} from "@/lib/paper-types";
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

/** Objective mastery by theme: correct/total and percentage. */
function toThemeMasteryRows(items: Array<{ theme: string; isCorrect: boolean }>): TagMasteryRow[] {
  const map = new Map<string, { correct: number; total: number }>();
  items.forEach(({ theme, isCorrect }) => {
    const canonical = canonicalizePaperThemeLabel(theme);
    if (!canonical) return;
    const prev = map.get(canonical) ?? { correct: 0, total: 0 };
    const next = {
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    };
    map.set(canonical, next);
  });
  return Array.from(map.entries())
    .map(([tag, v]) => ({
      tag,
      correct: v.correct,
      total: v.total,
      masteryPercent: v.total > 0 ? Number(((v.correct / v.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.masteryPercent - a.masteryPercent || b.total - a.total || a.tag.localeCompare(b.tag, "en"));
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
      data: { questionCount: normalized.length || DEFAULT_PAPER_QUESTION_COUNT },
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

export type DeletePaperResult = "deleted" | "not_found" | "forbidden";

/** Deletes paper, questions, and all student attempts (cascade). Only the creating teacher may delete. */
export async function deletePaperForTeacher(paperId: string, teacherId: string): Promise<DeletePaperResult> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { createdById: true },
  });
  if (!paper) return "not_found";
  if (paper.createdById !== teacherId) return "forbidden";
  await prisma.paper.delete({ where: { id: paperId } });
  return "deleted";
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

export async function getStudentPaperAttemptSummary(paperId: string, userId: string) {
  const row = await prisma.paperAttempt.findFirst({
    where: { paperId, userId },
    orderBy: { submittedAt: "desc" },
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
  const submittedAnswers = row.answers
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .map((a) => ({
      questionNumber: a.questionNumber,
      answer: a.studentAnswer as ChoiceOption,
      correctAnswer: a.correctAnswer as ChoiceOption,
      isCorrect: a.isCorrect,
    }));
  return {
    attemptId: row.id,
    submittedAt: row.submittedAt.toISOString(),
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    accuracy: Number(row.accuracy),
    wrongQuestions,
    correctTagMastery: toThemeMasteryRows(
      row.answers.map((a) => ({ theme: a.themeSnapshot, isCorrect: a.isCorrect })),
    ),
    submittedAnswers,
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
  correctTagMastery: TagMasteryRow[];
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
  const existingAttempt = await prisma.paperAttempt.findFirst({
    where: { paperId: input.paperId, userId: input.userId },
    select: { id: true },
  });
  if (existingAttempt) {
    throw new Error("This paper has already been submitted by this student.");
  }
  const answersByNumber = new Map<number, ChoiceOption>();
  input.answers.forEach((a) => {
    answersByNumber.set(a.questionNumber, normalizePaperChoice(a.answer));
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
  const correctTagMastery = toThemeMasteryRows(judged.map((j) => ({ theme: j.theme, isCorrect: j.isCorrect })));

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
    correctTagMastery,
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
    correctTagMastery: toThemeMasteryRows(
      row.answers.map((a) => ({ theme: a.themeSnapshot, isCorrect: a.isCorrect })),
    ),
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
      answers: { select: { themeSnapshot: true, isCorrect: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  const overall = toThemeMasteryRows(
    attempts.flatMap((a) => a.answers.map((ans) => ({ theme: ans.themeSnapshot, isCorrect: ans.isCorrect }))),
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
      answers: Array<{ themeSnapshot: string; isCorrect: boolean }>;
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
        answers: attempt.answers.map((a) => ({ themeSnapshot: a.themeSnapshot, isCorrect: a.isCorrect })),
      });
      return;
    }
    existing.attemptCount += 1;
    existing.answers.push(...attempt.answers.map((a) => ({ themeSnapshot: a.themeSnapshot, isCorrect: a.isCorrect })));
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
      correctTagMastery: toThemeMasteryRows(
        s.answers.map((a) => ({ theme: a.themeSnapshot, isCorrect: a.isCorrect })),
      ),
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
      correctTagMastery: overall,
    },
    students,
  };
}

