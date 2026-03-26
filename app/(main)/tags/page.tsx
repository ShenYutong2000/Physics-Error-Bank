"use client";

import { useMemo, useState } from "react";
import { useMistakes } from "@/components/mistakes-provider";
import { apiFetchJson } from "@/lib/api-client";
import { PRESET_TAG_SET } from "@/lib/types";

type TrendRow = {
  month: string;
  count: number;
};

function buildTagTrend(
  mistakes: { createdAt: string; tags: string[] }[],
  tagName: string,
  monthsBack = 6,
): TrendRow[] {
  const now = new Date();
  const rows: TrendRow[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    rows.push({ month: key, count: 0 });
  }
  const indexMap = new Map(rows.map((r, i) => [r.month, i]));
  mistakes.forEach((m) => {
    if (!m.tags.includes(tagName)) return;
    const dt = new Date(m.createdAt);
    if (Number.isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const idx = indexMap.get(key);
    if (idx !== undefined) rows[idx].count += 1;
  });
  return rows;
}

export default function TagsPage() {
  const { mistakes, refetchMistakes } = useMistakes();
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const rows = useMemo(() => {
    const map = new Map<string, number>();
    mistakes.forEach((m) => {
      m.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1));
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));
  }, [mistakes]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const lowUsageRows = useMemo(() => rows.filter((r) => r.count <= 1), [rows]);

  const trendRows = useMemo(
    () => (selectedTag ? buildTagTrend(mistakes, selectedTag, 6) : []),
    [mistakes, selectedTag],
  );

  async function onRenameOrMerge() {
    if (!selectedTag) return;
    if (PRESET_TAG_SET.has(selectedTag)) {
      setActionMsg("Preset curriculum tags are locked and cannot be edited.");
      return;
    }
    const toName = renameTo.trim();
    if (!toName) {
      setActionMsg("Please enter a target tag name.");
      return;
    }
    const result = await apiFetchJson<{ movedCount: number }>("/api/tags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromName: selectedTag, toName }),
    });
    if (!result.ok) {
      setActionMsg(result.error ?? "Rename failed.");
      return;
    }
    setActionMsg(`Moved ${result.data.movedCount ?? 0} linked mistake tags.`);
    setRenameTo("");
    await refetchMistakes();
    setSelectedTag(toName);
  }

  async function onDeleteTag(name: string, count: number) {
    if (PRESET_TAG_SET.has(name)) {
      setActionMsg("Preset curriculum tags are locked and cannot be deleted.");
      return;
    }
    const ok = confirm(
      `Delete tag "${name}"?\nThis will remove it from ${count} mistake(s) and affect historical statistics.`,
    );
    if (!ok) return;
    const result = await apiFetchJson<{ detachedCount: number }>("/api/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!result.ok) {
      setActionMsg(result.error ?? "Delete failed.");
      return;
    }
    setActionMsg(`Deleted "${name}" from ${result.data.detachedCount ?? 0} mistake(s).`);
    if (selectedTag === name) {
      setSelectedTag("");
    }
    await refetchMistakes();
  }

  const trendMax = Math.max(...trendRows.map((r) => r.count), 1);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-green-dark)]">Tag governance</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">Tag management</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Keep labels clean: merge synonyms, monitor trend, and remove low-value tags.
        </p>
      </header>

      {actionMsg && (
        <p className="mb-4 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold text-[var(--duo-text)]">
          {actionMsg}
        </p>
      )}

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Rename / merge tags</h2>
        <p className="mb-2 text-xs font-medium text-[var(--duo-text-muted)]">
          Note: A-E preset curriculum tags are locked (not editable/deletable).
        </p>
        <div className="mb-2 flex gap-2">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="">Select source tag</option>
            {rows.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({r.count})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refetchMistakes()}
            className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold"
          >
            Refresh
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
            placeholder="Target tag name (new or existing)"
            className="min-w-0 flex-1 rounded-xl border-2 border-[var(--duo-border)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
          />
          <button
            type="button"
            onClick={() => void onRenameOrMerge()}
            disabled={!selectedTag || PRESET_TAG_SET.has(selectedTag)}
            className="shrink-0 rounded-xl border-b-4 border-[#1d9cdb] bg-[var(--duo-blue)] px-4 py-2 text-sm font-bold text-white active:translate-y-0.5 active:border-b-2"
          >
            {selectedTag && PRESET_TAG_SET.has(selectedTag) ? "Locked" : "Apply"}
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Trend (last 6 months)</h2>
        {!selectedTag ? (
          <p className="text-sm font-medium text-[var(--duo-text-muted)]">Select a tag to view trend.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-bold text-[var(--duo-text)]">{selectedTag}</p>
            {trendRows.map((r) => (
              <div key={r.month} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[var(--duo-text-muted)]">
                  <span>{r.month}</span>
                  <span>{r.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#e5e5e5]">
                  <div
                    className="h-full rounded-full bg-[var(--duo-green)]"
                    style={{ width: `${Math.round((r.count / trendMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Tag inventory</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tag"
          className="mb-3 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-blue)]"
        />
        <div className="space-y-2">
          {filteredRows.map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2">
              <button
                type="button"
                onClick={() => setSelectedTag(r.name)}
                className="text-left text-sm font-bold text-[var(--duo-text)] underline-offset-2 hover:underline"
              >
                {r.name}
              </button>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-[var(--duo-text-muted)]">{r.count}</span>
                <button
                  type="button"
                  onClick={() => void onDeleteTag(r.name, r.count)}
                  disabled={PRESET_TAG_SET.has(r.name)}
                  className="rounded-lg border-b-4 border-[#d94848] bg-[#ff4b4b] px-2 py-1 text-xs font-bold text-white active:translate-y-0.5 active:border-b-2"
                >
                  {PRESET_TAG_SET.has(r.name) ? "Locked" : "Delete"}
                </button>
              </div>
            </div>
          ))}
          {filteredRows.length === 0 && (
            <p className="text-sm font-medium text-[var(--duo-text-muted)]">No tags found.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Low usage tags (&lt;=1)</h2>
        {lowUsageRows.length === 0 ? (
          <p className="text-sm font-medium text-[var(--duo-text-muted)]">No low usage tags.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lowUsageRows.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => void onDeleteTag(r.name, r.count)}
                disabled={PRESET_TAG_SET.has(r.name)}
                className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-xs font-bold text-[var(--duo-text)]"
                title="Click to delete; this will affect historical stats."
              >
                {r.name} ({r.count}){PRESET_TAG_SET.has(r.name) ? " - Locked" : ""}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
