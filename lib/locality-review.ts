export const LOCALITY_REVIEW_DIMENSIONS = [
  { key: "walkability", label: "Walkability" },
  { key: "publicTransport", label: "Public transport" },
  { key: "noise", label: "Noise comfort" },
  { key: "lighting", label: "Street lighting" },
  { key: "cleanliness", label: "Cleanliness" }
] as const;

export type LocalityReviewDimension = (typeof LOCALITY_REVIEW_DIMENSIONS)[number]["key"];
export type LocalityReviewDimensions = Partial<Record<LocalityReviewDimension, number>>;

export interface LocalityReviewRecord {
  rating: number;
  dimensions: LocalityReviewDimensions;
  note: string;
  updatedAt: string;
}

function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Validate untrusted browser storage and migrate legacy overall-only reviews. */
export function parseLocalityReview(value: unknown): LocalityReviewRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<LocalityReviewRecord>;
  if (!isRating(raw.rating) || typeof raw.note !== "string") return null;

  const dimensions: LocalityReviewDimensions = {};
  if (raw.dimensions && typeof raw.dimensions === "object" && !Array.isArray(raw.dimensions)) {
    for (const { key } of LOCALITY_REVIEW_DIMENSIONS) {
      const candidate = (raw.dimensions as Record<string, unknown>)[key];
      if (isRating(candidate)) dimensions[key] = candidate;
    }
  }

  return {
    rating: raw.rating,
    dimensions,
    note: raw.note.slice(0, 1200),
    updatedAt: typeof raw.updatedAt === "string" && !Number.isNaN(Date.parse(raw.updatedAt))
      ? raw.updatedAt
      : ""
  };
}

export function normalizeLocalityReviewNote(value: string): string {
  return value.trim().slice(0, 1200);
}
