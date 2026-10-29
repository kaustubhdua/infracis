import { LocationReport, ComparisonReport, PreferenceProfile } from "./types";
import { buildComparisonVerdict } from "./comparison-verdict";

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
        ? `Location A has a ${compA - compB}-point higher evidence-completeness score than Location B; this reflects data availability, not locality quality.`
        : `Location B has a ${compB - compA}-point higher evidence-completeness score than Location A; this reflects data availability, not locality quality.`,
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
          ? "Similar straight-line distance to a mapped healthcare facility; facility capability and opening status are not verified."
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
      differenceSummary: "Cannot compare healthcare proximity fairly because verified mapped data is missing or incomplete for at least one location.",
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

  {
    const diff = aqiA !== null && aqiB !== null ? Math.abs(aqiA - aqiB) : null;
    const comparable = diff !== null;
    deltas.push({
      metric: "European Air Quality Index",
      category: "Environment",
      valueA: aqiA !== null ? `${aqiA} (${reportA.airQuality?.aqiLabel})` : "Unavailable from provider",
      valueB: aqiB !== null ? `${aqiB} (${reportB.airQuality?.aqiLabel})` : "Unavailable from provider",
      unit: "AQI",
      differenceSummary: !comparable
        ? "Cannot compare regional modelled air quality because a value is unavailable for at least one location."
        : diff! < 5
          ? "Negligible difference between the available regional modelled air-quality values."
          : aqiA! < aqiB!
            ? `Location A has a lower regional modelled AQI by ${diff} index points.`
            : `Location B has a lower regional modelled AQI by ${diff} index points.`,
      favoredSide: !comparable ? "incomparable" : diff! < 5 ? "neutral" : aqiA! < aqiB! ? "A" : "B",
      ...(!comparable ? { incomparableReason: "Air-quality provider output is missing for at least one location; missing values are not treated as zero." } : {})
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

  // Profile-weighted result. Only comparable metrics contribute; missing metrics
  // are excluded and remaining weights are renormalized. This is a comparison aid,
  // not a locality-quality score or recommendation.
  const profileWeights: Record<Exclude<PreferenceProfile, "quiet">, Record<string, number>> = {
    balanced: {
      "Distance to Nearest Public Transit": 0.20,
      "Distance to Nearest Healthcare": 0.20,
      "Distance to Nearest School": 0.20,
      "Mapped Daily Essentials Count (~1.2km)": 0.20,
      "European Air Quality Index": 0.20
    },
    family: {
      "Distance to Nearest Public Transit": 0.15,
      "Distance to Nearest Healthcare": 0.30,
      "Distance to Nearest School": 0.30,
      "Mapped Daily Essentials Count (~1.2km)": 0.25
    },
    transit: {
      "Distance to Nearest Public Transit": 0.60,
      "Mapped Daily Essentials Count (~1.2km)": 0.20,
      "Distance to Nearest Healthcare": 0.10,
      "Distance to Nearest School": 0.10
    },
    healthcare: {
      "Distance to Nearest Healthcare": 0.60,
      "Distance to Nearest Public Transit": 0.15,
      "Mapped Daily Essentials Count (~1.2km)": 0.15,
      "Distance to Nearest School": 0.10
    }
  };
  let summary = "";
  if (preference === "quiet") {
    summary = "No defensible quietness winner can be calculated: current providers do not measure ambient noise. Regional air quality is not a substitute for noise measurements. Visit both locations at different times and independently check traffic, construction, and nearby commercial activity.";
  } else {
    const relevantWeights = profileWeights[preference];
    const relevant = deltas.filter((delta) => Object.hasOwn(relevantWeights, delta.metric));
    const comparable = relevant.filter((delta) =>
      delta.favoredSide === "A" || delta.favoredSide === "B" || delta.favoredSide === "neutral"
    );
    const unavailable = relevant.length - comparable.length;
    const aWeight = comparable.reduce((total, delta) => {
      const weight = relevantWeights[delta.metric] ?? 0;
      return total + (delta.favoredSide === "A" ? weight : delta.favoredSide === "neutral" ? weight / 2 : 0);
    }, 0);
    const bWeight = comparable.reduce((total, delta) => {
      const weight = relevantWeights[delta.metric] ?? 0;
      return total + (delta.favoredSide === "B" ? weight : delta.favoredSide === "neutral" ? weight / 2 : 0);
    }, 0);
    const availableWeight = aWeight + bWeight;
    const aShare = availableWeight > 0 ? Math.round((aWeight / availableWeight) * 100) : null;
    const bShare = availableWeight > 0 ? 100 - aShare! : null;
    const aWins = comparable.filter((delta) => delta.favoredSide === "A").length;
    const bWins = comparable.filter((delta) => delta.favoredSide === "B").length;
    const ties = comparable.filter((delta) => delta.favoredSide === "neutral").length;
    const label: Record<Exclude<PreferenceProfile, "quiet">, string> = {
      balanced: "Balanced",
      transit: "Transit-first",
      healthcare: "Healthcare-first",
      family: "Family priorities"
    };
    const profileLabel = label[preference];
    if (comparable.length === 0 || aShare === null || bShare === null) {
      summary = `${profileLabel} result: insufficient comparable evidence. No winner is assigned because the selected profile's relevant metrics are missing or unavailable.`;
    } else if (aShare === bShare) {
      summary = `${profileLabel} result: no clear winner. The profile-weighted evidence split is tied at A ${aShare}% / B ${bShare}% across ${comparable.length} comparable metric(s). Metric record: A leads ${aWins}, B leads ${bWins}, ties ${ties}; ${unavailable} relevant metric(s) could not be compared.`;
    } else {
      const winner = aShare > bShare ? "A" : "B";
      summary = `${profileLabel} result: Location ${winner} is better supported by the comparable evidence under this profile (weighted evidence split A ${aShare}% / B ${bShare}%). Across ${comparable.length} comparable metric(s), A leads ${aWins}, B leads ${bWins}, and ${ties} are tied; ${unavailable} relevant metric(s) could not be compared. The split is a transparent weighted comparison of available indicators, not a property-quality or purchase recommendation.`;
    }
  }

  const nextSteps = [
    "Check actual walking routes and travel times for your usual commute; map distances here are straight-line proximity, not route times.",
    "Visit both areas at different times of day and on a weekday/weekend to assess noise, traffic, lighting, and activity yourself.",
    "Ask nearby residents about recurring waterlogging, water supply, maintenance, and construction; verify material claims with the relevant authority."
  ];

  return {
    generatedAt,
    preferenceProfile: preference,
    locationA: reportA,
    locationB: reportB,
    deltas,
    preferenceSummary: summary,
    nextSteps,
    verdict: buildComparisonVerdict(reportA, reportB, preference)
  };
}
