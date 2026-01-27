"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScanHero from "@/components/scan/ScanHero";
import RecentScans from "@/components/scan/RecentScans";
import { scanImage } from "@/lib/api";
import { saveLastScan, saveRecentScan } from "@/lib/storage";

export default function ScanPage() {
  const router = useRouter();
  const [selectedLabel, setSelectedLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError("");
    setSelectedLabel(file.name);
    setIsLoading(true);

    try {
      const result = await scanImage(file);
      saveLastScan(result);
      saveRecentScan(result);
      router.push("/scan-result");
    } catch (err) {
      setError(err?.message ?? "Unable to scan that image.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <ScanHero
          onFileSelect={handleFileSelect}
          isLoading={isLoading}
          selectedLabel={selectedLabel}
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <RecentScans />
      </div>
    </main>
  );
}
