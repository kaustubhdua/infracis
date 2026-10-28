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
      className="overflow-hidden rounded-3xl border border-[#cfded0] bg-white shadow-sm"
    >
      <div className="border-b border-[#dce7dc] bg-[#f1f7ef] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#104c38]">
            <ShieldCheck size={20} aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.14em]">Decision brief · Evidence-led</span>
          </div>
          <span className="rounded-full border border-[#c8d9c9] bg-white px-3 py-1 text-[11px] font-semibold text-[#315b40]">
            Not a buy/no-buy verdict
          </span>
        </div>
        <h3 id="decision-brief-title" className="mt-2 text-xl font-bold tracking-tight text-[#143023] sm:text-2xl">
          What to verify before you commit
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#526357]">
          A practical next-step summary for {report.location.label}, generated from this report&apos;s retrieved sources,
          explicit unknowns, and due-diligence checklist—not from a synthetic property score.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
        <div className="rounded-2xl border border-[#e0e8df] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5d6e61]">
            <Database size={15} aria-hidden="true" /> Source availability
          </div>
          <p className="mt-2 text-2xl font-bold text-[#143023]">
            {availableSources}<span className="text-sm font-medium text-[#6b7b70]"> / {report.sources.length}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#66776b]">
            {report.sources.length > 0 && unavailableSources === 0
              ? "All listed sources returned data for this report."
              : `${unavailableSources} listed source${unavailableSources === 1 ? " is" : "s are"} unavailable. Treat related gaps as unknowns.`}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e0e8df] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5d6e61]">
            <AlertTriangle size={15} aria-hidden="true" /> Explicit data gaps
          </div>
          <p className="mt-2 text-2xl font-bold text-[#143023]">{report.unknowns.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#66776b]">
            Unknown or unverified items that should not be interpreted as evidence of safety or danger.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e0e8df] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5d6e61]">
            <ClipboardCheck size={15} aria-hidden="true" /> Attention flags
          </div>
          <p className="mt-2 text-2xl font-bold text-[#143023]">{cautionFindings.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#66776b]">
            Evidence-linked cautions to inspect below; these are prompts for verification, not risk predictions.
          </p>
        </div>
      </div>

      <div className="px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#247047]" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-bold text-[#143023]">Your next three checks</h4>
            <p className="mt-1 text-xs leading-relaxed text-[#66776b]">
              Start with the checklist&apos;s highest-priority items. Confirm details directly with official records,
              facility operators, and an on-site visit where appropriate.
            </p>
          </div>
        </div>

        {nextChecks.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {nextChecks.map((item, index) => (
              <li key={item.id} className="flex gap-3 rounded-2xl border border-[#e2e9e0] bg-[#fbfcf9] p-3.5 sm:p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6f0e3] text-xs font-bold text-[#104c38]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#183326]">{item.question}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      item.priority === "high"
                        ? "bg-amber-100 text-amber-800"
                        : item.priority === "medium"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {item.priority} priority
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5d6e61]">{item.rationale}</p>
                  <p className="mt-2 text-xs text-[#315b40]">
                    <span className="font-semibold">Verify with:</span> {item.verificationSource}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl bg-[#fbfcf9] p-4 text-sm text-[#526357]">
            No checklist items were returned for this report. Review the evidence and unknowns directly before making a decision.
          </p>
        )}

        {report.unknowns.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Do not overlook these gaps</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-amber-950">
              {report.unknowns.slice(0, 3).map((unknown, index) => <li key={index}>{unknown}</li>)}
            </ul>
            {report.unknowns.length > 3 && (
              <p className="mt-2 text-xs font-medium text-amber-900">
                Plus {report.unknowns.length - 3} more gap{report.unknowns.length - 3 === 1 ? "" : "s"} in the full report below.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#104c38] p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold">Comparing properties?</p>
            <p className="mt-1 text-xs leading-relaxed text-white/80">
              Compare two locations on the same criteria. Missing data stays incomparable rather than being treated as a win.
            </p>
          </div>
          <button
            type="button"
            onClick={onCompare}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#104c38] transition hover:bg-[#edf4ea] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#104c38]"
          >
            Compare locations <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#718275]">
          Source timestamps, evidence records, limitations, and the full checklist remain available below. Source availability
          and data completeness describe this report&apos;s coverage—not the property&apos;s quality, safety, legality, or value.
        </p>
      </div>
    </section>
  );
}
