// server/crdb.js
import { Pool } from "pg";

function shouldUseSsl(connectionString) {
  if (!connectionString) return false;
  const s = connectionString.toLowerCase();
  return (
    s.includes("sslmode=require") ||
    s.includes("ssl=true") ||
    s.includes("cockroachlabs.cloud")
  );
}

function getPool() {
  const conn = process.env.SQL_DATABASE;
  if (!conn) throw new Error("Missing SQL_DATABASE in env");

  const globalAny = global;
  if (globalAny.__happysrt_pool) return globalAny.__happysrt_pool;

  const pool = new Pool({
    connectionString: conn,
    max: 5,
    ...(shouldUseSsl(conn) ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  globalAny.__happysrt_pool = pool;
  return pool;
}

export const pool = getPool();
