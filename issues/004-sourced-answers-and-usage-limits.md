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

- [ ] A parent can ask routine closure, illness, and meal-policy questions in mobile chat and receive concise supported answers without unnecessary staff requests.
- [ ] Answers have clickable sources showing the exact published text used. Persist evidence with the answer so subsequent policy changes cannot rewrite its basis.
- [ ] Model result shapes and supporting entry references are validated before display. Drafts and staff replies are excluded from grounding, and model credentials remain server-side.
- [ ] Session-scoped questions, answers, and evidence survive refresh using issue 002's persistence model.
- [ ] The Operator view lists every parent question in the session, with or without a staff request, with its outcome (answered, clarified, handoff offered, sensitive, failed) so staff can see what is asked and where the assistant struggled. Outcomes other than answered are set by issue 005 but the list and the answered/failed outcomes ship here.
- [ ] Atomic server-side accounting enforces 50 AI requests per session and 500 globally per UTC day, including concurrent calls. The limit check applies before model dispatch and cannot be bypassed by direct endpoint calls.
- [ ] Server-side input and output bounds are implemented and documented. Daily-boundary and concurrent-limit tests use controlled time/model responses.
- [ ] Confirmed content reset preserves session and global usage counters. Exhaustion leaves policy browsing and the existing staff-request path available; issue 003's messaging must remain available once integrated.
- [ ] Public model access remains disabled until usage enforcement passes. A small live check verifies support from actual cited policy, not merely valid source IDs.

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
