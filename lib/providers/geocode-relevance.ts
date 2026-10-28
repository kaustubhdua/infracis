export interface GeocodeCandidate {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  boundingbox?: [string, string, string, string];
}

export interface RankedGeocodeCandidate {
  candidate: GeocodeCandidate;
  score: number;
  matchedTokens: string[];
  missingTokens: string[];
}

const GENERIC_TOKENS = new Set(["india", "district", "state", "province", "division", "region"]);

function normalize(value: string): string {
  return value.normalize("NFKD").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function meaningfulTokens(value: string): string[] {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length > 1 && !GENERIC_TOKENS.has(token)))];
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
      const labelTokens = new Set(meaningfulTokens(candidate.display_name));
      const matchedTokens = queryTokens.filter((token) => labelTokens.has(token) || label.includes(token));
      const missingTokens = queryTokens.filter((token) => !matchedTokens.includes(token));
      const score = matchedTokens.length / queryTokens.length;
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
    return null;
  }
  return best.candidate;
}
