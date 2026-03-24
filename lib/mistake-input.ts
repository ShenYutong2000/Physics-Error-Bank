export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function parseTagNamesFromJsonString(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) {
    throw new Error("Tags must be a JSON string array.");
  }
  return parsed;
}

export function parseTagNamesFromUnknown(raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.every((t) => typeof t === "string")) {
    throw new Error("Body must include tags: string[] and optional notes: string.");
  }
  return raw;
}
