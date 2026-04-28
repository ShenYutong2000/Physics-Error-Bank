import Link from "next/link";
import type { ReactNode } from "react";

/** Shared style for the two sub-nav links under paper bank / stats titles (see design: light box, thin border). */
export const paperBankNavLinkClassName =
  "inline-flex items-center justify-center rounded-[10px] border-2 border-[var(--duo-border)] bg-white px-3 py-2 text-sm font-extrabold text-[var(--duo-text)] shadow-[0_2px_0_0_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f8fbff] active:translate-y-0.5 active:shadow-none";

export type PaperBankHeaderLink = { href: string; label: string };

type PaperBankPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  links: PaperBankHeaderLink[];
  right: ReactNode;
  className?: string;
};

/**
 * Top row: left = role label + title + optional description + two text links; right = Paper mode (or other slot).
 * Use on /teacher, /teacher/papers-overview, /papers, and inside paper stats panel.
 */
export function PaperBankPageHeader({ eyebrow, title, description, links, right, className }: PaperBankPageHeaderProps) {
  return (
    <header
      className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${className ?? "mb-6"}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3ecbff]">{eyebrow}</p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-[var(--duo-text)]">{title}</h1>
        {description ? <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">{description}</p> : null}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {links.map((l) => (
            <Link key={`${l.href}-${l.label}`} href={l.href} className={paperBankNavLinkClassName}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      {right}
    </header>
  );
}
