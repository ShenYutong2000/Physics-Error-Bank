import { TAG_GROUPS } from "@/lib/types";

/** Full labels for charts and storage (matches TAG_GROUPS[].theme). */
export const PAPER_THEME_LABELS = TAG_GROUPS.map((g) => g.theme) as readonly string[];

export const PAPER_THEME_SET = new Set<string>(PAPER_THEME_LABELS);

/**
 * Third column in teacher bulk upload: single letter A–E or M (Theme M),
 * or the full theme string (must match TAG_GROUPS).
 */
export const THEME_CODE_TO_LABEL: Record<string, string> = {
  A: "Theme A - Space, Time, and Motion",
  B: "Theme B - The Particulate Nature of Matter",
  C: "Theme C - Wave Behavior",
  D: "Theme D - Fields",
  E: "Theme E - Nuclear and Quantum Physics",
  M: "Theme M - Measurement and Data Processing",
};

/** Legacy DB / uploads may still use "General"; merge into Theme M for display and stats. */
export function canonicalizePaperThemeLabel(theme: string): string {
  const t = theme.trim();
  if (t.toLowerCase() === "general") return THEME_CODE_TO_LABEL.M;
  return t;
}

export function normalizePaperTheme(raw: string): string {
  const t = raw.trim();
  if (!t) {
    throw new Error("Theme is required for each question.");
  }
  if (t.toLowerCase() === "general") {
    return THEME_CODE_TO_LABEL.M;
  }
  const code = t.toUpperCase();
  // Backward compatibility: older uploads may still send G for Theme M.
  if (code === "G" && t.length <= 2) {
    return THEME_CODE_TO_LABEL.M;
  }
  if (code in THEME_CODE_TO_LABEL && t.length <= 2) {
    return THEME_CODE_TO_LABEL[code];
  }
  const found = PAPER_THEME_LABELS.find((l) => l.toLowerCase() === t.toLowerCase());
  if (found) return found;
  throw new Error(
    `Invalid theme: "${raw}". Use code A–E or M, or the full Theme A–E / Theme M label.`,
  );
}
