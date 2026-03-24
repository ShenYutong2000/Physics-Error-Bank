"use client";

import { DuoNav } from "@/components/duo-nav";

type Props = {
  email: string;
  children: React.ReactNode;
};

export function MainShell({ email, children }: Props) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-[var(--duo-border)] bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-b-4 border-[var(--duo-green-shadow)] bg-[var(--duo-green)] text-lg text-white"
              aria-hidden
            >
              ⚡
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--duo-green-dark)]">
                Physics Error Bank
              </p>
              <p className="truncate text-base font-black leading-tight text-[var(--duo-text)]">
                Physics Error Bank
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="hidden max-w-[10rem] truncate text-xs font-bold text-[var(--duo-text-muted)] sm:inline">
              {email}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border-b-4 border-[#d9d9d9] bg-[var(--duo-surface)] px-3 py-2 text-xs font-extrabold text-[var(--duo-text)] active:translate-y-0.5 active:border-b-2 sm:text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <DuoNav />
    </>
  );
}
