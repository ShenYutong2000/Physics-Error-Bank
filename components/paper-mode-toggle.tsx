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
      className={`w-full max-w-[28rem] rounded-[12px] border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ${className ?? ""}`}
    >
      <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#94a3b8]">Paper mode</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("all")}
          aria-pressed={value === "all"}
          className={`rounded-[10px] border-2 px-3 py-2 text-center text-sm font-black disabled:opacity-60 ${
            value === "all"
              ? "border-[#4a56c7] bg-[#5d6bff] text-white"
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
          className={`rounded-[10px] border-2 px-3 py-2 text-center text-sm font-black disabled:opacity-60 ${
            value === "dp1"
              ? "border-[#6d4dc4] bg-[#7d4cc9] text-white"
              : "border-[#e2e8f0] bg-white text-[var(--duo-text)]"
          }`}
        >
          DP1 only (Themes A-C)
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-medium text-[#64748b]">
        {summaryText ??
          (value === "dp1" ? "Showing only DP1 EOY Exam Prep papers." : "Showing all draft and published papers.")}
      </p>
    </div>
  );
}
