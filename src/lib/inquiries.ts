// Question history and the automated-answer flow. Everything is scoped to the
// active session. The model never writes the database; this module does.
import { smallTalkReply } from "./small-talk";
import type { PoolClient } from "pg";
import { answerQuestion, type AnswerResult } from "./answer-service";
import { randomUUID } from "node:crypto";
import { getPool } from "./db";
import { listPublishedKnowledge, type KnowledgeEntry } from "./knowledge";
import { MODEL_TIMEOUT_MS, CONTEXT_TURNS } from "./limits";
import { createStaffRequest, getOrCreateConversation, getRequest, validateQuestion, validateSubmissionId, type Message, type RequestOrigin, type StaffRequest } from "./requests";
import { consumeAllowance, type UsageSnapshot } from "./usage";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InquiryOutcome = "pending" | "chat" | "answered" | "clarified" | "handoff_offered" | "sensitive" | "failed" | "staff_requested";

export type Inquiry = {
  id: string;
  sessionId: string;
  conversationId?: string;
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
  id: string; session_id: string; conversation_id: string; submission_id: string; question_message_id: string | null; answer_message_id: string | null;
  request_id: string | null; question: string; outcome: InquiryOutcome; failure_reason: string | null; created_at: Date; updated_at: Date;
};
const COLS = "id, session_id, conversation_id, submission_id, question_message_id, answer_message_id, request_id, question, outcome, failure_reason, created_at, updated_at";
const toInquiry = (r: InquiryRow): Inquiry => ({
  id: r.id, sessionId: r.session_id, conversationId: r.conversation_id, submissionId: r.submission_id, questionMessageId: r.question_message_id,
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

/** A row that came back through to_jsonb: timestamps are ISO strings, so revive the dated columns. */
function fromJson<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of ["created_at", "updated_at", "published_at"]) if (typeof out[k] === "string") out[k] = new Date(out[k] as string);
  return out as T;
}

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
           outcome = CASE WHEN inquiries.outcome = 'pending' THEN 'staff_requested' ELSE inquiries.outcome END,
           failure_reason = CASE WHEN inquiries.outcome = 'pending' THEN NULL ELSE inquiries.failure_reason END`,
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
  | { status: "chat" | "answered" | "clarified" | "handoff_offered" | "sensitive"; inquiry: Inquiry; message: Message; sources: Evidence[]; request: StaffRequest | null; usage: UsageSnapshot | null }
  | { status: "staff_requested"; inquiry: Inquiry; request: StaffRequest; usage: UsageSnapshot | null }
  | { status: "failed"; inquiry: Inquiry; reason: string; usage: UsageSnapshot | null }
  | { status: "limited"; inquiry: Inquiry; scope: "session" | "daily"; usage: UsageSnapshot }
  | { status: "pending"; inquiry: Inquiry };

/** Durations only: never include questions, policy text, or session identifiers. */
export type AskTimings = Partial<Record<"claim" | "grounding" | "model" | "persist", number>>;

/**
 * Ask the front desk. Idempotent on (session, submissionId):
 *  - a retry after a lost response returns the saved outcome without a second model call;
 *  - a retry after a failure keeps the original question message and re-asks the model.
 * Allowance is consumed only when the model is actually dispatched.
 */
export async function askFrontDesk(
  sessionId: string, input: { conversationId?: string; submissionId: string; question: string; usageDay?: string; timings?: AskTimings },
): Promise<AskResult> {
  if (!UUID_RE.test(sessionId)) throw new Error("invalid session id");
  if (!validateSubmissionId(input.submissionId)) throw new Error("invalid submission id");
  const v = validateQuestion(input.question);
  if (!v.ok) throw new Error(`invalid question: ${v.error.reason}`);

  // 1. Claim or find the inquiry and save the parent's message once.
  let started = performance.now();
  const inquiry = await claimInquiry(sessionId, input.submissionId, v.question, input.conversationId);
  if (input.timings) input.timings.claim = performance.now() - started;
  if (inquiry.requestId) {
    const request = await getRequest(sessionId, inquiry.requestId);
    if (request) return { status: "staff_requested", inquiry, request, usage: null };
  }
  if (inquiry.outcome !== "pending" && inquiry.outcome !== "failed") return await replay(sessionId, inquiry);
  if (inquiry.outcome === "pending" && !inquiry.fresh) return { status: "pending", inquiry };

  // Canned social replies still persist and replay, but need no model, policies, or allowance.
  const greeting = smallTalkReply(inquiry.question);
  if (greeting) return persistResult(sessionId, inquiry, { kind: "chat", text: greeting, contactStaff: false }, null);

  // 2. Allowance before dispatch. Rejections consume nothing and are not model failures.
  started = performance.now();
  const allowancePromise = consumeAllowance(sessionId, input.usageDay ? { day: input.usageDay } : {});
  // 3. Grounding: published knowledge only (drafts excluded by the query), plus recent parent/front-desk turns.
  // Read alongside the reservation (issue 015): a rejection wastes two reads, never a model call.
  const [allowance, knowledge, turns] = await Promise.all([allowancePromise, listPublishedKnowledge(sessionId), recentTurns(sessionId, inquiry.questionMessageId)]);
  if (input.timings) input.timings.grounding = performance.now() - started;
  if (!allowance.ok) {
    const updated = await setOutcome(sessionId, inquiry.id, "failed", `allowance_${allowance.scope}`);
    return { status: "limited", inquiry: updated, scope: allowance.scope, usage: allowance.usage };
  }
  started = performance.now();
  const result = await answerQuestion({ question: inquiry.question, knowledge, turns });
  if (input.timings) input.timings.model = performance.now() - started;

  // 4. Persist the outcome with its evidence.
  started = performance.now();
  const saved = await persistResult(sessionId, inquiry, result, allowance.usage);
  if (input.timings) input.timings.persist = performance.now() - started;
  return saved;
}

type Claimed = Inquiry & { fresh: boolean };

async function claimInquiry(sessionId: string, submissionId: string, question: string, expectedConversation?: string): Promise<Claimed> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM demo_sessions WHERE id = $1 FOR UPDATE", [sessionId]);
    const result = await claimInquiryWithClient(client, sessionId, submissionId, question, expectedConversation);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function claimInquiryWithClient(client: PoolClient, sessionId: string, submissionId: string, question: string, expectedConversation?: string): Promise<Claimed> {
  // One statement for the common case: insert the inquiry and its parent
  // message, linked by ids generated here (a statement cannot read rows its
  // own CTEs inserted, so the link cannot be an UPDATE). A duplicate
  // submission inserts nothing and falls through.
  const inquiryId = randomUUID();
  const messageId = randomUUID();
  const claimSql = `
    WITH conv AS (SELECT id FROM conversations WHERE session_id = $1 AND is_active
                 AND ($6::uuid IS NULL OR id = $6::uuid)),
         q AS (INSERT INTO inquiries (id, session_id, conversation_id, submission_id, question, outcome, question_message_id)
               SELECT $4, $1, conv.id, $2, $3, 'pending', $5 FROM conv
               ON CONFLICT (session_id, submission_id) DO NOTHING RETURNING ${COLS}),
         m AS (INSERT INTO messages (id, session_id, conversation_id, speaker, body)
               SELECT $5, $1, q.conversation_id, 'parent', $3 FROM q RETURNING id)
    SELECT ${COLS} FROM q`;
  // The session lock still serializes restart/claim. Check the active chat in
  // the insert itself, saving two network round trips on every new question.
  // Duplicate submissions fall through to their original saved inquiry.
  const params = [sessionId, submissionId, question, inquiryId, messageId, expectedConversation ?? null];
  let claimed = await client.query<InquiryRow>(claimSql, params);
  if (!claimed.rowCount) {
    const existing = await client.query<InquiryRow>(
      `SELECT ${COLS} FROM inquiries WHERE session_id = $1 AND submission_id = $2`, [sessionId, submissionId]);
    if (!existing.rows[0]) {
      // No conversation yet (session predates seeding one): create it, claim again.
      const active = await getOrCreateConversation(sessionId, client);
      if (expectedConversation && expectedConversation !== active) throw new Error("conversation_changed");
      claimed = await client.query<InquiryRow>(claimSql, params);
      if (claimed.rows[0]) return { ...toInquiry(claimed.rows[0]), fresh: true };
      const raced = await client.query<InquiryRow>(`SELECT ${COLS} FROM inquiries WHERE session_id = $1 AND submission_id = $2`, [sessionId, submissionId]);
      existing.rows[0] = raced.rows[0];
    }
    const row = toInquiry(existing.rows[0]);
    if (!row.requestId && (row.outcome === "failed" || row.outcome === "pending")) {
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
  return { ...toInquiry(claimed.rows[0]), fresh: true };
}

async function recentTurns(sessionId: string, excludeMessageId: string | null) {
  const res = await getPool().query<{ speaker: "parent" | "assistant"; body: string }>(
    `SELECT speaker, body FROM messages WHERE session_id = $1 AND conversation_id = (SELECT conversation_id FROM messages WHERE id = $2::uuid AND session_id = $1) AND speaker IN ('parent', 'assistant') AND id IS DISTINCT FROM $2::uuid
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
    result.kind === "chat" ? "chat" : result.kind === "answer" ? "answered" : result.kind === "clarify" ? "clarified" : result.kind === "sensitive" ? "sensitive" : "handoff_offered";
  // One statement (issue 015, was a five-step transaction): the assistant
  // message, its evidence rows, and the inquiry outcome commit together. The
  // message id is generated here so the evidence and the inquiry can reference
  // it inside the same statement. Rows come back as JSON, dated fields as text.
  const messageId = randomUUID();
  const persisted = await getPool().query<{ kind: "message" | "evidence" | "inquiry"; row: Record<string, unknown> }>(
    `WITH m AS (
       INSERT INTO messages (id, session_id, conversation_id, speaker, body)
       SELECT $3, $1, conversation_id, 'assistant', $4 FROM inquiries WHERE id = $2 AND session_id = $1 RETURNING ${MSG_COLS}
     ), ev AS (
       INSERT INTO answer_evidence (session_id, message_id, entry_id, title, policy_text, published_at, position)
       SELECT $1, m.id, e.entry_id, e.title, e.policy_text, e.published_at, e.position
       FROM m, unnest($5::uuid[], $6::text[], $7::text[], $8::timestamptz[], $9::int[]) AS e(entry_id, title, policy_text, published_at, position)
       RETURNING id, message_id, entry_id, title, policy_text, published_at, position
     ), u AS (
       UPDATE inquiries SET outcome = $10, answer_message_id = m.id, failure_reason = NULL, updated_at = now()
       FROM m WHERE inquiries.id = $2 AND inquiries.session_id = $1 RETURNING ${COLS.replace(/(^|, )/g, "$1inquiries.")}
     )
     SELECT 'message' AS kind, to_jsonb(m) AS row FROM m
     UNION ALL SELECT 'evidence', to_jsonb(ev) FROM ev
     UNION ALL SELECT 'inquiry', to_jsonb(u) FROM u`,
    [sessionId, inquiry.id, messageId, result.text,
      sources.map((k) => k.id), sources.map((k) => k.title), sources.map((k) => k.policyText), sources.map((k) => k.publishedAt), sources.map((_, i) => i),
      outcome]);
  const msgRow = persisted.rows.find((r) => r.kind === "message")?.row;
  const inqRow = persisted.rows.find((r) => r.kind === "inquiry")?.row;
  if (!msgRow || !inqRow) throw new Error("inquiry vanished while answering"); // the session was reset mid-flight
  const evidence = persisted.rows.filter((r) => r.kind === "evidence").map((r) => r.row)
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((r) => toEvidence(fromJson(r) as EvidenceRow));
  const saved = { inquiry: toInquiry(fromJson(inqRow) as InquiryRow), message: toMessage(fromJson(msgRow) as MessageRow), sources: evidence };

  // Sensitive + explicit staff intent: hand off directly, flagged sensitive.
  let request: StaffRequest | null = null;
  if (result.kind === "sensitive" && result.contactStaff) {
    request = (await createStaffRequest(sessionId, { submissionId: inquiry.submissionId, question: inquiry.question, origin: "sensitive" })).request;
    saved.inquiry = (await getInquiry(sessionId, inquiry.id)) ?? saved.inquiry;
  }
  return { status: outcome as "chat" | "answered" | "clarified" | "handoff_offered" | "sensitive", ...saved, request, usage };
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
  return { status: inquiry.outcome as "chat" | "answered" | "clarified" | "handoff_offered" | "sensitive", inquiry, message: toMessage(msg.rows[0]), sources, request: null, usage: null };
}
