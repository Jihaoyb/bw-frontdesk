import { getPool } from "./db";
import { MAX_POLICY_TEXT_CHARS, MAX_POLICY_TITLE_CHARS } from "./limits";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type KnowledgeDraft = { title: string; policyText: string; savedAt: Date };

export type KnowledgeEntry = {
  id: string;
  sessionId: string;
  seedKey: string | null;
  /** Published title and text. For a never-published entry these mirror the draft. */
  title: string;
  policyText: string;
  publishedAt: Date | null;
  /** Unpublished edits. Null when the published text is the latest saved text. */
  draft: KnowledgeDraft | null;
};

type Row = {
  id: string;
  session_id: string;
  seed_key: string | null;
  title: string;
  policy_text: string;
  published_at: Date | null;
  draft_title: string | null;
  draft_policy_text: string | null;
  draft_saved_at: Date | null;
};

const COLUMNS = "id, session_id, seed_key, title, policy_text, published_at, draft_title, draft_policy_text, draft_saved_at";

function toEntry(r: Row): KnowledgeEntry {
  const draft =
    r.draft_title !== null && r.draft_policy_text !== null && r.draft_saved_at !== null
      ? { title: r.draft_title, policyText: r.draft_policy_text, savedAt: r.draft_saved_at }
      : null;
  return {
    id: r.id,
    sessionId: r.session_id,
    seedKey: r.seed_key,
    title: r.title,
    policyText: r.policy_text,
    publishedAt: r.published_at,
    draft,
  };
}

/** Published knowledge for the active session only: the policy browser and AI grounding. Drafts never appear here. */
export async function listPublishedKnowledge(sessionId: string): Promise<KnowledgeEntry[]> {
  const res = await getPool().query<Row>(
    `SELECT ${COLUMNS} FROM knowledge_entries
     WHERE session_id = $1 AND published_at IS NOT NULL
     ORDER BY sort_order, created_at`,
    [sessionId],
  );
  return res.rows.map(toEntry);
}

/** Every entry in the session, published or not, for the operator's knowledge editor. */
export async function listAllKnowledge(sessionId: string): Promise<KnowledgeEntry[]> {
  const res = await getPool().query<Row>(
    `SELECT ${COLUMNS} FROM knowledge_entries WHERE session_id = $1 ORDER BY sort_order, created_at`,
    [sessionId],
  );
  return res.rows.map(toEntry);
}

/** One entry, scoped: an id belonging to another session resolves to null. */
export async function getKnowledgeEntry(sessionId: string, entryId: string): Promise<KnowledgeEntry | null> {
  if (!UUID_RE.test(entryId)) return null;
  const res = await getPool().query<Row>(`SELECT ${COLUMNS} FROM knowledge_entries WHERE id = $1::uuid AND session_id = $2`, [entryId, sessionId]);
  return res.rows[0] ? toEntry(res.rows[0]) : null;
}

/** Several entries by id in one query, scoped. Missing or foreign ids are simply absent. */
export async function getKnowledgeEntries(sessionId: string, entryIds: readonly (string | null)[]): Promise<Map<string, KnowledgeEntry>> {
  const ids = [...new Set(entryIds.filter((id): id is string => !!id && UUID_RE.test(id)))];
  const out = new Map<string, KnowledgeEntry>();
  if (!ids.length) return out;
  const res = await getPool().query<Row>(`SELECT ${COLUMNS} FROM knowledge_entries WHERE session_id = $1 AND id = ANY($2::uuid[])`, [sessionId, ids]);
  for (const r of res.rows) out.set(r.id, toEntry(r));
  return out;
}

/**
 * Every entry a staff request in this session points at (its known policy or
 * its knowledge draft), keyed by entry id. One query that needs no request list
 * first (issue 015), so a page can read it alongside the requests themselves.
 */
export async function listRequestKnowledge(sessionId: string): Promise<Map<string, KnowledgeEntry>> {
  const res = await getPool().query<Row>(
    `SELECT ${COLUMNS} FROM knowledge_entries k WHERE k.session_id = $1 AND EXISTS (
       SELECT 1 FROM staff_requests r WHERE r.session_id = k.session_id AND k.id IN (r.known_policy_entry_id, r.knowledge_draft_entry_id))`,
    [sessionId]);
  return new Map(res.rows.map((r) => [r.id, toEntry(r)]));
}

// ---- Issue 006: create, edit, publish. Nothing here touches other sessions. ----

export type KnowledgeInput = { title: string; policyText: string };
export type KnowledgeWriteError = "invalid_title" | "invalid_text" | "not_found" | "nothing_to_publish";
export type KnowledgeWriteResult = { ok: true; entry: KnowledgeEntry } | { ok: false; error: KnowledgeWriteError };

export function validateKnowledgeInput(input: { title?: unknown; policyText?: unknown }): { ok: true; value: KnowledgeInput } | { ok: false; error: KnowledgeWriteError } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const policyText = typeof input.policyText === "string" ? input.policyText.trim() : "";
  if (!title || title.length > MAX_POLICY_TITLE_CHARS) return { ok: false, error: "invalid_title" };
  if (!policyText || policyText.length > MAX_POLICY_TEXT_CHARS) return { ok: false, error: "invalid_text" };
  return { ok: true, value: { title, policyText } };
}

/** New entry, saved as a draft: not published, not grounding material, visible only in the operator editor. */
export async function createKnowledgeDraft(sessionId: string, input: KnowledgeInput): Promise<KnowledgeWriteResult> {
  const v = validateKnowledgeInput(input);
  if (!v.ok) return v;
  const res = await getPool().query<Row>(
    `INSERT INTO knowledge_entries (session_id, title, policy_text, published_at, draft_title, draft_policy_text, draft_saved_at, sort_order)
     VALUES ($1, $2, $3, NULL, $2, $3, now(), COALESCE((SELECT max(sort_order) + 1 FROM knowledge_entries WHERE session_id = $1), 0))
     RETURNING ${COLUMNS}`,
    [sessionId, v.value.title, v.value.policyText],
  );
  return { ok: true, entry: toEntry(res.rows[0]) };
}

/** Save edits as a draft. The published text, policy browser, and AI grounding do not change. */
export async function saveKnowledgeDraft(sessionId: string, entryId: string, input: KnowledgeInput): Promise<KnowledgeWriteResult> {
  if (!UUID_RE.test(entryId)) return { ok: false, error: "not_found" };
  const v = validateKnowledgeInput(input);
  if (!v.ok) return v;
  const res = await getPool().query<Row>(
    `UPDATE knowledge_entries
     SET draft_title = $3, draft_policy_text = $4, draft_saved_at = now(),
         title = CASE WHEN published_at IS NULL THEN $3 ELSE title END,
         policy_text = CASE WHEN published_at IS NULL THEN $4 ELSE policy_text END
     WHERE id = $1::uuid AND session_id = $2
     RETURNING ${COLUMNS}`,
    [entryId, sessionId, v.value.title, v.value.policyText],
  );
  return res.rows[0] ? { ok: true, entry: toEntry(res.rows[0]) } : { ok: false, error: "not_found" };
}

/**
 * Explicit publication: the draft becomes the published text with a fresh
 * timestamp. Earlier answers keep their own evidence snapshot (answer_evidence),
 * so republishing never rewrites what a past answer cited.
 */
export async function publishKnowledge(sessionId: string, entryId: string, reviewed?: KnowledgeInput): Promise<KnowledgeWriteResult> {
  if (!UUID_RE.test(entryId)) return { ok: false, error: "not_found" };
  if (reviewed) {
    // Publish exactly the text the operator reviewed, in one statement. A
    // save-then-publish pair would let another tab's save slip in between.
    const v = validateKnowledgeInput(reviewed);
    if (!v.ok) return v;
    const one = await getPool().query<Row>(
      `UPDATE knowledge_entries
       SET title = $3, policy_text = $4, published_at = now(),
           draft_title = NULL, draft_policy_text = NULL, draft_saved_at = NULL
       WHERE id = $1::uuid AND session_id = $2
       RETURNING ${COLUMNS}`,
      [entryId, sessionId, v.value.title, v.value.policyText],
    );
    return one.rows[0] ? { ok: true, entry: toEntry(one.rows[0]) } : { ok: false, error: "not_found" };
  }
  const res = await getPool().query<Row>(
    `UPDATE knowledge_entries
     SET title = draft_title, policy_text = draft_policy_text, published_at = now(),
         draft_title = NULL, draft_policy_text = NULL, draft_saved_at = NULL
     WHERE id = $1::uuid AND session_id = $2 AND draft_title IS NOT NULL AND draft_policy_text IS NOT NULL
     RETURNING ${COLUMNS}`,
    [entryId, sessionId],
  );
  if (res.rows[0]) return { ok: true, entry: toEntry(res.rows[0]) };
  const existing = await getKnowledgeEntry(sessionId, entryId);
  return existing ? { ok: false, error: "nothing_to_publish" } : { ok: false, error: "not_found" };
}
