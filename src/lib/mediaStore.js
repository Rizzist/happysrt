import localforage from "localforage";

const store = localforage.createInstance({
  name: "happysrt",
  storeName: "media",
});

function key(scope, threadId, clientFileId) {
  return `media:v1:${scope}:${threadId}:${clientFileId}`;
}

export async function putLocalMedia(scope, threadId, clientFileId, file) {
  // localforage can store Blob/File
  await store.setItem(key(scope, threadId, clientFileId), file);
}

export async function getLocalMedia(scope, threadId, clientFileId) {
  return store.getItem(key(scope, threadId, clientFileId));
}

export async function deleteLocalMedia(scope, threadId, clientFileId) {
  await store.removeItem(key(scope, threadId, clientFileId));
}
