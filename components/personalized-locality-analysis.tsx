"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, SlidersHorizontal } from "lucide-react";
import type { LocationReport, PreferenceProfile } from "@/lib/types";
import { calculatePersonalFit, PERSONAL_FIT_PROFILES } from "@/lib/personalized-analysis";

const STORAGE_KEY = "infracis_locality_preference_profile";

function readSavedProfile(): PreferenceProfile {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && PERSONAL_FIT_PROFILES.some((profile) => profile.value === value)) {
      return value as PreferenceProfile;
    }
  } catch {
    // Preference persistence is optional; use a neutral profile if storage is unavailable.
  }
  return "balanced";
}

export default function PersonalizedLocalityAnalysis({ report }: { report: LocationReport }) {
  const [profile, setProfile] = useState<PreferenceProfile>("balanced");
  const [storageMessage, setStorageMessage] = useState("");
  const result = useMemo(() => calculatePersonalFit(report, profile), [report, profile]);

  useEffect(() => {
    setProfile(readSavedProfile());
  }, []);

  function updateProfile(next: PreferenceProfile) {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `infracis_analysis_profile=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      setStorageMessage("Preference saved on this device.");
    } catch {
      setStorageMessage("Preference is active for this session but could not be saved in this browser.");
    }
  }

  const selectedProfile = PERSONAL_FIT_PROFILES.find((item) => item.value === profile)!;

  return (
    <section className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="personal-fit-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eaf2e5] text-[#174b38]"><SlidersHorizontal size={19} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 id="personal-fit-title" className="text-base font-semibold text-[#183b2b]">Locality fit for your priorities</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#66776b]">Choose what matters most to you. This personal indicator uses only the report’s available access metrics—not property quality, safety, legal status, or value.</p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-[#33483a]">Your priority profile</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAL_FIT_PROFILES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={profile === item.value}
              onClick={() => updateProfile(item.value)}
              className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] ${profile === item.value ? "border-[#174b38] bg-[#edf4e9] text-[#174b38]" : "border-[#dce5d8] bg-[#fbfcf9] text-[#435548] hover:border-[#9db59f]"}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {profile === item.value ? <CheckCircle2 size={16} aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-current" aria-hidden="true" />}
                {item.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed opacity-80">{item.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 rounded-2xl border border-[#dce5d8] bg-[#fbfcf9] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#718275]">Evidence-based personal fit</p>
            <p className="mt-1 text-xs text-[#718275]">{selectedProfile.label} profile</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight text-[#174b38]">{result.score === null ? "Not scored" : `${result.score}/100`}</p>
            <p className="text-[11px] text-[#718275]">{result.availableMetrics} of {result.totalMetrics} relevant metrics available</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#53675a]">{result.explanation}</p>
        {result.availableMetrics > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(result.weightsUsed).map(([label, weight]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[#435548]">{label}</span>
                <span className="text-[#718275]">{Math.round(weight * 100)}% profile weight</span>
              </div>
            ))}
          </div>
        )}
        {result.missingMetrics.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold"><CircleHelp size={14} aria-hidden="true" /> Not included because evidence is missing</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {result.missingMetrics.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
      {storageMessage && <p role="status" aria-live="polite" className="mt-3 text-xs text-[#53675a]">{storageMessage}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-[#718275]">Your profile is stored locally on this device. No account or cloud sync is used. Scores are conditional on mapped-data coverage and are not recommendations to buy or rent.</p>
    </section>
  );
}
