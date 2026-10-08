import { getPool } from "@/lib/db";

export async function deleteSessions(ids: string[]): Promise<void> {
  if (ids.length) await getPool().query("DELETE FROM demo_sessions WHERE id = ANY($1::uuid[])", [ids]);
}

export async function closePool(): Promise<void> {
  await getPool().end();
  globalThis.__fdPool = undefined;
}
