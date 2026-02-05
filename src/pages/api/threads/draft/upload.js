import formidable from "formidable";
import fs from "fs";
import crypto from "crypto";
import { pool } from "../../../../server/crdb";
import { requireOwner } from "../../../../server/owner";
import { bytesLimitForOwner, getUsedBytes } from "../../../../server/quota";
import { b2PutFile, sanitizeFilename } from "../../../../server/b2";

export const config = {
  api: { bodyParser: false },
};

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDraftShape(d) {
  const out = d && typeof d === "object" ? { ...d } : {};
  if (!Array.isArray(out.files)) out.files = [];
  if (!out.shared || typeof out.shared !== "object") out.shared = {};
  if (!out.mode) out.mode = "batch";
  if (!out.status) out.status = "staging";
  return out;
}

function findFileIndex(files, itemId) {
  return files.findIndex((f) => f && String(f.itemId) === String(itemId));
}

function parseJsonField(s) {
  if (!s) return null;
  try {
    return JSON.parse(String(s));
  } catch {
    return null;
  }
}

function makeB2Key({ ownerId, threadId, itemId, objectId, filename }) {
  const safe = sanitizeFilename(filename);
  return `owners/${ownerId}/threads/${threadId}/items/${itemId}/${objectId}/${safe}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  let owner;
  try {
    owner = await requireOwner(req, res);
  } catch (e) {
    return res.status(e.statusCode || 401).json({ message: e.message || "Unauthorized" });
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // server safety cap
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Invalid upload" });
    }

    try {
      const threadId = String(fields.threadId || "");
      const itemId = String(fields.itemId || "");
      const clientFileId = String(fields.clientFileId || "");
      const sourceType = String(fields.sourceType || "upload"); // "upload" | "url"
      const url = String(fields.url || "");
      const title = String(fields.title || "New Thread");
      const localMeta = parseJsonField(fields.localMeta);

      if (!isUuid(threadId)) return res.status(400).json({ message: "threadId must be a UUID" });
      if (!isUuid(itemId)) return res.status(400).json({ message: "itemId must be a UUID" });
      if (!clientFileId) return res.status(400).json({ message: "clientFileId is required" });

      // thread must exist (for signed-in); for guest we allow auto-create if missing
      const tRes = await pool.query(
        `SELECT user_id, thread_id, title, draft, draft_rev
         FROM threads
         WHERE user_id = $1 AND thread_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [owner.ownerId, threadId]
      );

      if (tRes.rowCount === 0) {
        if (!owner.isGuest) {
          return res.status(404).json({ message: "Thread not found" });
        }

        // guest auto-create thread row (so quota + ledger can link)
        await pool.query(
          `
          INSERT INTO threads (user_id, thread_id, title, data, version, draft, draft_rev)
          VALUES ($1, $2, $3, $4::jsonb, 1, $5::jsonb, 0)
          ON CONFLICT (user_id, thread_id) DO NOTHING
          `,
          [
            owner.ownerId,
            threadId,
            title || "New Thread",
            JSON.stringify({ kind: "thread", items: [] }),
            JSON.stringify({ status: "staging", mode: "batch", shared: {}, files: [] }),
          ]
        );
      }

      // Reload row (after possible insert)
      const t2 = await pool.query(
        `SELECT title, draft, draft_rev
         FROM threads
         WHERE user_id = $1 AND thread_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [owner.ownerId, threadId]
      );

      if (t2.rowCount === 0) return res.status(404).json({ message: "Thread not found" });

      const row = t2.rows[0];
      const currentDraft = ensureDraftShape(row.draft);
      const currentRev = Number(row.draft_rev || 0);

      // Build / upsert draft file entry
      const filesArr = Array.isArray(currentDraft.files) ? [...currentDraft.files] : [];

      const baseEntry = {
        itemId,
        clientFileId,
        sourceType,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      if (localMeta && typeof localMeta === "object") {
        baseEntry.local = localMeta;
      }

      if (sourceType === "url") {
        if (!url || !/^https?:\/\//i.test(url)) {
          return res.status(400).json({ message: "Valid url is required for sourceType=url" });
        }
        baseEntry.url = url;
        baseEntry.stage = "linked";
      }

      // If a file is provided and it's audio => upload to B2 and ledger it
      const uploaded = files.file;
      if (uploaded) {
        const filepath = uploaded.filepath || uploaded.path;
        const filename = uploaded.originalFilename || uploaded.name || "audio";
        const mime = uploaded.mimetype || uploaded.type || "application/octet-stream";
        const bytes = Number(uploaded.size || 0);

        // If user tries to send a video here: we DO NOT upload video.
        // We just store local meta, and mark it as needing audio attach later.
        if (String(mime).startsWith("video/")) {
          baseEntry.stage = "local_video";
          baseEntry.note = "Video stored locally; extract audio client-side and attach later.";
        } else {
          // audio/* (or anything else treated as "audio blob")
          const used = await getUsedBytes(owner.ownerId);
          const limit = bytesLimitForOwner({ isGuest: owner.isGuest, user: owner.user });

          if (used + bytes > limit) {
            // Clean tmp file
            try { fs.unlinkSync(filepath); } catch {}
            return res.status(413).json({
              message: `Storage limit exceeded. Used ${(used)} bytes, trying to add ${bytes} bytes, limit ${limit} bytes.`,
              code: "STORAGE_LIMIT_EXCEEDED",
              usedBytes: used,
              limitBytes: limit,
            });
          }

          const objectId = crypto.randomUUID();
          const b2Key = makeB2Key({
            ownerId: owner.ownerId,
            threadId,
            itemId,
            objectId,
            filename,
          });

          // Reserve ledger row first (pending)
          await pool.query(
            `
            INSERT INTO media_objects (
              owner_id, object_id, thread_id, item_id,
              b2_key, filename, mime, bytes,
              status, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', now() + interval '10 minutes')
            `,
            [owner.ownerId, objectId, threadId, itemId, b2Key, filename, mime, bytes]
          );

          // Upload to B2
          await b2PutFile({
            bucket: process.env.B2_BUCKET,
            key: b2Key,
            filepath,
            contentType: mime,
          });

          // Mark active
          await pool.query(
            `
            UPDATE media_objects
            SET status='active', expires_at=NULL, updated_at=now()
            WHERE owner_id=$1 AND object_id=$2
            `,
            [owner.ownerId, objectId]
          );

          baseEntry.audio = {
            b2: {
              key: b2Key,
              bytes,
              mime,
              filename,
              objectId,
            },
          };
          baseEntry.stage = "uploaded";
        }

        // Clean tmp file
        try { fs.unlinkSync(filepath); } catch {}
      }

      // Upsert file entry by itemId
      const idx = findFileIndex(filesArr, itemId);
      if (idx >= 0) filesArr[idx] = { ...filesArr[idx], ...baseEntry, updatedAt: nowIso() };
      else filesArr.unshift(baseEntry);

      const nextDraft = {
        ...currentDraft,
        files: filesArr,
        updatedAt: nowIso(),
      };

      const nextRev = currentRev + 1;

      await pool.query(
        `
        UPDATE threads
        SET draft = $3::jsonb,
            draft_rev = $4,
            draft_updated_at = now(),
            updated_at = now()
        WHERE user_id = $1 AND thread_id = $2
        `,
        [owner.ownerId, threadId, JSON.stringify(nextDraft), nextRev]
      );

      const usedAfter = await getUsedBytes(owner.ownerId);
      const limitAfter = bytesLimitForOwner({ isGuest: owner.isGuest, user: owner.user });

      return res.status(200).json({
        ok: true,
        threadId,
        itemId,
        draftRev: nextRev,
        draftUpdatedAt: nowIso(),
        draftFile: baseEntry,
        storage: { usedBytes: usedAfter, limitBytes: limitAfter },
      });
    } catch (e) {
      return res.status(500).json({ message: e.message || "Server error" });
    }
  });
}
