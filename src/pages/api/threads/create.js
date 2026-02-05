// pages/api/threads/create.js
import { pool } from "../../../server/crdb";
import { requireAppwriteUser } from "../../../server/appwriteAuth";
import { getUserPlan, getThreadLimitForPlan } from "../../../server/plan";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { userId, user } = await requireAppwriteUser(req);

    const { threadId, title } = req.body || {};
    if (!threadId || typeof threadId !== "string") {
      return res.status(400).json({ message: "threadId is required" });
    }
    if (threadId === "default") {
      return res.status(400).json({ message: "default thread is local-only" });
    }

    // ✅ enforce plan limit (counts only non-deleted threads)
    const plan = getUserPlan(user);
    const limit = getThreadLimitForPlan(plan);

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM threads WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const currentCount = Number(countRes.rows?.[0]?.c || 0);
    if (currentCount >= limit) {
      return res.status(403).json({
        message: `Thread limit reached (${currentCount}/${limit}). Upgrade to create more threads.`,
        code: "THREAD_LIMIT_REACHED",
        limit,
        plan,
      });
    }

    const cleanTitle = (typeof title === "string" && title.trim()) ? title.trim() : "New Thread";

    const exists = await pool.query(
      `SELECT thread_id FROM threads WHERE user_id = $1 AND thread_id = $2 LIMIT 1`,
      [userId, threadId]
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({ message: "Thread already exists" });
    }

    const data = { kind: "thread", items: [] };

    const created = await pool.query(
      `
      INSERT INTO threads (user_id, thread_id, title, data, version)
      VALUES ($1, $2, $3, $4::jsonb, 1)
      RETURNING thread_id, title, data, version, created_at, updated_at, deleted_at
      `,
      [userId, threadId, cleanTitle, JSON.stringify(data)]
    );

    const row = created.rows[0];

    return res.status(200).json({
      ok: true,
      thread: {
        id: row.thread_id,
        title: row.title,
        kind: row.data?.kind || "thread",
        items: row.data?.items || [],
        version: Number(row.version || 1),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ message: e.message || "Server error" });
  }
}
