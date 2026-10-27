"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ExternalLink, LoaderCircle, MapPin, RefreshCw, ShieldCheck } from "lucide-react";

type Analysis = {
  generatedAt: string;
  location: { label: string; latitude: number; longitude: number; mapUrl: string };
  weather: null | {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  weatherUnits: Record<string, string>;
  weatherTimezone: string | null;
  amenities: null | { count: number; categories: Record<string, number>; items: Array<{id:string;name:string;category:string}> };
  sources: Array<{name:string;url:string;retrievedAt:string;status:"available"|"unavailable";note:string}>;
  limitations: string[];
};

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AnalyzeClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Analysis | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not analyze this location.");
      setData(payload as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze this location.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-3xl border border-[#e0e5dc] bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="location-query" className="mb-2 block text-sm font-semibold">Enter a real address or locality</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[#dce3da] bg-[#fbfcf9] px-4">
            <MapPin size={18} className="shrink-0 text-[#47745e]" />
            <input
              id="location-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={180}
              minLength={3}
              required
              placeholder="e.g. Sector 62, Noida, Uttar Pradesh"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-[#9aa49b]"
            />
          </div>
          <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#205b49] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#174737] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <><LoaderCircle size={16} className="animate-spin" /> Checking sources</> : <>Investigate location <ArrowRight size={16} /></>}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#7a867d]">This uses explicit search submission, not autocomplete. Results depend on public-source coverage and availability.</p>
      </form>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {data && (
        <section aria-live="polite" className="space-y-4">
          <div className="rounded-3xl border border-[#dfe6dc] bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#598069]">Live source-backed result</p>
                <h3 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight">{data.location.label}</h3>
                <p className="mt-2 text-xs text-[#7a867d]">Coordinates: {data.location.latitude.toFixed(5)}, {data.location.longitude.toFixed(5)} · Retrieved {formatDate(data.generatedAt)}</p>
              </div>
              <a href={data.location.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start rounded-full border border-[#dce3da] px-3 py-2 text-xs font-medium hover:border-[#205b49]">Open map <ExternalLink size={13} /></a>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f4f7f1] p-5">
                <p className="text-xs text-[#718073]">Current weather model</p>
                {data.weather ? (
                  <>
                    <p className="mt-2 text-3xl font-semibold">{data.weather.temperature_2m ?? "—"}{data.weatherUnits.temperature_2m || "°"}</p>
                    <p className="mt-2 text-sm text-[#5d6c60]">Humidity {data.weather.relative_humidity_2m ?? "—"}{data.weatherUnits.relative_humidity_2m || "%"} · Precipitation {data.weather.precipitation ?? "—"} {data.weatherUnits.precipitation || "mm"}</p>
                    <p className="mt-2 text-xs text-[#849087]">{data.weather.time || "Observation time not provided"} · {data.weatherTimezone || "Timezone not provided"}</p>
                  </>
                ) : <p className="mt-3 text-sm text-[#7a867d]">The weather provider was unavailable. No value has been substituted.</p>}
              </div>
              <div className="rounded-2xl bg-[#f4f7f1] p-5">
                <p className="text-xs text-[#718073]">Mapped nearby amenities</p>
                {data.amenities ? (
                  <>
                    <p className="mt-2 text-3xl font-semibold">{data.amenities.count}</p>
                    <p className="mt-2 text-sm text-[#5d6c60]">Mapped features within about 1 km</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(data.amenities.categories).slice(0,6).map(([name,count]) => <span key={name} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#5d6c60]">{name.replaceAll("_"," ")} · {count}</span>)}
                    </div>
                  </>
                ) : <p className="mt-3 text-sm text-[#7a867d]">The mapping service was unavailable. No amenity count has been fabricated.</p>}
              </div>
            </div>

            {data.amenities?.items.length ? (
              <div className="mt-5">
                <h4 className="text-sm font-semibold">A sample of mapped amenities</h4>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.amenities.items.slice(0,10).map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf0e9] px-3 py-2.5 text-sm"><span className="min-w-0 truncate">{item.name}</span><span className="shrink-0 text-xs text-[#7a867d]">{item.category.replaceAll("_"," ")}</span></li>)}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[#e0e5dc] bg-white p-5 sm:p-7">
            <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#47745e]" /><h3 className="text-lg font-semibold">Sources and limitations</h3></div>
            <p className="mt-2 text-sm leading-6 text-[#718073]">These are retrieved observations and mapped records, not a property risk certification. Each source has different coverage and update behavior.</p>
            <div className="mt-4 divide-y divide-[#edf0e9]">
              {data.sources.map(source => (
                <div key={source.name} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-semibold underline decoration-[#c5d4c6] underline-offset-4">{source.name} <ExternalLink size={12} className="ml-1 inline" /></a>
                    <span className={source.status === "available" ? "rounded-full bg-[#e8f3e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#386b55]" : "rounded-full bg-[#f7efdd] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b7540]"}>{source.status}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#718073]">{source.note}</p>
                  <p className="mt-1 text-[10px] text-[#9aa49b]">Retrieved: {formatDate(source.retrievedAt)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[#f7f7f2] p-4">
              <h4 className="text-sm font-semibold">Important unknowns</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#718073]">
                {data.limitations.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <button onClick={() => { setData(null); setError(""); }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#386b55] hover:underline"><RefreshCw size={14} /> Start another search</button>
            <p className="mt-4 text-[10px] leading-5 text-[#9aa49b]">Map data © OpenStreetMap contributors · Weather data by Open-Meteo (CC BY 4.0)</p>
          </div>
        </section>
      )}
    </div>
  );
}
