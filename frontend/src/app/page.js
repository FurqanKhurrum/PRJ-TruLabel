import Link from "next/link";

const steps = [
  "Scan any barcode or QR code",
  "View ethical and sustainability ratings",
  "Support local and responsible brands",
];

export default function Home() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[color:var(--hero-bg)] text-white"
      style={{
        "--hero-bg": "#2fcf6b",
        "--hero-deep": "#1ea556",
        "--hero-soft": "#4ade80",
        "--hero-glow": "#b8f4ce",
      }}
    >
      <div className="absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--hero-glow),transparent_65%)] opacity-70 blur-2xl" />
        <div className="absolute bottom-24 right-[-80px] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,var(--hero-soft),transparent_70%)] opacity-40 blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[color:var(--hero-deep)]/70 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col px-6 py-10">
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="animate-fade-up">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/95 shadow-[0_18px_40px_rgba(16,185,129,0.35)]">
              <svg
                width="42"
                height="42"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-500"
              >
                <path d="M10 27c10-16 23-16 28-16-2 15-12 25-28 26-2-4-2-7 0-10z" />
                <path d="M16 32c4-7 12-13 22-16" />
              </svg>
            </div>
            <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-white/60" />
          </div>

          <div className="mt-6 animate-fade-up" style={{ animationDelay: "0.08s" }}>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              TruLabel
            </h1>
            <p className="mt-3 text-base text-emerald-50/90">
              Know what you buy. Shop with values.
            </p>
          </div>

          <ol className="mt-10 w-full space-y-4 text-left text-sm text-emerald-50/90">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-4 animate-fade-up"
                style={{ animationDelay: `${0.16 + index * 0.06}s` }}
              >
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 animate-fade-up" style={{ animationDelay: "0.24s" }}>
          <Link
            href="/scan"
            className="block w-full rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-emerald-600 shadow-[0_20px_35px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(16,185,129,0.45)]"
          >
            Get Started
          </Link>
          <p className="mt-4 text-center text-xs text-emerald-100/80">
            Scan your first product in seconds.
          </p>
        </div>
      </div>
    </main>
  );
}
