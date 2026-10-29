import { LocationReport, ComparisonReport, PreferenceProfile } from "./types";
import { buildComparisonVerdict, shortLabel } from "./comparison-verdict";

function missingAmenityLabel(report: LocationReport, category: string): string {
  if (!report.amenities) return "Amenity provider unavailable";
  if (report.amenities.resultLimitReached) return `Sample capped; nearest ${category} unknown`;
  return `No mapped ${category} result`;
}

export function compareLocations(
  reportA: LocationReport,
  reportB: LocationReport,
  preference: PreferenceProfile = "balanced"
): ComparisonReport {
  const generatedAt = new Date().toISOString();
  const deltas: ComparisonReport["deltas"] = [];

  // 1. Data Completeness
  const compA = reportA.scores.completenessScore;
  const compB = reportB.scores.completenessScore;
  deltas.push({
    metric: "Data Completeness Index",
    category: "Audit & Provenance",
    valueA: `${compA}%`,
    valueB: `${compB}%`,
    differenceSummary:
      compA === compB
        ? "Both locations have equivalent source data coverage."
        : compA > compB
        ? `Location A has ${compA - compB}% more verified data sources available than Location B.`
        : `Location B has ${compB - compA}% more verified data sources available than Location A.`,
    favoredSide: compA === compB ? "neutral" : compA > compB ? "A" : "B"
  });

  // 2. Public Transit Proximity
  const transitA = reportA.amenities?.nearest.transit?.distanceMeters ?? null;
  const transitB = reportB.amenities?.nearest.transit?.distanceMeters ?? null;

  if (transitA !== null && transitB !== null) {
    const diff = Math.abs(transitA - transitB);
    deltas.push({
      metric: "Distance to Nearest Public Transit",
      category: "Mobility",
      valueA: `${transitA}m (${reportA.amenities?.nearest.transit?.name})`,
      valueB: `${transitB}m (${reportB.amenities?.nearest.transit?.name})`,
      unit: "meters",
      differenceSummary:
        diff < 50
          ? "Practically identical walking distance to transit."
          : transitA < transitB
          ? `Location A is ${diff}m closer to public transit than Location B.`
          : `Location B is ${diff}m closer to public transit than Location A.`,
      favoredSide: diff < 50 ? "neutral" : transitA < transitB ? "A" : "B"
    });
  } else {
    deltas.push({
      metric: "Distance to Nearest Public Transit",
      category: "Mobility",
      valueA: transitA !== null ? `${transitA}m` : missingAmenityLabel(reportA, "transit"),
      valueB: transitB !== null ? `${transitB}m` : missingAmenityLabel(reportB, "transit"),
      differenceSummary: "Cannot compare fairly: one or both locations lack verified mapped transit data.",
      favoredSide: "incomparable",
      incomparableReason: reportA.amenities?.resultLimitReached || reportB.amenities?.resultLimitReached
        ? "At least one amenity response reached its output cap; nearest transit cannot be verified from the partial sample."
        : reportA.amenities && reportB.amenities
          ? "Transit mapping is missing for at least one location within the search radius."
          : "Amenity provider data is unavailable for at least one location; absence cannot be inferred."
    });
  }

  // 3. Healthcare Access
  const healthA = reportA.amenities?.nearest.healthcare?.distanceMeters ?? null;
  const healthB = reportB.amenities?.nearest.healthcare?.distanceMeters ?? null;

  if (healthA !== null && healthB !== null) {
    const diff = Math.abs(healthA - healthB);
    deltas.push({
      metric: "Distance to Nearest Healthcare",
      category: "Healthcare",
      valueA: `${healthA}m (${reportA.amenities?.nearest.healthcare?.name})`,
      valueB: `${healthB}m (${reportB.amenities?.nearest.healthcare?.name})`,
      unit: "meters",
      differenceSummary:
        diff < 80
          ? "Comparable emergency healthcare access."
          : healthA < healthB
          ? `Location A has a medical facility ${diff}m closer than Location B.`
          : `Location B has a medical facility ${diff}m closer than Location A.`,
      favoredSide: diff < 80 ? "neutral" : healthA < healthB ? "A" : "B"
    });
  } else {
    deltas.push({
      metric: "Distance to Nearest Healthcare",
      category: "Healthcare",
      valueA: healthA !== null ? `${healthA}m` : missingAmenityLabel(reportA, "healthcare facility"),
      valueB: healthB !== null ? `${healthB}m` : missingAmenityLabel(reportB, "healthcare facility"),
      differenceSummary: "One of the locations has no mapped hospitals/clinics within 1.2 km.",
      favoredSide: "incomparable",
      incomparableReason: reportA.amenities?.resultLimitReached || reportB.amenities?.resultLimitReached
        ? "At least one amenity response reached its output cap; nearest healthcare cannot be verified from the partial sample."
        : reportA.amenities && reportB.amenities
          ? "No mapped healthcare result was available for at least one location."
          : "Amenity provider data is unavailable for at least one location; absence cannot be inferred."
    });
  }

  // 4. Education Access
  const eduA = reportA.amenities?.nearest.education?.distanceMeters ?? null;
  const eduB = reportB.amenities?.nearest.education?.distanceMeters ?? null;

  if (eduA !== null && eduB !== null) {
    const diff = Math.abs(eduA - eduB);
    deltas.push({
      metric: "Distance to Nearest School",
      category: "Education",
      valueA: `${eduA}m (${reportA.amenities?.nearest.education?.name})`,
      valueB: `${eduB}m (${reportB.amenities?.nearest.education?.name})`,
      unit: "meters",
      differenceSummary:
        diff < 100
          ? "Equivalent proximity to educational facilities."
          : eduA < eduB
          ? `Location A is ${diff}m closer to school than Location B.`
          : `Location B is ${diff}m closer to school than Location A.`,
      favoredSide: diff < 100 ? "neutral" : eduA < eduB ? "A" : "B"
    });
  } else {
    deltas.push({
      metric: "Distance to Nearest School",
      category: "Education",
      valueA: eduA !== null ? `${eduA}m` : missingAmenityLabel(reportA, "school"),
      valueB: eduB !== null ? `${eduB}m` : missingAmenityLabel(reportB, "school"),
      differenceSummary: "Cannot compare school proximity fairly due to unmapped entries.",
      favoredSide: "incomparable"
    });
  }

  // 5. Daily Essentials & Retail Count
  const essA = reportA.amenities && !reportA.amenities.resultLimitReached ? reportA.amenities.byGroup.essentials : null;
  const essB = reportB.amenities && !reportB.amenities.resultLimitReached ? reportB.amenities.byGroup.essentials : null;
  if (essA !== null && essB !== null) {
    deltas.push({
      metric: "Mapped Daily Essentials Count (~1.2km)",
      category: "Convenience",
      valueA: `${essA} retail points`,
      valueB: `${essB} retail points`,
      differenceSummary:
        essA === essB
          ? "Both locations have the same count of mapped daily retail points."
          : essA > essB
          ? `Location A has ${essA - essB} more mapped grocery/supermarkets nearby.`
          : `Location B has ${essB - essA} more mapped grocery/supermarkets nearby.`,
      favoredSide: essA === essB ? "neutral" : essA > essB ? "A" : "B"
    });
  } else {
    deltas.push({
      metric: "Mapped Daily Essentials Count (~1.2km)",
      category: "Convenience",
      valueA: essA !== null ? `${essA} retail points` : reportA.amenities?.resultLimitReached ? "Capped sample" : "Unavailable",
      valueB: essB !== null ? `${essB} retail points` : reportB.amenities?.resultLimitReached ? "Capped sample" : "Unavailable",
      differenceSummary: "Cannot compare mapped daily essentials because amenity data is unavailable for at least one location.",
      favoredSide: "incomparable",
      incomparableReason: "Missing provider data or a capped sample must not be interpreted as zero mapped retail points."
    });
  }

  // 6. Air Quality Index (AQI)
  const aqiA = reportA.airQuality?.europeanAqi ?? null;
  const aqiB = reportB.airQuality?.europeanAqi ?? null;

  if (aqiA !== null && aqiB !== null) {
    const diff = Math.abs(aqiA - aqiB);
    deltas.push({
      metric: "European Air Quality Index",
      category: "Environment",
      valueA: `${aqiA} (${reportA.airQuality?.aqiLabel})`,
      valueB: `${aqiB} (${reportB.airQuality?.aqiLabel})`,
      unit: "AQI",
      differenceSummary:
        diff < 5
          ? "Negligible air quality difference."
          : aqiA < aqiB
          ? `Location A has cleaner regional air quality (${diff} index points lower).`
          : `Location B has cleaner regional air quality (${diff} index points lower).`,
      favoredSide: diff < 5 ? "neutral" : aqiA < aqiB ? "A" : "B" // lower is better
    });
  }

  // 7. Ground Elevation
  const elevA = reportA.weather?.elevationMeters ?? null;
  const elevB = reportB.weather?.elevationMeters ?? null;

  if (elevA !== null && elevB !== null) {
    const diff = Math.abs(elevA - elevB);
    deltas.push({
      metric: "Ground Elevation Above Sea Level",
      category: "Topography",
      valueA: `${elevA}m`,
      valueB: `${elevB}m`,
      unit: "meters",
      differenceSummary:
        diff < 3
          ? "Similar elevation profile."
          : `Elevation difference of ${diff}m between the two locations.`,
      favoredSide: "neutral"
    });
  }

  // Evidence-weighted result for the selected priority profile.
  const verdict = buildComparisonVerdict(reportA, reportB, preference);
  const summary = verdict.leader === "inconclusive"
    ? verdict.summary
    : `${verdict.headline}. ${verdict.summary}`;

  const nameA = shortLabel(reportA.location.label);
  const nameB = shortLabel(reportB.location.label);
  const nextSteps: string[] = [];
  for (const dimension of verdict.dimensions) {
    if (!dimension.comparable || dimension.scoreA === null || dimension.scoreB === null) continue;
    const gap = dimension.scoreA - dimension.scoreB;
    if (Math.abs(gap) >= 20) {
      const weaker = gap > 0 ? nameB : nameA;
      nextSteps.push(`${dimension.label} is clearly weaker at ${weaker}: check it on foot and ask residents before relying on the mapped data.`);
    }
  }
  for (const dimension of verdict.dimensions) {
    if (!dimension.comparable) {
      nextSteps.push(`${dimension.label} could not be compared fairly — gather it yourself for both locations.`);
    }
  }
  nextSteps.push(
    "Perform a physical commute test from both locations at peak rush hour (8:30 AM).",
    "Check municipal water supply schedules and underground sump storage capacity for both properties.",
    "Speak with immediate neighbors at both locations specifically regarding monsoon storm drain overflow."
  );

  return {
    generatedAt,
    preferenceProfile: preference,
    locationA: reportA,
    locationB: reportB,
    deltas,
    preferenceSummary: summary,
    nextSteps: nextSteps.slice(0, 8),
    verdict
  };
}
