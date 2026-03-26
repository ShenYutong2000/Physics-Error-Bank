"use client";

import Link from "next/link";
import { useState } from "react";
import { STUDENT_EMAIL_DOMAIN } from "@/lib/auth-validation";
import { RECOVERY_QUESTIONS } from "@/lib/recovery-questions";

export function RecoverScreen() {
  const [email, setEmail] = useState("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [a3, setA3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowPassword(null);
    setInfoMessage(null);
    setCopyDone(false);
    setPending(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          recoveryAnswer1: a1,
          recoveryAnswer2: a2,
          recoveryAnswer3: a3,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        password?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (data.password) {
        setShowPassword(data.password);
        setInfoMessage(data.message ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  async function copyPassword() {
    if (!showPassword || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(showPassword);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  return (
    <div className="login-duo-bg relative min-h-[calc(100vh-0px)] overflow-hidden px-4 py-10">
      <div className="login-blob login-blob--a" aria-hidden />
      <div className="login-blob login-blob--b" aria-hidden />
      <div className="login-blob login-blob--c" aria-hidden />

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <h1 className="text-center text-3xl font-black tracking-tight text-[var(--duo-text)] sm:text-4xl">
            Forgot password?
          </h1>
          <p className="mt-2 max-w-sm text-center text-base font-bold text-[var(--duo-text-muted)]">
            Enter your school email and the same answers you chose when you signed up. We will show you
            a password you can use to log in.
          </p>
        </div>

        <div className="w-full rounded-[1.75rem] border-4 border-white bg-white/95 p-6 shadow-[0_8px_0_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
          {!showPassword ? (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="recover-email"
                  className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
                >
                  School email
                </label>
                <input
                  id="recover-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                  placeholder={`name${STUDENT_EMAIL_DOMAIN}`}
                />
              </div>

              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <label
                    htmlFor={`recover-q${i}`}
                    className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
                  >
                    {RECOVERY_QUESTIONS[i]}
                  </label>
                  <input
                    id={`recover-q${i}`}
                    type="text"
                    autoComplete="off"
                    value={i === 0 ? a1 : i === 1 ? a2 : a3}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (i === 0) setA1(v);
                      else if (i === 1) setA2(v);
                      else setA3(v);
                    }}
                    required
                    className="w-full rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                  />
                </div>
              ))}

              {error && (
                <p className="rounded-2xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-center text-sm font-extrabold text-[#b00020]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="duo-btn-primary mt-2 w-full py-4 text-lg disabled:opacity-60"
              >
                {pending ? "Checking…" : "Verify answers"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-[var(--duo-green-shadow)] bg-[#e8f7e0] p-4">
                {infoMessage && (
                  <p className="mb-3 text-sm font-bold text-[var(--duo-green-dark)]">{infoMessage}</p>
                )}
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--duo-green-dark)]">
                  Your login password
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 break-all rounded-xl border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-sm font-bold text-[var(--duo-text)]">
                    {showPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyPassword()}
                    className="shrink-0 rounded-xl border-b-4 border-[#d9d9d9] bg-[var(--duo-surface)] px-4 py-2 text-sm font-extrabold text-[var(--duo-text)] active:translate-y-0.5 active:border-b-2"
                  >
                    {copyDone ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="mt-3 text-xs font-bold text-[var(--duo-text-muted)]">
                  Use this password on the home page to log in. You can change it after signing in under
                  Password.
                </p>
              </div>
              <Link
                href="/"
                className="duo-btn-primary flex w-full items-center justify-center py-4 text-lg no-underline"
              >
                Go to log in
              </Link>
            </div>
          )}

          {!showPassword && (
            <p className="mt-6 text-center text-sm font-bold text-[var(--duo-text-muted)]">
              <Link href="/" className="text-[var(--duo-blue)] underline-offset-2 hover:underline">
                Back to log in
              </Link>
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-sm font-bold text-white/90 drop-shadow-sm">
          Physics Error Bank — learn smarter, one mistake at a time.
        </p>
      </div>
    </div>
  );
}
