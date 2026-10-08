# Handle uncertainty, staff decisions, and AI failures

Type: AFK

Budget: 20 of 180 minutes. Cut line: keep clarification, missing-knowledge handoff, explicit staff intent, and failure recovery; conflicting-information handling may rely on the prompt alone if time is short.

## Parent PRD

`issues/prd.md`

## What to build

Complete the answer service's clarification, handoff, and technical-failure paths using the existing conversation and reliable request creation. Follow the PRD's Interaction rules and Grounded answers / Failure and retry verification, including conflicting information. Detect explicit staff intent within the agreed answer-service flow without introducing a separate classification pipeline.

Inquiries I03, I06–I08, I10, I13, I15–I21, I23, I24, I29, and I30 in `docs/test-inquiries.md` define the deterministic checks and the live sample. Sensitive handling (I29, I30) follows the PRD's Interaction rules and ADR 0008: no policy answer, brief acknowledgment, immediate Ask staff, sensitive flag in the inbox, no knowledge draft. I23 inserts its conflicting entry in a test session; the seed has no conflict.

## Acceptance criteria

- [ ] Missing context produces a targeted clarification and retains the exchange for the next answer.
- [ ] Missing knowledge offers Ask staff without automatically creating a request; selecting it uses issue 002's deduplicated save path.
- [ ] An explicit natural-language request to contact staff initiates that handoff without a second confirmation. This issue owns user story 7.
- [ ] Conflicting policy information does not produce an unsupported definitive answer or commitment; the assistant exposes uncertainty and offers staff help where clarification cannot resolve it.
- [ ] A meal request requiring staff confirmation separates known policy from the outstanding decision and never implies an automated reservation, permission, or approval.
- [ ] Sensitive inquiries receive no policy answer, a brief acknowledgment, and an immediate Ask staff offer (or direct handoff when staff is requested); the resulting request is flagged sensitive in the inbox and no knowledge-update draft is suggested.
- [ ] Clarified, handoff-offered, and sensitive outcomes are recorded on the question history introduced in issue 004.
- [ ] Timeout, invalid structured output, and invalid source references preserve the question and expose Retry, Browse center policies, and Ask staff.
- [ ] Deterministic checks cover clarification, missing policy, conflicting policy, explicit staff intent, service confirmation, sensitive inquiries, and technical failure. Small live checks assess grounding and handoff quality.

## Blocked by

- Blocked by `issues/002-reliable-staff-request.md`
- Blocked by `issues/004-sourced-answers-and-usage-limits.md`

## User stories addressed

- User story 4
- User story 5
- User story 6
- User story 7
- User story 17
