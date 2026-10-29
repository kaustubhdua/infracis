import { describe, expect, it } from "vitest";
import {
  LOCALITY_REVIEW_DIMENSIONS,
  normalizeLocalityReviewNote,
  parseLocalityReview
} from "../lib/locality-review";

describe("private locality experience reviews", () => {
  it("migrates legacy overall-only notes without inventing category ratings", () => {
    expect(parseLocalityReview({
      rating: 4,
      note: "Walked here once",
      updatedAt: "2026-10-28T10:00:00.000Z"
    })).toEqual({
      rating: 4,
      dimensions: {},
      note: "Walked here once",
      updatedAt: "2026-10-28T10:00:00.000Z"
    });
  });

  it("keeps only valid five-star dimension ratings", () => {
    const parsed = parseLocalityReview({
      rating: 5,
      note: "Observed on foot",
      dimensions: {
        walkability: 4,
        publicTransport: 0,
        noise: 6,
        lighting: 3.5,
        cleanliness: 2,
        unknownCategory: 5
      },
      updatedAt: "not-a-date"
    });
    expect(parsed).toEqual({
      rating: 5,
      note: "Observed on foot",
      dimensions: { walkability: 4, cleanliness: 2 },
      updatedAt: ""
    });
  });

  it("rejects malformed reviews and out-of-range overall ratings", () => {
    expect(parseLocalityReview(null)).toBeNull();
    expect(parseLocalityReview([])).toBeNull();
    expect(parseLocalityReview({ rating: 0, note: "bad" })).toBeNull();
    expect(parseLocalityReview({ rating: 3, note: 4 })).toBeNull();
  });

  it("limits notes and exposes only the intended dimensions", () => {
    expect(normalizeLocalityReviewNote("  note  ")).toBe("note");
    expect(normalizeLocalityReviewNote("x".repeat(1300))).toHaveLength(1200);
    expect(LOCALITY_REVIEW_DIMENSIONS.map((item) => item.key)).toEqual([
      "walkability", "publicTransport", "noise", "lighting", "cleanliness"
    ]);
  });
});
