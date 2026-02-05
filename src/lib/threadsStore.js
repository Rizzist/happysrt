// lib/threadsStore.js
import localforage from "localforage";

const store = localforage.createInstance({
  name: "happysrt",
  storeName: "threads",
});

function key(scope) {
  return `threads:v3:${scope}`; // bump for sync metadata
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function emptyDraft() {
  return {
    status: "staging",
    mode: "batch",
    shared: {},
    files: [],
  };
}

function defaultSync() {
  return {
    indexAt: null, // last time we checked /api/threads/indexer successfully
  };
}

function normalizeThread(t) {
  if (!t || typeof t !== "object") return null;
  const now = nowIso();
  const out = { ...t };

  // core
  if (!out.id) out.id = uuid();
  if (!out.title) out.title = "Thread";
  if (!out.kind) out.kind = "thread";
  if (!out.createdAt) out.createdAt = now;
  if (!out.updatedAt) out.updatedAt = now;
  if (!Number.isFinite(Number(out.version))) out.version = 1;
  if (!Array.isArray(out.items)) out.items = [];

  // draft
  out.draft = out.draft && typeof out.draft === "object" ? out.draft : emptyDraft();
  if (!Array.isArray(out.draft.files)) out.draft.files = [];
  if (!out.draft.shared || typeof out.draft.shared !== "object") out.draft.shared = {};
  if (!out.draft.mode) out.draft.mode = "batch";
  if (!out.draft.status) out.draft.status = "staging";

  out.draftRev = Number.isFinite(Number(out.draftRev)) ? Number(out.draftRev) : 0;
  out.draftUpdatedAt = out.draftUpdatedAt || now;

  // server stamps (used for “did server change?” checks)
  out.server = out.server && typeof out.server === "object" ? { ...out.server } : {};
  if (typeof out.server.updatedAt !== "string") out.server.updatedAt = null;
  if (typeof out.server.draftUpdatedAt !== "string") out.server.draftUpdatedAt = null;
  if (!Number.isFinite(Number(out.server.version))) out.server.version = null;
  if (!Number.isFinite(Number(out.server.draftRev))) out.server.draftRev = null;

  return out;
}

export function makeDefaultThread() {
  const now = nowIso();
  return normalizeThread({
    id: "default",
    title: "Default (How it works)",
    kind: "tutorial",
    createdAt: now,
    updatedAt: now,
    version: 1,
    items: [],
    draft: emptyDraft(),
    draftRev: 0,
    draftUpdatedAt: now,
    server: {
      updatedAt: null,
      draftUpdatedAt: null,
      version: null,
      draftRev: null,
    },
  });
}

export function makeNewThread(title) {
  const now = nowIso();
  return normalizeThread({
    id: uuid(),
    title: title || "New Thread",
    kind: "thread",
    createdAt: now,
    updatedAt: now,
    version: 1,
    items: [],
    draft: emptyDraft(),
    draftRev: 0,
    draftUpdatedAt: now,
    server: {
      updatedAt: null,
      draftUpdatedAt: null,
      version: null,
      draftRev: null,
    },
  });
}

export async function loadThreadsState(scope) {
  const raw = await store.getItem(key(scope));

  if (!raw || typeof raw !== "object") {
    return { threadsById: {}, activeId: "default", sync: defaultSync() };
  }

  const threadsById = raw.threadsById && typeof raw.threadsById === "object" ? raw.threadsById : {};
  const activeId = typeof raw.activeId === "string" ? raw.activeId : "default";
  const sync = raw.sync && typeof raw.sync === "object" ? { ...defaultSync(), ...raw.sync } : defaultSync();

  const normalized = {};
  for (const [id, t] of Object.entries(threadsById)) {
    const nt = normalizeThread(t);
    if (nt) normalized[id] = nt;
  }

  return { threadsById: normalized, activeId, sync };
}

export async function saveThreadsState(scope, state) {
  await store.setItem(key(scope), state);
}

export async function ensureDefaultThread(scope) {
  const state = await loadThreadsState(scope);
  if (!state.threadsById.default) {
    state.threadsById.default = makeDefaultThread();
    state.activeId = "default";
    await saveThreadsState(scope, state);
  }
  return state;
}
