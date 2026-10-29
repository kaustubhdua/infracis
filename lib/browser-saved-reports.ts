import type { LocationReport } from "@/lib/types";
import { parseStoredReports, upsertStoredReport } from "@/lib/local-report-storage";

/** Full reports live in localStorage; cookies are reserved for small preferences. */
export function readStoredReports(): LocationReport[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("infracis_saved_reports");
  if (!raw) return [];
  return parseStoredReports(JSON.parse(raw));
}

export function saveReportToStorage(report: LocationReport): boolean {
  try {
    const reports = upsertStoredReport(readStoredReports(), report);
    window.localStorage.setItem("infracis_saved_reports", JSON.stringify(reports));
    return true;
  } catch {
    return false;
  }
}

export function exportReportJson(report: LocationReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement("a");
  const safeLabel = report.location.label.slice(0, 25).replace(/[^a-zA-Z0-9_-]+/g, "_");
  downloadAnchor.href = objectUrl;
  downloadAnchor.download = `infracis-due-diligence-${safeLabel || "location"}.json`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(objectUrl);
}
