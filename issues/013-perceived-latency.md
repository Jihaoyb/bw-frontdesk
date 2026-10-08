# Make asking feel immediate

Type: AFK

Budget: 20 of 180 minutes (post-audit slack). Cut line: keep (a); (b) and (c) are config and query trims that may be dropped.

## Parent PRD

`issues/prd.md`

## What to build

Measured on the hosted app: an AI answer takes 2.7–3.9 s end to end, a staff request 1.1 s, and nothing changes on screen until the response returns and the page refreshes. The parent sees "Sending…" for 4–5 s. Fix the perception first, then shave the real cost.

(a) Optimistic conversation. The moment a parent sends, their message renders in the thread and an "AI assistant is answering…" indicator (or "Saving your request…" for staff) appears beneath it. The real reply replaces the placeholder after refresh. An unconfirmed save keeps the placeholder with the existing Retry / Edit instead controls; a rejected save removes it.
(b) Fewer database round trips per ask: run independent queries in parallel and fold sequential ones where they share a transaction; keep every row scoped by session.
(c) Shorter model turnaround: a lower default output cap sized to the "2 to 4 short sentences" rule, and the published policies placed after the rules in the system prompt. No change to the response schema or validation; answers are still checked before display.

## Acceptance criteria

- [x] After tapping Ask AI or Send to school staff, the parent's message and a recipient-specific pending indicator appear within one frame, before any network response.
- [x] The placeholder is replaced by the saved message and answer on success, stays with Retry / Edit instead when the save is unconfirmed, and disappears when the server rejects the input.
- [x] The ask path issues fewer sequential database queries than before (count recorded in Results) and all tests still pass.
- [x] `MAX_ANSWER_TOKENS` default is reduced; answers still validate and the stubbed and live checks (I01, I03, I27) are unchanged in kind.
- [ ] Hosted measurement before and after is recorded in Results.

## Blocked by

- Blocked by `issues/011-copy-state-and-accessibility-fixes.md`

## User stories addressed

- User story 1, 2 (quick, trustworthy answers)
- User story 36

## Results

- (a) `Composer` renders an optimistic turn (`PendingTurn`, `data-pending="ask|staff"`): the parent's bubble plus bouncing dots and "AI assistant is answering…" or "Saving your message for school staff…". On success the refresh runs in a transition and the placeholder is removed only once the saved turn is on screen; on 400/503 it is removed; while unconfirmed it stays with the Retry / Edit instead controls and says so.
- (b) Sequential database round trips per fresh ask, existing session: before 20 + one per evidence row (ensureSession 4, claim 6, allowance 4, grounding 1, persist 5 + n); after 12 (ensureSession 1 via a SELECT fast path, claim 1 as a single CTE insert of inquiry + message with ids generated server-side, allowance 4 unchanged on purpose, grounding 1, persist 5 with evidence inserted in one `unnest` statement). A conversation row is now seeded with the session so the claim needs no lookup; sessions created before this change get one on first ask. Allowance accounting was left as its own transaction: it is the concurrency-critical path and its tests are the proof.
- (c) `MAX_ANSWER_TOKENS` default 500 → 300 (still configuration). Policies were already after the rules in the system prompt, so no reorder. Live local check with the new cap: I01 answered (K2), I03 handoff (K2), I27 answered (K3), I06 handoff (K5, K4); all validate.
- Measurement, hosted before: ask 2.7–3.9 s, request 1.1 s, nothing on screen until done. Local after (laptop to Neon us-east, slower than Vercel's iad1): ask 4.6–6.6 s wall, request 0.9 s; the parent's bubble and indicator now appear immediately. Hosted after is recorded below once deployed.
- Tests: suite 70 green, lint, typecheck, build clean.

- [ ] Hosted measurement after deploy (fill in): ask ___ s, request ___ s.
