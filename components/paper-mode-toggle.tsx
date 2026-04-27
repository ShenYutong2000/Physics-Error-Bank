"use client";

type PrepScope = "all" | "dp1";

type PaperModeToggleProps = {
  value: PrepScope;
  onChange: (next: PrepScope) => void;
  disabled?: boolean;
  summaryText?: string;
  className?: string;
};

export function PaperModeToggle({ value, onChange, disabled, summaryText, className }: PaperModeToggleProps) {
  return (
    <div
      className={`w-full max-w-[28rem] rounded-2xl border-2 border-[#d8c9ff] bg-gradient-to-br from-[#f7f3ff] via-white to-[#fdf8ff] p-3 shadow-[0_3px_0_0_rgba(0,0,0,0.06)] ${className ?? ""}`}
    >
      <p className="text-xs font-extrabold uppercase tracking-wide text-[#5f4f8f]">Paper mode</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("all")}
          aria-pressed={value === "all"}
          className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-black disabled:opacity-60 ${
            value === "all"
              ? "border-[#4a56c7] bg-gradient-to-r from-[#5d6bff] via-[#7a84ff] to-[#4a56c7] text-white"
              : "border-[var(--duo-border)] bg-white text-[var(--duo-text)]"
          }`}
        >
          All papers
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("dp1")}
          aria-pressed={value === "dp1"}
          className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-black disabled:opacity-60 ${
            value === "dp1"
              ? "border-[#7d4cc9] bg-gradient-to-r from-[#7d4cc9] via-[#8d5cf6] to-[#6f42c1] text-white"
              : "border-[#d8c9ff] bg-white text-[#5f4f8f]"
          }`}
        >
          DP1 only (Themes A-C)
        </button>
      </div>
      <p className="mt-2 text-xs font-bold text-[#5f4f8f]">
        {summaryText ??
          (value === "dp1" ? "Showing only DP1 EOY Exam Prep papers." : "Showing all draft and published papers.")}
      </p>
    </div>
  );
}

