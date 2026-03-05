"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiLogin, apiRegister, apiGetMe } from "@/lib/auth";

export const AuthContext = createContext(null);

const TOKEN_KEY = "trulabel_token";

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // true while we re-hydrate from localStorage

  // ── Re-hydrate on first mount ──────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    // Validate the stored token against the server
    apiGetMe(stored)
      .then(({ user }) => {
        setToken(stored);
        setUser(user);
      })
      .catch(() => {
        // Token expired or invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const persist = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    setToken(token);
    setUser(user);
  };

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password); // throws on failure
    persist(data.token, data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, displayName, password) => {
    const data = await apiRegister(email, displayName, password); // throws on failure
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — use anywhere inside the app */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}