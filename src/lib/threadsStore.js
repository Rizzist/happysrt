// lib/threadsStore.js
import localforage from "localforage";

const store = localforage.createInstance({
  name: "happysrt",
  storeName: "threads",
});

function key(scope) {
  return `threads:v1:${scope}`;
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return `t_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function makeDefaultThread() {
  const now = nowIso();
  return {
    id: "default",
    title: "Default (How it works)",
    kind: "tutorial",
    createdAt: now,
    updatedAt: now,
    version: 1,
    items: [],
  };
}

export function makeNewThread(title) {
  const now = nowIso();
  return {
    id: uuid(),
    title: title || "New Thread",
    kind: "thread",
    createdAt: now,
    updatedAt: now,
    version: 1,
    items: [],
  };
}

export async function loadThreadsState(scope) {
  const raw = await store.getItem(key(scope));
  if (!raw || typeof raw !== "object") {
    return { threadsById: {}, activeId: "default" };
  }
  const threadsById =
    raw.threadsById && typeof raw.threadsById === "object" ? raw.threadsById : {};
  const activeId = typeof raw.activeId === "string" ? raw.activeId : "default";
  return { threadsById, activeId };
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
