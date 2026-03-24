"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, { credentials: "include", ...init });
    const body = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body.error ?? "Request failed.",
      };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, status: 0, error: "Network error." };
  }
}
