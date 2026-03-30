"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMistakes } from "@/components/mistakes-provider";
import { compressImageForUpload } from "@/lib/image-compress";
import { rotateImageFile } from "@/lib/image-edit";
import { PRESET_TAGS, TAG_GROUPS } from "@/lib/types";

export default function AddMistakePage() {
  const { addMistake, mistakes, ready, saving, loadError } = useMistakes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [rotateTurns, setRotateTurns] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [savePhase, setSavePhase] = useState<
    "idle" | "compressing" | "uploading" | "finalizing"
  >("idle");

  const clearPreview = useCallback(() => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    selectedFileRef.current = null;
  }, [previewUrl]);

  const onFile = useCallback((file: File | null) => {
    setError(null);
    setSaveSuccess(false);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    selectedFileRef.current = file;
    setRotateTurns(0);
    setUploadPercent(null);
    setSavePhase("idle");
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      event.preventDefault();
      onFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  const togglePreset = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag("");
  };

  const knownTags = Array.from(
    new Set([
      ...PRESET_TAGS,
      ...mistakes.flatMap((m) => m.tags),
    ]),
  ).sort((a, b) => a.localeCompare(b, "en"));
  const suggestedCustomTags = customTag.trim()
    ? knownTags
        .filter(
          (t) =>
            !tags.includes(t) &&
            t.toLowerCase().includes(customTag.trim().toLowerCase()),
        )
        .slice(0, 6)
    : knownTags.filter((t) => !tags.includes(t)).slice(0, 6);

  const submit = async () => {
    setError(null);
    setSaveSuccess(false);
    const rawFile = selectedFileRef.current;
    if (!rawFile) {
      setError("Take a photo or upload an image of the problem first.");
      return;
    }
    if (tags.length === 0) {
      setError("Pick at least one tag.");
      return;
    }
    setCompressing(true);
    setSavePhase("compressing");
    setUploadPercent(null);
    let file: File = rawFile;
    try {
      const prepared = rotateTurns === 0 ? rawFile : await rotateImageFile(rawFile, rotateTurns);
      file = await compressImageForUpload(prepared, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
      });
    } catch {
      // Compression failure should not block upload.
      file = rawFile;
    } finally {
      setCompressing(false);
    }

    setSavePhase("uploading");
    const result = await addMistake(
      { file, tags, notes: notes.trim() },
      {
        onUploadProgress: ({ percent }) => {
          setUploadPercent(percent);
          setSavePhase("uploading");
        },
      },
    );
    if (!result.ok) {
      setError(result.error ?? "Could not save.");
      setSavePhase("idle");
      return;
    }
    setSavePhase("finalizing");
    clearPreview();
    setTags([]);
    setNotes("");
    setRotateTurns(0);
    setUploadPercent(100);
    setSaveSuccess(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => {
      setSavePhase("idle");
      setUploadPercent(null);
    }, 800);
  };

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
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-green-dark)]">
          Today’s mistakes
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">
          Add a mistake
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Snap or upload a photo, tag it, and jot down your solution notes—then save it to your library.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Problem image</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          id="mistake-photo"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div
          className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
            dragOver
              ? "border-[var(--duo-blue)] bg-[#eef7ff]"
              : "border-[var(--duo-border)] bg-[var(--duo-surface)]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <p className="mb-3 text-xs font-medium text-[var(--duo-text-muted)]">
            Drag image here, or paste screenshot with Ctrl+V.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label
            htmlFor="mistake-photo"
            className="duo-btn-primary flex flex-1 cursor-pointer items-center justify-center gap-2 py-4 text-center"
          >
            <span aria-hidden>📷</span>
            Camera / upload
          </label>
          {previewUrl && (
            <button
              type="button"
              className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-2 text-sm font-bold text-[var(--duo-text)]"
              onClick={() => {
                clearPreview();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Remove image
            </button>
          )}
          </div>
        </div>
        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview of the problem"
              className="max-h-64 w-full object-contain"
              style={{ transform: `rotate(${rotateTurns * 90}deg)` }}
            />
          </div>
        )}
        {previewUrl && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setRotateTurns((prev) => (prev + 1) % 4);
                setSaveSuccess(false);
              }}
              className="rounded-xl border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--duo-text)]"
            >
              Rotate 90°
            </button>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Tags</h2>
        <div className="mb-3 flex justify-end">
          <Link href="/tags" className="text-xs font-bold text-[var(--duo-blue)] underline">
            Manage tags
          </Link>
        </div>
        <div className="space-y-4">
          {TAG_GROUPS.map((group) => (
            <div key={group.theme}>
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--duo-text-muted)]">
                {group.theme}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => togglePreset(t)}
                      className={`rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                        on
                          ? "border-[var(--duo-green-shadow)] bg-[var(--duo-green)] text-white"
                          : "border-[var(--duo-border)] bg-[var(--duo-surface)] text-[var(--duo-text)] hover:bg-[#eef7e8]"
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
        <div className="mt-4 flex gap-2">
          <input
            list="known-tags"
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
            placeholder="Custom tag"
            className="min-w-0 flex-1 rounded-xl border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="shrink-0 rounded-xl border-b-4 border-[#1d9cdb] bg-[var(--duo-blue)] px-4 py-2 text-sm font-bold text-white active:translate-y-0.5 active:border-b-2"
          >
            Add
          </button>
        </div>
        <datalist id="known-tags">
          {knownTags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {suggestedCustomTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedCustomTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (!tags.includes(t)) setTags((prev) => [...prev, t]);
                  setCustomTag("");
                }}
                className="rounded-lg border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-2 py-1 text-xs font-bold text-[var(--duo-text)]"
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {tags.filter((t) => !(PRESET_TAGS as readonly string[]).includes(t)).length > 0 && (
          <p className="mt-2 text-xs font-medium text-[var(--duo-text-muted)]">
            Custom tags:{" "}
            {tags.filter((t) => !(PRESET_TAGS as readonly string[]).includes(t)).join(", ")}
          </p>
        )}
      </section>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Solution & notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Write the correct approach, key formulas, pitfalls…"
          className="w-full resize-y rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] p-3 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
        />
      </section>

      {error && (
        <p className="mb-4 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}
      {saveSuccess && (
        <div className="mb-4 rounded-xl border-2 border-[#58cc02] bg-[#ebf9de] px-3 py-2 text-sm font-bold text-[#2d7a00]">
          Saved successfully.
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border-2 border-[#58cc02] bg-white px-3 py-1 text-xs font-bold text-[#2d7a00]"
            >
              Continue adding next
            </button>
            <Link
              href="/library"
              className="rounded-lg border-2 border-[#9fd97a] bg-[#f7fff1] px-3 py-1 text-xs font-bold text-[#2d7a00]"
            >
              View library
            </Link>
          </div>
        </div>
      )}
      {(compressing || saving || savePhase !== "idle") && (
        <div className="mb-3 rounded-xl border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--duo-text)]">
          <p>
            {savePhase === "compressing"
              ? "Optimizing image..."
              : savePhase === "uploading"
                ? uploadPercent !== null
                  ? `Uploading... ${uploadPercent}%`
                  : "Uploading..."
                : savePhase === "finalizing"
                  ? "Finishing save..."
                  : "Preparing..."}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--duo-surface)]">
            <div
              className="h-full bg-[var(--duo-blue)] transition-all"
              style={{
                width:
                  savePhase === "compressing"
                    ? "28%"
                    : savePhase === "uploading"
                      ? `${uploadPercent ?? 65}%`
                      : savePhase === "finalizing"
                        ? "100%"
                        : "12%",
              }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving || compressing}
        className="duo-btn-primary w-full py-4 text-lg disabled:opacity-60"
      >
        {compressing
          ? "Optimizing image..."
          : saving || savePhase === "uploading" || savePhase === "finalizing"
            ? "Saving..."
            : "Save to library"}
      </button>
    </div>
  );
}
