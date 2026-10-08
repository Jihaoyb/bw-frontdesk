# Verify the hosted demonstration and finish submission materials

Type: HITL

Budget: 20 of 180 minutes. Cut line: keep the hosted loop walkthrough and docs alignment; record skipped checks explicitly rather than claiming them.

## Parent PRD

`issues/prd.md`

## What to build

Verify the working hosted experience against the PRD's Testing Decisions, then align the existing submission explanation and architecture images with the implementation. The agent performs checks and prepares concrete materials before requesting human judgment on the hosted mobile experience and final writeup. External portal submission is not included.

Run the demonstration script in `docs/test-inquiries.md` on the hosted app and record the outcome of every inquiry row it uses.

## Acceptance criteria

- [x] Verify the five assignment example questions (I03, I06, I26, I27, I28) and the sensitive inquiry I29 on the hosted app first; then the missing-holiday loop and meal-confirmation boundary at a mobile viewport, including readable sources, clear status/delivery distinctions, and accurate office-hours copy.
- [x] Record observable results for refresh/persistence, cross-session read/write isolation, request retry deduplication, lifecycle transitions, publication, historical evidence, and matching counts.
- [x] Verify concurrent 50/session and 500/day enforcement, UTC day boundaries, reset preserving counters, and policy browsing plus parent/staff messaging at exhaustion. Use controlled responses for deterministic concurrency checks to avoid unnecessary live model calls.
- [x] Verify clarification, conflicting information, missing knowledge, and AI failure recovery. Use a small live sample to inspect actual grounding without claiming unmeasured success rates.
- [x] Update `docs/submission-explanation.md` to stay under one page and align the architecture SVG/PNG with verified behavior. Keep supporting detailed diagrams consistent where affected.
- [ ] Record remaining failures or setup limitations honestly; obtain human sign-off on the hosted mobile demonstration and submission materials after preparing them for review.
- [x] Issue 010 is not a release blocker. If implemented, include its behavior in final verification; otherwise keep it explicitly omitted as stretch scope.

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

## Results

Hosted app: https://bw-frontdesk.vercel.app (commit 3607552 + this ticket). Migrations 001–006 applied to the shared Neon database.

### Assignment examples and sensitive inquiry (hosted, real model, fresh session)
| Inquiry | Result |
|---|---|
| I03 Veterans Day | handoff, cites K2, Ask staff offered |
| I06 forgot lunch | handoff (policy+confirm), cites K5 + K4, "front office can confirm", no reservation language |
| I26 infant tuition | answered, cites K9 |
| I27 fever | **first run: clarified** (asked for the temperature). Fixed in this ticket with one prompt rule (illness symptoms are answered from the illness policy); 3/3 local runs then answered from K3 with the 24-hour rule and no clearance; I19 override still restates policy |
| I28 tours | answered, cites K10 |
| I29 incident | sensitive, no sources, brief acknowledgment; request flagged Sensitive in the inbox, no draft offered |
| I01 closures | answered, cites K2 |

### Missing-holiday loop and meal boundary (hosted, Chrome)
I03 handoff → Ask staff → request card shows K2 as known policy and the unresolved question, status Awaiting review → operator Mark reviewing, reply "We're closed on Veterans Day" → parent sees the staff reply, Knowledge update card still "No knowledge update yet" → I03 again: still handoff → Open knowledge draft (K2 prefilled) → edit the closure list to include Veterans Day (November 11, 2026), Publish → I03 again: "The center is closed on Veterans Day, November 11, 2026." citing K2 → the first answer's source still shows the original text, "Published Sep 1, 2026". I06 answered the policy portion with K5/K4 and offered Ask staff; nothing said a lunch was reserved. Office-hours copy reads "Staff read messages during office hours" with no live-availability claim. Screens were checked in a desktop Chrome window; the hand-held mobile pass is the human sign-off below.

### Observable state checks
- Refresh/persistence: questions, answers, evidence, requests and staff replies survived reloads on the hosted app.
- Cross-session isolation: covered by the suite (knowledge ids, request ids, drafts, counts all return nothing or `not_found` from another session); hosted check: a second cookie jar saw an empty inbox.
- Retry deduplication: hosted `POST /api/requests` with the same submission id returned 201 then 200 with the same request id; retrying `/api/ask` with the same id replayed the saved answer without a usage increment.
- Lifecycle, publication, historical evidence, matching counts: hosted loop above plus suite (`request-progress`, `knowledge-publishing`, `knowledge-loop`, `matching-counts`).

### Limits and failure modes (deterministic, stubbed model; no live calls)
`tests/answers-and-usage.test.ts`: concurrent session cap admits exactly `limit`; daily cap is global and rolls back the session increment; a new UTC day resets daily but not session; content reset keeps the session count; exhausted allowance blocks the model before dispatch while the staff-request path works; timeout / invalid JSON / unknown source id → failed outcome with the question preserved, one retry. `tests/uncertainty-and-handoff.test.ts`: clarification, conflicting entries (two evidence rows, neither chosen), missing knowledge, failure → Ask staff. Live sample on the hosted model: I08/I10 clarify, I20 handoff with no sources, I23 conflict handled (local, issue 005).

### Materials
`docs/submission-explanation.md` rewritten against verified behavior (about 430 words, one page). `docs/architecture.svg/.png` and `docs/architecture-detailed.svg/.png` relabeled "Verified prototype · Oct 2026", Neon box now lists drafts/evidence/usage, outcomes include sensitive, scope line marks issue 010 as not implemented. PNGs re-rendered from the SVGs with headless Chromium at 2x.

### Post-audit fixes (after the first 009 pass)
A code audit of 000–008 found eight defects; all are fixed in `fix(NNN)` commits with reproduction tests in `tests/audit-fixes.test.ts` (suite now 64 tests):
1. Pool starvation on concurrent duplicate submissions (held one connection while requesting another): follow-up SELECT runs on the held client. Test: 8 concurrent duplicates against a pool of 5 complete with one request.
2. Staff context: request page now shows "Conversation before this request" (parent/front-desk turns before the question). Test: clarify exchange visible, other session sees nothing.
3. Abandoned pending claims: a pending inquiry older than `MODEL_TIMEOUT_MS` + 10 s is reclaimable on retry, and the parent page shows the recovery card ("That answer never came back") for it. Test: fresh pending stays in flight, stale pending is re-run once.
4. Publish race: Publish sends the reviewed text in one UPDATE; a draft saved by another tab between review and publish cannot go live. Test: interleaved save then publish yields the reviewed text.
5. Composer: text is locked while a save is unconfirmed; Retry replays the same submission, "Edit instead" starts a new one and says the earlier may have saved.
6. Reply duplicates: parent and staff replies carry a submission id (migration 007, partial unique index); retries return the saved message. Test: duplicate and concurrent retries save once.
7. Gap label overstated missing policy: relabeled "No knowledge update yet", copy explains that a decision under complete policy needs no draft.
8. Matching: apostrophes removed instead of split, so "What's" matches "Whats". Test added.
Also: exhaustion test now covers policy browsing and parent/staff replies at exhaustion; per-request policy/draft lookups batched (no N+1); writeup wording on sensitive handling corrected (Ask staff is offered, not automatic).

### Honest gaps
- Issue 010 (parent decision time) not implemented; stretch scope, omitted.
- Request cards show the *current* known policy text (live lookup), while answer evidence is a snapshot. After the K2 republish, the old request card displayed the updated list. Design choice, noted here rather than changed.
- `/api/requests` stores the question text sent by the client; origin and known policy are derived server-side. A hand-crafted call can label a request with different text than the saved inquiry.
- Grounding checks are small live samples, not measured success rates.
- The I27 prompt fix and the audit fixes above are verified locally and in the suite; the hosted retest of the deployed revision (I27 answered, loop still green) is recorded under human sign-off below once pushed.
- Hosted screens were checked in desktop Chrome; the hand-held mobile pass is still the human sign-off.

### Human sign-off (pending)
Open https://bw-frontdesk.vercel.app/parent on a phone and run the loop above; confirm sources are readable, status vs delivery is clear, and the writeup reads right. Record the result here.
