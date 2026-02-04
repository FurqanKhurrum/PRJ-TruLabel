const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

/**
 * Scan a barcode image
 * Now supports multiple product types: food, electronics, books, cosmetics, etc.
 */
export async function scanImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  // FIXED: Changed from /api/scan-image to /api/scan
  const response = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Scan failed. Please try again.";
    try {
      const error = await response.json();
      message = error?.detail || error?.error || message;
    } catch (err) {
      // ignore JSON parse failures
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get product by barcode directly
 */
export async function getProduct(barcode) {
  const response = await fetch(`${API_BASE}/api/product/${barcode}`);

  if (!response.ok) {
    let message = "Product not found.";
    try {
      const error = await response.json();
      message = error?.detail || error?.error || message;
    } catch (err) {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get API sources information
 */
export async function getAPISources() {
  const response = await fetch(`${API_BASE}/api/sources`);
  if (!response.ok) return null;
  return response.json();
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const response = await fetch(`${API_BASE}/api/cache/stats`);
  if (!response.ok) return null;
  return response.json();
}