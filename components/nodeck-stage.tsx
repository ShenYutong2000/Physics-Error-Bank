"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

export const TITLE_TEXT = "PHYSICS ERROR BANK";
export const TITLE_LETTER_ROTATIONS = [
  -3, 2, -1, 3, -2, 1, -2, 0, 2, -1, 3, -3, 1, 0, 2, -2, 3, -1,
];

type DragPosition = {
  x: number;
  y: number;
};

export function useDraggable() {
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

type MenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type Props = {
  children: ReactNode;
  slideNumber: number;
  slideTotal: number;
  onPrev: () => void;
  onNext: () => void;
  notesHref: string;
  notesLabel?: string;
  menuItems: MenuItem[];
  playUiClick?: () => void;
  compactHero?: boolean;
  stageClassName?: string;
  subtitle?: string;
};

export function NodeckStage({
  children,
  slideNumber,
  slideTotal,
  onPrev,
  onNext,
  notesHref,
  notesLabel = "PRESENTER NOTES",
  menuItems,
  playUiClick,
  compactHero = false,
  stageClassName = "",
  subtitle = "Log in with your UWC China school email to save mistakes and review your library.",
}: Props) {
  const noteDrag = useDraggable();
  const markerDrag = useDraggable();
  const planetDrag = useDraggable();
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [titlePressed, setTitlePressed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  function click() {
    if (playUiClick) {
      playUiClick();
      return;
    }
    if (muted || typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  function onTitlePointerMove(e: ReactPointerEvent<HTMLHeadingElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
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

  return (
    <div className="nodeck-login">
      <div className={`nodeck-stage w-full ${stageClassName}`.trim()}>
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

        <div className={`nodeck-hero ${compactHero ? "is-compact" : ""}`}>
          <h1
            ref={titleRef}
            className={`nodeck-sticker-title ${titlePressed ? "is-pressed" : ""}`}
            aria-label={TITLE_TEXT}
            onPointerMove={onTitlePointerMove}
            onPointerLeave={resetTitleInteraction}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              setTitlePressed(true);
              click();
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
            {subtitle}
          </p>
        </div>

        {children}

        <div className="nodeck-controls">
          <Link
            href={notesHref}
            onClick={() => click()}
            className="nodeck-notes text-sm font-black uppercase tracking-[0.04em]"
          >
            {notesLabel}
          </Link>

          <div className="nodeck-center-controls">
            <button
              type="button"
              onClick={() => {
                click();
                onPrev();
              }}
              className="nodeck-nav-btn"
            >
              <span className="nodeck-arrow" aria-hidden>
                &lt;
              </span>
              PREV
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  click();
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
                  {menuItems.map((item) =>
                    item.href ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        role="menuitem"
                        onClick={() => {
                          click();
                          setMenuOpen(false);
                          item.onClick?.();
                        }}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          click();
                          setMenuOpen(false);
                          item.onClick?.();
                        }}
                      >
                        {item.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                click();
                onNext();
              }}
              className="nodeck-nav-btn"
            >
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
                click();
              }}
              className="nodeck-mute-btn"
              aria-pressed={!muted}
            >
              {muted ? "MUTE" : "SOUND"}
            </button>
            <span className="text-sm font-black">
              SLIDE {slideNumber}/{slideTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
