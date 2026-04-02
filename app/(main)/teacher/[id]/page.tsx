"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetchJson } from "@/lib/api-client";
import { PaperThemeBreakdownTable } from "@/components/paper-theme-breakdown";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { ChoiceOption, PaperThemeCountRow, TagMasteryRow } from "@/lib/paper-types";
import { PAPER_THEME_LABELS, paperThemeToUploadToken } from "@/lib/paper-themes";

type MasterySort = "high_to_low" | "low_to_high";

type StudentListSort = "name_az" | "accuracy_high" | "accuracy_low";

function compareAccuracyHighToLow(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function compareAccuracyLowToHigh(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

type PaperQuestionKeyRow = {
  number: number;
  correctAnswer: string;
  theme: string;
};

function questionsToTextareaLines(questions: PaperQuestionKeyRow[]): string {
  if (questions.length === 0) return "";
  return questions
    .map((q) => `${q.number},${q.correctAnswer},${paperThemeToUploadToken(q.theme)}`)
    .join("\n");
}

type AnalyticsResponse = {
  paper: {
    id: string;
    title: string;
    year: number;
    session: "MAY" | "NOV";
    questionCount: number;
    publishedAt: string | null;
  };
  themeQuestionCounts: PaperThemeCountRow[];
  overall: {
    studentCount: number;
    correctTagMastery: TagMasteryRow[];
  };
  students: Array<{
    userId: string;
    name: string;
    email: string;
    latestAccuracy: number | null;
    correctTagMastery: TagMasteryRow[];
  }>;
};

export default function TeacherPaperDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const paperId = String(id ?? "");
  const [masterySort, setMasterySort] = useState<MasterySort>("high_to_low");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clearSubmissionsBusy, setClearSubmissionsBusy] = useState(false);
  const [questionsText, setQuestionsText] = useState("");
  const [answerKeyQuestions, setAnswerKeyQuestions] = useState<PaperQuestionKeyRow[]>([]);
  const [questionsKeyLoadState, setQuestionsKeyLoadState] = useState<"idle" | "loading" | "ready">("idle");
  const [paperMissing, setPaperMissing] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentListSort, setStudentListSort] = useState<StudentListSort>("name_az");

  useEffect(() => {
    setStudentSearch("");
    setStudentListSort("name_az");
  }, [paperId]);

  const fetchAnalytics = useCallback(
    () => apiFetchJson<AnalyticsResponse>(`/api/teacher/papers/${encodeURIComponent(paperId)}/analytics?mode=latest`),
    [paperId],
  );

  const refreshQuestionsFromServer = useCallback(async () => {
    setQuestionsKeyLoadState("loading");
    const r = await apiFetchJson<{ questions: PaperQuestionKeyRow[] }>(
      `/api/teacher/papers/${encodeURIComponent(paperId)}/questions`,
    );
    if (!r.ok) {
      setQuestionsKeyLoadState("ready");
      return;
    }
    const qs = r.data.questions ?? [];
    setAnswerKeyQuestions(qs);
    setQuestionsText(questionsToTextareaLines(qs));
    setQuestionsKeyLoadState("ready");
  }, [paperId]);

  useEffect(() => {
    let cancelled = false;
    setQuestionsText("");
    setAnswerKeyQuestions([]);
    setQuestionsKeyLoadState("idle");
    void (async () => {
      const r = await fetchAnalytics();
      if (cancelled) return;
      if (!r.ok) {
        if (r.status === 404) {
          setPaperMissing(true);
          setError("Paper not found. Please reopen it from Teacher list.");
          return;
        }
        setPaperMissing(false);
        setError(r.error);
        return;
      }
      setPaperMissing(false);
      setError(null);
      setAnalytics(r.data);
      await refreshQuestionsFromServer();
    })();
    return () => {
      cancelled = true;
    };
  }, [paperId, fetchAnalytics, refreshQuestionsFromServer]);

  async function loadAnalytics() {
    const r = await fetchAnalytics();
    if (!r.ok) {
      if (r.status === 404) {
        setPaperMissing(true);
        setError("Paper not found. Please reopen it from Teacher list.");
        return;
      }
      setPaperMissing(false);
      setError(r.error);
      return;
    }
    setPaperMissing(false);
    setError(null);
    setAnalytics(r.data);
    await refreshQuestionsFromServer();
  }

  const parsedQuestions = useMemo(() => {
    const lines = questionsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.map((line) => {
      const parts = line.split(",").map((x) => x.trim());
      const n = parts[0];
      const answerRaw = parts[1];
      const theme = parts[2] ?? "";
      const answer = answerRaw?.toUpperCase() as ChoiceOption;
      return {
        number: Number(n),
        correctAnswer: answer,
        theme,
      };
    });
  }, [questionsText]);

  const sortMasteryRows = useCallback(
    (rows: TagMasteryRow[]): TagMasteryRow[] =>
      [...rows].sort((a, b) => {
        if (masterySort === "high_to_low") {
          return b.masteryPercent - a.masteryPercent || b.total - a.total || a.tag.localeCompare(b.tag, "en");
        }
        return a.masteryPercent - b.masteryPercent || b.total - a.total || a.tag.localeCompare(b.tag, "en");
      }),
    [masterySort],
  );

  const displayedStudents = useMemo(() => {
    const list = analytics?.students ?? [];
    const q = studentSearch.trim().toLowerCase();
    const filtered = !q
      ? [...list]
      : list.filter((s) => {
          const name = (s.name ?? "").toLowerCase();
          const email = (s.email ?? "").toLowerCase();
          return name.includes(q) || email.includes(q);
        });

    if (studentListSort === "name_az") {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "en"));
    } else if (studentListSort === "accuracy_high") {
      filtered.sort(
        (a, b) =>
          compareAccuracyHighToLow(a.latestAccuracy, b.latestAccuracy) ||
          (a.name || "").localeCompare(b.name || "", "en"),
      );
    } else {
      filtered.sort(
        (a, b) =>
          compareAccuracyLowToHigh(a.latestAccuracy, b.latestAccuracy) ||
          (a.name || "").localeCompare(b.name || "", "en"),
      );
    }
    return filtered;
  }, [analytics?.students, studentSearch, studentListSort]);

  async function saveQuestions() {
    setSavingQuestions(true);
    setError(null);
    const r = await apiFetchJson<{ ok: true }>(
      `/api/teacher/papers/${encodeURIComponent(paperId)}/questions`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: parsedQuestions.map((q) => ({
            number: q.number,
            correctAnswer: q.correctAnswer,
            theme: q.theme,
          })),
        }),
      },
    );
    setSavingQuestions(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await loadAnalytics();
  }

  async function setPublish(publish: boolean) {
    setPublishBusy(true);
    setError(null);
    const r = await apiFetchJson<{ paper: { id: string } }>(
      `/api/teacher/papers/${encodeURIComponent(paperId)}/publish`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      },
    );
    setPublishBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await loadAnalytics();
  }

  async function clearStudentSubmissions() {
    const label = analytics
      ? `${analytics.paper.year} ${analytics.paper.session} — ${analytics.paper.title}`
      : "this paper";
    if (
      !window.confirm(
        `Clear all student submissions for ${label}?\n\nStudents will be able to submit this paper again. Their previous answers and scores for this paper will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    setClearSubmissionsBusy(true);
    setError(null);
    const r = await apiFetchJson<{ ok: true; deletedCount: number }>(
      `/api/teacher/papers/${encodeURIComponent(paperId)}/clear-submissions`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    setClearSubmissionsBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await loadAnalytics();
  }

  async function deletePaper() {
    const label = analytics
      ? `${analytics.paper.year} ${analytics.paper.session} — ${analytics.paper.title}`
      : "this paper";
    const extra =
      analytics?.paper.publishedAt != null
        ? "\n\nThis will remove the paper from students and permanently delete all submitted attempts for it."
        : "";
    if (!window.confirm(`Delete ${label}? This cannot be undone.${extra}`)) return;
    setDeleteBusy(true);
    setError(null);
    const r = await apiFetchJson<{ ok: true }>(`/api/teacher/papers/${encodeURIComponent(paperId)}`, {
      method: "DELETE",
    });
    setDeleteBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push("/teacher");
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <header className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--duo-blue)]">Teacher analytics</p>
        <h1 className="text-xl font-extrabold text-[var(--duo-text)]">
          {analytics ? `${analytics.paper.year} ${analytics.paper.session}` : "Loading..."}
        </h1>
        {analytics && <p className="text-sm font-bold text-[var(--duo-text-muted)]">{analytics.paper.title}</p>}
      </header>
      {error && (
        <div className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          <p>{error}</p>
          {paperMissing && (
            <button
              type="button"
              onClick={() => router.push("/teacher")}
              className="mt-2 rounded-lg border-2 border-[#c00] bg-white px-3 py-1.5 text-xs font-extrabold text-[#c00]"
            >
              Back to Teacher
            </button>
          )}
        </div>
      )}
      <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-2 text-sm font-extrabold text-[var(--duo-text)]">Question upload (one per line)</h2>
        <p className="mb-2 text-xs font-bold text-[var(--duo-text-muted)]">
          Correct answers and themes load from the server when you open this page (including after publish). Edit below
          and save to update; the table shows the same saved key.
        </p>
        <p className="mb-2 text-xs font-bold text-[var(--duo-text-muted)]">
          Format: <span className="font-mono">questionNumber,correctAnswer,themeCode</span>
          · theme code: <span className="font-mono">A</span>–<span className="font-mono">E</span> or{" "}
          <span className="font-mono">M</span> (Theme M - Measurement and Data Processing). Example:{" "}
          <span className="font-mono">1,A,A</span>
        </p>
        <textarea
          rows={6}
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] p-3 text-xs font-bold"
        />
        <p className="mt-1 text-[11px] font-bold text-[var(--duo-text-muted)]">
          Themes: {PAPER_THEME_LABELS.join(" · ")}
        </p>
        {questionsKeyLoadState === "loading" && (
          <p className="mt-3 text-xs font-bold text-[var(--duo-text-muted)]">Loading answer key…</p>
        )}
        {questionsKeyLoadState === "ready" && answerKeyQuestions.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-[var(--duo-text-muted)]">
              Saved answer key
            </h3>
            <div className="mt-2 max-h-56 overflow-auto rounded-xl border-2 border-[var(--duo-border)]">
              <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className="sticky top-0 border-b-2 border-[var(--duo-border)] bg-[var(--duo-surface)]">
                    <th className="px-2 py-2 font-extrabold text-[var(--duo-text)]">Q#</th>
                    <th className="px-2 py-2 font-extrabold text-[var(--duo-text)]">Correct</th>
                    <th className="px-2 py-2 font-extrabold text-[var(--duo-text)]">Theme</th>
                  </tr>
                </thead>
                <tbody>
                  {answerKeyQuestions.map((q) => (
                    <tr key={q.number} className="border-b border-[var(--duo-border)] last:border-b-0">
                      <td className="px-2 py-1.5 font-bold tabular-nums text-[var(--duo-text)]">{q.number}</td>
                      <td className="px-2 py-1.5 font-bold tabular-nums text-[var(--duo-text)]">{q.correctAnswer}</td>
                      <td className="px-2 py-1.5 font-bold text-[var(--duo-text-muted)]">{q.theme}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {questionsKeyLoadState === "ready" && answerKeyQuestions.length === 0 && analytics && (
          <p className="mt-3 text-xs font-bold text-[var(--duo-text-muted)]">
            No questions saved yet. Paste or type rows above, then Save questions.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void saveQuestions()}
            disabled={savingQuestions}
            className="duo-btn-primary flex-1 py-2 text-xs disabled:opacity-60"
          >
            {savingQuestions ? "Saving..." : "Save questions"}
          </button>
          <button
            type="button"
            onClick={() => void setPublish(true)}
            disabled={publishBusy}
            className="flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-2 text-xs font-extrabold"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => void setPublish(false)}
            disabled={publishBusy}
            className="flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-2 text-xs font-extrabold"
          >
            Unpublish
          </button>
        </div>
        <button
          type="button"
          onClick={() => void clearStudentSubmissions()}
          disabled={clearSubmissionsBusy || deleteBusy || publishBusy || savingQuestions}
          className="mt-3 w-full rounded-xl border-2 border-[#ff9800] bg-[#fff4e5] py-2.5 text-xs font-extrabold text-[#a60] disabled:opacity-60"
        >
          {clearSubmissionsBusy ? "Clearing…" : "Clear student submissions (allow retake)"}
        </button>
        <p className="mt-2 text-[11px] font-bold text-[var(--duo-text-muted)]">
          Removes every student&apos;s answers and scores for this paper only. The paper stays published; students can
          submit again.
        </p>
        <button
          type="button"
          onClick={() => void deletePaper()}
          disabled={deleteBusy || clearSubmissionsBusy || publishBusy || savingQuestions}
          className="mt-3 w-full rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] py-2.5 text-xs font-extrabold text-[#c00] disabled:opacity-60"
        >
          {deleteBusy ? "Deleting..." : "Delete paper"}
        </button>
        <p className="mt-2 text-[11px] font-bold text-[var(--duo-text-muted)]">
          Deleting removes questions and all student scores for this paper. To fix content without losing data, use
          Unpublish, edit, then Publish again.
        </p>
      </section>
      {analytics && analytics.themeQuestionCounts.length > 0 && (
        <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <PaperThemeBreakdownTable
            themeQuestionCounts={analytics.themeQuestionCounts}
            masteryRows={analytics.overall.correctTagMastery}
            title="This paper — questions & class results by theme"
            description="Questions per theme on this paper, and class-wide correct answers (all student attempts included in totals)."
            correctColumnLabel="Class (correct / total)"
            scoreMode="aggregate"
          />
        </section>
      )}
      <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[var(--duo-text)]">Overall theme mastery (correct rate)</h2>
          <div className="flex gap-2">
            <select
              value={masterySort}
              onChange={(e) => setMasterySort(e.target.value as MasterySort)}
              className="rounded-lg border-2 border-[var(--duo-border)] px-2 py-1 text-xs font-bold"
              aria-label="Sort mastery chart rows"
            >
              <option value="high_to_low">Mastery: High to low</option>
              <option value="low_to_high">Mastery: Low to high</option>
            </select>
          </div>
        </div>
        {analytics && <p className="mb-2 text-xs font-bold text-[var(--duo-text-muted)]">{analytics.overall.studentCount} students</p>}
        <TagStatsChart
          rows={sortMasteryRows(analytics?.overall.correctTagMastery ?? [])}
          emptyMessage="No answers yet."
          ariaLabel="Bar chart of mastery rate per syllabus theme"
        />
      </section>
      {analytics && (
        <section className="space-y-3" aria-label="Student submissions">
          <div className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-extrabold text-[var(--duo-text)]">Student submissions</h2>
            <p className="mt-1 text-xs font-bold text-[var(--duo-text-muted)]">
              Search by display name or email to find a student quickly.
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Search students</span>
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search name or email…"
                autoComplete="off"
                className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2.5 text-sm font-bold placeholder:text-[var(--duo-text-muted)]"
                aria-label="Filter students by name or email"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-extrabold text-[var(--duo-text)]">Sort list</span>
              <select
                value={studentListSort}
                onChange={(e) => setStudentListSort(e.target.value as StudentListSort)}
                className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
                aria-label="Sort students by name or accuracy"
              >
                <option value="name_az">Name (A–Z)</option>
                <option value="accuracy_high">Accuracy (high to low)</option>
                <option value="accuracy_low">Accuracy (low to high)</option>
              </select>
            </label>
            {analytics.students.length > 0 && (
              <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
                Showing {displayedStudents.length} of {analytics.students.length}
                {studentSearch.trim() ? " (filtered)" : ""}
              </p>
            )}
          </div>
          {analytics.students.length > 0 && displayedStudents.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-6 text-center text-sm font-bold text-[var(--duo-text-muted)]">
              No students match &ldquo;{studentSearch.trim()}&rdquo;. Try another name or email.
            </p>
          )}
          {displayedStudents.map((s) => (
            <div
              key={s.userId}
              className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-extrabold text-[var(--duo-text)]">{s.name || "(Unnamed)"}</p>
                {s.latestAccuracy != null && (
                  <span className="shrink-0 rounded-lg border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-2 py-0.5 text-xs font-extrabold tabular-nums text-[var(--duo-green-dark)]">
                    {s.latestAccuracy}%
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-[var(--duo-text-muted)]">{s.email}</p>
              {analytics.themeQuestionCounts.length > 0 && (
                <div className="mt-2">
                  <PaperThemeBreakdownTable
                    themeQuestionCounts={analytics.themeQuestionCounts}
                    masteryRows={s.correctTagMastery}
                    title="By theme (this paper)"
                    correctColumnLabel="Correct / on paper"
                    scoreMode="perPaper"
                  />
                </div>
              )}
              <div className="mt-2">
                <TagStatsChart
                  rows={sortMasteryRows(s.correctTagMastery)}
                  emptyMessage="No answers in this slice."
                  ariaLabel="Bar chart of mastery rate per syllabus theme for one student"
                />
              </div>
            </div>
          ))}
          {analytics.students.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
              No student submissions yet for this paper.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

