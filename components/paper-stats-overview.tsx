"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetchJson } from "@/lib/api-client";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { PublishedPaperStatsRow, TagMasteryRow } from "@/lib/paper-types";

type MasteryScope = "self" | "class" | "student";

type StatsPayload = {
  papers: PublishedPaperStatsRow[];
  crossPaperThemeMastery: TagMasteryRow[];
  masteryScope: MasteryScope;
  selectedStudent?: { userId: string; name: string; email: string };
  students?: Array<{ id: string; name: string; email: string }>;
};

function masteryHeading(scope: MasteryScope, selectedName?: string): string {
  if (scope === "self") return "Your theme mastery (all published papers)";
  if (scope === "class") return "Class theme mastery (all published papers)";
  return `Theme mastery — ${selectedName ?? "student"}`;
}

export function PaperStatsOverviewPanel({ variant }: { variant: "student" | "teacher" }) {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
    if (variant !== "teacher" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get("studentId") ?? "";
    setStudentId(v);
  }, [variant]);

  const queryString = useMemo(() => {
    if (variant !== "teacher") return "";
    if (!studentId.trim()) return "";
    return `?studentId=${encodeURIComponent(studentId.trim())}`;
  }, [variant, studentId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await apiFetchJson<StatsPayload>(`/api/papers/stats${queryString}`);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      setData(null);
      return;
    }
    setData(r.data);
  }, [queryString, variant]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
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
              const path =
                typeof window !== "undefined"
                  ? `${window.location.pathname}${v ? `?studentId=${encodeURIComponent(v)}` : ""}`
                  : "";
              if (path) window.history.replaceState(null, "", path);
            }}
            className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
          >
            <option value="">Whole class (aggregate)</option>
            {(data?.students ?? []).map((s) => (
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

      {data && !loading && (
        <>
          <section className="rounded-2xl border-2 border-[#c9d6ff] bg-gradient-to-br from-[#f5f7ff] via-white to-[#f8fbff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <h2 className="mb-3 text-sm font-extrabold text-[var(--duo-text)]">
              {masteryHeading(
                data.masteryScope,
                data.selectedStudent?.name?.trim() || data.selectedStudent?.email,
              )}
            </h2>
            <TagStatsChart
              rows={data.crossPaperThemeMastery}
              emptyMessage={
                data.masteryScope === "self"
                  ? "Complete at least one published paper to see theme mastery."
                  : "No student answers on published papers yet."
              }
              ariaLabel="Theme mastery across published papers"
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-extrabold text-[var(--duo-text)]">
              All published papers — question results (class)
            </h2>
            <p className="text-xs font-bold text-[var(--duo-text-muted)]">
              Correct rate per question = students who got it right ÷ students who submitted this paper (latest
              attempt each).
            </p>
            {data.papers.length === 0 && (
              <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
                No published papers yet.
              </p>
            )}
            {data.papers.map((row) => (
              <PaperQuestionBlock
                key={row.paper.id}
                row={row}
                showTeacherDetailLink={variant === "teacher"}
                showStudentDetailLink={variant === "student"}
              />
            ))}
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
