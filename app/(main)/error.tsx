"use client";

import { useEffect } from "react";

export default function MainGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main route error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border-2 border-[#ff4b4b] bg-[#ffe8e8] p-5 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#b42318]">Something went wrong</p>
        <h1 className="mt-1 text-xl font-black text-[#8f1d1d]">This page failed to load</h1>
        <p className="mt-2 text-sm font-bold text-[#8f1d1d]">
          Please retry. If it still fails, refresh once or log out and sign in again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-xl border-2 border-[#b42318] bg-white px-4 py-2 text-sm font-extrabold text-[#b42318]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
