# Turn a staff reply into a reviewed knowledge update

Type: AFK

Budget: 15 of 180 minutes. Cut line: none; this is the decisive demonstration.

## Parent PRD

`issues/prd.md`

## What to build

Connect staff replies to an editable knowledge-update draft, with explicit review and publication using issue 006. Complete the PRD's central demonstration and keep knowledge-gap visibility independent of request progress.

Follow the demonstration script in `docs/test-inquiries.md`, using I03 and I15 as the gap questions.

## Acceptance criteria

- [x] An operator can send a reply and open an editable knowledge-update draft for review; sending neither publishes the draft nor implicitly closes the request.
- [x] Reply-only handling and request closure leave the knowledge gap visible. Staff replies remain excluded from future AI grounding.
- [x] Publishing the reviewed draft uses the existing explicit publication flow and makes its policy available to future questions.
- [x] Demonstrate the missing-holiday loop: unanswered question, chosen handoff, staff reply without publication, repeated question still showing the gap, explicit publication, and a later sourced answer.
- [x] The complete loop survives refresh, retains original conversation/evidence, and remains scoped to the active demo.
- [x] Tests verify that reply, closure, and publication remain independent actions and that publication changes subsequent answer context.

## Blocked by

- Blocked by `issues/003-staff-messages-and-progress.md`
- Blocked by `issues/005-clarification-handoff-and-ai-recovery.md`
- Blocked by `issues/006-edit-and-publish-knowledge.md`

## User stories addressed

- User story 25
- User story 26
- User story 28 (reply-to-publication improvement loop)

## Results

- Link: migration `006_request_knowledge_draft.sql` adds `staff_requests.knowledge_draft_entry_id`. It is bookkeeping only; request status, messages, and knowledge publication stay separate facts.
- Library (`src/lib/knowledge-loop.ts`): `openKnowledgeDraftForRequest(sessionId, requestId, suggestedText)` opens an issue-006 draft for a request. With a known policy (I03 → K2) the draft is an edit of that entry prefilled with the current text plus the staff reply; with no known policy (I15 with none) it creates a new draft entry titled after the question. Idempotent: a second open returns the same draft. Sensitive requests are refused; other sessions get `not_found`. `knowledgeGapState` derives `gap | draft | published | none` from the request and its draft entry, independent of request status.
- Operator UI: request page gains a Knowledge update card (pill + "Open knowledge draft" form while no update exists; "Review and publish in Knowledge" link once a draft exists; "View in Knowledge" once published) and the reply panel gains "Send & open knowledge draft" (saves the reply, opens the prefilled draft, lands on the Knowledge editor with that entry expanded). Reply-only and Send & close leave the pill at "No knowledge update yet" (neutral on purpose: whether policy is missing is the operator's call, a service decision under a complete policy is not a gap). Inbox list shows the same pill per request. Publication itself is the issue-006 Publish button; nothing here publishes.
- Grounding: staff replies live in `messages` and are never read by `listPublishedKnowledge`, so they cannot reach the model; a test asserts the reply text is absent from the system prompt.
- Tests (`tests/knowledge-loop.test.ts`, stubbed model, 3 tests): full I03 loop (handoff → request with K2 known → reply, gap stays, repeat question still handoff → draft prefilled with reply, publishedAt unchanged, request still open → publish → answered citing K2 with the new text; first answer's evidence unchanged); I15 closed request keeps the gap and opens a new unpublished entry; sensitive refused and cross-session refused. Suite 56 tests green; lint, typecheck, build clean.
- Live check (local, gate on, real model, fresh session): I03 handoff → Ask staff → request page `gap` → reply "We're closed on Veterans Day" → I03 again still handoff → open draft (K2) → request page and inbox show `draft` → edit the closure list to include Veterans Day (November 11, 2026), publish → I03 answered "The center is closed on Veterans Day, November 11, 2026." citing K2 → request page `published`, status still staff_reviewing → parent history still shows the original K2 evidence under the first answer.
- Migration 006 is applied to the shared Neon database already.

## Post-audit fixes (commit fix(007))
- Gap pill relabeled "No knowledge update yet" with neutral copy; `knowledgeGapState` doc comment says it is not a judgment that policy is missing (audit item 7).
- Inbox draft lookups batched into one query (`getKnowledgeEntries`), no N+1.
