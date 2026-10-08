import { Pool } from "pg";

// Server-side only. Never import from client components.
declare global {
  var __fdPool: Pool | undefined;
}

function createPool(): Pool {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not configured");
  // TLS is set here, not by the URL: pg 8 warns that `sslmode=require` in a
  // connection string will change meaning in pg 9, so the parameter is dropped
  // and the certificate is verified explicitly (Neon's chain is publicly signed).
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
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
