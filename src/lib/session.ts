import { seedCategories } from "./handbook-categories";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "./db";
import { seedKnowledge, SEED_PUBLISHED_AT } from "./seed-knowledge";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSessionId(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function newSessionId(): string {
  return randomUUID();
}

export type DemoSession = { id: string; createdAt: Date; resetCount: number };

async function seedSessionContent(client: PoolClient, sessionId: string): Promise<void> {
  // Start with an active conversation; restarts retain older conversations.
  await client.query("INSERT INTO conversations (session_id, is_active) VALUES ($1, true)", [sessionId]);
  for (const [i, entry] of seedKnowledge.entries()) {
    await client.query(
      `INSERT INTO knowledge_entries (session_id, seed_key, title, policy_text, published_at, sort_order, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, entry.key, entry.title, entry.policyText, SEED_PUBLISHED_AT, i, seedCategories[entry.key] ?? "Other"],
    );
  }
}

/** Resolve the session row for an id, creating and seeding it on first use. */
export async function ensureSession(sessionId: string): Promise<DemoSession> {
  if (!isSessionId(sessionId)) throw new Error("invalid session id");
  // Fast path (every request after the first): one round trip, no transaction.
  const found = await getPool().query("SELECT id, created_at, reset_count FROM demo_sessions WHERE id = $1", [sessionId]);
  if (found.rows[0]) return { id: found.rows[0].id, createdAt: found.rows[0].created_at, resetCount: found.rows[0].reset_count };
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO demo_sessions (id) VALUES ($1)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, created_at, reset_count`,
      [sessionId],
    );
    if (inserted.rowCount) {
      await seedSessionContent(client, sessionId);
    }
    const row = inserted.rows[0]
      ?? (await client.query("SELECT id, created_at, reset_count FROM demo_sessions WHERE id = $1", [sessionId])).rows[0];
    await client.query("COMMIT");
    return { id: row.id, createdAt: row.created_at, resetCount: row.reset_count };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Restore only this session's starting content. Session identity and
 * reset_count survive so usage accounting (issue 004) is not replenished.
 */
export async function resetSessionContent(sessionId: string): Promise<DemoSession> {
  if (!isSessionId(sessionId)) throw new Error("invalid session id");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM demo_sessions WHERE id = $1 FOR UPDATE", [sessionId]);
    if (!existing.rowCount) throw new Error("unknown session");
    await client.query("DELETE FROM conversations WHERE session_id = $1", [sessionId]); // cascades messages, requests
    await client.query("DELETE FROM knowledge_entries WHERE session_id = $1", [sessionId]);
    await seedSessionContent(client, sessionId);
    const updated = await client.query(
      "UPDATE demo_sessions SET reset_count = reset_count + 1 WHERE id = $1 RETURNING id, created_at, reset_count",
      [sessionId],
    );
    await client.query("COMMIT");
    const row = updated.rows[0];
    return { id: row.id, createdAt: row.created_at, resetCount: row.reset_count };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
