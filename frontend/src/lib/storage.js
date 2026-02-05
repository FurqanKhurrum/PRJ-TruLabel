const LAST_SCAN_KEY = "trulabel:lastScan";
const RECENT_SCANS_KEY = "trulabel:recentScans";
const MAX_RECENT = 8;

const isBrowser = () => typeof window !== "undefined";

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const getGrade = (scores) => {
  const valid = scores.filter((score) => Number.isFinite(score));
  if (valid.length === 0) return "-";

  const average =
    valid.reduce((total, score) => total + score, 0) / valid.length;

 if (average >= 80) return "A";
  if (average >= 70) return "B";
  if (average >= 60) return "C";
  if (average >= 50) return "D";
  return "F";
};

export const buildRecentScanEntry = (scanResult) => {
  const product = scanResult?.product ?? {};
  const assessment = scanResult?.ethical_assessment?.data ?? {};
  // Use same 3 scores as results page for consistent grading
  const scores = [
    assessment.sustainability_score,
    assessment.labor_practices_score,
    assessment.animal_testing_score,
  ];

  return {
    id: Date.now(),
    barcode: product.barcode || scanResult.barcode,
    name: product.product_name || "Unknown product",
    brand: product.brand_name || "Unknown brand",
    grade: getGrade(scores),
    image:
      product.image_url ||
      product.image_front_url ||
      product.image_small_url ||
      "",
    scannedAt: new Date().toISOString(),
    // Store full scan result for later viewing
    fullScanResult: scanResult,
  };
};

export const saveLastScan = (scanResult) => {
  if (!isBrowser()) return;
  sessionStorage.setItem(LAST_SCAN_KEY, JSON.stringify(scanResult));
};

export const getLastScan = () => {
  if (!isBrowser()) return null;
  return safeParse(sessionStorage.getItem(LAST_SCAN_KEY), null);
};

export const clearLastScan = () => {
  if (!isBrowser()) return;
  sessionStorage.removeItem(LAST_SCAN_KEY);
};

export const getRecentScans = () => {
  if (!isBrowser()) return [];
  return safeParse(localStorage.getItem(RECENT_SCANS_KEY), []);
};

export const clearRecentScans = () => {
  if (!isBrowser()) return [];
  localStorage.removeItem(RECENT_SCANS_KEY);
  return [];
};

export const saveRecentScan = (scanResult) => {
  if (!isBrowser()) return [];
  const entry = buildRecentScanEntry(scanResult);
  const existing = getRecentScans();
  const updated = [entry, ...existing].slice(0, MAX_RECENT);

  localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
  return updated;
};

export const clearScanHistory = () => {
  if (!isBrowser()) return;
  clearLastScan();
  clearRecentScans();
};
