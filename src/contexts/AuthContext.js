// contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { account } from "../lib/appwrite";

const AuthContext = createContext(null);

function toInt(v) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseErrorFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("error");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

function clearErrorFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("error");
  // also drop any hash garbage
  url.hash = "";
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootedRef = useRef(false);

  const getProvider = (s) => {
    const p = s?.provider;
    return typeof p === "string" ? p.toLowerCase() : "";
  };

  const refresh = async () => {
    const u = await account.get();
    setUser(u);

    try {
      const s = await account.getSession("current");
      setSession(s);
      return { u, s };
    } catch {
      setSession(null);
      return { u, s: null };
    }
  };

  const ensureMediaTokenDefaults = async ({ u, s }) => {
    const provider = getProvider(s);
    const defaultTokens = provider === "google" ? 50 : 5;

    const current = toInt(u?.prefs?.mediaTokens);
    let desired = current;

    if (desired == null) desired = defaultTokens;
    if (provider === "google" && desired < 50) desired = 50;
    if (current != null && desired < current) desired = current;

    if (current !== desired) {
      const mergedPrefs = { ...(u?.prefs || {}), mediaTokens: desired };
      await account.updatePrefs(mergedPrefs);
      setUser((prev) => (prev ? { ...prev, prefs: { ...(prev.prefs || {}), mediaTokens: desired } } : prev));
    }
  };

  const ensureSession = async () => {
    try {
      const data = await refresh();
      await ensureMediaTokenDefaults(data);
      return;
    } catch {
      await account.createAnonymousSession();
      const data = await refresh();
      await ensureMediaTokenDefaults(data);
    }
  };

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        setLoading(true);

        // If Appwrite sent us back with an OAuth error, clear it so it doesn't stick.
        const err = parseErrorFromUrl();
        if (err) {
          clearErrorFromUrl();
        }

        await ensureSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loginWithGoogle = async () => {
    const origin = window.location.origin;

    // IMPORTANT:
    // If we're currently anonymous, delete that session first so OAuth signs in normally
    // instead of trying to link Google onto the guest account (which causes user_already_exists).
    try {
      const s = await account.getSession("current");
      if (getProvider(s) === "anonymous") {
        await account.deleteSession("current");
      }
    } catch {
      // ignore
    }

    account.createOAuth2Session("google", origin, origin);
  };

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
    setSession(null);

    setLoading(true);
    try {
      await ensureSession();
    } finally {
      setLoading(false);
    }
  };

  const isAnonymous = getProvider(session) === "anonymous";
  const mediaTokens = toInt(user?.prefs?.mediaTokens) ?? 0;

  const value = {
    user,
    session,
    isAnonymous,
    mediaTokens,
    loading,
    refresh,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
