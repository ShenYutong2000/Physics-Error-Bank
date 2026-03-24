import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

/** Format: scrypt$<saltHex>$<hashHex> */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(stored: string, plain: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const check = scryptSync(plain, salt, KEYLEN, SCRYPT_OPTIONS);
    if (expected.length !== check.length) return false;
    return timingSafeEqual(expected, check);
  } catch {
    return false;
  }
}
