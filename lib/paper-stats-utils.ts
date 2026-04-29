import type { PublishedPaperStatsRow, TagMasteryRow } from "@/lib/paper-types";

export type StudentPaperSort = "risk_high" | "risk_low" | "latest";

const DP1_THEME_ORDER = [
  "Theme A - Space, Time, and Motion",
  "Theme B - The Particulate Nature of Matter",
  "Theme C - Wave Behavior",
] as const;

export function normalizeYearFilter(raw: string, availableYears: number[]): string {
  return raw === "all" || availableYears.includes(Number(raw)) ? raw : "all";
}

export function toDp1OrderedRows(rows: TagMasteryRow[]): TagMasteryRow[] {
  const map = new Map(rows.map((r) => [r.tag, r]));
  return DP1_THEME_ORDER.map((theme) => map.get(theme)).filter((r): r is TagMasteryRow => Boolean(r));
}

export function sortStudentPapers(rows: PublishedPaperStatsRow[], sortMode: StudentPaperSort): PublishedPaperStatsRow[] {
  const papers = [...rows];
  const riskCountMap = new Map<string, number>(
    papers.map((row) => [row.paper.id, row.questions.reduce((acc, q) => acc + (q.correctRatePercent < 50 ? 1 : 0), 0)]),
  );
  const riskCount = (row: PublishedPaperStatsRow) => riskCountMap.get(row.paper.id) ?? 0;

  if (sortMode === "risk_high") {
    papers.sort((a, b) => riskCount(b) - riskCount(a) || a.averageAccuracy - b.averageAccuracy || b.paper.year - a.paper.year);
  } else if (sortMode === "risk_low") {
    papers.sort((a, b) => riskCount(a) - riskCount(b) || b.averageAccuracy - a.averageAccuracy || b.paper.year - a.paper.year);
  } else {
    papers.sort((a, b) => b.paper.year - a.paper.year || b.paper.session.localeCompare(a.paper.session, "en"));
  }
  return papers;
}

