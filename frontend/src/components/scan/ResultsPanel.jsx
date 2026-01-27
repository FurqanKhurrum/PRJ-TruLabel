import Badge from "@/components/ui/Badge";
import ScoreCard from "@/components/scan/ScoreCard";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "sources", label: "Sources" },
];

function recommendationTone(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes("highly")) return "success";
  if (normalized.includes("recommend")) return "info";
  if (normalized.includes("consider")) return "warn";
  return "danger";
}

export default function ResultsPanel({ results, activeTab, onTabChange }) {
  if (!results) {
    return (
      <section className="rounded-3xl border border-dashed border-[color:var(--border)] bg-white/70 p-8 text-center text-sm text-[color:var(--muted)]">
        Results will appear here after a scan.
      </section>
    );
  }

  const assessment = results.ethical_assessment?.data;

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-soft">
      <div className="border-b border-[color:var(--border)] pb-6 text-center">
        <h2 className="font-display text-2xl text-[color:var(--ink)]">
          {results.product.product_name}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {results.product.brand_name}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-[color:var(--canvas)] p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-white text-[color:var(--accent-strong)] shadow-soft"
                : "text-[color:var(--muted)] hover:text-[color:var(--ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && assessment ? (
        <div className="mt-6 space-y-4 animate-fade-up">
          <ScoreCard
            title="Sustainability"
            score={assessment.sustainability_score}
            description={assessment.sustainability_description}
          />
          <ScoreCard
            title="Labor Practices"
            score={assessment.labor_practices_score}
            description={assessment.labor_practices_description}
          />
          <ScoreCard
            title="Animal Testing"
            score={assessment.animal_testing_score}
            description={assessment.animal_testing_description}
          />
          <ScoreCard
            title="Environmental Impact"
            score={assessment.environmental_impact_score}
            description={assessment.environmental_impact_description}
          />

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 text-center">
            <p className="text-sm font-semibold text-[color:var(--muted)]">
              Overall Recommendation
            </p>
            <div className="mt-2 flex justify-center">
              <Badge tone={recommendationTone(assessment.overall_recommendation)}>
                {assessment.overall_recommendation}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h3 className="text-sm font-semibold text-[color:var(--ink)]">
                Positive Attributes
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
                {(assessment.positive_attributes ?? []).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h3 className="text-sm font-semibold text-[color:var(--ink)]">
                Key Concerns
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
                {(assessment.key_concerns ?? []).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "details" ? (
        <div className="mt-6 animate-fade-up">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
              <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                Barcode
              </p>
              <p className="mt-2 font-semibold text-[color:var(--ink)]">
                {results.barcode}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
              <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                Category
              </p>
              <p className="mt-2 font-semibold text-[color:var(--ink)]">
                {results.product.category || "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
              <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                Origin
              </p>
              <p className="mt-2 font-semibold text-[color:var(--ink)]">
                {results.product.country_of_origin || "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
              <p className="text-xs uppercase tracking-widest text-[color:var(--muted)]">
                Eco Score
              </p>
              <p className="mt-2 font-semibold text-[color:var(--ink)]">
                {results.product.ecoscore ? `${results.product.ecoscore}/100` : "N/A"}
              </p>
            </div>
          </div>

          {results.product.labels ? (
            <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h3 className="text-sm font-semibold text-[color:var(--ink)]">
                Labels and Certifications
              </h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {results.product.labels}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "sources" ? (
        <div className="mt-6 animate-fade-up">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <h3 className="text-sm font-semibold text-[color:var(--ink)]">
              Data Sources
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--muted)]">
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                <span>Open Food Facts database</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>AI ethical analysis</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>Environmental impact data</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
