"use client";

import { useState } from "react";
import { DueDiligenceItem } from "@/lib/types";
import { CheckSquare, Printer, ChevronDown, ChevronUp } from "lucide-react";

interface ChecklistSectionProps {
  checklist: DueDiligenceItem[];
  locationLabel?: string;
}

export default function ChecklistSection({ checklist }: ChecklistSectionProps) {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-3xl border border-[#dce3da] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="text-[#104c38]" size={20} />
            <h3 className="text-lg font-semibold tracking-tight text-[#1a2e23]">
              On-Ground Due Diligence Checklist
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#627367]">
            Print or take this customized checklist when visiting the property. Answers cannot be
            assumed from map data alone.
          </p>
        </div>
        <button
          onClick={handlePrint}
          type="button"
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[#dce3da] bg-[#fbfcf9] px-3.5 py-2 text-xs font-semibold text-[#104c38] transition hover:bg-[#eef3eb]"
        >
          <Printer size={14} /> Print Checklist
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {checklist.map((item) => {
          const isChecked = Boolean(checkedIds[item.id]);
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition ${
                isChecked
                  ? "border-[#cce0d2] bg-[#f4fbf5]"
                  : "border-[#e6ede4] bg-[#fbfcf9] hover:border-[#ccd7c9]"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`chk-${item.id}`}
                  checked={isChecked}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#104c38] focus:ring-[#104c38]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor={`chk-${item.id}`}
                      className={`text-sm font-semibold cursor-pointer ${
                        isChecked ? "line-through text-[#66776b]" : "text-[#1a2e23]"
                      }`}
                    >
                      {item.question}
                    </label>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.priority === "high"
                          ? "bg-rose-100 text-rose-800"
                          : item.priority === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#5f7064]">
                    <span className="font-medium text-[#3b4c40]">Category:</span> {item.category}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#718276]">
                      <span className="font-semibold text-[#104c38]">Action:</span> {item.verificationSource}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#104c38] hover:underline"
                    >
                      {isExpanded ? <>Less <ChevronUp size={12} /></> : <>Why it matters <ChevronDown size={12} /></>}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-relaxed text-[#506155] border border-[#e5ece2]">
                      <span className="font-semibold text-[#1a2e23]">Rationale: </span>
                      {item.rationale}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
