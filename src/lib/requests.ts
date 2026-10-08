import type { PoolClient } from "pg";
import { getPool } from "./db";
import { MAX_QUESTION_CHARS } from "./limits";
import { centerConfig } from "./center-config";
import { recordStaffRequestInquiry } from "./inquiries";

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
  /** Knowledge draft opened from this request (issue 007); null until an operator opens one. */
  knowledgeDraftEntryId: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date;
};

export type Message = {
  id: string;
  conversationId: string;
  requestId: string | null;
  speaker: "parent" | "assistant" | "staff";
  staffName: string | null;
  body: string;
  createdAt: Date;
};

/** Fictional staff names, verbatim from docs/test-inquiries.md via center config. */
export const STAFF_NAMES: readonly string[] = centerConfig.staff.map((s) => s.name);
export function isStaffName(raw: unknown): raw is string {
  return typeof raw === "string" && STAFF_NAMES.includes(raw);
}

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
  known_policy_entry_id: string | null; knowledge_draft_entry_id: string | null; created_at: Date; reviewed_at: Date | null; closed_at: Date | null; updated_at: Date;
};
const toRequest = (r: RequestRow): StaffRequest => ({
  id: r.id, sessionId: r.session_id, conversationId: r.conversation_id, questionMessageId: r.question_message_id,
  submissionId: r.submission_id, question: r.question, origin: r.origin, status: r.status,
  knownPolicyEntryId: r.known_policy_entry_id, knowledgeDraftEntryId: r.knowledge_draft_entry_id, createdAt: r.created_at,
  reviewedAt: r.reviewed_at, closedAt: r.closed_at, updatedAt: r.updated_at,
});
const REQUEST_COLS = "id, session_id, conversation_id, question_message_id, submission_id, question, origin, status, known_policy_entry_id, knowledge_draft_entry_id, created_at, reviewed_at, closed_at, updated_at";

type MessageRow = { id: string; conversation_id: string; request_id: string | null; speaker: Message["speaker"]; staff_name: string | null; body: string; created_at: Date };
const toMessage = (r: MessageRow): Message => ({
  id: r.id, conversationId: r.conversation_id, requestId: r.request_id, speaker: r.speaker, staffName: r.staff_name, body: r.body, createdAt: r.created_at,
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

export type CreateRequestInput = { submissionId: string; question: string; origin: RequestOrigin; knownPolicyEntryId?: string | null };
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
      `INSERT INTO staff_requests (session_id, conversation_id, submission_id, question, origin, known_policy_entry_id)
       VALUES ($1, $2, $3, $4, $5, (SELECT id FROM knowledge_entries WHERE id = $6::uuid AND session_id = $1))
       ON CONFLICT (session_id, submission_id) DO NOTHING
       RETURNING ${REQUEST_COLS}`,
      [sessionId, conversationId, input.submissionId, v.question, input.origin, input.knownPolicyEntryId && UUID_RE.test(input.knownPolicyEntryId) ? input.knownPolicyEntryId : null],
    );
    if (!claimed.rowCount) {
      await client.query("ROLLBACK");
      // Reuse the connection we already hold: asking the pool for a second one
      // while holding this one let N concurrent duplicates exhaust a pool of N.
      const existing = await client.query<RequestRow>(
        `SELECT ${REQUEST_COLS} FROM staff_requests WHERE session_id = $1 AND submission_id = $2`,
        [sessionId, input.submissionId]);
      return { request: toRequest(existing.rows[0]), created: false };
    }
    // If this question was already saved by the front desk flow (failed answer,
    // handoff offer, sensitive, or explicit staff intent → Ask staff), attach the
    // request to that message instead of saving it twice.
    const prior = await client.query<{ question_message_id: string | null }>(
      "SELECT question_message_id FROM inquiries WHERE session_id = $1 AND submission_id = $2", [sessionId, input.submissionId]);
    const msg = prior.rows[0]?.question_message_id
      ? await client.query<{ id: string }>(
        "UPDATE messages SET request_id = $3 WHERE id = $1 AND session_id = $2 RETURNING id",
        [prior.rows[0].question_message_id, sessionId, claimed.rows[0].id])
      : await client.query<{ id: string }>(
        `INSERT INTO messages (session_id, conversation_id, request_id, speaker, body) VALUES ($1, $2, $3, 'parent', $4) RETURNING id`,
        [sessionId, conversationId, claimed.rows[0].id, v.question],
      );
    const updated = await client.query<RequestRow>(
      `UPDATE staff_requests SET question_message_id = $1 WHERE id = $2 RETURNING ${REQUEST_COLS}`,
      [msg.rows[0].id, claimed.rows[0].id],
    );
    // Question history (issue 004): a direct staff request is still a parent question.
    await recordStaffRequestInquiry(client, sessionId, {
      conversationId, submissionId: input.submissionId, questionMessageId: msg.rows[0].id, requestId: claimed.rows[0].id, question: v.question,
    });
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
    `SELECT m.id, m.conversation_id, m.request_id, m.speaker, m.staff_name, m.body, m.created_at
     FROM messages m JOIN conversations c ON c.id = m.conversation_id
     WHERE c.session_id = $1 AND m.session_id = $1
     ORDER BY m.created_at`, [sessionId]);
  return res.rows.map(toMessage);
}

// ---- Issue 003: staff/parent exchange and progress transitions ----
// Every transition is one scoped UPDATE (id AND session_id); a request id from
// another session matches no row and the action reports not found. None of
// these publish knowledge or confirm a service; they only move the request.

export type TransitionResult =
  | { ok: true; request: StaffRequest; message?: Message }
  | { ok: false; error: "not_found" | "invalid_body" | "invalid_staff_name" };

function scopedUpdate(client: PoolClient | ReturnType<typeof getPool>, sessionId: string, requestId: string, setSql: string, params: unknown[] = []) {
  return client.query<RequestRow>(
    `UPDATE staff_requests SET ${setSql}, updated_at = now()
     WHERE id = $1::uuid AND session_id = $2 RETURNING ${REQUEST_COLS}`,
    [requestId, sessionId, ...params],
  );
}

/** Explicit staff action. Opening the page never calls this. Closed requests stay closed (use reopen). */
export async function markReviewing(sessionId: string, requestId: string): Promise<TransitionResult> {
  if (!UUID_RE.test(requestId)) return { ok: false, error: "not_found" };
  const res = await scopedUpdate(getPool(), sessionId, requestId,
    `status = CASE WHEN status = 'closed' THEN status ELSE 'staff_reviewing' END,
     reviewed_at = COALESCE(reviewed_at, now())`);
  return res.rows[0] ? { ok: true, request: toRequest(res.rows[0]) } : { ok: false, error: "not_found" };
}

/** Undo for close. No confirmation step; the request is back with staff. */
export async function reopenRequest(sessionId: string, requestId: string): Promise<TransitionResult> {
  if (!UUID_RE.test(requestId)) return { ok: false, error: "not_found" };
  const res = await scopedUpdate(getPool(), sessionId, requestId,
    `status = CASE WHEN status = 'closed' THEN 'staff_reviewing' ELSE status END, closed_at = NULL`);
  return res.rows[0] ? { ok: true, request: toRequest(res.rows[0]) } : { ok: false, error: "not_found" };
}

export type StaffReplyOutcome = "reply" | "needs_your_reply" | "close";

/**
 * Save a staff message on the request, then move progress by outcome:
 *   reply            awaiting_review → staff_reviewing; otherwise unchanged
 *   needs_your_reply → needs_your_reply (reopens if closed)
 *   close            → closed, closed_at set
 * A staff reply is a message to this family only; it is not published knowledge.
 */
export async function staffReply(
  sessionId: string, requestId: string, input: { staffName: unknown; body: unknown; outcome: StaffReplyOutcome; submissionId?: unknown },
): Promise<TransitionResult> {
  if (!UUID_RE.test(requestId)) return { ok: false, error: "not_found" };
  if (!isStaffName(input.staffName)) return { ok: false, error: "invalid_staff_name" };
  const v = validateQuestion(input.body);
  if (!v.ok) return { ok: false, error: "invalid_body" };
  const submissionId = validateSubmissionId(input.submissionId) ? input.submissionId : null;
  const statusSql = {
    reply: `status = CASE WHEN status = 'awaiting_review' THEN 'staff_reviewing' ELSE status END`,
    needs_your_reply: `status = 'needs_your_reply', closed_at = NULL`,
    close: `status = 'closed', closed_at = now()`,
  }[input.outcome];
  return withRequest(sessionId, requestId, async (client, req) => {
    // Idempotent on (session, submissionId): a retry after a lost response
    // finds the message already saved and changes nothing.
    const already = await findReplyBySubmission(client, sessionId, submissionId);
    if (already) return { ok: true, request: toRequest(req), message: already };
    const msg = await client.query<MessageRow>(
      `INSERT INTO messages (session_id, conversation_id, request_id, speaker, staff_name, body, submission_id)
       VALUES ($1, $2, $3, 'staff', $4, $5, $6::uuid)
       RETURNING id, conversation_id, request_id, speaker, staff_name, body, created_at`,
      [sessionId, req.conversation_id, req.id, input.staffName, v.question, submissionId],
    );
    const upd = await scopedUpdate(client, sessionId, requestId, `${statusSql}, reviewed_at = COALESCE(reviewed_at, now())`);
    return { ok: true, request: toRequest(upd.rows[0]), message: toMessage(msg.rows[0]) };
  });
}

/** The reply saved under this submission id, if any. Runs inside the request's row lock, so duplicates serialize. */
async function findReplyBySubmission(client: PoolClient, sessionId: string, submissionId: string | null): Promise<Message | null> {
  if (!submissionId) return null;
  const res = await client.query<MessageRow>(
    `SELECT id, conversation_id, request_id, speaker, staff_name, body, created_at
     FROM messages WHERE session_id = $1 AND submission_id = $2::uuid`, [sessionId, submissionId]);
  return res.rows[0] ? toMessage(res.rows[0]) : null;
}

/**
 * Parent adds details under a request. Closed or needs-your-reply requests go
 * back to awaiting_review; a request staff is already reviewing stays there.
 */
export async function parentReply(sessionId: string, requestId: string, body: unknown, submissionIdRaw?: unknown): Promise<TransitionResult> {
  if (!UUID_RE.test(requestId)) return { ok: false, error: "not_found" };
  const v = validateQuestion(body);
  if (!v.ok) return { ok: false, error: "invalid_body" };
  const submissionId = validateSubmissionId(submissionIdRaw) ? submissionIdRaw : null;
  return withRequest(sessionId, requestId, async (client, req) => {
    const already = await findReplyBySubmission(client, sessionId, submissionId);
    if (already) return { ok: true, request: toRequest(req), message: already };
    const msg = await client.query<MessageRow>(
      `INSERT INTO messages (session_id, conversation_id, request_id, speaker, body, submission_id)
       VALUES ($1, $2, $3, 'parent', $4, $5::uuid)
       RETURNING id, conversation_id, request_id, speaker, staff_name, body, created_at`,
      [sessionId, req.conversation_id, req.id, v.question, submissionId],
    );
    const upd = await scopedUpdate(client, sessionId, requestId,
      `status = CASE WHEN status IN ('closed', 'needs_your_reply') THEN 'awaiting_review' ELSE status END, closed_at = NULL`);
    return { ok: true, request: toRequest(upd.rows[0]), message: toMessage(msg.rows[0]) };
  });
}

async function withRequest(
  sessionId: string, requestId: string,
  fn: (client: PoolClient, req: RequestRow) => Promise<TransitionResult>,
): Promise<TransitionResult> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<RequestRow>(
      `SELECT ${REQUEST_COLS} FROM staff_requests WHERE id = $1::uuid AND session_id = $2 FOR UPDATE`, [requestId, sessionId]);
    if (!found.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false, error: "not_found" };
    }
    const result = await fn(client, found.rows[0]);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * The conversation leading up to a request: the parent/front-desk turns before
 * the request's question (clarifications, the AI explanation that triggered the
 * handoff). Staff see what the family saw, not just the tagged question. Scoped.
 */
export async function listContextBeforeRequest(sessionId: string, requestId: string, limit = 6): Promise<Message[]> {
  if (!UUID_RE.test(requestId)) return [];
  const res = await getPool().query<MessageRow>(
    `SELECT m.id, m.conversation_id, m.request_id, m.speaker, m.staff_name, m.body, m.created_at
     FROM messages m
     JOIN staff_requests r ON r.id = $1::uuid AND r.session_id = $2 AND r.conversation_id = m.conversation_id
     LEFT JOIN messages q ON q.id = r.question_message_id
     WHERE m.session_id = $2
       AND m.speaker IN ('parent', 'assistant')
       AND (m.request_id IS NULL OR m.request_id <> r.id)
       AND m.created_at < COALESCE(q.created_at, r.created_at)
     ORDER BY m.created_at DESC LIMIT $3`, [requestId, sessionId, limit]);
  return res.rows.reverse().map(toMessage);
}

/** Messages attached to one request (question, parent details, staff replies), oldest first. Scoped. */
export async function listRequestMessages(sessionId: string, requestId: string): Promise<Message[]> {
  if (!UUID_RE.test(requestId)) return [];
  const res = await getPool().query<MessageRow>(
    `SELECT id, conversation_id, request_id, speaker, staff_name, body, created_at
     FROM messages WHERE request_id = $1::uuid AND session_id = $2 ORDER BY created_at`, [requestId, sessionId]);
  return res.rows.map(toMessage);
}
