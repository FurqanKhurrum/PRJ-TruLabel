"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGetHistory } from "@/lib/auth";
import { getRecentScans, clearScanHistory, saveLastScan } from "@/lib/storage";
import { getProduct } from "@/lib/api";
import BottomNav from "@/components/ui/BottomNav";

const gradeStyles = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-rose-500 text-white",
};

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
  const avg = scores.reduce((t, s) => t + s, 0) / scores.length;
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
}

export default function ScanHistoryPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();

  // For guests, seed state directly from localStorage — no effect needed
  const [scans, setScans]     = useState(() => (typeof window !== "undefined" ? getRecentScans() : []));
  // Guests are already loaded from localStorage; logged-in users need a fetch
  const [loading, setLoading] = useState(() => typeof window !== "undefined" && !!localStorage.getItem("trulabel_token"));
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (user && token) {
      // Logged in — fetch from backend (replaces the localStorage seed)
      apiGetHistory(token)
        .then(({ history }) => setScans(history ?? []))
        .catch(() => setError("Could not load history from server."))
        .finally(() => setLoading(false));
    }
    // Guest branch: loading was already initialised to false
  }, [user, token, authLoading]);

  const handleScanClick = async (scan) => {
    if (user && token) {
      // Server-side history items don't have fullScanResult stored —
      // re-fetch the product from the backend to get the full data
      try {
        const data = await getProduct(scan.barcode);
        saveLastScan(data);
        router.push("/scan-result");
      } catch {
        // Product still in cache — try navigating anyway
        router.push("/scan-result");
      }
    } else {
      // Guest — fullScanResult is stored locally
      if (!scan.fullScanResult) return;
      saveLastScan(scan.fullScanResult);
      router.push("/scan-result");
    }
  };

  const handleClearHistory = () => {
    clearScanHistory();
    setScans([]);
  };

  // Normalise both server and local scan shapes into one display shape
  const normalised = scans.map((scan) => {
    if (user) {
      // Server shape: { barcode, product_name, brand_name, image_url, ethical_score, scanned_at }
      return {
        id: scan.id ?? scan.barcode,
        barcode: scan.barcode,
        name: scan.product_name || "Unknown product",
        brand: scan.brand_name || "",
        image: scan.image_url || "",
        grade: gradeFromScore(scan.ethical_score),
        scannedAt: scan.scanned_at,
        raw: scan,
      };
    } else {
      // Local shape: { id, name, brand, image, grade, fullScanResult }
      const assessment = scan.fullScanResult?.ethical_assessment?.data;
      const scores = assessment
        ? [assessment.sustainability_score, assessment.labor_practices_score, assessment.animal_testing_score].filter(Number.isFinite)
        : [];
      return {
        id: scan.id,
        barcode: scan.barcode,
        name: scan.name || "Unknown product",
        brand: scan.brand || "",
        image: scan.image || "",
        grade: scan.grade || (scores.length ? gradeFromScores(scores) : null),
        scannedAt: null,
        raw: scan,
      };
    }
  });

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">

        {/* Back */}
        <Link href="/scan" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          Back
        </Link>

        {/* Header */}
        <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-[color:var(--ink)]">Scan History</h1>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {loading ? "Loading…" : normalised.length
                  ? `${normalised.length} product${normalised.length === 1 ? "" : "s"}`
                  : "No scans yet."}
              </p>
            </div>
            {/* Sync badge */}
            {user ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                ☁ Synced
              </span>
            ) : (
              <span className="rounded-full bg-[color:var(--card-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]">
                Local only
              </span>
            )}
          </div>
        </section>

        {/* Guest sign-in prompt */}
        {!user && !loading && (
          <section className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-800">Sign in to sync history across devices.</p>
            <Link href="/login" className="text-sm font-semibold text-emerald-700 hover:underline">
              Sign in →
            </Link>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </section>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-[color:var(--card)]" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && normalised.length === 0 && (
          <section className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
            Scan a product to build your history.
          </section>
        )}

        {/* Scan list */}
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
                    <img src={scan.image} alt={scan.name} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-600">
                      {scan.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--ink)]">{scan.name}</p>
                    <p className="text-xs text-[color:var(--muted)]">{scan.brand}</p>
                    {scan.scannedAt && (
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {new Date(scan.scannedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {scan.grade ? (
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${gradeStyles[scan.grade]}`}>
                      {scan.grade}
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--card-muted)] text-sm font-semibold text-[color:var(--muted)]">
                      —
                    </span>
                  )}
                </article>
              ))}
            </div>

            {/* Clear button — only for guests (server history is permanent) */}
            {!user && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
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