# Answer routine questions with durable evidence and usage limits

Type: AFK (credential and model-access prerequisite handled in HITL issue 000)

Budget: 30 of 180 minutes. Cut line: keep sourced answers, evidence snapshots, and atomic limits; defer the UTC-boundary test to issue 009 if needed.

## Parent PRD

`issues/prd.md`

## What to build

Layer AI answers onto issue 002's persistent conversation and messages. Follow the PRD's Answer service, Data and response contracts, and Usage policy requirements. Use the Responses API with structured outputs and configurable GPT-6 Luna, providing the complete small published knowledge base as context.

Build in this order, each step verifiable before the next: (a) answer with sources and persisted evidence in the parent conversation; (b) question history with outcomes in the Operator view; (c) usage limits with the parent-facing exhausted state. Keep this slice together, but make server-enforced limits a gate before public AI access. Implement and test with controlled model responses while access is being resolved; live verification is required for completion. Use UTC calendar days for the global daily allowance, resetting at 00:00 UTC, and document that convention.

Inquiries I01–I05, I09, I11, I12, I14, I24–I28 in `docs/test-inquiries.md` are the test inputs; I03, I06, I26, I27, and I28 are the assignment's own example questions and must work on the hosted app; controlled model responses use the seed text there.

## Acceptance criteria

- [x] A parent can ask routine closure, illness, and meal-policy questions in mobile chat and receive concise supported answers without unnecessary staff requests.
- [x] Answers have clickable sources showing the exact published text used. Persist evidence with the answer so subsequent policy changes cannot rewrite its basis.
- [x] Model result shapes and supporting entry references are validated before display. Drafts and staff replies are excluded from grounding, and model credentials remain server-side.
- [x] Session-scoped questions, answers, and evidence survive refresh using issue 002's persistence model.
- [x] The Operator view lists every parent question in the session, with or without a staff request, with its outcome (answered, clarified, handoff offered, sensitive, failed) so staff can see what is asked and where the assistant struggled. Outcomes other than answered are set by issue 005 but the list and the answered/failed outcomes ship here.
- [x] Atomic server-side accounting enforces 50 AI requests per session and 500 globally per UTC day, including concurrent calls. The limit check applies before model dispatch and cannot be bypassed by direct endpoint calls.
- [x] Server-side input and output bounds are implemented and documented. Daily-boundary and concurrent-limit tests use controlled time/model responses.
- [x] Confirmed content reset preserves session and global usage counters. Exhaustion leaves policy browsing and the existing staff-request path available; issue 003's messaging must remain available once integrated.
- [x] Public model access remains disabled until usage enforcement passes. A small live check verifies support from actual cited policy, not merely valid source IDs.

## Blocked by

- Blocked by `issues/000-provision-hosting-and-model-access.md` for the live model check only
- Blocked by `issues/002-reliable-staff-request.md`

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 18
- User story 19 (question history with outcomes; counts in issue 008)
- User story 31 (persistent questions, automated answers, and evidence)
- User story 33
- User story 34
- User story 35 (immutable evidence storage; post-edit verification in issue 006)

## Results

- Migration `004_answers_history_usage.sql`: `inquiries` (question history with outcome: answered / clarified / handoff_offered / sensitive / failed / staff_requested; unique on session + submission id), `answer_evidence` (title, policy text, published_at copied at answer time; `entry_id` SET NULL on delete so the snapshot outlives edits), `demo_sessions.ai_requests_used`, and `usage_daily(day, used)` keyed by UTC calendar day. Session and daily counters live outside the resettable content.
- `src/lib/answer-service.ts`: the single model interface. OpenAI Responses API via fetch with a strict JSON schema `{kind: answer|clarify|handoff, text, source_ids}`; credentials and model name from env only. `validateModelResult` rejects bad shape, unknown source ids, over-long text, and an answer with zero sources; failures are a result kind (timeout / invalid_shape / unknown_source / unsupported / too_long / model_error), never thrown. `setModelCallerForTests` is the controlled-response seam.
- `src/lib/inquiries.ts` `askFrontDesk`: claim inquiry + save parent message once → `consumeAllowance` (before dispatch; rejections consume nothing) → grounding = published entries only (drafts excluded by the query) plus the last `CONTEXT_TURNS` parent/front-desk turns, never staff replies → persist assistant message + evidence rows + outcome. Retry with the same submission id replays a saved answer without a second model call, or re-asks after a failure without a second question message. A failed answer sent to staff reuses the saved question message and flips the history row to `staff_requested`.
- `src/lib/usage.ts` `consumeAllowance`: one transaction, session row lock then daily row upsert with `WHERE used < limit`; daily rejection rolls back the session increment. Reserve and read use separate connections so a burst cannot exhaust the pool. Documented convention: the global allowance resets at 00:00 UTC.
- `POST /api/ask`: 400 for empty/whitespace/oversized/bad id before any accounting; 401 no session; 503 `disabled` while `AI_ANSWERS_ENABLED` is not `true`; 429 `limited` with scope; 200 with status + message + sources, or `failed` with reason. `maxDuration = 30`.
- UI: new `Composer` (Send → AI, Ask staff → direct request, Enter sends, allowance shown as "AI n/50", exhausted and disabled banners keep Ask staff working), `MessageBubble` with source chips that expand to the exact saved text and its publication date, `AnswerFailure` card (Retry reuses the submission id, Browse center policies, Ask staff), operator inbox gains a Question history section with outcome pills and a link to the request when one exists.
- UI/UX pass across the app: shared tokens in `globals.css` (card, pill, btn-*, field, eyebrow), sticky translucent header with a segmented Parent/Operator control and underline section tabs, right-aligned parent bubbles, colored status/outcome pills, accordion policies, tidier hours card, sticky composer with safe-area padding. Checked at 390px with full-page captures.
- Tests: `tests/answers-and-usage.test.ts` (15): sourced answer + evidence + no request, evidence survives a policy edit, drafts excluded from grounding, validation of shape/references, I24 failure modes with retry, replay on retry after success, refresh + history outcomes, session limit under 8 concurrent calls, global daily limit across two sessions with rollback, UTC day boundary, reset keeps usage, exhausted allowance blocks dispatch but staff path works, I25 input bounds with no usage, 503 gate, failed→Ask staff reuse. Test days are synthetic past dates so the real daily allowance is untouched. 41 tests pass; lint, typecheck, build clean.
- Live check (local, `AI_ANSWERS_ENABLED=true`, gpt-6 via `OPENAI_MODEL`): I01 answered from K2 with every listed date; I26 answered $2,150 and 70% from K9; I27 answered from K3 without clearing the child; I03 returned handoff citing K2 with "staff can help confirm", no guess. Cited text supported each answer.
- Gate: Vercel has no `AI_ANSWERS_ENABLED` yet, so hosted AI answers stay off (503, composer falls back to Ask staff) until it is set to `true` after the hosted check.
- Clarify and handoff kinds are persisted with their outcome and shown as front-desk messages; the interactive Ask-staff offer, sensitive handling, and clarification follow-through are issue 005.
