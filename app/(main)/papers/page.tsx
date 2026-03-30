"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetchJson } from "@/lib/api-client";
import type { PaperSummary } from "@/lib/paper-types";

export default function PapersPage() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await apiFetchJson<{ papers: PaperSummary[] }>("/api/papers");
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPapers(result.data.papers ?? []);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">Past papers</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">Choose a paper</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Enter A/B/C/D answers for each question, submit, and review your wrong-tag distribution.
        </p>
      </header>
      {loading && <p className="text-sm font-bold text-[var(--duo-text-muted)]">Loading papers...</p>}
      {error && (
        <p className="mb-3 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {papers.map((paper) => (
          <Link
            key={paper.id}
            href={`/papers/${paper.id}`}
            className="block rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
          >
            <p className="text-lg font-extrabold text-[var(--duo-text)]">
              {paper.year} {paper.session}
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--duo-text-muted)]">{paper.title}</p>
            <p className="mt-2 text-xs font-bold text-[var(--duo-blue)]">{paper.questionCount} questions</p>
          </Link>
        ))}
      </div>
      {!loading && papers.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-[var(--duo-border)] bg-[var(--duo-surface)] px-4 py-8 text-center text-sm font-bold text-[var(--duo-text-muted)]">
          No papers published yet.
        </p>
      )}
    </div>
  );
}

