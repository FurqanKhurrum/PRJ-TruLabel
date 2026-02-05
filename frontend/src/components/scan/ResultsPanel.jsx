import Badge from "@/components/ui/Badge";
import ScoreCard from "@/components/scan/ScoreCard";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "sources", label: "Sources" },
];

const normalizeSourceUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  let trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    return new URL(trimmed).toString();
  } catch (error) {
    return "";
  }
};

const getHostFromUrl = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
};

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
  const sources = (() => {
    const list = [];
    const seen = new Set();

    const addSource = (source) => {
      if (!source) return;
      const url = normalizeSourceUrl(source.url ?? source);
      if (!url) return;
      const key = url.toLowerCase();
      if (seen.has(key)) return;
      const name =
        (typeof source === "object" && source.name ? source.name.trim() : "") ||
        getHostFromUrl(url) ||
        "Source";
      const host = getHostFromUrl(url);
      list.push({ name, url, host });
      seen.add(key);
    };

    const rawSources = assessment?.sources;
    if (Array.isArray(rawSources)) {
      rawSources.forEach(addSource);
    } else if (rawSources) {
      addSource(rawSources);
    }

    if (results?.product?.link) {
      addSource({
        name: results.product.data_source
          ? `${results.product.data_source} product page`
          : "Product page",
        url: results.product.link,
      });
    }

    return list;
  })();

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
            {sources.length ? (
              <ul className="mt-4 space-y-3">
                {sources.map((source) => (
                  <li
                    key={source.url}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--canvas)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">
                        {source.name}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {source.host || source.url}
                      </p>
                    </div>
                    <a
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[color:var(--muted)] shadow-soft transition hover:text-[color:var(--ink)]"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open source ${source.name}`}
                    >
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
                        <path d="M14 3h7v7" />
                        <path d="M10 14 21 3" />
                        <path d="M21 14v7h-7" />
                        <path d="M3 10v11h11" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                No product-related sources were provided for this scan yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
