/**
 * Three fixed security questions (no names, phone numbers, or addresses).
 * Answers are stored hashed; compared after normalization.
 */
export const RECOVERY_QUESTIONS = [
  "What is your favorite physics topic (one word)?",
  "Pick a number from 1 to 99 that you will remember.",
  "Waves or particles? (answer in one word)",
] as const;

export const MIN_RECOVERY_ANSWER_LENGTH = 2;
export const MAX_RECOVERY_ANSWER_LENGTH = 128;

export function normalizeRecoveryAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Returns an error message, or null if all three answers are valid. */
export function validateRecoveryAnswersForSignup(
  answers: readonly [string, string, string],
): string | null {
  for (let i = 0; i < 3; i++) {
    const n = normalizeRecoveryAnswer(answers[i]);
    if (!n.length) {
      return "Please answer all three security questions.";
    }
    if (n.length < MIN_RECOVERY_ANSWER_LENGTH) {
      return `Each answer must be at least ${MIN_RECOVERY_ANSWER_LENGTH} characters.`;
    }
    if (n.length > MAX_RECOVERY_ANSWER_LENGTH) {
      return `Each answer must be at most ${MAX_RECOVERY_ANSWER_LENGTH} characters.`;
    }
  }
  return null;
}
