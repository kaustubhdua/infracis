"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComparisonReport, LocationReport } from "@/lib/types";
import { BrainCircuit, LoaderCircle, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";

type InsightKind = "location" | "comparison";
type InsightData = LocationReport | ComparisonReport;

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

function compactComparison(report: ComparisonReport) {
  return {
    preferenceProfile: report.preferenceProfile,
    preferenceSummary: report.preferenceSummary,
    locationA: compactLocation(report.locationA),
    locationB: compactLocation(report.locationB),
    deltas: report.deltas,
    nextSteps: report.nextSteps
  };
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
    setLoading(true);
    setError("");
    setInsight("");

    fetch("/api/ai-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data: requestData }),
      signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI interpretation is unavailable.");
      if (typeof payload.insight !== "string") throw new Error("AI provider returned an invalid response.");
      if (active) setInsight(payload.insight);
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
    <section className="overflow-hidden rounded-3xl border border-[#cddfd0] bg-gradient-to-br from-[#f5faf3] via-white to-[#f8f4e9] shadow-[0_12px_34px_rgba(23,75,56,0.07)]" aria-labelledby={`ai-insight-${kind}-title`}>
      <div className="flex items-start gap-3 border-b border-[#e2ecdf] px-5 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#174b38] text-white"><BrainCircuit size={20} /></span>
        <div className="min-w-0 flex-1">
          <h3 id={`ai-insight-${kind}-title`} className="text-base font-semibold text-[#183b2b]">{kind === "comparison" ? "AI decision interpretation" : "AI evidence interpretation"}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#627367]">Groq-assisted explanation of the retrieved evidence—not a new data source or a property guarantee.</p>
        </div>
        {error && <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#d7e3d3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#174b38] hover:bg-[#eef5eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]" aria-label="Retry AI interpretation"><RefreshCw size={13} /> Retry</button>}
      </div>
      <div className="px-5 py-5 sm:px-6">
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-[#53675a]"><LoaderCircle size={16} className="animate-spin" /> Preparing a cautious interpretation from available evidence…</p>}
        {error && <div role="status" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><TriangleAlert size={17} className="mt-0.5 shrink-0" /><p>{error}</p></div>}
        {insight && <div className="space-y-2 text-sm leading-7 text-[#2b4032]">{insight.split("\n").map((line, index) => line.trim() ? <p key={index}>{line}</p> : null)}</div>}
        <p className="mt-4 flex items-center gap-1.5 border-t border-[#e5ede1] pt-3 text-[11px] text-[#748376]"><Sparkles size={12} /> AI-generated from this report. Check each material claim against the linked source records; unknowns remain unknown.</p>
      </div>
    </section>
  );
}
