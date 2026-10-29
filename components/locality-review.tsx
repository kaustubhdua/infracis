"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, Save, Trash2, MessageSquareText } from "lucide-react";
import {
  LOCALITY_REVIEW_DIMENSIONS,
  normalizeLocalityReviewNote,
  parseLocalityReview,
  type LocalityReviewDimensions,
  type LocalityReviewRecord
} from "@/lib/locality-review";

function cookieEnabled() {
  return document.cookie.split("; ").some((item) => item === "infracis_local_reviews=enabled");
}

function reviewKey(label: string) {
  return `infracis_local_review:${label.trim().toLocaleLowerCase().slice(0, 160)}`;
}

export default function LocalityReview({ locationLabel }: { locationLabel: string }) {
  const [enabled, setEnabled] = useState(false);
  const [rating, setRating] = useState(0);
  const [dimensions, setDimensions] = useState<LocalityReviewDimensions>({});
  const [note, setNote] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Clear the previous locality before reading this location's saved record.
    setRating(0);
    setDimensions({});
    setNote("");
    setSavedAt("");
    setMessage("");

    let optedIn = false;
    try {
      optedIn = cookieEnabled() || localStorage.getItem("infracis_local_reviews_optin") === "1";
      if (optedIn) {
        const raw = localStorage.getItem(reviewKey(locationLabel));
        if (raw) {
          const parsed = parseLocalityReview(JSON.parse(raw));
          if (parsed) {
            setRating(parsed.rating);
            setDimensions(parsed.dimensions);
            setNote(parsed.note);
            setSavedAt(parsed.updatedAt);
          }
        }
      }
    } catch {
      setMessage("This browser could not read local review storage.");
    }
    setEnabled(optedIn);
  }, [locationLabel]);

  function enableLocalNotes() {
    try {
      document.cookie = `infracis_local_reviews=enabled; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      localStorage.setItem("infracis_local_reviews_optin", "1");
      setEnabled(true);
      setMessage("Private local notes enabled for this browser.");
    } catch {
      setMessage("Browser storage is unavailable. Check cookie and site-storage settings.");
    }
  }

  function saveReview(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setMessage("Choose an overall rating from 1 to 5 stars before saving.");
      return;
    }
    try {
      const record: LocalityReviewRecord = {
        rating,
        dimensions,
        note: normalizeLocalityReviewNote(note),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(reviewKey(locationLabel), JSON.stringify(record));
      setNote(record.note);
      setSavedAt(record.updatedAt);
      setMessage("Your private locality experience was saved on this device.");
    } catch {
      setMessage("Could not save this note. Browser storage may be full or disabled.");
    }
  }

  function deleteReview() {
    try {
      localStorage.removeItem(reviewKey(locationLabel));
      setRating(0);
      setDimensions({});
      setNote("");
      setSavedAt("");
      setMessage("Your local note was deleted.");
    } catch {
      setMessage("Could not delete this note from browser storage.");
    }
  }

  function renderRating(label: string, value: number, onChange: (next: number) => void) {
    return (
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`${label} rating out of five stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${label}: ${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={value === star}
            onClick={() => onChange(star)}
            className="rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]"
          >
            <Star size={19} fill={star <= value ? "#e8a23a" : "transparent"} color={star <= value ? "#a96d12" : "#9ba89b"} aria-hidden="true" />
          </button>
        ))}
        <span className="ml-1 min-w-12 text-xs text-[#718275]">{value ? `${value}/5` : "Not rated"}</span>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="locality-review-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f7edda] text-[#875b17]"><MessageSquareText size={19} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 id="locality-review-title" className="text-base font-semibold text-[#183b2b]">Your locality review</h3>
          <p className="mt-1 break-words text-xs text-[#718275]">{locationLabel}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4e9] px-2.5 py-1 text-[10px] font-semibold text-[#315b40]"><ShieldCheck size={12} aria-hidden="true" /> Private</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#53675a]">Record your own experience after visiting this area. Ratings are personal observations stored only in this browser—not public reviews, verified community ratings, or an aggregate score. They do not alter provider evidence or the locality fit score.</p>
      {!enabled ? (
        <button type="button" onClick={enableLocalNotes} className="mt-4 rounded-xl bg-[#174b38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]">Enable private locality notes</button>
      ) : (
        <form onSubmit={saveReview} className="mt-4 space-y-5">
          <fieldset>
            <legend className="text-xs font-semibold text-[#33483a]">Your overall experience <span className="text-rose-600" aria-hidden="true">*</span></legend>
            <div className="mt-2">{renderRating("Overall experience", rating, setRating)}</div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-[#33483a]">Optional experience details</legend>
            <p className="mt-1 text-xs leading-relaxed text-[#718275]">Rate only what you personally observed. Leave a category unrated if you have not assessed it.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {LOCALITY_REVIEW_DIMENSIONS.map((item) => (
                <div key={item.key} className="rounded-2xl border border-[#e3eae0] bg-[#fbfcf9] p-3">
                  <p className="mb-1 text-xs font-semibold text-[#33483a]">{item.label}</p>
                  {renderRating(item.label, dimensions[item.key] ?? 0, (next) => setDimensions((previous) => ({ ...previous, [item.key]: next })))}
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="locality-review-note" className="mb-1.5 block text-xs font-semibold text-[#33483a]">Visit notes (optional)</label>
            <textarea id="locality-review-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 1200))} rows={3} maxLength={1200} placeholder="What did you personally observe? e.g. noise at evening, walkability, street lighting, commute experience…" className="w-full resize-y rounded-2xl border border-[#dce5d8] bg-[#fbfcf9] px-3.5 py-3 text-sm text-[#26382d] outline-none transition placeholder:text-[#9aa79b] focus:border-[#174b38] focus:ring-2 focus:ring-[#174b38]/10" />
            <p className="mt-1 text-right text-[10px] text-[#819084]">{note.length}/1200</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#174b38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]"><Save size={15} aria-hidden="true" /> Save private review</button>
            {savedAt && <button type="button" onClick={deleteReview} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><Trash2 size={15} aria-hidden="true" /> Delete</button>}
          </div>
          {savedAt && <p className="text-[11px] text-[#718275]">Last saved {new Date(savedAt).toLocaleString()} · stored on this device only</p>}
        </form>
      )}
      {message && <p role="status" aria-live="polite" className="mt-3 text-xs text-[#53675a]">{message}</p>}
    </section>
  );
}
