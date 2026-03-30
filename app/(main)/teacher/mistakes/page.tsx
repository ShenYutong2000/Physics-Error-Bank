"use client";

import { useEffect, useState } from "react";
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

export default function TeacherMistakesAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
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
          <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">All students</h2>
            <div className="mb-4 flex flex-wrap gap-4 text-sm font-bold">
              <div>
                <span className="text-[var(--duo-text-muted)]">Total mistakes </span>
                <span className="tabular-nums text-[var(--duo-text)]">{data.overall.totalMistakes}</span>
              </div>
              <div>
                <span className="text-[var(--duo-text-muted)]">Students with mistakes </span>
                <span className="tabular-nums text-[var(--duo-text)]">
                  {data.overall.studentCountWithMistakes}
                </span>
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

          <section>
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">By student</h2>
            <div className="space-y-3">
              {data.students.map((s) => {
                const open = expandedId === s.userId;
                return (
                  <div
                    key={s.userId}
                    className="overflow-hidden rounded-2xl border-2 border-[var(--duo-border)] bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
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
                      <div className="border-t-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-3">
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
