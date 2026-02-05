import { useRef } from "react";

export default function ScanHero({
  onFileSelect,
  isLoading,
  selectedLabel,
  progress = 0,
}) {
  const inputRef = useRef(null);

  const handlePick = () => inputRef.current?.click();
  const progressValue = Number.isFinite(progress) ? Math.round(progress) : 0;
  const statusText = isLoading
    ? `Scanning... ${progressValue}%`
    : selectedLabel
      ? `Selected: ${selectedLabel}`
      : "Upload an image to start scanning";

  return (
    <section className="rounded-[28px] bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-6 text-white shadow-[0_22px_40px_rgba(16,185,129,0.35)]">
      <button
        type="button"
        onClick={handlePick}
        className="flex w-full flex-col items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-6 py-8 text-center transition hover:bg-white/15"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
        <div className="space-y-1">
          <p className="text-lg font-semibold">Scan Product</p>
          <p className="text-sm text-emerald-100">
            Tap to scan barcode or QR code
          </p>
        </div>
      </button>

      <div className="mt-4 text-center text-xs text-emerald-100">
        {statusText}
      </div>

      {isLoading ? (
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onFileSelect(event.target.files?.[0])}
      />
    </section>
  );
}
