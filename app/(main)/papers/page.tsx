"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api-client";
import { replaceUrlWithQuery } from "@/lib/client-url";
import { PaperBankPageHeader } from "@/components/paper-bank-page-header";
import { mainPageClassName } from "@/components/main-page-layout";
import { PaperModeToggle } from "@/components/paper-mode-toggle";
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
    replaceUrlWithQuery({
      year: effectiveYearFilter === "all" ? null : effectiveYearFilter,
      prep: prepScope === "all" ? null : prepScope,
    });
  }, [effectiveYearFilter, prepScope]);

  return (
    <div
      className={`${mainPageClassName} transition-colors duration-300 ${
        prepScope === "dp1"
          ? "rounded-3xl border border-[#e2d5ff] bg-gradient-to-br from-[#fdfbff] via-[#faf6ff] to-[#f5f7ff]"
          : ""
      }`}
    >
      <PaperBankPageHeader
        eyebrow="Past papers"
        title="Choose a paper"
        description="Enter A/B/C/D answers for each question, submit, and review your wrong-tag distribution."
        links={[
          { href: "/papers/overview", label: "All papers — stats & theme mastery →" },
          { href: "/library", label: "Mistake library →" },
        ]}
        right={
          <PaperModeToggle
            value={prepScope}
            onChange={setPrepScope}
            className="w-full max-w-[28rem] shrink-0 lg:ml-auto"
            summaryText={prepScope === "dp1" ? "Showing only DP1 EOY Exam Prep papers." : "Showing all published papers."}
          />
        }
      />
      <div className="mb-6 mt-3 max-w-xs">
        <label htmlFor="student-paper-year-filter" className="mb-1 block text-xs font-extrabold text-[var(--duo-text)]">
          Filter by year
        </label>
        <select
          id="student-paper-year-filter"
          value={effectiveYearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className={`w-full rounded-xl border-2 px-3 py-2 text-sm font-bold ${
            prepScope === "dp1" ? "border-[#d7c1ff] bg-[#fcf8ff]" : "border-[var(--duo-border)] bg-white"
          }`}
        >
          <option value="all">All years</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
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
            className={`block rounded-2xl border-2 p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)] transition-colors ${
              prepScope === "dp1"
                ? "border-[#d9c6ff] bg-gradient-to-br from-white via-[#fdfaff] to-[#f8f2ff]"
                : "border-[var(--duo-border)] bg-white"
            }`}
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

