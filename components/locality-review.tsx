"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, Save, Trash2, MessageSquareText } from "lucide-react";

interface LocalReview {
  rating: number;
  note: string;
  updatedAt: string;
}

function cookieEnabled() {
  return document.cookie.split("; ").some((item) => item === "infracis_local_reviews=enabled");
}

function reviewKey(label: string) {
  return `infracis_local_review:${label.trim().toLocaleLowerCase().slice(0, 160)}`;
}

export default function LocalityReview({ locationLabel }: { locationLabel: string }) {
  const [enabled, setEnabled] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let optedIn = false;
    try {
      optedIn = cookieEnabled() || localStorage.getItem("infracis_local_reviews_optin") === "1";
      if (optedIn) {
        const raw = localStorage.getItem(reviewKey(locationLabel));
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LocalReview>;
          if (typeof parsed.rating === "number" && parsed.rating >= 1 && parsed.rating <= 5 && typeof parsed.note === "string") {
            setRating(parsed.rating);
            setNote(parsed.note.slice(0, 1200));
            setSavedAt(typeof parsed.updatedAt === "string" ? parsed.updatedAt : "");
          } else {
            setRating(0);
            setNote("");
            setSavedAt("");
          }
        } else {
          setRating(0);
          setNote("");
          setSavedAt("");
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
      setMessage("Choose a rating from 1 to 5 stars before saving.");
      return;
    }
    try {
      const record: LocalReview = { rating, note: note.trim().slice(0, 1200), updatedAt: new Date().toISOString() };
      localStorage.setItem(reviewKey(locationLabel), JSON.stringify(record));
      setSavedAt(record.updatedAt);
      setMessage("Your private note was saved on this device.");
    } catch {
      setMessage("Could not save this note. Browser storage may be full or disabled.");
    }
  }

  function deleteReview() {
    try {
      localStorage.removeItem(reviewKey(locationLabel));
      setRating(0);
      setNote("");
      setSavedAt("");
      setMessage("Your local note was deleted.");
    } catch {
      setMessage("Could not delete this note from browser storage.");
    }
  }

  return (
    <section className="rounded-3xl border border-[#dce5d8] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="locality-review-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f7edda] text-[#875b17]"><MessageSquareText size={19} /></span>
        <div className="min-w-0 flex-1">
          <h3 id="locality-review-title" className="text-base font-semibold text-[#183b2b]">Your locality review</h3>
          <p className="mt-1 break-words text-xs text-[#718275]">{locationLabel}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4e9] px-2.5 py-1 text-[10px] font-semibold text-[#315b40]"><ShieldCheck size={12} /> Private</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#53675a]">Record your own experience after visiting this area. This is a personal note stored only in this browser—not a public review, verified community rating, or aggregate score.</p>
      {!enabled ? (
        <button type="button" onClick={enableLocalNotes} className="mt-4 rounded-xl bg-[#174b38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]">Enable private locality notes</button>
      ) : (
        <form onSubmit={saveReview} className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-[#33483a]">Your overall experience</legend>
            <div className="mt-2 flex items-center gap-1" role="group" aria-label="Your rating out of five stars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} onClick={() => setRating(value)} className="rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]">
                  <Star size={23} fill={value <= rating ? "#e8a23a" : "transparent"} color={value <= rating ? "#a96d12" : "#9ba89b"} />
                </button>
              ))}
              <span className="ml-2 text-xs text-[#718275]">{rating ? `${rating}/5` : "Not rated"}</span>
            </div>
          </fieldset>
          <div>
            <label htmlFor="locality-review-note" className="mb-1.5 block text-xs font-semibold text-[#33483a]">Visit notes (optional)</label>
            <textarea id="locality-review-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 1200))} rows={3} maxLength={1200} placeholder="What did you personally observe? e.g. noise at evening, walkability, street lighting, commute experience…" className="w-full resize-y rounded-2xl border border-[#dce5d8] bg-[#fbfcf9] px-3.5 py-3 text-sm text-[#26382d] outline-none transition placeholder:text-[#9aa79b] focus:border-[#174b38] focus:ring-2 focus:ring-[#174b38]/10" />
            <p className="mt-1 text-right text-[10px] text-[#819084]">{note.length}/1200</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#174b38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a]"><Save size={15} /> Save private note</button>
            {savedAt && <button type="button" onClick={deleteReview} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"><Trash2 size={15} /> Delete</button>}
          </div>
          {savedAt && <p className="text-[11px] text-[#718275]">Last saved {new Date(savedAt).toLocaleString()} · stored on this device only</p>}
        </form>
      )}
      {message && <p role="status" aria-live="polite" className="mt-3 text-xs text-[#53675a]">{message}</p>}
    </section>
  );
}
