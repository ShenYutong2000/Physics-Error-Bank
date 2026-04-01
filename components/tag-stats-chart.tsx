"use client";

type Row = { tag: string; count: number };
type MasteryRow = { tag: string; correct: number; total: number; masteryPercent: number };

type Props = {
  rows: Row[] | MasteryRow[];
  /** Overrides default library copy when used for papers / themes. */
  emptyMessage?: string;
  ariaLabel?: string;
};

function masteryLevel(percent: number): { label: "High" | "Medium" | "Low"; className: string } {
  if (percent >= 80) {
    return { label: "High", className: "border-[#4caf50] bg-[#e9fbe9] text-[#1f7a1f]" };
  }
  if (percent >= 50) {
    return { label: "Medium", className: "border-[#ff9800] bg-[#fff4e5] text-[#a60]" };
  }
  return { label: "Low", className: "border-[#ff4b4b] bg-[#ffe8e8] text-[#c00]" };
}

export function TagStatsChart({ rows, emptyMessage, ariaLabel }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-medium text-[var(--duo-text-muted)]">
        {emptyMessage ?? "No tagged mistakes yet. Add one under Add!"}
      </div>
    );
  }

  const isMastery = "masteryPercent" in rows[0];
  const max = isMastery ? 100 : Math.max(...rows.map((r) => ("count" in r ? r.count : 0)), 1);

  return (
    <div className="space-y-3" role="img" aria-label={ariaLabel ?? "Bar chart of mistakes per tag"}>
      {rows.map((row, i) => {
        const tag = row.tag;
        const level = isMastery ? masteryLevel((row as MasteryRow).masteryPercent) : null;
        const value = isMastery ? (row as MasteryRow).masteryPercent : (row as Row).count;
        const pct = Math.round((value / max) * 100);
        const hue = 100 + (i * 37) % 60;
        return (
          <div key={tag} className="space-y-1">
            <div className="flex justify-between text-sm font-bold">
              <span className="flex items-center gap-2 text-[var(--duo-text)]">
                {tag}
                {isMastery && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${level?.className ?? ""}`}
                  >
                    {level?.label}
                  </span>
                )}
              </span>
              <span className="tabular-nums text-[var(--duo-text-muted)]">
                {isMastery
                  ? `${(row as MasteryRow).masteryPercent}% (${(row as MasteryRow).correct}/${(row as MasteryRow).total})`
                  : (row as Row).count}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[#e5e5e5]">
              <div
                className="h-full rounded-full border-b-2 border-black/10 transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: `hsl(${hue} 72% 45%)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
