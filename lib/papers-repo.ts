import { prisma } from "@/lib/db";
import {
  DEFAULT_PAPER_QUESTION_COUNT,
  normalizePaperChoice,
  type ChoiceOption,
  type ExamSession,
  type TagMasteryRow,
  type PaperSummary,
  type PaperThemeCountRow,
  type PublishedPaperQuestionStat,
  type PublishedPaperStatsRow,
} from "@/lib/paper-types";
import { canonicalizePaperThemeLabel, normalizePaperTheme, PAPER_THEME_LABELS } from "@/lib/paper-themes";

const DP1_EOY_INCLUDED_THEME_LABELS = new Set<string>([
  "Theme A - Space, Time, and Motion",
  "Theme B - The Particulate Nature of Matter",
  "Theme C - Wave Behavior",
]);

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
  dp1AtoCOnly: boolean;
  publishedAt: Date | null;
}): PaperSummary {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    session: row.session,
    questionCount: row.questionCount,
    dp1AtoCOnly: row.dp1AtoCOnly,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

function shouldIncludeThemeForScoring(theme: string, dp1AtoCOnly: boolean): boolean {
  if (!dp1AtoCOnly) return true;
  const canonical = canonicalizePaperThemeLabel(theme);
  return DP1_EOY_INCLUDED_THEME_LABELS.has(canonical);
}

function sortThemesBySyllabusOrder(rows: PaperThemeCountRow[]): PaperThemeCountRow[] {
  const order = new Map(PAPER_THEME_LABELS.map((t, i) => [t, i]));
  return [...rows].sort((a, b) => {
    const ia = order.get(a.theme);
    const ib = order.get(b.theme);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return a.theme.localeCompare(b.theme, "en");
  });
}

/** Count questions per theme on a paper (from stored question rows). */
export function buildPaperThemeQuestionCounts(questions: Array<{ theme: string }>): PaperThemeCountRow[] {
  const map = new Map<string, number>();
  for (const q of questions) {
    const t = canonicalizePaperThemeLabel(q.theme);
    if (!t) continue;
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return sortThemesBySyllabusOrder(
    Array.from(map.entries()).map(([theme, questionCount]) => ({ theme, questionCount })),
  );
}

export async function getPaperThemeQuestionCounts(paperId: string): Promise<PaperThemeCountRow[]> {
  const rows = await prisma.paperQuestion.findMany({
    where: { paperId },
    select: { theme: true },
  });
  return buildPaperThemeQuestionCounts(rows);
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
      dp1AtoCOnly: true,
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
  dp1AtoCOnly?: boolean;
  createdById: string;
}): Promise<PaperSummary> {
  const row = await prisma.paper.create({
    data: {
      title: input.title.trim(),
      year: input.year,
      session: input.session,
      questionCount: input.questionCount,
      dp1AtoCOnly: input.dp1AtoCOnly ?? false,
      createdById: input.createdById,
    },
    select: {
      id: true,
      title: true,
      year: true,
      session: true,
      questionCount: true,
      dp1AtoCOnly: true,
      publishedAt: true,
    },
  });
  return toPaperSummary(row);
}

/** Teacher view: all saved keys for one paper (empty array if none). */
export async function getPaperQuestionsWithAnswers(
  paperId: string,
): Promise<Array<{ number: number; correctAnswer: ChoiceOption; theme: string }> | null> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true },
  });
  if (!paper) return null;
  const rows = await prisma.paperQuestion.findMany({
    where: { paperId },
    orderBy: { number: "asc" },
    select: { number: true, correctAnswer: true, theme: true },
  });
  return rows.map((r) => ({
    number: r.number,
    correctAnswer: r.correctAnswer as ChoiceOption,
    theme: r.theme,
  }));
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
      dp1AtoCOnly: true,
      publishedAt: true,
    },
  });
  return toPaperSummary(row);
}

export type DeletePaperResult = "deleted" | "not_found";

/** Deletes paper, questions, and all student attempts (cascade). Any teacher may delete (API enforces TEACHER role). */
export async function deletePaperForTeacher(paperId: string): Promise<DeletePaperResult> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true },
  });
  if (!paper) return "not_found";
  await prisma.paper.delete({ where: { id: paperId } });
  return "deleted";
}

export type ClearPaperAttemptsResult = "not_found" | { ok: true; deletedCount: number };

/**
 * Deletes all student `PaperAttempt` rows (and answers) for one paper. The paper and its questions stay.
 * Any teacher may clear (API enforces TEACHER role).
 */
export async function clearStudentAttemptsForPaper(paperId: string): Promise<ClearPaperAttemptsResult> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true },
  });
  if (!paper) return "not_found";
  const result = await prisma.paperAttempt.deleteMany({
    where: {
      paperId,
      user: { role: "STUDENT" },
    },
  });
  return { ok: true, deletedCount: result.count };
}

/** Deletes every student paper attempt across all papers. Papers and questions are unchanged. */
export async function clearAllStudentPaperAttemptsEverywhere(): Promise<{ deletedCount: number }> {
  const result = await prisma.paperAttempt.deleteMany({
    where: { user: { role: "STUDENT" } },
  });
  return { deletedCount: result.count };
}

export async function getPaperForAnswering(paperId: string): Promise<{
  paper: PaperSummary;
  questions: Array<{ number: number }>;
  themeQuestionCounts: PaperThemeCountRow[];
} | null> {
  const row = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      questions: {
        select: { number: true, theme: true },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!row || !row.publishedAt) return null;
  return {
    paper: toPaperSummary(row),
    questions: row.questions.map((q) => ({ number: q.number })),
    themeQuestionCounts: buildPaperThemeQuestionCounts(row.questions),
  };
}

export async function getStudentPaperAttemptSummary(paperId: string, userId: string) {
  const row = await prisma.paperAttempt.findFirst({
    where: { paperId, userId },
    orderBy: { submittedAt: "desc" },
    include: { answers: true, paper: { select: { dp1AtoCOnly: true } } },
  });
  if (!row) return null;
  const gradedAnswers = row.answers.filter((a) => shouldIncludeThemeForScoring(a.themeSnapshot, row.paper.dp1AtoCOnly));
  const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = gradedAnswers.length - correctCount;
  const accuracy = gradedAnswers.length > 0 ? Number(((correctCount / gradedAnswers.length) * 100).toFixed(2)) : 0;
  const wrongQuestions = row.answers
    .filter((a) => !a.isCorrect && shouldIncludeThemeForScoring(a.themeSnapshot, row.paper.dp1AtoCOnly))
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
  const themeQuestionCounts = await getPaperThemeQuestionCounts(paperId);
  return {
    attemptId: row.id,
    submittedAt: row.submittedAt.toISOString(),
    correctCount,
    wrongCount,
    accuracy,
    gradableQuestionCount: gradedAnswers.length,
    wrongQuestions,
    correctTagMastery: toThemeMasteryRows(
      gradedAnswers.map((a) => ({ theme: a.themeSnapshot, isCorrect: a.isCorrect })),
    ),
    themeQuestionCounts,
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
  gradableQuestionCount: number;
  correctTagMastery: TagMasteryRow[];
  themeQuestionCounts: PaperThemeCountRow[];
}> {
  const paper = await prisma.paper.findUnique({
    where: { id: input.paperId },
    select: {
      publishedAt: true,
      dp1AtoCOnly: true,
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
  const gradable = judged.filter((j) => shouldIncludeThemeForScoring(j.theme, paper.dp1AtoCOnly));
  const correctCount = gradable.filter((j) => j.isCorrect).length;
  const wrongQuestions = gradable
    .filter((j) => !j.isCorrect)
    .map(({ questionNumber, studentAnswer, correctAnswer, theme }) => ({
      questionNumber,
      studentAnswer,
      correctAnswer,
      theme,
    }));
  const wrongCount = wrongQuestions.length;
  const accuracy = gradable.length > 0 ? Number(((correctCount / gradable.length) * 100).toFixed(2)) : 0;
  const correctTagMastery = toThemeMasteryRows(gradable.map((j) => ({ theme: j.theme, isCorrect: j.isCorrect })));
  const themeQuestionCounts = buildPaperThemeQuestionCounts(paper.questions);

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
    gradableQuestionCount: gradable.length,
    correctTagMastery,
    themeQuestionCounts,
  };
}

export async function getAttemptDetail(attemptId: string, userId: string) {
  const row = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { answers: true, paper: { select: { dp1AtoCOnly: true } } },
  });
  if (!row) return null;
  const gradedAnswers = row.answers.filter((a) => shouldIncludeThemeForScoring(a.themeSnapshot, row.paper.dp1AtoCOnly));
  const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = gradedAnswers.length - correctCount;
  const accuracy = gradedAnswers.length > 0 ? Number(((correctCount / gradedAnswers.length) * 100).toFixed(2)) : 0;
  const themeQuestionCounts = await getPaperThemeQuestionCounts(row.paperId);
  const wrongQuestions = row.answers
    .filter((a) => !a.isCorrect && shouldIncludeThemeForScoring(a.themeSnapshot, row.paper.dp1AtoCOnly))
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
      correctCount,
      wrongCount,
      accuracy,
      gradableQuestionCount: gradedAnswers.length,
    },
    wrongQuestions,
    correctTagMastery: toThemeMasteryRows(
      gradedAnswers.map((a) => ({ theme: a.themeSnapshot, isCorrect: a.isCorrect })),
    ),
    themeQuestionCounts,
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
      dp1AtoCOnly: true,
      publishedAt: true,
      questions: { select: { theme: true } },
    },
  });
  if (!paper) return null;
  const themeQuestionCounts = buildPaperThemeQuestionCounts(paper.questions);
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
    attempts.flatMap((a) =>
      a.answers
        .filter((ans) => shouldIncludeThemeForScoring(ans.themeSnapshot, paper.dp1AtoCOnly))
        .map((ans) => ({ theme: ans.themeSnapshot, isCorrect: ans.isCorrect })),
    ),
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
        latestAccuracy: (() => {
          const graded = attempt.answers.filter((a) => shouldIncludeThemeForScoring(a.themeSnapshot, paper.dp1AtoCOnly));
          if (graded.length === 0) return 0;
          const correct = graded.filter((a) => a.isCorrect).length;
          return Number(((correct / graded.length) * 100).toFixed(2));
        })(),
        answers: attempt.answers
          .filter((a) => shouldIncludeThemeForScoring(a.themeSnapshot, paper.dp1AtoCOnly))
          .map((a) => ({ themeSnapshot: a.themeSnapshot, isCorrect: a.isCorrect })),
      });
      return;
    }
    existing.attemptCount += 1;
    existing.answers.push(
      ...attempt.answers
        .filter((a) => shouldIncludeThemeForScoring(a.themeSnapshot, paper.dp1AtoCOnly))
        .map((a) => ({ themeSnapshot: a.themeSnapshot, isCorrect: a.isCorrect })),
    );
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
    ? Number(
        (
          attempts.reduce((sum, a) => {
            const graded = a.answers.filter((ans) => shouldIncludeThemeForScoring(ans.themeSnapshot, paper.dp1AtoCOnly));
            if (graded.length === 0) return sum;
            const correct = graded.filter((ans) => ans.isCorrect).length;
            return sum + (correct / graded.length) * 100;
          }, 0) / attempts.length
        ).toFixed(2),
      )
    : 0;
  return {
    paper: toPaperSummary(paper),
    themeQuestionCounts,
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

/** Student-safe class aggregate for one paper (no per-student detail). */
export async function getPaperClassComparisonStats(paperId: string): Promise<{
  studentCount: number;
  attemptCount: number;
  averageAccuracy: number;
  classTagMastery: TagMasteryRow[];
}> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { dp1AtoCOnly: true },
  });
  if (!paper) {
    return { studentCount: 0, attemptCount: 0, averageAccuracy: 0, classTagMastery: [] };
  }
  const attempts = await prisma.paperAttempt.findMany({
    where: {
      paperId,
      isLatest: true,
      user: { role: "STUDENT" },
    },
    select: {
      userId: true,
      accuracy: true,
      answers: { select: { themeSnapshot: true, isCorrect: true } },
    },
  });
  const studentIds = new Set(attempts.map((a) => a.userId));
  const attemptCount = attempts.length;
  const averageAccuracy =
    attemptCount > 0
      ? Number(
          (
            attempts.reduce((sum, a) => {
              const graded = a.answers.filter((ans) => shouldIncludeThemeForScoring(ans.themeSnapshot, paper.dp1AtoCOnly));
              if (graded.length === 0) return sum;
              const correct = graded.filter((ans) => ans.isCorrect).length;
              return sum + (correct / graded.length) * 100;
            }, 0) / attemptCount
          ).toFixed(2),
        )
      : 0;
  const classTagMastery = toThemeMasteryRows(
    attempts.flatMap((a) =>
      a.answers
        .filter((ans) => shouldIncludeThemeForScoring(ans.themeSnapshot, paper.dp1AtoCOnly))
        .map((ans) => ({ theme: ans.themeSnapshot, isCorrect: ans.isCorrect })),
    ),
  );
  return {
    studentCount: studentIds.size,
    attemptCount,
    averageAccuracy,
    classTagMastery,
  };
}

/** All published papers: per-question correct rate across students (latest attempt per student per paper). */
export async function getPublishedPapersAggregateQuestionStats(onlyDp1Prep = false): Promise<PublishedPaperStatsRow[]> {
  const papers = await prisma.paper.findMany({
    where: {
      publishedAt: { not: null },
      ...(onlyDp1Prep ? { dp1AtoCOnly: true } : {}),
    },
    orderBy: [{ year: "desc" }, { session: "desc" }],
    include: {
      questions: { select: { number: true }, orderBy: { number: "asc" } },
    },
  });
  if (papers.length === 0) return [];

  const paperIds = papers.map((p) => p.id);
  const attempts = await prisma.paperAttempt.findMany({
    where: {
      paperId: { in: paperIds },
      isLatest: true,
      user: { role: "STUDENT" },
    },
    select: {
      paperId: true,
      paper: { select: { dp1AtoCOnly: true } },
      answers: {
        select: { questionNumber: true, isCorrect: true, themeSnapshot: true },
      },
    },
  });

  const byPaper = new Map<string, { attemptCount: number; accuracySum: number; correctByQuestion: Map<number, number> }>();
  for (const att of attempts) {
    let agg = byPaper.get(att.paperId);
    if (!agg) {
      agg = { attemptCount: 0, accuracySum: 0, correctByQuestion: new Map<number, number>() };
      byPaper.set(att.paperId, agg);
    }
    agg.attemptCount += 1;
    const gradedAnswers = att.answers.filter((ans) =>
      shouldIncludeThemeForScoring(ans.themeSnapshot, att.paper.dp1AtoCOnly),
    );
    const correctInAttempt = gradedAnswers.filter((ans) => ans.isCorrect).length;
    agg.accuracySum += gradedAnswers.length > 0 ? (correctInAttempt / gradedAnswers.length) * 100 : 0;
    for (const ans of gradedAnswers.filter((a) => a.isCorrect)) {
      agg.correctByQuestion.set(ans.questionNumber, (agg.correctByQuestion.get(ans.questionNumber) ?? 0) + 1);
    }
  }

  const out: PublishedPaperStatsRow[] = [];
  for (const paper of papers) {
    const agg = byPaper.get(paper.id);
    const attemptCount = agg?.attemptCount ?? 0;
    const nums = paper.questions.map((q) => q.number);
    const questions: PublishedPaperQuestionStat[] = nums.map((questionNumber) => {
      const correctCount = agg?.correctByQuestion.get(questionNumber) ?? 0;
      const correctRatePercent =
        attemptCount > 0 ? Number(((correctCount / attemptCount) * 100).toFixed(1)) : 0;
      return {
        questionNumber,
        correctCount,
        attemptCount,
        correctRatePercent,
      };
    });
    const averageAccuracy =
      attemptCount > 0
        ? Number(((agg?.accuracySum ?? 0) / attemptCount).toFixed(2))
        : 0;
    out.push({
      paper: toPaperSummary(paper),
      attemptCount,
      averageAccuracy,
      questions,
    });
  }
  return out;
}

/** Theme mastery across all published papers for one student (one attempt per paper). */
export async function getCrossPaperThemeMasteryForUser(userId: string, onlyDp1Prep = false): Promise<TagMasteryRow[]> {
  const attempts = await prisma.paperAttempt.findMany({
    where: {
      userId,
      isLatest: true,
      paper: {
        publishedAt: { not: null },
        ...(onlyDp1Prep ? { dp1AtoCOnly: true } : {}),
      },
    },
    include: { answers: true, paper: { select: { dp1AtoCOnly: true } } },
  });
  const items = attempts.flatMap((a) =>
    a.answers
      .filter((ans) => shouldIncludeThemeForScoring(ans.themeSnapshot, a.paper.dp1AtoCOnly))
      .map((ans) => ({ theme: ans.themeSnapshot, isCorrect: ans.isCorrect })),
  );
  return toThemeMasteryRows(items);
}

/** Class-wide theme mastery: all student answers on published papers (latest attempts). */
export async function getCrossPaperThemeMasteryClassWide(onlyDp1Prep = false): Promise<TagMasteryRow[]> {
  const attempts = await prisma.paperAttempt.findMany({
    where: {
      isLatest: true,
      user: { role: "STUDENT" },
      paper: {
        publishedAt: { not: null },
        ...(onlyDp1Prep ? { dp1AtoCOnly: true } : {}),
      },
    },
    include: { answers: true, paper: { select: { dp1AtoCOnly: true } } },
  });
  const items = attempts.flatMap((a) =>
    a.answers
      .filter((ans) => shouldIncludeThemeForScoring(ans.themeSnapshot, a.paper.dp1AtoCOnly))
      .map((ans) => ({ theme: ans.themeSnapshot, isCorrect: ans.isCorrect })),
  );
  return toThemeMasteryRows(items);
}

