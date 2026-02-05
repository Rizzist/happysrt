// pages/api/threads/indexer.js
import { pool } from "../../../server/crdb";
import { requireAppwriteUser } from "../../../server/appwriteAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { userId } = await requireAppwriteUser(req);
    const { since } = req.body || {};

    const serverTime = new Date().toISOString();

    // If since is missing, return all non-deleted threads
    if (!since) {
      const q = await pool.query(
        `
        SELECT thread_id, title, version, updated_at, deleted_at, draft_rev, draft_updated_at
        FROM threads
        WHERE user_id = $1
          AND deleted_at IS NULL
        ORDER BY updated_at DESC
        `,
        [userId]
      );

      return res.status(200).json({
        ok: true,
        serverTime,
        threads: q.rows.map((r) => ({
          threadId: r.thread_id,
          title: r.title,
          version: Number(r.version || 1),
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at,
          draftRev: Number(r.draft_rev || 0),
          draftUpdatedAt: r.draft_updated_at,
        })),
      });
    }

    // since exists -> return only threads that changed at/after since
    const q = await pool.query(
      `
      SELECT thread_id, title, version, updated_at, deleted_at, draft_rev, draft_updated_at
      FROM threads
      WHERE user_id = $1
        AND (
          updated_at >= $2::timestamptz
          OR draft_updated_at >= $2::timestamptz
          OR (deleted_at IS NOT NULL AND deleted_at >= $2::timestamptz)
        )
      ORDER BY updated_at DESC
      `,
      [userId, since]
    );

    return res.status(200).json({
      ok: true,
      serverTime,
      threads: q.rows.map((r) => ({
        threadId: r.thread_id,
        title: r.title,
        version: Number(r.version || 1),
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
        draftRev: Number(r.draft_rev || 0),
        draftUpdatedAt: r.draft_updated_at,
      })),
    });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ message: e.message || "Server error" });
  }
}
