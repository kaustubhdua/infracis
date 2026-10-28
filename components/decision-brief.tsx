"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Database, ShieldCheck } from "lucide-react";
import type { LocationReport } from "@/lib/types";

interface DecisionBriefProps {
  report: LocationReport;
  onCompare: () => void;
}

/**
 * A deterministic, action-first summary built only from the current report.
 * It deliberately does not turn completeness or proximity metrics into a buy/no-buy verdict.
 */
export default function DecisionBrief({ report, onCompare }: DecisionBriefProps) {
  const availableSources = report.sources.filter((source) => source.status === "available").length;
  const unavailableSources = report.sources.length - availableSources;
  const priorityChecks = report.checklist
    .filter((item) => item.priority === "high")
    .slice(0, 3);
  const cautionFindings = report.findings.filter((finding) => finding.riskLevel === "caution");
  const nextChecks = priorityChecks.length > 0
    ? priorityChecks
    : report.checklist.slice(0, 3);

  return (
    <section
      aria-labelledby="decision-brief-title"
      className="overflow-hidden rounded-[1.75rem] border border-[#2f5d74] bg-[#0f2d3d] shadow-[0_18px_45px_rgba(7,20,28,0.28)]"
    >
      <div className="border-b border-[#2d5366] bg-[#123a4d]/95 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#dfeef8]">
            <ShieldCheck size={20} aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.14em]">Decision brief · Evidence-led</span>
          </div>
          <span className="rounded-full border border-[#3b637b] bg-[#173d4d] px-3 py-1 text-[11px] font-semibold text-[#e7edf1]">
            Not a buy/no-buy verdict
          </span>
        </div>
        <h3 id="decision-brief-title" className="mt-2 text-xl font-bold tracking-tight text-[#edf7ff] sm:text-2xl">
          What to verify before you commit
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#c4d1d9]">
          A practical next-step summary for {report.location.label}, generated from this report&apos;s retrieved sources,
          explicit unknowns, and due-diligence checklist—not from a synthetic property score.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
        <div className="rounded-2xl border border-[#2f596f] bg-[#123a4d] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d4e3ec]">
            <Database size={15} aria-hidden="true" className="text-[#f0b482]" /> Source availability
          </div>
          <p className="mt-2 text-2xl font-bold text-[#f4f8fb]">
            {availableSources}<span className="text-sm font-medium text-[#a9c1cc]"> / {report.sources.length}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#c3d2dc]">
            {report.sources.length > 0 && unavailableSources === 0
              ? "All listed sources returned data for this report."
              : `${unavailableSources} listed source${unavailableSources === 1 ? " is" : "s are"} unavailable. Treat related gaps as unknowns.`}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2f596f] bg-[#123a4d] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d4e3ec]">
            <AlertTriangle size={15} aria-hidden="true" className="text-[#f39c6a]" /> Explicit data gaps
          </div>
          <p className="mt-2 text-2xl font-bold text-[#f4f8fb]">{report.unknowns.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#c3d2dc]">
            Unknown or unverified items that should not be interpreted as evidence of safety or danger.
          </p>
        </div>
        <div className="rounded-2xl border border-[#2f596f] bg-[#123a4d] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d4e3ec]">
            <ClipboardCheck size={15} aria-hidden="true" className="text-[#e0b06d]" /> Attention flags
          </div>
          <p className="mt-2 text-2xl font-bold text-[#f4f8fb]">{cautionFindings.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#c3d2dc]">
            Evidence-linked cautions to inspect below; these are prompts for verification, not risk predictions.
          </p>
        </div>
      </div>

      <div className="px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#f0b482]" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-bold text-[#edf7ff]">Your next three checks</h4>
            <p className="mt-1 text-xs leading-relaxed text-[#c3d2dc]">
              Start with the checklist&apos;s highest-priority items. Confirm details directly with official records,
              facility operators, and an on-site visit where appropriate.
            </p>
          </div>
        </div>

        {nextChecks.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {nextChecks.map((item, index) => (
              <li key={item.id} className="flex gap-3 rounded-2xl border border-[#2d5366] bg-[#123a4d] p-3.5 sm:p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0b482] text-xs font-bold text-[#123a4d]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#edf7ff]">{item.question}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      item.priority === "high"
                        ? "bg-[#f7d8b7] text-[#1a3650]"
                        : item.priority === "medium"
                        ? "bg-[#cfe5ef] text-[#153d4e]"
                        : "bg-[#dbe7ee] text-[#1d2e3b]"
                    }`}>
                      {item.priority} priority
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#c5d4dd]">{item.rationale}</p>
                  <p className="mt-2 text-xs text-[#edf7ff]">
                    <span className="font-semibold text-[#f3c19b]">Verify with:</span> {item.verificationSource}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border border-[#2d5366] bg-[#123a4d] p-4 text-sm text-[#d5e2eb]">
            No checklist items were returned for this report. Review the evidence and unknowns directly before making a decision.
          </p>
        )}

        {report.unknowns.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#f39c6a]/60 bg-[#1a3d4f] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#f5b48a]">Do not overlook these gaps</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[#f4d7c4]">
              {report.unknowns.slice(0, 3).map((unknown, index) => <li key={index}>{unknown}</li>)}
            </ul>
            {report.unknowns.length > 3 && (
              <p className="mt-2 text-xs font-medium text-[#f5b48a]">
                Plus {report.unknowns.length - 3} more gap{report.unknowns.length - 3 === 1 ? "" : "s"} in the full report below.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#123a4d] p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[#edf7ff]">Comparing properties?</p>
            <p className="mt-1 text-xs leading-relaxed text-[#d3e0e8]">
              Compare two locations on the same criteria. Missing data stays incomparable rather than being treated as a win.
            </p>
          </div>
          <button
            type="button"
            onClick={onCompare}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f39a66] px-4 py-2.5 text-xs font-bold text-[#123a4d] transition hover:bg-[#f4ab7a] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#123a4d]"
          >
            Compare locations <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#c0ced8]">
          Source timestamps, evidence records, limitations, and the full checklist remain available below. Source availability
          and data completeness describe this report&apos;s coverage—not the property&apos;s quality, safety, legality, or value.
        </p>
      </div>
    </section>
  );
}
