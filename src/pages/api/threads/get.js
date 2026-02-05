// pages/api/threads/get.js
import { pool } from "../../../server/crdb";
import { requireAppwriteUser } from "../../../server/appwriteAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { userId } = await requireAppwriteUser(req);
    const { threadId } = req.body || {};

    if (!threadId) return res.status(400).json({ message: "threadId is required" });

    const q = await pool.query(
      `
      SELECT thread_id, title, data, version, created_at, updated_at, deleted_at,
             draft, draft_rev, draft_updated_at
      FROM threads
      WHERE user_id = $1 AND thread_id = $2
      LIMIT 1
      `,
      [userId, threadId]
    );

    if (q.rowCount === 0) return res.status(404).json({ message: "Thread not found" });

    const r = q.rows[0];
    if (r.deleted_at) return res.status(404).json({ message: "Thread deleted" });

    return res.status(200).json({
      ok: true,
      thread: {
        id: r.thread_id,
        title: r.title,
        kind: r.data?.kind || "thread",
        items: r.data?.items || [],
        version: Number(r.version || 1),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        draft: r.draft || {},
        draftRev: Number(r.draft_rev || 0),
        draftUpdatedAt: r.draft_updated_at,
        server: {
          updatedAt: r.updated_at,
          draftUpdatedAt: r.draft_updated_at,
          version: Number(r.version || 1),
          draftRev: Number(r.draft_rev || 0),
        },
      },
    });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ message: e.message || "Server error" });
  }
}
