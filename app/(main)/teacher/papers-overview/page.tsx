import { redirect } from "next/navigation";
import { PaperStatsOverviewPanel } from "@/components/paper-stats-overview";
import { getMainGroupUserOrRedirect } from "@/lib/main-session-user";

export default async function TeacherPapersOverviewPage() {
  const user = await getMainGroupUserOrRedirect();
  if (user.role !== "TEACHER") {
    redirect("/papers/overview");
  }
  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <header className="mb-6">
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
