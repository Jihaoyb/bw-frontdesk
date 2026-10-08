# Stretch: attach a parent-selected decision time

Type: AFK — optional stretch scope

Budget: 0 of 180 minutes; only unused slack. Cut line: cut entirely before touching any required ticket.

## Parent PRD

`issues/prd.md`

## What to build

Let parents add a decision time to a situational request and display it to both perspectives. Follow the PRD's Optional decision-time extension and Interaction rules. This field builds on issue 002's request persistence and card; it does not require issue 003's staff lifecycle implementation.

Implement only if required work, deployment, verification, and submission materials fit the three-hour budget. This is the first cut and never blocks issue 009.

## Acceptance criteria

- [ ] Parents can supply an optional decision time that persists with the request and appears in both perspectives after refresh.
- [ ] Copy identifies the time as when the parent needs information, not a promised response deadline; display its timezone clearly.
- [ ] When the time passes without confirmation, the request highlights missing confirmation without implying service approval, deleting it, or automatically closing it.
- [ ] Existing delivery/progress distinctions remain intact; no reminders or notification delivery are introduced.
- [ ] Controlled-time verification covers before/after the selected time, absent time, persistence, and preservation of request state.

## Blocked by

- Blocked by `issues/002-reliable-staff-request.md`

## User stories addressed

- User story 37
- User story 38
