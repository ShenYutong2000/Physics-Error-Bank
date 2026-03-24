const COOKIE_NAME = "peb_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(b64url: string): string {
  const pad = 4 - (b64url.length % 4);
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + (pad < 4 ? "=".repeat(pad) : "");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSha256B64Url(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export async function signSession(email: string, secret: string): Promise<string> {
  const payload = {
    email,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadJson));
  const sig = await hmacSha256B64Url(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<{ email: string } | null> {
  if (!secret) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256B64Url(secret, payloadB64);
  if (sig.length !== expected.length) return null;
  let ok = 0;
  for (let i = 0; i < sig.length; i++) ok |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (ok !== 0) return null;
  try {
    const json = base64UrlDecodeToString(payloadB64);
    const payload = JSON.parse(json) as { email?: string; exp?: number };
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function sessionMaxAgeSec(): number {
  return MAX_AGE_SEC;
}
