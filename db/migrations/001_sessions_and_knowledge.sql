-- Issue 001: demo sessions and session-owned published knowledge.
-- Session identity is separate from resettable content so later usage
-- accounting can survive a demo reset.

CREATE TABLE IF NOT EXISTS demo_sessions (
  id          uuid PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  reset_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES demo_sessions(id) ON DELETE CASCADE,
  seed_key     text,                       -- K1..K10 for seeded rows, null for operator-created
  title        text NOT NULL,
  policy_text  text NOT NULL,
  published_at timestamptz,                -- null means draft, not grounding material
  created_at   timestamptz NOT NULL DEFAULT now(),
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS knowledge_entries_session_idx
  ON knowledge_entries (session_id, sort_order);
