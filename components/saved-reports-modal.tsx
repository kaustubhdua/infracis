"use client";

import { useState, useEffect } from "react";
import { LocationReport } from "@/lib/types";
import { Bookmark, Trash2, Download, X } from "lucide-react";

interface SavedReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport: (report: LocationReport) => void;
}

export function saveReportToStorage(report: LocationReport) {
  try {
    const raw = localStorage.getItem("infracis_saved_reports");
    const reports: LocationReport[] = raw ? JSON.parse(raw) : [];
    const exists = reports.find((r) => r.id === report.id || r.location.label === report.location.label);
    if (!exists) {
      reports.unshift(report);
      localStorage.setItem("infracis_saved_reports", JSON.stringify(reports.slice(0, 20)));
    }
  } catch (err) {
    console.error("Failed to save report to local storage", err);
  }
}

export function exportReportJson(report: LocationReport) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `infracis-due-diligence-${report.location.label.slice(0, 25).replace(/\s+/g, "_")}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export default function SavedReportsModal({
  isOpen,
  onClose,
  onSelectReport
}: SavedReportsModalProps) {
  const [reports, setReports] = useState<LocationReport[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem("infracis_saved_reports");
        if (raw) setReports(JSON.parse(raw));
      } catch {
        setReports([]);
      }
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = reports.filter((r) => r.id !== id);
    setReports(updated);
    localStorage.setItem("infracis_saved_reports", JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-[#dce3da] bg-white p-6 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#e9efe7] pb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="text-[#104c38]" size={20} />
            <h3 className="text-lg font-semibold text-[#1a2e23]">Saved Location Reports</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3">
          {reports.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#738477]">
              No saved reports yet. When viewing any analyzed location, click &quot;Save Report&quot; to bookmark it for future review.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => {
                  onSelectReport(rep);
                  onClose();
                }}
                className="group cursor-pointer rounded-2xl border border-[#e5ece2] bg-[#fbfcf9] p-4 transition hover:border-[#104c38] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a2e23] group-hover:text-[#104c38]">
                      {rep.location.label}
                    </h4>
                    <p className="mt-1 text-xs text-[#6e8073]">
                      Saved {new Date(rep.generatedAt).toLocaleDateString()} · Completeness: {rep.scores.completenessScore}%
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportReportJson(rep);
                      }}
                      title="Export Auditable JSON"
                      className="rounded-lg p-1.5 text-[#5e7063] hover:bg-[#eef3eb] hover:text-[#104c38]"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(rep.id, e)}
                      title="Delete Report"
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
