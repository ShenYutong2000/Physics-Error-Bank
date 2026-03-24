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
import { loadMistakes, saveMistakes } from "@/lib/mistakes-storage";

type MistakesContextValue = {
  mistakes: MistakeEntry[];
  addMistake: (entry: Omit<MistakeEntry, "id" | "createdAt">) => void;
  removeMistake: (id: string) => void;
  updateMistake: (id: string, patch: Partial<MistakeEntry>) => void;
  ready: boolean;
};

const MistakesContext = createContext<MistakesContextValue | null>(null);

export function MistakesProvider({ children }: { children: React.ReactNode }) {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMistakes(loadMistakes());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveMistakes(mistakes);
  }, [mistakes, ready]);

  const addMistake = useCallback(
    (entry: Omit<MistakeEntry, "id" | "createdAt">) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const full: MistakeEntry = {
        ...entry,
        id,
        createdAt: new Date().toISOString(),
      };
      setMistakes((prev) => [full, ...prev]);
    },
    [],
  );

  const removeMistake = useCallback((id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMistake = useCallback((id: string, patch: Partial<MistakeEntry>) => {
    setMistakes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }, []);

  const value = useMemo(
    () => ({
      mistakes,
      addMistake,
      removeMistake,
      updateMistake,
      ready,
    }),
    [mistakes, addMistake, removeMistake, updateMistake, ready],
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
