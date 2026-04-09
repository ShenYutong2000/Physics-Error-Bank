"use client";

import { useEffect, useMemo, useState } from "react";
import { mainPageClassName } from "@/components/main-page-layout";
import { TagStatsChart } from "@/components/tag-stats-chart";
import { apiFetchJson } from "@/lib/api-client";
import type { StudentMistakeAnalyticsRow } from "@/lib/teacher-mistake-analytics";

type AnalyticsPayload = {
  overall: {
    totalMistakes: number;
    studentCountWithMistakes: number;
    tagRows: { tag: string; count: number }[];
  };
  students: StudentMistakeAnalyticsRow[];
};

function displayStudentLabel(s: StudentMistakeAnalyticsRow): string {
  if (s.name.trim()) return s.name.trim();
  const local = s.email.split("@")[0] ?? s.email;
  return local || "Student";
}

type StudentListSort = "name_az" | "mistakes_high" | "mistakes_low";

function heatColor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "#f3f7ff";
  const ratio = Math.min(count / max, 1);
  const alpha = 0.12 + ratio * 0.68;
  return `rgba(28, 110, 214, ${alpha.toFixed(3)})`;
}

export default function TeacherMistakesAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentListSort, setStudentListSort] = useState<StudentListSort>("name_az");

  const displayedStudents = useMemo(() => {
    const list = data?.students ?? [];
    const q = studentSearch.trim().toLowerCase();
    const filtered = !q
      ? [...list]
      : list.filter((s) => {
          const name = (s.name ?? "").toLowerCase();
          const email = (s.email ?? "").toLowerCase();
          const label = displayStudentLabel(s).toLowerCase();
          return name.includes(q) || email.includes(q) || label.includes(q);
        });

    if (studentListSort === "name_az") {
      filtered.sort((a, b) => displayStudentLabel(a).localeCompare(displayStudentLabel(b), "en"));
    } else if (studentListSort === "mistakes_high") {
      filtered.sort(
        (a, b) =>
          b.mistakeCount - a.mistakeCount ||
          displayStudentLabel(a).localeCompare(displayStudentLabel(b), "en"),
      );
    } else {
      filtered.sort(
        (a, b) =>
          a.mistakeCount - b.mistakeCount ||
          displayStudentLabel(a).localeCompare(displayStudentLabel(b), "en"),
      );
    }
    return filtered;
  }, [data?.students, studentSearch, studentListSort]);

  useEffect(() => {
    if (!expandedId) return;
    const visible = displayedStudents.some((s) => s.userId === expandedId);
    if (!visible) setExpandedId(null);
  }, [displayedStudents, expandedId]);

  const topTags = useMemo(() => {
    return (data?.overall.tagRows ?? []).slice(0, 8).map((r) => r.tag);
  }, [data?.overall.tagRows]);

  const heatmapStudents = useMemo(() => {
    return [...displayedStudents]
      .sort(
        (a, b) =>
          b.mistakeCount - a.mistakeCount ||
          displayStudentLabel(a).localeCompare(displayStudentLabel(b), "en"),
      )
      .slice(0, 12);
  }, [displayedStudents]);

  const studentTagCountMap = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const s of heatmapStudents) {
      m.set(
        s.userId,
        new Map(s.tagRows.map((r) => [r.tag, r.count])),
      );
    }
    return m;
  }, [heatmapStudents]);

  const heatMax = useMemo(() => {
    let max = 0;
    for (const s of heatmapStudents) {
      const tags = studentTagCountMap.get(s.userId);
      if (!tags) continue;
      for (const tag of topTags) {
        const v = tags.get(tag) ?? 0;
        if (v > max) max = v;
      }
    }
    return max;
  }, [heatmapStudents, studentTagCountMap, topTags]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await apiFetchJson<AnalyticsPayload>("/api/teacher/mistakes-analytics");
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setData(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={mainPageClassName}>
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--duo-blue)]">Teacher</p>
        <h1 className="text-2xl font-extrabold text-[var(--duo-text)]">Class mistake analytics</h1>
        <p className="mt-2 text-sm font-bold text-[var(--duo-text-muted)]">
          Student accounts only — teacher uploads are not included.
        </p>
      </header>

      {error && (
        <p className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
          Loading…
        </p>
      )}

      {data && (
        <>
          <section className="mb-6 rounded-2xl border-2 border-[#c9d6ff] bg-gradient-to-br from-[#f5f7ff] via-white to-[#f8fbff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">All students</h2>
            <div className="mb-4 grid grid-cols-1 gap-3 text-sm font-bold sm:grid-cols-2">
              <div className="rounded-xl border-2 border-[#ffd8a8] bg-[#fff4e5] px-3 py-2">
                <span className="text-[#a65b00]">Total mistakes </span>
                <span className="tabular-nums text-[#7a3f00]">{data.overall.totalMistakes}</span>
              </div>
              <div className="rounded-xl border-2 border-[#b6d4fe] bg-[#e8f3ff] px-3 py-2">
                <span className="text-[#1c6ed6]">Students with mistakes </span>
                <span className="tabular-nums text-[#174ea6]">{data.overall.studentCountWithMistakes}</span>
              </div>
            </div>
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--duo-text-muted)]">
              Tags (all students)
            </h3>
            <TagStatsChart
              rows={data.overall.tagRows}
              emptyMessage="No tagged mistakes from students yet."
              ariaLabel="Bar chart of mistakes per tag across all students"
            />
          </section>

          <section className="mb-6 rounded-2xl border-2 border-[#c9d6ff] bg-gradient-to-br from-[#f8fbff] via-white to-[#f5f9ff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-extrabold text-[var(--duo-text)]">Class heatmap (student × tag)</h2>
            <p className="mt-1 text-xs font-bold text-[var(--duo-text-muted)]">
              Quick scan of concentration patterns. Columns show top 8 class tags; rows show top 12 students by
              mistake count in the current filter.
            </p>
            {topTags.length > 0 && heatmapStudents.length > 0 ? (
              <>
                <div className="mt-3 overflow-x-auto rounded-xl border-2 border-[#dbe7ff] bg-white">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 border-b-2 border-[#dbe7ff] bg-[#eef4ff] px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-[var(--duo-text-muted)]">
                          Student
                        </th>
                        {topTags.map((tag) => (
                          <th
                            key={tag}
                            className="border-b-2 border-[#dbe7ff] bg-[#f7faff] px-3 py-2 text-center text-[11px] font-extrabold uppercase tracking-wide text-[var(--duo-text-muted)]"
                          >
                            {tag}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapStudents.map((s) => (
                        <tr key={s.userId}>
                          <th className="sticky left-0 z-10 border-b border-[#edf3ff] bg-white px-3 py-2 text-left text-xs font-bold text-[var(--duo-text)]">
                            {displayStudentLabel(s)}
                          </th>
                          {topTags.map((tag) => {
                            const count = studentTagCountMap.get(s.userId)?.get(tag) ?? 0;
                            return (
                              <td
                                key={`${s.userId}-${tag}`}
                                className="border-b border-[#edf3ff] px-3 py-2 text-center text-xs font-extrabold tabular-nums text-[var(--duo-text)]"
                                style={{ backgroundColor: heatColor(count, heatMax) }}
                                title={`${displayStudentLabel(s)} · ${tag}: ${count}`}
                              >
                                {count}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
                  Color intensity scales from 0 to {heatMax} mistakes in this table.
                </p>
              </>
            ) : (
              <p className="mt-3 rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-6 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                Not enough class data yet to render the heatmap.
              </p>
            )}
          </section>

          <section aria-label="Student mistake lists">
            <div className="mb-4 rounded-2xl border-2 border-[#cfe6ff] bg-gradient-to-br from-[#f8fbff] via-white to-[#f3fffb] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
              <h2 className="text-sm font-extrabold text-[var(--duo-text)]">By student</h2>
              <p className="mt-1 text-xs font-bold text-[var(--duo-text-muted)]">
                Search by display name or email. Sort by name or mistake count.
              </p>
              <label className="mt-3 block">
                <span className="sr-only">Search students</span>
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search name or email…"
                  autoComplete="off"
                  className="w-full rounded-xl border-2 border-[#b6d4fe] bg-[#f4f9ff] px-3 py-2.5 text-sm font-bold placeholder:text-[#7a8a9a]"
                  aria-label="Filter students by name or email"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-extrabold text-[var(--duo-text)]">Sort list</span>
                <select
                  value={studentListSort}
                  onChange={(e) => setStudentListSort(e.target.value as StudentListSort)}
                  className="w-full rounded-xl border-2 border-[#b6d4fe] bg-[#f4f9ff] px-3 py-2 text-sm font-bold"
                  aria-label="Sort students by name or mistake count"
                >
                  <option value="name_az">Name (A–Z)</option>
                  <option value="mistakes_high">Mistakes (most to fewest)</option>
                  <option value="mistakes_low">Mistakes (fewest to most)</option>
                </select>
              </label>
              {data.students.length > 0 && (
                <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
                  Showing {displayedStudents.length} of {data.students.length}
                  {studentSearch.trim() ? " (filtered)" : ""}
                </p>
              )}
            </div>

            {data.students.length > 0 && displayedStudents.length === 0 && (
              <p className="mb-3 rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-6 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                No students match &ldquo;{studentSearch.trim()}&rdquo;. Try another name or email.
              </p>
            )}

            <div className="space-y-3">
              {displayedStudents.map((s) => {
                const open = expandedId === s.userId;
                return (
                  <div
                    key={s.userId}
                    className="overflow-hidden rounded-2xl border-2 border-[#d9e3f0] bg-gradient-to-br from-white to-[#fafcff] shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : s.userId)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                    >
                      <span className="min-w-0 truncate font-extrabold text-[var(--duo-text)]">
                        {displayStudentLabel(s)}
                      </span>
                      <span className="shrink-0 tabular-nums text-sm font-bold text-[var(--duo-text-muted)]">
                        {s.mistakeCount} mistake{s.mistakeCount === 1 ? "" : "s"}
                      </span>
                    </button>
                    {open && (
                      <div className="border-t-2 border-[#d9e3f0] bg-[#f5f8ff] px-4 py-3">
                        <p className="mb-2 truncate text-xs font-bold text-[var(--duo-text-muted)]">{s.email}</p>
                        <TagStatsChart
                          rows={s.tagRows}
                          emptyMessage="No tags on this student’s mistakes."
                          ariaLabel={`Bar chart of mistakes per tag for ${displayStudentLabel(s)}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
