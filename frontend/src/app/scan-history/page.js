"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearScanHistory,
  getRecentScans,
  saveLastScan,
} from "@/lib/storage";

const gradeStyles = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-rose-500 text-white",
};

export default function ScanHistoryPage() {
  const [scans, setScans] = useState([]);
  const router = useRouter();

  useEffect(() => {
    setScans(getRecentScans());
  }, []);

  const handleScanClick = (scan) => {
    if (!scan.fullScanResult) return;
    saveLastScan(scan.fullScanResult);
    router.push("/scan-result");
  };

  const handleClearHistory = () => {
    clearScanHistory();
    setScans([]);
  };

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link
          href="/scan"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          Back
        </Link>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-[color:var(--ink)]">
                Scan History
              </h1>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {scans.length
                  ? `${scans.length} product${scans.length === 1 ? "" : "s"}`
                  : "No saved scans yet."}
              </p>
            </div>
          </div>
        </section>

        {scans.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-[color:var(--muted)]">
            Scan a product to build your history.
          </section>
        ) : (
          <>
            <div className="space-y-3">
              {scans.map((scan) => (
                <article
                  key={scan.id}
                  onClick={() => handleScanClick(scan)}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md cursor-pointer"
                >
                  {scan.image ? (
                    <img
                      src={scan.image}
                      alt={scan.name}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-600">
                      {scan.name
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">
                      {scan.name}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {scan.brand}
                    </p>
                  </div>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                      gradeStyles[scan.grade] ?? "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {scan.grade}
                  </span>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
              Clear History
            </button>
          </>
        )}
      </div>
    </main>
  );
}
