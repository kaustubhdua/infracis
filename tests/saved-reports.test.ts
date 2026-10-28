import { describe, expect, it } from "vitest";
import { parseStoredReports } from "../lib/local-report-storage";

function storedReport(id: string, label = `Location ${id}`) {
  return {
    id,
    generatedAt: "2026-10-28T00:00:00.000Z",
    location: { label },
    scores: { completenessScore: 75 }
  };
}

describe("browser-local saved report parsing", () => {
  it("rejects non-array storage payloads", () => {
    expect(parseStoredReports(null)).toEqual([]);
    expect(parseStoredReports({ reports: [storedReport("a")] })).toEqual([]);
    expect(parseStoredReports("not-json")).toEqual([]);
  });

  it("filters malformed and incomplete records", () => {
    expect(parseStoredReports([
      storedReport("valid"),
      null,
      { id: "missing-location", generatedAt: "2026-10-28T00:00:00Z", scores: { completenessScore: 20 } },
      { id: "missing-score", generatedAt: "2026-10-28T00:00:00Z", location: { label: "Broken" } }
    ])).toEqual([storedReport("valid")]);
  });

  it("keeps at most the twenty newest records in stored order", () => {
    const reports = Array.from({ length: 25 }, (_, index) => storedReport(String(index)));
    const parsed = parseStoredReports(reports);
    expect(parsed).toHaveLength(20);
    expect(parsed[0].id).toBe("0");
    expect(parsed[19].id).toBe("19");
  });
});
