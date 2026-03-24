import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { getAuthSecret } from "@/lib/auth-config";
import { sessionCookieName, verifySession } from "@/lib/session";

export default async function HomePage() {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const secret = getAuthSecret();
  if (token && secret) {
    const session = await verifySession(token, secret);
    if (session) {
      redirect("/add");
    }
  }

  return <LoginScreen showDevHint={process.env.NODE_ENV === "development"} />;
}
