"use client";

import Link from "next/link";
import Image from "next/image";
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
        credentials: "include",
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
      <div className="login-stars" aria-hidden>
        <div className="login-star login-star--a" />
        <div className="login-star login-star--b" />
        <div className="login-star login-star--c" />
        <div className="login-star login-star--d" />
        <div className="login-orbit login-orbit--a" />
        <div className="login-orbit login-orbit--b" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/branding/apple-logo-icon.png"
            alt="Spark apple mascot"
            width={240}
            height={240}
            unoptimized
            className="mb-3 h-44 w-44 max-w-[min(100%,240px)] object-contain [filter:drop-shadow(0_12px_28px_rgba(200,80,90,0.2))_drop-shadow(0_6px_22px_rgba(255,210,120,0.45))] sm:h-52 sm:w-52"
            priority
          />
          <h1 className="text-center text-[2rem] font-black leading-tight tracking-tight text-[#14224d] drop-shadow-[0_2px_0_rgba(255,255,255,0.45)] sm:text-5xl">
            Forgot password?
          </h1>
          <p className="mt-3 max-w-sm text-center text-lg font-black leading-snug text-[#2f3f72] sm:text-xl">
            Enter your school email and the same answers you chose when you signed up. We will show you
            a password you can use to log in.
          </p>
        </div>

        <div className="w-full rounded-[1.75rem] border-4 border-[#edf2ff] bg-white/95 p-6 shadow-[0_8px_0_rgba(45,60,120,0.12)] backdrop-blur-sm sm:p-8">
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
              <div className="rounded-2xl border-2 border-[#7a84ff] bg-[#ecebff] p-4">
                {infoMessage && (
                  <p className="mb-3 text-sm font-bold text-[#3f4fcf]">{infoMessage}</p>
                )}
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#3f4fcf]">
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

        <p className="mt-8 text-center text-sm font-bold text-[#f7f9ff] drop-shadow-sm">
          Physics Error Bank — learn smarter, one mistake at a time.
        </p>
      </div>
    </div>
  );
}
