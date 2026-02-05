async function postForm(url, jwt, formData) {
  const headers = {};
  if (jwt) headers.authorization = `Bearer ${jwt}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include", // for guest cookie
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

export function apiDraftMediaUpload(jwt, formData) {
  return postForm("/api/threads/draft/upload", jwt, formData);
}

export function apiDraftMediaDelete(jwt, { threadId, itemId }) {
  return postJson("/api/threads/draft/delete", jwt, { threadId, itemId });
}
