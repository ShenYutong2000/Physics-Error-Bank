import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RecoverScreen } from "@/components/recover-screen";
import { getAuthSecret } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";

export default async function RecoverPage() {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const secret = getAuthSecret();
  if (token && secret) {
    const session = await verifySession(token, secret);
    if (session) {
      redirect("/add");
    }
  }

  return <RecoverScreen />;
}
