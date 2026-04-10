"use client";

import Link from "next/link";
import { useState } from "react";
import { mainPageClassName } from "@/components/main-page-layout";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-validation";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={mainPageClassName}>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--duo-green-dark)]">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--duo-text)]">Change password</h1>
        <p className="mt-2 text-sm font-medium text-[var(--duo-text-muted)]">
          Use your current password, then choose a new one. Next time you log in, use the new
          password.
        </p>
      </header>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-2xl border-2 border-[var(--duo-border)] bg-white p-5 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
      >
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-bold text-[var(--duo-text)]">
            Current password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-bold text-[var(--duo-text)]">
            New password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-bold text-[var(--duo-text)]">
            Confirm new password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border-2 border-[var(--duo-border)] bg-[var(--duo-surface)] px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--duo-green)]"
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        </label>
        <p className="mb-4 text-xs font-medium text-[var(--duo-text-muted)]">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>

        {error && (
          <p className="mb-4 rounded-xl border-2 border-[#ff4b4b] bg-[#ffe8e8] px-3 py-2 text-sm font-bold text-[#c00]">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-xl border-2 border-[#7a84ff] bg-[#ecebff] px-3 py-2 text-sm font-bold text-[#3f4fcf]">
            Password updated. You can keep using this session; next login, use your new password.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="duo-btn-primary w-full py-3.5 text-base disabled:opacity-60"
        >
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/add"
          className="text-sm font-bold text-[var(--duo-blue)] underline-offset-2 hover:underline"
        >
          Back to add mistake
        </Link>
      </p>
    </div>
  );
}
