# Turn a staff reply into a reviewed knowledge update

Type: AFK

Budget: 15 of 180 minutes. Cut line: none; this is the decisive demonstration.

## Parent PRD

`issues/prd.md`

## What to build

Connect staff replies to an editable knowledge-update draft, with explicit review and publication using issue 006. Complete the PRD's central demonstration and keep knowledge-gap visibility independent of request progress.

Follow the demonstration script in `docs/test-inquiries.md`, using I03 and I15 as the gap questions.

## Acceptance criteria

- [ ] An operator can send a reply and open an editable knowledge-update draft for review; sending neither publishes the draft nor implicitly closes the request.
- [ ] Reply-only handling and request closure leave the knowledge gap visible. Staff replies remain excluded from future AI grounding.
- [ ] Publishing the reviewed draft uses the existing explicit publication flow and makes its policy available to future questions.
- [ ] Demonstrate the missing-holiday loop: unanswered question, chosen handoff, staff reply without publication, repeated question still showing the gap, explicit publication, and a later sourced answer.
- [ ] The complete loop survives refresh, retains original conversation/evidence, and remains scoped to the active demo.
- [ ] Tests verify that reply, closure, and publication remain independent actions and that publication changes subsequent answer context.

## Blocked by

- Blocked by `issues/003-staff-messages-and-progress.md`
- Blocked by `issues/005-clarification-handoff-and-ai-recovery.md`
- Blocked by `issues/006-edit-and-publish-knowledge.md`

## User stories addressed

- User story 25
- User story 26
- User story 28 (reply-to-publication improvement loop)
