-- Issue 003: staff/parent exchange on a request and progress transitions.
-- Status enum is unchanged from 002. Timestamps record when staff acted;
-- none of them implies approval, publication, or a reply deadline.

ALTER TABLE staff_requests
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,   -- first explicit "Mark reviewing" or staff reply
  ADD COLUMN IF NOT EXISTS closed_at   timestamptz,   -- null while open; cleared on reopen
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- Follow-up messages (parent or staff) attach to the request they discuss.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES staff_requests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_request_idx ON messages (request_id, created_at);

UPDATE messages m SET request_id = r.id
  FROM staff_requests r WHERE r.question_message_id = m.id AND m.request_id IS NULL;
