# Exchange staff messages and manage request progress

Type: AFK

Budget: 20 of 180 minutes. Cut line: keep reply, mark reviewing, Send & close with reopen; implement undo as reopen only.

## Parent PRD

`issues/prd.md`

## What to build

Complete asynchronous parent/staff discussion in the existing persistent conversation, following the PRD's Interaction rules and Request lifecycle verification. Extend issue 002's messages and requests rather than introducing a separate conversation store.

## Acceptance criteria

- [x] Parents can add details and read staff replies alongside the original question after leaving and returning or refreshing.
- [x] Staff replies display a fictional staff name and timestamp and are clearly distinct from automated messages.
- [x] Request progress supports awaiting review, staff reviewing, needs your reply, and closed, with explicit staff action required to mark review.
- [x] Staff can send a reply without closing and send a follow-up marked Needs your reply. Delivery feedback remains separate from progress.
- [x] Send & close persists the reply and closes the request with a clear undo or reopen action; routine closure needs no confirmation modal.
- [x] A parent reply to a closed request reopens it. Neither closure nor a staff reply publishes knowledge or implies service approval.
- [x] Verify review, follow-up, reply-only, close/reopen, parent reopening, refresh, and session isolation through state-transition tests.

## Blocked by

- Blocked by `issues/002-reliable-staff-request.md`

## User stories addressed

- User story 12
- User story 13
- User story 14
- User story 16
- User story 20
- User story 21
- User story 22

## Results

- Migration `003_request_progress.sql`: `staff_requests.reviewed_at`, `closed_at`, `updated_at`; `messages.request_id` so follow-ups attach to their request. Status enum unchanged from 002.
- `src/lib/requests.ts`: `markReviewing`, `staffReply` (outcomes `reply` / `needs_your_reply` / `close`), `reopenRequest`, `parentReply`, `listRequestMessages`. Every transition is one `UPDATE ... WHERE id AND session_id`; foreign ids return `not_found`. Staff names come from `centerConfig.staff` (Dana R., Priya S.).
- Transitions: Mark reviewing → `staff_reviewing` (explicit; opening the page never does it). Reply-only: `awaiting_review` → `staff_reviewing`, otherwise unchanged. Follow-up → `needs_your_reply`. Send & close → `closed` + `closed_at`. Reopen → `staff_reviewing`, no confirmation step. Parent reply: `closed` or `needs_your_reply` → `awaiting_review`; `staff_reviewing` stays.
- Server actions in `src/app/actions.ts` return `{ ok, status }` so the client shows delivery feedback (saving / saved / unconfirmed) separately from the progress label.
- UI: operator request page shows the request thread plus `StaffReplyPanel` (name select, Mark reviewing, Send reply, Send as Needs your reply, Send & close, Reopen). Parent conversation renders staff replies as amber, named, timestamped bubbles under the request card, distinct from parent (dark) and front desk (white); `ParentReplyForm` sits under each request.
- Copy: no approval, publication, or deadline language; staff panel states the reply goes to this family only and does not change center policies.
- Tests: `tests/request-progress.test.ts` (10) cover review, reply-only, follow-up, close/reopen, parent reopen, knowledge untouched, refresh, validation, cross-session rejection. 26 tests pass; lint, typecheck, build clean; local curl smoke confirmed both pages render the exchange and a foreign session gets 404.
- Cut line not needed; nothing from later tickets implemented.
