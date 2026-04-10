"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  isStudentSchoolEmail,
  STUDENT_EMAIL_DOMAIN,
  STUDENT_EMAIL_REQUIRED_MESSAGE,
} from "@/lib/auth-validation";
import { RECOVERY_QUESTIONS } from "@/lib/recovery-questions";

type Mode = "login" | "register";

type Props = {
  showDevHint?: boolean;
};

export function LoginScreen({ showDevHint }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryA1, setRecoveryA1] = useState("");
  const [recoveryA2, setRecoveryA2] = useState("");
  const [recoveryA3, setRecoveryA3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmPassword("");
    setName("");
    setRecoveryA1("");
    setRecoveryA2("");
    setRecoveryA3("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (mode === "register" && !isStudentSchoolEmail(email)) {
      setError(STUDENT_EMAIL_REQUIRED_MESSAGE);
      return;
    }

    if (mode === "register") {
      if (!recoveryA1.trim() || !recoveryA2.trim() || !recoveryA3.trim()) {
        setError("Please answer all three security questions.");
        return;
      }
    }

    setPending(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? {
                name,
                email,
                password,
                recoveryAnswer1: recoveryA1,
                recoveryAnswer2: recoveryA2,
                recoveryAnswer3: recoveryA3,
              }
            : { email, password },
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
      router.push("/add");
    } finally {
      setPending(false);
    }
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
            width={280}
            height={280}
            unoptimized
            className="h-48 w-48 max-w-[min(100%,280px)] object-contain [filter:drop-shadow(0_12px_28px_rgba(200,80,90,0.2))_drop-shadow(0_6px_22px_rgba(255,210,120,0.45))] sm:h-56 sm:w-56"
            priority
          />
          <h1 className="mt-5 text-center text-[2rem] font-black leading-tight tracking-tight text-[#14224d] drop-shadow-[0_2px_0_rgba(255,255,255,0.45)] sm:text-5xl sm:leading-tight">
            {mode === "login" ? "Welcome back!" : "Create your space"}
          </h1>
          <p className="mt-3 max-w-sm text-center text-lg font-black leading-snug text-[#2f3f72] sm:text-xl">
            {mode === "login"
              ? "Log in with your UWC China school email to save mistakes and review your library."
              : `Sign up with your school email (${STUDENT_EMAIL_DOMAIN}) to create your error bank.`}
          </p>
        </div>

        <div className="w-full rounded-[1.75rem] border-4 border-[#edf2ff] bg-white/95 p-6 shadow-[0_8px_0_rgba(45,60,120,0.12)] backdrop-blur-sm sm:p-8">
          <div
            className="mb-6 flex rounded-2xl border-2 border-[#d7e1ff] bg-[#f7f9ff] p-1"
            role="tablist"
            aria-label="Log in or sign up"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-xl py-3 text-sm font-extrabold transition-colors ${
                mode === "login"
                  ? "border-b-4 border-[#a93d57] bg-[#d95a75] text-white"
                  : "text-[var(--duo-text-muted)] hover:text-[var(--duo-text)]"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-xl py-3 text-sm font-extrabold transition-colors ${
                mode === "register"
                  ? "border-b-4 border-[#3d54c5] bg-[#5e75ef] text-white"
                  : "text-[var(--duo-text-muted)] hover:text-[var(--duo-text)]"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              {mode === "register" && (
                <>
                  <label
                    htmlFor="auth-name"
                    className="mb-1.5 block text-sm font-black text-[#253262]"
                  >
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mb-3 w-full rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                    placeholder="Your full name"
                  />
                </>
              )}
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-sm font-black text-[#253262]"
              >
                School email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                placeholder={`name${STUDENT_EMAIL_DOMAIN}`}
              />
              <p className="mt-1.5 text-xs font-bold text-[var(--duo-text-muted)]">
                Must end with {STUDENT_EMAIL_DOMAIN}
                {showDevHint ? " (dev bootstrap login may use a different demo address)." : ""}
              </p>
            </div>
            <div>
              <label
                htmlFor="auth-password"
                className="mb-1.5 block text-sm font-black text-[#253262]"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : undefined}
                className="w-full rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                placeholder="••••••••"
              />
              {mode === "register" && (
                <p className="mt-1.5 text-xs font-bold text-[var(--duo-text-muted)]">
                  At least 8 characters.
                </p>
              )}
            </div>

            {mode === "login" && (
              <p className="text-center">
                <Link
                  href="/recover"
                  className="text-sm font-extrabold text-[var(--duo-blue)] underline-offset-2 hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            )}

            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-confirm"
                  className="mb-1.5 block text-sm font-black text-[#253262]"
                >
                  Confirm password
                </label>
                <input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-4 rounded-2xl border-2 border-[#f2d3dc] bg-[#fff8fb] p-4">
                <p className="text-sm font-black text-[#253262]">Security questions</p>
                <p className="text-xs font-bold leading-relaxed text-[var(--duo-text-muted)]">
                  Pick answers you will remember. Avoid personal names, phone numbers, or addresses. You
                  will need the same answers if you forget your password.
                </p>
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <label
                      htmlFor={`auth-recovery-${i}`}
                      className="mb-1.5 block text-sm font-black text-[#253262]"
                    >
                      {RECOVERY_QUESTIONS[i]}
                    </label>
                    <input
                      id={`auth-recovery-${i}`}
                      type="text"
                      autoComplete="off"
                      value={i === 0 ? recoveryA1 : i === 1 ? recoveryA2 : recoveryA3}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (i === 0) setRecoveryA1(v);
                        else if (i === 1) setRecoveryA2(v);
                        else setRecoveryA3(v);
                      }}
                      required
                      className="w-full rounded-2xl border-2 border-[var(--duo-border)] bg-white px-4 py-3.5 text-base font-bold text-[var(--duo-text)] outline-none ring-[var(--duo-blue)] focus:border-[var(--duo-blue)] focus:ring-2"
                    />
                  </div>
                ))}
              </div>
            )}

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
              {pending
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Continue"
                  : "Create account"}
            </button>
          </form>

          {showDevHint && (
            <p className="mt-4 text-center text-xs font-bold text-[var(--duo-text-muted)]">
              Dev-only bootstrap login:{" "}
              <span className="text-[#d95a75]">student@example.com</span> /{" "}
              <span className="text-[#d95a75]">physics123</span>
              <br />
              <span className="mt-1 inline-block">
                Sign up always requires {STUDENT_EMAIL_DOMAIN}. Set AUTH_EMAIL in .env to use another
                bootstrap account in development.
              </span>
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
