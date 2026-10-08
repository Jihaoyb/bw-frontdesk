import { getPool } from "./db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type KnowledgeEntry = {
  id: string;
  sessionId: string;
  seedKey: string | null;
  title: string;
  policyText: string;
  publishedAt: Date | null;
};

type Row = {
  id: string;
  session_id: string;
  seed_key: string | null;
  title: string;
  policy_text: string;
  published_at: Date | null;
};

function toEntry(r: Row): KnowledgeEntry {
  return {
    id: r.id,
    sessionId: r.session_id,
    seedKey: r.seed_key,
    title: r.title,
    policyText: r.policy_text,
    publishedAt: r.published_at,
  };
}

/** Published knowledge for the active session only. */
export async function listPublishedKnowledge(sessionId: string): Promise<KnowledgeEntry[]> {
  const res = await getPool().query<Row>(
    `SELECT id, session_id, seed_key, title, policy_text, published_at
     FROM knowledge_entries
     WHERE session_id = $1 AND published_at IS NOT NULL
     ORDER BY sort_order, created_at`,
    [sessionId],
  );
  return res.rows.map(toEntry);
}

/** One entry, scoped: an id belonging to another session resolves to null. */
export async function getKnowledgeEntry(sessionId: string, entryId: string): Promise<KnowledgeEntry | null> {
  if (!UUID_RE.test(entryId)) return null;
  const res = await getPool().query<Row>(
    `SELECT id, session_id, seed_key, title, policy_text, published_at
     FROM knowledge_entries
     WHERE id = $1::uuid AND session_id = $2`,
    [entryId, sessionId],
  );
  return res.rows[0] ? toEntry(res.rows[0]) : null;
}
