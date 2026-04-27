"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetchJson } from "@/lib/api-client";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { PublishedPaperStatsRow, TagMasteryRow } from "@/lib/paper-types";

type MasteryScope = "self" | "class" | "student";
type PrepScope = "all" | "dp1";
type ThemeMasteryRow = { tag: string; correct: number; total: number; masteryPercent: number };
const DP1_THEME_ORDER = [
  "Theme A - Space, Time, and Motion",
  "Theme B - The Particulate Nature of Matter",
  "Theme C - Wave Behavior",
] as const;

type StatsPayload = {
  papers: PublishedPaperStatsRow[];
  crossPaperThemeMastery: TagMasteryRow[];
  classCrossPaperThemeMastery?: TagMasteryRow[];
  masteryScope: MasteryScope;
  prepScope?: PrepScope;
  selectedStudent?: { userId: string; name: string; email: string };
  students?: Array<{ id: string; name: string; email: string }>;
};

function masteryHeading(scope: MasteryScope, selectedName?: string): string {
  if (scope === "self") return "Your theme mastery (all published papers)";
  if (scope === "class") return "Class theme mastery (all published papers)";
  return `Theme mastery — ${selectedName ?? "student"}`;
}

type TeacherPanelState = {
  classData: StatsPayload | null;
  selectedData: StatsPayload | null;
};

type StudentPaperSort = "risk_high" | "risk_low" | "latest";
const INITIAL_VISIBLE_PAPERS = 8;
const VISIBLE_PAPERS_STEP = 8;

function masteryBand(percent: number): "high" | "medium" | "low" {
  if (percent >= 80) return "high";
  if (percent >= 50) return "medium";
  return "low";
}

function toDp1OrderedRows(rows: ThemeMasteryRow[]): ThemeMasteryRow[] {
  const map = new Map(rows.map((r) => [r.tag, r]));
  return DP1_THEME_ORDER.map((theme) => map.get(theme)).filter((r): r is ThemeMasteryRow => Boolean(r));
}

export function PaperStatsOverviewPanel({ variant }: { variant: "student" | "teacher" }) {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherPanelState>({ classData: null, selectedData: null });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [studentId, setStudentId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("studentId") ?? "";
  });
  const [studentPaperSort, setStudentPaperSort] = useState<StudentPaperSort>(() => {
    if (typeof window === "undefined") return "risk_high";
    const raw = new URLSearchParams(window.location.search).get("sort");
    if (raw === "risk_low" || raw === "latest" || raw === "risk_high") return raw;
    return "risk_high";
  });
  const [studentYearFilter, setStudentYearFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("year") ?? "all";
  });
  const [teacherYearFilter, setTeacherYearFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("year") ?? "all";
  });
  const [studentVisibleCount, setStudentVisibleCount] = useState(INITIAL_VISIBLE_PAPERS);
  const [teacherVisibleCount, setTeacherVisibleCount] = useState(INITIAL_VISIBLE_PAPERS);
  const [prepScope, setPrepScope] = useState<PrepScope>(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("prep") === "dp1" ? "dp1" : "all";
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      if (variant === "teacher") {
        const classResp = await apiFetchJson<StatsPayload>(
          `/api/papers/stats?prep=${encodeURIComponent(prepScope)}`,
          { timeoutMs: 12_000 },
        );
        if (cancelled) return;
        if (!classResp.ok) {
          if (classResp.error === "Request cancelled.") return;
          setLoading(false);
          setError(classResp.error);
          setTeacherData({ classData: null, selectedData: null });
          return;
        }
        setTeacherData((prev) => ({
          classData: classResp.data,
          selectedData:
            prev.selectedData && prev.selectedData.selectedStudent?.userId === studentId.trim() ? prev.selectedData : null,
        }));
        setData(null);
        setLoading(false);
        return;
      }

      const r = await apiFetchJson<StatsPayload>(`/api/papers/stats?prep=${encodeURIComponent(prepScope)}`, {
        timeoutMs: 12_000,
      });
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        if (r.error === "Request cancelled.") return;
        setError(r.error);
        setData(null);
        return;
      }
      setTeacherData({ classData: null, selectedData: null });
      setData(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, prepScope, variant]);

  useEffect(() => {
    if (variant !== "teacher" || !teacherData.classData || !studentId.trim()) return;
    let cancelled = false;
    void (async () => {
      setSelectedLoading(true);
      setError(null);
      const selectedResp = await apiFetchJson<StatsPayload>(
        `/api/papers/stats?studentId=${encodeURIComponent(studentId.trim())}&prep=${encodeURIComponent(prepScope)}`,
        { timeoutMs: 12_000 },
      );
      if (cancelled) return;
      setSelectedLoading(false);
      if (!selectedResp.ok) {
        if (selectedResp.error === "Request cancelled.") return;
        setError(selectedResp.error);
        setTeacherData((prev) => ({ ...prev, selectedData: null }));
        return;
      }
      setTeacherData((prev) => ({ ...prev, selectedData: selectedResp.data }));
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, teacherData.classData, prepScope, variant]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (variant !== "student") return;
    const params = new URLSearchParams(window.location.search);
    if (studentYearFilter === "all") {
      params.delete("year");
    } else {
      params.set("year", studentYearFilter);
    }
    if (studentPaperSort === "risk_high") {
      params.delete("sort");
    } else {
      params.set("sort", studentPaperSort);
    }
    if (prepScope === "all") {
      params.delete("prep");
    } else {
      params.set("prep", prepScope);
    }
    const query = params.toString();
    const path = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", path);
  }, [prepScope, studentPaperSort, studentYearFilter, variant]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (variant !== "teacher") return;
    const params = new URLSearchParams(window.location.search);
    if (teacherYearFilter === "all") {
      params.delete("year");
    } else {
      params.set("year", teacherYearFilter);
    }
    if (!studentId.trim()) {
      params.delete("studentId");
    } else {
      params.set("studentId", studentId.trim());
    }
    if (prepScope === "all") {
      params.delete("prep");
    } else {
      params.set("prep", prepScope);
    }
    const query = params.toString();
    const path = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", path);
  }, [prepScope, studentId, teacherYearFilter, variant]);

  const displayedStudentMasteryRows = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows((data?.crossPaperThemeMastery ?? []) as ThemeMasteryRow[])
        : (data?.crossPaperThemeMastery ?? []),
    [data?.crossPaperThemeMastery, prepScope],
  );
  const displayedClassMasteryRowsForStudentView = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows((data?.classCrossPaperThemeMastery ?? []) as ThemeMasteryRow[])
        : (data?.classCrossPaperThemeMastery ?? []),
    [data?.classCrossPaperThemeMastery, prepScope],
  );
  const displayedTeacherClassMasteryRows = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows((teacherData.classData?.crossPaperThemeMastery ?? []) as ThemeMasteryRow[])
        : (teacherData.classData?.crossPaperThemeMastery ?? []),
    [prepScope, teacherData.classData?.crossPaperThemeMastery],
  );
  const displayedTeacherSelectedMasteryRows = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows((teacherData.selectedData?.crossPaperThemeMastery ?? []) as ThemeMasteryRow[])
        : (teacherData.selectedData?.crossPaperThemeMastery ?? []),
    [prepScope, teacherData.selectedData?.crossPaperThemeMastery],
  );

  const studentMasterySummary = useMemo(() => {
    const rows = displayedStudentMasteryRows;
    const high = rows.filter((r) => masteryBand(r.masteryPercent) === "high").length;
    const medium = rows.filter((r) => masteryBand(r.masteryPercent) === "medium").length;
    const low = rows.filter((r) => masteryBand(r.masteryPercent) === "low").length;
    const weakest = [...rows].sort((a, b) => a.masteryPercent - b.masteryPercent).slice(0, 3);
    const strongest = [...rows].sort((a, b) => b.masteryPercent - a.masteryPercent).slice(0, 2);
    return { high, medium, low, weakest, strongest };
  }, [displayedStudentMasteryRows]);

  const studentAvailableYears = useMemo(
    () => Array.from(new Set((data?.papers ?? []).map((p) => p.paper.year))).sort((a, b) => b - a),
    [data?.papers],
  );
  const teacherAvailableYears = useMemo(
    () => Array.from(new Set((teacherData.classData?.papers ?? []).map((p) => p.paper.year))).sort((a, b) => b - a),
    [teacherData.classData?.papers],
  );
  const effectiveStudentYearFilter = useMemo(
    () =>
      studentYearFilter === "all" || studentAvailableYears.includes(Number(studentYearFilter))
        ? studentYearFilter
        : "all",
    [studentAvailableYears, studentYearFilter],
  );
  const effectiveTeacherYearFilter = useMemo(
    () =>
      teacherYearFilter === "all" || teacherAvailableYears.includes(Number(teacherYearFilter))
        ? teacherYearFilter
        : "all",
    [teacherAvailableYears, teacherYearFilter],
  );
  const displayedStudentPapers = useMemo(() => {
    const papers = [...(data?.papers ?? [])].filter((p) =>
      effectiveStudentYearFilter === "all" ? true : String(p.paper.year) === effectiveStudentYearFilter,
    );
    const riskCount = (row: PublishedPaperStatsRow) => row.questions.filter((q) => q.correctRatePercent < 50).length;
    if (studentPaperSort === "risk_high") {
      papers.sort(
        (a, b) =>
          riskCount(b) - riskCount(a) ||
          a.averageAccuracy - b.averageAccuracy ||
          b.paper.year - a.paper.year,
      );
    } else if (studentPaperSort === "risk_low") {
      papers.sort(
        (a, b) =>
          riskCount(a) - riskCount(b) ||
          b.averageAccuracy - a.averageAccuracy ||
          b.paper.year - a.paper.year,
      );
    } else {
      papers.sort(
        (a, b) =>
          b.paper.year - a.paper.year || b.paper.session.localeCompare(a.paper.session, "en"),
      );
    }
    return papers;
  }, [data?.papers, effectiveStudentYearFilter, studentPaperSort]);
  const teacherPapers = (teacherData.classData?.papers ?? []).filter((p) =>
    effectiveTeacherYearFilter === "all" ? true : String(p.paper.year) === effectiveTeacherYearFilter,
  );
  const effectiveStudentVisibleCount = Math.min(studentVisibleCount, displayedStudentPapers.length);
  const effectiveTeacherVisibleCount = Math.min(teacherVisibleCount, teacherPapers.length);

  return (
    <div className="space-y-6">
      {/* Sticky below MainShell header (z-40); top-24 clears tall mobile headers (stacked header actions) */}
      <div className="sticky top-24 z-30 -mx-4 border-b-2 border-[var(--duo-border)] bg-[#f8faff]/95 px-4 py-3 backdrop-blur-sm sm:top-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-extrabold text-[var(--duo-text)] sm:text-base">Statistics range</p>
          <p className="mt-0.5 text-xs font-bold text-[#5f4f8f] sm:text-sm">
            Choose whether numbers include every published paper or only DP1 EOY Exam Prep (Themes A–C).
          </p>
          <div
            className="mt-3 flex min-h-[3.25rem] w-full flex-col gap-2 sm:min-h-0 sm:flex-row sm:gap-2"
            role="group"
            aria-label="Statistics range"
          >
            <button
              type="button"
              onClick={() => setPrepScope("all")}
              disabled={loading}
              aria-pressed={prepScope === "all"}
              className={`flex flex-1 flex-col items-stretch justify-center rounded-2xl border-2 px-4 py-3 text-left shadow-[0_4px_0_0_rgba(0,0,0,0.12)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.12)] disabled:opacity-60 sm:py-3.5 ${
                prepScope === "all"
                  ? "border-[#4a56c7] bg-gradient-to-r from-[#5d6bff] via-[#7a84ff] to-[#4a56c7] text-white"
                  : "border-[#c4c4e8] bg-white/90 text-[var(--duo-text)] hover:border-[#9ca3e8]"
              }`}
            >
              <span
                className={`text-sm font-black uppercase tracking-wide sm:text-base ${
                  prepScope === "all" ? "text-white" : "text-[#4a56c7]"
                }`}
              >
                All published papers
              </span>
              <span
                className={`mt-0.5 text-xs font-bold sm:text-sm ${
                  prepScope === "all" ? "text-white/95" : "text-[var(--duo-text-muted)]"
                }`}
              >
                Full class bank & all themes
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPrepScope("dp1")}
              disabled={loading}
              aria-pressed={prepScope === "dp1"}
              className={`relative flex flex-1 flex-col items-stretch justify-center overflow-hidden rounded-2xl border-2 px-4 py-3 text-left shadow-[0_4px_0_0_rgba(0,0,0,0.12)] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_rgba(0,0,0,0.12)] disabled:opacity-60 sm:py-3.5 ${
                prepScope === "dp1"
                  ? "border-[#7d4cc9] bg-gradient-to-r from-[#7d4cc9] via-[#8d5cf6] to-[#6f42c1] text-white"
                  : "border-[#d8b8ff] bg-gradient-to-br from-[#faf5ff] to-white text-[var(--duo-text)] hover:border-[#b388ff]"
              }`}
            >
              {prepScope === "dp1" && (
                <span
                  className="absolute right-2 top-2 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
                  aria-hidden
                >
                  Active
                </span>
              )}
              <span
                className={`text-sm font-black uppercase tracking-wide sm:text-base ${
                  prepScope === "dp1" ? "pr-12 text-white" : "text-[#6d28d9]"
                }`}
              >
                DP1 EOY exam prep
              </span>
              <span
                className={`mt-0.5 text-xs font-bold sm:text-sm ${
                  prepScope === "dp1" ? "text-white/95" : "text-[var(--duo-text-muted)]"
                }`}
              >
                Marked papers · Themes A–C only
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs font-bold text-[#5f4f8f] sm:text-sm">
            {prepScope === "dp1"
              ? "DP1 mode only includes papers marked as DP1 EOY Exam Prep; mastery and scores use Themes A–C only (D/E/M excluded)."
              : "All mode includes every published paper and all theme tags you see elsewhere."}
          </p>
          {prepScope === "dp1" && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-[#7d4cc9] bg-gradient-to-r from-[#7d4cc9] via-[#8d5cf6] to-[#6f42c1] px-3 py-2.5 text-white shadow-[0_3px_0_0_rgba(0,0,0,0.12)]">
              <span className="text-lg" aria-hidden>
                ✓
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-wider sm:text-base">DP1 EOY view active</p>
                <p className="text-xs font-bold text-white/95 sm:text-sm">Themes A–C only in charts and scores.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {variant === "teacher" && (
        <div className="rounded-2xl border-2 border-[#cfe6ff] bg-gradient-to-br from-[#f8fbff] via-white to-[#f3fffb] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <label className="mb-2 block text-sm font-extrabold text-[var(--duo-text)]" htmlFor="paper-stats-student">
            Theme mastery scope
          </label>
          <select
            id="paper-stats-student"
            value={studentId}
            onChange={(e) => {
              const v = e.target.value;
              setStudentId(v);
              setTeacherData((prev) => ({ ...prev, selectedData: null }));
              setSelectedLoading(Boolean(v));
            }}
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

      {loading && (
        <p className="text-sm font-bold text-[var(--duo-text-muted)]">Loading statistics...</p>
      )}
      {error && (
        <p className="rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}

      {variant === "teacher" && teacherData.classData && !loading && (
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
              {teacherData.selectedData?.selectedStudent ? (
                <p className="mb-3 text-xs font-bold text-[#5f4f8f]">
                  {teacherData.selectedData.selectedStudent.name.trim() || teacherData.selectedData.selectedStudent.email}
                </p>
              ) : (
                <p className="mb-3 text-xs font-bold text-[#5f4f8f]">Choose a student above to compare against class baseline.</p>
              )}
              {selectedLoading ? (
                <div className="rounded-2xl border-2 border-dashed border-[#d8c9ff] bg-white px-4 py-8 text-center text-sm font-medium text-[var(--duo-text-muted)]">
                  Loading selected student…
                </div>
              ) : teacherData.selectedData ? (
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
                onChange={(e) => setTeacherYearFilter(e.target.value)}
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
              Correct rate per question = students who got it right ÷ students who submitted this paper (latest
              attempt each).
            </p>
            {teacherPapers.length === 0 && (
              <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                {(teacherData.classData?.papers?.length ?? 0) === 0 ? "No published papers yet." : "No papers for the selected year."}
              </p>
            )}
            {teacherPapers.slice(0, effectiveTeacherVisibleCount).map((row) => (
              <PaperQuestionBlock key={row.paper.id} row={row} showTeacherDetailLink showStudentDetailLink={false} />
            ))}
            {teacherPapers.length > effectiveTeacherVisibleCount && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTeacherVisibleCount((n) => n + VISIBLE_PAPERS_STEP)}
                  className="w-full rounded-xl border-2 border-[#b6d4fe] bg-[#eef6ff] py-2 text-xs font-extrabold text-[#1c6ed6]"
                >
                  Show more papers ({effectiveTeacherVisibleCount}/{teacherPapers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherVisibleCount(teacherPapers.length)}
                  className="w-full rounded-xl border-2 border-[#b6d4fe] bg-white py-2 text-xs font-extrabold text-[#1c6ed6]"
                >
                  Show all papers ({teacherPapers.length})
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {variant === "student" && data && !loading && (
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
                Strongest themes:{" "}
                {studentMasterySummary.strongest.map((r) => `${r.tag} ${r.masteryPercent}%`).join(" · ")}
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#b6d4fe] bg-gradient-to-br from-[#eef6ff] via-white to-[#f6faff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
              <h2 className="mb-1 text-sm font-extrabold text-[var(--duo-text)]">Class theme mastery (baseline)</h2>
              <p className="mb-3 text-xs font-bold text-[#5c6b7a]">
                {prepScope === "dp1"
                  ? "Class aggregate across DP1 EOY papers only."
                  : "Class aggregate across all published papers."}
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
              <h2 className="mb-1 text-sm font-extrabold text-[var(--duo-text)]">
                {masteryHeading(
                  data.masteryScope,
                  data.selectedStudent?.name?.trim() || data.selectedStudent?.email,
                )}
              </h2>
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
                  onChange={(e) => setStudentYearFilter(e.target.value)}
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
                  onChange={(e) => setStudentPaperSort(e.target.value as StudentPaperSort)}
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
              Correct rate per question = students who got it right ÷ students who submitted this paper (latest
              attempt each).
            </p>
            {displayedStudentPapers.length === 0 && (
              <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                {data.papers.length === 0 ? "No published papers yet." : "No papers for the selected year."}
              </p>
            )}
            {displayedStudentPapers.slice(0, effectiveStudentVisibleCount).map((row) => (
              <PaperQuestionBlock
                key={row.paper.id}
                row={row}
                showTeacherDetailLink={false}
                showStudentDetailLink
              />
            ))}
            {displayedStudentPapers.length > effectiveStudentVisibleCount && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStudentVisibleCount((n) => n + VISIBLE_PAPERS_STEP)}
                  className="w-full rounded-xl border-2 border-[#b6d4fe] bg-[#eef6ff] py-2 text-xs font-extrabold text-[#1c6ed6]"
                >
                  Show more papers ({effectiveStudentVisibleCount}/{displayedStudentPapers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentVisibleCount(displayedStudentPapers.length)}
                  className="w-full rounded-xl border-2 border-[#b6d4fe] bg-white py-2 text-xs font-extrabold text-[#1c6ed6]"
                >
                  Show all papers ({displayedStudentPapers.length})
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PaperQuestionBlock({
  row,
  showTeacherDetailLink,
  showStudentDetailLink,
}: {
  row: PublishedPaperStatsRow;
  showTeacherDetailLink: boolean;
  showStudentDetailLink: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border-2 border-[#e2e8f0] bg-gradient-to-br from-white to-[#fafcff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div>
          <p className="text-base font-extrabold text-[var(--duo-text)]">
            {row.paper.year} {row.paper.session}
          </p>
          <p className="text-sm font-bold text-[var(--duo-text-muted)]">{row.paper.title}</p>
        </div>
        <span className="shrink-0 text-xs font-extrabold text-[var(--duo-blue)]">{open ? "▲" : "▼"}</span>
      </button>
      <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
        Submissions: {row.attemptCount} · Avg score: {row.attemptCount > 0 ? `${row.averageAccuracy}%` : "—"}
      </p>
      {showTeacherDetailLink && (
        <Link
          href={`/teacher/${row.paper.id}`}
          className="mt-3 inline-flex rounded-lg border-2 border-[#b6d4fe] bg-[#e8f3ff] px-3 py-1.5 text-xs font-extrabold text-[#1c6ed6] transition-colors hover:bg-[#ddecff]"
        >
          View detailed stats →
        </Link>
      )}
      {showStudentDetailLink && (
        <Link
          href={`/papers/${row.paper.id}`}
          className="mt-3 inline-flex rounded-lg border-2 border-[#b6d4fe] bg-[#e8f3ff] px-3 py-1.5 text-xs font-extrabold text-[#1c6ed6] transition-colors hover:bg-[#ddecff]"
        >
          View this paper details →
        </Link>
      )}
      {open && (
        <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {row.questions.map((q) => (
            <li
              key={q.questionNumber}
              className="flex items-center justify-between gap-2 rounded-lg bg-[#f3f7ff] px-2 py-1.5 text-xs font-bold"
            >
              <span className="text-[var(--duo-text)]">Q{q.questionNumber}</span>
              <span className="tabular-nums text-[var(--duo-text-muted)]">
                {q.correctRatePercent}% ({q.correctCount}/{q.attemptCount})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
