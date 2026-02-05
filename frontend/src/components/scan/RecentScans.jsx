"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRecentScans, saveLastScan } from "@/lib/storage";

const gradeStyles = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-rose-500 text-white",
};

export default function RecentScans() {
  const [scans, setScans] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Load scans only on client side after mount
    setScans(getRecentScans());
  }, []);

  const handleScanClick = (scan) => {
    if (!scan.fullScanResult) return;

    saveLastScan(scan.fullScanResult);
    // Navigate to scan result page
    router.push("/scan-result");
  };

  const handleViewAll = () => {
    router.push("/scan-history");
  };

  if (scans.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[color:var(--ink)]">
            Recent Scans
          </h2>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-[color:var(--muted)]">
          No scans yet. Scan a product to see it here.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[color:var(--ink)]">
          Recent Scans
        </h2>
        <button
          type="button"
          onClick={handleViewAll}
          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {scans.map((scan) => (
          <article
            key={scan.id}
            onClick={() => handleScanClick(scan)}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm cursor-pointer transition hover:shadow-md hover:border-emerald-100"
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
    </section>
  );
}
