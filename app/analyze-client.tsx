"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LocationReport, EvidenceClassification } from "@/lib/types";
const LocationMap = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => <div className="grid h-[360px] place-items-center rounded-3xl border border-[#d7e1d5] bg-[#edf3e8] text-sm text-[#53675a] sm:h-[440px]">Loading interactive map…</div>
});
import EvidenceCard from "@/components/evidence-card";
import ChecklistSection from "@/components/checklist-section";
import CompareView from "@/components/compare-view";
import MethodologyView from "@/components/methodology-view";
import SavedReportsModal, { saveReportToStorage, exportReportJson } from "@/components/saved-reports-modal";
import Nav from "@/components/nav";
import DecisionBrief from "@/components/decision-brief";
import AiInsight from "@/components/ai-insight";
import LocalityReview from "@/components/locality-review";
import {
  MapPin,
  ArrowRight,
  LoaderCircle,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Download,
  AlertTriangle,
  Layers,
  Wind,
  Bus,
  HeartPulse
} from "lucide-react";

export default function AnalyzeClient() {
  const [activeTab, setActiveTab] = useState<"analyze" | "compare" | "methodology">("analyze");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<LocationReport | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceClassification | "all">("all");
  const analysisRequestId = useRef(0);

  const runAnalysis = useCallback(async (searchQuery: string, lat?: number, lon?: number) => {
    const requestId = ++analysisRequestId.current;
    setLoading(true);
    setError("");
    // Hide the previous result while a new investigation is pending. If the
    // request fails, an older location report must not look like the new result.
    setReport(null);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          lat,
          lon
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not analyze this location.");
      }

      // Quick successive searches can finish out of order. Only the newest
      // request may update the visible report or loading/error state.
      if (requestId !== analysisRequestId.current) return;
      setReport(data as LocationReport);
      if (searchQuery) setQuery(searchQuery);
    } catch (err) {
      if (requestId !== analysisRequestId.current) return;
      setError(err instanceof Error ? err.message : "Failed to analyze location.");
    } finally {
      if (requestId === analysisRequestId.current) setLoading(false);
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    runAnalysis(query.trim());
  };

  const handleMapCoordinatePick = useCallback((lat: number, lon: number) => {
    runAnalysis(`Coordinates ${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon);
  }, [runAnalysis]);

  const handleSave = () => {
    if (!report) return;
    setSaveError("");
    const saved = saveReportToStorage(report);
    setSavedSuccess(saved);
    if (!saved) setSaveError("Could not save in this browser. Check browser storage settings or export the report as JSON.");
    if (saved) setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f5f6ef] text-[#20352a]">
      <Nav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSaved={() => setSavedModalOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {activeTab === "compare" && <CompareView />}

        {activeTab === "methodology" && <MethodologyView />}

        {activeTab === "analyze" && (
          <div className="space-y-6">
            {/* Search Input Banner */}
            <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-[#d6e1d2] bg-gradient-to-br from-white via-[#fbfcf8] to-[#edf3e8] p-5 shadow-[0_16px_50px_rgba(24,62,42,0.07)] sm:p-8 lg:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full border-[36px] border-[#e6eddf]/80" />
              <div aria-hidden="true" className="pointer-events-none absolute right-16 top-0 -z-10 h-2 w-16 rounded-b-full bg-[#e8a23a]" />
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e4d2] bg-[#f0f5ec] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#174b38]">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#e8a23a]" />
                Location due diligence
              </span>
              <h2 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-[#153a2b] sm:text-4xl lg:text-5xl">
                Investigate a residential location before you commit.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#53675a] sm:text-base">
                Enter an address or locality to investigate. Infracis retrieves available evidence from OpenStreetMap and Open-Meteo, calculates transparent proximity metrics, and lists what still needs checking on the ground. Sources that are disabled, unavailable, or incomplete stay clearly marked as unknown.
              </p>

              <form onSubmit={handleFormSubmit} className="mt-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-[#dce3da] bg-[#fbfcf9] px-4 py-1 focus-within:border-[#104c38] focus-within:ring-2 focus-within:ring-[#104c38]/10 transition">
                    <MapPin size={18} className="shrink-0 text-[#104c38]" />
                    <input
                      id="location-input"
                      aria-label="Address or locality to investigate"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      minLength={3}
                      maxLength={180}
                      required
                      placeholder="e.g. Sector 62, Noida, Uttar Pradesh"
                      className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#91a094]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#104c38] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c3829] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin" /> Verifying sources...
                      </>
                    ) : (
                      <>
                        Investigate Location <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6e7f72]">
                  <span className="font-medium">Try pilot locations:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("Sector 62, Noida");
                      runAnalysis("Sector 62, Noida");
                    }}
                    className="rounded-md bg-[#eef3eb] px-2 py-0.5 text-[11px] font-medium text-[#104c38] hover:bg-[#e2ede0]"
                  >
                    Sector 62, Noida
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("New Delhi");
                      runAnalysis("New Delhi");
                    }}
                    className="rounded-md bg-[#eef3eb] px-2 py-0.5 text-[11px] font-medium text-[#104c38] hover:bg-[#e2ede0]"
                  >
                    New Delhi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("Koramangala, Bengaluru");
                      runAnalysis("Koramangala, Bengaluru");
                    }}
                    className="rounded-md bg-[#eef3eb] px-2 py-0.5 text-[11px] font-medium text-[#104c38] hover:bg-[#e2ede0]"
                  >
                    Koramangala, Bengaluru
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("Bandra West, Mumbai");
                      runAnalysis("Bandra West, Mumbai");
                    }}
                    className="rounded-md bg-[#eef3eb] px-2 py-0.5 text-[11px] font-medium text-[#104c38] hover:bg-[#e2ede0]"
                  >
                    Bandra West, Mumbai
                  </button>
                </div>
              </form>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800"
              >
                {error}
              </div>
            )}

            {/* Analysis Report View */}
            {report && (
              <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col justify-between gap-4 rounded-[1.75rem] border border-[#2d5366] bg-[#0f2d3d] p-5 shadow-[0_18px_45px_rgba(7,20,28,0.28)] sm:flex-row sm:items-center sm:p-7">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[#3a667d] bg-[#153c4d] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#dceef9]">
                        Evidence Report
                      </span>
                      <span className="text-xs text-[#9eb3bf]">
                        Retrieved {new Date(report.generatedAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-xl font-bold tracking-tight text-[#edf7ff]">
                      {report.location.label}
                    </h3>
                    <p className="mt-1 text-xs text-[#d5e0e7]">
                      Coordinates: {report.location.latitude.toFixed(5)},{" "}
                      {report.location.longitude.toFixed(5)} · Source coverage:{" "}
                      <strong className="text-[#f4b28a]">
                        {report.scores.completenessScore}%
                      </strong>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#afc1cb]">
                      Source coverage reflects returned evidence only—not property quality, safety, legality, or value.
                    </p>
                    <p className="mt-2 max-w-2xl rounded-xl border border-[#3c657c] bg-[#143b4d] px-3 py-2 text-xs leading-relaxed text-[#e4edf2]">
                      Confirm this resolved place and pin match your intended locality before relying on distance metrics. Geocoding can resolve to a nearby mapped place or boundary; use &quot;Open OSM&quot; to inspect the location.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#3b6277] bg-[#163d4d] px-3.5 py-2 text-xs font-semibold text-[#edf7ff] transition hover:bg-[#1c4960]"
                    >
                      <Bookmark size={14} />
                      {savedSuccess ? "Saved in This Browser" : "Save Locally"}
                    </button>
                    <button
                      type="button"
                      onClick={() => exportReportJson(report)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#3b6277] bg-[#163d4d] px-3.5 py-2 text-xs font-semibold text-[#edf7ff] transition hover:bg-[#1c4960]"
                    >
                      <Download size={14} /> Export JSON
                    </button>
                    <a
                      href={report.location.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#f39a66] px-3.5 py-2 text-xs font-semibold text-[#142b39] transition hover:bg-[#f4ab7a]"
                    >
                      Open OSM <ExternalLink size={13} />
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-[#afc1cb]">Reports are stored in this browser on this device only. Cloud sync is not available.</p>
                  {saveError && <p role="alert" className="mt-2 text-xs text-[#f6b6a4]">{saveError}</p>}
                </div>

                {/* Action-first decision summary, derived only from retrieved report data */}
                <DecisionBrief report={report} onCompare={() => setActiveTab("compare")} />
                <AiInsight kind="location" data={report} />

                {/* Interactive Map */}
                <section>
                  <LocationMap
                    location={report.location}
                    amenities={report.amenities?.items || []}
                    onPickCoordinates={handleMapCoordinatePick}
                  />
                </section>
                <LocalityReview locationLabel={report.location.label} />

                {/* Score & Dimension Cards */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#dce3da] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-[#5f7064]">
                      <span className="text-xs font-semibold">Transit Walking Distance</span>
                      <Bus size={16} className="text-[#2563eb]" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#143023]">
                        {!report.amenities
                          ? "Unavailable"
                          : report.amenities.resultLimitReached
                            ? "Sample capped"
                            : report.amenities.nearest.transit
                              ? `~${report.amenities.nearest.transit.distanceMeters}m`
                              : "Unmapped"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6e7e72]">
                      {!report.amenities
                        ? "Nearby amenity data could not be retrieved; transit distance is unknown."
                        : report.amenities.resultLimitReached
                          ? "The provider response was capped; nearest transit cannot be verified from this sample."
                          : report.amenities.nearest.transit
                            ? report.amenities.nearest.transit.name
                            : "No mapped transit stop returned within 1.2 km. Map coverage may be incomplete."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#dce3da] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-[#5f7064]">
                      <span className="text-xs font-semibold">Nearest Healthcare</span>
                      <HeartPulse size={16} className="text-[#dc2626]" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#143023]">
                        {!report.amenities
                          ? "Unavailable"
                          : report.amenities.resultLimitReached
                            ? "Sample capped"
                            : report.amenities.nearest.healthcare
                              ? `~${report.amenities.nearest.healthcare.distanceMeters}m`
                              : "Unmapped"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6e7e72]">
                      {!report.amenities
                        ? "Nearby amenity data could not be retrieved; healthcare distance is unknown."
                        : report.amenities.resultLimitReached
                          ? "The provider response was capped; nearest healthcare cannot be verified from this sample."
                          : report.amenities.nearest.healthcare
                            ? report.amenities.nearest.healthcare.name
                            : "No mapped clinic or hospital returned within 1.2 km. Map coverage may be incomplete."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#dce3da] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-[#5f7064]">
                      <span className="text-xs font-semibold">European Air Quality (AQI)</span>
                      <Wind size={16} className="text-[#104c38]" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#143023]">
                        {report.airQuality?.europeanAqi ?? "—"}
                      </span>
                      {report.airQuality && (
                        <span className="text-xs font-semibold text-[#104c38]">
                          {report.airQuality.aqiLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#6e7e72]">
                      PM2.5: {report.airQuality?.pm25 ?? "N/A"} µg/m³
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#dce3da] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-[#5f7064]">
                      <span className="text-xs font-semibold">Ground Elevation (DEM)</span>
                      <Layers size={16} className="text-[#7c3aed]" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#143023]">
                        {report.weather?.elevationMeters != null
                          ? `${report.weather.elevationMeters}m`
                          : "—"}
                      </span>
                      <span className="text-xs text-[#6e7e72]">above sea level</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6e7e72]">
                      Temp: {report.weather?.temperature ?? "—"}°C · {report.weather?.weatherDescription ?? "Weather unavailable"}
                    </p>
                  </div>
                </section>

                {/* Grounded Findings Section */}
                <section className="rounded-3xl border border-[#dce3da] bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-[#104c38]" size={20} />
                    <h3 className="text-lg font-semibold tracking-tight text-[#143023]">
                      Evidence-Grounded Due Diligence Findings
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-[#647468]">
                    Each finding references the evidence records used to derive it. Open the cited sources and review limitations before relying on a claim.
                  </p>

                  <div className="mt-5 space-y-3">
                    {report.findings.map((fnd) => (
                      <div
                        key={fnd.id}
                        className="rounded-2xl border border-[#e5ebe3] bg-[#fbfcf9] p-4 transition hover:border-[#104c38]/30"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-[#143023]">{fnd.headline}</h4>
                          <div className="flex items-center gap-1.5">
                            {fnd.riskLevel === "caution" ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                Attention Needed
                              </span>
                            ) : fnd.riskLevel === "favorable" ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                Favorable Fact
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                Neutral
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[#506155]">
                          {fnd.explanation}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[10px] text-[#718275]">
                          <span className="font-semibold text-[#104c38]">Supporting Evidence:</span>
                          {fnd.supportingEvidenceIds.map((id) => (
                            <span
                              key={id}
                              className="rounded bg-white px-1.5 py-0.5 font-mono border border-[#e2e8e0]"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Explicit Unknowns Section */}
                <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm sm:p-7">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-800" size={20} />
                    <h3 className="text-lg font-semibold tracking-tight text-amber-950">
                      Explicit Unknowns & Data Gaps
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-amber-900">
                    Infracis does not manufacture answers where open evidence is missing. These critical property aspects must be confirmed through on-ground verification:
                  </p>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-amber-950">
                    {report.unknowns.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </section>

                {/* Due Diligence On-Ground Checklist */}
                <section>
                  <ChecklistSection
                    checklist={report.checklist}
                    locationLabel={report.location.label}
                  />
                </section>

                {/* Evidence Registry & Cards */}
                <section className="rounded-3xl border border-[#dce3da] bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-[#143023]">
                        Audit Trail: Complete Evidence Records
                      </h3>
                      <p className="mt-0.5 text-xs text-[#66776b]">
                        Full provenance of every observation and calculation.
                      </p>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", "observed", "provider_model", "calculated", "rule_based_interpretation", "unknown"] as const).map(
                        (f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setEvidenceFilter(f)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                              evidenceFilter === f
                                ? "bg-[#104c38] text-white"
                                : "bg-[#f1f5ee] text-[#55665a] hover:bg-[#e2ebe0]"
                            }`}
                          >
                            {f.replace("_", " ")}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {report.evidence
                      .filter((e) =>
                        evidenceFilter === "all" ? true : e.classification === evidenceFilter
                      )
                      .map((ev) => (
                        <EvidenceCard key={ev.id} evidence={ev} />
                      ))}
                  </div>
                </section>

                {/* Source Disclaimers & Limits */}
                <section className="rounded-3xl border border-[#dce3da] bg-[#fbfcf9] p-5 text-xs text-[#6b7b70] sm:p-6">
                  <h4 className="font-semibold text-[#143023]">Important Limitations & Notice</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                    {report.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        )}
      </main>

      <SavedReportsModal
        isOpen={savedModalOpen}
        onClose={() => setSavedModalOpen(false)}
        onSelectReport={(selectedReport) => {
          setReport(selectedReport);
          setActiveTab("analyze");
        }}
      />
    </div>
  );
}
