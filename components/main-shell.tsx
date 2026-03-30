"use client";

import Link from "next/link";
import { useState } from "react";
import { DuoNav } from "@/components/duo-nav";

type Props = {
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER";
  children: React.ReactNode;
};

export function MainShell({ email, name, role, children }: Props) {
  const [profileName, setProfileName] = useState(name);
  const [nameInput, setNameInput] = useState(name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function saveName() {
    setNameError(null);
    if (!nameInput.trim()) {
      setNameError("Please enter your name.");
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNameError(body.error ?? "Could not save name.");
        return;
      }
      setProfileName(nameInput.trim());
    } finally {
      setSavingName(false);
    }
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
              {profileName.trim() ? `${profileName} · ${email}` : email}
            </span>
            <Link
              href="/settings/password"
              className="rounded-xl border-b-4 border-[#d9d9d9] bg-[var(--duo-surface)] px-3 py-2 text-xs font-extrabold text-[var(--duo-text)] active:translate-y-0.5 active:border-b-2 sm:text-sm"
            >
              Password
            </Link>
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
      {!profileName.trim() && (
        <div className="mx-auto mt-3 w-full max-w-lg px-4">
          <div className="rounded-xl border-2 border-[#ff9800] bg-[#fff4e5] p-3">
            <p className="text-sm font-bold text-[#a65b00]">Please set your display name for teacher analytics.</p>
            <div className="mt-2 flex gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                className="min-w-0 flex-1 rounded-lg border-2 border-[#ffd8a8] bg-white px-3 py-2 text-sm font-bold outline-none"
              />
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={savingName}
                className="rounded-lg border-2 border-[#d9d9d9] bg-white px-3 py-2 text-sm font-bold"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
            </div>
            {nameError && <p className="mt-2 text-xs font-bold text-[#b00020]">{nameError}</p>}
          </div>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <DuoNav isTeacher={role === "TEACHER"} />
    </>
  );
}
