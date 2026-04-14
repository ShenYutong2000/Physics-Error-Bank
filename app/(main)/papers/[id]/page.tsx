"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetchJson } from "@/lib/api-client";
import { PaperThemeBreakdownTable } from "@/components/paper-theme-breakdown";
import { mainPageClassName } from "@/components/main-page-layout";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { ChoiceOption, PaperSummary, PaperThemeCountRow, TagMasteryRow } from "@/lib/paper-types";

type WrongQuestion = {
  questionNumber: number;
  studentAnswer: ChoiceOption;
  correctAnswer: ChoiceOption;
  theme: string;
};

const CHOICES: ChoiceOption[] = ["A", "B", "C", "D", "BLANK"];

export default function PaperAttemptPage() {
  const params = useParams<{ id: string }>();
  const paperId = String(params.id ?? "");
  const [paper, setPaper] = useState<PaperSummary | null>(null);
  const [questions, setQuestions] = useState<Array<{ number: number }>>([]);
  const [answers, setAnswers] = useState<Record<number, ChoiceOption>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    attemptId: string;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
    wrongQuestions: WrongQuestion[];
    correctTagMastery: TagMasteryRow[];
    classComparison?: {
      studentCount: number;
      attemptCount: number;
      averageAccuracy: number;
      classTagMastery: TagMasteryRow[];
    };
  } | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Array<{
      questionNumber: number;
      answer: ChoiceOption;
      correctAnswer: ChoiceOption;
      isCorrect: boolean;
    }>
  >([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [themeQuestionCounts, setThemeQuestionCounts] = useState<PaperThemeCountRow[]>([]);
  const [showOnlyWeakThemes, setShowOnlyWeakThemes] = useState(false);
  const classMasteryByTag = useMemo(
    () => new Map((result?.classComparison?.classTagMastery ?? []).map((r) => [r.tag, r])),
    [result?.classComparison?.classTagMastery],
  );
  const displayedThemeComparisonRows = useMemo(() => {
    const rows = result?.correctTagMastery ?? [];
    if (!showOnlyWeakThemes) return rows;
    return rows.filter((row) => {
      const classPct = classMasteryByTag.get(row.tag)?.masteryPercent ?? 0;
      return row.masteryPercent < classPct;
    });
  }, [classMasteryByTag, result?.correctTagMastery, showOnlyWeakThemes]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      const r = await apiFetchJson<{
        paper: PaperSummary;
        questions: Array<{ number: number }>;
        themeQuestionCounts: PaperThemeCountRow[];
        existingAttempt?: {
          attemptId: string;
          correctCount: number;
          wrongCount: number;
          accuracy: number;
          wrongQuestions: WrongQuestion[];
          correctTagMastery: TagMasteryRow[];
          classComparison?: {
            studentCount: number;
            attemptCount: number;
            averageAccuracy: number;
            classTagMastery: TagMasteryRow[];
          };
          themeQuestionCounts: PaperThemeCountRow[];
          submittedAnswers: Array<{
            questionNumber: number;
            answer: ChoiceOption;
            correctAnswer: ChoiceOption;
            isCorrect: boolean;
          }>;
        } | null;
        classComparison?: {
          studentCount: number;
          attemptCount: number;
          averageAccuracy: number;
          classTagMastery: TagMasteryRow[];
        };
      }>(
        `/api/papers/${encodeURIComponent(paperId)}`,
        {
          signal: controller.signal,
          timeoutMs: 12_000,
        },
      );
      setLoading(false);
      if (!r.ok) {
        if (r.error === "Request cancelled.") return;
        setError(r.error);
        return;
      }
      setPaper(r.data.paper);
      setQuestions(r.data.questions ?? []);
      setThemeQuestionCounts(r.data.themeQuestionCounts ?? []);
      const answerMap = Object.fromEntries((r.data.questions ?? []).map((q) => [q.number, "BLANK"])) as Record<
        number,
        ChoiceOption
      >;
      setAnswers(answerMap);
      if (r.data.existingAttempt) {
        setAlreadySubmitted(true);
        setResult({
          attemptId: r.data.existingAttempt.attemptId,
          correctCount: r.data.existingAttempt.correctCount,
          wrongCount: r.data.existingAttempt.wrongCount,
          accuracy: r.data.existingAttempt.accuracy,
          wrongQuestions: r.data.existingAttempt.wrongQuestions,
          correctTagMastery: r.data.existingAttempt.correctTagMastery,
          classComparison: r.data.classComparison,
        });
        setSubmittedAnswers(r.data.existingAttempt.submittedAnswers);
      } else {
        setAlreadySubmitted(false);
        setResult(null);
        setSubmittedAnswers([]);
      }
    })();
    return () => controller.abort();
  }, [paperId]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v !== "BLANK").length,
    [answers],
  );
  const submittedAnsweredCount = useMemo(
    () => submittedAnswers.filter((a) => a.answer !== "BLANK").length,
    [submittedAnswers],
  );

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload = {
      answers: questions.map((q) => ({
        questionNumber: q.number,
        answer: answers[q.number] ?? "BLANK",
      })),
    };
    const r = await apiFetchJson<{
      attemptId: string;
      correctCount: number;
      wrongCount: number;
      accuracy: number;
      wrongQuestions: WrongQuestion[];
      correctTagMastery: TagMasteryRow[];
      themeQuestionCounts: PaperThemeCountRow[];
      classComparison?: {
        studentCount: number;
        attemptCount: number;
        averageAccuracy: number;
        classTagMastery: TagMasteryRow[];
      };
    }>(`/api/papers/${encodeURIComponent(paperId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeoutMs: 15_000,
      timeoutMessage: "Submitting is taking too long. Please check network and try again.",
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setResult(r.data);
    setThemeQuestionCounts(r.data.themeQuestionCounts ?? []);
  }

  if (loading) {
    return <div className={`${mainPageClassName} text-sm font-bold text-[var(--duo-text-muted)]`}>Loading paper...</div>;
  }

  return (
    <div className={mainPageClassName}>
      <div className="mb-3 rounded-xl border-2 border-[#ff9800] bg-[#fff4e5] px-3 py-2 text-sm font-extrabold text-[#a60]">
        Each paper can only be submitted once.
      </div>
      {paper && (
        <header className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--duo-blue)]">Paper</p>
          <h1 className="text-2xl font-extrabold text-[var(--duo-text)]">
            {paper.year} {paper.session}
          </h1>
          <p className="text-sm font-bold text-[var(--duo-text-muted)]">
            {paper.title} · {(alreadySubmitted ? submittedAnsweredCount : answeredCount)}/{questions.length} answered
          </p>
        </header>
      )}
      {error && (
        <p className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}
      {alreadySubmitted && (
        <p className="mb-3 rounded-xl border-2 border-[#ff9800] bg-[#fff4e5] px-3 py-2 text-sm font-extrabold text-[#a60]">
          You have already submitted this paper. Showing your only submission.
        </p>
      )}
      <section className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <div className="space-y-2">
          {(alreadySubmitted
            ? submittedAnswers
            : questions.map((q) => ({
                questionNumber: q.number,
                answer: answers[q.number] ?? ("BLANK" as ChoiceOption),
                correctAnswer: "BLANK" as ChoiceOption,
                isCorrect: false,
              }))
          ).map((q) => (
            <div key={q.questionNumber} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--duo-surface)] p-2">
              <span className="text-sm font-extrabold text-[var(--duo-text)]">Q{q.questionNumber}</span>
              {alreadySubmitted ? (
                <span
                  className={`rounded-lg border-2 px-2 py-1 text-sm font-bold ${
                    q.answer === "BLANK"
                      ? "border-[var(--duo-border)] bg-white text-[var(--duo-text-muted)]"
                      : q.isCorrect
                        ? "border-[#7a84ff] bg-[#ecebff] text-[#3f4fcf]"
                        : "border-[#ff4b4b] bg-[#ffe8e8] text-[#c00]"
                  }`}
                  title={
                    q.answer === "BLANK"
                      ? "No answer submitted"
                      : q.isCorrect
                        ? "Correct answer"
                        : `Wrong answer. Correct: ${q.correctAnswer}`
                  }
                >
                  {q.answer === "BLANK" ? "-" : q.answer}
                </span>
              ) : (
                <select
                  value={answers[q.questionNumber] ?? "BLANK"}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.questionNumber]: e.target.value as ChoiceOption }))
                  }
                  className="rounded-lg border-2 border-[var(--duo-border)] bg-white px-2 py-1 text-sm font-bold"
                >
                  {CHOICES.map((c) => (
                    <option key={c} value={c}>
                      {c === "BLANK" ? "-" : c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </section>
      {!alreadySubmitted && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="duo-btn-primary mt-4 w-full py-3 text-base disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit answers"}
        </button>
      )}

      {result && (
        <section className="mt-6 space-y-4">
          <Link
            href="/papers/overview"
            className="block rounded-2xl border-b-[6px] border-[#4a56c7] bg-gradient-to-br from-[#7a84ff] via-[#8b5cf6] to-[#3ecbff] p-4 text-white shadow-[0_6px_0_0_rgba(0,0,0,0.12)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_0_rgba(0,0,0,0.12)]"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/90">Next step</p>
            <p className="mt-1 text-lg font-black leading-snug">View stats for all published papers</p>
            <p className="mt-1 text-sm font-bold text-white/90">
              Class question rates and your theme mastery across every paper.
            </p>
            <span className="mt-4 flex w-full items-center justify-center rounded-xl border-2 border-white/40 bg-white py-3 text-base font-black text-[#4454c8]">
              Open paper overview →
            </span>
          </Link>

          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <p className="text-lg font-extrabold text-[var(--duo-text)]">
              Score: {result.correctCount}/{result.correctCount + result.wrongCount} ({result.accuracy}%)
            </p>
            <p className="text-sm font-bold text-[var(--duo-text-muted)]">
              Wrong: {result.wrongCount}
            </p>
            {result.classComparison && (
              <p className="mt-1 text-sm font-bold text-[var(--duo-text-muted)]">
                Class avg: {result.classComparison.averageAccuracy}% ({result.classComparison.studentCount} students)
              </p>
            )}
          </div>
          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <PaperThemeBreakdownTable
              themeQuestionCounts={themeQuestionCounts}
              masteryRows={result.correctTagMastery}
              title="This paper — questions & your results by theme"
              description="How many questions each theme has on this paper, and how many you answered correctly."
              correctColumnLabel="You (correct / on paper)"
              scoreMode="perPaper"
            />
          </div>
          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">Theme mastery (correct rate)</h2>
            <TagStatsChart
              rows={result.correctTagMastery}
              emptyMessage="No answers yet."
              ariaLabel="Bar chart of mastery rate per syllabus theme"
            />
          </div>
          <div className="rounded-2xl border-2 border-[#d8c9ff] bg-gradient-to-br from-[#faf6ff] via-white to-[#fff9ff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-[var(--duo-text)]">This paper: you vs class by theme</h2>
              <span className="text-[11px] font-bold text-[#6b5a95]">Delta = you - class</span>
            </div>
            <label className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--duo-text-muted)]">
              <input
                type="checkbox"
                checked={showOnlyWeakThemes}
                onChange={(e) => setShowOnlyWeakThemes(e.target.checked)}
                className="h-4 w-4 accent-[#7a84ff]"
              />
              Only show weak themes (below class baseline)
            </label>
            {(result.classComparison?.classTagMastery ?? []).length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-white px-4 py-6 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                Class comparison will appear when submissions are available.
              </p>
            ) : displayedThemeComparisonRows.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-white px-4 py-6 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                {showOnlyWeakThemes
                  ? "Great work. No weak themes below class baseline on this paper."
                  : "No theme comparison data yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {displayedThemeComparisonRows.map((row) => {
                  const classPct = classMasteryByTag.get(row.tag)?.masteryPercent ?? 0;
                  const delta = Number((row.masteryPercent - classPct).toFixed(1));
                  const deltaClass =
                    delta >= 10
                      ? "border-[#c92a2a] bg-[#ffe8e8] text-[#b42318]"
                      : delta >= 3
                        ? "border-[#e67700] bg-[#fff4e5] text-[#a65b00]"
                        : delta <= -10
                          ? "border-[#2b8a3e] bg-[#e6f9ec] text-[#1f6f31]"
                          : delta <= -3
                            ? "border-[#2f9e44] bg-[#f0fff4] text-[#2b8a3e]"
                            : "border-[#b6d4fe] bg-[#eef6ff] text-[#1c6ed6]";
                  return (
                    <div key={row.tag} className="rounded-lg border border-[#eadfff] bg-white px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[var(--duo-text)]">{row.tag}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold tabular-nums ${deltaClass}`}>
                          {delta >= 0 ? "+" : ""}
                          {delta}%
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#6b5a95]">You {row.masteryPercent}%</span>
                        <span className="text-[var(--duo-text-muted)]">Class {classPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">Wrong questions</h2>
            <div className="space-y-2">
              {result.wrongQuestions.map((w) => (
                <div key={w.questionNumber} className="rounded-xl bg-[var(--duo-surface)] p-2">
                  <p className="text-sm font-bold text-[var(--duo-text)]">
                    Q{w.questionNumber}: Your {w.studentAnswer}, Correct {w.correctAnswer}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--duo-text-muted)]">{w.theme || "(No theme)"}</p>
                </div>
              ))}
              {result.wrongQuestions.length === 0 && (
                <p className="text-sm font-bold text-[#4454c8]">Perfect score. No wrong questions.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

