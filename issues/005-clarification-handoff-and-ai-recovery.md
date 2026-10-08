# Handle uncertainty, staff decisions, and AI failures

Type: AFK

Budget: 20 of 180 minutes. Cut line: keep clarification, missing-knowledge handoff, explicit staff intent, and failure recovery; conflicting-information handling may rely on the prompt alone if time is short.

## Parent PRD

`issues/prd.md`

## What to build

Complete the answer service's clarification, handoff, and technical-failure paths using the existing conversation and reliable request creation. Follow the PRD's Interaction rules and Grounded answers / Failure and retry verification, including conflicting information. Detect explicit staff intent within the agreed answer-service flow without introducing a separate classification pipeline.

Inquiries I03, I06–I08, I10, I13, I15–I21, I23, I24, I29, and I30 in `docs/test-inquiries.md` define the deterministic checks and the live sample. Sensitive handling (I29, I30) follows the PRD's Interaction rules and ADR 0008: no policy answer, brief acknowledgment, immediate Ask staff, sensitive flag in the inbox, no knowledge draft. I23 inserts its conflicting entry in a test session; the seed has no conflict.

## Acceptance criteria

- [x] Missing context produces a targeted clarification and retains the exchange for the next answer.
- [x] Missing knowledge offers Ask staff without automatically creating a request; selecting it uses issue 002's deduplicated save path.
- [x] An explicit natural-language request to contact staff initiates that handoff without a second confirmation. This issue owns user story 7.
- [x] Conflicting policy information does not produce an unsupported definitive answer or commitment; the assistant exposes uncertainty and offers staff help where clarification cannot resolve it.
- [x] A meal request requiring staff confirmation separates known policy from the outstanding decision and never implies an automated reservation, permission, or approval.
- [x] Sensitive inquiries receive no policy answer, a brief acknowledgment, and an immediate Ask staff offer (or direct handoff when staff is requested); the resulting request is flagged sensitive in the inbox and no knowledge-update draft is suggested.
- [x] Clarified, handoff-offered, and sensitive outcomes are recorded on the question history introduced in issue 004.
- [x] Timeout, invalid structured output, and invalid source references preserve the question and expose Retry, Browse center policies, and Ask staff.
- [x] Deterministic checks cover clarification, missing policy, conflicting policy, explicit staff intent, service confirmation, sensitive inquiries, and technical failure. Small live checks assess grounding and handoff quality.

## Blocked by

- Blocked by `issues/002-reliable-staff-request.md`
- Blocked by `issues/004-sourced-answers-and-usage-limits.md`

## User stories addressed

- User story 4
- User story 5
- User story 6
- User story 7
- User story 17

## Results

- Model result schema grew two things, no new pipeline: `kind` gains `sensitive`, and `contact_staff` marks explicit staff intent. The prompt carries the interaction rules (clarify vs handoff, the five sensitive categories, policy+confirm wording, conflicts, no promises). Validation strips any sources from a sensitive result.
- `askFrontDesk` outcomes: `clarified`, `handoff_offered`, `sensitive` save a front-desk message (evidence only for handoffs); `contact_staff` creates the staff request in the same flow (origin `parent_initiated`, cited policy as known policy) with no second confirmation and no front-desk message; sensitive + `contact_staff` acknowledges, then files an origin `sensitive` request.
- Ask staff from a handoff or sensitive card reuses the saved question (issue 002 dedup path). `POST /api/requests` derives origin and known policy server-side from the saved inquiry; the client sends nothing but `submissionId` and text. History keeps the original outcome and gains the request link.
- Parent view: `HandoffOffer` card (Ask staff + Browse center policies; sensitive variant has no policy link). Request card shows a Sensitive pill and "Not answered from policy". Operator request page: sensitive requests say no knowledge update is suggested; others say a reply alone leaves the gap open.
- Tests: `tests/uncertainty-and-handoff.test.ts` (8) covers I08 clarify with retained exchange, I03 gap → offer → one request with K2, I07 direct handoff + replay, I23 conflict evidence, I06/I13 policy+confirm with no request, I29/I30 sensitive (sources dropped, flagged, no draft), timeout/invalid/unknown-source failure with question preserved. 49 total pass; lint, typecheck, build clean.
- Live check (local, gate on): I03 handoff citing K2, I06 and I21 handoff citing K5 with no reservation, I07 direct request, I08 and I10 clarify, I13 and I17 handoff citing K7/K3 without approval, I29 and I30 sensitive with no policy, I20 handoff with no sources. I19 standalone clarifies (no earlier context); it is an answer when the fever exchange precedes it.
- Cut line kept: conflict handling relies on the prompt plus evidence of both entries; no decision-time work.
