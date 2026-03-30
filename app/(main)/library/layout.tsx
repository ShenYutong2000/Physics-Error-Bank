import { redirect } from "next/navigation";
import { getMainGroupUserOrRedirect } from "@/lib/main-session-user";

export default async function LibrarySectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getMainGroupUserOrRedirect();
  if (user.role === "TEACHER") {
    redirect("/teacher/mistakes");
  }
  return children;
}
