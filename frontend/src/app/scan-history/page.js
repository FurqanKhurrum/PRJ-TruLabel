"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGetHistory } from "@/lib/auth";
import {
  clearScanHistory,
  getRecentScans,
  saveLastScan,
  subscribeRecentScans,
} from "@/lib/storage";
import { getProduct } from "@/lib/api";
import BottomNav from "@/components/ui/BottomNav";

const gradeStyles = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-rose-500 text-white",
};

const EMPTY_SCANS = [];

function normalizeBarcode(barcode) {
  if (barcode == null) return "";
  return String(barcode).trim();
}

function gradeFromScore(score) {
  if (score == null) return null;
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

function gradeFromScores(scores) {
  if (!scores.length) return null;
  const avg = scores.reduce((total, score) => total + score, 0) / scores.length;
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
}

function mergeHistoryScans(serverScans, localScans) {
  const serverBarcodes = new Set(
    serverScans
      .map((scan) => normalizeBarcode(scan?.barcode))
      .filter(Boolean),
  );

  const unsyncedLocalScans = localScans.filter((scan) => {
    const barcode = normalizeBarcode(scan?.barcode);
    return barcode ? !serverBarcodes.has(barcode) : true;
  });

  return [...unsyncedLocalScans, ...serverScans];
}

export default function ScanHistoryPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const localScans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScans,
    () => EMPTY_SCANS,
  );
  const [historyState, setHistoryState] = useState({
    token: null,
    scans: [],
    error: null,
  });

  useEffect(() => {
    if (authLoading || !user || !token) return;

    let cancelled = false;

    apiGetHistory(token)
      .then(({ history }) => {
        if (cancelled) return;
        setHistoryState({
          token,
          scans: history ?? [],
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setHistoryState({
          token,
          scans: [],
          error: "Could not load synced history. Showing recent scans from this device.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user, token, authLoading]);

  const hasCurrentServerHistory = historyState.token === token;
  const loading = Boolean(user && token && !authLoading && !hasCurrentServerHistory);
  const serverScans =
    user && hasCurrentServerHistory ? historyState.scans : EMPTY_SCANS;
  const error = user && hasCurrentServerHistory ? historyState.error : null;
  const scans = user ? mergeHistoryScans(serverScans, localScans) : localScans;

  const handleScanClick = async (scan) => {
    if (scan?.fullScanResult) {
      saveLastScan(scan.fullScanResult);
      router.push("/scan-result");
      return;
    }

    if (!scan?.barcode) return;

    try {
      const data = await getProduct(scan.barcode, token);
      saveLastScan(data);
      router.push("/scan-result");
    } catch {
      router.push("/scan-result");
    }
  };

  const handleClearHistory = () => {
    clearScanHistory();
  };

  const normalised = scans.map((scan) => {
    if (scan?.fullScanResult) {
      const assessment = scan.fullScanResult?.ethical_assessment?.data;
      const scores = assessment
        ? [
            assessment.sustainability_score,
            assessment.labor_practices_score,
            assessment.animal_testing_score,
          ].filter(Number.isFinite)
        : [];

      return {
        id: scan.id,
        barcode: scan.barcode,
        name: scan.name || "Unknown product",
        brand: scan.brand || "",
        image: scan.image || "",
        grade: scan.grade || (scores.length ? gradeFromScores(scores) : null),
        scannedAt: scan.scannedAt || null,
        raw: scan,
      };
    }

    return {
      id: scan.id ?? scan.barcode,
      barcode: scan.barcode,
      name: scan.product_name || "Unknown product",
      brand: scan.brand_name || "",
      image: scan.image_url || "",
      grade: gradeFromScore(scan.ethical_score),
      scannedAt: scan.scanned_at || null,
      raw: scan,
    };
  });

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link
          href="/scan"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm">
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

        <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-[color:var(--ink)]">
                Scan History
              </h1>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {loading
                  ? "Loading..."
                  : normalised.length
                    ? `${normalised.length} product${normalised.length === 1 ? "" : "s"}`
                    : "No scans yet."}
              </p>
            </div>
            {user ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Synced
              </span>
            ) : (
              <span className="rounded-full bg-[color:var(--card-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]">
                Local only
              </span>
            )}
          </div>
        </section>

        {!user && !loading && (
          <section className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-800">
              Sign in to sync history across devices.
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              Sign in
            </Link>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </section>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl bg-[color:var(--card)]"
              />
            ))}
          </div>
        )}

        {!loading && normalised.length === 0 && (
          <section className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
            Scan a product to build your history.
          </section>
        )}

        {!loading && normalised.length > 0 && (
          <>
            <div className="space-y-3">
              {normalised.map((scan) => (
                <article
                  key={scan.id}
                  onClick={() => handleScanClick(scan.raw)}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md"
                >
                  {scan.image ? (
                    <img
                      src={scan.image}
                      alt={scan.name}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-600">
                      {scan.name
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
                      {scan.name}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">{scan.brand}</p>
                    {scan.scannedAt && (
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {new Date(scan.scannedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {scan.grade ? (
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${gradeStyles[scan.grade]}`}
                    >
                      {scan.grade}
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--card-muted)] text-sm font-semibold text-[color:var(--muted)]">
                      -
                    </span>
                  )}
                </article>
              ))}
            </div>

            {!user && (
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
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
