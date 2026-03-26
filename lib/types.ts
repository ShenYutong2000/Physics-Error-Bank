export type MistakeEntry = {
  id: string;
  /** Public URL path (e.g. /api/mistake-files/...) for <img src>. */
  imageUrl: string;
  tags: string[];
  notes: string;
  /** How many times the user marked this mistake as reviewed (manual only). */
  reviewCount: number;
  /** ISO timestamp of the last manual review, or null if never reviewed. */
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PRESET_TAGS = [
  "Mechanics",
  "E&M",
  "Thermodynamics",
  "Optics",
  "Waves & oscillations",
  "Modern physics",
  "Lab",
  "Misread question",
  "Formula misuse",
  "Calculation slip",
  "Concept confusion",
] as const;
