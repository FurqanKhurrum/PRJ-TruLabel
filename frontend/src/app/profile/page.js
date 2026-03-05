"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiGetHistory, apiGetFavorites, apiRemoveFavorite } from "@/lib/auth";
import { getProduct } from "@/lib/api";
import { getRecentScanByBarcode, saveLastScan } from "@/lib/storage";
import BottomNav from "@/components/ui/BottomNav";

const gradeStyles = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-rose-500 text-white",
};

function getGradeFromScore(score) {
  if (score == null) return null;
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

function Avatar({ name }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-2xl font-bold text-white">
      {initials}
    </span>
  );
}

function toSavedScanResult(item, lookupData) {
  const product = lookupData?.product;
  return {
    barcode: item.barcode,
    ethical_assessment: lookupData?.ethical_assessment,
    product:
      product ?? {
        barcode: item.barcode,
        product_name: item.product_name || "Unknown product",
        brand_name: item.brand_name || "Unknown brand",
        image_url: item.image_url || "",
        product_type: item.product_type || "general",
        ethical_score: item.ethical_score ?? null,
      },
  };
}

function FavoriteCard({ item, onOpen, onUnfavorite }) {
  const grade = getGradeFromScore(item.ethical_score);
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      }}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md"
    >
      {item.image_url ? (
        <img src={item.image_url} alt="" className="h-12 w-12 rounded-xl object-contain bg-gray-50" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl">🛒</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
          {item.product_name || "Unknown product"}
        </p>
        <p className="truncate text-xs text-[color:var(--muted)]">{item.brand_name || ""}</p>
      </div>
      <div className="flex items-center gap-2">
        {grade && (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${gradeStyles[grade]}`}>
            {grade}
          </span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onUnfavorite(item.barcode);
          }}
          className="text-rose-400 hover:text-rose-600 transition"
          title="Remove from favourites"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </article>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout, loading: authLoading } = useAuth();

  const [totalScans,  setTotalScans]  = useState(0);
  const [favorites,   setFavorites]   = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !token) return;
    Promise.all([apiGetHistory(token, 200), apiGetFavorites(token)])
      .then(([histData, favData]) => {
        setTotalScans(histData.total ?? 0);
        setFavorites(favData.favorites || []);
      })
      .catch(() => setError("Failed to load your data. Please try again."))
      .finally(() => setDataLoading(false));
  }, [user, token]);

  const handleUnfavorite = async (barcode) => {
    try {
      await apiRemoveFavorite(token, barcode);
      setFavorites((prev) => prev.filter((f) => f.barcode !== barcode));
    } catch {
      setError("Failed to remove favourite.");
    }
  };

  const handleOpenFavorite = async (item) => {
    if (!item?.barcode) {
      setError("Unable to open this product.");
      return;
    }

    const recentScan = getRecentScanByBarcode(item.barcode);
    if (recentScan?.fullScanResult) {
      saveLastScan(recentScan.fullScanResult);
      router.push("/scan-result");
      return;
    }

    try {
      const lookup = await getProduct(item.barcode);
      saveLastScan(toSavedScanResult(item, lookup));
      router.push("/scan-result");
    } catch {
      saveLastScan(toSavedScanResult(item));
      router.push("/scan-result");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--canvas)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] pb-28">

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 px-6 pt-12 pb-8 text-white">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/scan" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
            >
              Sign out
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Avatar name={user.display_name} />
            <div>
              <h1 className="text-xl font-semibold">{user.display_name}</h1>
              <p className="text-sm text-emerald-100">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <p className="text-2xl font-bold">{totalScans}</p>
              <p className="text-xs text-emerald-100">Products scanned</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <p className="text-2xl font-bold">{favorites.length}</p>
              <p className="text-xs text-emerald-100">Saved products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Favourites list */}
      <div className="mx-auto max-w-md px-6 py-6 space-y-4">
        <h2 className="text-base font-semibold text-[color:var(--ink)]">Saved Products</h2>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
            No saved products yet.
            <br className="my-1" />
            Tap the ♡ on any scan result to save it here.
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                onOpen={handleOpenFavorite}
                onUnfavorite={handleUnfavorite}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
