export function incrementLocalCounter(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(key);
    const current = raw ? Number(raw) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    window.localStorage.setItem(key, String(next));
  } catch {
    // Ignore storage errors (private mode, quota, disabled storage).
  }
}

