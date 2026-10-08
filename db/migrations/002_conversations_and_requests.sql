-- Issue 002: conversation, messages, and individual staff requests.
-- All rows are session-owned; reset removes them with the session content.

CREATE TABLE IF NOT EXISTS conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_session_idx ON conversations (session_id, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  speaker         text NOT NULL CHECK (speaker IN ('parent', 'assistant', 'staff')),
  staff_name      text,                      -- fictional attribution for staff replies (issue 003)
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS staff_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  question_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  submission_id       uuid NOT NULL,         -- stable client identity; retries reuse it
  question            text NOT NULL,
  origin              text NOT NULL CHECK (origin IN ('parent_initiated', 'handoff_offered', 'sensitive')),
  status              text NOT NULL DEFAULT 'awaiting_review'
                      CHECK (status IN ('awaiting_review', 'staff_reviewing', 'needs_your_reply', 'closed')),
  known_policy_entry_id uuid REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, submission_id)
);
CREATE INDEX IF NOT EXISTS staff_requests_session_idx ON staff_requests (session_id, created_at DESC);
