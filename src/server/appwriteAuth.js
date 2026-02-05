// server/appwriteAuth.js
export async function requireAppwriteUser(req) {
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const jwt = match ? match[1].trim() : "";

  if (!jwt) {
    const err = new Error("Missing Authorization Bearer token");
    err.statusCode = 401;
    throw err;
  }

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  if (!endpoint || !project) {
    const err = new Error("Missing Appwrite env (NEXT_PUBLIC_APPWRITE_ENDPOINT/PROJECT_ID)");
    err.statusCode = 500;
    throw err;
  }

  const res = await fetch(`${endpoint}/account`, {
    headers: {
      "X-Appwrite-Project": project,
      "X-Appwrite-JWT": jwt,
    },
  });

  if (!res.ok) {
    const err = new Error("Invalid Appwrite session");
    err.statusCode = 401;
    throw err;
  }

  const user = await res.json();
  return { user, userId: user.$id };
}
