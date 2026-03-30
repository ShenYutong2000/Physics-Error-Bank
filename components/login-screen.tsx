"use client";

import Link from "next/link";
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

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <LoginMascot className="h-36 w-36 drop-shadow-lg sm:h-44 sm:w-44" />
          <h1 className="mt-4 text-center text-3xl font-black tracking-tight text-[var(--duo-text)] sm:text-4xl">
            {mode === "login" ? "Hi there!" : "Join the nest!"}
          </h1>
          <p className="mt-2 max-w-sm text-center text-base font-bold text-[var(--duo-text-muted)]">
            {mode === "login"
              ? "Log in with your UWC China school email to save mistakes and review your library."
              : `Sign up with your school email (${STUDENT_EMAIL_DOMAIN}) to create your error bank.`}
          </p>
        </div>

        <div className="w-full rounded-[1.75rem] border-4 border-white bg-white/95 p-6 shadow-[0_8px_0_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-8">
          <div
            className="mb-6 flex rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafafa] p-1"
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
                  ? "border-b-4 border-[var(--duo-green-shadow)] bg-[var(--duo-green)] text-white"
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
                  ? "border-b-4 border-[var(--duo-blue-shadow)] bg-[var(--duo-blue)] text-white"
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
                    className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
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
                className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
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
                className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
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
                  className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
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
              <div className="space-y-4 rounded-2xl border-2 border-[var(--duo-border)] bg-[#fafff5] p-4">
                <p className="text-sm font-extrabold text-[var(--duo-text)]">Security questions</p>
                <p className="text-xs font-bold leading-relaxed text-[var(--duo-text-muted)]">
                  Pick answers you will remember. Avoid personal names, phone numbers, or addresses. You
                  will need the same answers if you forget your password.
                </p>
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <label
                      htmlFor={`auth-recovery-${i}`}
                      className="mb-1.5 block text-sm font-extrabold text-[var(--duo-text)]"
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
              <span className="text-[var(--duo-green-dark)]">student@example.com</span> /{" "}
              <span className="text-[var(--duo-green-dark)]">physics123</span>
              <br />
              <span className="mt-1 inline-block">
                Sign up always requires {STUDENT_EMAIL_DOMAIN}. Set AUTH_EMAIL in .env to use another
                bootstrap account in development.
              </span>
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

function LoginMascot({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="100" cy="175" rx="70" ry="18" fill="#3FAE2A" opacity="0.35" />
      <path
        d="M100 28c-38 0-62 28-62 62 0 48 28 72 62 72s62-24 62-72c0-34-24-62-62-62z"
        fill="#58CC02"
        stroke="#389202"
        strokeWidth="4"
      />
      <path
        d="M52 78c-18-8-28-22-28-38 0-20 16-36 36-36 10 0 20 4 28 12-8 18-20 34-36 62z"
        fill="#89E219"
        stroke="#5CAD0A"
        strokeWidth="3"
      />
      <path
        d="M148 78c18-8 28-22 28-38 0-20-16-36-36-36-10 0-20 4-28 12 8 18 20 34 36 62z"
        fill="#89E219"
        stroke="#5CAD0A"
        strokeWidth="3"
      />
      <ellipse cx="78" cy="88" rx="22" ry="26" fill="white" stroke="#389202" strokeWidth="3" />
      <ellipse cx="122" cy="88" rx="22" ry="26" fill="white" stroke="#389202" strokeWidth="3" />
      <circle cx="82" cy="90" r="10" fill="#3C3C3C" />
      <circle cx="118" cy="90" r="10" fill="#3C3C3C" />
      <circle cx="85" cy="87" r="3" fill="white" />
      <circle cx="121" cy="87" r="3" fill="white" />
      <path
        d="M88 118c8 10 16 10 24 0"
        stroke="#389202"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="72" y="132" width="56" height="36" rx="10" fill="#1CB0F6" stroke="#0E8EC4" strokeWidth="3" />
      <path d="M88 150h24M100 142v16" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
