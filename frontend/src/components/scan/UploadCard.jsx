import { useRef, useState } from "react";
import Button from "@/components/ui/Button";

export default function UploadCard({
  onFileSelect,
  previewUrl,
  isLoading,
  canScan,
  onScan,
  error,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => fileInputRef.current?.click();

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-soft">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-[color:var(--ink)]">
          TruLabel Scanner
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Upload a product barcode to get ethical insights
        </p>
      </div>

      <div
        className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition duration-300 ${
          isDragOver
            ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-soft)]"
            : "border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]/60"
        }`}
        onClick={handleClick}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-2xl font-semibold text-[color:var(--accent-strong)]">
          UL
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[color:var(--ink)]">
          Click or drag image here
        </h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Supports JPG, PNG, and GIF
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5">
        <Button onClick={onScan} disabled={!canScan || isLoading}>
          {isLoading ? "Analyzing product..." : "Scan Barcode"}
        </Button>
      </div>

      {previewUrl ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-[color:var(--muted)]">Selected image</p>
          <img
            src={previewUrl}
            alt="Selected barcode"
            className="mt-3 inline-block max-h-72 rounded-2xl border border-[color:var(--border)] object-cover shadow-lg"
          />
        </div>
      ) : null}
    </section>
  );
}
