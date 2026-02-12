"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScanHero from "@/components/scan/ScanHero";
import RecentScans from "@/components/scan/RecentScans";
import HomeSearchCard from "@/components/home/HomeSearchCard";
import BottomNav from "@/components/ui/BottomNav";
import { extractBarcode, scanImage } from "@/lib/api";
import {
  getRecentScans,
  getRecentScanByBarcode,
  saveLastScan,
  saveRecentScan,
} from "@/lib/storage";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
];

const detectBarcodeFromFile = async (file) => {
  if (typeof window === "undefined") return null;

  const BarcodeDetectorClass = window.BarcodeDetector;
  if (!BarcodeDetectorClass || typeof BarcodeDetectorClass !== "function") {
    return null;
  }

  let imageBitmap = null;

  try {
    const detector = new BarcodeDetectorClass({ formats: BARCODE_FORMATS });
    imageBitmap = await createImageBitmap(file);
    const detected = await detector.detect(imageBitmap);
    const matchedBarcode = detected?.find((item) => item?.rawValue)?.rawValue;

    return matchedBarcode ? String(matchedBarcode).trim() : null;
  } catch {
    return null;
  } finally {
    if (imageBitmap && typeof imageBitmap.close === "function") {
      imageBitmap.close();
    }
  }
};

export default function ScanPage() {
  const router = useRouter();
  const progressTimerRef = useRef(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  const startProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    setProgress(5);
    progressTimerRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        const bump = current < 40 ? 7 : current < 70 ? 4 : 2;
        return Math.min(current + bump, 90);
      });
    }, 300);
  };

  const stopProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError("");
    setSelectedLabel(file.name);
    setIsLoading(true);
    startProgress();

    try {
      let detectedBarcode = await detectBarcodeFromFile(file);

      if (!detectedBarcode && getRecentScans().length > 0) {
        try {
          const extracted = await extractBarcode(file);
          detectedBarcode = extracted?.barcode
            ? String(extracted.barcode).trim()
            : null;
        } catch {
          detectedBarcode = null;
        }
      }

      const existingScan = detectedBarcode
        ? getRecentScanByBarcode(detectedBarcode)
        : null;

      if (existingScan?.fullScanResult) {
        setProgress(100);
        saveLastScan(existingScan.fullScanResult);
        saveRecentScan(existingScan.fullScanResult);
        router.push("/scan-result");
        return;
      }

      const result = await scanImage(file);
      setProgress(100);
      saveLastScan(result);
      saveRecentScan(result);
      router.push("/scan-result");
    } catch (err) {
      setError(err?.message ?? "Unable to scan that image, please try again.");
      setProgress(0);
    } finally {
      stopProgress();
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-6 py-10 pb-28">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <HomeSearchCard />

        <ScanHero
          onFileSelect={handleFileSelect}
          isLoading={isLoading}
          selectedLabel={selectedLabel}
          progress={progress}
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <RecentScans />
      </div>
      <BottomNav />
    </main>
  );
}
