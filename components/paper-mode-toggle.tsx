"use client";

import type { CSSProperties } from "react";

type PrepScope = "all" | "dp1";

type PaperModeToggleProps = {
  value: PrepScope;
  onChange: (next: PrepScope) => void;
  disabled?: boolean;
  summaryText?: string;
  className?: string;
};

const easeSegment = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Match page bg so the ring does not look like a second “box” */
const focusAll =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d6bff]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
const focusDp1 =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

export function PaperModeToggle({ value, onChange, disabled, summaryText, className }: PaperModeToggleProps) {
  const slideStyle: CSSProperties = {
    transform: value === "all" ? "translate3d(0, 0, 0)" : "translate3d(calc(100% + 0.375rem), 0, 0)",
    transition: `transform 320ms ${easeSegment}, background-color 320ms ${easeSegment}, box-shadow 320ms ${easeSegment}`,
  };

  return (
    <div
      className={`w-full max-w-[28rem] flex flex-col gap-3 p-0 ${className ?? ""}`}
    >
      <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--duo-text-muted)]/80">
        Paper mode
      </p>

      <div
        className="shadow-[inset_0_1px_2px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.4)]"
        role="group"
        aria-label="Paper scope"
      >
        <div
          className="relative flex flex-row items-stretch gap-1.5 overflow-hidden rounded-[14px] border border-[var(--duo-border)]/45 bg-gradient-to-b from-slate-100/80 to-slate-100/50 p-1.5 shadow-[0_1px_0_rgba(255,255,255,0.5)]"
        >
          {/* Sliding “thumb” – animates with spring-like easing; color tracks selection */}
          <div
            aria-hidden
            className={`pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 z-0 w-[calc(50%-9px)] rounded-full ${
              value === "all"
                ? "bg-[#5d6bff] shadow-[0_4px_14px_-2px_rgba(77,94,245,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]"
                : "bg-[#7d4cc9] shadow-[0_4px_14px_-2px_rgba(125,76,201,0.48),inset_0_1px_0_rgba(255,255,255,0.18)]"
            }`}
            style={slideStyle}
          />

          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("all")}
            aria-pressed={value === "all"}
            className={`relative z-10 flex min-h-[46px] min-w-0 flex-1 items-center justify-center rounded-full border-2 border-transparent bg-transparent px-2 py-2.5 text-center text-xs font-black leading-tight transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 sm:px-4 sm:text-sm ${focusAll} ${
              value === "all" ? "text-white" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            All papers
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("dp1")}
            aria-pressed={value === "dp1"}
            className={`relative z-10 flex min-h-[46px] min-w-0 flex-1 items-center justify-center rounded-full border-2 border-transparent bg-transparent px-2 py-2.5 text-center text-xs font-black leading-tight transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 sm:px-4 sm:text-sm ${focusDp1} ${
              value === "dp1" ? "text-white" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            DP1 only (Themes A-C)
          </button>
        </div>
      </div>

      <p className="text-center text-[13px] font-medium leading-relaxed text-[var(--duo-text-muted)]/90">
        {summaryText ??
          (value === "dp1" ? "Showing only DP1 EOY Exam Prep papers." : "Showing all draft and published papers.")}
      </p>
    </div>
  );
}
