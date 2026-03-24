"use client";

type NoticeTone = "warning" | "error";

const toneClassMap: Record<NoticeTone, string> = {
  warning: "border-[#ff9800] bg-[#fff4e5] text-[#a60]",
  error: "border-[#ff4b4b] bg-[#ffe8e8] text-[#c00]",
};

const actionClassMap: Record<NoticeTone, string> = {
  warning:
    "rounded-lg border-2 border-[#a60] bg-white px-3 py-1.5 text-xs font-extrabold text-[#a60] hover:bg-[#fff8f0]",
  error:
    "rounded-lg border-2 border-[#c00] bg-white px-3 py-1.5 text-xs font-extrabold text-[#c00] hover:bg-[#fff5f5]",
};

type NoticeAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type NoticeBannerProps = {
  tone: NoticeTone;
  message: string;
  className?: string;
  actions?: NoticeAction[];
};

export function NoticeBanner({
  tone,
  message,
  className = "",
  actions = [],
}: NoticeBannerProps) {
  return (
    <div className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${toneClassMap[tone]} ${className}`}>
      <p>{message}</p>
      {actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={actionClassMap[tone]}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
