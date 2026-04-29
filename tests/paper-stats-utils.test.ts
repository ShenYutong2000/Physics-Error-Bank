import test from "node:test";
import assert from "node:assert/strict";
import type { PublishedPaperStatsRow } from "../lib/paper-types";
import { normalizeYearFilter, sortStudentPapers, toDp1OrderedRows } from "../lib/paper-stats-utils";

function makeRow(input: {
  id: string;
  year: number;
  session: "MAY" | "NOV";
  avg: number;
  riskQuestionCount: number;
}): PublishedPaperStatsRow {
  return {
    paper: {
      id: input.id,
      title: input.id,
      year: input.year,
      session: input.session,
      questionCount: input.riskQuestionCount,
      dp1AtoCOnly: false,
      publishedAt: "2026-01-01",
    },
    attemptCount: 10,
    averageAccuracy: input.avg,
    questions: Array.from({ length: input.riskQuestionCount }).map((_, i) => ({
      questionNumber: i + 1,
      correctCount: 1,
      attemptCount: 10,
      correctRatePercent: 40,
    })),
  };
}

test("normalizeYearFilter falls back to all for invalid year", () => {
  assert.equal(normalizeYearFilter("2022", [2024, 2023]), "all");
  assert.equal(normalizeYearFilter("all", [2024, 2023]), "all");
  assert.equal(normalizeYearFilter("2024", [2024, 2023]), "2024");
});

test("toDp1OrderedRows keeps A/B/C order and filters others", () => {
  const rows = [
    { tag: "Theme C - Wave Behavior", correct: 1, total: 2, masteryPercent: 50 },
    { tag: "Theme A - Space, Time, and Motion", correct: 2, total: 2, masteryPercent: 100 },
    { tag: "Theme X - Other", correct: 1, total: 1, masteryPercent: 100 },
  ];
  const ordered = toDp1OrderedRows(rows);
  assert.deepEqual(ordered.map((r) => r.tag), [
    "Theme A - Space, Time, and Motion",
    "Theme C - Wave Behavior",
  ]);
});

test("sortStudentPapers risk_high prioritizes more risk questions first", () => {
  const rows = [
    makeRow({ id: "A", year: 2024, session: "MAY", avg: 80, riskQuestionCount: 1 }),
    makeRow({ id: "B", year: 2024, session: "NOV", avg: 70, riskQuestionCount: 3 }),
  ];
  const sorted = sortStudentPapers(rows, "risk_high");
  assert.equal(sorted[0]?.paper.id, "B");
});

test("sortStudentPapers latest sorts by year/session desc", () => {
  const rows = [
    makeRow({ id: "old", year: 2023, session: "MAY", avg: 80, riskQuestionCount: 1 }),
    makeRow({ id: "new", year: 2024, session: "NOV", avg: 70, riskQuestionCount: 1 }),
  ];
  const sorted = sortStudentPapers(rows, "latest");
  assert.equal(sorted[0]?.paper.id, "new");
});

