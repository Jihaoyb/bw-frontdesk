# Edit and explicitly publish knowledge

Type: AFK

Budget: 15 of 180 minutes. Cut line: keep create/edit/publish and draft exclusion; the editor may be a plain form.

## Parent PRD

`issues/prd.md`

## What to build

Let an operator create or edit individual knowledge entries independently of any request, then explicitly publish reviewed content. Complete the PRD's Published knowledge module and Knowledge publication checks through a subsequent parent answer.

## Acceptance criteria

- [ ] The Operator view supports creating and editing entries with title and policy text; published entries show their publication timestamp.
- [ ] Draft edits persist across refresh but do not change the published policy browser or AI grounding until explicit publication.
- [ ] Publishing makes the updated content available to a subsequent question in the same demo without affecting another session.
- [ ] Earlier answers still show the exact evidence originally cited after the supporting entry is edited and republished.
- [ ] Session reset restores seeded knowledge, removes session-created content, and leaves usage accounting intact.
- [ ] Verification demonstrates draft exclusion, explicit publication improving a later answer, and preservation of historical source text.

## Blocked by

- Blocked by `issues/004-sourced-answers-and-usage-limits.md`

## User stories addressed

- User story 23
- User story 24
- User story 28 (direct publication path)
- User story 35 (verify evidence survives later edits)
