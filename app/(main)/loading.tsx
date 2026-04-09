export default function MainGroupLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <div className="h-9 w-56 max-w-full animate-pulse rounded-xl bg-[var(--duo-border)]/70" aria-hidden />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[var(--duo-border)]/50" aria-hidden />
      <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[var(--duo-border)]/35" aria-hidden />
    </div>
  );
}
