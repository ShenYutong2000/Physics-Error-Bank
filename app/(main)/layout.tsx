import { MainShell } from "@/components/main-shell";
import { getMainGroupUserOrRedirect } from "@/lib/main-session-user";

export default async function MainGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getMainGroupUserOrRedirect();
  return (
    <MainShell email={user.email} role={user.role} name={user.name}>
      {children}
    </MainShell>
  );
}
