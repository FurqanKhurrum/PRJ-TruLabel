const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function scanImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/scan-image`, {
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
