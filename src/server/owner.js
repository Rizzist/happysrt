import crypto from "crypto";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import { requireAppwriteUser } from "./appwriteAuth";

const GUEST_COOKIE = "hs_guest_id";

function makeGuestId() {
  return crypto.randomUUID();
}

export async function requireOwner(req, res) {
  const auth = req.headers.authorization || "";
  const hasBearer = auth.toLowerCase().startsWith("bearer ");

  if (hasBearer) {
    // If they send a token, it must be valid — otherwise 401.
    const { userId, user } = await requireAppwriteUser(req);
    return {
      ownerId: userId,
      userId,
      user,
      isGuest: false,
    };
  }

  // No bearer => guest
  const cookies = parseCookie(req.headers.cookie || "");
  let gid = cookies[GUEST_COOKIE];

  if (!gid) {
    gid = makeGuestId();
    res.setHeader(
      "Set-Cookie",
      serializeCookie(GUEST_COOKIE, gid, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    );
  }

  return {
    ownerId: `guest:${gid}`,
    userId: null,
    user: null,
    isGuest: true,
  };
}
