import { writeFile } from "node:fs/promises";
import { rankGeocodeCandidates, selectRelevantGeocodeCandidate } from "../lib/providers/geocode-relevance.ts";

const queries = [
  "Saket, New Delhi, India",
  "Hauz Khas, New Delhi, India",
  "Karol Bagh, New Delhi, India",
  "Sohna Road, Gurugram, Haryana, India",
  "Sector 150, Noida, Uttar Pradesh, India"
];
const results = [];
let lastRequestAt = 0;

for (const query of queries) {
  const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  let status = null;
  let candidates = [];
  let error = null;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "InfracisGeocodeDiagnostic/1.0 (https://github.com/kaustubhdua/infracis)",
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(12_000)
    });
    lastRequestAt = Date.now();
    status = response.status;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("Invalid Nominatim response shape");
    candidates = payload;
  } catch (err) {
    lastRequestAt = Date.now();
    error = err instanceof Error ? err.message : "Unknown request error";
  }
  const ranked = rankGeocodeCandidates(query, candidates).slice(0, 5).map(({ candidate, score, matchedTokens, missingTokens }) => ({
    label: candidate.display_name,
    category: candidate.category ?? candidate.class ?? null,
    type: candidate.type ?? null,
    addressType: candidate.addresstype ?? null,
    importance: typeof candidate.importance === "number" ? candidate.importance : null,
    score,
    matchedTokens,
    missingTokens
  }));
  const selected = selectRelevantGeocodeCandidate(query, candidates);
  results.push({
    query,
    status,
    elapsedMs: Date.now() - started,
    error,
    candidateCount: candidates.length,
    selectedLabel: selected?.display_name ?? null,
    rankedCandidates: ranked
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  method: "Five bounded Nominatim queries, spaced at least 1.1 seconds apart. Output contains labels and relevance diagnostics only, not coordinates.",
  results
};
await writeFile("geocode-diagnostic.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
