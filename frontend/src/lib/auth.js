const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// ── Shared fetch helper ────────────────────────────────────────────────────

async function authFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || data?.error || "Request failed");
  }

  return data;
}

// ── Public endpoints ───────────────────────────────────────────────────────

export async function apiRegister(email, displayName, password) {
  return authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, display_name: displayName, password }),
  });
}

export async function apiLogin(email, password) {
  return authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe(token) {
  return authFetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Protected endpoints (require token) ────────────────────────────────────

export async function apiGetHistory(token, limit = 50) {
  return authFetch(`/api/user/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiGetFavorites(token) {
  return authFetch("/api/user/favorites", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiAddFavorite(token, barcode) {
  return authFetch(`/api/user/favorites/${barcode}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiRemoveFavorite(token, barcode) {
  return authFetch(`/api/user/favorites/${barcode}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}