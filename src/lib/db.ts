import { Pool } from "pg";

// Server-side only. Never import from client components.
declare global {
  var __fdPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    // Neon's pooler drops idle connections; recycle ours first so a request
    // never picks up a dead socket ("Connection terminated unexpectedly").
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client dropped by the server emits here; without a listener the
  // process would crash. The pool discards the client and dials a new one.
  pool.on("error", () => undefined);
  return pool;
}

export function getPool(): Pool {
  if (!globalThis.__fdPool) globalThis.__fdPool = createPool();
  return globalThis.__fdPool;
}
