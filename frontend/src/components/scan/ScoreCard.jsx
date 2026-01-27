function scoreTone(score) {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-sky-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function ScoreCard({ title, score, description }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-[color:var(--ink)]">
          {title}
        </div>
        <div className={`text-xl font-bold ${scoreTone(score)}`}>
          {score}/100
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
        {description}
      </p>
    </div>
  );
}
