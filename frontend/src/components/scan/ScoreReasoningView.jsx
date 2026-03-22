"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/ui/BottomNav";
import { getLastScan } from "@/lib/storage";

const categoryConfig = [
  {
    id: "sustainability",
    title: "Sustainability",
    scoreKey: "sustainability_score",
    reasoningKey: "sustainability_reasoning",
    descriptionKey: "sustainability_description",
    icon: "🌱",
  },
  {
    id: "labor",
    title: "Labor Practices",
    scoreKey: "labor_practices_score",
    reasoningKey: "labor_practices_reasoning",
    descriptionKey: "labor_practices_description",
    icon: "👷",
  },
  {
    id: "testing",
    title: "Animal Testing",
    scoreKey: "animal_testing_score",
    reasoningKey: "animal_testing_reasoning",
    descriptionKey: "animal_testing_description",
    icon: "🐾",
  },
  {
    id: "environmental",
    title: "Environmental Impact",
    scoreKey: "environmental_impact_score",
    reasoningKey: "environmental_impact_reasoning",
    descriptionKey: "environmental_impact_description",
    icon: "🌍",
  },
];

const scoreColor = (score) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
};

const scoreBarColor = (score) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
};

export default function ScoreReasoningView() {
  const scanResult = getLastScan();
  const assessment = scanResult?.ethical_assessment?.data ?? null;
  const product    = scanResult?.product ?? null;

  const [expanded, setExpanded] = useState(null);

  if (!scanResult || !assessment) {
    return (
      <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Link href="/scan-result" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </span>
            Back
          </Link>
          <section className="rounded-3xl border border-dashed border-[color:var(--border)] bg-[color:var(--card-soft)] px-6 py-10 text-center">
            <h1 className="text-base font-semibold text-[color:var(--ink)]">No data available</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Scan a product first to see the score reasoning.</p>
          </section>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">

        {/* Back */}
        <Link href="/scan-result" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </span>
          Back
        </Link>

        {/* Header */}
        <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm">
          <h1 className="text-lg font-bold text-[color:var(--ink)]">Score Reasoning</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {product?.product_name} · {product?.brand_name}
          </p>
          {assessment.summary && (
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)] border-t border-[color:var(--border)] pt-3">
              {assessment.summary}
            </p>
          )}
        </section>

        {/* Per-category cards */}
        {categoryConfig.map((cat) => {
          const score = assessment[cat.scoreKey];
          const reasoning = assessment[cat.reasoningKey];
          const description = assessment[cat.descriptionKey];
          const hasScore = Number.isFinite(score);
          if (!hasScore && !description) return null;

          const isOpen = expanded === cat.id;

          return (
            <section key={cat.id} className="rounded-3xl bg-[color:var(--card)] shadow-sm overflow-hidden">
              {/* Header row — tappable to expand */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : cat.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{cat.title}</p>
                    {hasScore && (
                      <p className={`text-xs font-bold ${scoreColor(score)}`}>{score}/100</p>
                    )}
                  </div>
                </div>
                <svg
                  width="16" height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-[color:var(--muted)] transition-transform ${isOpen ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              {/* Score bar */}
              {hasScore && (
                <div className="mx-5 h-1.5 rounded-full bg-[color:var(--border)]">
                  <div
                    className={`h-full rounded-full ${scoreBarColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              )}

              {/* Expanded content */}
              {isOpen && (
                <div className="px-5 pb-5 pt-4 space-y-3">
                  {description && (
                    <p className="text-sm leading-relaxed text-[color:var(--muted)]">{description}</p>
                  )}

                  {Array.isArray(reasoning) && reasoning.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] mb-2">
                        Findings from research
                      </p>
                      <ul className="space-y-2">
                        {reasoning.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--ink)]">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {/* Key concerns & positives */}
        {(assessment.key_concerns?.length > 0 || assessment.positive_attributes?.length > 0) && (
          <section className="rounded-3xl bg-[color:var(--card)] p-5 shadow-sm space-y-4">
            {assessment.positive_attributes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">Positive Attributes</p>
                <ul className="space-y-1">
                  {assessment.positive_attributes.map((attr, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--muted)]">
                      <span className="mt-0.5 text-emerald-500">✓</span>{attr}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {assessment.key_concerns?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">Key Concerns</p>
                <ul className="space-y-1">
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

      </div>
      <BottomNav />
    </main>
  );
}