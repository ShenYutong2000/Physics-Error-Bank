"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { MistakeEntry } from "@/lib/types";

type AddMistakeInput = {
  file: File;
  tags: string[];
  notes: string;
};

type MistakesContextValue = {
  mistakes: MistakeEntry[];
  addMistake: (input: AddMistakeInput) => Promise<{ ok: boolean; error?: string }>;
  updateMistake: (
    id: string,
    input: { notes: string; tags: string[] },
  ) => Promise<{ ok: boolean; error?: string }>;
  removeMistake: (id: string) => Promise<{ ok: boolean; error?: string }>;
  refetchMistakes: () => Promise<void>;
  ready: boolean;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
};

const MistakesContext = createContext<MistakesContextValue | null>(null);

async function fetchMistakesList(): Promise<{ ok: true; mistakes: MistakeEntry[] } | { ok: false; error: string }> {
  const res = await fetch("/api/mistakes", { credentials: "include" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      error:
        data.error ??
        (res.status === 503
          ? "Database is not configured (DATABASE_URL)."
          : res.status === 401
            ? "Unauthorized. Try Log out and sign in again (use the same site host, e.g. only localhost or only 127.0.0.1)."
            : "Could not load your library."),
    };
  }
  const data = (await res.json()) as { mistakes: MistakeEntry[] };
  return { ok: true, mistakes: Array.isArray(data.mistakes) ? data.mistakes : [] };
}

export function MistakesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refetchMistakes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchMistakesList();
      if (result.ok) {
        setMistakes(result.mistakes);
        setLoadError(null);
      } else {
        setLoadError(result.error);
        setMistakes([]);
      }
    } catch {
      setLoadError("Could not load your library.");
      setMistakes([]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // Do not fetch mistakes on auth screen; prevents stale 401 flashing after SPA login redirect.
    if (pathname === "/") {
      setMistakes([]);
      setLoadError(null);
      setLoading(false);
      setReady(true);
      return;
    }
    void refetchMistakes();
  }, [pathname, refetchMistakes]);

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

  const updateMistake = useCallback(
    async (id: string, input: { notes: string; tags: string[] }) => {
      try {
        const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ notes: input.notes, tags: input.tags }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          mistake?: MistakeEntry;
          error?: string;
        };
        if (!res.ok) {
          return { ok: false as const, error: data.error ?? "Could not update mistake." };
        }
        if (data.mistake) {
          setMistakes((prev) => prev.map((m) => (m.id === id ? data.mistake! : m)));
        }
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: "Network error while updating." };
      }
    },
    [],
  );

  const removeMistake = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMistakes((prev) => prev.filter((m) => m.id !== id));
        return { ok: true as const };
      }
      return {
        ok: false as const,
        error: data.error ?? "Could not delete mistake.",
      };
    } catch {
      return { ok: false as const, error: "Network error while deleting." };
    }
  }, []);

  const value = useMemo(
    () => ({
      mistakes,
      addMistake,
      updateMistake,
      removeMistake,
      refetchMistakes,
      ready,
      loading,
      loadError,
      saving,
    }),
    [
      mistakes,
      addMistake,
      updateMistake,
      removeMistake,
      refetchMistakes,
      ready,
      loading,
      loadError,
      saving,
    ],
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
