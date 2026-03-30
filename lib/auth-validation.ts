const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Student accounts must use this school domain (after normalizeEmail). */
export const STUDENT_EMAIL_DOMAIN = "@uwcchina.org";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** True if this is a UWC China student email (…@uwcchina.org). */
export function isStudentSchoolEmail(email: string): boolean {
  return normalizeEmail(email).endsWith(STUDENT_EMAIL_DOMAIN);
}

export const STUDENT_EMAIL_REQUIRED_MESSAGE =
  `Please use your school email (${STUDENT_EMAIL_DOMAIN}) or a teacher email on the allowlist.`;

export const MIN_PASSWORD_LENGTH = 8;
