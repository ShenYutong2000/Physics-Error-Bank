import { mainPageClassName } from "@/components/main-page-layout";
import { PaperStatsOverviewPanel } from "@/components/paper-stats-overview";

export default function PapersOverviewPage() {
  return (
    <div className={mainPageClassName}>
      <header className="mb-6 rounded-2xl border-2 border-[var(--duo-border)] bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--duo-green)] text-xl text-white shadow-[0_3px_0_0_var(--duo-green-shadow)]"
            aria-hidden
          >
            📊
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">Past papers</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-[var(--duo-text)]">All papers — stats & mastery</h1>
            <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
              Class-wide correct rate per question on every published paper, and your theme mastery across all papers you
              completed.
            </p>
          </div>
        </div>
      </header>
      <PaperStatsOverviewPanel variant="student" />
    </div>
  );
}
