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

function themeColor(theme: string): { chipBg: string; chipText: string; chipBorder: string; rowBg: string } {
  const key = theme.trim().toUpperCase();
  const palette: Record<string, { chipBg: string; chipText: string; chipBorder: string; rowBg: string }> = {
    A: { chipBg: "#e8f3ff", chipText: "#1c6ed6", chipBorder: "#b6d4fe", rowBg: "#f7fbff" },
    B: { chipBg: "#efe9ff", chipText: "#6f42c1", chipBorder: "#d0bfff", rowBg: "#faf7ff" },
    C: { chipBg: "#ffeaf4", chipText: "#c2255c", chipBorder: "#f4b6cf", rowBg: "#fff8fc" },
    D: { chipBg: "#fff4e5", chipText: "#a65b00", chipBorder: "#ffd8a8", rowBg: "#fffaf3" },
    E: { chipBg: "#e8f3ff", chipText: "#1c6ed6", chipBorder: "#b6d4fe", rowBg: "#f7fbff" },
    M: { chipBg: "#e6fcf5", chipText: "#087f5b", chipBorder: "#96f2d7", rowBg: "#f3fffc" },
  };
  return palette[key] ?? { chipBg: "#f1f3f5", chipText: "#495057", chipBorder: "#dee2e6", rowBg: "#fcfcfd" };
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
                <tr key={row.theme} className="border-b border-[var(--duo-border)] last:border-b-0" style={{ backgroundColor: themeColor(row.theme).rowBg }}>
                  <td className="px-2 py-2 font-bold text-[var(--duo-text)]">
                    <span
                      className="inline-flex min-w-7 items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-extrabold"
                      style={{
                        backgroundColor: themeColor(row.theme).chipBg,
                        color: themeColor(row.theme).chipText,
                        borderColor: themeColor(row.theme).chipBorder,
                      }}
                    >
                      {row.theme}
                    </span>
                  </td>
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
