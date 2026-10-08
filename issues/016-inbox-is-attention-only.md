# Make the inbox attention only and show questions as a conversation

Type: AFK

Budget: 30 of 180 minutes (post-audit slack). Cut line: keep (a) and (b); (c) may ship as the counts line alone.

## Parent PRD

`issues/prd.md`

## What to build

After 014 the staff inbox page carries two things: the request queue and, under or beside it, the question history as a list of cards. Staff reading the page cannot tell at a glance what needs them, and a parent who asked six questions appears as six unrelated rows. Split the two.

(a) Inbox is the queue. `/operator/inbox` lists requests only. Chips: Open (default: everything not closed), Needs action (awaiting review), Closed. No "All". On desktop the right column, with no request open, is a quiet panel: what the queue holds (open, needs action, closed), that opening a request marks nothing, and a link to Questions. The viewed request stays in the list whatever the chip says (unchanged).
(b) Questions is the conversation. New `/operator/questions` (section tab between Inbox and Knowledge) shows this demo session's thread the way the parent sees it: parent bubbles, assistant answers with their source rows, staff replies in amber, in order. Beside each parent question that the front desk handled, a two-word outcome in color (Answered, Clarified, Handoff offered, Sensitive, Sent to staff, Failed), the normalized match count as `×N` when it is above one, and "Open request" when one exists. The matching explanation from 008 stays, as one line under the title. Read only: no composer, no actions.
(c) Desktop rail on Questions: counts by outcome and a link to the requests that need action. Tablet and phone: thread only.

Data, outcomes, matching rules, and the request page are unchanged. Every count and row is scoped to the active session as before.

## Acceptance criteria

- [x] `/operator/inbox` shows requests only; Open, Needs action, and Closed chips filter as named; the empty-column panel on desktop names the counts and links to Questions; `?filter=all` falls back to Open.
- [x] `/operator/questions` renders every message of the session in order with the speaker treatment from 014, an outcome mark on each handled question with `data-outcome`, `×N` with `data-matching` only when N > 1, and an "Open request" link when the inquiry has a request.
- [x] The Section tabs read Inbox · Questions · Knowledge, the right one lit on each route, and each route has a loading frame.
- [x] Tests cover the filter rules (including Closed and the `all` fallback) and the question-to-outcome pairing; 70+ tests green, lint, typecheck, build clean; `docs/test-inquiries.md` step 9 points at the new route.
- [x] No copy implies a live person, a deadline, or an approval.

## Blocked by

- Blocked by `issues/015-navigation-and-response-speed.md`

## User stories addressed

- User story 19 (question history with outcomes and counts)
- User story 36

## Results

- Inbox (`/operator/inbox`): requests only. `InboxFilter` is `open | action | closed`; `applyFilter` and `parseFilter` updated (`all` and anything unknown fall back to Open); `queueCounts` feeds the chips (Open · n, Needs action · n, Closed · n), the header line, and the desktop panel. The panel (`data-queue-panel`, ≥1024px, hidden when a request is open because that route has its own page) says "Pick a request", that opening marks nothing, shows the three counts (`data-count`), and links to Questions. The history list and its copy left this page.
- Questions (`/operator/questions`): the session's messages in order through `MessageBubble viewer="operator"` with source rows on answers; under each parent question that the front desk handled, `OutcomePill` (`data-outcome`), `×N` (`data-matching`, only when N > 1), and "Open request" when the inquiry has one; `data-inquiry` on the row. The 008 matching explanation is the line under the title. Desktop rail: counts by outcome (`data-outcome-count`) and a link to the Needs-action filter. Read only. `src/lib/questions-thread.ts` holds the two pure helpers (`inquiryByQuestion`, `outcomeCounts`).
- Navigation: Section tabs Inbox · Questions · Knowledge; `/operator/questions` has a loading frame; the inbox frame now mirrors the list-plus-panel layout.
- Verification: rendered both pages at 390px and 1360px from a seeded local session (hours answered; Veterans Day twice → Handoff offered ×2; "talk to someone at the office" → Sent to staff with Open request, and the one open request in the inbox with its policy and knowledge tags). New `tests/inbox-and-questions.test.ts` (5 tests: the three filters, the `all` fallback, queue counts, question-to-inquiry pairing, outcome totals). 76 tests green, lint, typecheck, build clean. `docs/test-inquiries.md` step 9 points at the new route. Data, outcomes, matching, and the request page unchanged.
