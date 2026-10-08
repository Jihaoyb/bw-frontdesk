ALTER TABLE inquiries DROP CONSTRAINT inquiries_outcome_check;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_outcome_check
  CHECK (outcome IN ('pending', 'answered', 'clarified', 'handoff_offered', 'sensitive', 'failed', 'staff_requested', 'chat'));
