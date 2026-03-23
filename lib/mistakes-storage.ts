import type { MistakeEntry } from "./types";

const KEY = "physics-error-bank-mistakes";

export function loadMistakes(): MistakeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMistakeEntry);
  } catch {
    return [];
  }
}

export function saveMistakes(list: MistakeEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

function isMistakeEntry(x: unknown): x is MistakeEntry {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.imageDataUrl === "string" &&
    Array.isArray(o.tags) &&
    o.tags.every((t) => typeof t === "string") &&
    typeof o.notes === "string" &&
    typeof o.createdAt === "string"
  );
}
