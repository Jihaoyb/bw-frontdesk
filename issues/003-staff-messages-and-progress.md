# Exchange staff messages and manage request progress

Type: AFK

Budget: 20 of 180 minutes. Cut line: keep reply, mark reviewing, Send & close with reopen; implement undo as reopen only.

## Parent PRD

`issues/prd.md`

## What to build

Complete asynchronous parent/staff discussion in the existing persistent conversation, following the PRD's Interaction rules and Request lifecycle verification. Extend issue 002's messages and requests rather than introducing a separate conversation store.

## Acceptance criteria

- [ ] Parents can add details and read staff replies alongside the original question after leaving and returning or refreshing.
- [ ] Staff replies display a fictional staff name and timestamp and are clearly distinct from automated messages.
- [ ] Request progress supports awaiting review, staff reviewing, needs your reply, and closed, with explicit staff action required to mark review.
- [ ] Staff can send a reply without closing and send a follow-up marked Needs your reply. Delivery feedback remains separate from progress.
- [ ] Send & close persists the reply and closes the request with a clear undo or reopen action; routine closure needs no confirmation modal.
- [ ] A parent reply to a closed request reopens it. Neither closure nor a staff reply publishes knowledge or implies service approval.
- [ ] Verify review, follow-up, reply-only, close/reopen, parent reopening, refresh, and session isolation through state-transition tests.

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
