"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiGetHistory, apiGetFavorites, apiRemoveFavorite } from "@/lib/auth";
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

function Avatar({ name, size = "lg" }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const sz = size === "lg" ? "h-20 w-20 text-2xl" : "h-9 w-9 text-sm";
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-emerald-500 font-bold text-white ${sz}`}>
      {initials}
    </span>
  );
}

function ProductCard({ item, onUnfavorite }) {
  const grade = getGradeFromScore(item.ethical_score);
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
      {item.image_url ? (
        <img src={item.image_url} alt="" className="h-12 w-12 rounded-xl object-contain bg-gray-50" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-400 text-xl">🛒</div>
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
        {onUnfavorite && (
          <button
            type="button"
            onClick={() => onUnfavorite(item.barcode)}
            className="text-rose-400 hover:text-rose-600 transition"
            title="Remove from favourites"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

function HistoryRow({ item }) {
  const grade = getGradeFromScore(item.ethical_score);
  const date  = item.scanned_at
    ? new Date(item.scanned_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    : "";
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
      {item.image_url ? (
        <img src={item.image_url} alt="" className="h-10 w-10 rounded-xl object-contain bg-gray-50" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-400">🛒</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
          {item.product_name || item.barcode}
        </p>
        <p className="text-xs text-[color:var(--muted)]">{date}</p>
      </div>
      {grade && (
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${gradeStyles[grade]}`}>
          {grade}
        </span>
      )}
    </article>
  );
}

export default function ProfilePage() {
  const router             = useRouter();
  const { user, token, logout, loading: authLoading } = useAuth();

  const [activeTab,  setActiveTab]  = useState("history"); // "history" | "favorites"
  const [history,    setHistory]    = useState([]);
  const [favorites,  setFavorites]  = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error,       setError]      = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Load data when user is available
  useEffect(() => {
    if (!user || !token) return;
    setDataLoading(true);
    Promise.all([apiGetHistory(token), apiGetFavorites(token)])
      .then(([histData, favData]) => {
        setHistory(histData.history  || []);
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

  if (!user) return null; // redirect in progress

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
            <Avatar name={user.display_name} size="lg" />
            <div>
              <h1 className="text-xl font-semibold">{user.display_name}</h1>
              <p className="text-sm text-emerald-100">{user.email}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <p className="text-2xl font-bold">{history.length}</p>
              <p className="text-xs text-emerald-100">Products scanned</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <p className="text-2xl font-bold">{favorites.length}</p>
              <p className="text-xs text-emerald-100">Saved products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-md px-6 py-6 space-y-6">

        <div className="flex gap-2 rounded-2xl bg-[color:var(--card)] p-1.5 shadow-sm">
          {[
            { id: "history",   label: "Scan History" },
            { id: "favorites", label: "Favourites"   },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-[color:var(--muted)] hover:text-[color:var(--ink)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
                No scans yet. Scan a product to build your history.
              </div>
            ) : (
              history.map((item) => <HistoryRow key={item.id} item={item} />)
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
                No saved products yet. Tap the heart on any scan result to save it.
              </div>
            ) : (
              favorites.map((item) => (
                <ProductCard key={item.id} item={item} onUnfavorite={handleUnfavorite} />
              ))
            )}
          </div>
        )}

      </div>

      <BottomNav />
    </main>
  );
}