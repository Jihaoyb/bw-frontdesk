-- During a rolling deployment, older app instances insert a session's first
-- conversation without specifying is_active. Keep those sessions readable.
ALTER TABLE conversations ALTER COLUMN is_active SET DEFAULT true;
UPDATE conversations c SET is_active = true
WHERE c.id IN (
  SELECT DISTINCT ON (session_id) id FROM conversations old
  WHERE NOT EXISTS (SELECT 1 FROM conversations active WHERE active.session_id = old.session_id AND active.is_active)
  ORDER BY session_id, created_at DESC, id
);
