import { getPool } from './db';
import { getOrCreateConversation, validateSubmissionId } from './requests';
import { STALE_PENDING_MS } from './inquiries';

/** Compare-and-swap on the active conversation makes duplicate restarts idempotent. */
export async function startNewConversation(sessionId: string, expectedId: string): Promise<string> {
  if (!validateSubmissionId(expectedId)) throw new Error('invalid conversation');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM demo_sessions WHERE id = $1 FOR UPDATE', [sessionId]);
    const active = await getOrCreateConversation(sessionId, client);
    if (active !== expectedId) { await client.query('COMMIT'); return active; }
    const pending = await client.query(
      `SELECT 1 FROM inquiries WHERE session_id = $1 AND conversation_id = $2 AND outcome = 'pending'
       AND updated_at >= now() - ($3::int * interval '1 millisecond')`, [sessionId, active, STALE_PENDING_MS]);
    if (pending.rowCount) throw new Error('A message is still being saved. Wait before starting over.');
    const messages = await client.query('SELECT 1 FROM messages WHERE session_id = $1 AND conversation_id = $2 LIMIT 1', [sessionId, active]);
    if (!messages.rowCount) { await client.query('COMMIT'); return active; }
    await client.query('UPDATE conversations SET is_active = false WHERE id = $1 AND session_id = $2', [active, sessionId]);
    const next = await getOrCreateConversation(sessionId, client);
    await client.query('COMMIT');
    return next;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
