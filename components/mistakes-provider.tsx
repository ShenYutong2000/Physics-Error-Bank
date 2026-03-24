"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { MistakeEntry } from "@/lib/types";

type AddMistakeInput = {
  file: File;
  tags: string[];
  notes: string;
};

type MistakesContextValue = {
  mistakes: MistakeEntry[];
  addMistake: (input: AddMistakeInput) => Promise<{ ok: boolean; error?: string }>;
  removeMistake: (id: string) => Promise<void>;
  ready: boolean;
  loadError: string | null;
  saving: boolean;
};

const MistakesContext = createContext<MistakesContextValue | null>(null);

export function MistakesProvider({ children }: { children: React.ReactNode }) {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mistakes", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setLoadError(
            data.error ??
              (res.status === 503
                ? "Database is not configured (DATABASE_URL)."
                : "Could not load your library."),
          );
          setMistakes([]);
          setReady(true);
          return;
        }
        const data = (await res.json()) as { mistakes: MistakeEntry[] };
        setMistakes(Array.isArray(data.mistakes) ? data.mistakes : []);
        setLoadError(null);
      } catch {
        if (!cancelled) {
          setLoadError("Could not load your library.");
          setMistakes([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addMistake = useCallback(async (input: AddMistakeInput) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("image", input.file);
      fd.set("notes", input.notes);
      fd.set("tags", JSON.stringify(input.tags));
      const res = await fetch("/api/mistakes", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        mistake?: MistakeEntry;
        error?: string;
      };
      if (!res.ok) {
        return { ok: false as const, error: data.error ?? "Could not save mistake." };
      }
      if (data.mistake) {
        setMistakes((prev) => [data.mistake!, ...prev]);
        setLoadError(null);
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "Network error while saving." };
    } finally {
      setSaving(false);
    }
  }, []);

  const removeMistake = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMistakes((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      mistakes,
      addMistake,
      removeMistake,
      ready,
      loadError,
      saving,
    }),
    [mistakes, addMistake, removeMistake, ready, loadError, saving],
  );

  return (
    <MistakesContext.Provider value={value}>{children}</MistakesContext.Provider>
  );
}

export function useMistakes() {
  const ctx = useContext(MistakesContext);
  if (!ctx) {
    throw new Error("useMistakes must be used within MistakesProvider");
  }
  return ctx;
}
