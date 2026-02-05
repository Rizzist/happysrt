import { pool } from "../../../../server/crdb";
import { requireOwner } from "../../../../server/owner";
import { b2DeleteKey } from "../../../../server/b2";

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}

function ensureDraftShape(d) {
  const out = d && typeof d === "object" ? { ...d } : {};
  if (!Array.isArray(out.files)) out.files = [];
  if (!out.shared || typeof out.shared !== "object") out.shared = {};
  if (!out.mode) out.mode = "batch";
  if (!out.status) out.status = "staging";
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  let owner;
  try {
    owner = await requireOwner(req, res);
  } catch (e) {
    return res.status(e.statusCode || 401).json({ message: e.message || "Unauthorized" });
  }

  try {
    const { threadId, itemId } = req.body || {};
    if (!isUuid(threadId)) return res.status(400).json({ message: "threadId must be a UUID" });
    if (!isUuid(itemId)) return res.status(400).json({ message: "itemId must be a UUID" });

    const tRes = await pool.query(
      `SELECT draft, draft_rev FROM threads
       WHERE user_id = $1 AND thread_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [owner.ownerId, threadId]
    );

    if (tRes.rowCount === 0) return res.status(404).json({ message: "Thread not found" });

    const row = tRes.rows[0];
    const draft = ensureDraftShape(row.draft);
    const files = Array.isArray(draft.files) ? [...draft.files] : [];

    const idx = files.findIndex((f) => String(f?.itemId) === String(itemId));
    if (idx < 0) return res.status(404).json({ message: "Draft media not found" });

    const entry = files[idx];
    const b2Key = entry?.audio?.b2?.key;

    // Remove from draft
    files.splice(idx, 1);
    const nextDraft = { ...draft, files };
    const nextRev = Number(row.draft_rev || 0) + 1;

    await pool.query(
      `
      UPDATE threads
      SET draft = $3::jsonb,
          draft_rev = $4,
          draft_updated_at = now(),
          updated_at = now()
      WHERE user_id=$1 AND thread_id=$2
      `,
      [owner.ownerId, threadId, JSON.stringify(nextDraft), nextRev]
    );

    // Delete B2 + mark ledger deleted (best-effort)
    if (b2Key) {
      try {
        await b2DeleteKey({ bucket: process.env.B2_BUCKET, key: b2Key });
      } catch {
        // ignore
      }

      await pool.query(
        `
        UPDATE media_objects
        SET status='deleted', deleted_at=now(), updated_at=now()
        WHERE owner_id=$1 AND thread_id=$2 AND item_id=$3 AND b2_key=$4
        `,
        [owner.ownerId, threadId, itemId, b2Key]
      );
    }

    return res.status(200).json({ ok: true, draftRev: nextRev });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
