-- Issue 007: a staff request can point at the knowledge draft opened from it.
-- The link is bookkeeping only: replying, closing, and publishing stay
-- independent actions, and the draft follows issue 006's publication rules.

ALTER TABLE staff_requests
  ADD COLUMN IF NOT EXISTS knowledge_draft_entry_id uuid REFERENCES knowledge_entries(id) ON DELETE SET NULL;
