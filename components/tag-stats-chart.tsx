"use client";

type Row = { tag: string; count: number };

export function TagStatsChart({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-gradient-to-br from-[var(--duo-surface)] to-white px-4 py-10 text-center text-sm font-medium text-[var(--duo-text-muted)]">
        <span className="mb-2 block text-2xl" aria-hidden>
          ✨
        </span>
        No tagged mistakes yet. Add one under Add!
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="space-y-3" role="img" aria-label="Bar chart of mistakes per tag">
      {rows.map(({ tag, count }, i) => {
        const pct = Math.round((count / max) * 100);
        const hue = 100 + (i * 37) % 60;
        return (
          <div key={tag} className="space-y-1">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-[var(--duo-text)]">{tag}</span>
              <span className="tabular-nums text-[var(--duo-text-muted)]">{count}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[#e5e5e5] shadow-inner">
              <div
                className="duo-stat-bar-fill h-full rounded-full border-b-2 border-black/10 shadow-sm"
                style={{
                  width: `${pct}%`,
                  backgroundColor: `hsl(${hue} 72% 45%)`,
                  animationDelay: `${i * 55}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
