export type MistakeEntry = {
  id: string;
  imageDataUrl: string;
  tags: string[];
  notes: string;
  createdAt: string;
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
