"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Copy,
  History,
  LoaderCircle,
  Printer,
  Scale,
  Trophy
} from "lucide-react";
import type { ComparisonReport, ComparisonVerdict, PreferenceProfile, VerdictDimension } from "@/lib/types";
import { shortLabel } from "@/lib/comparison-verdict";
import { usePreferences } from "@/lib/use-preferences";
import AiInsight from "@/components/ai-insight";
import LazySection from "@/components/lazy-section";
import ScoreRing from "@/components/score-ring";

const LocationMap = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => <div className="ix-skeleton" style={{ minHeight: 480 }}><span className="ix-skeleton__bar w-1/3" /><span className="ix-skeleton__bar w-2/3" /></div>
});

const PROFILES: Array<{ value: PreferenceProfile; label: string; hint: string }> = [
  { value: "balanced", label: "Balanced", hint: "Equal weight to transit, essentials, healthcare, schools and air quality" },
  { value: "family", label: "Family", hint: "Schools and healthcare weigh most" },
  { value: "transit", label: "Transit-first", hint: "Mapped transit access weighs most" },
  { value: "healthcare", label: "Healthcare-first", hint: "Nearest hospital or clinic weighs most" },
  { value: "quiet", label: "Quiet", hint: "No verified noise data exists, so a balanced weighting is used" }
];

const COLOR_A = "var(--ix-brand-2)";
const COLOR_B = "var(--ix-accent)";

function confidenceStyle(confidence: ComparisonVerdict["confidence"]) {
  if (confidence === "high") return { className: "ix-pill ix-pill--good", label: "High confidence" };
  if (confidence === "medium") return { className: "ix-pill ix-pill--warn", label: "Medium confidence" };
  return { className: "ix-pill ix-pill--bad", label: "Low confidence" };
}

function DimensionRow({ dimension, nameA, nameB }: { dimension: VerdictDimension; nameA: string; nameB: string }) {
  if (!dimension.comparable) {
    return (
      <li className="rounded-2xl border border-dashed border-[color:var(--ix-line)] p-3.5">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold text-[color:var(--ix-ink-2)]">
          {dimension.label}
          <span className="ix-pill ix-pill--warn">Not compared</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--ix-muted)]">{dimension.note}</p>
      </li>
    );
  }
  const bar = (value: number | null, color: string, name: string, winner: boolean) => (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 truncate text-[11px] font-semibold text-[color:var(--ix-muted)]" title={name}>{name}</span>
      <div className="ix-meter flex-1" role="img" aria-label={`${name}: ${value === null ? "n/a" : Math.round(value)} out of 100`}>
        <span style={{ width: `${value ?? 0}%`, background: color, opacity: winner ? 1 : 0.6 }} />
      </div>
      <span className={`w-8 shrink-0 text-right text-xs tabular-nums ${winner ? "font-extrabold text-[color:var(--ix-ink)]" : "font-semibold text-[color:var(--ix-muted)]"}`}>
        {value === null ? "–" : Math.round(value)}
      </span>
    </div>
  );
  return (
    <li className="rounded-2xl border border-[color:var(--ix-line)] bg-[color:var(--ix-surface-2)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-[color:var(--ix-ink)]">{dimension.label}</span>
        <span className="text-[11px] text-[color:var(--ix-muted)]">{Math.round(dimension.weight * 100)}% of the result · {dimension.note}</span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {bar(dimension.scoreA, COLOR_A, nameA, dimension.leader === "A")}
        {bar(dimension.scoreB, COLOR_B, nameB, dimension.leader === "B")}
      </div>
    </li>
  );
}

export default function CompareView() {
  const { prefs, ready, update } = usePreferences();
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ComparisonReport | null>(null);
  const [copied, setCopied] = useState("");
  const requestIdRef = useRef(0);
  const prefilledRef = useRef(false);
  const preference = prefs.profile;

  // Re-fill the last comparison from the preferences cookie (only once, and only into empty fields).
  useEffect(() => {
    if (!ready || prefilledRef.current) return;
    prefilledRef.current = true;
    if (prefs.compare) {
      setQueryA((current) => current || prefs.compare!.a);
      setQueryB((current) => current || prefs.compare!.b);
    }
  }, [ready, prefs.compare]);

  const invalidateComparison = () => {
    requestIdRef.current += 1;
    setLoading(false);
    setData(null);
    setError("");
    setCopied("");
  };

  const setExample = (a: string, b: string) => {
    invalidateComparison();
    setQueryA(a);
    setQueryB(b);
  };

  const swap = () => {
    invalidateComparison();
    setQueryA(queryB);
    setQueryB(queryA);
  };

  async function handleCompare(event: React.FormEvent) {
    event.preventDefault();
    if (!queryA.trim() || !queryB.trim()) {
      setError("Please enter both locations to compare.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setData(null);
    setCopied("");

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
      update({ compare: { a: queryA.trim(), b: queryB.trim() } });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to run comparison.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  const verdict = data?.verdict;
  const nameA = data ? shortLabel(data.locationA.location.label) : "A";
  const nameB = data ? shortLabel(data.locationB.location.label) : "B";

  async function copySummary() {
    if (!data || !verdict) return;
    const lines = [
      `Infracis comparison — ${PROFILES.find((p) => p.value === data.preferenceProfile)?.label ?? "Balanced"} priorities`,
      verdict.headline,
      verdict.scoreA !== null && verdict.scoreB !== null ? `${nameA}: ${verdict.scoreA}/100 · ${nameB}: ${verdict.scoreB}/100 · ${verdict.confidence} confidence` : "No comparable score.",
      verdict.summary,
      ...verdict.caveats.slice(-1)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied("Summary copied to the clipboard.");
    } catch {
      setCopied("Your browser blocked copying. Select the summary text instead.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCompare} className="ix-card ix-card-pad">
        <div className="flex items-center gap-3">
          <span className="ix-icon-badge"><Scale size={20} aria-hidden="true" /></span>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[color:var(--ix-ink)]">Compare two locations</h3>
            <p className="text-xs text-[color:var(--ix-muted)]">Same metrics, transparent weights, and a clear result — with missing data left out, never guessed.</p>
          </div>
        </div>

        <div className="mt-5 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label htmlFor="compare-location-a" className="mb-1.5 block text-xs font-bold text-[color:var(--ix-ink)]">Location A</label>
            <input id="compare-location-a" type="text" maxLength={180} autoComplete="off" value={queryA} onChange={(e) => { invalidateComparison(); setQueryA(e.target.value); }} placeholder="e.g. Koramangala, Bengaluru" required className="ix-input" />
          </div>
          <button type="button" onClick={swap} aria-label="Swap locations A and B" title="Swap A and B" className="ix-btn ix-btn--ghost !min-h-11 !w-11 !p-0 justify-self-center">
            <ArrowLeftRight size={16} aria-hidden="true" />
          </button>
          <div>
            <label htmlFor="compare-location-b" className="mb-1.5 block text-xs font-bold text-[color:var(--ix-ink)]">Location B</label>
            <input id="compare-location-b" type="text" maxLength={180} autoComplete="off" value={queryB} onChange={(e) => { invalidateComparison(); setQueryB(e.target.value); }} placeholder="e.g. HSR Layout, Bengaluru" required className="ix-input" />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-bold text-[color:var(--ix-ink)]">What matters most to you?</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROFILES.map((profile) => (
              <button
                key={profile.value}
                type="button"
                title={profile.hint}
                aria-pressed={preference === profile.value}
                onClick={() => { invalidateComparison(); update({ profile: profile.value }); }}
                className={`ix-chip-btn border border-[color:var(--ix-line)] ${preference === profile.value ? "ix-chip-btn--active" : ""}`}
              >
                {profile.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--ix-muted)]">{PROFILES.find((profile) => profile.value === preference)?.hint}. Your choice is remembered on this device.</p>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--ix-muted)]">
            <span className="inline-flex items-center gap-1 font-semibold"><History size={12} aria-hidden="true" /> Try:</span>
            {prefs.compare && (
              <button type="button" onClick={() => setExample(prefs.compare!.a, prefs.compare!.b)} className="ix-pill">
                Last: {shortLabel(prefs.compare.a)} vs {shortLabel(prefs.compare.b)}
              </button>
            )}
            <button type="button" onClick={() => setExample("Whitefield, Bengaluru", "Indiranagar, Bengaluru")} className="ix-pill">Whitefield vs Indiranagar</button>
            <button type="button" onClick={() => setExample("Sector 62, Noida", "Sector 150, Noida")} className="ix-pill">Sector 62 vs Sector 150</button>
          </div>
          <button type="submit" disabled={loading} className="ix-btn">
            {loading ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Comparing…</> : <>Compare locations <ArrowRight size={16} aria-hidden="true" /></>}
          </button>
        </div>
      </form>

      {error && <div role="alert" aria-live="assertive" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</div>}

      {loading && (
        <div className="ix-card ix-card-pad" role="status" aria-live="polite">
          <p className="text-sm text-[color:var(--ix-muted)]">Retrieving both locations and comparing only the evidence the providers return…</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><span className="ix-skeleton__bar !h-24 !rounded-2xl" /><span className="ix-skeleton__bar !h-24 !rounded-2xl" /></div>
        </div>
      )}

      {data && (
        <div className="space-y-6 ix-rise">
          {verdict && (
            <section className="ix-card overflow-hidden" aria-labelledby="verdict-title">
              <div className="border-b border-[color:var(--ix-line)] bg-[color:var(--ix-brand-soft)] px-5 py-4 sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--ix-brand)]">
                    <Trophy size={15} aria-hidden="true" /> Result · {PROFILES.find((p) => p.value === verdict.profile)?.label} priorities
                  </span>
                  <span className={confidenceStyle(verdict.confidence).className}>{confidenceStyle(verdict.confidence).label}</span>
                </div>
                <h3 id="verdict-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--ix-ink)] sm:text-3xl">{verdict.headline}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--ix-ink-2)]">{verdict.summary}</p>
              </div>

              <div className="grid items-center gap-6 px-5 py-6 sm:grid-cols-[1fr_auto_1fr] sm:px-7">
                <ScoreRing value={verdict.scoreA} color={COLOR_A} label={nameA} caption={data.locationA.location.label} highlight={verdict.leader === "A"} />
                <div className="text-center">
                  <div className="text-xs font-bold uppercase tracking-widest text-[color:var(--ix-muted)]">vs</div>
                  {verdict.scoreA !== null && verdict.scoreB !== null && (
                    <div className="mt-1 text-[11px] text-[color:var(--ix-muted)]">{verdict.margin} point{verdict.margin === 1 ? "" : "s"} apart</div>
                  )}
                </div>
                <ScoreRing value={verdict.scoreB} color={COLOR_B} label={nameB} caption={data.locationB.location.label} highlight={verdict.leader === "B"} />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--ix-line)] px-5 py-3 sm:px-7">
                <button type="button" onClick={copySummary} className="ix-btn ix-btn--ghost ix-btn--sm"><Copy size={13} aria-hidden="true" /> Copy summary</button>
                <button type="button" onClick={() => window.print()} className="ix-btn ix-btn--ghost ix-btn--sm"><Printer size={13} aria-hidden="true" /> Print</button>
                <span role="status" aria-live="polite" className="text-[11px] text-[color:var(--ix-muted)]">{copied}</span>
              </div>
            </section>
          )}

          {verdict && (
            <section className="ix-card ix-card-pad" aria-labelledby="dimension-title">
              <h4 id="dimension-title" className="text-base font-bold text-[color:var(--ix-ink)]">How the result is built</h4>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--ix-muted)]">
                Each measure is scored 0–100 for both locations. Only measures with evidence on both sides count, and their weights are rebalanced to sum to 100%.
              </p>
              <ul className="mt-4 space-y-2.5">
                {verdict.dimensions.map((dimension) => <DimensionRow key={dimension.key} dimension={dimension} nameA={nameA} nameB={nameB} />)}
              </ul>

              {(verdict.strengthsA.length > 0 || verdict.strengthsB.length > 0) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[{ name: nameA, items: verdict.strengthsA, color: COLOR_A }, { name: nameB, items: verdict.strengthsB, color: COLOR_B }].map((side) => (
                    <div key={side.name} className="rounded-2xl border border-[color:var(--ix-line)] p-4" style={{ borderTop: `3px solid ${side.color}` }}>
                      <h5 className="text-sm font-bold text-[color:var(--ix-ink)]">Where {side.name} is stronger</h5>
                      {side.items.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-[color:var(--ix-ink-2)]">
                          {side.items.map((item) => <li key={item} className="flex items-start gap-1.5"><CheckCircle size={13} className="mt-0.5 shrink-0 text-[color:var(--ix-good)]" aria-hidden="true" />{item}</li>)}
                        </ul>
                      ) : <p className="mt-2 text-xs text-[color:var(--ix-muted)]">No measure where it clearly leads.</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <LazySection minHeight={480} label="comparison map">
            <LocationMap location={data.locationA.location} secondary={data.locationB.location} title="Both locations on the map" />
          </LazySection>

          <LazySection minHeight={260} label="AI interpretation">
            <AiInsight kind="comparison" data={data} />
          </LazySection>

          <section className="ix-card overflow-hidden" aria-labelledby="breakdown-title">
            <div className="border-b border-[color:var(--ix-line)] bg-[color:var(--ix-surface-2)] p-5">
              <h4 id="breakdown-title" className="text-base font-bold text-[color:var(--ix-ink)]">Detailed metric breakdown</h4>
              <p className="mt-0.5 text-xs text-[color:var(--ix-muted)]">Raw values behind the scores. Metrics that cannot be compared fairly are flagged, not guessed.</p>
            </div>
            <div className="divide-y divide-[color:var(--ix-line)]">
              {data.deltas.map((delta, index) => (
                <div key={`${delta.metric}-${index}`} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--ix-muted)]">{delta.category}</span>
                    {delta.favoredSide === "incomparable" ? (
                      <span className="ix-pill ix-pill--warn"><AlertCircle size={12} aria-hidden="true" /> Incomparable</span>
                    ) : delta.favoredSide === "neutral" ? (
                      <span className="ix-pill">Equivalent</span>
                    ) : (
                      <span className="ix-pill ix-pill--good"><CheckCircle size={12} aria-hidden="true" /> {delta.favoredSide === "A" ? nameA : nameB} favoured</span>
                    )}
                  </div>
                  <h5 className="mt-1 text-sm font-semibold text-[color:var(--ix-ink)]">{delta.metric}</h5>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([["A", nameA, delta.valueA], ["B", nameB, delta.valueB]] as const).map(([side, name, value]) => (
                      <div key={side} className={`rounded-xl border p-3 text-xs ${delta.favoredSide === side ? "border-[color:var(--ix-good)] bg-[color:var(--ix-brand-soft)]" : "border-[color:var(--ix-line)] bg-[color:var(--ix-surface-2)]"}`}>
                        <span className="font-bold text-[color:var(--ix-brand)]">{name}: </span>
                        <span className="text-[color:var(--ix-ink-2)]">{value ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-[color:var(--ix-muted)]">{delta.differenceSummary}{delta.incomparableReason ? ` ${delta.incomparableReason}` : ""}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ix-card ix-card-pad">
            <h4 className="flex items-center gap-2 text-base font-bold text-[color:var(--ix-ink)]"><ClipboardCheck size={18} aria-hidden="true" /> Before you decide</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[color:var(--ix-ink-2)]">
              {data.nextSteps.map((step) => <li key={step}>{step}</li>)}
            </ul>
            {verdict && (
              <ul className="mt-4 space-y-1 border-t border-[color:var(--ix-line)] pt-3 text-[11px] leading-relaxed text-[color:var(--ix-muted)]">
                {verdict.caveats.map((caveat) => <li key={caveat}>• {caveat}</li>)}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
