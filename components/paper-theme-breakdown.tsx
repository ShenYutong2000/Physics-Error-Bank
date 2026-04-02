"use client";

import type { PaperThemeCountRow, TagMasteryRow } from "@/lib/paper-types";

type Props = {
  themeQuestionCounts: PaperThemeCountRow[];
  masteryRows: TagMasteryRow[];
  /** Column header for the score column */
  correctColumnLabel: string;
  /** Section title */
  title: string;
  /** Optional line under title */
  description?: string;
  /**
   * `perPaper` — score is your correct count vs # questions on this paper for that theme.
   * `aggregate` — score is class total correct vs total graded answers in that theme (all students).
   */
  scoreMode: "perPaper" | "aggregate";
};

function masteryByTag(rows: TagMasteryRow[]): Map<string, TagMasteryRow> {
  return new Map(rows.map((r) => [r.tag, r]));
}

export function PaperThemeBreakdownTable({
  themeQuestionCounts,
  masteryRows,
  correctColumnLabel,
  title,
  description,
  scoreMode,
}: Props) {
  const map = masteryByTag(masteryRows);
  if (themeQuestionCounts.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-4 text-center text-xs font-bold text-[var(--duo-text-muted)]">
        No theme labels on this paper yet. Upload questions with a theme code per line.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-extrabold text-[var(--duo-text)]">{title}</h3>
      {description && <p className="mt-1 text-xs font-bold text-[var(--duo-text-muted)]">{description}</p>}
      <div className="mt-3 overflow-x-auto rounded-xl border-2 border-[var(--duo-border)]">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-[var(--duo-border)] bg-[var(--duo-surface)]">
              <th className="px-2 py-2 font-extrabold text-[var(--duo-text)]">Theme</th>
              <th className="px-2 py-2 font-extrabold text-[var(--duo-text)]"># Questions</th>
              <th className="px-2 py-2 font-extrabold text-[var(--duo-text)]">{correctColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {themeQuestionCounts.map((row) => {
              const m = map.get(row.theme);
              const totalOnPaper = row.questionCount;
              const scoreCell =
                scoreMode === "aggregate"
                  ? m
                    ? `${m.correct} / ${m.total}`
                    : "—"
                  : m
                    ? `${m.correct} / ${totalOnPaper}`
                    : `0 / ${totalOnPaper}`;
              return (
                <tr key={row.theme} className="border-b border-[var(--duo-border)] last:border-b-0">
                  <td className="px-2 py-2 font-bold text-[var(--duo-text)]">{row.theme}</td>
                  <td className="px-2 py-2 tabular-nums font-bold text-[var(--duo-text-muted)]">{totalOnPaper}</td>
                  <td className="px-2 py-2 tabular-nums font-bold text-[var(--duo-text)]">{scoreCell}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
