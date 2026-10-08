# Record what changes for a real deployment

Type: AFK

Budget: 10 of 180 minutes (post-audit slack). Cut line: a bullet per topic is enough; no new diagrams.

## Parent PRD

`issues/prd.md`

## What to build

The same UX review raised concerns that are correct for a real product but contradict the PRD's reviewer-isolated demo (stories 29–32): authenticated roles, school-owned policies and staff queue, identity at handoff, recovery of a conversation from another device, staff attribution from login, unread and incoming-reply updates, and retention controls. Expand `docs/production-notes.md` so a reader sees these were considered and deliberately kept out of the prototype, with the concrete change each one implies.

## Acceptance criteria

- [ ] `docs/production-notes.md` has a section per topic: roles and navigation, tenancy (school-owned knowledge and queue vs. private conversations), identity at handoff and return access, staff attribution and ownership, incoming-reply delivery and unread state, new conversation vs. reset, retention and privacy copy, queue operations (owner, needs-action filters, last-activity sort).
- [ ] Each section states what the prototype does today, why (the PRD story it serves), and what a real deployment would change.
- [ ] `docs/submission-explanation.md` links to the notes in its deferred-scope line and stays under one page.

## Blocked by

- Blocked by `issues/009-hosted-verification-and-submission-materials.md`

## User stories addressed

- User story 36
