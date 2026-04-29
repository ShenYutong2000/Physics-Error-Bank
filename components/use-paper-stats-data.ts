"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/api-client";
import { replaceUrlWithQuery } from "@/lib/client-url";
import {
  getYearResetNotice,
  normalizeYearFilter,
  shouldAutoResetYearFilter,
  sortStudentPapers,
  toDp1OrderedRows,
  type StudentPaperSort,
} from "@/lib/paper-stats-utils";
import type { PublishedPaperStatsRow, TagMasteryRow } from "@/lib/paper-types";

/**
 * Data/state layer for paper stats pages.
 * Handles fetch + URL sync + derived view models for both teacher and student variants.
 */
export type MasteryScope = "self" | "class" | "student";
export type PrepScope = "all" | "dp1";

type StatsPayload = {
  papers: PublishedPaperStatsRow[];
  crossPaperThemeMastery: TagMasteryRow[];
  classCrossPaperThemeMastery?: TagMasteryRow[];
  masteryScope: MasteryScope;
  prepScope?: PrepScope;
  selectedStudent?: { userId: string; name: string; email: string };
  students?: Array<{ id: string; name: string; email: string }>;
};

type TeacherPanelState = {
  classData: StatsPayload | null;
  selectedData: StatsPayload | null;
};

const INITIAL_VISIBLE_PAPERS = 8;

function masteryBand(percent: number): "high" | "medium" | "low" {
  if (percent >= 80) return "high";
  if (percent >= 50) return "medium";
  return "low";
}

export function usePaperStatsData(variant: "student" | "teacher") {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherPanelState>({ classData: null, selectedData: null });
  const [error, setError] = useState<string | null>(null);
  const [filterNotice, setFilterNotice] = useState<string | null>(null);
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
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      if (variant === "teacher") {
        const classResp = await apiFetchJson<StatsPayload>(`/api/papers/stats?prep=${encodeURIComponent(prepScope)}`, {
          timeoutMs: 12_000,
          signal: controller.signal,
        });
        if (cancelled) return;
        if (!classResp.ok) {
          if (classResp.error === "Request cancelled.") return;
          setLoading(false);
          setError(classResp.error);
          setTeacherData({ classData: null, selectedData: null });
          return;
        }
        setTeacherData({ classData: classResp.data, selectedData: null });
        setData(null);
        setLoading(false);
        return;
      }

      const r = await apiFetchJson<StatsPayload>(`/api/papers/stats?prep=${encodeURIComponent(prepScope)}`, {
        timeoutMs: 12_000,
        signal: controller.signal,
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
      controller.abort();
    };
  }, [prepScope, variant]);

  useEffect(() => {
    if (variant !== "teacher" || !teacherData.classData || !studentId.trim()) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setSelectedLoading(true);
      setError(null);
      const selectedResp = await apiFetchJson<StatsPayload>(
        `/api/papers/stats?studentId=${encodeURIComponent(studentId.trim())}&prep=${encodeURIComponent(prepScope)}`,
        { timeoutMs: 12_000, signal: controller.signal },
      );
      if (cancelled) {
        setSelectedLoading(false);
        return;
      }
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
      controller.abort();
      setSelectedLoading(false);
    };
  }, [studentId, teacherData.classData, prepScope, variant]);

  const displayedStudentMasteryRows = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows(data?.crossPaperThemeMastery ?? [])
        : (data?.crossPaperThemeMastery ?? []),
    [data?.crossPaperThemeMastery, prepScope],
  );
  const displayedClassMasteryRowsForStudentView = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows(data?.classCrossPaperThemeMastery ?? [])
        : (data?.classCrossPaperThemeMastery ?? []),
    [data?.classCrossPaperThemeMastery, prepScope],
  );
  const displayedTeacherClassMasteryRows = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows(teacherData.classData?.crossPaperThemeMastery ?? [])
        : (teacherData.classData?.crossPaperThemeMastery ?? []),
    [prepScope, teacherData.classData?.crossPaperThemeMastery],
  );
  const displayedTeacherSelectedMasteryRows = useMemo(
    () =>
      prepScope === "dp1"
        ? toDp1OrderedRows(teacherData.selectedData?.crossPaperThemeMastery ?? [])
        : (teacherData.selectedData?.crossPaperThemeMastery ?? []),
    [prepScope, teacherData.selectedData?.crossPaperThemeMastery],
  );

  const studentMasterySummary = useMemo(() => {
    const rows = displayedStudentMasteryRows;
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const row of rows) {
      const band = masteryBand(row.masteryPercent);
      if (band === "high") high += 1;
      else if (band === "medium") medium += 1;
      else low += 1;
    }
    const asc = [...rows].sort((a, b) => a.masteryPercent - b.masteryPercent);
    const weakest = asc.slice(0, 3);
    const strongest = [...asc].reverse().slice(0, 2);
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
    () => normalizeYearFilter(studentYearFilter, studentAvailableYears),
    [studentAvailableYears, studentYearFilter],
  );
  const effectiveTeacherYearFilter = useMemo(
    () => normalizeYearFilter(teacherYearFilter, teacherAvailableYears),
    [teacherAvailableYears, teacherYearFilter],
  );
  const displayedStudentPapers = useMemo(() => {
    const papers = [...(data?.papers ?? [])].filter((p) =>
      effectiveStudentYearFilter === "all" ? true : String(p.paper.year) === effectiveStudentYearFilter,
    );
    return sortStudentPapers(papers, studentPaperSort);
  }, [data?.papers, effectiveStudentYearFilter, studentPaperSort]);
  const teacherPapers = useMemo(
    () =>
      (teacherData.classData?.papers ?? []).filter((p) =>
        effectiveTeacherYearFilter === "all" ? true : String(p.paper.year) === effectiveTeacherYearFilter,
      ),
    [effectiveTeacherYearFilter, teacherData.classData?.papers],
  );
  const effectiveStudentVisibleCount = Math.min(studentVisibleCount, displayedStudentPapers.length);
  const effectiveTeacherVisibleCount = Math.min(teacherVisibleCount, teacherPapers.length);
  const visibleStudentPapers = useMemo(
    () => displayedStudentPapers.slice(0, effectiveStudentVisibleCount),
    [displayedStudentPapers, effectiveStudentVisibleCount],
  );
  const visibleTeacherPapers = useMemo(
    () => teacherPapers.slice(0, effectiveTeacherVisibleCount),
    [teacherPapers, effectiveTeacherVisibleCount],
  );

  useEffect(() => {
    if (variant !== "student") return;
    replaceUrlWithQuery({
      year: effectiveStudentYearFilter === "all" ? null : effectiveStudentYearFilter,
      sort: studentPaperSort === "risk_high" ? null : studentPaperSort,
      prep: prepScope === "all" ? null : prepScope,
    });
  }, [effectiveStudentYearFilter, prepScope, studentPaperSort, variant]);

  useEffect(() => {
    if (variant !== "teacher") return;
    replaceUrlWithQuery({
      year: effectiveTeacherYearFilter === "all" ? null : effectiveTeacherYearFilter,
      studentId: studentId.trim() ? studentId.trim() : null,
      prep: prepScope === "all" ? null : prepScope,
    });
  }, [effectiveTeacherYearFilter, prepScope, studentId, variant]);

  useEffect(() => {
    if (variant !== "student") return;
    if (!shouldAutoResetYearFilter(studentYearFilter, effectiveStudentYearFilter)) return;
    const syncTimer = window.setTimeout(() => setStudentYearFilter(effectiveStudentYearFilter), 0);
    const showTimer = window.setTimeout(() => setFilterNotice(getYearResetNotice()), 0);
    const hideTimer = window.setTimeout(() => setFilterNotice(null), 2200);
    return () => {
      window.clearTimeout(syncTimer);
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [effectiveStudentYearFilter, studentYearFilter, variant]);

  useEffect(() => {
    if (variant !== "teacher") return;
    if (!shouldAutoResetYearFilter(teacherYearFilter, effectiveTeacherYearFilter)) return;
    const syncTimer = window.setTimeout(() => setTeacherYearFilter(effectiveTeacherYearFilter), 0);
    const showTimer = window.setTimeout(() => setFilterNotice(getYearResetNotice()), 0);
    const hideTimer = window.setTimeout(() => setFilterNotice(null), 2200);
    return () => {
      window.clearTimeout(syncTimer);
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [effectiveTeacherYearFilter, teacherYearFilter, variant]);

  const onTeacherStudentChange = (next: string) => {
    setStudentId(next);
    setTeacherData((prev) => ({ ...prev, selectedData: null }));
    setSelectedLoading(Boolean(next));
  };

  return {
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
  };
}

