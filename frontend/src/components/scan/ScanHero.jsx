import { useRef, useState } from "react";

export default function ScanHero({
  onFileSelect,
  onManualBarcode,
  isLoading,
  selectedLabel,
  progress = 0,
}) {
  const inputRef = useRef(null);
  const [showManual, setShowManual] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const handlePick = () => inputRef.current?.click();
  const progressValue = Number.isFinite(progress) ? Math.round(progress) : 0;
  const statusText = isLoading
    ? `Scanning... ${progressValue}%`
    : selectedLabel
      ? `Selected: ${selectedLabel}`
      : "Upload an image to start scanning";

  const handleManualSubmit = () => {
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    onManualBarcode?.(trimmed);
    setManualValue("");
    setShowManual(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleManualSubmit();
  };

  return (
    <section className="rounded-[28px] bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-6 text-white shadow-[0_22px_40px_rgba(16,185,129,0.35)]">
      <button
        type="button"
        onClick={handlePick}
        disabled={isLoading}
        className="flex w-full flex-col items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-6 py-8 text-center transition hover:bg-white/15 disabled:opacity-60"
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

      {/* Manual barcode entry toggle */}
      {!showManual ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-emerald-100">{statusText}</p>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            disabled={isLoading}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            Enter manually
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-emerald-100">
            Enter barcode number
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 0123456789012"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-white/60 focus:bg-white/20"
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!manualValue.trim() || isLoading}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              Look up
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setShowManual(false); setManualValue(""); }}
            className="text-xs text-emerald-100 underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      )}

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