"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Shield, Scale, Bookmark, ExternalLink, MapPin, Sprout, Sun, Moon, BookOpenText } from "lucide-react";
import PreferencesPanel from "@/components/preferences-panel";
import { usePreferences } from "@/lib/use-preferences";
import type { UiTheme } from "@/lib/preferences";

interface NavProps {
  activeTab: "analyze" | "compare" | "methodology";
  setActiveTab: (tab: "analyze" | "compare" | "methodology") => void;
  onOpenSaved: () => void;
}

const THEME_OPTIONS: Array<{ id: UiTheme; label: string; Icon: typeof Sun }> = [
  { id: "original", label: "Use the original Infracis theme", Icon: Sprout },
  { id: "ux4g-white", label: "Use the UX4G white theme", Icon: Sun },
  { id: "ux4g-dark", label: "Use the UX4G dark theme", Icon: Moon }
];

export default function Nav({ activeTab, setActiveTab, onOpenSaved }: NavProps) {
  const { prefs, ready, update } = usePreferences();

  // The inline script in the layout sets the theme before paint; keep it in sync afterwards.
  useEffect(() => {
    if (ready) document.documentElement.dataset.theme = prefs.uiTheme;
  }, [prefs.uiTheme, ready]);

  const tabButton = (tab: NavProps["activeTab"], label: string, Icon: typeof MapPin) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      aria-pressed={activeTab === tab}
      className={`ix-chip-btn min-h-10 !px-3.5 !text-xs ${activeTab === tab ? "ix-chip-btn--active" : ""}`}
    >
      <Icon size={14} aria-hidden="true" /> {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--ix-line)] bg-[color:var(--ix-surface)] shadow-[0_4px_24px_rgba(25,57,39,0.05)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" aria-label="Infracis home" className="group flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] focus-visible:ring-offset-2">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--ix-brand)] text-white shadow-sm transition-transform duration-200 group-hover:-rotate-3">
            <Shield size={21} strokeWidth={1.8} aria-hidden="true" />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-lg bg-[color:var(--ix-accent)]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-[-0.04em] text-[color:var(--ix-ink)]">infracis<span className="text-[color:var(--ix-accent)]">.</span></span>
              <span className="ix-pill hidden !text-[9px] uppercase tracking-[0.13em] sm:inline-flex">Location intelligence</span>
            </div>
            <p className="hidden items-center gap-1 text-[11px] text-[color:var(--ix-muted)] sm:flex">
              <Sprout size={11} className="text-[color:var(--ix-accent)]" aria-hidden="true" /> Know the place before the property.
            </p>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center gap-1 rounded-2xl border border-[color:var(--ix-line)] bg-[color:var(--ix-surface-2)] p-1 sm:w-auto sm:justify-end">
          {tabButton("analyze", "Investigate", MapPin)}
          {tabButton("compare", "Compare", Scale)}
          {tabButton("methodology", "Methodology", BookOpenText)}
          <Link href="/privacy" className="ix-chip-btn min-h-10 !px-3 !text-xs">Data &amp; privacy</Link>
          <span className="mx-0.5 hidden h-6 w-px bg-[color:var(--ix-line)] sm:block" aria-hidden="true" />
          <button type="button" onClick={onOpenSaved} className="ix-chip-btn min-h-10 !px-3 !text-xs">
            <Bookmark size={14} aria-hidden="true" /> Saved
          </button>
          <PreferencesPanel />
          <div className="flex items-center gap-0.5 rounded-xl border border-[color:var(--ix-line)] p-0.5" role="group" aria-label="Theme">
            {THEME_OPTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => update({ uiTheme: id })}
                aria-label={label}
                aria-pressed={prefs.uiTheme === id}
                className={`ix-chip-btn !p-2 ${prefs.uiTheme === id ? "ix-chip-btn--active" : ""}`}
              >
                <Icon size={13} aria-hidden="true" />
              </button>
            ))}
          </div>
          <a
            href="https://github.com/kaustubhdua/infracis"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Infracis GitHub repository"
            className="ix-chip-btn hidden h-10 w-10 !p-0 md:inline-flex md:items-center md:justify-center"
          >
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}
