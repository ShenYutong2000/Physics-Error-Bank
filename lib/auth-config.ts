const DEV_SECRET = "dev-peb-secret-change-in-production";
const DEV_EMAIL = "student@example.com";
const DEV_PASSWORD = "physics123";

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "development") return DEV_SECRET;
  return "";
}

export function getExpectedCredentials(): { email: string; password: string } | null {
  const email = process.env.AUTH_EMAIL?.trim();
  const password = process.env.AUTH_PASSWORD;
  if (email && password !== undefined && password !== "") {
    return { email, password };
  }
  if (process.env.NODE_ENV === "development") {
    return { email: DEV_EMAIL, password: DEV_PASSWORD };
  }
  return null;
}
