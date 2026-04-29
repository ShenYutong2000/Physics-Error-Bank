export function replaceUrlWithQuery(updates: Record<string, string | null>): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  const nextPath = `${window.location.pathname}${query ? `?${query}` : ""}`;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath !== nextPath) {
    window.history.replaceState(null, "", nextPath);
  }
}

