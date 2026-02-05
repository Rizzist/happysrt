// lib/api/threads.js
async function postJson(url, jwt, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

export function apiCreateThread(jwt, { threadId, title }) {
  return postJson("/api/threads/create", jwt, { threadId, title });
}

export function apiRenameThread(jwt, { threadId, title }) {
  return postJson("/api/threads/rename", jwt, { threadId, title });
}

export function apiDeleteThread(jwt, { threadId }) {
  return postJson("/api/threads/delete", jwt, { threadId });
}
