"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useMistakes } from "@/components/mistakes-provider";
import { PRESET_TAGS } from "@/lib/types";

export default function AddMistakePage() {
  const router = useRouter();
  const { addMistake, ready } = useMistakes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback((file: File | null) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") setImageDataUrl(r);
    };
    reader.readAsDataURL(file);
  }, []);

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

  const submit = () => {
    setError(null);
    if (!imageDataUrl) {
      setError("Take a photo or upload an image of the problem first.");
      return;
    }
    if (tags.length === 0) {
      setError("Pick at least one tag.");
      return;
    }
    addMistake({ imageDataUrl, tags, notes: notes.trim() });
    setImageDataUrl(null);
    setTags([]);
    setNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.push("/library");
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label
            htmlFor="mistake-photo"
            className="duo-btn-primary flex flex-1 cursor-pointer items-center justify-center gap-2 py-4 text-center"
          >
            <span aria-hidden>📷</span>
            Camera / upload
          </label>
          {imageDataUrl && (
            <button
              type="button"
              className="rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-2 text-sm font-bold text-[var(--duo-text)]"
              onClick={() => {
                setImageDataUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Remove image
            </button>
          )}
        </div>
        {imageDataUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt="Preview of the problem"
              className="max-h-64 w-full object-contain"
            />
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 text-sm font-bold text-[var(--duo-text)]">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGS.map((t) => {
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
        <div className="mt-4 flex gap-2">
          <input
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

      <button type="button" onClick={submit} className="duo-btn-primary w-full py-4 text-lg">
        Save to library
      </button>
    </div>
  );
}
