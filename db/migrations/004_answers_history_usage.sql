-- Issue 004: automated answers with durable evidence, question history, and
-- AI usage accounting. Usage lives outside resettable content on purpose.

-- Question history: every parent question in the session, with its outcome.
CREATE TABLE IF NOT EXISTS inquiries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  submission_id       uuid NOT NULL,                       -- retry after a lost response reuses it
  question_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  answer_message_id   uuid REFERENCES messages(id) ON DELETE SET NULL,
  request_id          uuid REFERENCES staff_requests(id) ON DELETE SET NULL,
  question            text NOT NULL,
  outcome             text NOT NULL
                      CHECK (outcome IN ('pending', 'answered', 'clarified', 'handoff_offered', 'sensitive', 'failed', 'staff_requested')),
  failure_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, submission_id)
);
CREATE INDEX IF NOT EXISTS inquiries_session_idx ON inquiries (session_id, created_at DESC);

-- Evidence snapshot: the exact published text an answer used, copied at answer
-- time. Later edits to knowledge_entries cannot rewrite it.
CREATE TABLE IF NOT EXISTS answer_evidence (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  message_id   uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  entry_id     uuid REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  title        text NOT NULL,
  policy_text  text NOT NULL,
  published_at timestamptz,
  position     integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS answer_evidence_message_idx ON answer_evidence (message_id, position);

-- Usage accounting. Per-session count sits on demo_sessions so a content reset
-- (which deletes conversations and knowledge only) cannot replenish it.
ALTER TABLE demo_sessions ADD COLUMN IF NOT EXISTS ai_requests_used integer NOT NULL DEFAULT 0;

-- Global daily allowance, keyed by UTC calendar day (resets 00:00 UTC).
CREATE TABLE IF NOT EXISTS usage_daily (
  day  date PRIMARY KEY,
  used integer NOT NULL DEFAULT 0
);
