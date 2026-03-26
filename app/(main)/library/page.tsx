"use client";

import { useMemo, useRef, useState } from "react";
import { useMistakes } from "@/components/mistakes-provider";
import { NoticeBanner } from "@/components/notice-banner";
import { RetryableImage } from "@/components/retryable-image";
import { TagStatsChart } from "@/components/tag-stats-chart";
import type { MistakeEntry } from "@/lib/types";
import { PRESET_TAGS } from "@/lib/types";
import { useLibraryNotices } from "./use-library-notices";

type ReviewFilter = "all" | "never" | "reviewed";
type SortMode = "added_desc" | "added_asc" | "last_reviewed_desc" | "never_first";

function sortMistakes(list: MistakeEntry[], sort: SortMode): MistakeEntry[] {
  const copy = [...list];
  copy.sort((a, b) => {
    switch (sort) {
      case "added_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "added_asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "last_reviewed_desc": {
        const ta = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
        const tb = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      case "never_first": {
        const aNever = !a.lastReviewedAt;
        const bNever = !b.lastReviewedAt;
        if (aNever !== bNever) return aNever ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      default:
        return 0;
    }
  });
  return copy;
}

export default function LibraryPage() {
  const {
    mistakes,
    removeMistake,
    updateMistake,
    replaceMistakeImage,
    recordManualReview,
    refetchMistakes,
    ready,
    loading,
    loadError,
  } = useMistakes();
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<"all" | "any">("any");
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("added_desc");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCustomTag, setEditCustomTag] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const [replaceImageSaving, setReplaceImageSaving] = useState(false);
  const [replaceImageError, setReplaceImageError] = useState<string | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const {
    conflictNotice,
    actionNotice,
    clearConflictNotice,
    clearActionNotice,
    clearAllNotices,
    showConflictNotice,
    showActionNotice,
  } = useLibraryNotices();

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
    const matched = mistakes.filter((m) => {
      if (filterTags.length > 0) {
        const ok =
          tagMatchMode === "all"
            ? filterTags.every((ft) => m.tags.includes(ft))
            : filterTags.some((ft) => m.tags.includes(ft));
        if (!ok) return false;
      }
      if (reviewFilter === "never" && m.lastReviewedAt) return false;
      if (reviewFilter === "reviewed" && !m.lastReviewedAt) return false;
      if (!q) return true;
      const inNotes = m.notes.toLowerCase().includes(q);
      const inTags = m.tags.some((t) => t.toLowerCase().includes(q));
      return inNotes || inTags;
    });
    return sortMistakes(matched, sortMode);
  }, [mistakes, filterTags, tagMatchMode, search, reviewFilter, sortMode]);

  const toggleFilterTag = (t: string) => {
    setFilterTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const detail = detailId ? mistakes.find((m) => m.id === detailId) : null;

  function openDetail(m: (typeof mistakes)[number]) {
    setDetailId(m.id);
    setEditing(false);
    setEditError(null);
    setReplaceImageError(null);
    clearAllNotices();
    setEditCustomTag("");
    setEditNotes(m.notes);
    setEditTags([...m.tags]);
  }

  function openEdit() {
    if (!detail) return;
    setEditNotes(detail.notes);
    setEditTags([...detail.tags]);
    setEditCustomTag("");
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
        await refetchMistakes();
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
  }

  function toggleEditPreset(t: string) {
    setEditTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function addEditCustomTag() {
    const t = editCustomTag.trim();
    if (!t) return;
    if (!editTags.includes(t)) setEditTags((prev) => [...prev, t]);
    setEditCustomTag("");
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
        await refetchMistakes();
        showConflictNotice(
          "This mistake was updated elsewhere. Latest content has been reloaded. Try replacing the image again.",
        );
        return;
      }
      setReplaceImageError(result.error ?? "Could not replace image.");
      return;
    }
    clearConflictNotice();
  }

  async function onMarkReviewed() {
    if (!detailId || !detail) return;
    setReviewSaving(true);
    const result = await recordManualReview(detailId, { expectedUpdatedAt: detail.updatedAt });
    setReviewSaving(false);
    if (!result.ok) {
      if (result.conflict) {
        await refetchMistakes();
        showConflictNotice(
          "This mistake was updated elsewhere. Latest content has been reloaded. Try marking review again.",
        );
        return;
      }
      showActionNotice(result.error ?? "Could not record review.");
      return;
    }
    clearConflictNotice();
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--duo-text-muted)]">
        <span className="duo-spinner" aria-hidden />
        <span className="text-sm font-bold">Loading…</span>
      </div>
    );
  }

  return (
    <div className="duo-fade-in mx-auto max-w-lg px-4 pb-28 pt-6">
      {loadError && (
        <NoticeBanner
          tone="warning"
          message={loadError}
          className="mb-4"
          actions={[
            {
              label: loading ? "Retrying…" : "Retry",
              onClick: () => void refetchMistakes(),
              disabled: loading,
            },
          ]}
        />
      )}
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">
          Your progress
        </p>
        <h1 className="duo-title-gradient mt-1 text-2xl font-extrabold tracking-tight">Library</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Browse and filter by tags—see which categories show up most often. Mark a manual review when
          you revisit a mistake (no automatic schedules). Edit notes/tags or replace the image in
          details.
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

      <section className="duo-card mb-6 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--duo-text)]">
          <span className="text-lg drop-shadow-sm" aria-hidden>
            📊
          </span>
          Tag stats (top 10)
        </h2>
        <TagStatsChart rows={tagCounts} />
      </section>

      <section className="duo-card mb-4 p-4">
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
                className={`rounded-lg border-2 px-2 py-1 text-xs font-bold transition-all duration-150 ${
                  on
                    ? "border-[var(--duo-blue-shadow)] bg-[var(--duo-blue)] text-white shadow-[0_2px_0_rgba(0,0,0,0.1)]"
                    : "border-[var(--duo-border)] bg-[var(--duo-surface)] text-[var(--duo-text)] hover:scale-105 hover:shadow-sm active:scale-95"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[var(--duo-text-muted)]">
              Manual review
            </span>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value as ReviewFilter)}
              className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold text-[var(--duo-text)] outline-none focus:border-[var(--duo-blue)]"
            >
              <option value="all">All mistakes</option>
              <option value="never">Never reviewed</option>
              <option value="reviewed">Reviewed at least once</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[var(--duo-text-muted)]">Sort by</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2 text-sm font-bold text-[var(--duo-text)] outline-none focus:border-[var(--duo-blue)]"
            >
              <option value="added_desc">Added (newest first)</option>
              <option value="added_asc">Added (oldest first)</option>
              <option value="last_reviewed_desc">Last reviewed (recent first)</option>
              <option value="never_first">Never reviewed first</option>
            </select>
          </label>
        </div>
        {(filterTags.length > 0 || search || reviewFilter !== "all" || sortMode !== "added_desc") && (
          <button
            type="button"
            className="mt-3 text-sm font-bold text-[var(--duo-blue)] underline"
            onClick={() => {
              setFilterTags([]);
              setSearch("");
              setTagMatchMode("any");
              setReviewFilter("all");
              setSortMode("added_desc");
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
            className="duo-card duo-card-interactive group overflow-hidden"
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => openDetail(m)}
            >
              <div className="relative aspect-[4/3] w-full bg-gradient-to-b from-[#fafafa] to-[var(--duo-surface)]">
                <RetryableImage
                  src={m.imageUrl}
                  alt=""
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
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
                  Added {new Date(m.createdAt).toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-xs font-bold text-[var(--duo-green-dark)]">
                  {m.lastReviewedAt
                    ? `Reviewed ${m.reviewCount}× · Last ${new Date(m.lastReviewedAt).toLocaleDateString("en-US")}`
                    : "Not reviewed yet"}
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
                    }
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

      {filtered.length === 0 && !loadError && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--duo-border)] bg-gradient-to-br from-white via-[var(--duo-surface)] to-[#eef7e8] px-4 py-14 text-center shadow-inner">
          <p className="text-4xl drop-shadow-sm" aria-hidden>
            📚
          </p>
          <p className="mt-3 text-lg font-extrabold text-[var(--duo-text)]">Nothing here yet</p>
          <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
            Loosen your filters or add your first mistake under Add.
          </p>
        </div>
      )}

      {detail && (
        <div
          className="duo-modal-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div className="duo-modal-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-[var(--duo-border)] bg-white shadow-2xl shadow-black/15">
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
                        className="rounded-lg bg-[#eef7e8] px-2 py-1 text-sm font-bold text-[var(--duo-green-dark)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border-2 border-[var(--duo-green-shadow)]/30 bg-gradient-to-br from-[#f4fce8] to-[var(--duo-surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <h3 className="text-sm font-bold text-[var(--duo-text)]">Manual review</h3>
                    <p className="mt-1 text-sm font-medium text-[var(--duo-text-muted)]">
                      {detail.lastReviewedAt ? (
                        <>
                          You marked this <span className="font-bold text-[var(--duo-text)]">{detail.reviewCount}</span>{" "}
                          time{detail.reviewCount === 1 ? "" : "s"}. Last:{" "}
                          {new Date(detail.lastReviewedAt).toLocaleString("en-US")}
                        </>
                      ) : (
                        <>Not reviewed yet. When you revisit this mistake, tap the button below.</>
                      )}
                    </p>
                    <button
                      type="button"
                      disabled={reviewSaving}
                      className="duo-btn-primary mt-3 w-full py-3 text-sm disabled:opacity-60"
                      onClick={() => void onMarkReviewed()}
                    >
                      {reviewSaving ? "Saving…" : "Mark as reviewed"}
                    </button>
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
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TAGS.map((t) => {
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
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={editCustomTag}
                        onChange={(e) => setEditCustomTag(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && (e.preventDefault(), addEditCustomTag())
                        }
                        placeholder="Custom tag"
                        className="min-w-0 flex-1 rounded-xl border-2 border-[var(--duo-border)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
                      />
                      <button
                        type="button"
                        onClick={addEditCustomTag}
                        className="shrink-0 rounded-xl border-b-4 border-[#1d9cdb] bg-[var(--duo-blue)] px-3 py-2 text-sm font-bold text-white active:translate-y-0.5 active:border-b-2"
                      >
                        Add
                      </button>
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
