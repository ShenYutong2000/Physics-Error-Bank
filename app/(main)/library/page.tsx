"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { mainPageClassName } from "@/components/main-page-layout";
import { useMistakes } from "@/components/mistakes-provider";
import { NoticeBanner } from "@/components/notice-banner";
import { RetryableImage } from "@/components/retryable-image";
import { TagStatsChart } from "@/components/tag-stats-chart";
import { apiFetchJson } from "@/lib/api-client";
import { PRESET_TAG_SET, PRESET_TAGS, TAG_GROUPS, type MistakeEntry } from "@/lib/types";
import { useLibraryNotices } from "./use-library-notices";

export default function LibraryPage() {
  const {
    removeMistake,
    updateMistake,
    replaceMistakeImage,
    ready,
    loading,
    loadError,
  } = useMistakes();
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "most_wrong" | "recently_edited" | "recently_reviewed">("latest");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"all" | "any">("any");
  const [search, setSearch] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [hasNotes, setHasNotes] = useState<"any" | "yes" | "no">("any");
  const [presetTagFilter, setPresetTagFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const [replaceImageSaving, setReplaceImageSaving] = useState(false);
  const [replaceImageError, setReplaceImageError] = useState<string | null>(null);
  const {
    conflictNotice,
    actionNotice,
    clearConflictNotice,
    clearActionNotice,
    clearAllNotices,
    showConflictNotice,
    showActionNotice,
  } = useLibraryNotices();

  async function loadList(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    params.set("sort", sortBy);
    if (search.trim()) params.set("search", search.trim());
    if (createdFrom) params.set("createdFrom", createdFrom);
    if (createdTo) params.set("createdTo", createdTo);
    if (hasNotes !== "any") params.set("hasNotes", hasNotes);
    if (presetTagFilter) params.set("presetTag", presetTagFilter);
    params.set("tagMatchMode", tagMatchMode);
    filterTags.forEach((t) => params.append("tag", t));
    setListLoading(true);
    const result = await apiFetchJson<{
      mistakes: MistakeEntry[];
      total: number;
      hasMore: boolean;
      page: number;
    }>(`/api/mistakes?${params.toString()}`);
    setListLoading(false);
    if (!result.ok) {
      showActionNotice(result.error ?? "Failed to load mistakes.");
      return;
    }
    setMistakes(Array.isArray(result.data.mistakes) ? result.data.mistakes : []);
    setTotal(typeof result.data.total === "number" ? result.data.total : 0);
    setHasMore(Boolean(result.data.hasMore));
    setPage(typeof result.data.page === "number" ? result.data.page : nextPage);
    setSelectedIds([]);
    setDetailId(null);
  }

  useEffect(() => {
    if (!ready) return;
    void loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sortBy, tagMatchMode, pageSize]);

  useEffect(() => {
    if (!ready) return;
    const h = setTimeout(() => {
      void loadList(1);
    }, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, search, filterTags, createdFrom, createdTo, hasNotes, presetTagFilter]);

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
      if (createdFrom) {
        const fromDate = new Date(`${createdFrom}T00:00:00.000Z`);
        if (!Number.isNaN(fromDate.getTime()) && new Date(m.createdAt).getTime() < fromDate.getTime()) {
          return false;
        }
      }
      if (createdTo) {
        const toDate = new Date(`${createdTo}T23:59:59.999Z`);
        if (!Number.isNaN(toDate.getTime()) && new Date(m.createdAt).getTime() > toDate.getTime()) {
          return false;
        }
      }
      if (hasNotes === "yes" && !m.notes.trim()) return false;
      if (hasNotes === "no" && m.notes.trim()) return false;
      if (presetTagFilter && !m.tags.includes(presetTagFilter)) return false;
      if (!q) return true;
      const inNotes = m.notes.toLowerCase().includes(q);
      const inTags = m.tags.some((t) => t.toLowerCase().includes(q));
      return inNotes || inTags;
    });
  }, [mistakes, filterTags, tagMatchMode, search, createdFrom, createdTo, hasNotes, presetTagFilter]);

  const suggestedPresetTagFilters = useMemo(() => {
    const fromRecords = allTags.filter((t) => PRESET_TAG_SET.has(t));
    return Array.from(new Set([...PRESET_TAGS, ...fromRecords]));
  }, [allTags]);

  function renderHighlightedText(text: string, queryRaw: string): ReactNode {
    const query = queryRaw.trim();
    if (!query) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts: ReactNode[] = [];
    let start = 0;
    while (start < text.length) {
      const idx = lowerText.indexOf(lowerQuery, start);
      if (idx === -1) {
        parts.push(text.slice(start));
        break;
      }
      if (idx > start) parts.push(text.slice(start, idx));
      parts.push(
        <mark key={`${idx}-${start}`} className="rounded bg-[#fff3a3] px-0.5 text-[var(--duo-text)]">
          {text.slice(idx, idx + query.length)}
        </mark>,
      );
      start = idx + query.length;
    }
    return <>{parts}</>;
  }

  function getNotesSnippet(notes: string, queryRaw: string, radius = 36): string | null {
    const query = queryRaw.trim();
    if (!query || !notes) return null;
    const lowerNotes = notes.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerNotes.indexOf(lowerQuery);
    if (idx < 0) return null;
    const start = Math.max(0, idx - radius);
    const end = Math.min(notes.length, idx + query.length + radius);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < notes.length ? "..." : "";
    return `${prefix}${notes.slice(start, end)}${suffix}`;
  }

  const toggleFilterTag = (t: string) => {
    setFilterTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selectedSet.has(m.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectVisible() {
    if (allVisibleSelected) {
      const visible = new Set(filtered.map((m) => m.id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...filtered.map((m) => m.id)])]);
  }

  async function runBulk(action: "add_tags" | "remove_tags" | "delete" | "export") {
    if (selectedIds.length === 0) return;
    const tags = bulkTagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if ((action === "add_tags" || action === "remove_tags") && tags.length === 0) {
      showActionNotice("Please enter tags separated by commas.");
      return;
    }
    if (action === "delete" && !confirm(`Delete ${selectedIds.length} selected mistakes?`)) {
      return;
    }
    setBulkBusy(true);
    const result = await apiFetchJson<{
      affected?: number;
      deletedIds?: string[];
      count?: number;
      mistakes?: MistakeEntry[];
      exportedAt?: string;
    }>("/api/mistakes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: selectedIds, tags }),
    });
    setBulkBusy(false);
    if (!result.ok) {
      showActionNotice(result.error ?? "Bulk action failed.");
      return;
    }
    if (action === "export") {
      const payload = {
        exportedAt: result.data.exportedAt ?? new Date().toISOString(),
        count: result.data.count ?? result.data.mistakes?.length ?? 0,
        mistakes: result.data.mistakes ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mistakes-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    setBulkTagInput("");
    await loadList(page);
  }

  const detail = detailId ? mistakes.find((m) => m.id === detailId) : null;

  function openDetail(m: (typeof mistakes)[number]) {
    setDetailId(m.id);
    setEditing(false);
    setEditError(null);
    setReplaceImageError(null);
    clearAllNotices();
    setEditNotes(m.notes);
    setEditTags([...m.tags]);
  }

  function openEdit() {
    if (!detail) return;
    setEditNotes(detail.notes);
    setEditTags([...detail.tags]);
    setEditError(null);
    clearConflictNotice();
    setEditing(true);
  }

  function cancelEdit() {
    if (detail) {
      setEditNotes(detail.notes);
      setEditTags([...detail.tags]);
    }
    setEditing(false);
    setEditError(null);
  }

  async function saveEdit() {
    if (!detailId || !detail) return;
    if (editTags.length === 0) {
      setEditError("Pick at least one tag.");
      return;
    }
    setEditError(null);
    setEditSaving(true);
    const result = await updateMistake(detailId, {
      notes: editNotes.trim(),
      tags: editTags,
      expectedUpdatedAt: detail.updatedAt,
    });
    setEditSaving(false);
    if (!result.ok) {
      if (result.conflict) {
        await loadList(page);
        setEditing(false);
        showConflictNotice(
          "This mistake was updated elsewhere. Latest content has been reloaded. Please review and edit again.",
        );
        return;
      }
      setEditError(result.error ?? "Save failed.");
      return;
    }
    setEditing(false);
    clearConflictNotice();
    await loadList(page);
  }

  function toggleEditPreset(t: string) {
    setEditTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function closeDetail() {
    setDetailId(null);
    setEditing(false);
    setEditError(null);
    setReplaceImageError(null);
    clearAllNotices();
  }

  async function onReplaceImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !detailId || !detail) return;
    setReplaceImageError(null);
    setReplaceImageSaving(true);
    const result = await replaceMistakeImage(detailId, {
      file,
      expectedUpdatedAt: detail.updatedAt,
    });
    setReplaceImageSaving(false);
    if (!result.ok) {
      if (result.conflict) {
        await loadList(page);
        showConflictNotice(
          "This mistake was updated elsewhere. Latest content has been reloaded. Try replacing the image again.",
        );
        return;
      }
      setReplaceImageError(result.error ?? "Could not replace image.");
      return;
    }
    clearConflictNotice();
    await loadList(page);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--duo-text-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className={mainPageClassName}>
      {loadError && (
        <NoticeBanner
          tone="warning"
          message={loadError}
          className="mb-4"
          actions={[
            {
              label: loading ? "Retrying…" : "Retry",
              onClick: () => void loadList(page),
              disabled: loading,
            },
          ]}
        />
      )}
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">
          Your progress
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">Library</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Browse and filter by tags—see which categories show up most often. In details you can edit
          notes and tags, or replace the problem image with a clearer photo.
        </p>
      </header>
      {actionNotice && (
        <NoticeBanner
          tone="error"
          message={actionNotice}
          className="mb-4"
          actions={[{ label: "Dismiss", onClick: clearActionNotice }]}
        />
      )}

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
        <label className="mb-3 block text-xs font-bold text-[var(--duo-text-muted)]">
          Sort
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as "latest" | "most_wrong" | "recently_edited" | "recently_reviewed",
              )
            }
            className="mt-1 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold text-[var(--duo-text)]"
          >
            <option value="latest">Latest</option>
            <option value="most_wrong">Most Wrong</option>
            <option value="recently_edited">Recently Edited</option>
            <option value="recently_reviewed">Recently Reviewed</option>
          </select>
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes or tags..."
          className="mb-3 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-blue)]"
        />
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold text-[var(--duo-text-muted)]">
            Created from
            <input
              type="text"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              placeholder="YYYY-MM-DD"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              aria-label="Created from date (YYYY-MM-DD)"
              className="mt-1 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-blue)]"
            />
          </label>
          <label className="text-xs font-bold text-[var(--duo-text-muted)]">
            Created to
            <input
              type="text"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              placeholder="YYYY-MM-DD"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              aria-label="Created to date (YYYY-MM-DD)"
              className="mt-1 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-blue)]"
            />
          </label>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold text-[var(--duo-text-muted)]">
            Notes presence
            <select
              value={hasNotes}
              onChange={(e) => setHasNotes(e.target.value as "any" | "yes" | "no")}
              className="mt-1 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold text-[var(--duo-text)]"
            >
              <option value="any">Any</option>
              <option value="yes">Has notes</option>
              <option value="no">No notes</option>
            </select>
          </label>
          <label className="text-xs font-bold text-[var(--duo-text-muted)]">
            Preset tag
            <select
              value={presetTagFilter}
              onChange={(e) => setPresetTagFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold text-[var(--duo-text)]"
            >
              <option value="">Any preset tag</option>
              {suggestedPresetTagFilters.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
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
        {(filterTags.length > 0 ||
          search ||
          createdFrom ||
          createdTo ||
          hasNotes !== "any" ||
          presetTagFilter) && (
          <button
            type="button"
            className="mt-3 text-sm font-bold text-[var(--duo-blue)] underline"
            onClick={() => {
              setFilterTags([]);
              setSearch("");
              setCreatedFrom("");
              setCreatedTo("");
              setHasNotes("any");
              setPresetTagFilter("");
              setTagMatchMode("any");
              void loadList(1);
            }}
          >
            Clear all filters
          </button>
        )}
      </section>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--duo-text-muted)]">
          {filtered.length} shown · {total} total
          {listLoading && " · loading..."}
        </p>
        <button
          type="button"
          className="text-xs font-bold text-[var(--duo-blue)] underline"
          onClick={toggleSelectVisible}
        >
          {allVisibleSelected ? "Unselect visible" : "Select visible"}
        </button>
      </div>

      {selectedIds.length > 0 && (
        <section className="mb-4 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-3 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
          <p className="mb-2 text-sm font-extrabold text-[var(--duo-text)]">
            {selectedIds.length} selected
          </p>
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
              placeholder="Tags (comma separated)"
              className="min-w-0 flex-1 rounded-xl border-2 border-[var(--duo-border)] px-3 py-2 text-sm font-medium outline-none"
            />
            <button
              type="button"
              disabled={bulkBusy}
              className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-xs font-bold"
              onClick={() => void runBulk("add_tags")}
            >
              Add tags in bulk
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-xs font-bold"
              onClick={() => void runBulk("remove_tags")}
            >
              Remove tags in bulk
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              className="flex-1 rounded-xl border-2 border-[#d94848] bg-[#ffe8e8] py-2 text-xs font-bold text-[#c00]"
              onClick={() => void runBulk("delete")}
            >
              Delete in bulk
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              className="flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-2 text-xs font-bold"
              onClick={() => void runBulk("export")}
            >
              Export in bulk
            </button>
          </div>
        </section>
      )}

      <ul className="space-y-4">
        {filtered.map((m) => (
          <li
            key={m.id}
            className="overflow-hidden rounded-2xl border-2 border-[var(--duo-border)] bg-white shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
          >
            <div className="border-b-2 border-[var(--duo-border)] px-3 py-2">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--duo-text-muted)]">
                <input
                  type="checkbox"
                  checked={selectedSet.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  className="accent-[var(--duo-blue)]"
                />
                Select
              </label>
            </div>
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => openDetail(m)}
            >
              <div className="relative aspect-[4/3] w-full bg-[var(--duo-surface)]">
                <RetryableImage
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
                      className="rounded-lg bg-[#ecebff] px-2 py-0.5 text-xs font-bold text-[var(--duo-green-dark)]"
                    >
                      {renderHighlightedText(t, search)}
                    </span>
                  ))}
                </div>
                <p className="line-clamp-2 text-sm font-medium text-[var(--duo-text-muted)]">
                  {m.notes ? renderHighlightedText(m.notes, search) : "(No notes)"}
                </p>
                {search.trim() && getNotesSnippet(m.notes, search) && (
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-[var(--duo-text-muted)]">
                    Match: {renderHighlightedText(getNotesSnippet(m.notes, search) ?? "", search)}
                  </p>
                )}
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
                  if (!confirm("Delete this mistake?")) return;
                  void (async () => {
                    const r = await removeMistake(m.id);
                    if (!r.ok) {
                      showActionNotice(r.error ?? "Delete failed.");
                      return;
                    }
                    await loadList(page);
                  })();
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-2 text-sm font-bold text-[var(--duo-text)]"
                onClick={() => openDetail(m)}
              >
                Details
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || listLoading}
          className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold disabled:opacity-50"
          onClick={() => void loadList(page - 1)}
        >
          Prev
        </button>
        <button
          type="button"
          disabled={!hasMore || listLoading}
          className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold disabled:opacity-50"
          onClick={() => void loadList(page + 1)}
        >
          Next
        </button>
        <span className="text-xs font-bold text-[var(--duo-text-muted)]">Page {page}</span>
      </div>

      {filtered.length === 0 && !loadError && (
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
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border-2 border-[var(--duo-border)] bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[var(--duo-border)] bg-white px-4 py-3">
              <h2 id="detail-title" className="text-lg font-extrabold text-[var(--duo-text)]">
                Mistake details
              </h2>
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    type="button"
                    className="rounded-xl border-2 border-[var(--duo-green-shadow)] bg-[var(--duo-green)] px-3 py-1 text-sm font-bold text-white"
                    onClick={openEdit}
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-xl bg-[var(--duo-surface)] px-3 py-1 text-sm font-bold"
                  onClick={closeDetail}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)]">
                <RetryableImage
                  src={detail.imageUrl}
                  alt="Problem"
                  className="max-h-[50vh] w-full object-contain"
                />
              </div>
              <div className="mt-3">
                <input
                  ref={replaceImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => void onReplaceImageFile(ev)}
                />
                <button
                  type="button"
                  disabled={replaceImageSaving}
                  className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-2.5 text-sm font-bold text-[var(--duo-text)] disabled:opacity-60"
                  aria-label="Replace problem image with a new photo"
                  onClick={() => replaceImageInputRef.current?.click()}
                >
                  {replaceImageSaving ? "Uploading new image…" : "Replace image"}
                </button>
                {replaceImageError && (
                  <p className="mt-2 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
                    {replaceImageError}
                  </p>
                )}
              </div>

              {!editing ? (
                <>
                  {conflictNotice && (
                    <NoticeBanner
                      tone="warning"
                      message={conflictNotice}
                      className="mt-4"
                      actions={[
                        { label: "Edit latest version", onClick: openEdit },
                        { label: "Dismiss", onClick: clearConflictNotice },
                      ]}
                    />
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detail.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg bg-[#ecebff] px-2 py-1 text-sm font-bold text-[var(--duo-green-dark)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-[var(--duo-text)]">Solution & notes</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-[var(--duo-text-muted)]">
                    {detail.notes || "(None)"}
                  </p>
                </>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[var(--duo-text)]">Tags</h3>
                    <div className="space-y-4">
                      {TAG_GROUPS.map((group) => (
                        <div key={group.theme}>
                          <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--duo-text-muted)]">
                            {group.theme}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {group.tags.map((t) => {
                              const on = editTags.includes(t);
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => toggleEditPreset(t)}
                                  className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${
                                    on
                                      ? "border-[var(--duo-green-shadow)] bg-[var(--duo-green)] text-white"
                                      : "border-[var(--duo-border)] bg-[var(--duo-surface)] text-[var(--duo-text)]"
                                  }`}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[var(--duo-text)]">Solution & notes</h3>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={5}
                      className="w-full resize-y rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] p-3 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
                    />
                  </div>
                  {editError && (
                    <p className="rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
                      {editError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={editSaving}
                      className="duo-btn-primary flex-1 py-3 text-sm disabled:opacity-60"
                      onClick={() => void saveEdit()}
                    >
                      {editSaving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      disabled={editSaving}
                      className="flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] py-3 text-sm font-bold text-[var(--duo-text)]"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
