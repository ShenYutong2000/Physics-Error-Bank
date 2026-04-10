"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
  timeoutMessage?: string;
  retryCount?: number;
  retryDelayMs?: number;
};

export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init?: ApiFetchOptions,
): Promise<ApiResult<T>> {
  const timeoutMs = init?.timeoutMs ?? 12_000;
  const timeoutMessage = init?.timeoutMessage ?? "Request timed out. Please try again.";
  const retryCount = Math.max(0, init?.retryCount ?? 1);
  const retryDelayMs = Math.max(0, init?.retryDelayMs ?? 250);
  const requestInit: RequestInit = { ...(init ?? {}) };
  const signal = requestInit.signal ?? undefined;
  delete (requestInit as ApiFetchOptions).timeoutMs;
  delete (requestInit as ApiFetchOptions).timeoutMessage;
  delete (requestInit as ApiFetchOptions).retryCount;
  delete (requestInit as ApiFetchOptions).retryDelayMs;
  delete (requestInit as ApiFetchOptions).signal;

  const method = (requestInit.method ?? "GET").toUpperCase();
  const allowRetry = method === "GET" && retryCount > 0;

  for (let attempt = 0; attempt <= (allowRetry ? retryCount : 0); attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let didTimeout = false;

    const abortFromExternalSignal = () => {
      controller.abort();
    };
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", abortFromExternalSignal, { once: true });
    }

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);
    }

    try {
      const res = await fetch(input, { credentials: "include", ...requestInit, signal: controller.signal });
      let body = (await res.json().catch(() => ({}))) as { error?: string } & T;
      if (!res.ok) {
        const mayRetry503 =
          res.status === 503 && ["POST", "PUT", "PATCH", "DELETE"].includes(method);
        if (mayRetry503) {
          await waitBeforeRetry(300, 0, signal);
          const res2 = await fetch(input, {
            credentials: "include",
            ...requestInit,
            signal: controller.signal,
          });
          body = (await res2.json().catch(() => ({}))) as { error?: string } & T;
          if (!res2.ok) {
            return {
              ok: false,
              status: res2.status,
              error: body.error ?? "Request failed.",
            };
          }
          return { ok: true, data: body };
        }
        return {
          ok: false,
          status: res.status,
          error: body.error ?? "Request failed.",
        };
      }
      return { ok: true, data: body };
    } catch (error) {
      const externallyAborted = Boolean(signal?.aborted);
      if (didTimeout) {
        if (allowRetry && attempt < retryCount) {
          await waitBeforeRetry(retryDelayMs, attempt, signal);
          continue;
        }
        return { ok: false, status: 0, error: timeoutMessage };
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        if (!externallyAborted && allowRetry && attempt < retryCount) {
          await waitBeforeRetry(retryDelayMs, attempt, signal);
          continue;
        }
        return { ok: false, status: 0, error: "Request cancelled." };
      }
      if (allowRetry && attempt < retryCount) {
        await waitBeforeRetry(retryDelayMs, attempt, signal);
        continue;
      }
      return { ok: false, status: 0, error: "Network error." };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", abortFromExternalSignal);
    }
  }

  return { ok: false, status: 0, error: "Network error." };
}

async function waitBeforeRetry(baseDelayMs: number, attempt: number, signal?: AbortSignal): Promise<void> {
  const backoff = baseDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 100);
  const delay = backoff + jitter;
  await new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    const onAbort = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
