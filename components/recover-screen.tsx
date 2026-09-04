"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { NodeckStage } from "@/components/nodeck-stage";
import { STUDENT_EMAIL_DOMAIN } from "@/lib/auth-validation";
import { RECOVERY_QUESTIONS } from "@/lib/recovery-questions";

export function RecoverScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [a3, setA3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("slide-panel-height");
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      setPanelHeight(parsed);
    }
  }, []);

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

  function goHome() {
    router.push("/");
  }

  return (
    <NodeckStage
      slideNumber={3}
      slideTotal={3}
      onPrev={goHome}
      onNext={goHome}
      notesHref="/recover"
      stageClassName="nodeck-stage--home nodeck-stage--title-down"
      menuItems={[
        { label: "Go to Login", href: "/" },
        { label: "Go to Sign up", href: "/" },
        { label: "Open Recovery", href: "/recover" },
      ]}
    >
      <section
        className="nodeck-auth-panel is-recover"
        style={
          panelHeight
            ? ({
                "--slide-panel-height": `${panelHeight}px`,
                height: `${Math.round(panelHeight)}px`,
                width: "min(780px, 94vw)",
              } as CSSProperties)
            : { width: "min(780px, 94vw)" }
        }
        aria-live="polite"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/70">
            Slide Three
          </p>
          <Link href="/" className="nodeck-tab">
            Back
          </Link>
        </div>

        {!showPassword ? (
          <form onSubmit={(e) => void onSubmit(e)} className="nodeck-form-scroll space-y-3">
            <p className="text-xs font-bold leading-relaxed text-black/70">
              Enter your school email and the same answers you chose when you signed up. We will show
              you a password you can use to log in.
            </p>
            <div>
              <label htmlFor="recover-email" className="nodeck-label">
                School email
              </label>
              <input
                id="recover-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="nodeck-input"
                placeholder={`name${STUDENT_EMAIL_DOMAIN}`}
              />
            </div>

            {[0, 1, 2].map((i) => (
              <div key={i}>
                <label htmlFor={`recover-q${i}`} className="nodeck-label">
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
                  className="nodeck-input"
                />
              </div>
            ))}

            {error && (
              <p className="rounded-xl border-2 border-[#111] bg-[#ffd4e6] px-3 py-2 text-center text-sm font-black text-[#111]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="nodeck-submit mt-2 w-full py-4 text-lg disabled:opacity-60"
            >
              {pending ? "Checking..." : "Verify answers"}
            </button>
          </form>
        ) : (
          <div className="nodeck-form-scroll space-y-4">
            <div className="rounded-2xl border-2 border-[#111] bg-[#fff7a9] p-4">
              {infoMessage && (
                <p className="mb-3 text-sm font-bold text-black">{infoMessage}</p>
              )}
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-black">
                Your login password
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-xl border-2 border-[#111] bg-white px-3 py-2 text-sm font-bold text-black">
                  {showPassword}
                </code>
                <button
                  type="button"
                  onClick={() => void copyPassword()}
                  className="nodeck-tab shrink-0"
                >
                  {copyDone ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-xs font-bold text-black/60">
                Use this password on the home page to log in. You can change it after signing in under
                Password.
              </p>
            </div>
            <Link
              href="/"
              className="nodeck-submit flex w-full items-center justify-center py-4 text-lg no-underline"
            >
              Go to log in
            </Link>
          </div>
        )}
      </section>
    </NodeckStage>
  );
}
