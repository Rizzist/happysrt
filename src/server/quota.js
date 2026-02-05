import { pool } from "./crdb";

export function bytesLimitForOwner({ isGuest, user }) {
  // For now: everyone is 10MB unless you later mark paid.
  // Later: read from user.prefs.plan or stripe status etc.
  const free = Number(process.env.FREE_STORAGE_BYTES || 10485760);
  const paid = Number(process.env.PAID_STORAGE_BYTES || 107374182400);

  const plan = user?.prefs?.plan || user?.prefs?.tier || "free"; // later
  const isPaid = plan === "paid" || plan === "pro";

  return isPaid ? paid : free;
}

export async function getUsedBytes(ownerId) {
  const r = await pool.query(
    `
    SELECT COALESCE(SUM(bytes), 0)::int8 AS used
    FROM media_objects
    WHERE owner_id = $1
      AND deleted_at IS NULL
      AND status IN ('active','pending')
      AND (expires_at IS NULL OR expires_at > now())
    `,
    [ownerId]
  );

  return Number(r.rows?.[0]?.used || 0);
}
