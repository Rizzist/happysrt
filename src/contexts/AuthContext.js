// contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { account } from "../lib/appwrite";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // prevent double-creating sessions in React strict mode / fast refresh
  const bootedRef = useRef(false);

  const refresh = async () => {
    const u = await account.get();
    setUser(u);

    // Optional: session info (useful to detect anonymous provider)
    // Not required, but nice for UI
    try {
      const s = await account.getSession("current");
      setSession(s);
    } catch {
      setSession(null);
    }

    return u;
  };

  const ensureGuestSession = async () => {
    try {
      // If already logged in (email/oauth/anonymous), this succeeds
      await refresh();
      return;
    } catch (err) {
      // If not logged in, create an anonymous session (guest)
      await account.createAnonymousSession(); // :contentReference[oaicite:3]{index=3}
      await refresh();
    }
  };

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        await ensureGuestSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- Auth actions (for later) ----
  const login = async (email, password) => {
    await account.createEmailPasswordSession(email, password);
    await refresh();
  };

  const register = async (email, password, name) => {
    // Appwrite creates the user; then create a session
    // (You can also "upgrade" anonymous by updating email/password later)
    await account.create("unique()", email, password, name);
    await account.createEmailPasswordSession(email, password);
    await refresh();
  };

  const logout = async () => {
    await account.deleteSession("current");
    setUser(null);
    setSession(null);
    // Immediately re-create guest session so the app still works
    await ensureGuestSession();
  };

  const isAnonymous =
    session?.provider?.toLowerCase?.() === "anonymous" ||
    session?.provider === "anonymous";

  const value = {
    user,
    session,
    isAnonymous,
    loading,
    refresh,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
