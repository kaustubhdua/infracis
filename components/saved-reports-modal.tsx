"use client";

import { useState, useEffect, useRef } from "react";
import { LocationReport } from "@/lib/types";
import { readStoredReports, exportReportJson } from "@/lib/browser-saved-reports";
import { Bookmark, Trash2, Download, X } from "lucide-react";

interface SavedReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport: (report: LocationReport) => void;
}

export default function SavedReportsModal({
  isOpen,
  onClose,
  onSelectReport
}: SavedReportsModalProps) {
  const [reports, setReports] = useState<LocationReport[]>([]);
  const [storageError, setStorageError] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      setReports(readStoredReports());
      setStorageError("");
    } catch {
      setReports([]);
      setStorageError("Saved reports could not be read from this browser. You can still export a report from the analysis screen.");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      )).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const handleDelete = (id: string) => {
    const updated = reports.filter((r) => r.id !== id);
    try {
      localStorage.setItem("infracis_saved_reports", JSON.stringify(updated));
      setReports(updated);
      setStorageError("");
    } catch {
      setStorageError("This browser could not update saved reports. Check storage permissions and try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-reports-title"
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-3xl border border-[#dce3da] bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e9efe7] pb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="shrink-0 text-[#104c38]" size={20} aria-hidden="true" />
            <div>
              <h3 id="saved-reports-title" className="text-lg font-semibold text-[#1a2e23]">Saved Location Reports</h3>
              <p className="mt-1 text-xs text-[#738477]">Stored only in this browser on this device. Cloud sync is not available.</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close saved location reports"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78b21]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {storageError && (
          <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {storageError}
          </p>
        )}

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {reports.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#738477]">
              No browser-local reports yet. Analyze a location and choose &quot;Save Locally&quot; to keep a copy in this browser.
            </div>
          ) : (
            reports.map((rep) => (
              <article
                key={rep.id}
                className="group rounded-2xl border border-[#e5ece2] bg-[#fbfcf9] p-4 transition hover:border-[#104c38] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectReport(rep);
                      onClose();
                    }}
                    className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78b21]"
                  >
                    <span className="block break-words text-sm font-semibold text-[#1a2e23] group-hover:text-[#104c38]">
                      {rep.location.label}
                    </span>
                    <span className="mt-1 block text-xs text-[#6e8073]">
                      Saved {new Date(rep.generatedAt).toLocaleDateString()} · Completeness: {rep.scores.completenessScore}%
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-[#315b40]">Open report</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => exportReportJson(rep)}
                      aria-label={`Export ${rep.location.label} report as JSON`}
                      title="Export report as JSON"
                      className="rounded-lg p-2 text-[#5e7063] transition hover:bg-[#eef3eb] hover:text-[#104c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d78b21]"
                    >
                      <Download size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rep.id)}
                      aria-label={`Delete ${rep.location.label} report`}
                      title="Delete report"
                      className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
