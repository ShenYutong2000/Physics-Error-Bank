"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const studentItems = [
  { href: "/add", label: "Add", icon: CameraIcon },
  { href: "/library", label: "Library", icon: BooksIcon },
  { href: "/papers", label: "Papers", icon: ClipboardIcon },
] as const;

const teacherItems = [
  { href: "/papers", label: "Papers", icon: ClipboardIcon },
  { href: "/teacher", label: "Teacher", icon: ChartIcon },
  { href: "/teacher/mistakes", label: "Class", icon: UsersIcon },
] as const;

function pathMatchesBase(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isTeacherNavItemActive(pathname: string, href: string): boolean {
  if (href === "/papers") return pathMatchesBase(pathname, "/papers");
  if (href === "/teacher/mistakes") return pathMatchesBase(pathname, "/teacher/mistakes");
  if (href === "/teacher") {
    return (
      pathMatchesBase(pathname, "/teacher") && !pathMatchesBase(pathname, "/teacher/mistakes")
    );
  }
  return false;
}

export function DuoNav({ isTeacher }: { isTeacher: boolean }) {
  const pathname = usePathname();
  const items = isTeacher ? teacherItems : studentItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[var(--duo-border)] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_0_rgba(0,0,0,0.06)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isTeacher
            ? isTeacherNavItemActive(pathname, href)
            : pathname === href || (href !== "/add" && href !== "/library" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
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

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="12" y="9" width="3" height="9" />
      <rect x="17" y="6" width="3" height="12" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

