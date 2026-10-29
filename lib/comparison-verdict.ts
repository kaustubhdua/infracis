import type {
  ComparisonVerdict,
  LocationReport,
  PreferenceProfile,
  VerdictDimension,
  VerdictDimensionKey
} from "./types";

/**
 * Deterministic "who leads?" engine for two location reports.
 *
 * - Only dimensions with evidence on BOTH sides are compared, so a missing
 *   provider response is never treated as a zero.
 * - Weights come from the user's priority profile and are renormalised over the
 *   comparable dimensions.
 * - The result is an access/environment indicator, not a property rating.
 */

const DIMENSION_LABELS: Record<VerdictDimensionKey, string> = {
  transit: "Transit access",
  daily: "Daily essentials",
  healthcare: "Healthcare access",
  education: "Education access",
  air: "Air quality"
};

const VERDICT_WEIGHTS: Record<Exclude<PreferenceProfile, "quiet">, Record<VerdictDimensionKey, number>> = {
  balanced: { transit: 0.2, daily: 0.2, healthcare: 0.2, education: 0.2, air: 0.2 },
  family: { transit: 0.1, daily: 0.2, healthcare: 0.25, education: 0.3, air: 0.15 },
  transit: { transit: 0.5, daily: 0.2, healthcare: 0.1, education: 0.05, air: 0.15 },
  healthcare: { transit: 0.1, daily: 0.15, healthcare: 0.5, education: 0.05, air: 0.2 }
};

const PROFILE_NAMES: Record<PreferenceProfile, string> = {
  balanced: "balanced",
  family: "family",
  transit: "transit-first",
  healthcare: "healthcare-first",
  quiet: "balanced"
};

/** Differences smaller than this are reported as ties. */
export const TIE_THRESHOLD = 5;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** European AQI: lower is better. 0 -> 100 points, >= 100 -> 0 points. */
export function airQualityScore(europeanAqi: number | null | undefined): number | null {
  if (typeof europeanAqi !== "number" || !Number.isFinite(europeanAqi) || europeanAqi < 0) return null;
  return clampScore(100 - europeanAqi);
}

function validScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function shortLabel(label: string): string {
  const first = label.split(",")[0]?.trim();
  return first && first.length > 0 ? first.slice(0, 40) : label.slice(0, 40);
}

function sideScores(report: LocationReport): Record<VerdictDimensionKey, number | null> {
  return {
    transit: validScore(report.scores.transitAccessibilityScore),
    daily: validScore(report.scores.dailyConvenienceScore),
    healthcare: validScore(report.scores.healthcareAccessScore),
    education: validScore(report.scores.educationAccessScore),
    air: airQualityScore(report.airQuality?.europeanAqi)
  };
}

function missingReason(report: LocationReport, key: VerdictDimensionKey): string {
  if (key === "air") return report.airQuality ? "air-quality value missing" : "air-quality provider unavailable";
  if (!report.amenities) return "amenity provider unavailable";
  if (report.amenities.resultLimitReached) return "amenity sample was capped";
  return "no mapped result within the search radius";
}

export function buildComparisonVerdict(
  reportA: LocationReport,
  reportB: LocationReport,
  profile: PreferenceProfile = "balanced"
): ComparisonVerdict {
  const profileUsed: Exclude<PreferenceProfile, "quiet"> = profile === "quiet" ? "balanced" : profile;
  const baseWeights = VERDICT_WEIGHTS[profileUsed];
  const a = sideScores(reportA);
  const b = sideScores(reportB);
  const nameA = shortLabel(reportA.location.label);
  const nameB = shortLabel(reportB.location.label);

  const keys = Object.keys(DIMENSION_LABELS) as VerdictDimensionKey[];
  const comparableKeys = keys.filter((key) => a[key] !== null && b[key] !== null);
  const totalWeight = comparableKeys.reduce((sum, key) => sum + baseWeights[key], 0);

  const dimensions: VerdictDimension[] = keys.map((key) => {
    const scoreA = a[key];
    const scoreB = b[key];
    const comparable = scoreA !== null && scoreB !== null;
    let leader: VerdictDimension["leader"] = null;
    let note = "";
    if (comparable) {
      const diff = (scoreA as number) - (scoreB as number);
      leader = Math.abs(diff) < TIE_THRESHOLD ? "tie" : diff > 0 ? "A" : "B";
      note = leader === "tie"
        ? "Practically equal"
        : `${leader === "A" ? nameA : nameB} is ${Math.abs(Math.round(diff))} points ahead`;
    } else {
      const reasons: string[] = [];
      if (scoreA === null) reasons.push(`${nameA}: ${missingReason(reportA, key)}`);
      if (scoreB === null) reasons.push(`${nameB}: ${missingReason(reportB, key)}`);
      note = `Excluded — ${reasons.join("; ")}`;
    }
    return {
      key,
      label: DIMENSION_LABELS[key],
      scoreA,
      scoreB,
      weight: comparable && totalWeight > 0 ? baseWeights[key] / totalWeight : 0,
      comparable,
      leader,
      note
    };
  });

  const caveats: string[] = [];
  const profileNote = profile === "quiet"
    ? "Quietness cannot be scored (no verified noise data), so a balanced weighting was used instead."
    : undefined;
  if (profileNote) caveats.push(profileNote);

  const excluded = dimensions.filter((dimension) => !dimension.comparable);
  if (excluded.length > 0) {
    caveats.push(`Not compared because evidence is missing on at least one side: ${excluded.map((d) => d.label.toLowerCase()).join(", ")}.`);
  }
  if (reportA.amenities?.resultLimitReached || reportB.amenities?.resultLimitReached) {
    caveats.push("At least one amenity response hit its output cap, so nearby-service scores may be incomplete.");
  }
  const minCompleteness = Math.min(reportA.scores.completenessScore, reportB.scores.completenessScore);
  if (minCompleteness < 50) {
    caveats.push(`Source coverage is thin for one location (${minCompleteness}%), which lowers confidence.`);
  }
  caveats.push("Scores use straight-line distances to mapped features and regional air-quality model output. They are not a rating of property quality, safety, legality or price.");

  const conclusive = comparableKeys.length >= 2 && totalWeight >= 0.35;
  let scoreA: number | null = null;
  let scoreB: number | null = null;
  if (conclusive) {
    scoreA = clampScore(comparableKeys.reduce((sum, key) => sum + (a[key] as number) * baseWeights[key], 0) / totalWeight);
    scoreB = clampScore(comparableKeys.reduce((sum, key) => sum + (b[key] as number) * baseWeights[key], 0) / totalWeight);
  }

  const margin = scoreA !== null && scoreB !== null ? Math.abs(scoreA - scoreB) : 0;
  let leader: ComparisonVerdict["leader"] = "inconclusive";
  if (scoreA !== null && scoreB !== null) {
    leader = margin < TIE_THRESHOLD ? "tie" : scoreA > scoreB ? "A" : "B";
  }

  let confidence: ComparisonVerdict["confidence"] = "low";
  if (conclusive) {
    if (comparableKeys.length >= 4 && minCompleteness >= 50 && (margin >= 12 || leader === "tie")) confidence = "high";
    else if (comparableKeys.length >= 3 && minCompleteness >= 40) confidence = "medium";
  }

  const strengthsFor = (side: "A" | "B"): string[] =>
    dimensions
      .filter((dimension) => dimension.comparable && dimension.leader === side)
      .map((dimension) => {
        const own = (side === "A" ? dimension.scoreA : dimension.scoreB) as number;
        const other = (side === "A" ? dimension.scoreB : dimension.scoreA) as number;
        return { dimension, gap: own - other, own, other };
      })
      .sort((x, y) => y.gap * y.dimension.weight - x.gap * x.dimension.weight)
      .map(({ dimension, own, other }) => `${dimension.label}: ${Math.round(own)} vs ${Math.round(other)}`);

  const strengthsA = strengthsFor("A");
  const strengthsB = strengthsFor("B");

  const profileName = PROFILE_NAMES[profile];
  let headline: string;
  let summary: string;
  if (leader === "A" || leader === "B") {
    const winner = leader === "A" ? nameA : nameB;
    const loser = leader === "A" ? nameB : nameA;
    const high = leader === "A" ? scoreA : scoreB;
    const low = leader === "A" ? scoreB : scoreA;
    headline = `${winner} leads for ${profileName} priorities`;
    const topStrengths = (leader === "A" ? strengthsA : strengthsB).slice(0, 2).join("; ");
    summary = `${winner} scores ${high}/100 against ${loser}'s ${low}/100 (${margin} points) across ${comparableKeys.length} comparable measures.` +
      (topStrengths ? ` Its biggest advantages: ${topStrengths}.` : "") +
      (confidence === "low" ? " Treat this as a weak signal — several measures could not be compared." : "");
  } else if (leader === "tie") {
    headline = "Too close to call on the evidence";
    summary = `${nameA} (${scoreA}/100) and ${nameB} (${scoreB}/100) differ by only ${margin} points for ${profileName} priorities. Decide on the on-ground checks below rather than on these scores.`;
  } else {
    headline = "Not enough comparable evidence for a result";
    summary = "Fewer than two measures have evidence for both locations, so no fair winner can be named. Re-run when the amenity and air-quality providers respond, or compare on-ground.";
  }

  return {
    profile,
    profileUsed,
    profileNote,
    leader,
    scoreA,
    scoreB,
    margin,
    confidence,
    headline,
    summary,
    dimensions,
    strengthsA,
    strengthsB,
    caveats
  };
}
