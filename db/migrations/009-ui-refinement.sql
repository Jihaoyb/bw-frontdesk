-- One active conversation per demo; historical conversations remain intact.
ALTER TABLE conversations ADD COLUMN is_active boolean NOT NULL DEFAULT false;
UPDATE conversations SET is_active = true WHERE id IN (
  SELECT DISTINCT ON (session_id) id FROM conversations ORDER BY session_id, created_at DESC, id
);
CREATE UNIQUE INDEX conversations_active_session_idx ON conversations(session_id) WHERE is_active;

ALTER TABLE knowledge_entries ADD COLUMN category text NOT NULL DEFAULT 'Other'
  CHECK (category IN ('Hours', 'Tuition', 'Health', 'Food', 'Enrollment', 'Policies', 'Contact', 'Other'));
ALTER TABLE knowledge_entries ADD COLUMN draft_category text
  CHECK (draft_category IN ('Hours', 'Tuition', 'Health', 'Food', 'Enrollment', 'Policies', 'Contact', 'Other'));
UPDATE knowledge_entries SET category = CASE seed_key
  WHEN 'K1' THEN 'Hours' WHEN 'K2' THEN 'Hours' WHEN 'K3' THEN 'Health'
  WHEN 'K4' THEN 'Food' WHEN 'K5' THEN 'Food' WHEN 'K6' THEN 'Health'
  WHEN 'K7' THEN 'Policies' WHEN 'K8' THEN 'Hours' WHEN 'K9' THEN 'Tuition'
  WHEN 'K10' THEN 'Enrollment' ELSE 'Other' END;
UPDATE knowledge_entries SET draft_category = category WHERE draft_title IS NOT NULL;
