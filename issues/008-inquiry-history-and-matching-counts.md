# Count repeated questions without merging requests

Type: AFK

Budget: 10 of 180 minutes. Cut line: schedule after issue 007; if still over budget, show the count as a plain number next to each question with no separate grouping view.

## Parent PRD

`issues/prd.md`

## What to build

Add accurately labeled normalized matching-question counts to the question history that issue 004 already lists in the Operator view. Follow the PRD's Data and response contracts and Matching counts verification. Count matching questions, retaining individual requests and their independent state. The history list itself and its outcome tags are owned by issues 004 and 005 and are not deferred with this ticket.

Schedule this after the decisive improvement loop if the three-hour budget is tight. It remains required: a delay is a delivery risk, not permission to silently cut scope. Cut the optional issue 010 first.

Inquiry I22 in `docs/test-inquiries.md` defines the matching and non-matching variants.

## Acceptance criteria

- [ ] Matching ignores capitalization, extra whitespace, and punctuation; the UI labels the count as normalized matching questions.
- [ ] Distinct wording is not treated as semantic equivalence, and requests are not merged or automatically answered together.
- [ ] Counts survive refresh, include only the active demo, and reset with that demo's content.
- [ ] Representative variants verify matching behavior; unrelated questions and other sessions do not inflate counts.

## Blocked by

- Blocked by `issues/002-reliable-staff-request.md`
- Blocked by `issues/004-sourced-answers-and-usage-limits.md`

## User stories addressed

- User story 19 (matching counts only)
- User story 27
