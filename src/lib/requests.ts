import type { PoolClient } from "pg";
import { getPool } from "./db";
import { MAX_QUESTION_CHARS } from "./limits";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RequestOrigin = "parent_initiated" | "handoff_offered" | "sensitive";
export type RequestStatus = "awaiting_review" | "staff_reviewing" | "needs_your_reply" | "closed";

export type StaffRequest = {
  id: string;
  sessionId: string;
  conversationId: string;
  questionMessageId: string | null;
  submissionId: string;
  question: string;
  origin: RequestOrigin;
  status: RequestStatus;
  knownPolicyEntryId: string | null;
  createdAt: Date;
};

export type Message = {
  id: string;
  conversationId: string;
  speaker: "parent" | "assistant" | "staff";
  staffName: string | null;
  body: string;
  createdAt: Date;
};

export type ValidationError = { field: "question" | "submissionId"; reason: string };

/** Validate before any database or model work. Returns the trimmed question. */
export function validateQuestion(raw: unknown): { ok: true; question: string } | { ok: false; error: ValidationError } {
  if (typeof raw !== "string") return { ok: false, error: { field: "question", reason: "required" } };
  const question = raw.trim();
  if (!question) return { ok: false, error: { field: "question", reason: "empty" } };
  if (question.length > MAX_QUESTION_CHARS) return { ok: false, error: { field: "question", reason: `over ${MAX_QUESTION_CHARS} characters` } };
  return { ok: true, question };
}

export function validateSubmissionId(raw: unknown): raw is string {
  return typeof raw === "string" && UUID_RE.test(raw);
}

type RequestRow = {
  id: string; session_id: string; conversation_id: string; question_message_id: string | null;
  submission_id: string; question: string; origin: RequestOrigin; status: RequestStatus;
  known_policy_entry_id: string | null; created_at: Date;
};
const toRequest = (r: RequestRow): StaffRequest => ({
  id: r.id, sessionId: r.session_id, conversationId: r.conversation_id, questionMessageId: r.question_message_id,
  submissionId: r.submission_id, question: r.question, origin: r.origin, status: r.status,
  knownPolicyEntryId: r.known_policy_entry_id, createdAt: r.created_at,
});
const REQUEST_COLS = "id, session_id, conversation_id, question_message_id, submission_id, question, origin, status, known_policy_entry_id, created_at";

type MessageRow = { id: string; conversation_id: string; speaker: Message["speaker"]; staff_name: string | null; body: string; created_at: Date };
const toMessage = (r: MessageRow): Message => ({
  id: r.id, conversationId: r.conversation_id, speaker: r.speaker, staffName: r.staff_name, body: r.body, createdAt: r.created_at,
});

/** The session's single parent conversation for this prototype, created on demand. */
export async function getOrCreateConversation(sessionId: string, client?: PoolClient): Promise<string> {
  const q = client ?? getPool();
  const existing = await q.query<{ id: string }>(
    "SELECT id FROM conversations WHERE session_id = $1 ORDER BY created_at LIMIT 1", [sessionId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await q.query<{ id: string }>(
    "INSERT INTO conversations (session_id) VALUES ($1) RETURNING id", [sessionId]);
  return created.rows[0].id;
}

export type CreateRequestInput = { submissionId: string; question: string; origin: RequestOrigin };
export type CreateRequestResult = { request: StaffRequest; created: boolean };

/**
 * Save the parent's question and create one individual staff request.
 * Idempotent on (session, submissionId): a retry after a lost response, even a
 * concurrent one, returns the existing request and adds no second message.
 */
export async function createStaffRequest(sessionId: string, input: CreateRequestInput): Promise<CreateRequestResult> {
  if (!UUID_RE.test(sessionId)) throw new Error("invalid session id");
  if (!validateSubmissionId(input.submissionId)) throw new Error("invalid submission id");
  const v = validateQuestion(input.question);
  if (!v.ok) throw new Error(`invalid question: ${v.error.reason}`);

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const conversationId = await getOrCreateConversation(sessionId, client);
    // Claim the submission identity first; a concurrent duplicate blocks here
    // until we commit, then sees the conflict and returns nothing.
    const claimed = await client.query<RequestRow>(
      `INSERT INTO staff_requests (session_id, conversation_id, submission_id, question, origin)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id, submission_id) DO NOTHING
       RETURNING ${REQUEST_COLS}`,
      [sessionId, conversationId, input.submissionId, v.question, input.origin],
    );
    if (!claimed.rowCount) {
      await client.query("ROLLBACK");
      const existing = await getPool().query<RequestRow>(
        `SELECT ${REQUEST_COLS} FROM staff_requests WHERE session_id = $1 AND submission_id = $2`,
        [sessionId, input.submissionId]);
      return { request: toRequest(existing.rows[0]), created: false };
    }
    const msg = await client.query<{ id: string }>(
      `INSERT INTO messages (session_id, conversation_id, speaker, body) VALUES ($1, $2, 'parent', $3) RETURNING id`,
      [sessionId, conversationId, v.question],
    );
    const updated = await client.query<RequestRow>(
      `UPDATE staff_requests SET question_message_id = $1 WHERE id = $2 RETURNING ${REQUEST_COLS}`,
      [msg.rows[0].id, claimed.rows[0].id],
    );
    await client.query("COMMIT");
    return { request: toRequest(updated.rows[0]), created: true };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function listRequests(sessionId: string): Promise<StaffRequest[]> {
  const res = await getPool().query<RequestRow>(
    `SELECT ${REQUEST_COLS} FROM staff_requests WHERE session_id = $1 ORDER BY created_at DESC`, [sessionId]);
  return res.rows.map(toRequest);
}

/** Scoped read: a request id from another session resolves to null. Reading never changes status. */
export async function getRequest(sessionId: string, requestId: string): Promise<StaffRequest | null> {
  if (!UUID_RE.test(requestId)) return null;
  const res = await getPool().query<RequestRow>(
    `SELECT ${REQUEST_COLS} FROM staff_requests WHERE id = $1::uuid AND session_id = $2`, [requestId, sessionId]);
  return res.rows[0] ? toRequest(res.rows[0]) : null;
}

export async function listMessages(sessionId: string): Promise<Message[]> {
  const res = await getPool().query<MessageRow>(
    `SELECT m.id, m.conversation_id, m.speaker, m.staff_name, m.body, m.created_at
     FROM messages m JOIN conversations c ON c.id = m.conversation_id
     WHERE c.session_id = $1 AND m.session_id = $1
     ORDER BY m.created_at`, [sessionId]);
  return res.rows.map(toMessage);
}
