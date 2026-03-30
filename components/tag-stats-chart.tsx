"use client";

type Row = { tag: string; count: number };

type Props = {
  rows: Row[];
  /** Overrides default library copy when used for papers / themes. */
  emptyMessage?: string;
  ariaLabel?: string;
};

export function TagStatsChart({ rows, emptyMessage, ariaLabel }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-medium text-[var(--duo-text-muted)]">
        {emptyMessage ?? "No tagged mistakes yet. Add one under Add!"}
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="space-y-3" role="img" aria-label={ariaLabel ?? "Bar chart of mistakes per tag"}>
      {rows.map(({ tag, count }, i) => {
        const pct = Math.round((count / max) * 100);
        const hue = 100 + (i * 37) % 60;
        return (
          <div key={tag} className="space-y-1">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-[var(--duo-text)]">{tag}</span>
              <span className="tabular-nums text-[var(--duo-text-muted)]">{count}</span>
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
