"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
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

const TITLE_TEXT = "PHYSICS ERROR BANK";
const TITLE_LETTER_ROTATIONS = [
  -3, 2, -1, 3, -2, 1, -2, 0, 2, -1, 3, -3, 1, 0, 2, -2, 3, -1,
];

type DragPosition = {
  x: number;
  y: number;
};

function useDraggable() {
  const [position, setPosition] = useState<DragPosition>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const limitX = window.innerWidth * 0.72;
    const limitY = window.innerHeight * 0.72;
    const nextX = drag.originX + e.clientX - drag.startX;
    const nextY = drag.originY + e.clientY - drag.startY;
    setPosition({
      x: Math.max(-limitX, Math.min(limitX, nextX)),
      y: Math.max(-limitY, Math.min(limitY, nextY)),
    });
  }

  function stopDragging(e: ReactPointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragState.current = null;
    setDragging(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    const step = e.shiftKey ? 20 : 8;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    setPosition((current) => ({
      x:
        current.x +
        (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
      y:
        current.y +
        (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
    }));
  }

  return {
    dragging,
    dragStyle: {
      "--drag-x": `${position.x}px`,
      "--drag-y": `${position.y}px`,
    } as CSSProperties,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopDragging,
      onPointerCancel: stopDragging,
      onLostPointerCapture: stopDragging,
      onDoubleClick: () => setPosition({ x: 0, y: 0 }),
      onKeyDown,
    },
  };
}

export function LoginScreen({ showDevHint }: Props) {
  const router = useRouter();
  const noteDrag = useDraggable();
  const markerDrag = useDraggable();
  const planetDrag = useDraggable();
  const [mode, setMode] = useState<Mode>("login");
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [titlePressed, setTitlePressed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryA1, setRecoveryA1] = useState("");
  const [recoveryA2, setRecoveryA2] = useState("");
  const [recoveryA3, setRecoveryA3] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [loginPanelHeight, setLoginPanelHeight] = useState<number | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmPassword("");
    setName("");
    setRecoveryA1("");
    setRecoveryA2("");
    setRecoveryA3("");
  }

  function playUiClick() {
    if (muted || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.085);
    } catch {
      // Ignore audio errors to avoid blocking form interactions.
    }
  }

  function goPrevSlide() {
    playUiClick();
    switchMode(mode === "login" ? "register" : "login");
  }

  function goNextSlide() {
    playUiClick();
    switchMode(mode === "register" ? "login" : "register");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          tag === "BUTTON" ||
          tag === "A" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrevSlide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNextSlide();
      } else if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (mode !== "login") return;

    function measure() {
      const panel = panelRef.current;
      if (!panel) return;
      const height = panel.getBoundingClientRect().height;
      setLoginPanelHeight(height);
      sessionStorage.setItem("slide-panel-height", String(height));
    }

    measure();
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [mode, showDevHint]);

  function onTitlePointerMove(e: ReactPointerEvent<HTMLHeadingElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1));
    e.currentTarget.style.setProperty("--title-shift-x", `${x * 10}px`);
    e.currentTarget.style.setProperty("--title-shift-y", `${y * 7}px`);
    e.currentTarget.style.setProperty("--title-rotate-x", `${y * -7}deg`);
    e.currentTarget.style.setProperty("--title-rotate-y", `${x * 9}deg`);
  }

  function resetTitleInteraction() {
    const title = titleRef.current;
    if (!title) return;
    title.style.setProperty("--title-shift-x", "0px");
    title.style.setProperty("--title-shift-y", "0px");
    title.style.setProperty("--title-rotate-x", "0deg");
    title.style.setProperty("--title-rotate-y", "0deg");
    setTitlePressed(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    playUiClick();
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

  const slideNumber = mode === "login" ? 1 : 2;

  return (
    <div className="nodeck-login">
      <div className={`nodeck-stage nodeck-stage--home w-full ${mode === "login" ? "nodeck-stage--title-down" : ""}`}>
        <button
          type="button"
          className={`nodeck-note nodeck-draggable ${noteDrag.dragging ? "is-dragging" : ""}`}
          style={noteDrag.dragStyle}
          aria-label="Draggable atom. Use pointer or arrow keys; double click to reset."
          title="Drag me · Double-click to reset"
          {...noteDrag.dragProps}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/decorations/spark-atom.png"
            alt=""
            draggable={false}
            className="nodeck-note-atom"
          />
        </button>
        <button
          type="button"
          className={`nodeck-marker nodeck-draggable ${markerDrag.dragging ? "is-dragging" : ""}`}
          style={markerDrag.dragStyle}
          aria-label="Draggable apple. Use pointer or arrow keys; double click to reset."
          title="Drag me · Double-click to reset"
          {...markerDrag.dragProps}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/decorations/spark-apple.png"
            alt=""
            draggable={false}
            className="nodeck-marker-apple"
          />
        </button>
        <button
          type="button"
          className={`nodeck-planet nodeck-draggable ${planetDrag.dragging ? "is-dragging" : ""}`}
          style={planetDrag.dragStyle}
          aria-label="Draggable planet. Use pointer or arrow keys; double click to reset."
          title="Drag me · Double-click to reset"
          {...planetDrag.dragProps}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/decorations/spark-planet.png"
            alt=""
            draggable={false}
            className="nodeck-planet-image"
          />
        </button>

        <div className="nodeck-hero">
          <h1
            ref={titleRef}
            className={`nodeck-sticker-title ${titlePressed ? "is-pressed" : ""}`}
            aria-label="PHYSICS ERROR BANK"
            onPointerMove={onTitlePointerMove}
            onPointerLeave={resetTitleInteraction}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              setTitlePressed(true);
              playUiClick();
            }}
            onPointerUp={() => setTitlePressed(false)}
            onPointerCancel={resetTitleInteraction}
          >
            {Array.from(TITLE_TEXT).map((character, index) =>
              character === " " ? (
                <span key={`space-${index}`} className="nodeck-title-space" aria-hidden />
              ) : (
                <span
                  key={`${character}-${index}`}
                  className="nodeck-title-letter"
                  aria-hidden
                  style={
                    {
                      "--letter-rotate": `${TITLE_LETTER_ROTATIONS[index] ?? 0}deg`,
                      "--letter-y": `${index % 3 === 0 ? 0.04 : index % 3 === 1 ? -0.03 : 0}em`,
                    } as CSSProperties
                  }
                >
                  {character}
                </span>
              ),
            )}
          </h1>
          <p className="nodeck-subtitle nodeck-subtitle--plain">
            Log in with your UWC China school email to save mistakes and review your library.
          </p>
        </div>

        <section
          ref={panelRef}
          className={`nodeck-auth-panel ${mode === "login" ? "is-fitted" : "is-register"}`}
          style={
            mode === "register" && loginPanelHeight
              ? ({
                  "--slide-panel-height": `${loginPanelHeight}px`,
                  height: `${Math.round(loginPanelHeight * 1.3)}px`,
                  width: "min(780px, 94vw)",
                } as CSSProperties)
              : undefined
          }
          aria-live="polite"
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/70">
              {mode === "login" ? "Slide One" : "Slide Two"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playUiClick();
                  switchMode("login");
                }}
                className={`nodeck-tab ${mode === "login" ? "is-active" : ""}`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiClick();
                  switchMode("register");
                }}
                className={`nodeck-tab ${mode === "register" ? "is-active" : ""}`}
              >
                Sign up
              </button>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className={`space-y-3 ${mode === "login" ? "" : "nodeck-form-scroll"}`}
          >
            <div>
              {mode === "register" && (
                <>
                  <label
                    htmlFor="auth-name"
                    className="nodeck-label"
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
                    className="nodeck-input mb-3"
                    placeholder="Your full name"
                  />
                </>
              )}
              <label
                htmlFor="auth-email"
                className="nodeck-label"
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
                className="nodeck-input"
                placeholder={`name${STUDENT_EMAIL_DOMAIN}`}
              />
              <p className="mt-1.5 text-xs font-bold text-black/60">
                Must end with {STUDENT_EMAIL_DOMAIN}
                {showDevHint ? " (dev bootstrap login may use a different demo address)." : ""}
              </p>
            </div>
            <div>
              <label
                htmlFor="auth-password"
                className="nodeck-label"
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
                className="nodeck-input"
                placeholder="••••••••"
              />
              {mode === "register" && (
                <p className="mt-1.5 text-xs font-bold text-black/60">
                  At least 8 characters.
                </p>
              )}
            </div>

            {mode === "login" && (
              <p className="text-center">
                <Link
                  href="/recover"
                  className="text-sm font-black text-black underline underline-offset-2 transition-opacity hover:opacity-70"
                >
                  Forgot password?
                </Link>
              </p>
            )}

            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-confirm"
                  className="nodeck-label"
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
                  className="nodeck-input"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-4 rounded-2xl border border-black/20 bg-white/80 p-4">
                <p className="text-sm font-black uppercase tracking-[0.06em] text-black">
                  Security questions
                </p>
                <p className="text-xs font-bold leading-relaxed text-black/60">
                  Pick answers you will remember. Avoid personal names, phone numbers, or addresses. You
                  will need the same answers if you forget your password.
                </p>
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <label
                      htmlFor={`auth-recovery-${i}`}
                      className="nodeck-label"
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
                      className="nodeck-input"
                    />
                  </div>
                ))}
              </div>
            )}

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
              {pending
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Continue"
                  : "Create account"}
            </button>

            {showDevHint && (
              <p className="nodeck-dev-hint mt-2 text-center text-xs font-bold text-black/60">
                Dev-only bootstrap login:{" "}
                <span className="text-black">student@example.com</span> /{" "}
                <span className="text-black">physics123</span>
                <br />
                <span className="mt-1 inline-block">
                  Sign up always requires {STUDENT_EMAIL_DOMAIN}. Set AUTH_EMAIL in .env to use another
                  bootstrap account in development.
                </span>
              </p>
            )}
          </form>
        </section>

        <div className="nodeck-controls">
          <Link
            href="/recover"
            onClick={() => playUiClick()}
            className="nodeck-notes text-sm font-black uppercase tracking-[0.04em]"
          >
            PRESENTER NOTES
          </Link>

          <div className="nodeck-center-controls">
            <button type="button" onClick={goPrevSlide} className="nodeck-nav-btn">
              <span className="nodeck-arrow" aria-hidden>
                &lt;
              </span>
              PREV
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  playUiClick();
                  setMenuOpen((v) => !v);
                }}
                className="nodeck-menu-btn"
                aria-expanded={menuOpen}
                aria-controls="nodeck-quick-nav"
              >
                <span />
                <span />
                <span />
              </button>
              {menuOpen && (
                <div
                  id="nodeck-quick-nav"
                  className="nodeck-quick-nav"
                  role="menu"
                  aria-label="Quick slide actions"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      playUiClick();
                      switchMode("login");
                      setMenuOpen(false);
                    }}
                  >
                    Go to Login
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      playUiClick();
                      switchMode("register");
                      setMenuOpen(false);
                    }}
                  >
                    Go to Sign up
                  </button>
                  <Link
                    href="/recover"
                    role="menuitem"
                    onClick={() => {
                      playUiClick();
                      setMenuOpen(false);
                    }}
                  >
                    Open Recovery
                  </Link>
                </div>
              )}
            </div>

            <button type="button" onClick={goNextSlide} className="nodeck-nav-btn">
              NEXT
              <span className="nodeck-arrow" aria-hidden>
                &gt;
              </span>
            </button>
          </div>

          <div className="nodeck-slide-state" data-slide={slideNumber}>
            <button
              type="button"
              onClick={() => {
                setMuted((v) => !v);
                playUiClick();
              }}
              className="nodeck-mute-btn"
              aria-pressed={!muted}
            >
              {muted ? "MUTE" : "SOUND"}
            </button>
            <span className="text-sm font-black">SLIDE {slideNumber}/2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
