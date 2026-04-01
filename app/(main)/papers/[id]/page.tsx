"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetchJson } from "@/lib/api-client";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { ChoiceOption, PaperSummary, TagMasteryRow } from "@/lib/paper-types";

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

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const r = await apiFetchJson<{
        paper: PaperSummary;
        questions: Array<{ number: number }>;
        existingAttempt?: {
          attemptId: string;
          correctCount: number;
          wrongCount: number;
          accuracy: number;
          wrongQuestions: WrongQuestion[];
          correctTagMastery: TagMasteryRow[];
          submittedAnswers: Array<{
            questionNumber: number;
            answer: ChoiceOption;
            correctAnswer: ChoiceOption;
            isCorrect: boolean;
          }>;
        } | null;
      }>(
        `/api/papers/${encodeURIComponent(paperId)}`,
      );
      setLoading(false);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPaper(r.data.paper);
      setQuestions(r.data.questions ?? []);
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
        });
        setSubmittedAnswers(r.data.existingAttempt.submittedAnswers);
      } else {
        setAlreadySubmitted(false);
        setResult(null);
        setSubmittedAnswers([]);
      }
    })();
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
    }>(`/api/papers/${encodeURIComponent(paperId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setResult(r.data);
  }

  if (loading) {
    return <div className="mx-auto max-w-lg px-4 pb-28 pt-6 text-sm font-bold text-[var(--duo-text-muted)]">Loading paper...</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
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
                        ? "border-[#4caf50] bg-[#e9fbe9] text-[#1f7a1f]"
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
          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <p className="text-lg font-extrabold text-[var(--duo-text)]">
              Score: {result.correctCount}/{result.correctCount + result.wrongCount} ({result.accuracy}%)
            </p>
            <p className="text-sm font-bold text-[var(--duo-text-muted)]">
              Wrong: {result.wrongCount}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">Theme mastery (correct rate)</h2>
            <TagStatsChart
              rows={result.correctTagMastery}
              emptyMessage="No answers yet."
              ariaLabel="Bar chart of mastery rate per syllabus theme"
            />
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
                <p className="text-sm font-bold text-[var(--duo-green-dark)]">Perfect score. No wrong questions.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

