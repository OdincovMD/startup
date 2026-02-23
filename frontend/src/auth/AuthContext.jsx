import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, getStoredAuth, setStoredAuth, setOnUnauthorized } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const nextAuth = { token: data.access_token, user: data.user };
      setAuth(nextAuth);
      setStoredAuth(nextAuth);
      return nextAuth;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuth(null);
    setStoredAuth(null);
  };

  const loginWithToken = async (token) => {
    setStoredAuth({ token, user: null });
    const user = await apiRequest("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const nextAuth = { token, user };
    setAuth(nextAuth);
    setStoredAuth(nextAuth);
    return nextAuth;
  };

  const refreshUser = async () => {
    if (!auth?.token) return null;
    const user = await apiRequest("/users/me", {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    const nextAuth = { ...auth, user };
    setAuth(nextAuth);
    setStoredAuth(nextAuth);
    return user;
  };

  /** Обновить только объект user в auth (например, из ответа verify-email). Не делает запросов. */
  const updateUser = (user) => {
    if (!auth?.token) return;
    const nextAuth = { ...auth, user };
    setAuth(nextAuth);
    setStoredAuth(nextAuth);
  };

  useEffect(() => {
    setOnUnauthorized(() => setAuth(null));
    return () => setOnUnauthorized(() => {});
  }, []);

  const value = useMemo(
    () => ({ auth, loading, error, login, register, logout, loginWithToken, refreshUser, updateUser }),
    [auth, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
