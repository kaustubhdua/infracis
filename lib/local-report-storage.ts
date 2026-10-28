import type { LocationReport } from "./types";

const classifications = new Set(["observed", "provider_model", "calculated", "model_interpretation", "unknown"]);
const groups = new Set(["transit", "education", "healthcare", "essentials", "civic", "other"]);
const priorities = new Set(["high", "medium", "low"]);
const riskLevels = new Set(["neutral", "favorable", "caution"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isUnitMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(isString);
}

function isLocation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.label) && value.label.trim().length > 0 &&
    typeof value.latitude === "number" && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 &&
    typeof value.longitude === "number" && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 &&
    isString(value.mapUrl);
}

function isWeather(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return ["temperature", "humidity", "precipitation", "windSpeed", "weatherCode", "elevationMeters"].every((key) => isNullableFiniteNumber(value[key])) &&
    isString(value.weatherDescription) &&
    (value.observedTime === null || isString(value.observedTime)) &&
    isUnitMap(value.units);
}

function isAirQuality(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return ["europeanAqi", "pm25", "pm10", "nitrogenDioxide", "ozone"].every((key) => isNullableFiniteNumber(value[key])) &&
    isString(value.aqiLabel) &&
    (value.observedTime === null || isString(value.observedTime)) &&
    isUnitMap(value.units);
}

function isAmenity(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.name) && isString(value.category) &&
    typeof value.group === "string" && groups.has(value.group) &&
    typeof value.distanceMeters === "number" && Number.isFinite(value.distanceMeters) && value.distanceMeters >= 0 &&
    isNullableFiniteNumber(value.lat) && isNullableFiniteNumber(value.lon);
}

function isAmenities(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value) || !isRecord(value.byGroup) || !isRecord(value.nearest) || !Array.isArray(value.items)) return false;
  const byGroup = value.byGroup;
  const nearest = value.nearest;
  const items = value.items;
  if (typeof value.totalCount !== "number" || !Number.isInteger(value.totalCount) || value.totalCount < 0) return false;
  if (typeof value.radiusMeters !== "number" || !Number.isFinite(value.radiusMeters) || value.radiusMeters < 0) return false;
  if (!["transit", "education", "healthcare", "essentials", "civic"].every((key) =>
    typeof byGroup[key] === "number" && Number.isInteger(byGroup[key]) && (byGroup[key] as number) >= 0
  )) return false;
  if (!items.every(isAmenity)) return false;
  return ["transit", "education", "healthcare", "essentials", "civic"].every((key) =>
    nearest[key] === undefined || isAmenity(nearest[key])
  );
}

function isEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.category) && isString(value.title) &&
    (isString(value.value) || typeof value.value === "number" || typeof value.value === "boolean" || value.value === null) &&
    classifications.has(String(value.classification)) && isString(value.provider) &&
    isString(value.sourceUrl) && isString(value.retrievedAt) && isString(value.limitations) &&
    (value.unit === undefined || isString(value.unit)) &&
    (value.observedAt === undefined || isString(value.observedAt)) &&
    (value.geographicResolution === undefined || isString(value.geographicResolution)) &&
    (value.coverage === undefined || isString(value.coverage)) &&
    (value.license === undefined || isString(value.license)) &&
    (value.confidenceNote === undefined || isString(value.confidenceNote));
}

function isScore(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const scoreKeys = ["completenessScore", "transitAccessibilityScore", "dailyConvenienceScore", "healthcareAccessScore", "educationAccessScore"];
  return scoreKeys.every((key) => typeof value[key] === "number" && Number.isFinite(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 100) &&
    isRecord(value.calculationFormulas) && Object.values(value.calculationFormulas).every(isString);
}

function isFinding(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.headline) && isString(value.explanation) &&
    classifications.has(String(value.classification)) && Array.isArray(value.supportingEvidenceIds) &&
    value.supportingEvidenceIds.every(isString) &&
    (value.riskLevel === undefined || (typeof value.riskLevel === "string" && riskLevels.has(value.riskLevel)));
}

function isChecklistItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.category) && isString(value.question) &&
    isString(value.rationale) && isString(value.verificationSource) &&
    typeof value.priority === "string" && priorities.has(value.priority);
}

function isSource(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.name) && isString(value.url) && isString(value.retrievedAt) &&
    (value.status === "available" || value.status === "unavailable") &&
    isString(value.license) && isString(value.note);
}

function isStoredReport(value: unknown): value is LocationReport {
  if (!isRecord(value)) return false;
  return isString(value.id) && value.id.length > 0 &&
    isString(value.generatedAt) && Number.isFinite(Date.parse(value.generatedAt)) &&
    isLocation(value.location) && isWeather(value.weather) && isAirQuality(value.airQuality) &&
    isAmenities(value.amenities) && Array.isArray(value.evidence) && value.evidence.every(isEvidence) &&
    isScore(value.scores) && Array.isArray(value.findings) && value.findings.every(isFinding) &&
    Array.isArray(value.unknowns) && value.unknowns.every(isString) &&
    Array.isArray(value.checklist) && value.checklist.every(isChecklistItem) &&
    Array.isArray(value.sources) && value.sources.every(isSource) &&
    Array.isArray(value.limitations) && value.limitations.every(isString);
}

/** Parse and bound browser-local report data before it reaches UI rendering. */
export function parseStoredReports(value: unknown): LocationReport[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredReport).slice(0, 20);
}

/** Save the latest report for a location, avoiding stale duplicate entries. */
export function upsertStoredReport(value: unknown, report: LocationReport): LocationReport[] {
  const normalizedLabel = report.location.label.trim().toLocaleLowerCase();
  const remaining = parseStoredReports(value).filter((existing) =>
    existing.id !== report.id &&
    existing.location.label.trim().toLocaleLowerCase() !== normalizedLabel
  );
  return [report, ...remaining].slice(0, 20);
}
