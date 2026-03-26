"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/add", label: "Add", icon: CameraIcon },
  { href: "/library", label: "Library", icon: BooksIcon },
  { href: "/tags", label: "Tags", icon: TagIcon },
] as const;

export function DuoNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[var(--duo-border)] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_0_rgba(0,0,0,0.06)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg justify-around px-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[5rem] flex-col items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                active
                  ? "text-[var(--duo-green-dark)]"
                  : "text-[var(--duo-text-muted)] hover:text-[var(--duo-text)]"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border-b-4 transition-transform active:translate-y-0.5 active:border-b-2 ${
                  active
                    ? "border-[var(--duo-green-shadow)] bg-[var(--duo-green)] text-white"
                    : "border-[#e5e5e5] bg-[var(--duo-surface)] text-[var(--duo-text-muted)]"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function BooksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20.59 13.41 12 22l-9-9V2h11l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
