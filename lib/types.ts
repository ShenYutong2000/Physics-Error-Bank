export type MistakeEntry = {
  id: string;
  /** Public URL path (e.g. /api/mistake-files/...) for <img src>. */
  imageUrl: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const TAG_GROUPS = [
  {
    theme: "Theme A - Space, Time, and Motion",
    tags: [
      "A.1 Kinematics",
      "A.2 Forces and Momentum",
      "A.3 Work, Energy, and Power",
      "A.4 Rigid Body Mechanics",
      "A.5 Relativity",
    ],
  },
  {
    theme: "Theme B - The Particulate Nature of Matter",
    tags: [
      "B.1 Thermal Energy Transfers",
      "B.2 Greenhouse Effect",
      "B.3 Gas Laws",
      "B.4 Thermodynamics - HL only",
      "B.5 Current and Circuits",
    ],
  },
  {
    theme: "Theme C - Wave Behavior",
    tags: [
      "C.1 Simple Harmonic Motion",
      "C.2 Wave Model",
      "C.3 Wave Phenomena",
      "C.4 Standing Waves and Resonance",
      "C.5 Doppler Effect",
    ],
  },
  {
    theme: "Theme D - Fields",
    tags: [
      "D.1 Gravitational Fields",
      "D.2 Electric and Magnetic Fields",
      "D.3 Motion in Electromagnetic Fields",
      "D.4 Electromagnetic Induction",
    ],
  },
  {
    theme: "Theme E - Nuclear and Quantum Physics",
    tags: [
      "E.1 Structure of the Atom",
      "E.2 Quantum Physics",
      "E.3 Radioactive Decay",
      "E.4 Fission",
      "E.5 Fusion and Stars",
    ],
  },
  {
    theme: "Theme M - Measurement and Data Processing",
    tags: ["Measurement"],
  },
] as const;

export const PRESET_TAGS = TAG_GROUPS.flatMap((g) => g.tags);
export const PRESET_TAG_SET = new Set<string>(PRESET_TAGS);
