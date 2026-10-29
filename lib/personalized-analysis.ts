import type { LocationReport, PreferenceProfile } from "./types";

export interface PersonalFitResult {
  score: number | null;
  availableMetrics: number;
  totalMetrics: number;
  weightsUsed: Record<string, number>;
  missingMetrics: string[];
  explanation: string;
}

const PROFILE_WEIGHTS: Record<PreferenceProfile, Record<string, number>> = {
  balanced: {
    transit: 0.25,
    daily: 0.25,
    healthcare: 0.25,
    education: 0.25
  },
  family: {
    transit: 0.15,
    daily: 0.25,
    healthcare: 0.30,
    education: 0.30
  },
  transit: {
    transit: 0.60,
    daily: 0.20,
    healthcare: 0.10,
    education: 0.10
  },
  healthcare: {
    transit: 0.15,
    daily: 0.15,
    healthcare: 0.60,
    education: 0.10
  },
  // There is no validated noise/quietness evidence source in the MVP. A
  // quiet profile intentionally produces no score rather than using a proxy.
  quiet: {}
};

const METRICS: Record<string, { label: string; value: (report: LocationReport) => number | null }> = {
  transit: { label: "Transit access", value: (report) => report.scores.transitAccessibilityScore },
  daily: { label: "Daily essentials", value: (report) => report.scores.dailyConvenienceScore },
  healthcare: { label: "Healthcare access", value: (report) => report.scores.healthcareAccessScore },
  education: { label: "Education access", value: (report) => report.scores.educationAccessScore }
};

export function calculatePersonalFit(
  report: LocationReport,
  profile: PreferenceProfile
): PersonalFitResult {
  const weights = PROFILE_WEIGHTS[profile];
  const keys = Object.keys(weights);
  if (keys.length === 0) {
    return {
      score: null,
      availableMetrics: 0,
      totalMetrics: 0,
      weightsUsed: {},
      missingMetrics: ["Quietness/noise measurements are not currently available from verified sources."],
      explanation: "A quietness preference cannot be scored from the current evidence. No proxy or inferred noise score is used."
    };
  }

  let weightedTotal = 0;
  let availableWeight = 0;
  const weightsUsed: Record<string, number> = {};
  const missingMetrics: string[] = [];
  let availableMetrics = 0;

  for (const key of keys) {
    const metric = METRICS[key];
    const value = metric.value(report);
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      missingMetrics.push(metric.label);
      continue;
    }
    weightedTotal += value * weights[key];
    availableWeight += weights[key];
    weightsUsed[metric.label] = weights[key];
    availableMetrics += 1;
  }

  return {
    score: availableWeight > 0 ? Math.round(weightedTotal / availableWeight) : null,
    availableMetrics,
    totalMetrics: keys.length,
    weightsUsed,
    missingMetrics,
    explanation: availableWeight > 0
      ? "Weighted from the available, documented access metrics only. Missing metrics are excluded and the remaining weights are renormalized."
      : "No metrics required by this profile are available, so a personal fit score cannot be calculated."
  };
}

export const PERSONAL_FIT_PROFILES: Array<{ value: PreferenceProfile; label: string; description: string }> = [
  { value: "balanced", label: "Balanced", description: "Give the four measured access dimensions equal importance." },
  { value: "family", label: "Family needs", description: "Prioritize healthcare, education and daily essentials." },
  { value: "transit", label: "Transit-first", description: "Prioritize mapped transit access, then everyday services." },
  { value: "healthcare", label: "Healthcare-first", description: "Prioritize the available mapped healthcare access metric." },
  { value: "quiet", label: "Quietness", description: "Not scored: verified noise and quietness data are not available yet." }
];
