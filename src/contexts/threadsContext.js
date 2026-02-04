// contexts/threadsContext.js
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  ensureDefaultThread,
  loadThreadsState,
  saveThreadsState,
  makeNewThread,
} from "../lib/threadsStore";

const ThreadsContext = createContext(null);

function toArray(threadsById) {
  return Object.values(threadsById || {}).sort((a, b) => {
    const at = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
    const bt = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
    return bt - at;
  });
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `i_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function ThreadsProvider({ children }) {
  const { user, isAnonymous } = useAuth();
  const [threadsById, setThreadsById] = useState({});
  const [activeId, setActiveIdState] = useState("default");
  const [loadingThreads, setLoadingThreads] = useState(true);

  // keep guest threads stable even if Appwrite anonymous user id changes
  const scope = useMemo(() => {
    if (!user) return null;
    return isAnonymous ? "guest" : user.$id;
  }, [user, isAnonymous]);

  const bootedRef = useRef(false);

  useEffect(() => {
    if (!scope) return;

    if (bootedRef.current && bootedRef.current === scope) return;
    bootedRef.current = scope;

    (async () => {
      setLoadingThreads(true);
      try {
        const ensured = await ensureDefaultThread(scope);

        const loaded = await loadThreadsState(scope);
        const merged = { ...loaded.threadsById };
        if (!merged.default) merged.default = ensured.threadsById.default;

        setThreadsById(merged);
        setActiveIdState(loaded.activeId || "default");
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [scope]);

  const threads = useMemo(() => toArray(threadsById), [threadsById]);

  const activeThread = useMemo(() => {
    return threadsById[activeId] || threadsById.default || null;
  }, [threadsById, activeId]);

  const persist = async (nextThreadsById, nextActiveId) => {
    if (!scope) return;
    await saveThreadsState(scope, { threadsById: nextThreadsById, activeId: nextActiveId });
  };

  const setActiveId = async (id) => {
    setActiveIdState(id);
    const state = await loadThreadsState(scope);
    await saveThreadsState(scope, { ...state, activeId: id });
  };

  const createThread = async () => {
    const newThread = makeNewThread(`Thread ${new Date().toLocaleString()}`);
    const next = { ...threadsById, [newThread.id]: newThread };
    setThreadsById(next);
    setActiveIdState(newThread.id);
    await persist(next, newThread.id);
    return newThread.id;
  };

  const addItem = async (threadId, itemPayload) => {
    const t = threadsById[threadId];
    if (!t) return;

    const item = {
      id: uuid(),
      type: itemPayload?.type || "run",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      payload: itemPayload?.payload || {},
    };

    const updatedThread = {
      ...t,
      items: [...(t.items || []), item],
      version: (t.version || 1) + 1,
      updatedAt: nowIso(),
    };

    const next = { ...threadsById, [threadId]: updatedThread };
    setThreadsById(next);
    await persist(next, activeId);

    return item.id;
  };

  const value = {
    loadingThreads,
    threads,
    activeId,
    setActiveId,
    activeThread,
    createThread,
    addItem,
  };

  return <ThreadsContext.Provider value={value}>{children}</ThreadsContext.Provider>;
}

export function useThreads() {
  const ctx = useContext(ThreadsContext);
  if (!ctx) throw new Error("useThreads must be used inside <ThreadsProvider />");
  return ctx;
}
