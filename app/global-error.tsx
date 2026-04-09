"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7fbff] font-sans text-[var(--duo-text)]">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="w-full rounded-2xl border-2 border-[#ff4b4b] bg-[#ffe8e8] p-5 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#b42318]">Unexpected app error</p>
            <h1 className="mt-1 text-xl font-black text-[#8f1d1d]">Please try again</h1>
            <p className="mt-2 text-sm font-bold text-[#8f1d1d]">
              The app hit an unexpected error. Retry now, then refresh if needed.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-4 rounded-xl border-2 border-[#b42318] bg-white px-4 py-2 text-sm font-extrabold text-[#b42318]"
            >
              Retry
            </button>
            {error.digest ? <p className="mt-2 text-xs font-bold text-[#8f1d1d]">Ref: {error.digest}</p> : null}
          </section>
        </main>
      </body>
    </html>
  );
}
