"use client";

import { Shield, Scale, Bookmark, ExternalLink, MapPin } from "lucide-react";

interface NavProps {
  activeTab: "analyze" | "compare" | "methodology";
  setActiveTab: (tab: "analyze" | "compare" | "methodology") => void;
  onOpenSaved: () => void;
}

export default function Nav({ activeTab, setActiveTab, onOpenSaved }: NavProps) {
  return (
    <header className="border-b border-[#e2e9df] bg-[#fbfcf9]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#104c38] text-white shadow-sm">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#143023]">Infracis</span>
              <span className="rounded-full bg-[#e8f1e6] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#104c38] uppercase">
                Due Diligence
              </span>
            </div>
            <p className="hidden text-[11px] text-[#697a6d] sm:block">
              Know the place before the property.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("analyze")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === "analyze"
                ? "bg-[#104c38] text-white shadow-sm"
                : "text-[#556658] hover:bg-[#eef3ea]"
            }`}
          >
            <MapPin size={14} /> <span className="hidden sm:inline">Investigate</span> Location
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compare")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === "compare"
                ? "bg-[#104c38] text-white shadow-sm"
                : "text-[#556658] hover:bg-[#eef3ea]"
            }`}
          >
            <Scale size={14} /> Compare <span className="hidden sm:inline">Locations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("methodology")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === "methodology"
                ? "bg-[#104c38] text-white shadow-sm"
                : "text-[#556658] hover:bg-[#eef3ea]"
            }`}
          >
            Methodology
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce3da] bg-white px-3 py-2 text-xs font-semibold text-[#1a2e23] transition hover:bg-[#f2f7ef]"
          >
            <Bookmark size={14} className="text-[#104c38]" /> Saved
          </button>

          <a
            href="https://github.com/kaustubhdua/infracis"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub Repository"
            className="ml-1 hidden rounded-xl p-2 text-[#5d6e60] hover:bg-[#eef3ea] hover:text-[#143023] md:block"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </header>
  );
}
