"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  getRecentScans,
  saveLastScan,
  subscribeRecentScans,
} from "@/lib/storage";

const MAX_RESULTS = 4;
const EMPTY_SCANS = [];

export default function HomeSearchCard() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScans,
    () => EMPTY_SCANS
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return [];
    return scans.filter((scan) => {
      const haystack = [
        scan.name ?? "",
        scan.brand ?? "",
        scan.barcode ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, scans]);

  const handleSelect = (scan) => {
    if (!scan?.fullScanResult) return;
    saveLastScan(scan.fullScanResult);
    router.push("/scan-result");
  };

  const handleViewHistory = () => {
    router.push("/scan-history");
  };

  const showEmptyHistory = scans.length === 0;
  const showResults = normalizedQuery.length > 0 && filtered.length > 0;
  const showNoMatches =
    normalizedQuery.length > 0 && !showEmptyHistory && filtered.length === 0;

  return (
    <section className="w-full rounded-3xl bg-[color:var(--card)] p-5 text-left text-[color:var(--ink)] shadow-[0_18px_40px_rgba(16,185,129,0.22)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" />
            <path d="M5 18h6" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold">Welcome back</p>
          <p className="text-xs text-[color:var(--muted)]">
            Ready to shop ethically?
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search product or brand..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-full border border-[color:var(--field-border)] bg-[color:var(--field)] py-3 pl-11 pr-4 text-sm text-[color:var(--ink)] shadow-inner outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {showEmptyHistory ? (
        <p className="mt-4 text-xs text-[color:var(--muted)]">
          No saved scans yet. Scan a product to build your history.
        </p>
      ) : null}

      {showNoMatches ? (
        <p className="mt-4 text-xs text-[color:var(--muted)]">
          No matches found in your scan history.
        </p>
      ) : null}

      {showResults ? (
        <div className="mt-4 space-y-2">
          {filtered.slice(0, MAX_RESULTS).map((scan) => (
            <button
              key={scan.id}
              type="button"
              onClick={() => handleSelect(scan)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-left shadow-sm transition hover:border-emerald-100 hover:shadow-md"
            >
              {scan.image ? (
                <img
                  src={scan.image}
                  alt={scan.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xs font-semibold text-emerald-600">
                  {(scan.name ?? "")
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")}
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold text-[color:var(--ink)]">
                  {scan.name}
                </p>
                <p className="text-[11px] text-[color:var(--muted)]">
                  {scan.brand}
                </p>
              </div>
            </button>
          ))}

          {filtered.length > MAX_RESULTS ? (
            <button
              type="button"
              onClick={handleViewHistory}
              className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              View all matches
            </button>
          ) : null}
        </div>
      ) : null}

      {!normalizedQuery && scans.length > 0 ? (
        <div className="mt-4 text-xs text-[color:var(--muted)]">
          {`${scans.length} saved scan${scans.length === 1 ? "" : "s"}`}
        </div>
      ) : null}
    </section>
  );
}
