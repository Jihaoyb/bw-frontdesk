import { getPool } from "./db";
import { createKnowledgeDraft, getKnowledgeEntries, getKnowledgeEntry, saveKnowledgeDraft, type KnowledgeEntry } from "./knowledge";
import { MAX_POLICY_TITLE_CHARS } from "./limits";
import { getRequest, type StaffRequest } from "./requests";

// Issue 007: the reply-to-knowledge loop. A staff reply is a message to one
// family and never grounding material. Opening a draft from a request links the
// request to an ordinary issue-006 knowledge draft; publishing stays explicit.

/** Whether a knowledge update has been opened or published for this request. Not a judgment that policy is missing. */
export type KnowledgeGapState = "none" | "gap" | "draft" | "published";

export function knowledgeGapState(request: Pick<StaffRequest, "origin" | "knowledgeDraftEntryId">, draftEntry: KnowledgeEntry | null): KnowledgeGapState {
  if (request.origin === "sensitive") return "none";
  if (!request.knowledgeDraftEntryId || !draftEntry) return "gap";
  if (draftEntry.publishedAt && !draftEntry.draft) return "published";
  return "draft";
}

// "gap" means no knowledge update has been opened for this request. Whether the
// policy is actually missing is the operator's call: a request that needs a
// staff decision under a complete policy (a same-day lunch) is not a gap.
export const gapLabel: Record<KnowledgeGapState, string> = {
  none: "No knowledge update",
  gap: "No knowledge update yet",
  draft: "Draft open, not published",
  published: "Knowledge published",
};

export type OpenDraftResult = { ok: true; entry: KnowledgeEntry; created: boolean } | { ok: false; error: "not_found" | "sensitive" | "invalid" };

/**
 * Open (or return) the knowledge draft for a request. With a known policy the
 * draft is an edit of that entry, prefilled with its current text plus the
 * suggested text; otherwise a new draft entry titled after the question.
 * Nothing is published and the request's status does not change.
 */
export async function openKnowledgeDraftForRequest(sessionId: string, requestId: string, suggestedText?: string | null): Promise<OpenDraftResult> {
  const request = await getRequest(sessionId, requestId);
  if (!request) return { ok: false, error: "not_found" };
  if (request.origin === "sensitive") return { ok: false, error: "sensitive" };

  if (request.knowledgeDraftEntryId) {
    const existing = await getKnowledgeEntry(sessionId, request.knowledgeDraftEntryId);
    if (existing) return { ok: true, entry: existing, created: false };
  }

  const suggestion = (suggestedText ?? "").trim();
  const known = request.knownPolicyEntryId ? await getKnowledgeEntry(sessionId, request.knownPolicyEntryId) : null;
  const result = known
    ? await saveKnowledgeDraft(sessionId, known.id, {
        title: known.draft?.title ?? known.title,
        policyText: [known.draft?.policyText ?? known.policyText, suggestion].filter(Boolean).join("\n\n"),
      })
    : await createKnowledgeDraft(sessionId, {
        title: request.question.replace(/\s+/g, " ").trim().slice(0, MAX_POLICY_TITLE_CHARS),
        policyText: suggestion || request.question,
      });
  if (!result.ok) return { ok: false, error: "invalid" };

  await getPool().query(
    "UPDATE staff_requests SET knowledge_draft_entry_id = $3::uuid, updated_at = now() WHERE id = $1::uuid AND session_id = $2",
    [requestId, sessionId, result.entry.id],
  );
  return { ok: true, entry: result.entry, created: true };
}

/** Draft entries for a list of requests, keyed by request id. One query, scoped to the session. */
export async function draftEntriesForRequests(sessionId: string, requests: StaffRequest[]): Promise<Map<string, KnowledgeEntry | null>> {
  const entries = await getKnowledgeEntries(sessionId, requests.map((r) => r.knowledgeDraftEntryId));
  return draftEntriesFrom(requests, entries);
}

/** The same keyed by request id, from entries already in hand (issue 015: pages read them in one batch). */
export function draftEntriesFrom(requests: StaffRequest[], entries: Map<string, KnowledgeEntry>): Map<string, KnowledgeEntry | null> {
  return new Map(requests.map((r) => [r.id, r.knowledgeDraftEntryId ? entries.get(r.knowledgeDraftEntryId) ?? null : null]));
}
