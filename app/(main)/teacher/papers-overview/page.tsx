import { redirect } from "next/navigation";
import { mainPageClassName } from "@/components/main-page-layout";
import { PaperStatsOverviewPanel } from "@/components/paper-stats-overview";
import { getMainGroupUserOrRedirect } from "@/lib/main-session-user";

export default async function TeacherPapersOverviewPage() {
  const user = await getMainGroupUserOrRedirect();
  if (user.role !== "TEACHER") {
    redirect("/papers/overview");
  }
  return (
    <div className={mainPageClassName}>
      <header className="mb-6 rounded-2xl border-2 border-[#cfe6ff] bg-gradient-to-br from-[#f8fbff] via-white to-[#f3fffb] p-5 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-blue)]">Teacher</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">All papers — stats & mastery</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Published-paper question statistics for the whole class, and theme mastery for the class or a selected student.
        </p>
      </header>
      <PaperStatsOverviewPanel variant="teacher" />
    </div>
  );
}
