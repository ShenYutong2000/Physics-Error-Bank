import { mainPageClassName } from "@/components/main-page-layout";
import { PaperStatsOverviewPanel } from "@/components/paper-stats-overview-v2";

export const dynamic = "force-dynamic";

export default function PapersOverviewPage() {
  return (
    <div className={mainPageClassName}>
      <PaperStatsOverviewPanel variant="student" />
    </div>
  );
}
