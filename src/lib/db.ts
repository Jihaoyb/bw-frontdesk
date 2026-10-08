import { Pool } from "pg";

// Server-side only. Never import from client components.
declare global {
  var __fdPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
}

export function getPool(): Pool {
  if (!globalThis.__fdPool) globalThis.__fdPool = createPool();
  return globalThis.__fdPool;
}
