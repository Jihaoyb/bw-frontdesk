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
 * One statement (issue 015, was a four-step transaction): the session row is
 * locked and checked first, the day counter increments only when that check
 * passed, and the session increments only when the day counter did. Both
 * writes commit together or not at all, so concurrent calls serialize on the
 * row lock and exactly `limit` of them succeed. Called before any model
 * dispatch; a rejected call consumes nothing.
 */
export async function consumeAllowance(sessionId: string, opts: Options = {}): Promise<ConsumeResult> {
  const sessionLimit = opts.sessionLimit ?? AI_SESSION_LIMIT;
  const dailyLimit = opts.dailyLimit ?? AI_DAILY_LIMIT;
  const day = opts.day ?? utcDay();
  const res = await getPool().query<{ session_used: number | null; daily_used: number | null; session_open: boolean }>(
    `WITH s_open AS (
       SELECT id FROM demo_sessions WHERE id = $1 AND ai_requests_used < $2 FOR UPDATE
     ), d AS (
       INSERT INTO usage_daily (day, used) SELECT $3::date, 1 WHERE EXISTS (SELECT 1 FROM s_open)
       ON CONFLICT (day) DO UPDATE SET used = usage_daily.used + 1 WHERE usage_daily.used < $4
       RETURNING used
     ), s AS (
       UPDATE demo_sessions SET ai_requests_used = ai_requests_used + 1
       WHERE id = $1 AND EXISTS (SELECT 1 FROM d) RETURNING ai_requests_used
     )
     SELECT (SELECT ai_requests_used FROM s) AS session_used, (SELECT used FROM d) AS daily_used,
            EXISTS (SELECT 1 FROM s_open) AS session_open`,
    [sessionId, sessionLimit, day, dailyLimit],
  );
  const row = res.rows[0];
  if (row.session_used != null && row.daily_used != null) {
    return { ok: true, usage: { sessionUsed: row.session_used, sessionLimit, dailyUsed: row.daily_used, dailyLimit } };
  }
  const scope = row.session_open ? "daily" : "session";
  return { ok: false, scope, usage: await readUsage(sessionId, { sessionLimit, dailyLimit, day }) };
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
