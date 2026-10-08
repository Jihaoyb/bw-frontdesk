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

- [x] Matching ignores capitalization, extra whitespace, and punctuation; the UI labels the count as normalized matching questions.
- [x] Distinct wording is not treated as semantic equivalence, and requests are not merged or automatically answered together.
- [x] Counts survive refresh, include only the active demo, and reset with that demo's content.
- [x] Representative variants verify matching behavior; unrelated questions and other sessions do not inflate counts.

## Blocked by

- Blocked by `issues/002-reliable-staff-request.md`
- Blocked by `issues/004-sourced-answers-and-usage-limits.md`

## User stories addressed

- User story 19 (matching counts only)
- User story 27

## Results

- `src/lib/matching.ts`: `normalizeQuestion` lowercases, turns punctuation and symbols (Unicode `\p{P}\p{S}`) into spaces, collapses whitespace, trims. `matchingCounts` / `matchCount` count identical normalized text within the list passed in. No schema change: counts are derived from the session's `inquiries` rows at render time, so they survive refresh, include only the active demo, and vanish with a content reset.
- Operator question history (`/operator/inbox`): questions that match at least one other show a pill "N normalized matching questions" (N includes the question itself) with `data-matching`. The section copy states what matching means and that different wording is not grouped and requests stay separate. No grouping view, no merging, no bulk answer.
- Tests (`tests/matching-counts.test.ts`): pure normalization on the I22 variants (three match I03, the fourth is distinct, synonyms do not match, non-ASCII handled); DB test creates five requests in one session plus I03 in another: five distinct requests, four history rows count 4, the distinct one counts 1, the other session counts 1, reset empties the history and leaves the other session alone. Suite 58 tests; lint, typecheck, build clean.
- Live check (local): five requests posted via `/api/requests` (I03 + I22 variants) → inbox history shows `data-matching="4"` on exactly four rows, none on the distinct wording, five separate requests listed.
