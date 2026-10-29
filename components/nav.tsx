"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Scale, Bookmark, ExternalLink, MapPin, Sprout, Sun, Moon, Palette } from "lucide-react";

interface NavProps {
  activeTab: "analyze" | "compare" | "methodology";
  setActiveTab: (tab: "analyze" | "compare" | "methodology") => void;
  onOpenSaved: () => void;
}

export default function Nav({ activeTab, setActiveTab, onOpenSaved }: NavProps) {
  const [theme, setTheme] = useState<"original" | "ux4g-white" | "ux4g-dark">("original");
  const [themeStorageMessage, setThemeStorageMessage] = useState("");

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("infracis-theme");
      if (savedTheme === "original" || savedTheme === "ux4g-white" || savedTheme === "ux4g-dark") {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch {
      // The default theme remains usable when browser storage is blocked.
    }
  }, []);

  const changeTheme = (nextTheme: "original" | "ux4g-white" | "ux4g-dark") => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem("infracis-theme", nextTheme);
      setThemeStorageMessage("Theme preference saved on this device.");
    } catch {
      setThemeStorageMessage("Theme changed for this session, but browser storage is blocked so it could not be remembered.");
    }
  };

  const navClass = (tab: NavProps["activeTab"]) =>
    `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] focus-visible:ring-offset-2 ${
      activeTab === tab
        ? "bg-[#174b38] text-white shadow-sm"
        : "text-[#53685a] hover:bg-[#eaf0e5] hover:text-[#174b38]"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#dce4d8] bg-[#f8f8f1]/95 shadow-[0_4px_24px_rgba(25,57,39,0.04)] backdrop-blur-xl">
      <span className="sr-only" role="status" aria-live="polite">{themeStorageMessage}</span>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" aria-label="Infracis home" className="group flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] focus-visible:ring-offset-2">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#174b38] text-white shadow-sm transition-transform duration-200 group-hover:-rotate-2">
            <Shield size={21} strokeWidth={1.8} />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-lg bg-[#e8a23a]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-[-0.04em] text-[#153a2b]">infracis<span className="text-[#d99128]">.</span></span>
              <span className="rounded-full border border-[#d9e5d5] bg-[#edf3e9] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[#315b40]">
                Location intelligence
              </span>
            </div>
            <p className="hidden items-center gap-1 text-[11px] text-[#6b7c6d] sm:flex">
              <Sprout size={11} className="text-[#d99128]" /> Know the place before the property.
            </p>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center gap-1 rounded-2xl border border-[#e2e8dd] bg-white/80 p-1 sm:w-auto sm:justify-end">
          <button type="button" onClick={() => setActiveTab("analyze")} aria-pressed={activeTab === "analyze"} className={navClass("analyze")}>
            <MapPin size={14} /> Investigate
          </button>
          <button type="button" onClick={() => setActiveTab("compare")} aria-pressed={activeTab === "compare"} className={navClass("compare")}>
            <Scale size={14} /> Compare
          </button>
          <button type="button" onClick={() => setActiveTab("methodology")} aria-pressed={activeTab === "methodology"} className={navClass("methodology")}>
            Methodology
          </button>
          <Link href="/privacy" className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold text-[#53685a] transition hover:bg-[#eaf0e5] hover:text-[#174b38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] focus-visible:ring-offset-2">Data &amp; privacy</Link>
          <span className="mx-0.5 hidden h-6 w-px bg-[#e2e8dd] sm:block" aria-hidden="true" />
          <button
            type="button"
            onClick={onOpenSaved}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-[#315b40] transition hover:border-[#dce4d8] hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] focus-visible:ring-offset-2"
          >
            <Bookmark size={14} /> Saved
          </button>
          <div className="flex items-center gap-0.5 rounded-xl border border-[#e2e8dd] bg-white/70 p-0.5" aria-label="Theme">
            <Palette size={13} className="mx-1 text-[#627365]" aria-hidden="true" />
            <button type="button" onClick={() => changeTheme("original")} aria-label="Use original Infracis theme" aria-pressed={theme === "original"} className={`rounded-lg p-2 transition ${theme === "original" ? "bg-[#174b38] text-white" : "text-[#53685a] hover:bg-[#eaf0e5]"}`}>
              <Sprout size={13} />
            </button>
            <button type="button" onClick={() => changeTheme("ux4g-white")} aria-label="Use UX4G white theme" aria-pressed={theme === "ux4g-white"} className={`rounded-lg p-2 transition ${theme === "ux4g-white" ? "bg-[#0b5cab] text-white" : "text-[#53685a] hover:bg-[#eaf0e5]"}`}>
              <Sun size={13} />
            </button>
            <button type="button" onClick={() => changeTheme("ux4g-dark")} aria-label="Use UX4G dark theme" aria-pressed={theme === "ux4g-dark"} className={`rounded-lg p-2 transition ${theme === "ux4g-dark" ? "bg-[#102a43] text-white" : "text-[#53685a] hover:bg-[#eaf0e5]"}`}>
              <Moon size={13} />
            </button>
          </div>
          <a
            href="https://github.com/kaustubhdua/infracis"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Infracis GitHub repository"
            className="hidden h-10 w-10 items-center justify-center rounded-xl text-[#627365] transition hover:bg-[#edf3e9] hover:text-[#174b38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] md:flex"
          >
            <ExternalLink size={16} />
          </a>
        </nav>
      </div>
    </header>
  );
}
