-- Issue 006: operator-edited knowledge. A draft lives beside the published
-- text on the same row so unpublished edits never reach the policy browser or
-- AI grounding (which read title/policy_text WHERE published_at IS NOT NULL).
-- Unpublished entries keep their draft in both places until first publication.

ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS draft_title       text;
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS draft_policy_text text;
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS draft_saved_at    timestamptz;
