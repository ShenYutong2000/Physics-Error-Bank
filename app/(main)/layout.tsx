import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MainShell } from "@/components/main-shell";
import { getAuthSecret } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";

export default async function MainGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const secret = getAuthSecret();
  if (!token || !secret) {
    redirect("/");
  }
  const session = await verifySession(token, secret);
  if (!session) {
    redirect("/");
  }

  return <MainShell email={session.email}>{children}</MainShell>;
}
