import { getPool } from "./db";
import { AI_DAILY_LIMIT, AI_SESSION_LIMIT } from "./limits";

export type UsageSnapshot = { sessionUsed: number; sessionLimit: number; dailyUsed: number; dailyLimit: number };
export type ConsumeResult =
  | { ok: true; usage: UsageSnapshot }
  | { ok: false; scope: "session" | "daily"; usage: UsageSnapshot };

/** UTC calendar day as YYYY-MM-DD. The global allowance resets at 00:00 UTC. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

type Options = { sessionLimit?: number; dailyLimit?: number; day?: string };

/**
 * Reserve one AI request for this session and for today, atomically.
 * Both increments happen in one transaction under row locks, so concurrent
 * calls serialize and exactly `limit` of them succeed. Called before any
 * model dispatch; a rejected call consumes nothing.
 */
export async function consumeAllowance(sessionId: string, opts: Options = {}): Promise<ConsumeResult> {
  const sessionLimit = opts.sessionLimit ?? AI_SESSION_LIMIT;
  const dailyLimit = opts.dailyLimit ?? AI_DAILY_LIMIT;
  const day = opts.day ?? utcDay();
  // Reserve under one connection, release it, then read usage for a rejection
  // on a fresh connection so a burst of callers cannot exhaust the pool.
  const reserved = await reserve(sessionId, sessionLimit, dailyLimit, day);
  if (reserved.ok) return reserved;
  return { ok: false, scope: reserved.scope, usage: await readUsage(sessionId, { sessionLimit, dailyLimit, day }) };
}

async function reserve(sessionId: string, sessionLimit: number, dailyLimit: number, day: string):
  Promise<{ ok: true; usage: UsageSnapshot } | { ok: false; scope: "session" | "daily" }> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const s = await client.query<{ ai_requests_used: number }>(
      `UPDATE demo_sessions SET ai_requests_used = ai_requests_used + 1
       WHERE id = $1 AND ai_requests_used < $2 RETURNING ai_requests_used`,
      [sessionId, sessionLimit],
    );
    if (!s.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, scope: "session" };
    }
    const d = await client.query<{ used: number }>(
      `INSERT INTO usage_daily (day, used) VALUES ($1::date, 1)
       ON CONFLICT (day) DO UPDATE SET used = usage_daily.used + 1 WHERE usage_daily.used < $2
       RETURNING used`,
      [day, dailyLimit],
    );
    if (!d.rowCount) {
      await client.query("ROLLBACK"); // session increment undone too
      return { ok: false, scope: "daily" };
    }
    await client.query("COMMIT");
    return { ok: true, usage: { sessionUsed: s.rows[0].ai_requests_used, sessionLimit, dailyUsed: d.rows[0].used, dailyLimit } };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function readUsage(sessionId: string, opts: Options = {}): Promise<UsageSnapshot> {
  const sessionLimit = opts.sessionLimit ?? AI_SESSION_LIMIT;
  const dailyLimit = opts.dailyLimit ?? AI_DAILY_LIMIT;
  const day = opts.day ?? utcDay();
  const [s, d] = await Promise.all([
    getPool().query<{ ai_requests_used: number }>("SELECT ai_requests_used FROM demo_sessions WHERE id = $1", [sessionId]),
    getPool().query<{ used: number }>("SELECT used FROM usage_daily WHERE day = $1::date", [day]),
  ]);
  return { sessionUsed: s.rows[0]?.ai_requests_used ?? 0, sessionLimit, dailyUsed: d.rows[0]?.used ?? 0, dailyLimit };
}
