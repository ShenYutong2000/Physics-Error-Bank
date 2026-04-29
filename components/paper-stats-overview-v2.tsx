"use client";

import { PaperBankPageHeader } from "@/components/paper-bank-page-header";
import { PaperModeToggle } from "@/components/paper-mode-toggle";
import { StudentStatsSection } from "@/components/paper-stats-student-section";
import { TeacherStatsSection } from "@/components/paper-stats-teacher-section";
import { type MasteryScope, usePaperStatsData } from "@/components/use-paper-stats-data";

/** Orchestrator view: wires hook data into teacher/student presentation sections. */
const VISIBLE_PAPERS_STEP = 8;

function masteryHeading(scope: MasteryScope, selectedName?: string): string {
  if (scope === "self") return "Your theme mastery (all published papers)";
  if (scope === "class") return "Class theme mastery (all published papers)";
  return `Theme mastery — ${selectedName ?? "student"}`;
}

export function PaperStatsOverviewPanel({ variant }: { variant: "student" | "teacher" }) {
  const {
    data,
    teacherData,
    error,
    filterNotice,
    loading,
    selectedLoading,
    studentId,
    prepScope,
    setPrepScope,
    onTeacherStudentChange,
    studentPaperSort,
    setStudentPaperSort,
    setStudentYearFilter,
    setTeacherYearFilter,
    displayedStudentMasteryRows,
    displayedClassMasteryRowsForStudentView,
    displayedTeacherClassMasteryRows,
    displayedTeacherSelectedMasteryRows,
    studentMasterySummary,
    studentAvailableYears,
    teacherAvailableYears,
    effectiveStudentYearFilter,
    effectiveTeacherYearFilter,
    displayedStudentPapers,
    teacherPapers,
    effectiveStudentVisibleCount,
    effectiveTeacherVisibleCount,
    visibleStudentPapers,
    visibleTeacherPapers,
    setStudentVisibleCount,
    setTeacherVisibleCount,
  } = usePaperStatsData(variant);

  const paperModeSummary =
    prepScope === "dp1"
      ? variant === "teacher"
        ? "Showing only DP1 EOY Exam Prep papers. Useful for quick DP1 planning."
        : "Showing only DP1 EOY Exam Prep papers. Mastery and scores use Themes A-C only."
      : variant === "teacher"
        ? "Showing all draft and published papers."
        : "Showing all published papers.";

  return (
    <div
      className={`space-y-6 transition-colors duration-300 ${
        prepScope === "dp1"
          ? "rounded-3xl border border-[#e2d5ff] bg-gradient-to-br from-[#fdfbff] via-[#faf6ff] to-[#f5f7ff] p-3 sm:p-4"
          : ""
      }`}
    >
      <PaperBankPageHeader
        eyebrow={variant === "teacher" ? "Teacher" : "Past papers"}
        title={variant === "teacher" ? "Shared paper bank" : "All papers — stats & mastery"}
        description={
          variant === "teacher"
            ? "Published-paper question statistics for the whole class, and theme mastery for the class or a selected student."
            : "Class-wide correct rate per question on every published paper, and your theme mastery across all papers you completed."
        }
        links={
          variant === "teacher"
            ? [
                { href: "/teacher", label: "Shared paper bank →" },
                { href: "/teacher/mistakes", label: "Class mistake analytics →" },
              ]
            : [
                { href: "/papers", label: "Choose a paper →" },
                { href: "/library", label: "Mistake library →" },
              ]
        }
        right={
          <PaperModeToggle
            value={prepScope}
            onChange={setPrepScope}
            disabled={loading}
            className="w-full max-w-[28rem] shrink-0 lg:ml-auto"
            summaryText={paperModeSummary}
          />
        }
      />
      {variant === "teacher" && (
        <div className="rounded-2xl border-2 border-[#cfe6ff] bg-gradient-to-br from-[#f8fbff] via-white to-[#f3fffb] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <label className="mb-2 block text-sm font-extrabold text-[var(--duo-text)]" htmlFor="paper-stats-student">
            Theme mastery scope
          </label>
          <select
            id="paper-stats-student"
            value={studentId}
            onChange={(e) => onTeacherStudentChange(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
            disabled={loading}
          >
            <option value="">Whole class (aggregate)</option>
            {(teacherData.classData?.students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.trim() ? s.name : s.email}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs font-bold text-[#5c6b7a]">
            Question statistics below always include all students who submitted. Theme bars follow your selection.
          </p>
        </div>
      )}

      {loading && <p className="text-sm font-bold text-[var(--duo-text-muted)]">Loading statistics...</p>}
      {error && (
        <p className="rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">{error}</p>
      )}
      {filterNotice && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border-2 border-[#ffd8a8] bg-[#fff4e5] px-3 py-2 text-sm font-bold text-[#a65b00]"
        >
          {filterNotice}
        </p>
      )}

      {variant === "teacher" && teacherData.classData && !loading && (
        <TeacherStatsSection
          prepScope={prepScope}
          displayedTeacherClassMasteryRows={displayedTeacherClassMasteryRows}
          selectedStudentLabel={
            teacherData.selectedData?.selectedStudent
              ? teacherData.selectedData.selectedStudent.name.trim() || teacherData.selectedData.selectedStudent.email
              : null
          }
          selectedLoading={selectedLoading}
          hasSelectedData={Boolean(teacherData.selectedData)}
          displayedTeacherSelectedMasteryRows={displayedTeacherSelectedMasteryRows}
          effectiveTeacherYearFilter={effectiveTeacherYearFilter}
          teacherAvailableYears={teacherAvailableYears}
          onTeacherYearFilterChange={setTeacherYearFilter}
          classPaperCount={teacherData.classData.papers.length}
          teacherPapers={teacherPapers}
          visibleTeacherPapers={visibleTeacherPapers}
          effectiveTeacherVisibleCount={effectiveTeacherVisibleCount}
          onShowMore={() => setTeacherVisibleCount((n) => n + VISIBLE_PAPERS_STEP)}
          onShowAll={() => setTeacherVisibleCount(teacherPapers.length)}
        />
      )}

      {variant === "student" && data && !loading && (
        <StudentStatsSection
          prepScope={prepScope}
          studentMasterySummary={studentMasterySummary}
          displayedClassMasteryRowsForStudentView={displayedClassMasteryRowsForStudentView}
          displayedStudentMasteryRows={displayedStudentMasteryRows}
          studentMasteryHeading={masteryHeading(
            data.masteryScope,
            data.selectedStudent?.name?.trim() || data.selectedStudent?.email,
          )}
          effectiveStudentYearFilter={effectiveStudentYearFilter}
          onStudentYearFilterChange={setStudentYearFilter}
          studentAvailableYears={studentAvailableYears}
          studentPaperSort={studentPaperSort}
          onStudentPaperSortChange={setStudentPaperSort}
          displayedStudentPapers={displayedStudentPapers}
          visibleStudentPapers={visibleStudentPapers}
          effectiveStudentVisibleCount={effectiveStudentVisibleCount}
          onShowMore={() => setStudentVisibleCount((n) => n + VISIBLE_PAPERS_STEP)}
          onShowAll={() => setStudentVisibleCount(displayedStudentPapers.length)}
          allStudentPaperCount={data.papers.length}
        />
      )}
    </div>
  );
}

