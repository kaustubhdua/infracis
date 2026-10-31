"use client";

import { useEffect, useRef, useState } from "react";
import { Cookie, Trash2 } from "lucide-react";
import { MAP_THEME_CONFIGS } from "@/lib/map-themes";
import { usePreferences } from "@/lib/use-preferences";

const THEME_NAMES = { original: "Infracis green", "ux4g-white": "UX4G white", "ux4g-dark": "UX4G dark" } as const;

/**
 * Shows exactly what the preferences cookie holds and lets people switch it off
 * or delete it. Nothing here is personal data and nothing is sent to a third party.
 */
export default function PreferencesPanel() {
  const { prefs, update, reset } = usePreferences();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Saved preferences"
        title="Saved preferences"
        className="ix-chip-btn min-h-10 !px-3"
      >
        <Cookie size={14} aria-hidden="true" /> <span className="hidden lg:inline">Preferences</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Saved preferences" className="ix-card absolute right-0 top-12 z-50 w-[19rem] max-w-[calc(100vw-2rem)] p-4 text-xs">
          <h3 className="text-sm font-bold text-[color:var(--ix-ink)]">Saved on this device</h3>
          <p className="mt-1 leading-relaxed text-[color:var(--ix-muted)]">
            One small first-party cookie remembers your display choices. It holds no personal details and is never shared.
          </p>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[color:var(--ix-line)] bg-[color:var(--ix-surface-2)] px-3 py-2.5">
            <span className="font-semibold text-[color:var(--ix-ink)]">Remember my preferences</span>
            <input
              type="checkbox"
              checked={prefs.remember}
              onChange={(event) => {
                const saved = update({ remember: event.target.checked });
                setMessage(event.target.checked ? (saved ? "Preferences will be remembered." : "Your browser blocked cookies.") : "Saving is off. The cookie now stores only this choice.");
              }}
              className="h-4 w-4 accent-[color:var(--ix-brand)]"
            />
          </label>

          {prefs.remember && (
            <dl className="mt-3 space-y-1.5 text-[color:var(--ix-ink-2)]">
              <div className="flex justify-between gap-3"><dt className="text-[color:var(--ix-muted)]">Theme</dt><dd className="font-semibold">{THEME_NAMES[prefs.uiTheme]}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[color:var(--ix-muted)]">Map style</dt><dd className="font-semibold">{MAP_THEME_CONFIGS[prefs.mapTheme].label}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[color:var(--ix-muted)]">Priority profile</dt><dd className="font-semibold capitalize">{prefs.profile}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[color:var(--ix-muted)]">Recent searches</dt><dd className="font-semibold">{prefs.recent.length}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[color:var(--ix-muted)]">Last comparison</dt><dd className="font-semibold">{prefs.compare ? "Saved" : "None"}</dd></div>
            </dl>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={prefs.recent.length === 0 && !prefs.compare}
              onClick={() => { update({ recent: [], compare: null }); setMessage("Search history cleared."); }}
              className="ix-btn ix-btn--ghost ix-btn--sm"
            >
              Clear history
            </button>
            <button
              type="button"
              onClick={() => { reset(); document.documentElement.dataset.theme = "original"; setMessage("Cookie deleted and defaults restored."); }}
              className="ix-btn ix-btn--ghost ix-btn--sm"
            >
              <Trash2 size={13} aria-hidden="true" /> Delete cookie
            </button>
          </div>
          <p role="status" aria-live="polite" className="mt-2 min-h-4 text-[color:var(--ix-muted)]">{message}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--ix-muted)]">Saved reports and your private reviews are stored separately in this browser&apos;s local storage.</p>
        </div>
      )}
    </div>
  );
}
