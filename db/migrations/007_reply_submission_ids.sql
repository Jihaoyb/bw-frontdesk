-- Fix for issue 003: replies (parent details, staff replies) carry a client
-- submission id so a retry after a lost response never inserts twice.
-- Null for messages that did not come through a reply form (questions,
-- front-desk answers), so the uniqueness only applies where it is set.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS submission_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS messages_session_submission_idx
  ON messages (session_id, submission_id) WHERE submission_id IS NOT NULL;
