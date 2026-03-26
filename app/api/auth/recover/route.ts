import { NextResponse } from "next/server";
import { getExpectedCredentials } from "@/lib/auth-config";
import {
  isStudentSchoolEmail,
  normalizeEmail,
  STUDENT_EMAIL_REQUIRED_MESSAGE,
} from "@/lib/auth-validation";
import { isDatabaseConfigured } from "@/lib/db";
import { recoverAccountWithAnswers } from "@/lib/users-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    email?: string;
    recoveryAnswer1?: string;
    recoveryAnswer2?: string;
    recoveryAnswer3?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const recoveryAnswer1 = typeof body.recoveryAnswer1 === "string" ? body.recoveryAnswer1 : "";
  const recoveryAnswer2 = typeof body.recoveryAnswer2 === "string" ? body.recoveryAnswer2 : "";
  const recoveryAnswer3 = typeof body.recoveryAnswer3 === "string" ? body.recoveryAnswer3 : "";

  if (!email || !recoveryAnswer1 || !recoveryAnswer2 || !recoveryAnswer3) {
    return NextResponse.json(
      { error: "Email and all three answers are required." },
      { status: 400 },
    );
  }

  const creds = getExpectedCredentials();
  const emailAllowed =
    isStudentSchoolEmail(email) ||
    (creds !== null && normalizeEmail(email) === normalizeEmail(creds.email));

  if (!emailAllowed) {
    return NextResponse.json({ error: STUDENT_EMAIL_REQUIRED_MESSAGE }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const result = await recoverAccountWithAnswers(email, [
    recoveryAnswer1,
    recoveryAnswer2,
    recoveryAnswer3,
  ]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    password: result.newPassword,
    message:
      "Passwords are stored securely, so we cannot show your old password. Use this new password to log in.",
  });
}
