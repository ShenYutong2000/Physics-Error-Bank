"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetchJson } from "@/lib/api-client";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { ChoiceOption, TagCountRow } from "@/lib/paper-types";
import { PAPER_THEME_LABELS } from "@/lib/paper-themes";

type Mode = "latest" | "all";

type AnalyticsResponse = {
  paper: {
    id: string;
    title: string;
    year: number;
    session: "MAY" | "NOV";
    questionCount: number;
    publishedAt: string | null;
  };
  mode: Mode;
  overall: {
    studentCount: number;
    attemptCount: number;
    averageAccuracy: number;
    wrongTagCounts: TagCountRow[];
  };
  students: Array<{
    userId: string;
    name: string;
    email: string;
    attemptCount: number;
    latestAttemptId: string | null;
    latestSubmittedAt: string | null;
    latestAccuracy: number | null;
    wrongTagCounts: TagCountRow[];
  }>;
};

export default function TeacherPaperDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const paperId = String(id ?? "");
  const [mode, setMode] = useState<Mode>("latest");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [questionsText, setQuestionsText] = useState("1,A,A\n2,B,B");

  const fetchAnalytics = useCallback(
    (nextMode: Mode) =>
      apiFetchJson<AnalyticsResponse>(
        `/api/teacher/papers/${encodeURIComponent(paperId)}/analytics?mode=${nextMode}`,
      ),
    [paperId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchAnalytics(mode);
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setAnalytics(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [paperId, mode, fetchAnalytics]);

  async function loadAnalytics(nextMode: Mode) {
    const r = await fetchAnalytics(nextMode);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setAnalytics(r.data);
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
    await loadAnalytics(mode);
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
    await loadAnalytics(mode);
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
        <p className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}
      <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-2 text-sm font-extrabold text-[var(--duo-text)]">Question upload (one per line)</h2>
        <p className="mb-2 text-xs font-bold text-[var(--duo-text-muted)]">
          Format: <span className="font-mono">questionNumber,correctAnswer,themeCode</span>
          · theme code: <span className="font-mono">A</span>–<span className="font-mono">E</span> or{" "}
          <span className="font-mono">G</span> (Theme M - Measurement and Data Processing). Example:{" "}
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
          onClick={() => void deletePaper()}
          disabled={deleteBusy || publishBusy || savingQuestions}
          className="mt-3 w-full rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] py-2.5 text-xs font-extrabold text-[#c00] disabled:opacity-60"
        >
          {deleteBusy ? "Deleting..." : "Delete paper"}
        </button>
        <p className="mt-2 text-[11px] font-bold text-[var(--duo-text-muted)]">
          Deleting removes questions and all student scores for this paper. To fix content without losing data, use
          Unpublish, edit, then Publish again.
        </p>
      </section>
      <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[var(--duo-text)]">Overall wrong-theme distribution</h2>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="rounded-lg border-2 border-[var(--duo-border)] px-2 py-1 text-xs font-bold"
          >
            <option value="latest">Latest only</option>
            <option value="all">All attempts</option>
          </select>
        </div>
        {analytics && (
          <p className="mb-2 text-xs font-bold text-[var(--duo-text-muted)]">
            {analytics.overall.studentCount} students · {analytics.overall.attemptCount} attempts · avg{" "}
            {analytics.overall.averageAccuracy}%
          </p>
        )}
        <TagStatsChart
          rows={analytics?.overall.wrongTagCounts ?? []}
          emptyMessage="No wrong answers yet."
          ariaLabel="Bar chart of wrong answers per syllabus theme"
        />
      </section>
      <section className="space-y-3">
        {analytics?.students.map((s) => (
          <div
            key={s.userId}
            className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
          >
            <p className="text-sm font-extrabold text-[var(--duo-text)]">{s.name || "(Unnamed)"}</p>
            <p className="text-xs font-bold text-[var(--duo-text-muted)]">{s.email}</p>
            <p className="mt-1 text-xs font-bold text-[var(--duo-blue)]">
              Latest: {s.latestAccuracy ?? "-"}% · Attempts: {s.attemptCount}
            </p>
            <div className="mt-2">
              <TagStatsChart
                rows={s.wrongTagCounts}
                emptyMessage="No wrong themes in this slice."
                ariaLabel="Bar chart of wrong answers per syllabus theme for one student"
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

