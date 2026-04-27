"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api-client";
import { mainPageClassName } from "@/components/main-page-layout";
import { DEFAULT_PAPER_QUESTION_COUNT, type ExamSession, type PaperSummary } from "@/lib/paper-types";

export default function TeacherHomePage() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [yearFilter, setYearFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("year") ?? "all";
  });
  const [session, setSession] = useState<ExamSession>("MAY");
  const [dp1AtoCOnly, setDp1AtoCOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearAllSubmissionsBusy, setClearAllSubmissionsBusy] = useState(false);
  const availableYears = useMemo(
    () => Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a),
    [papers],
  );
  const effectiveYearFilter = useMemo(
    () => (yearFilter === "all" || availableYears.includes(Number(yearFilter)) ? yearFilter : "all"),
    [availableYears, yearFilter],
  );
  const filteredPapers = useMemo(
    () => (effectiveYearFilter === "all" ? papers : papers.filter((p) => String(p.year) === effectiveYearFilter)),
    [effectiveYearFilter, papers],
  );

  async function loadPapers() {
    const r = await apiFetchJson<{ papers: PaperSummary[] }>("/api/teacher/papers");
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setPapers(r.data.papers ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await apiFetchJson<{ papers: PaperSummary[] }>("/api/teacher/papers");
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPapers(r.data.papers ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (effectiveYearFilter === "all") {
      params.delete("year");
    } else {
      params.set("year", effectiveYearFilter);
    }
    const query = params.toString();
    const path = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", path);
  }, [effectiveYearFilter]);

  async function createNewPaper() {
    setSaving(true);
    setError(null);
    const r = await apiFetchJson<{ paper: PaperSummary }>("/api/teacher/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        year,
        session,
        questionCount: DEFAULT_PAPER_QUESTION_COUNT,
        dp1AtoCOnly,
      }),
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setTitle("");
    setDp1AtoCOnly(false);
    await loadPapers();
  }

  async function clearAllStudentPaperSubmissions() {
    if (
      !window.confirm(
        "Remove ALL student submissions for EVERY paper in the bank?\n\nAll students will be able to submit each paper again as if they had never taken it. Papers and questions are not deleted. The mistake library is not affected.\n\nThis cannot be undone.",
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        "Second confirmation: permanently delete every stored paper attempt for all students on all papers?",
      )
    ) {
      return;
    }
    setClearAllSubmissionsBusy(true);
    setError(null);
    const r = await apiFetchJson<{ ok: true; deletedCount: number }>("/api/teacher/clear-all-paper-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setClearAllSubmissionsBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await loadPapers();
  }

  return (
    <div className={mainPageClassName}>
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--duo-blue)]">Teacher</p>
        <h1 className="text-2xl font-extrabold text-[var(--duo-text)]">Shared paper bank</h1>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/teacher/papers-overview"
            className="inline-flex items-center justify-center rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-extrabold text-[var(--duo-green-dark)] shadow-[0_3px_0_0_rgba(0,0,0,0.06)] active:translate-y-0.5 active:shadow-none"
          >
            All papers — stats & theme mastery →
          </Link>
          <Link
            href="/teacher/mistakes"
            className="inline-flex items-center justify-center rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-extrabold text-[var(--duo-green-dark)] shadow-[0_3px_0_0_rgba(0,0,0,0.06)] active:translate-y-0.5 active:shadow-none"
          >
            Class mistake analytics →
          </Link>
        </div>
      </header>
      {error && (
        <p className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}
      <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">Create paper</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Paper title"
          className="mb-2 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
        />
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
          />
          <select
            value={session}
            onChange={(e) => setSession(e.target.value as ExamSession)}
            className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
          >
            <option value="MAY">MAY</option>
            <option value="NOV">NOV</option>
          </select>
        </div>
        <label className="mb-3 flex items-center gap-2 rounded-xl border-2 border-[#d8c9ff] bg-[#f8f3ff] px-3 py-2 text-xs font-bold text-[#5f4f8f]">
          <input
            type="checkbox"
            checked={dp1AtoCOnly}
            onChange={(e) => setDp1AtoCOnly(e.target.checked)}
            className="h-4 w-4"
          />
          DP1 EOY Exam Prep (score and mastery only count Themes A-C)
        </label>
        <button
          type="button"
          onClick={() => void createNewPaper()}
          disabled={saving}
          className="duo-btn-primary w-full py-2.5 text-sm disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create paper"}
        </button>
      </section>

      <section className="space-y-3">
        <div className="max-w-xs">
          <label htmlFor="teacher-paper-year-filter" className="mb-1 block text-xs font-extrabold text-[var(--duo-text)]">
            Filter by year
          </label>
          <select
            id="teacher-paper-year-filter"
            value={effectiveYearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-sm font-bold"
          >
            <option value="all">All years</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {filteredPapers.map((paper) => (
          <Link
            key={paper.id}
            href={`/teacher/${paper.id}`}
            className="block rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
          >
            <p className="text-base font-extrabold text-[var(--duo-text)]">
              {paper.year} {paper.session}
            </p>
            <p className="text-sm font-bold text-[var(--duo-text-muted)]">{paper.title}</p>
            <p className="mt-1 text-xs font-bold text-[var(--duo-blue)]">
              {paper.publishedAt ? "Published" : "Draft"}
            </p>
            {paper.dp1AtoCOnly && (
              <p className="mt-1 text-xs font-extrabold text-[#7d4cc9]">DP1 EOY Exam Prep · Themes A-C only</p>
            )}
          </Link>
        ))}
        {filteredPapers.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
            {papers.length === 0 ? "No papers yet." : "No papers for the selected year."}
          </p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border-2 border-[#ff9800] bg-[#fffaf2] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="text-sm font-extrabold text-[var(--duo-text)]">Reset all paper attempts</h2>
        <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
          Clears every student&apos;s submissions on every paper at once. Students can take each paper again. Does not
          delete papers, questions, or mistake-library entries.
        </p>
        <button
          type="button"
          onClick={() => void clearAllStudentPaperSubmissions()}
          disabled={clearAllSubmissionsBusy}
          className="mt-3 w-full rounded-xl border-2 border-[#ff9800] bg-white py-2.5 text-xs font-extrabold text-[#a60] disabled:opacity-60"
        >
          {clearAllSubmissionsBusy ? "Clearing…" : "Clear all students’ submissions (all papers)"}
        </button>
      </section>
    </div>
  );
}

