"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { apiFetchJson } from "@/lib/api-client";
import type { MistakeEntry } from "@/lib/types";

type AddMistakeInput = {
  file: File;
  tags: string[];
  notes: string;
};

type AddMistakeOptions = {
  onUploadProgress?: (progress: { loaded: number; total: number | null; percent: number | null }) => void;
};

type MistakesContextValue = {
  mistakes: MistakeEntry[];
  addMistake: (input: AddMistakeInput, options?: AddMistakeOptions) => Promise<{ ok: boolean; error?: string }>;
  updateMistake: (
    id: string,
    input: { notes: string; tags: string[]; expectedUpdatedAt: string },
  ) => Promise<{ ok: boolean; error?: string; conflict?: boolean }>;
  replaceMistakeImage: (
    id: string,
    input: { file: File; expectedUpdatedAt: string },
  ) => Promise<{ ok: boolean; error?: string; conflict?: boolean }>;
  removeMistake: (id: string) => Promise<{ ok: boolean; error?: string }>;
  refetchMistakes: () => Promise<void>;
  ready: boolean;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
};

const MistakesContext = createContext<MistakesContextValue | null>(null);

async function fetchMistakesList(): Promise<{ ok: true; mistakes: MistakeEntry[] } | { ok: false; error: string }> {
  const result = await apiFetchJson<{ mistakes: MistakeEntry[] }>("/api/mistakes");
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error ??
        (result.status === 503
          ? "Database is not configured (DATABASE_URL)."
          : result.status === 401
            ? "Unauthorized. Try Log out and sign in again (use the same site host, e.g. only localhost or only 127.0.0.1)."
            : "Could not load your library."),
    };
  }
  return { ok: true, mistakes: Array.isArray(result.data.mistakes) ? result.data.mistakes : [] };
}

export function MistakesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasFetchedRef = useRef(false);
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
      hasFetchedRef.current = false;
      setMistakes([]);
      setLoadError(null);
      setLoading(false);
      setReady(true);
      return;
    }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void refetchMistakes();
  }, [pathname, refetchMistakes]);

  const addMistake = useCallback(async (input: AddMistakeInput, options?: AddMistakeOptions) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("image", input.file);
      fd.set("notes", input.notes);
      fd.set("tags", JSON.stringify(input.tags));
      const result = await new Promise<
        { ok: true; data: { mistake?: MistakeEntry } } | { ok: false; status: number; error: string }
      >((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/mistakes", true);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (!options?.onUploadProgress) return;
          const total = Number.isFinite(event.total) && event.total > 0 ? event.total : null;
          const percent = total ? Math.min(100, Math.round((event.loaded / total) * 100)) : null;
          options.onUploadProgress({ loaded: event.loaded, total, percent });
        };

        xhr.onerror = () => {
          resolve({ ok: false, status: 0, error: "Network error." });
        };

        xhr.onload = () => {
          const raw = xhr.responseText;
          let body: { error?: string; mistake?: MistakeEntry } = {};
          try {
            body = (raw ? JSON.parse(raw) : {}) as { error?: string; mistake?: MistakeEntry };
          } catch {
            body = {};
          }
          if (xhr.status < 200 || xhr.status >= 300) {
            resolve({
              ok: false,
              status: xhr.status,
              error: body.error ?? "Could not save mistake.",
            });
            return;
          }
          resolve({ ok: true, data: body });
        };

        xhr.send(fd);
      });
      if (!result.ok) {
        return { ok: false as const, error: result.error ?? "Could not save mistake." };
      }
      if (result.data.mistake) {
        setMistakes((prev) => [result.data.mistake!, ...prev]);
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
    async (id: string, input: { notes: string; tags: string[]; expectedUpdatedAt: string }) => {
      try {
        const result = await apiFetchJson<{ mistake?: MistakeEntry }>(
          `/api/mistakes/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notes: input.notes,
              tags: input.tags,
              expectedUpdatedAt: input.expectedUpdatedAt,
            }),
          },
        );
        if (!result.ok) {
          return {
            ok: false as const,
            error: result.error ?? "Could not update mistake.",
            conflict: result.status === 409,
          };
        }
        if (result.data.mistake) {
          setMistakes((prev) => prev.map((m) => (m.id === id ? result.data.mistake! : m)));
        }
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: "Network error while updating." };
      }
    },
    [],
  );

  const replaceMistakeImage = useCallback(
    async (id: string, input: { file: File; expectedUpdatedAt: string }) => {
      try {
        const fd = new FormData();
        fd.set("image", input.file);
        fd.set("expectedUpdatedAt", input.expectedUpdatedAt);
        const result = await apiFetchJson<{ mistake?: MistakeEntry }>(
          `/api/mistakes/${encodeURIComponent(id)}/image`,
          { method: "POST", body: fd },
        );
        if (!result.ok) {
          return {
            ok: false as const,
            error: result.error ?? "Could not replace image.",
            conflict: result.status === 409,
          };
        }
        if (result.data.mistake) {
          setMistakes((prev) => prev.map((m) => (m.id === id ? result.data.mistake! : m)));
        }
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: "Network error while uploading." };
      }
    },
    [],
  );

  const removeMistake = useCallback(async (id: string) => {
    try {
      const result = await apiFetchJson<{ ok?: boolean }>(`/api/mistakes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (result.ok) {
        setMistakes((prev) => prev.filter((m) => m.id !== id));
        return { ok: true as const };
      }
      return {
        ok: false as const,
        error: result.error ?? "Could not delete mistake.",
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
      replaceMistakeImage,
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
      replaceMistakeImage,
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
