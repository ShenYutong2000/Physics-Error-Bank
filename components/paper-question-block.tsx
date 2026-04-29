"use client";

import Link from "next/link";
import { memo, useState } from "react";
import type { PublishedPaperStatsRow } from "@/lib/paper-types";

function PaperQuestionBlockImpl({
  row,
  showTeacherDetailLink,
  showStudentDetailLink,
}: {
  row: PublishedPaperStatsRow;
  showTeacherDetailLink: boolean;
  showStudentDetailLink: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border-2 border-[#e2e8f0] bg-gradient-to-br from-white to-[#fafcff] p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div>
          <p className="text-base font-extrabold text-[var(--duo-text)]">
            {row.paper.year} {row.paper.session}
          </p>
          <p className="text-sm font-bold text-[var(--duo-text-muted)]">{row.paper.title}</p>
        </div>
        <span className="shrink-0 text-xs font-extrabold text-[var(--duo-blue)]">{open ? "▲" : "▼"}</span>
      </button>
      <p className="mt-2 text-xs font-bold text-[var(--duo-text-muted)]">
        Submissions: {row.attemptCount} · Avg score: {row.attemptCount > 0 ? `${row.averageAccuracy}%` : "—"}
      </p>
      {showTeacherDetailLink && (
        <Link
          href={`/teacher/${row.paper.id}`}
          className="mt-3 inline-flex rounded-lg border-2 border-[#b6d4fe] bg-[#e8f3ff] px-3 py-1.5 text-xs font-extrabold text-[#1c6ed6] transition-colors hover:bg-[#ddecff]"
        >
          View detailed stats →
        </Link>
      )}
      {showStudentDetailLink && (
        <Link
          href={`/papers/${row.paper.id}`}
          className="mt-3 inline-flex rounded-lg border-2 border-[#b6d4fe] bg-[#e8f3ff] px-3 py-1.5 text-xs font-extrabold text-[#1c6ed6] transition-colors hover:bg-[#ddecff]"
        >
          View this paper details →
        </Link>
      )}
      {open && (
        <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {row.questions.map((q) => (
            <li
              key={q.questionNumber}
              className="flex items-center justify-between gap-2 rounded-lg bg-[#f3f7ff] px-2 py-1.5 text-xs font-bold"
            >
              <span className="text-[var(--duo-text)]">Q{q.questionNumber}</span>
              <span className="tabular-nums text-[var(--duo-text-muted)]">
                {q.correctRatePercent}% ({q.correctCount}/{q.attemptCount})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const PaperQuestionBlock = memo(PaperQuestionBlockImpl);

