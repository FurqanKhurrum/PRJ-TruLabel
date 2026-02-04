"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getLastScan } from "@/lib/storage";

const scoreIcons = {
  sustainability: (
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
      <path d="M11 20A7 7 0 0 1 4 13c0-7 7-9 7-9s7 2 7 9a7 7 0 0 1-7 7Z" />
      <path d="M8 15c2 1 4 1 6 0" />
    </svg>
  ),
  labor: (
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
      <path d="M16 11a4 4 0 0 1-8 0" />
      <path d="M12 2a4 4 0 0 1 4 4v2" />
      <path d="M8 8V6a4 4 0 0 1 4-4" />
      <path d="M3 22a6 6 0 0 1 18 0" />
    </svg>
  ),
  testing: (
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
      <path d="M12 3l7 4v7c0 4-3 7-7 7s-7-3-7-7V7l7-4Z" />
    </svg>
  ),
};

// Product type icons and colors
const productTypeConfig = {
  food: {
    icon: "🍎",
    color: "emerald",
    label: "Food & Beverage"
  },
  electronics: {
    icon: "📱",
    color: "blue",
    label: "Electronics"
  },
  cosmetics: {
    icon: "💄",
    color: "pink",
    label: "Cosmetics"
  },
  book: {
    icon: "📚",
    color: "amber",
    label: "Book"
  },
  general: {
    icon: "📦",
    color: "slate",
    label: "General Product"
  }
};

const tabs = ["overview", "details", "sources"];

const gradeFromScores = (scores) => {
  if (!scores.length) return "-";
  const average = scores.reduce((total, score) => total + score, 0) / scores.length;
  if (average >= 90) return "A";
  if (average >= 80) return "B";
  if (average >= 70) return "C";
  if (average >= 60) return "D";
  return "F";
};

export default function ScanResultView() {
  const [scanResult, setScanResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setScanResult(getLastScan());
  }, []);

  const product = scanResult?.product ?? null;
  const assessment = scanResult?.ethical_assessment?.data ?? null;

  // Get product type configuration
  const productType = product?.product_type || "general";
  const typeConfig = productTypeConfig[productType] || productTypeConfig.general;

  const scores = useMemo(() => {
    if (!assessment) return [];
    return [
      {
        id: "sustainability",
        label: "Sustainability",
        score: assessment.sustainability_score,
        icon: scoreIcons.sustainability,
      },
      {
        id: "labor",
        label: "Labor Practices",
        score: assessment.labor_practices_score,
        icon: scoreIcons.labor,
      },
      {
        id: "testing",
        label: "Animal Testing",
        score: assessment.animal_testing_score,
        icon: scoreIcons.testing,
      },
    ].filter((item) => Number.isFinite(item.score));
  }, [assessment]);

  const grade = useMemo(() => gradeFromScores(scores.map((item) => item.score)), [scores]);

  const certifications = useMemo(() => {
    if (!product?.labels) return [];
    return product.labels
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [product]);

  if (!scanResult || !product) {
    return (
      <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Link
            href="/"
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

          <section className="rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center">
            <h1 className="text-base font-semibold text-[color:var(--ink)]">
              No scan data yet
            </h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Scan a product first to see details here.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const overviewText =
    assessment?.environmental_impact_description ||
    assessment?.sustainability_description ||
    assessment?.labor_practices_description ||
    scanResult?.ethical_assessment?.raw_assessment ||
    scanResult?.ethical_assessment?.error ||
    "Assessment details will appear here once available.";

  const image =
    product.image_url || product.image_front_url || product.image_small_url;

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
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
          {/* Product Type Badge - NEW! */}
          <div className="mb-3 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-${typeConfig.color}-50 px-3 py-1 text-xs font-semibold text-${typeConfig.color}-700`}>
              <span>{typeConfig.icon}</span>
              <span>{typeConfig.label}</span>
            </span>
            {product.data_source && (
              <span className="text-xs text-slate-500">
                {product.data_source}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {image ? (
              <img
                src={image}
                alt={product.product_name}
                className="h-20 w-20 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-100 to-emerald-100 text-2xl">
                {typeConfig.icon}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-base font-semibold text-[color:var(--ink)]">
                {product.product_name || "Scanned Product"}
              </h1>
              <p className="text-sm text-[color:var(--muted)]">
                {product.brand_name || product.manufacturer || "Unknown brand"}
              </p>
              <p className="text-sm text-[color:var(--muted)]">
                Origin: {product.country_of_origin || "--"}
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white shadow-sm">
              {grade}
            </div>
          </div>

          {scores.length ? (
            <div className="mt-5 space-y-4">
              {scores.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-sm text-[color:var(--ink)]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-slate-700">{item.score}/100</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${item.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Scores are not available for this product yet.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-slate-100/70 p-2">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" ? (
          <>
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ink)]">
                <span className="text-emerald-500">
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
                    <path d="M12 2l4 2 4 8-8 10-8-10 4-8 4-2Z" />
                    <path d="M12 10v5" />
                  </svg>
                </span>
                Certifications
              </div>
              {certifications.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {certifications.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  No certifications listed for this product.
                </p>
              )}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[color:var(--ink)]">
                Overall Assessment
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
                {overviewText}
              </p>
            </section>
          </>
        ) : null}

        {activeTab === "details" ? (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="grid gap-4 text-sm">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  Barcode
                </p>
                <p className="mt-2 font-semibold text-[color:var(--ink)]">
                  {scanResult.barcode || "--"}
                </p>
              </div>

              {/* Product Type Specific Fields - NEW! */}
              {productType === "electronics" && (
                <>
                  {product.model && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                        Model
                      </p>
                      <p className="mt-2 font-semibold text-[color:var(--ink)]">
                        {product.model}
                      </p>
                    </div>
                  )}
                  {product.mpn && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                        MPN
                      </p>
                      <p className="mt-2 font-semibold text-[color:var(--ink)]">
                        {product.mpn}
                      </p>
                    </div>
                  )}
                </>
              )}

              {productType === "book" && product.isbn && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    ISBN
                  </p>
                  <p className="mt-2 font-semibold text-[color:var(--ink)]">
                    {product.isbn}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  Category
                </p>
                <p className="mt-2 font-semibold text-[color:var(--ink)]">
                  {product.category || "--"}
                </p>
              </div>

              {product.description && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    Description
                  </p>
                  <p className="mt-2 font-semibold text-[color:var(--ink)]">
                    {product.description}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  Origin
                </p>
                <p className="mt-2 font-semibold text-[color:var(--ink)]">
                  {product.country_of_origin || "--"}
                </p>
              </div>

              {/* Show Eco Score only for food/cosmetics */}
              {(productType === "food" || productType === "cosmetics") && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    Eco Score
                  </p>
                  <p className="mt-2 font-semibold text-[color:var(--ink)]">
                    {product.ecoscore ? `${product.ecoscore}/100` : "--"}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "sources" ? (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[color:var(--ink)]">
              Data Sources
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--muted)]">
              {/* Dynamic source display based on actual source - NEW! */}
              {product.data_source === "OpenFoodFacts" && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                  <span>Open Food Facts database</span>
                </li>
              )}
              {product.data_source === "UPCItemDB" && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span>UPC Item Database</span>
                </li>
              )}
              {product.data_source === "OpenBeautyFacts" && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                  <span>Open Beauty Facts database</span>
                </li>
              )}
              {product.data_source === "BarcodeLookup" && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  <span>Barcode Lookup API</span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>AI ethical analysis (Google Gemini)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>Environmental impact data</span>
              </li>
            </ul>

            {/* Show cache status - NEW! */}
            {product.cache_hit !== undefined && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                  Cache Status
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
                  {product.cache_hit ? "✓ Retrieved from cache" : "Fetched from API"}
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}