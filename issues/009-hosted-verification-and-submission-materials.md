# Verify the hosted demonstration and finish submission materials

Type: HITL

Budget: 20 of 180 minutes. Cut line: keep the hosted loop walkthrough and docs alignment; record skipped checks explicitly rather than claiming them.

## Parent PRD

`issues/prd.md`

## What to build

Verify the working hosted experience against the PRD's Testing Decisions, then align the existing submission explanation and architecture images with the implementation. The agent performs checks and prepares concrete materials before requesting human judgment on the hosted mobile experience and final writeup. External portal submission is not included.

Run the demonstration script in `docs/test-inquiries.md` on the hosted app and record the outcome of every inquiry row it uses.

## Acceptance criteria

- [ ] Verify the five assignment example questions (I03, I06, I26, I27, I28) and the sensitive inquiry I29 on the hosted app first; then the missing-holiday loop and meal-confirmation boundary at a mobile viewport, including readable sources, clear status/delivery distinctions, and accurate office-hours copy.
- [ ] Record observable results for refresh/persistence, cross-session read/write isolation, request retry deduplication, lifecycle transitions, publication, historical evidence, and matching counts.
- [ ] Verify concurrent 50/session and 500/day enforcement, UTC day boundaries, reset preserving counters, and policy browsing plus parent/staff messaging at exhaustion. Use controlled responses for deterministic concurrency checks to avoid unnecessary live model calls.
- [ ] Verify clarification, conflicting information, missing knowledge, and AI failure recovery. Use a small live sample to inspect actual grounding without claiming unmeasured success rates.
- [ ] Update `docs/submission-explanation.md` to stay under one page and align the architecture SVG/PNG with verified behavior. Keep supporting detailed diagrams consistent where affected.
- [ ] Record remaining failures or setup limitations honestly; obtain human sign-off on the hosted mobile demonstration and submission materials after preparing them for review.
- [ ] Issue 010 is not a release blocker. If implemented, include its behavior in final verification; otherwise keep it explicitly omitted as stretch scope.

## Blocked by

- Blocked by `issues/000-provision-hosting-and-model-access.md`
- Blocked by `issues/001-isolated-persistent-demo.md`
- Blocked by `issues/002-reliable-staff-request.md`
- Blocked by `issues/003-staff-messages-and-progress.md`
- Blocked by `issues/004-sourced-answers-and-usage-limits.md`
- Blocked by `issues/005-clarification-handoff-and-ai-recovery.md`
- Blocked by `issues/006-edit-and-publish-knowledge.md`
- Blocked by `issues/007-reply-to-knowledge-improvement-loop.md`
- Blocked by `issues/008-inquiry-history-and-matching-counts.md`

## User stories addressed

- User story 36

Cross-cutting integration verification for user stories 1–35; their implementation remains owned by issues 001–008.
