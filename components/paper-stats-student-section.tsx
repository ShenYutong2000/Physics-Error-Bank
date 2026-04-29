"use client";

import { PaperQuestionBlock } from "@/components/paper-question-block";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { PublishedPaperStatsRow, TagMasteryRow } from "@/lib/paper-types";

type PrepScope = "all" | "dp1";
type StudentPaperSort = "risk_high" | "risk_low" | "latest";

type StudentMasterySummary = {
  high: number;
  medium: number;
  low: number;
  weakest: TagMasteryRow[];
  strongest: TagMasteryRow[];
};

type Props = {
  prepScope: PrepScope;
  studentMasterySummary: StudentMasterySummary;
  displayedClassMasteryRowsForStudentView: TagMasteryRow[];
  displayedStudentMasteryRows: TagMasteryRow[];
  studentMasteryHeading: string;
  effectiveStudentYearFilter: string;
  onStudentYearFilterChange: (next: string) => void;
  studentAvailableYears: number[];
  studentPaperSort: StudentPaperSort;
  onStudentPaperSortChange: (next: StudentPaperSort) => void;
  displayedStudentPapers: PublishedPaperStatsRow[];
  visibleStudentPapers: PublishedPaperStatsRow[];
  effectiveStudentVisibleCount: number;
  onShowMore: () => void;
  onShowAll: () => void;
  allStudentPaperCount: number;
};

/** Student-only presentation block for stats, fed by precomputed view models. */
export function StudentStatsSection({
  prepScope,
  studentMasterySummary,
  displayedClassMasteryRowsForStudentView,
  displayedStudentMasteryRows,
  studentMasteryHeading,
  effectiveStudentYearFilter,
  onStudentYearFilterChange,
  studentAvailableYears,
  studentPaperSort,
  onStudentPaperSortChange,
  displayedStudentPapers,
  visibleStudentPapers,
  effectiveStudentVisibleCount,
  onShowMore,
  onShowAll,
  allStudentPaperCount,
}: Props) {
  return (
    <>
      <section className="rounded-2xl border-2 border-[#d8c9ff] bg-gradient-to-br from-[#f7f3ff] via-white to-[#fdf8ff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="text-sm font-extrabold text-[var(--duo-text)]">Your learning snapshot</h2>
        <p className="mt-1 text-xs font-bold text-[#6b5a95]">
          {prepScope === "dp1"
            ? "Quick view of your DP1 EOY (Themes A-C) mastery bands and what to revise first."
            : "Quick view of current theme mastery bands and what to revise first."}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border-2 border-[#b8f2c2] bg-[#ecfff1] px-3 py-2 text-sm font-bold text-[#1f6f31]">
            High mastery: <span className="tabular-nums">{studentMasterySummary.high}</span>
          </div>
          <div className="rounded-xl border-2 border-[#ffd8a8] bg-[#fff4e5] px-3 py-2 text-sm font-bold text-[#a65b00]">
            Medium mastery: <span className="tabular-nums">{studentMasterySummary.medium}</span>
          </div>
          <div className="rounded-xl border-2 border-[#ffc9c9] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#b42318]">
            Low mastery: <span className="tabular-nums">{studentMasterySummary.low}</span>
          </div>
        </div>
        {studentMasterySummary.weakest.length > 0 && (
          <div className="mt-3 rounded-xl border-2 border-[#eadfff] bg-white px-3 py-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#6b5a95]">Focus next</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {studentMasterySummary.weakest.map((r) => (
                <span
                  key={r.tag}
                  className="rounded-full border border-[#e6d8ff] bg-[#f7f1ff] px-2 py-0.5 text-xs font-extrabold text-[#5f4f8f]"
                >
                  {r.tag} {r.masteryPercent}%
                </span>
              ))}
            </div>
          </div>
        )}
        {studentMasterySummary.strongest.length > 0 && (
          <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
            Strongest themes: {studentMasterySummary.strongest.map((r) => `${r.tag} ${r.masteryPercent}%`).join(" · ")}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-[#b6d4fe] bg-gradient-to-br from-[#eef6ff] via-white to-[#f6faff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <h2 className="mb-1 text-sm font-extrabold text-[var(--duo-text)]">Class theme mastery (baseline)</h2>
          <p className="mb-3 text-xs font-bold text-[#5c6b7a]">
            {prepScope === "dp1" ? "Class aggregate across DP1 EOY papers only." : "Class aggregate across all published papers."}
          </p>
          {prepScope === "dp1" && (
            <span className="mb-2 inline-flex rounded-full border-2 border-[#7d4cc9] bg-[#f3edff] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#5f4f8f]">
              DP1 only · Themes A-C
            </span>
          )}
          <TagStatsChart
            rows={displayedClassMasteryRowsForStudentView}
            emptyMessage="Class baseline will appear after students submit published papers."
            ariaLabel="Class theme mastery across published papers"
          />
        </div>
        <div className="rounded-2xl border-2 border-[#d8c9ff] bg-gradient-to-br from-[#f7f3ff] via-white to-[#fdf8ff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <h2 className="mb-1 text-sm font-extrabold text-[var(--duo-text)]">{studentMasteryHeading}</h2>
          <p className="mb-3 text-xs font-bold text-[#5f4f8f]">Your results, aligned with the same theme order as class.</p>
          {prepScope === "dp1" && (
            <span className="mb-2 inline-flex rounded-full border-2 border-[#7d4cc9] bg-[#f3edff] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#5f4f8f]">
              DP1 only · Themes A-C
            </span>
          )}
          <TagStatsChart
            rows={displayedStudentMasteryRows}
            emptyMessage="Complete at least one published paper to see your theme mastery."
            ariaLabel="Your theme mastery across published papers"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[var(--duo-text)]">
            {prepScope === "dp1" ? "DP1 EOY papers — question results (class)" : "All published papers — question results (class)"}
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={effectiveStudentYearFilter}
              onChange={(e) => onStudentYearFilterChange(e.target.value)}
              className="rounded-lg border-2 border-[#b6d4fe] bg-[#f4f9ff] px-2 py-1 text-xs font-bold"
              aria-label="Filter student papers by year"
            >
              <option value="all">All years</option>
              {studentAvailableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={studentPaperSort}
              onChange={(e) => onStudentPaperSortChange(e.target.value as StudentPaperSort)}
              className="rounded-lg border-2 border-[#b6d4fe] bg-[#f4f9ff] px-2 py-1 text-xs font-bold"
              aria-label="Sort papers by risk level or recency"
            >
              <option value="risk_high">Prioritize weak papers</option>
              <option value="risk_low">Best-performing papers first</option>
              <option value="latest">Newest papers first</option>
            </select>
          </div>
        </div>
        <p className="text-xs font-bold text-[var(--duo-text-muted)]">
          Correct rate per question = students who got it right ÷ students who submitted this paper (latest attempt each).
        </p>
        {displayedStudentPapers.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
            {allStudentPaperCount === 0 ? "No published papers yet." : "No papers for the selected year."}
          </p>
        )}
        {visibleStudentPapers.map((row) => (
          <PaperQuestionBlock key={row.paper.id} row={row} showTeacherDetailLink={false} showStudentDetailLink />
        ))}
        {displayedStudentPapers.length > effectiveStudentVisibleCount && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onShowMore}
              className="w-full rounded-xl border-2 border-[#b6d4fe] bg-[#eef6ff] py-2 text-xs font-extrabold text-[#1c6ed6]"
            >
              Show more papers ({effectiveStudentVisibleCount}/{displayedStudentPapers.length})
            </button>
            <button
              type="button"
              onClick={onShowAll}
              className="w-full rounded-xl border-2 border-[#b6d4fe] bg-white py-2 text-xs font-extrabold text-[#1c6ed6]"
            >
              Show all papers ({displayedStudentPapers.length})
            </button>
          </div>
        )}
      </section>
    </>
  );
}

