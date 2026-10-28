"use client";

import { EvidenceRecord, EvidenceClassification } from "@/lib/types";
import { ExternalLink, CheckCircle2, Calculator, Sparkles, HelpCircle } from "lucide-react";

interface EvidenceCardProps {
  evidence: EvidenceRecord;
}

export function getClassificationBadge(classification: EvidenceClassification) {
  switch (classification) {
    case "observed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-800 border border-emerald-200 uppercase">
          <CheckCircle2 size={12} /> Observed Fact
        </span>
      );
    case "provider_model":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-indigo-800 border border-indigo-200 uppercase">
          <Sparkles size={12} /> Provider Model Output
        </span>
      );
    case "calculated":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-sky-800 border border-sky-200 uppercase">
          <Calculator size={12} /> Calculated Metric
        </span>
      );
    case "model_interpretation":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-purple-800 border border-purple-200 uppercase">
          <Sparkles size={12} /> Model Interpretation
        </span>
      );
    case "unknown":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-amber-800 border border-amber-200 uppercase">
          <HelpCircle size={12} /> Unknown / Unverified
        </span>
      );
  }
}

export default function EvidenceCard({ evidence }: EvidenceCardProps) {
  return (
    <div className="rounded-2xl border border-[#e2e8e0] bg-white p-4 shadow-sm transition hover:border-[#104c38]/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#738578]">
            ID: {evidence.id} · {evidence.category}
          </span>
          <h4 className="text-sm font-semibold text-[#1a2e23]">{evidence.title}</h4>
        </div>
        {getClassificationBadge(evidence.classification)}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#104c38]">
          {evidence.value !== null ? String(evidence.value) : "—"}
        </span>
        {evidence.unit && (
          <span className="text-xs font-medium text-[#687a6e]">{evidence.unit}</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-[#f8faf7] p-2.5 text-xs text-[#526357]">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[#2d4034]">Source: {evidence.provider}</span>
          {evidence.sourceUrl && (
            <a
              href={evidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#104c38] underline hover:text-[#0b3325]"
            >
              Verify <ExternalLink size={11} />
            </a>
          )}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#687a6e]">
          <span className="font-medium text-[#44564b]">Limitation:</span> {evidence.limitations}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-[#8fa094]">
        <span>Retrieved: {new Date(evidence.retrievedAt).toLocaleTimeString()}</span>
        {evidence.observedAt && (
          <span>Observed: {new Date(evidence.observedAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
