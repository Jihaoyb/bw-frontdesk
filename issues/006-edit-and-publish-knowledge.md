# Edit and explicitly publish knowledge

Type: AFK

Budget: 15 of 180 minutes. Cut line: keep create/edit/publish and draft exclusion; the editor may be a plain form.

## Parent PRD

`issues/prd.md`

## What to build

Let an operator create or edit individual knowledge entries independently of any request, then explicitly publish reviewed content. Complete the PRD's Published knowledge module and Knowledge publication checks through a subsequent parent answer.

## Acceptance criteria

- [x] The Operator view supports creating and editing entries with title and policy text; published entries show their publication timestamp.
- [x] Draft edits persist across refresh but do not change the published policy browser or AI grounding until explicit publication.
- [x] Publishing makes the updated content available to a subsequent question in the same demo without affecting another session.
- [x] Earlier answers still show the exact evidence originally cited after the supporting entry is edited and republished.
- [x] Session reset restores seeded knowledge, removes session-created content, and leaves usage accounting intact.
- [x] Verification demonstrates draft exclusion, explicit publication improving a later answer, and preservation of historical source text.

## Blocked by

- Blocked by `issues/004-sourced-answers-and-usage-limits.md`

## User stories addressed

- User story 23
- User story 24
- User story 28 (direct publication path)
- User story 35 (verify evidence survives later edits)

## Results

- Storage: migration `005_knowledge_drafts.sql` adds `draft_title`, `draft_policy_text`, `draft_saved_at` beside the published columns. Published readers (`listPublishedKnowledge`: parent policy browser, AI grounding, known-policy lookups) still read `title`/`policy_text WHERE published_at IS NOT NULL`, so a draft can never leak into them. A never-published entry mirrors its draft into `title`/`policy_text` with `published_at NULL`.
- Library (`src/lib/knowledge.ts`): `listAllKnowledge`, `createKnowledgeDraft`, `saveKnowledgeDraft`, `publishKnowledge`, `validateKnowledgeInput`. Every statement is scoped by `session_id`; another session's id returns `not_found`. Publishing with no draft returns `nothing_to_publish` instead of silently bumping the timestamp. Bounds are config: `MAX_POLICY_TITLE_CHARS` (120), `MAX_POLICY_TEXT_CHARS` (3000).
- Operator view (`/operator`, `KnowledgeEditor`): plain forms per the cut line. "+ New entry" saves a draft. Each entry shows its status line (Published <date> / Draft, not published / Published <date> plus unpublished edits saved), the currently published text when a draft differs, and two buttons: Save draft, Publish (Publish saves the form text first, then publishes). Server actions redirect back with a notice. Parent `/parent/policies` is unchanged and lists published entries only.
- History: `answer_evidence` already snapshots the cited text, so republishing never rewrites what an earlier answer showed. Reset already deleted session knowledge and reseeded; usage stays on `demo_sessions.ai_requests_used`.
- Tests (`tests/knowledge-publishing.test.ts`, stubbed model): draft persists but is absent from the published list and system prompt; editing K2 keeps the old text live until Publish, other session untouched, cross-session writes rejected; stubbed model answers I03 only once the published grounding mentions Veterans Day, with the first answer's evidence unchanged; reset restores K1–K10 verbatim, removes the custom entry, keeps the session usage count. Suite: 53 tests green; lint, typecheck, build clean.
- Live check (local, gate on, real model): I03 before publish → handoff citing K2. After adding Veterans Day to K2 and publishing → answered "The center is closed on Veterans Day, November 11, 2026." citing K2. Parent policy browser showed the new text and never showed the unpublished Sunscreen draft. Note for the demo script: write the date into the closure list itself; a dangling "Veterans Day (November 11, 2026)." sentence appended at the end made the model correctly say the policy did not state whether the center is closed.
- Migration 005 is applied to the shared Neon database already (`npm run migrate`), so the hosted build needs no extra step.
