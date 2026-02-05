// contexts/threadsContext.js
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { ensureDefaultThread, loadThreadsState, saveThreadsState, makeNewThread } from "../lib/threadsStore";
import { apiCreateThread, apiRenameThread, apiDeleteThread } from "../lib/api/threads";
import { putLocalMedia, deleteLocalMedia } from "../lib/mediaStore";

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

function ensureDraftShape(d) {
  const out = d && typeof d === "object" ? { ...d } : {};
  if (!Array.isArray(out.files)) out.files = [];
  if (!out.shared || typeof out.shared !== "object") out.shared = {};
  if (!out.mode) out.mode = "batch";
  if (!out.status) out.status = "staging";
  return out;
}

function ensureServerShape(s) {
  const out = s && typeof s === "object" ? { ...s } : {};
  if (typeof out.updatedAt !== "string") out.updatedAt = null;
  if (typeof out.draftUpdatedAt !== "string") out.draftUpdatedAt = null;
  out.version = Number.isFinite(Number(out.version)) ? Number(out.version) : null;
  out.draftRev = Number.isFinite(Number(out.draftRev)) ? Number(out.draftRev) : null;
  return out;
}

function mergeDraft(serverDraft, localDraft) {
  // Keep server as source-of-truth, but preserve any local-only draft files (eg local_video)
  const s = ensureDraftShape(serverDraft);
  const l = ensureDraftShape(localDraft);

  const serverIds = new Set((s.files || []).map((f) => String(f?.itemId || "")));
  const extras = (l.files || []).filter((f) => !serverIds.has(String(f?.itemId || "")));

  return { ...s, files: [...(s.files || []), ...extras] };
}

// ---------- API helpers ----------
async function postJson(url, jwt, body) {
  const headers = { "content-type": "application/json" };
  if (jwt) headers.authorization = `Bearer ${jwt}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.statusCode = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

async function postForm(url, jwt, formData) {
  const headers = {};
  if (jwt) headers.authorization = `Bearer ${jwt}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.statusCode = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

// NEW: thread sync endpoints you need to add server-side (shown below)
async function apiThreadsIndex(jwt, { since }) {
  return postJson("/api/threads/indexer", jwt, { since: since || null });
}

async function apiGetThread(jwt, { threadId }) {
  return postJson("/api/threads/get", jwt, { threadId });
}

export function ThreadsProvider({ children }) {
  const { user, isAnonymous, getJwt } = useAuth();

  const [threadsById, setThreadsById] = useState({});
  const [activeId, setActiveIdState] = useState("default");
  const [loadingThreads, setLoadingThreads] = useState(true);

  const threadsRef = useRef({});
  const activeRef = useRef("default");
  const syncRef = useRef({ indexAt: null });

  useEffect(() => {
    threadsRef.current = threadsById;
  }, [threadsById]);

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  const scope = useMemo(() => {
    if (!user) return null;
    return isAnonymous ? "guest" : user.$id;
  }, [user, isAnonymous]);

  const bootedRef = useRef(false);

  const persist = async (nextThreadsById, nextActiveId, nextSync) => {
    if (!scope) return;
    await saveThreadsState(scope, {
      threadsById: nextThreadsById,
      activeId: nextActiveId,
      sync: nextSync || syncRef.current,
    });
  };

  const commit = async (nextThreadsById, nextActiveId, nextSync) => {
    setThreadsById(nextThreadsById);
    setActiveIdState(nextActiveId);

    threadsRef.current = nextThreadsById;
    activeRef.current = nextActiveId;

    if (nextSync) syncRef.current = nextSync;

    await persist(nextThreadsById, nextActiveId, nextSync);
  };

  const getJwtIfAny = async () => {
    if (isAnonymous) return null;
    if (!getJwt) return null;
    const jwt = await getJwt();
    return jwt || null;
  };

  // --------- SYNC LOGIC (your requirements) ----------
  const syncFromServer = async ({ reason } = {}) => {
    if (isAnonymous) return; // guest stays local-only for threads list/history
    const jwt = await getJwtIfAny();
    if (!jwt) return;

    const since = syncRef.current?.indexAt || null;

    // 1) lightweight index fetch (only changed threads since last sync)
    const index = await apiThreadsIndex(jwt, { since });

    const serverTime = index?.serverTime || nowIso();
    const rows = Array.isArray(index?.threads) ? index.threads : [];

    if (!rows.length) {
      // even if nothing changed, advance indexAt to serverTime to avoid re-scanning
      syncRef.current = { ...(syncRef.current || {}), indexAt: serverTime };
      await persist(threadsRef.current, activeRef.current, syncRef.current);
      return;
    }

    let nextThreads = { ...(threadsRef.current || {}) };

    // 2) apply deletes / decide what needs full fetch
    const needFetch = [];
    for (const r of rows) {
      const id = String(r.threadId || r.id || "");
      if (!id) continue;
      if (id === "default") continue;

      if (r.deletedAt) {
        // remove locally
        delete nextThreads[id];
        continue;
      }

      const local = nextThreads[id];
      const localServer = ensureServerShape(local?.server);

      const same =
        local &&
        localServer.updatedAt === (r.updatedAt || null) &&
        localServer.draftUpdatedAt === (r.draftUpdatedAt || null) &&
        Number(localServer.version) === Number(r.version ?? null) &&
        Number(localServer.draftRev) === Number(r.draftRev ?? null);

      if (!same) {
        needFetch.push(id);
      }
    }

    // commit deletes immediately
    if (needFetch.length !== rows.length) {
      await commit(nextThreads, activeRef.current, { ...(syncRef.current || {}), indexAt: serverTime });
    }

    // 3) fetch full threads only for changed ones
    for (const threadId of needFetch) {
      const full = await apiGetThread(jwt, { threadId });
      const t = full?.thread;
      if (!t || !t.id) continue;

      const existing = nextThreads[t.id];

      // preserve any local-only draft entries (eg local video stored on this device)
      const mergedDraft = mergeDraft(t.draft, existing?.draft);

      nextThreads = {
        ...nextThreads,
        [t.id]: {
          ...existing,
          ...t,
          draft: mergedDraft,
          server: ensureServerShape(t.server || {
            updatedAt: t.updatedAt || null,
            draftUpdatedAt: t.draftUpdatedAt || null,
            version: t.version ?? null,
            draftRev: t.draftRev ?? null,
          }),
        },
      };
    }

    // finalize sync stamp
    const nextSync = { ...(syncRef.current || {}), indexAt: serverTime };
    await commit(nextThreads, activeRef.current, nextSync);
  };

  // --------- BOOT ---------
  useEffect(() => {
    if (!scope) return;
    if (bootedRef.current && bootedRef.current === scope) return;
    bootedRef.current = scope;

    (async () => {
      setLoadingThreads(true);
      try {
        // local first
        const ensured = await ensureDefaultThread(scope);
        const loaded = await loadThreadsState(scope);

        const merged = { ...loaded.threadsById };
        if (!merged.default) merged.default = ensured.threadsById.default;

        setThreadsById(merged);
        setActiveIdState(loaded.activeId || "default");
        threadsRef.current = merged;
        activeRef.current = loaded.activeId || "default";

        syncRef.current = loaded.sync || { indexAt: null };

        // then remote sync (logged-in only)
        await syncFromServer({ reason: "boot" });
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [scope]);

  const threads = useMemo(() => toArray(threadsById), [threadsById]);

  const activeThread = useMemo(() => {
    return threadsById[activeId] || threadsById.default || null;
  }, [threadsById, activeId]);

  const setActiveId = async (id) => {
    setActiveIdState(id);
    activeRef.current = id;
    await persist(threadsRef.current, id, syncRef.current);
  };

  // --------- CRUD (unchanged, but keep syncRef when persisting) ----------
  const createThread = async () => {
    const localThread = makeNewThread(`Thread ${new Date().toLocaleString()}`);

    return toast.promise(
      (async () => {
        if (!isAnonymous) {
          const jwt = await getJwtIfAny();
          if (!jwt) throw new Error("Unable to create JWT");
          const r = await apiCreateThread(jwt, { threadId: localThread.id, title: localThread.title });

          // if server returns updatedAt/version etc, prefer it
          const serverThread = r?.thread;
          if (serverThread?.id) {
            localThread.createdAt = serverThread.createdAt || localThread.createdAt;
            localThread.updatedAt = serverThread.updatedAt || localThread.updatedAt;
            localThread.version = serverThread.version || localThread.version;
            localThread.server = ensureServerShape({
              updatedAt: serverThread.updatedAt || null,
              draftUpdatedAt: serverThread.draftUpdatedAt || null,
              version: serverThread.version ?? null,
              draftRev: serverThread.draftRev ?? null,
            });
          }
        }

        const cur = threadsRef.current || {};
        const next = { ...cur, [localThread.id]: localThread };
        await commit(next, localThread.id, syncRef.current);
        return localThread.id;
      })(),
      {
        loading: "Creating thread…",
        success: "Thread created",
        error: (e) => e?.message || "Failed to create thread",
      }
    );
  };

  const renameThread = async (threadId, title) => {
    if (!threadId || threadId === "default") return;
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) return;

    const cur = threadsRef.current || {};
    const t = cur[threadId];
    if (!t) return;

    return toast.promise(
      (async () => {
        if (!isAnonymous) {
          const jwt = await getJwtIfAny();
          if (!jwt) throw new Error("Unable to create JWT");
          await apiRenameThread(jwt, { threadId, title: cleanTitle });
        }

        const updated = {
          ...t,
          title: cleanTitle,
          updatedAt: nowIso(),
        };

        const next = { ...cur, [threadId]: updated };
        await commit(next, activeRef.current, syncRef.current);
      })(),
      {
        loading: "Renaming…",
        success: "Renamed",
        error: (e) => e?.message || "Failed to rename",
      }
    );
  };

  const deleteThread = async (threadId) => {
    if (!threadId || threadId === "default") return;

    const cur = threadsRef.current || {};
    const t = cur[threadId];
    if (!t) return;

    return toast.promise(
      (async () => {
        if (!isAnonymous) {
          const jwt = await getJwtIfAny();
          if (!jwt) throw new Error("Unable to create JWT");
          await apiDeleteThread(jwt, { threadId });
        }

        const next = { ...cur };
        delete next[threadId];

        let nextActive = activeRef.current;
        if (nextActive === threadId) nextActive = "default";

        await commit(next, nextActive, syncRef.current);
      })(),
      {
        loading: "Deleting…",
        success: "Deleted",
        error: (e) => e?.message || "Failed to delete",
      }
    );
  };

  const addItem = async (threadId, itemPayload) => {
    const cur = threadsRef.current || {};
    const t = cur[threadId];
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

    const next = { ...cur, [threadId]: updatedThread };
    await commit(next, activeRef.current, syncRef.current);

    return item.id;
  };

  // ---- Draft endpoints (your existing upload/delete routes) ----
  const addDraftMediaFromFile = async (threadId, file) => {
    if (!threadId || threadId === "default") return;

    const cur = threadsRef.current || {};
    const t = cur[threadId];
    if (!t) return;

    const itemId = uuid();
    const clientFileId = uuid();
    const mime = String(file?.type || "");
    const isVideo = mime.startsWith("video/");
    const localMeta = {
      name: file?.name || "",
      size: file?.size || 0,
      mime,
      lastModified: file?.lastModified || 0,
      isVideo,
    };

    if (scope) await putLocalMedia(scope, threadId, clientFileId, file);

    const draft = ensureDraftShape(t.draft);
    const optimistic = {
      itemId,
      clientFileId,
      sourceType: "upload",
      local: localMeta,
      stage: isVideo ? "local_video" : "uploading",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const nextDraft = ensureDraftShape({ ...draft, files: [optimistic, ...(draft.files || [])] });
    const nextThread = {
      ...t,
      draft: nextDraft,
      draftRev: (t.draftRev || 0) + 1,
      draftUpdatedAt: nowIso(),
      updatedAt: nowIso(),
    };

    await commit({ ...cur, [threadId]: nextThread }, activeRef.current, syncRef.current);

    return toast.promise(
      (async () => {
        const jwt = await getJwtIfAny();

        const fd = new FormData();
        fd.append("threadId", threadId);
        fd.append("itemId", itemId);
        fd.append("clientFileId", clientFileId);
        fd.append("sourceType", "upload");
        fd.append("localMeta", JSON.stringify(localMeta));

        if (!isVideo) fd.append("file", file, file?.name || "audio");

        const r = await postForm("/api/threads/draft/upload", jwt, fd);

        const cur2 = threadsRef.current || {};
        const t2 = cur2[threadId];
        if (!t2) return itemId;

        const d2 = ensureDraftShape(t2.draft);
        const files2 = [...(d2.files || [])];
        const idx = files2.findIndex((x) => String(x?.itemId) === String(itemId));
        if (idx >= 0) {
          files2[idx] = {
            ...files2[idx],
            ...(r.draftFile || {}),
            stage: r?.draftFile?.stage || files2[idx].stage,
            updatedAt: nowIso(),
          };
        }

        const nextT2 = {
          ...t2,
          draft: { ...d2, files: files2 },
          draftRev: typeof r.draftRev === "number" ? r.draftRev : (t2.draftRev || 0) + 1,
          draftUpdatedAt: r.draftUpdatedAt || nowIso(),
          updatedAt: nowIso(),
        };

        await commit({ ...cur2, [threadId]: nextT2 }, activeRef.current, syncRef.current);
        return itemId;
      })(),
      {
        loading: isVideo ? "Saving video locally…" : "Uploading audio…",
        success: isVideo ? "Saved locally" : "Uploaded",
        error: async (e) => {
          try {
            if (scope) await deleteLocalMedia(scope, threadId, clientFileId);
          } catch {}
          return e?.message || "Upload failed";
        },
      }
    );
  };

  const deleteDraftMedia = async (threadId, itemId) => {
    if (!threadId || threadId === "default" || !itemId) return;

    const cur = threadsRef.current || {};
    const t = cur[threadId];
    if (!t) return;

    const d = ensureDraftShape(t.draft);
    const entry = (d.files || []).find((x) => String(x?.itemId) === String(itemId));
    const clientFileId = entry?.clientFileId;

    return toast.promise(
      (async () => {
        if (scope && clientFileId) {
          try {
            await deleteLocalMedia(scope, threadId, clientFileId);
          } catch {}
        }

        const jwt = await getJwtIfAny();
        await postJson("/api/threads/draft/delete", jwt, { threadId, itemId });

        const cur2 = threadsRef.current || {};
        const t2 = cur2[threadId];
        if (!t2) return;

        const d2 = ensureDraftShape(t2.draft);
        const files2 = (d2.files || []).filter((x) => String(x?.itemId) !== String(itemId));

        const nextT2 = {
          ...t2,
          draft: { ...d2, files: files2 },
          draftRev: (t2.draftRev || 0) + 1,
          draftUpdatedAt: nowIso(),
          updatedAt: nowIso(),
        };

        await commit({ ...cur2, [threadId]: nextT2 }, activeRef.current, syncRef.current);
      })(),
      {
        loading: "Deleting…",
        success: "Deleted",
        error: (e) => e?.message || "Delete failed",
      }
    );
  };

  const value = {
    loadingThreads,
    threads,
    activeId,
    setActiveId,
    activeThread,

    // manual sync if you want to add a refresh button later
    syncFromServer,

    createThread,
    renameThread,
    deleteThread,

    addItem,

    addDraftMediaFromFile,
    deleteDraftMedia,
  };

  return <ThreadsContext.Provider value={value}>{children}</ThreadsContext.Provider>;
}

export function useThreads() {
  const ctx = useContext(ThreadsContext);
  if (!ctx) throw new Error("useThreads must be used inside <ThreadsProvider />");
  return ctx;
}
