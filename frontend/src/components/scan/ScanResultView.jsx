"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScoreCard from "@/components/scan/ScoreCard";
import BottomNav from "@/components/ui/BottomNav";
import { getLastScan } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { apiAddFavorite, apiRemoveFavorite, apiGetFavorites } from "@/lib/auth";

const scoreIcons = {
  sustainability: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 4 13c0-7 7-9 7-9s7 2 7 9a7 7 0 0 1-7 7Z" />
      <path d="M8 15c2 1 4 1 6 0" />
    </svg>
  ),
  labor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11a4 4 0 0 1-8 0" />
      <path d="M12 2a4 4 0 0 1 4 4v2" />
      <path d="M8 8V6a4 4 0 0 1 4-4" />
      <path d="M3 22a6 6 0 0 1 18 0" />
    </svg>
  ),
  testing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v7c0 4-3 7-7 7s-7-3-7-7V7l7-4Z" />
    </svg>
  ),
};

const productTypeConfig = {
  food:        { icon: "🍎", color: "emerald", label: "Food & Beverage" },
  electronics: { icon: "📱", color: "blue",    label: "Electronics" },
  cosmetics:   { icon: "💄", color: "pink",    label: "Cosmetics" },
  book:        { icon: "📚", color: "amber",   label: "Book" },
  general:     { icon: "📦", color: "slate",   label: "General Product" },
};

const tabs = ["overview", "details", "insights", "sources"];

const gradeStyles = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-rose-500 text-white",
};

const gradeFromScores = (scores) => {
  if (!scores.length) return "-";
  const average = scores.reduce((total, score) => total + score, 0) / scores.length;
  if (average >= 80) return "A";
  if (average >= 70) return "B";
  if (average >= 60) return "C";
  if (average >= 50) return "D";
  return "F";
};

const normalizeSourceUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  let trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  try { return new URL(trimmed).toString(); } catch { return ""; }
};

const getHostFromUrl = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};

const confidenceConfig = {
  high:   { label: "High Confidence",   className: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Medium Confidence", className: "bg-amber-100 text-amber-700" },
  low:    { label: "Low Confidence",    className: "bg-rose-100 text-rose-700" },
};

export default function ScanResultView() {
  const router = useRouter();
  const [scanResult]  = useState(() => getLastScan());
  const [activeTab,   setActiveTab]   = useState("overview");
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading,  setFavLoading]  = useState(false);

  const { user, token } = useAuth();

  const product    = scanResult?.product ?? null;
  const assessment = scanResult?.ethical_assessment?.data ?? null;
  const productType  = product?.product_type || "general";
  const typeConfig   = productTypeConfig[productType] || productTypeConfig.general;

  useEffect(() => {
    if (!user || !token || !scanResult?.barcode) return;
    apiGetFavorites(token)
      .then(({ favorites }) => {
        setIsFavorited(favorites.some((f) => f.barcode === scanResult.barcode));
      })
      .catch(() => {});
  }, [user, token, scanResult?.barcode]);

  const handleToggleFavorite = async () => {
    if (!user) { router.push("/login"); return; }
    setFavLoading(true);
    try {
      if (isFavorited) {
        await apiRemoveFavorite(token, scanResult.barcode);
        setIsFavorited(false);
      } else {
        await apiAddFavorite(token, scanResult.barcode);
        setIsFavorited(true);
      }
    } catch (e) {
      console.error("Favourite toggle failed", e);
    } finally {
      setFavLoading(false);
    }
  };

  const scores = useMemo(() => {
    if (!assessment) return [];
    return [
      { id: "sustainability", label: "Sustainability",  score: assessment.sustainability_score,  icon: scoreIcons.sustainability },
      { id: "labor",          label: "Labor Practices", score: assessment.labor_practices_score, icon: scoreIcons.labor },
      { id: "testing",        label: "Animal Testing",  score: assessment.animal_testing_score,  icon: scoreIcons.testing },
    ].filter((item) => Number.isFinite(item.score));
  }, [assessment]);

  const grade = useMemo(() => gradeFromScores(scores.map((item) => item.score)), [scores]);

  // Merge certifications from product labels AND AI-found certifications
  const certifications = useMemo(() => {
    const fromLabels = product?.labels
      ? product.labels.split(",").map((l) => l.trim()).filter(Boolean)
      : [];
    const fromAI = Array.isArray(assessment?.certifications) ? assessment.certifications : [];
    const merged = [...new Set([...fromAI, ...fromLabels])];
    return merged.slice(0, 8);
  }, [product, assessment]);

  const detailScores = useMemo(() => {
    if (!assessment) return [];
    return [
      { id: "sustainability", title: "Sustainability Score",  score: assessment.sustainability_score,  description: assessment.sustainability_description  || "Not available." },
      { id: "labor",          title: "Labor Practices",       score: assessment.labor_practices_score, description: assessment.labor_practices_description || "Not available." },
      { id: "testing",        title: "Animal Testing Policy", score: assessment.animal_testing_score,  description: assessment.animal_testing_description  || "Not available." },
    ];
  }, [assessment]);

  const alternatives = useMemo(() => {
    if (!Array.isArray(assessment?.alternatives)) return [];
    return assessment.alternatives.filter((a) => a?.name);
  }, [assessment]);

  const sources = useMemo(() => {
    const list = [];
    const seen = new Set();
    const addSource = (source) => {
      if (!source) return;
      const url = normalizeSourceUrl(source.url ?? source);
      if (!url) return;
      const key = url.toLowerCase();
      if (seen.has(key)) return;
      const name = (typeof source === "object" && source.name ? source.name.trim() : "") || getHostFromUrl(url) || "Source";
      list.push({ name, url, host: getHostFromUrl(url) });
      seen.add(key);
    };
    const rawSources = assessment?.sources;
    if (Array.isArray(rawSources)) rawSources.forEach(addSource);
    else if (rawSources) addSource(rawSources);
    if (product?.link) addSource({ name: product.data_source ? `${product.data_source} product page` : "Product page", url: product.link });
    return list;
  }, [assessment, product]);

  const confidence = assessment?.confidence?.toLowerCase();
  const confidenceStyle = confidenceConfig[confidence] ?? confidenceConfig.medium;

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!scanResult || !product) {
    return (
      <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Link href="/scan" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </span>
            Back
          </Link>
          <section className="rounded-3xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-6 py-10 text-center">
            <h1 className="text-base font-semibold text-[color:var(--ink)]">No scan data yet</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Scan a product first to see details here.</p>
          </section>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">

        {/* Back button */}
        <Link href="/scan" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </span>
          Back
        </Link>

        {/* Product header + grade */}
        <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{typeConfig.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{typeConfig.label}</span>
              </div>
              <h1 className="mt-1 text-lg font-bold leading-tight text-[color:var(--ink)]">{product.product_name}</h1>
              <p className="text-sm text-[color:var(--muted)]">{product.brand_name}</p>

              {/* Confidence badge */}
              {confidence && (
                <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${confidenceStyle.className}`}>
                  {confidenceStyle.label}
                </span>
              )}
            </div>

            {/* Grade circle */}
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold ${grade !== "-" ? gradeStyles[grade] : "bg-[color:var(--card-muted)] text-[color:var(--muted)]"}`}>
              {grade}
            </div>
          </div>

          {/* Score bars */}
          {scores.length ? (
            <div className="mt-5 space-y-4">
              {scores.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-sm text-[color:var(--ink)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[color:var(--muted)]">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span>{item.score}/100</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--border)]">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--muted)]">Scores are not available for this product yet.</p>
          )}

          {/* Favourite button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={favLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] py-2.5 text-sm font-semibold transition hover:bg-[color:var(--card-muted)] disabled:opacity-50"
          >
            {isFavorited ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-rose-500">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-rose-500">Saved</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--muted)]">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-[color:var(--muted)]">{user ? "Save Product" : "Sign in to Save"}</span>
              </>
            )}
          </button>
        </section>

        {/* Tabs */}
        <section className="rounded-2xl bg-[color:var(--card-muted)] p-2">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${
                  activeTab === tab
                    ? "bg-[color:var(--card)] text-[color:var(--ink)] shadow-sm"
                    : "text-[color:var(--muted)]"
                }`}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            {/* AI Summary */}
            {assessment?.summary && (
              <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[color:var(--ink)]">Summary</h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">{assessment.summary}</p>
                {assessment.confidence_reason && (
                  <p className="mt-2 text-xs italic text-[color:var(--muted)]">{assessment.confidence_reason}</p>
                )}
              </section>
            )}

            {/* Certifications */}
            <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ink)]">
                <span className="text-emerald-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l4 2 4 8-8 10-8-10 4-8 4-2Z" />
                    <path d="M12 10v5" />
                  </svg>
                </span>
                Certifications
              </div>
              {certifications.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {certifications.map((badge) => (
                    <span key={badge} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{badge}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[color:var(--muted)]">No certifications found for this product.</p>
              )}
            </section>

            {/* Key concerns & positives */}
            {assessment && (
              <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[color:var(--ink)]">Overall Assessment</h2>
                {assessment.overall_recommendation && (
                  <p className="mt-2 text-sm font-semibold text-emerald-600">{assessment.overall_recommendation}</p>
                )}

                {Array.isArray(assessment.positive_attributes) && assessment.positive_attributes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Positives</p>
                    <ul className="mt-2 space-y-1">
                      {assessment.positive_attributes.map((attr, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--muted)]">
                          <span className="mt-0.5 text-emerald-500">✓</span>{attr}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(assessment.key_concerns) && assessment.key_concerns.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Concerns</p>
                    <ul className="mt-2 space-y-1">
                      {assessment.key_concerns.map((concern, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--muted)]">
                          <span className="mt-0.5 text-amber-500">⚠</span>{concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ── DETAILS TAB ── */}
        {activeTab === "details" && (
          <div className="space-y-4">
            {assessment ? (
              <>
                <div className="space-y-4">
                  {detailScores.map((item) => (
                    <ScoreCard key={item.id} title={item.title} score={item.score} description={item.description} />
                  ))}
                </div>

              </>
            ) : (
              <section className="rounded-3xl bg-[color:var(--card)] p-5 text-sm text-[color:var(--muted)] shadow-sm">
                Scores and descriptions are not available for this product yet.
              </section>
            )}

            {/* Product meta */}
            <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[color:var(--ink)]">Product Details</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { label: "Brand",    value: product.brand_name },
                  { label: "Category", value: product.category },
                  { label: "Origin",   value: product.country_of_origin },
                  { label: "Type",     value: product.product_type },
                  ...(product.ecoscore ? [{ label: "Eco Score", value: `${product.ecoscore}/100` }] : []),
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} className="rounded-2xl bg-[color:var(--card-muted)] p-3">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{row.label}</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">{row.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === "insights" && (
          <div className="space-y-4">
            {/* Score Reasoning button */}
            <button
              type="button"
              onClick={() => router.push("/score-reasoning")}
              className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-4 text-sm font-semibold text-[color:var(--ink)] shadow-sm transition hover:bg-[color:var(--card-muted)]"
            >
              <span>View Full Score Reasoning</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Alternatives */}
            {alternatives.length > 0 ? (
              <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[color:var(--ink)]">More Ethical Alternatives</h2>
                <div className="mt-3 space-y-3">
                  {alternatives.map((alt, i) => (
                    <div key={i} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-4">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{alt.name}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">{alt.reason}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl bg-[color:var(--card)] p-5 text-sm text-[color:var(--muted)] shadow-sm">
                No alternatives were suggested for this product.
              </section>
            )}
          </div>
        )}

        {/* ── SOURCES TAB ── */}
        {activeTab === "sources" && (
          <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[color:var(--ink)]">Data Sources</h2>
            {sources.length ? (
              <ul className="mt-4 space-y-3">
                {sources.map((source) => (
                  <li key={source.url} className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{source.name}</p>
                      <p className="text-xs text-[color:var(--muted)]">{source.host || source.url}</p>
                    </div>
                    <a
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--card)] text-[color:var(--muted)] shadow-sm transition hover:text-[color:var(--ink)]"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open source ${source.name}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v7h-7" /><path d="M3 10v11h11" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--muted)]">No sources were provided for this scan yet.</p>
            )}

            {product.cache_hit !== undefined && (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-muted)] p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Cache Status</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
                  {product.cache_hit ? "✓ Retrieved from cache" : "Fetched from API"}
                </p>
              </div>
            )}
          </section>
        )}

      </div>
      <BottomNav />
    </main>
  );
}