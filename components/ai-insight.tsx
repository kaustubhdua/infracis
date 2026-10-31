"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ComparisonReport, LocationReport } from "@/lib/types";
import { BrainCircuit, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";

type InsightKind = "location" | "comparison";
type InsightData = LocationReport | ComparisonReport;

const CACHE_PREFIX = "infracis_ai_insight:";
const CACHE_TTL_MS = 30 * 60 * 1000;

function compactLocation(report: LocationReport) {
  return {
    location: report.location,
    scores: report.scores,
    weather: report.weather ? {
      temperature: report.weather.temperature,
      precipitation: report.weather.precipitation,
      observedTime: report.weather.observedTime,
      weatherDescription: report.weather.weatherDescription
    } : null,
    airQuality: report.airQuality ? {
      europeanAqi: report.airQuality.europeanAqi,
      aqiLabel: report.airQuality.aqiLabel,
      pm25: report.airQuality.pm25,
      observedTime: report.airQuality.observedTime
    } : null,
    amenities: report.amenities ? {
      totalCount: report.amenities.totalCount,
      radiusMeters: report.amenities.radiusMeters,
      resultLimitReached: report.amenities.resultLimitReached,
      byGroup: report.amenities.byGroup,
      nearest: report.amenities.nearest
    } : null,
    findings: report.findings,
    unknowns: report.unknowns,
    limitations: report.limitations,
    sources: report.sources
  };
}

// The server only reads a short summary of each side, so keep the request small
// (two full reports can exceed the 24 KB request limit).
function compactComparisonSide(report: LocationReport) {
  return {
    location: { label: report.location.label },
    scores: { completenessScore: report.scores.completenessScore },
    airQuality: report.airQuality ? { europeanAqi: report.airQuality.europeanAqi, aqiLabel: report.airQuality.aqiLabel } : null,
    amenities: report.amenities ? {
      nearest: {
        transit: report.amenities.nearest.transit && { name: report.amenities.nearest.transit.name, distanceMeters: report.amenities.nearest.transit.distanceMeters },
        healthcare: report.amenities.nearest.healthcare && { name: report.amenities.nearest.healthcare.name, distanceMeters: report.amenities.nearest.healthcare.distanceMeters },
        education: report.amenities.nearest.education && { name: report.amenities.nearest.education.name, distanceMeters: report.amenities.nearest.education.distanceMeters }
      }
    } : null,
    unknowns: report.unknowns.slice(0, 6)
  };
}

function compactComparison(report: ComparisonReport) {
  return {
    preferenceProfile: report.preferenceProfile,
    preferenceSummary: report.preferenceSummary,
    locationA: compactComparisonSide(report.locationA),
    locationB: compactComparisonSide(report.locationB),
    deltas: report.deltas,
    verdict: report.verdict,
    nextSteps: report.nextSteps
  };
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  return (hash >>> 0).toString(36);
}

function readCache(key: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { text?: unknown; at?: unknown };
    if (typeof parsed.text === "string" && typeof parsed.at === "number" && Date.now() - parsed.at < CACHE_TTL_MS) return parsed.text;
  } catch { /* cache is optional */ }
  return null;
}

function writeCache(key: string, text: string) {
  try { window.sessionStorage.setItem(key, JSON.stringify({ text, at: Date.now() })); } catch { /* cache is optional */ }
}

function renderInline(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>));
}

/** Minimal, safe renderer for the model's plain-text answer: "## heading", "- bullet", paragraphs. No HTML is ever injected. */
export function InsightText({ text }: { text: string }) {
  const blocks: Array<{ type: "h" | "p" | "ul"; lines: string[] }> = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (heading) blocks.push({ type: "h", lines: [heading[1]] });
    else if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.lines.push(bullet[1]);
      else blocks.push({ type: "ul", lines: [bullet[1]] });
    } else blocks.push({ type: "p", lines: [line] });
  }
  return (
    <div className="ix-prose">
      {blocks.map((block, index) =>
        block.type === "h" ? <h4 key={index}>{renderInline(block.lines[0])}</h4>
        : block.type === "ul" ? <ul key={index}>{block.lines.map((line, i) => <li key={i}>{renderInline(line)}</li>)}</ul>
        : <p key={index}>{renderInline(block.lines[0])}</p>
      )}
    </div>
  );
}

export default function AiInsight({ kind, data }: { kind: InsightKind; data: InsightData }) {
  const [insight, setInsight] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestData = useMemo(
    () => kind === "location"
      ? compactLocation(data as LocationReport)
      : compactComparison(data as ComparisonReport),
    [kind, data]
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const body = JSON.stringify({ kind, data: requestData });
    const cacheKey = `${CACHE_PREFIX}${kind}:${hashString(body)}`;
    setError("");

    const cached = attempt === 0 ? readCache(cacheKey) : null;
    if (cached) {
      setInsight(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setInsight("");
    fetch("/api/ai-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI interpretation is unavailable.");
      if (typeof payload.insight !== "string") throw new Error("AI provider returned an invalid response.");
      if (active) {
        setInsight(payload.insight);
        writeCache(cacheKey, payload.insight);
      }
    }).catch((reason: unknown) => {
      if (!active || (reason instanceof Error && reason.name === "AbortError")) return;
      setError(reason instanceof Error ? reason.message : "AI interpretation is unavailable.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [kind, requestData, attempt]);

  return (
    <section className="ix-card ai-insight-panel overflow-hidden" aria-labelledby={`ai-insight-${kind}-title`}>
      <div className="flex items-start gap-3 border-b border-[color:var(--ix-line)] px-5 py-4 sm:px-6">
        <span className="ix-icon-badge !bg-[color:var(--ix-brand)] !text-white"><BrainCircuit size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 id={`ai-insight-${kind}-title`} className="text-base font-semibold text-[color:var(--ix-ink)]">{kind === "comparison" ? "AI decision interpretation" : "AI evidence interpretation"}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--ix-muted)]">Groq-assisted explanation of the retrieved evidence—not a new data source or a property guarantee.</p>
        </div>
        {(error || insight) && !loading && (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="ix-btn ix-btn--ghost ix-btn--sm" aria-label={error ? "Retry AI interpretation" : "Regenerate AI interpretation"}>
            <RefreshCw size={13} aria-hidden="true" /> {error ? "Retry" : "Regenerate"}
          </button>
        )}
      </div>
      <div className="px-5 py-5 sm:px-6">
        {loading && (
          <div role="status" aria-label="Preparing AI interpretation" className="space-y-2.5">
            <p className="text-sm text-[color:var(--ix-muted)]">Preparing a cautious interpretation from the available evidence…</p>
            <span className="ix-skeleton__bar w-1/3" /><span className="ix-skeleton__bar w-full" /><span className="ix-skeleton__bar w-5/6" /><span className="ix-skeleton__bar w-2/3" />
          </div>
        )}
        {error && !loading && (
          <div role="status" className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><p>{error}</p>
          </div>
        )}
        {insight && !loading && <InsightText text={insight} />}
        <p className="mt-4 flex items-center gap-1.5 border-t border-[color:var(--ix-line)] pt-3 text-[11px] text-[color:var(--ix-muted)]"><Sparkles size={12} aria-hidden="true" /> AI-generated from this report. Check each material claim against the linked source records; unknowns remain unknown.</p>
      </div>
    </section>
  );
}
