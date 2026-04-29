"use client";

import { PaperQuestionBlock } from "@/components/paper-question-block";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { PublishedPaperStatsRow, TagMasteryRow } from "@/lib/paper-types";

type PrepScope = "all" | "dp1";

type Props = {
  prepScope: PrepScope;
  displayedTeacherClassMasteryRows: TagMasteryRow[];
  selectedStudentLabel: string | null;
  selectedLoading: boolean;
  hasSelectedData: boolean;
  displayedTeacherSelectedMasteryRows: TagMasteryRow[];
  effectiveTeacherYearFilter: string;
  teacherAvailableYears: number[];
  onTeacherYearFilterChange: (next: string) => void;
  classPaperCount: number;
  teacherPapers: PublishedPaperStatsRow[];
  visibleTeacherPapers: PublishedPaperStatsRow[];
  effectiveTeacherVisibleCount: number;
  onShowMore: () => void;
  onShowAll: () => void;
};

/** Teacher-only presentation block for stats, fed by precomputed view models. */
export function TeacherStatsSection({
  prepScope,
  displayedTeacherClassMasteryRows,
  selectedStudentLabel,
  selectedLoading,
  hasSelectedData,
  displayedTeacherSelectedMasteryRows,
  effectiveTeacherYearFilter,
  teacherAvailableYears,
  onTeacherYearFilterChange,
  classPaperCount,
  teacherPapers,
  visibleTeacherPapers,
  effectiveTeacherVisibleCount,
  onShowMore,
  onShowAll,
}: Props) {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-[#b6d4fe] bg-gradient-to-br from-[#eef6ff] via-white to-[#f6faff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <h2 className="mb-1 text-sm font-extrabold text-[var(--duo-text)]">Class theme mastery (baseline)</h2>
          <p className="mb-3 text-xs font-bold text-[#5c6b7a]">
            {prepScope === "dp1"
              ? "Class aggregate across DP1 EOY papers only."
              : "Always class aggregate across all published papers."}
          </p>
          {prepScope === "dp1" && (
            <span className="mb-2 inline-flex rounded-full border-2 border-[#7d4cc9] bg-[#f3edff] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#5f4f8f]">
              DP1 only · Themes A-C
            </span>
          )}
          <TagStatsChart
            rows={displayedTeacherClassMasteryRows}
            emptyMessage="No student answers on published papers yet."
            ariaLabel="Class theme mastery across published papers"
          />
        </div>
        <div className="rounded-2xl border-2 border-[#d8c9ff] bg-gradient-to-br from-[#f7f3ff] via-white to-[#fdf8ff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <h2 className="mb-1 text-sm font-extrabold text-[var(--duo-text)]">Selected student mastery</h2>
          {selectedStudentLabel ? (
            <p className="mb-3 text-xs font-bold text-[#5f4f8f]">{selectedStudentLabel}</p>
          ) : (
            <p className="mb-3 text-xs font-bold text-[#5f4f8f]">Choose a student above to compare against class baseline.</p>
          )}
          {selectedLoading ? (
            <div className="rounded-2xl border-2 border-dashed border-[#d8c9ff] bg-white px-4 py-8 text-center text-sm font-medium text-[var(--duo-text-muted)]">
              Loading selected student…
            </div>
          ) : hasSelectedData ? (
            <>
              {prepScope === "dp1" && (
                <span className="mb-2 inline-flex rounded-full border-2 border-[#7d4cc9] bg-[#f3edff] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#5f4f8f]">
                  DP1 only · Themes A-C
                </span>
              )}
              <TagStatsChart
                rows={displayedTeacherSelectedMasteryRows}
                emptyMessage="This student has no published-paper answers yet."
                ariaLabel="Selected student theme mastery across published papers"
              />
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-[#d8c9ff] bg-white px-4 py-8 text-center text-sm font-medium text-[var(--duo-text-muted)]">
              No student selected.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[var(--duo-text)]">
            {prepScope === "dp1" ? "DP1 EOY papers — question results (class)" : "All published papers — question results (class)"}
          </h2>
          <select
            value={effectiveTeacherYearFilter}
            onChange={(e) => onTeacherYearFilterChange(e.target.value)}
            className="rounded-lg border-2 border-[#b6d4fe] bg-[#f4f9ff] px-2 py-1 text-xs font-bold"
            aria-label="Filter teacher papers by year"
          >
            <option value="all">All years</option>
            {teacherAvailableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs font-bold text-[var(--duo-text-muted)]">
          Correct rate per question = students who got it right ÷ students who submitted this paper (latest attempt each).
        </p>
        {teacherPapers.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
            {classPaperCount === 0 ? "No published papers yet." : "No papers for the selected year."}
          </p>
        )}
        {visibleTeacherPapers.map((row) => (
          <PaperQuestionBlock key={row.paper.id} row={row} showTeacherDetailLink showStudentDetailLink={false} />
        ))}
        {teacherPapers.length > effectiveTeacherVisibleCount && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onShowMore}
              className="w-full rounded-xl border-2 border-[#b6d4fe] bg-[#eef6ff] py-2 text-xs font-extrabold text-[#1c6ed6]"
            >
              Show more papers ({effectiveTeacherVisibleCount}/{teacherPapers.length})
            </button>
            <button
              type="button"
              onClick={onShowAll}
              className="w-full rounded-xl border-2 border-[#b6d4fe] bg-white py-2 text-xs font-extrabold text-[#1c6ed6]"
            >
              Show all papers ({teacherPapers.length})
            </button>
          </div>
        )}
      </section>
    </>
  );
}

