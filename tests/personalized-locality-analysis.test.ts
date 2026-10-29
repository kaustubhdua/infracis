import { describe, expect, it } from "vitest";
import type { LocationReport } from "../lib/types";
import { calculatePersonalFit } from "../lib/personalized-analysis";

function report(scores: Partial<LocationReport["scores"]>): LocationReport {
  return {
    scores: {
      completenessScore: 50,
      transitAccessibilityScore: null,
      dailyConvenienceScore: null,
      healthcareAccessScore: null,
      educationAccessScore: null,
      calculationFormulas: {},
      ...scores
    }
  } as LocationReport;
}

describe("personalized locality fit", () => {
  it("uses balanced weights across available metrics only", () => {
    const result = calculatePersonalFit(report({
      transitAccessibilityScore: 80,
      dailyConvenienceScore: 60,
      healthcareAccessScore: 40,
      educationAccessScore: 20
    }), "balanced");
    expect(result.score).toBe(50);
    expect(result.availableMetrics).toBe(4);
    expect(result.totalMetrics).toBe(4);
    expect(result.missingMetrics).toEqual([]);
  });

  it("renormalizes weights when some source metrics are unavailable", () => {
    const result = calculatePersonalFit(report({
      transitAccessibilityScore: 80,
      dailyConvenienceScore: null,
      healthcareAccessScore: 40,
      educationAccessScore: null
    }), "transit");
    expect(result.score).toBe(74);
    expect(result.availableMetrics).toBe(2);
    expect(result.missingMetrics).toEqual(["Daily essentials", "Education access"]);
  });

  it("does not invent a quietness score without verified noise data", () => {
    const result = calculatePersonalFit(report({
      transitAccessibilityScore: 100,
      dailyConvenienceScore: 100,
      healthcareAccessScore: 100,
      educationAccessScore: 100
    }), "quiet");
    expect(result.score).toBeNull();
    expect(result.availableMetrics).toBe(0);
    expect(result.explanation).toContain("No proxy or inferred noise score");
  });

  it("does not score a profile when all relevant metrics are missing", () => {
    const result = calculatePersonalFit(report({}), "family");
    expect(result.score).toBeNull();
    expect(result.availableMetrics).toBe(0);
    expect(result.missingMetrics).toHaveLength(4);
  });
});
