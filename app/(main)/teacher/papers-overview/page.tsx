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
      <PaperStatsOverviewPanel variant="teacher" />
    </div>
  );
}
