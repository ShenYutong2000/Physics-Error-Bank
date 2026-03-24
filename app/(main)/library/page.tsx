"use client";

import { useMemo, useState } from "react";
import { useMistakes } from "@/components/mistakes-provider";
import { TagStatsChart } from "@/components/tag-stats-chart";
import { PRESET_TAGS } from "@/lib/types";

export default function LibraryPage() {
  const { mistakes, removeMistake, ready, loadError } = useMistakes();
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"all" | "any">("any");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    mistakes.forEach((m) => m.tags.forEach((t) => set.add(t)));
    PRESET_TAGS.forEach((t) => set.add(t));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [mistakes]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    mistakes.forEach((m) => {
      m.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1));
    });
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [mistakes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mistakes.filter((m) => {
      if (filterTags.length > 0) {
        const ok =
          tagMatchMode === "all"
            ? filterTags.every((ft) => m.tags.includes(ft))
            : filterTags.some((ft) => m.tags.includes(ft));
        if (!ok) return false;
      }
      if (!q) return true;
      const inNotes = m.notes.toLowerCase().includes(q);
      const inTags = m.tags.some((t) => t.toLowerCase().includes(q));
      return inNotes || inTags;
    });
  }, [mistakes, filterTags, tagMatchMode, search]);

  const toggleFilterTag = (t: string) => {
    setFilterTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const detail = detailId ? mistakes.find((m) => m.id === detailId) : null;

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--duo-text-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      {loadError && (
        <p className="mb-4 rounded-xl border-2 border-[#ff9800] bg-[#fff4e5] px-3 py-2 text-sm font-bold text-[#a60]">
          {loadError}
        </p>
      )}
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">
          Your progress
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">Library</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Browse and filter by tags—see which categories show up most often.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--duo-text)]">
          <span className="text-lg" aria-hidden>
            📊
          </span>
          Tag stats (top 10)
        </h2>
        <TagStatsChart rows={tagCounts} />
      </section>

      <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Filter & search</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes or tags…"
          className="mb-3 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-blue)]"
        />
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--duo-text-muted)]">
          <span>Tags (multi-select)</span>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="tagMode"
              checked={tagMatchMode === "any"}
              onChange={() => setTagMatchMode("any")}
              className="accent-[var(--duo-blue)]"
            />
            Match any
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="tagMode"
              checked={tagMatchMode === "all"}
              onChange={() => setTagMatchMode("all")}
              className="accent-[var(--duo-blue)]"
            />
            Match all
          </label>
        </div>
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
          {allTags.map((t) => {
            const on = filterTags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleFilterTag(t)}
                className={`rounded-lg border-2 px-2 py-1 text-xs font-bold ${
                  on
                    ? "border-[var(--duo-blue-shadow)] bg-[var(--duo-blue)] text-white"
                    : "border-[var(--duo-border)] bg-[var(--duo-surface)] text-[var(--duo-text)]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        {(filterTags.length > 0 || search) && (
          <button
            type="button"
            className="mt-3 text-sm font-bold text-[var(--duo-blue)] underline"
            onClick={() => {
              setFilterTags([]);
              setSearch("");
              setTagMatchMode("any");
            }}
          >
            Clear all filters
          </button>
        )}
      </section>

      <p className="mb-3 text-sm font-bold text-[var(--duo-text-muted)]">
        {filtered.length} shown
        {mistakes.length !== filtered.length && ` (${mistakes.length} total)`}
      </p>

      <ul className="space-y-4">
        {filtered.map((m) => (
          <li
            key={m.id}
            className="overflow-hidden rounded-2xl border-2 border-[var(--duo-border)] bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => setDetailId(m.id)}
            >
              <div className="relative aspect-[4/3] w-full bg-[var(--duo-surface)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.imageUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="p-3">
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg bg-[#eef7e8] px-2 py-0.5 text-xs font-bold text-[var(--duo-green-dark)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="line-clamp-2 text-sm font-medium text-[var(--duo-text-muted)]">
                  {m.notes || "(No notes)"}
                </p>
                <p className="mt-2 text-xs text-[var(--duo-text-muted)]">
                  {new Date(m.createdAt).toLocaleString("en-US")}
                </p>
              </div>
            </button>
            <div className="flex gap-2 border-t-2 border-[var(--duo-border)] p-3">
              <button
                type="button"
                className="flex-1 rounded-xl border-b-4 border-[#d94848] bg-[#ff4b4b] py-2 text-sm font-bold text-white active:translate-y-0.5 active:border-b-2"
                onClick={() => {
                  if (confirm("Delete this mistake?")) void removeMistake(m.id);
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-2 text-sm font-bold text-[var(--duo-text)]"
                onClick={() => setDetailId(m.id)}
              >
                Details
              </button>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-12 text-center">
          <p className="text-lg font-extrabold text-[var(--duo-text)]">Nothing here yet</p>
          <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
            Loosen your filters or add your first mistake under Add.
          </p>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          onClick={(e) => e.target === e.currentTarget && setDetailId(null)}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-[var(--duo-border)] bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b-2 border-[var(--duo-border)] bg-white px-4 py-3">
              <h2 id="detail-title" className="text-lg font-extrabold text-[var(--duo-text)]">
                Mistake details
              </h2>
              <button
                type="button"
                className="rounded-xl bg-[var(--duo-surface)] px-3 py-1 text-sm font-bold"
                onClick={() => setDetailId(null)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.imageUrl}
                  alt="Problem"
                  className="max-h-[50vh] w-full object-contain"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg bg-[#eef7e8] px-2 py-1 text-sm font-bold text-[var(--duo-green-dark)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h3 className="mt-4 text-sm font-bold text-[var(--duo-text)]">Solution & notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-[var(--duo-text-muted)]">
                {detail.notes || "(None)"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
