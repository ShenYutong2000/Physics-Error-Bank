import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSecret } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth-validation";
import { sessionCookieName, verifySession } from "@/lib/session";

export type MainGroupUser = {
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER";
};

/** Session + DB user for `(main)` routes; redirects to `/` if unauthenticated. */
export const getMainGroupUserOrRedirect = cache(async function getMainGroupUserOrRedirect(): Promise<MainGroupUser> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const secret = getAuthSecret();
  if (!token || !secret) {
    redirect("/");
  }
  const session = await verifySession(token, secret);
  if (!session) {
    redirect("/");
  }
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(session.email), mode: "insensitive" } },
    select: { email: true, role: true, name: true },
  });
  return {
    email: user?.email ?? session.email,
    role: (user?.role ?? "STUDENT") as "STUDENT" | "TEACHER",
    name: user?.name ?? "",
  };
});
