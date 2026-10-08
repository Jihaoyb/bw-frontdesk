// Question history and the automated-answer flow. Everything is scoped to the
// active session. The model never writes the database; this module does.
import type { PoolClient } from "pg";
import { answerQuestion, type AnswerResult } from "./answer-service";
import { getPool } from "./db";
import { listPublishedKnowledge, type KnowledgeEntry } from "./knowledge";
import { MODEL_TIMEOUT_MS, CONTEXT_TURNS } from "./limits";
import { createStaffRequest, getOrCreateConversation, getRequest, validateQuestion, validateSubmissionId, type Message, type RequestOrigin, type StaffRequest } from "./requests";
import { consumeAllowance, type UsageSnapshot } from "./usage";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InquiryOutcome = "pending" | "answered" | "clarified" | "handoff_offered" | "sensitive" | "failed" | "staff_requested";

export type Inquiry = {
  id: string;
  sessionId: string;
  submissionId: string;
  questionMessageId: string | null;
  answerMessageId: string | null;
  requestId: string | null;
  question: string;
  outcome: InquiryOutcome;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Evidence copied at answer time. entryId may later be null if the entry is deleted; the text stays. */
export type Evidence = { id: string; messageId: string; entryId: string | null; title: string; policyText: string; publishedAt: Date | null };

type InquiryRow = {
  id: string; session_id: string; submission_id: string; question_message_id: string | null; answer_message_id: string | null;
  request_id: string | null; question: string; outcome: InquiryOutcome; failure_reason: string | null; created_at: Date; updated_at: Date;
};
const COLS = "id, session_id, submission_id, question_message_id, answer_message_id, request_id, question, outcome, failure_reason, created_at, updated_at";
const toInquiry = (r: InquiryRow): Inquiry => ({
  id: r.id, sessionId: r.session_id, submissionId: r.submission_id, questionMessageId: r.question_message_id,
  answerMessageId: r.answer_message_id, requestId: r.request_id, question: r.question, outcome: r.outcome,
  failureReason: r.failure_reason, createdAt: r.created_at, updatedAt: r.updated_at,
});

/**
 * A pending inquiry older than this is stale: the model call has a hard
 * timeout, so a claim that outlives it by this much was abandoned (process
 * killed, database error after the claim). Stale rows are retryable.
 */
export const STALE_PENDING_MS = MODEL_TIMEOUT_MS + 10_000;
export function isStalePending(i: Pick<Inquiry, "outcome" | "updatedAt">, now: Date = new Date()): boolean {
  return i.outcome === "pending" && now.getTime() - i.updatedAt.getTime() > STALE_PENDING_MS;
}

type EvidenceRow = { id: string; message_id: string; entry_id: string | null; title: string; policy_text: string; published_at: Date | null };
const toEvidence = (r: EvidenceRow): Evidence => ({
  id: r.id, messageId: r.message_id, entryId: r.entry_id, title: r.title, policyText: r.policy_text, publishedAt: r.published_at,
});

type MessageRow = { id: string; conversation_id: string; request_id: string | null; speaker: Message["speaker"]; staff_name: string | null; body: string; created_at: Date };
const toMessage = (r: MessageRow): Message => ({
  id: r.id, conversationId: r.conversation_id, requestId: r.request_id, speaker: r.speaker, staffName: r.staff_name, body: r.body, createdAt: r.created_at,
});
const MSG_COLS = "id, conversation_id, request_id, speaker, staff_name, body, created_at";

/**
 * Record a staff request on the question history. A direct request (issue 002
 * path) is its own outcome; a request raised after a handoff offer, a sensitive
 * acknowledgment, or a failed answer keeps that outcome and gains the request link.
 */
export async function recordStaffRequestInquiry(
  client: PoolClient, sessionId: string, input: { conversationId: string; submissionId: string; questionMessageId: string; requestId: string; question: string },
): Promise<void> {
  await client.query(
    `INSERT INTO inquiries (session_id, conversation_id, submission_id, question_message_id, request_id, question, outcome)
     VALUES ($1, $2, $3, $4, $5, $6, 'staff_requested')
     ON CONFLICT (session_id, submission_id) DO UPDATE
       SET request_id = EXCLUDED.request_id, updated_at = now(),
           outcome = CASE WHEN inquiries.outcome IN ('failed', 'pending') THEN 'staff_requested' ELSE inquiries.outcome END,
           failure_reason = CASE WHEN inquiries.outcome IN ('failed', 'pending') THEN NULL ELSE inquiries.failure_reason END`,
    [sessionId, input.conversationId, input.submissionId, input.questionMessageId, input.requestId, input.question],
  );
}

export async function listInquiries(sessionId: string): Promise<Inquiry[]> {
  const res = await getPool().query<InquiryRow>(`SELECT ${COLS} FROM inquiries WHERE session_id = $1 ORDER BY created_at DESC`, [sessionId]);
  return res.rows.map(toInquiry);
}

export async function getInquiry(sessionId: string, inquiryId: string): Promise<Inquiry | null> {
  if (!UUID_RE.test(inquiryId)) return null;
  const res = await getPool().query<InquiryRow>(`SELECT ${COLS} FROM inquiries WHERE id = $1::uuid AND session_id = $2`, [inquiryId, sessionId]);
  return res.rows[0] ? toInquiry(res.rows[0]) : null;
}

/** Evidence for every automated answer in the session, grouped by answer message id. */
export async function listEvidence(sessionId: string): Promise<Map<string, Evidence[]>> {
  const res = await getPool().query<EvidenceRow>(
    `SELECT id, message_id, entry_id, title, policy_text, published_at FROM answer_evidence WHERE session_id = $1 ORDER BY message_id, position`, [sessionId]);
  const map = new Map<string, Evidence[]>();
  for (const r of res.rows) map.set(r.message_id, [...(map.get(r.message_id) ?? []), toEvidence(r)]);
  return map;
}

export async function listEvidenceForMessage(sessionId: string, messageId: string): Promise<Evidence[]> {
  if (!UUID_RE.test(messageId)) return [];
  const res = await getPool().query<EvidenceRow>(
    `SELECT id, message_id, entry_id, title, policy_text, published_at FROM answer_evidence WHERE message_id = $1::uuid AND session_id = $2 ORDER BY position`,
    [messageId, sessionId]);
  return res.rows.map(toEvidence);
}

export type AskResult =
  | { status: "answered" | "clarified" | "handoff_offered" | "sensitive"; inquiry: Inquiry; message: Message; sources: Evidence[]; request: StaffRequest | null; usage: UsageSnapshot | null }
  | { status: "staff_requested"; inquiry: Inquiry; request: StaffRequest; usage: UsageSnapshot | null }
  | { status: "failed"; inquiry: Inquiry; reason: string; usage: UsageSnapshot | null }
  | { status: "limited"; inquiry: Inquiry; scope: "session" | "daily"; usage: UsageSnapshot }
  | { status: "pending"; inquiry: Inquiry };

/**
 * Ask the front desk. Idempotent on (session, submissionId):
 *  - a retry after a lost response returns the saved outcome without a second model call;
 *  - a retry after a failure keeps the original question message and re-asks the model.
 * Allowance is consumed only when the model is actually dispatched.
 */
export async function askFrontDesk(
  sessionId: string, input: { submissionId: string; question: string; usageDay?: string },
): Promise<AskResult> {
  if (!UUID_RE.test(sessionId)) throw new Error("invalid session id");
  if (!validateSubmissionId(input.submissionId)) throw new Error("invalid submission id");
  const v = validateQuestion(input.question);
  if (!v.ok) throw new Error(`invalid question: ${v.error.reason}`);

  // 1. Claim or find the inquiry and save the parent's message once.
  const inquiry = await claimInquiry(sessionId, input.submissionId, v.question);
  if (inquiry.outcome !== "pending" && inquiry.outcome !== "failed") return await replay(sessionId, inquiry);
  if (inquiry.outcome === "pending" && !inquiry.fresh) return { status: "pending", inquiry };

  // 2. Allowance before dispatch. Rejections consume nothing and are not model failures.
  const allowance = await consumeAllowance(sessionId, input.usageDay ? { day: input.usageDay } : {});
  if (!allowance.ok) {
    const updated = await setOutcome(sessionId, inquiry.id, "failed", `allowance_${allowance.scope}`);
    return { status: "limited", inquiry: updated, scope: allowance.scope, usage: allowance.usage };
  }

  // 3. Grounding: published knowledge only (drafts excluded by the query), plus recent parent/front-desk turns.
  const [knowledge, turns] = await Promise.all([listPublishedKnowledge(sessionId), recentTurns(sessionId, inquiry.questionMessageId)]);
  const result = await answerQuestion({ question: v.question, knowledge, turns });

  // 4. Persist the outcome with its evidence.
  return persistResult(sessionId, inquiry, result, allowance.usage);
}

type Claimed = Inquiry & { fresh: boolean };

async function claimInquiry(sessionId: string, submissionId: string, question: string): Promise<Claimed> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const conversationId = await getOrCreateConversation(sessionId, client);
    const claimed = await client.query<InquiryRow>(
      `INSERT INTO inquiries (session_id, conversation_id, submission_id, question, outcome) VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (session_id, submission_id) DO NOTHING RETURNING ${COLS}`,
      [sessionId, conversationId, submissionId, question],
    );
    if (!claimed.rowCount) {
      await client.query("ROLLBACK");
      // Same connection on purpose (see createStaffRequest): never hold one
      // client while waiting for another.
      const existing = await client.query<InquiryRow>(
        `SELECT ${COLS} FROM inquiries WHERE session_id = $1 AND submission_id = $2`, [sessionId, submissionId]);
      const row = toInquiry(existing.rows[0]);
      if (row.outcome === "failed" || row.outcome === "pending") {
        // Retry: a failed row goes back to pending so a concurrent duplicate
        // sees in-flight work. A pending row is reclaimed only once it is stale
        // (older than the model timeout plus grace): the process that claimed
        // it died mid-flight, and nothing else will ever finish it.
        const again = await client.query<InquiryRow>(
          `UPDATE inquiries SET outcome = 'pending', failure_reason = NULL, updated_at = now()
           WHERE id = $1 AND session_id = $2
             AND (outcome = 'failed' OR (outcome = 'pending' AND updated_at < now() - ($3::int * interval '1 millisecond')))
           RETURNING ${COLS}`, [row.id, sessionId, STALE_PENDING_MS]);
        if (again.rows[0]) return { ...toInquiry(again.rows[0]), fresh: true };
        return { ...row, outcome: "pending", fresh: false };
      }
      return { ...row, fresh: false };
    }
    const msg = await client.query<{ id: string }>(
      `INSERT INTO messages (session_id, conversation_id, speaker, body) VALUES ($1, $2, 'parent', $3) RETURNING id`,
      [sessionId, conversationId, question],
    );
    const updated = await client.query<InquiryRow>(
      `UPDATE inquiries SET question_message_id = $1 WHERE id = $2 RETURNING ${COLS}`, [msg.rows[0].id, claimed.rows[0].id]);
    await client.query("COMMIT");
    return { ...toInquiry(updated.rows[0]), fresh: true };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function recentTurns(sessionId: string, excludeMessageId: string | null) {
  const res = await getPool().query<{ speaker: "parent" | "assistant"; body: string }>(
    `SELECT speaker, body FROM messages WHERE session_id = $1 AND speaker IN ('parent', 'assistant') AND id IS DISTINCT FROM $2::uuid
     ORDER BY created_at DESC LIMIT $3`, [sessionId, excludeMessageId, CONTEXT_TURNS]);
  return res.rows.reverse();
}

async function setOutcome(sessionId: string, inquiryId: string, outcome: InquiryOutcome, reason: string | null): Promise<Inquiry> {
  const res = await getPool().query<InquiryRow>(
    `UPDATE inquiries SET outcome = $3, failure_reason = $4, updated_at = now() WHERE id = $1 AND session_id = $2 RETURNING ${COLS}`,
    [inquiryId, sessionId, outcome, reason]);
  return toInquiry(res.rows[0]);
}

async function persistResult(sessionId: string, inquiry: Inquiry, result: AnswerResult, usage: UsageSnapshot | null): Promise<AskResult> {
  if (result.kind === "failure") {
    const updated = await setOutcome(sessionId, inquiry.id, "failed", result.reason);
    return { status: "failed", inquiry: updated, reason: result.reason, usage };
  }
  const sources: KnowledgeEntry[] = result.kind === "answer" || result.kind === "handoff" ? result.sources : [];

  // Explicit staff intent (user story 7): the handoff proceeds now, with no
  // second confirmation and no front-desk message. Sensitive questions still get
  // their acknowledgment first, then the request.
  if (result.contactStaff && result.kind !== "sensitive") {
    const { request } = await createStaffRequest(sessionId, {
      submissionId: inquiry.submissionId, question: inquiry.question, origin: "parent_initiated", knownPolicyEntryId: sources[0]?.id ?? null,
    });
    const updated = await getInquiry(sessionId, inquiry.id);
    return { status: "staff_requested", inquiry: updated ?? inquiry, request, usage };
  }

  const outcome: InquiryOutcome =
    result.kind === "answer" ? "answered" : result.kind === "clarify" ? "clarified" : result.kind === "sensitive" ? "sensitive" : "handoff_offered";
  const client = await getPool().connect();
  let saved: { inquiry: Inquiry; message: Message; sources: Evidence[] };
  try {
    await client.query("BEGIN");
    const conv = await client.query<{ conversation_id: string }>("SELECT conversation_id FROM inquiries WHERE id = $1", [inquiry.id]);
    const msg = await client.query<MessageRow>(
      `INSERT INTO messages (session_id, conversation_id, speaker, body) VALUES ($1, $2, 'assistant', $3) RETURNING ${MSG_COLS}`,
      [sessionId, conv.rows[0].conversation_id, result.text]);
    const evidence: Evidence[] = [];
    for (const [i, k] of sources.entries()) {
      const ev = await client.query<EvidenceRow>(
        `INSERT INTO answer_evidence (session_id, message_id, entry_id, title, policy_text, published_at, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, message_id, entry_id, title, policy_text, published_at`,
        [sessionId, msg.rows[0].id, k.id, k.title, k.policyText, k.publishedAt, i]);
      evidence.push(toEvidence(ev.rows[0]));
    }
    const upd = await client.query<InquiryRow>(
      `UPDATE inquiries SET outcome = $3, answer_message_id = $4, failure_reason = NULL, updated_at = now()
       WHERE id = $1 AND session_id = $2 RETURNING ${COLS}`, [inquiry.id, sessionId, outcome, msg.rows[0].id]);
    await client.query("COMMIT");
    saved = { inquiry: toInquiry(upd.rows[0]), message: toMessage(msg.rows[0]), sources: evidence };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  // Sensitive + explicit staff intent: hand off directly, flagged sensitive.
  let request: StaffRequest | null = null;
  if (result.kind === "sensitive" && result.contactStaff) {
    request = (await createStaffRequest(sessionId, { submissionId: inquiry.submissionId, question: inquiry.question, origin: "sensitive" })).request;
    saved.inquiry = (await getInquiry(sessionId, inquiry.id)) ?? saved.inquiry;
  }
  return { status: outcome as "answered" | "clarified" | "handoff_offered" | "sensitive", ...saved, request, usage };
}

/**
 * How a staff request raised from the conversation should be filed, derived
 * from the saved question rather than trusted from the client: a handoff offer
 * keeps the policy it cited as known policy; a sensitive acknowledgment flags
 * the request sensitive. Unknown submissions are plain parent-initiated requests.
 */
export async function deriveRequestOrigin(sessionId: string, submissionId: string): Promise<{ origin: RequestOrigin; knownPolicyEntryId: string | null }> {
  const res = await getPool().query<{ outcome: InquiryOutcome; entry_id: string | null }>(
    `SELECT i.outcome, (SELECT entry_id FROM answer_evidence e WHERE e.message_id = i.answer_message_id AND e.session_id = i.session_id ORDER BY position LIMIT 1) AS entry_id
     FROM inquiries i WHERE i.session_id = $1 AND i.submission_id = $2`, [sessionId, submissionId]);
  const row = res.rows[0];
  if (!row) return { origin: "parent_initiated", knownPolicyEntryId: null };
  if (row.outcome === "sensitive") return { origin: "sensitive", knownPolicyEntryId: null };
  if (row.outcome === "handoff_offered") return { origin: "handoff_offered", knownPolicyEntryId: row.entry_id };
  return { origin: "parent_initiated", knownPolicyEntryId: row.entry_id };
}

/** A retry after a lost response: return what was already saved, no second model call. */
async function replay(sessionId: string, inquiry: Inquiry): Promise<AskResult> {
  if (inquiry.outcome === "staff_requested") {
    const request = inquiry.requestId ? await getRequest(sessionId, inquiry.requestId) : null;
    if (request) return { status: "staff_requested", inquiry, request, usage: null };
  }
  if (inquiry.outcome === "staff_requested" || !inquiry.answerMessageId) {
    return { status: "failed", inquiry, reason: "no_answer_saved", usage: null };
  }
  const [msg, sources] = await Promise.all([
    getPool().query<MessageRow>(`SELECT ${MSG_COLS} FROM messages WHERE id = $1 AND session_id = $2`, [inquiry.answerMessageId, sessionId]),
    listEvidenceForMessage(sessionId, inquiry.answerMessageId),
  ]);
  return { status: inquiry.outcome as "answered" | "clarified" | "handoff_offered" | "sensitive", inquiry, message: toMessage(msg.rows[0]), sources, request: null, usage: null };
}
