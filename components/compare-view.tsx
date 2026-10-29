"use client";

import { useRef, useState } from "react";
import { ComparisonReport, PreferenceProfile } from "@/lib/types";
import AiInsight from "@/components/ai-insight";
import { ArrowRight, LoaderCircle, Scale, CheckCircle, AlertCircle } from "lucide-react";

export default function CompareView() {
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [preference, setPreference] = useState<PreferenceProfile>("balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ComparisonReport | null>(null);
  const requestIdRef = useRef(0);

  const invalidateComparison = () => {
    requestIdRef.current += 1;
    setLoading(false);
    setData(null);
    setError("");
  };

  const setExample = (a: string, b: string) => {
    invalidateComparison();
    setQueryA(a);
    setQueryB(b);
  };

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!queryA.trim() || !queryB.trim()) {
      setError("Please enter both locations to compare.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryA, queryB, preference })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not compare locations.");
      if (requestId !== requestIdRef.current) return;
      setData(payload as ComparisonReport);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to run comparison.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCompare} className="rounded-3xl border border-[#dce3da] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-2">
          <Scale className="text-[#104c38]" size={20} />
          <h3 className="text-lg font-semibold tracking-tight text-[#1a2e23]">
            Compare Two Locations Side-by-Side
          </h3>
        </div>
        <p className="mt-1 text-xs text-[#627367]">
          Evaluate two candidate properties using identical metrics, transparent formulas, and explicit unknown detection.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="compare-location-a" className="mb-1.5 block text-xs font-semibold text-[#1a2e23]">
              Location A (Candidate 1)
            </label>
            <input
              id="compare-location-a"
              type="text"
              maxLength={180}
              autoComplete="off"
              value={queryA}
              onChange={(e) => { invalidateComparison(); setQueryA(e.target.value); }}
              placeholder="e.g. Koramangala, Bengaluru"
              required
              className="w-full rounded-2xl border border-[#dce3da] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[#104c38]"
            />
          </div>

          <div>
            <label htmlFor="compare-location-b" className="mb-1.5 block text-xs font-semibold text-[#1a2e23]">
              Location B (Candidate 2)
            </label>
            <input
              id="compare-location-b"
              type="text"
              maxLength={180}
              autoComplete="off"
              value={queryB}
              onChange={(e) => { invalidateComparison(); setQueryB(e.target.value); }}
              placeholder="e.g. HSR Layout, Bengaluru"
              required
              className="w-full rounded-2xl border border-[#dce3da] bg-[#fbfcf9] px-4 py-3 text-sm outline-none focus:border-[#104c38]"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#3b4c40]">Priority Profile:</span>
            {(["balanced", "family", "transit", "healthcare", "quiet"] as PreferenceProfile[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={preference === p}
                  onClick={() => { invalidateComparison(); setPreference(p); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                    preference === p
                      ? "bg-[#104c38] text-white"
                      : "bg-[#f1f5ee] text-[#55665a] hover:bg-[#e4ede0]"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#104c38] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c3829] disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" /> Retrieving data...
              </>
            ) : (
              <>
                Compare Locations <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[#718276]">
          <span>Quick comparisons:</span>
          <button
            type="button"
            onClick={() => setExample("Whitefield, Bengaluru", "Indiranagar, Bengaluru")}
            className="underline hover:text-[#104c38]"
          >
            Whitefield vs Indiranagar
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setExample("Sector 62, Noida", "Sector 150, Noida")}
            className="underline hover:text-[#104c38]"
          >
            Sector 62 vs Sector 150 (Noida)
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" aria-live="assertive" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-[#526356]" role="status" aria-live="polite">
          Retrieving both locations and comparing only the evidence returned by the providers…
        </p>
      )}

      {data && (
        <div className="space-y-6">
          {/* Overview Banner */}
          <section className="overflow-hidden rounded-3xl border border-[#cbdcc7] bg-gradient-to-br from-[#f2f7ee] via-white to-[#fbf3e5] p-5 shadow-[0_14px_36px_rgba(23,75,56,0.08)] sm:p-7" aria-labelledby="comparison-result-title">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#174b38] text-white"><Scale size={21} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8b641e]">Evidence-based result</p>
                <h3 id="comparison-result-title" className="mt-1 text-xl font-bold text-[#153a2b]">Your comparison result</h3>
                <p className="mt-2 text-sm leading-7 text-[#33483a]">{data.preferenceSummary}</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-[#e0e8db] bg-white/80 px-3.5 py-3 text-xs leading-relaxed text-[#647468]">
              The result compares only the selected profile’s available, comparable indicators. Missing or capped provider data is not treated as zero, and the result is not a property-quality, legal, safety, or purchase recommendation.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e9df] bg-[#f9fbf8] p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#104c38]">
                  Location A
                </span>
                <h4 className="mt-1 text-base font-semibold text-[#1a2e23]">
                  {data.locationA.location.label}
                </h4>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e2e9df]">
                    Completeness: <strong>{data.locationA.scores.completenessScore}%</strong>
                  </span>
                  <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e2e9df]">
                    Transit: <strong>{data.locationA.amenities?.nearest.transit?.distanceMeters ?? "Unmapped"}m</strong>
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e2e9df] bg-[#f9fbf8] p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#104c38]">
                  Location B
                </span>
                <h4 className="mt-1 text-base font-semibold text-[#1a2e23]">
                  {data.locationB.location.label}
                </h4>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e2e9df]">
                    Completeness: <strong>{data.locationB.scores.completenessScore}%</strong>
                  </span>
                  <span className="rounded-lg bg-white px-2.5 py-1 border border-[#e2e9df]">
                    Transit: <strong>{data.locationB.amenities?.nearest.transit?.distanceMeters ?? "Unmapped"}m</strong>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <AiInsight kind="comparison" data={data} />

          {/* Metrics Comparison Table */}
          <div className="overflow-hidden rounded-3xl border border-[#dce3da] bg-white shadow-sm">
            <div className="border-b border-[#e6ede4] bg-[#f8faf7] p-5">
              <h4 className="text-base font-semibold text-[#1a2e23]">Detailed Metric Breakdown</h4>
              <p className="mt-0.5 text-xs text-[#66776b]">
                Infracis highlights where data cannot be compared fairly due to missing records.
              </p>
            </div>

            <div className="divide-y divide-[#edf2eb]">
              {data.deltas.map((delta, i) => (
                <div key={i} className="p-5 hover:bg-[#fafbf9] transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6b7c70]">
                      {delta.category}
                    </span>
                    {delta.favoredSide === "incomparable" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        <AlertCircle size={12} /> Incomparable Metric
                      </span>
                    ) : delta.favoredSide === "neutral" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        Neutral / Equivalent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle size={12} /> Location {delta.favoredSide} Favored
                      </span>
                    )}
                  </div>

                  <h5 className="mt-1 text-sm font-semibold text-[#1a2e23]">{delta.metric}</h5>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#e5ebe3] bg-[#fbfcf9] p-3 text-xs">
                      <span className="font-semibold text-[#104c38]">Location A: </span>
                      <span className="text-[#2b3d30]">{delta.valueA ?? "—"}</span>
                    </div>
                    <div className="rounded-xl border border-[#e5ebe3] bg-[#fbfcf9] p-3 text-xs">
                      <span className="font-semibold text-[#104c38]">Location B: </span>
                      <span className="text-[#2b3d30]">{delta.valueB ?? "—"}</span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-[#526356]">
                    <strong>Analysis:</strong> {delta.differenceSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Next Steps */}
          <div className="rounded-3xl border border-[#dce3da] bg-white p-5 shadow-sm sm:p-7">
            <h4 className="text-base font-semibold text-[#1a2e23]">Next Investigation Steps</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#556659]">
              {data.nextSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
