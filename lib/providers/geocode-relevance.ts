export interface GeocodeCandidate {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  /** Nominatim jsonv2 uses `category`; `class` is retained for older payloads/tests. */
  category?: string;
  class?: string;
  addresstype?: string;
  importance?: number;
  address?: Record<string, string | undefined>;
  boundingbox?: [string, string, string, string];
}

export interface RankedGeocodeCandidate {
  candidate: GeocodeCandidate;
  score: number;
  matchedTokens: string[];
  missingTokens: string[];
}

const GENERIC_TOKENS = new Set(["india", "district", "state", "province", "division", "region"]);
const LOCALITY_ADDRESS_TYPES = new Set([
  "city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter",
  "borough", "municipality", "county", "state", "province", "district",
  "administrative", "postcode", "residential", "locality", "region", "island",
  "city_district", "municipal_district"
]);
const POINT_OF_INTEREST_CLASSES = new Set([
  "amenity", "shop", "tourism", "office", "craft", "healthcare", "emergency",
  "historic", "leisure", "man_made", "building", "railway", "aeroway"
]);
const EXPLICIT_POI_TERMS = new Set([
  "school", "hospital", "clinic", "pharmacy", "restaurant", "cafe", "coffee",
  "mall", "station", "metro", "airport", "university", "college", "temple",
  "mosque", "church", "bank", "atm", "hotel", "office", "shop", "store",
  "museum", "cinema", "theater", "theatre", "stadium", "library", "gym",
  "petrol", "fuel", "company", "expo", "mart", "bazaar", "bazar"
]);

function normalize(value: string): string {
  return value.normalize("NFKD").toLocaleLowerCase("en")
    .replace(/\bbangalore\b/g, "bengaluru")
    // Nominatim may label localities in South/West/East Delhi rather than "New Delhi".
    // Treat the city alias as shared context while still requiring the locality tokens.
    .replace(/\bnew\s+delhi\b/g, "delhi")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function meaningfulTokens(value: string): string[] {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length > 1 && !GENERIC_TOKENS.has(token)))];
}

export function queryHasExplicitPoiIntent(query: string): boolean {
  return meaningfulTokens(query).some((token) => EXPLICIT_POI_TERMS.has(token));
}

function candidateTokens(candidate: GeocodeCandidate): Set<string> {
  const addressValues = candidate.address ? Object.values(candidate.address).filter(
    (value): value is string => typeof value === "string"
  ) : [];
  return new Set(meaningfulTokens([candidate.display_name, ...addressValues].join(" ")));
}

/**
 * Rank returned geocoder candidates by explicit query-token coverage.
 * This is a conservative relevance guard, not a semantic geocoder or proof
 * that the selected geometry represents the entire requested neighbourhood.
 */
export function rankGeocodeCandidates(query: string, candidates: GeocodeCandidate[]): RankedGeocodeCandidate[] {
  const queryTokens = meaningfulTokens(query);
  if (queryTokens.length === 0) return [];

  return candidates
    .filter((candidate) => candidate && typeof candidate.display_name === "string" && candidate.display_name.trim())
    .map((candidate) => {
      const label = normalize(candidate.display_name);
      const labelTokens = candidateTokens(candidate);
      const matchedTokens = queryTokens.filter((token) => labelTokens.has(token) || label.includes(token));
      const missingTokens = queryTokens.filter((token) => !matchedTokens.includes(token));
      // Numbers in locality queries often identify a specific sector, phase,
      // building, or postcode. Never accept a candidate that drops/changes one.
      const missingNumericTokens = queryTokens.filter((token) => /\d/.test(token) && !labelTokens.has(token));
      const explicitPoiIntent = queryHasExplicitPoiIntent(query);
      const queryPrefix = queryTokens.slice(0, Math.min(2, queryTokens.length)).join(" ");
      const beginsWithQuery = label.startsWith(queryPrefix);
      const candidateClass = candidate.category ?? candidate.class;
      const isUnqualifiedPointOfInterest = !!candidateClass &&
        POINT_OF_INTEREST_CLASSES.has(candidateClass) &&
        !LOCALITY_ADDRESS_TYPES.has(candidate.addresstype ?? "") &&
        !explicitPoiIntent &&
        !beginsWithQuery;
      // A POI whose name merely mentions the searched neighbourhood is not
      // an acceptable substitute for the neighbourhood itself.
      const score = missingNumericTokens.length > 0 || isUnqualifiedPointOfInterest
        ? 0
        : matchedTokens.length / queryTokens.length;
      return { candidate, score, matchedTokens, missingTokens };
    })
    .sort((a, b) => b.score - a.score);
}

export function selectRelevantGeocodeCandidate(query: string, candidates: GeocodeCandidate[]): GeocodeCandidate | null {
  const ranked = rankGeocodeCandidates(query, candidates);
  const best = ranked[0];
  if (!best || best.score < 0.75) return null;

  // If similarly ranked results resolve to different labels, don't silently
  // guess between them. The caller can ask the user for a more specific query.
  const runnerUp = ranked[1];
  if (runnerUp && runnerUp.score === best.score &&
      normalize(runnerUp.candidate.display_name) !== normalize(best.candidate.display_name)) {
    const bestLocality = LOCALITY_ADDRESS_TYPES.has(best.candidate.addresstype ?? "") ||
      LOCALITY_ADDRESS_TYPES.has(best.candidate.type ?? "");
    const runnerUpLocality = LOCALITY_ADDRESS_TYPES.has(runnerUp.candidate.addresstype ?? "") ||
      LOCALITY_ADDRESS_TYPES.has(runnerUp.candidate.type ?? "");
    const bestImportance = typeof best.candidate.importance === "number" ? best.candidate.importance : 0;
    const runnerUpImportance = typeof runnerUp.candidate.importance === "number" ? runnerUp.candidate.importance : 0;

    // Nominatim commonly returns the same locality as both a boundary and a
    // place. Prefer the structured locality result when it is available.
    if (bestLocality !== runnerUpLocality) {
      return bestLocality ? best.candidate : runnerUp.candidate;
    }
    if (bestImportance !== runnerUpImportance) {
      return bestImportance > runnerUpImportance ? best.candidate : runnerUp.candidate;
    }
    return null;
  }
  return best.candidate;
}
