"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api-client";
import { mainPageClassName } from "@/components/main-page-layout";
import type { PaperSummary } from "@/lib/paper-types";

type PrepScope = "all" | "dp1";

export default function PapersPage() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [yearFilter, setYearFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("year") ?? "all";
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prepScope, setPrepScope] = useState<PrepScope>(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("prep") === "dp1" ? "dp1" : "all";
  });
  const scopedPapers = useMemo(
    () => (prepScope === "dp1" ? papers.filter((p) => p.dp1AtoCOnly) : papers),
    [papers, prepScope],
  );
  const availableYears = useMemo(
    () => Array.from(new Set(scopedPapers.map((p) => p.year))).sort((a, b) => b - a),
    [scopedPapers],
  );
  const effectiveYearFilter = useMemo(
    () => (yearFilter === "all" || availableYears.includes(Number(yearFilter)) ? yearFilter : "all"),
    [availableYears, yearFilter],
  );
  const filteredPapers = useMemo(
    () =>
      effectiveYearFilter === "all"
        ? scopedPapers
        : scopedPapers.filter((p) => String(p.year) === effectiveYearFilter),
    [effectiveYearFilter, scopedPapers],
  );

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      const result = await apiFetchJson<{ papers: PaperSummary[] }>("/api/papers", {
        signal: controller.signal,
        timeoutMs: 10_000,
      });
      setLoading(false);
      if (!result.ok) {
        if (result.error === "Request cancelled.") return;
        setError(result.error);
        return;
      }
      setPapers(result.data.papers ?? []);
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (effectiveYearFilter === "all") {
      params.delete("year");
    } else {
      params.set("year", effectiveYearFilter);
    }
    if (prepScope === "all") {
      params.delete("prep");
    } else {
      params.set("prep", prepScope);
    }
    const query = params.toString();
    const path = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", path);
  }, [effectiveYearFilter, prepScope]);

  return (
    <div className={mainPageClassName}>
      <Link
        href="/papers/overview"
        className="mb-6 block rounded-2xl border-b-[6px] border-[#4a56c7] bg-gradient-to-br from-[#7a84ff] via-[#8b5cf6] to-[#3ecbff] p-4 text-white shadow-[0_6px_0_0_rgba(0,0,0,0.12)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_0_rgba(0,0,0,0.12)]"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 border-white/30 bg-white/20 text-2xl"
            aria-hidden
          >
            📊
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/90">Paper stats & mastery</p>
            <p className="mt-1 text-lg font-black leading-snug">See all papers at a glance</p>
            <p className="mt-1 text-sm font-bold text-white/90">
              Class question rates + your theme mastery across every published paper.
            </p>
          </div>
        </div>
        <span className="mt-4 flex w-full items-center justify-center rounded-xl border-2 border-white/40 bg-white py-3 text-base font-black text-[#4454c8] shadow-inner">
          Open overview →
        </span>
      </Link>

      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">Past papers</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">Choose a paper</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Enter A/B/C/D answers for each question, submit, and review your wrong-tag distribution.
        </p>
        <div className="mt-4 rounded-2xl border-2 border-[#d8c9ff] bg-gradient-to-br from-[#f7f3ff] via-white to-[#fdf8ff] p-3 shadow-[0_3px_0_0_rgba(0,0,0,0.06)]">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#5f4f8f]">Paper mode</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPrepScope("all")}
              className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-black ${
                prepScope === "all"
                  ? "border-[#4a56c7] bg-gradient-to-r from-[#5d6bff] via-[#7a84ff] to-[#4a56c7] text-white"
                  : "border-[var(--duo-border)] bg-white text-[var(--duo-text)]"
              }`}
            >
              All papers
            </button>
            <button
              type="button"
              onClick={() => setPrepScope("dp1")}
              className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-black ${
                prepScope === "dp1"
                  ? "border-[#7d4cc9] bg-gradient-to-r from-[#7d4cc9] via-[#8d5cf6] to-[#6f42c1] text-white"
                  : "border-[#d8c9ff] bg-white text-[#5f4f8f]"
              }`}
            >
              DP1 only (Themes A-C)
            </button>
          </div>
          <p className="mt-2 text-xs font-bold text-[#5f4f8f]">
            {prepScope === "dp1" ? "Showing only DP1 EOY Exam Prep papers." : "Showing all published papers."}
          </p>
        </div>
        <div className="mt-3 max-w-xs">
          <label htmlFor="student-paper-year-filter" className="mb-1 block text-xs font-extrabold text-[var(--duo-text)]">
            Filter by year
          </label>
          <select
            id="student-paper-year-filter"
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
      </header>
      {loading && <p className="text-sm font-bold text-[var(--duo-text-muted)]">Loading papers...</p>}
      {error && (
        <p className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {filteredPapers.map((paper) => (
          <Link
            key={paper.id}
            href={`/papers/${paper.id}`}
            className="block rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
          >
            <p className="text-lg font-extrabold text-[var(--duo-text)]">
              {paper.year} {paper.session}
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--duo-text-muted)]">{paper.title}</p>
            <p className="mt-2 text-xs font-bold text-[var(--duo-blue)]">{paper.questionCount} questions</p>
            {paper.dp1AtoCOnly && (
              <span className="mt-2 inline-flex rounded-full border-2 border-[#7d4cc9] bg-[#f3edff] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#5f4f8f]">
                DP1 only · Themes A-C counted
              </span>
            )}
          </Link>
        ))}
      </div>
      {!loading && filteredPapers.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
          {papers.length === 0
            ? "No papers published yet."
            : prepScope === "dp1"
              ? "No DP1 papers for the selected year."
              : "No papers for the selected year."}
        </p>
      )}
    </div>
  );
}

