import type { LocationReport } from "./types";

function isStoredReport(value: unknown): value is LocationReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const report = value as Partial<LocationReport>;
  return typeof report.id === "string" &&
    typeof report.generatedAt === "string" &&
    !!report.location && typeof report.location === "object" &&
    typeof report.location.label === "string" &&
    !!report.scores && typeof report.scores === "object" &&
    typeof report.scores.completenessScore === "number";
}

/** Parse and bound browser-local report data before it reaches UI rendering. */
export function parseStoredReports(value: unknown): LocationReport[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredReport).slice(0, 20);
}
