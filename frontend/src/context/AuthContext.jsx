"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGetMe, apiLogin, apiRegister } from "@/lib/auth";

export const AuthContext = createContext(null);

const TOKEN_KEY = "trulabel_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );
  const [loading, setLoading] = useState(() =>
    typeof window !== "undefined" ? !!localStorage.getItem(TOKEN_KEY) : true
  );

  useEffect(() => {
    if (!token) return;

    apiGetMe(token)
      .then(({ user }) => {
        setUser(user);
      })
      .catch(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const persist = (nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setLoading(false);
  };

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    persist(data.token, data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, displayName, password) => {
    const data = await apiRegister(email, displayName, password);
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
