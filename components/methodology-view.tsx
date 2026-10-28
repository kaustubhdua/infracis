"use client";

import { ShieldCheck, Database, AlertTriangle } from "lucide-react";

export default function MethodologyView() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#dce3da] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#104c38]" size={24} />
          <h2 className="text-xl font-bold tracking-tight text-[#1a2e23]">
            Infracis Data Provenance & Evidence Policy
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#556658]">
          Infracis is built on an unyielding principle: <strong>No manufactured confidence.</strong> Real-estate decisions involve life savings. Every finding must trace to a verified source, timestamp, and method—or be declared an unknown.
        </p>

        {/* 4 Classifications */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              1. Retrieved Source Data
            </span>
            <p className="mt-1 text-xs leading-relaxed text-emerald-950">
              Records returned by a named source. Each item must retain its source and limits; weather and air-quality values from Open-Meteo are model/grid estimates, not measurements taken at the property.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
              2. Calculated Metric
            </span>
            <p className="mt-1 text-xs leading-relaxed text-sky-950">
              Deterministic geospatial outputs computed using transparent formulas (e.g. Haversine great-circle distances, linear proximity step functions, completeness percentage).
            </p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              3. Model Interpretation
            </span>
            <p className="mt-1 text-xs leading-relaxed text-purple-950">
              Contextual explanations strictly grounded in retrieved evidence IDs. The engine refuses to cite evidence that was not present in the verified input payload.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              4. Explicit Unknown
            </span>
            <p className="mt-1 text-xs leading-relaxed text-amber-950">
              Information that cannot be verified from open feeds (e.g. historical localized urban waterlogging, groundwater hardness, municipal water timings, structural integrity).
            </p>
          </div>
        </div>
      </div>

      {/* Source Registry Table */}
      <div className="overflow-hidden rounded-3xl border border-[#dce3da] bg-white shadow-sm">
        <div className="border-b border-[#e6ede4] bg-[#f8faf7] p-5">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[#104c38]" />
            <h3 className="text-base font-semibold text-[#1a2e23]">Integrated Source Registry</h3>
          </div>
          <p className="mt-0.5 text-xs text-[#66776b]">
            Source roles, known constraints, and availability gates. A source being listed here does not mean it succeeded for the current report.
          </p>
        </div>

        <div className="divide-y divide-[#edf2eb] text-xs">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1a2e23]">OpenStreetMap Nominatim</span>
              <span className="rounded bg-[#e8f1e6] px-2 py-0.5 font-semibold text-[#104c38]">License: ODbL</span>
            </div>
            <p className="mt-1.5 text-[#556658]">
              <strong>Role:</strong> Location resolution and text geocoding. Uses shared request-slot reservations when Redis is configured; global one-request-per-second behavior still needs multi-instance operational verification. No autocomplete calls are made.
            </p>
            <p className="mt-1 text-[11px] text-[#718276]">
              <strong>Limitation:</strong> Resolves point centroids, not cadastral survey numbers or private property boundaries.
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1a2e23]">OpenStreetMap via Overpass API</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Production gated</span>
            </div>
            <p className="mt-1.5 text-[#556658]">
              <strong>Role:</strong> When a verified HTTPS endpoint is configured, query mapped amenities (transit stops, hospitals, schools, pharmacies, grocery) within 1.2 km radius. The initial pilot returned no valid Overpass responses, so this source must not be presented as currently reliable.
            </p>
            <p className="mt-1 text-[11px] text-[#718276]">
              <strong>Limitation:</strong> Crowdsourced coverage; absence of an amenity pin does not guarantee non-existence on the ground.
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1a2e23]">Open-Meteo Weather API</span>
              <span className="rounded bg-[#e8f1e6] px-2 py-0.5 font-semibold text-[#104c38]">License: CC BY 4.0</span>
            </div>
            <p className="mt-1.5 text-[#556658]">
              <strong>Role:</strong> Weather-model estimates for temperature, humidity, precipitation, wind speed, plus a digital elevation model (DEM); these are not on-site sensor readings.
            </p>
            <p className="mt-1 text-[11px] text-[#718276]">
              <strong>Limitation:</strong> Numerical forecast model at 11 km grid resolution; not a physical sensor on the building facade.
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1a2e23]">Open-Meteo / Copernicus Atmosphere</span>
              <span className="rounded bg-[#e8f1e6] px-2 py-0.5 font-semibold text-[#104c38]">License: Copernicus Open</span>
            </div>
            <p className="mt-1.5 text-[#556658]">
              <strong>Role:</strong> European Air Quality Index (AQI), PM2.5, PM10, and Nitrogen Dioxide.
            </p>
            <p className="mt-1 text-[11px] text-[#718276]">
              <strong>Limitation:</strong> Regional atmospheric reanalysis grid; does not reflect hyper-local pollution from diesel generator banks or construction dust in the adjacent plot.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimers */}
      <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 text-xs leading-relaxed text-amber-900">
        <div className="flex items-center gap-2 font-bold">
          <AlertTriangle size={16} /> Legal & Engineering Non-Certification
        </div>
        <p className="mt-1.5">
          Infracis is an independent location due diligence tool designed to assist prospective buyers and renters in uncovering blind spots. It is not an engineering survey, environmental impact assessment, flood risk guarantee, architectural structural audit, legal title verification, or financial property valuation. Always engage licensed local advocates and qualified civil engineers before executing financial property transactions.
        </p>
      </div>
    </div>
  );
}
