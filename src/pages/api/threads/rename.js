// pages/api/threads/rename.js
import { pool } from "../../../server/crdb";
import { requireAppwriteUser } from "../../../server/appwriteAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { userId } = await requireAppwriteUser(req);

    const { threadId, title } = req.body || {};
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ message: "threadId is required" });
    }
    if (threadId === "default") {
      return res.status(400).json({ message: "default thread is local-only" });
    }

    const cleanTitle = (typeof title === "string" && title.trim()) ? title.trim() : "";
    if (!cleanTitle) return res.status(400).json({ message: "title is required" });

    // Must exist and not be deleted
    const updated = await pool.query(
      `
      UPDATE threads
      SET title = $3,
          updated_at = now(),
          version = version + 1
      WHERE user_id = $1
        AND thread_id = $2
        AND deleted_at IS NULL
      RETURNING thread_id, title, version, updated_at
      `,
      [userId, threadId, cleanTitle]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const row = updated.rows[0];
    return res.status(200).json({
      ok: true,
      thread: {
        id: row.thread_id,
        title: row.title,
        version: Number(row.version || 1),
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ message: e.message || "Server error" });
  }
}
