# AI Front Desk — Product Requirements Document

Status: consolidated implementation baseline. Design approved October 7, 2026; implementation and verification have not begun. This document consolidates the completed design interview without expanding its scope.

## Problem Statement

Enrolled families need fast, accurate answers to everyday childcare questions, including holiday closures, illness policies, and meals. Handbooks are inconvenient to search on a phone, and staff may be unavailable while caring for children or outside office hours.

Operators repeatedly answer similar questions. A reply to one family rarely improves the information available to the next family. When an automated assistant cannot help, a vague handoff also leaves parents unsure whether their message was saved, whether anyone is reviewing it, or whether the requested service has actually been confirmed.

## Solution

Build a lightweight, mobile-friendly AI Front Desk for one fictional center, with Parent and Operator perspectives. The parent receives concise answers grounded in staff-published knowledge and can inspect the exact supporting policy text. Missing context prompts clarification. Missing knowledge or a need for staff judgment leads to an offer to ask staff, preserving the conversation.

A persistent staff request card distinguishes known policy information from the outstanding decision. Parents and staff exchange messages asynchronously in the same conversation. Message delivery, staff progress, and service confirmation are separate facts; none implies another.

Operators can reply to individual requests and independently add, edit, and explicitly publish knowledge. The central demonstration is: a question exposes a knowledge gap, staff publishes an update, and a subsequent question receives a grounded answer. A staff reply alone never becomes reusable policy.

The three-hour implementation budget includes deployment, verification, and submission materials. Required scope prioritizes the complete improvement loop. An optional parent-selected decision time adds context about when an answer is needed, without promising when staff will respond.

## User Stories

All stories are required except those explicitly marked **Stretch**. Numbers are stable references for subsequent tickets; they are not separate implementation tasks.

### Parent answers and evidence

1. As an enrolled parent, I want to ask a question through a mobile-friendly text conversation, so that I can get help without searching a handbook manually.
2. As an enrolled parent, I want routine questions about closures, illness policies, and meals answered from my center's published knowledge, so that the answer is relevant to my center.
3. As an enrolled parent, I want concise answers with clickable sources showing the exact published text, so that I can inspect their basis.
4. As an enrolled parent, I want a targeted clarification when necessary context is missing, so that the assistant does not guess what I mean.
5. As an enrolled parent, I want the assistant to distinguish general policy from a decision requiring staff, so that I do not mistake a policy explanation for permission or a service commitment.
6. As an enrolled parent, I want to choose Ask staff when a policy question cannot be answered, so that my unanswered question reaches the center without creating unnecessary requests automatically.
7. As an enrolled parent, I want an explicit request to contact staff to initiate handoff without asking me twice, so that I can reach staff directly.

### Staff follow-up and reliability

8. As an enrolled parent, I want my staff request to preserve my question and conversation context, so that I do not have to repeat myself.
9. As an enrolled parent, I want a request card showing what is known and what still needs confirmation, so that I understand the remaining uncertainty.
10. As an enrolled parent, I want saving, saved, and unconfirmed-delivery feedback separate from staff progress, so that I know whether the application stored my request.
11. As an enrolled parent, I want my question preserved after a failed or uncertain save and a retry that avoids duplicates, so that I can recover without losing work or flooding staff.
12. As an enrolled parent, I want to see whether my request awaits review, is being reviewed, needs my reply, or is closed, so that I know what happens next.
13. As an enrolled parent, I want to add details and receive staff replies in the same persistent conversation, so that I can leave and return later.
14. As an enrolled parent, I want staff replies identified by fictional staff name and timestamp alongside the original question, so that I can distinguish them from automated answers and retain their context.
15. As an enrolled parent, I want office hours and the center's configured contact fallback to be visible, so that I do not assume a live staff member or a guaranteed reply is available.
16. As an enrolled parent, I want a reply to a closed request to reopen it, so that I can continue an unresolved discussion.
17. As an enrolled parent, I want Retry, Browse center policies, and Ask staff when the AI fails, so that a technical problem does not block all help.
18. As an enrolled parent, I want to retain access to policies and staff messaging after the AI allowance is exhausted, so that the rest of the front desk remains useful.

### Operator control and improvement

19. As an operator, I want to see every question with its outcome and individual staff requests in my demo's inbox, so that I can identify unanswered needs and where the assistant struggled.
20. As an operator, I want to explicitly mark a request as being reviewed, so that merely opening it does not imply that I have accepted responsibility.
21. As an operator, I want to send a reply without closing a request or ask a follow-up marked Needs your reply, so that intermediate messages are not mistaken for resolution.
22. As an operator, I want a clear Send & close action with undo or reopening, so that I can finish a request efficiently and recover from an accidental closure.
23. As an operator, I want to add and edit individual knowledge entries with a title, policy text, and publication timestamp, so that internal policy changes can be reflected without an originating inquiry.
24. As an operator, I want to explicitly publish reviewed knowledge, so that draft edits and situational replies do not silently become reusable policy.
25. As an operator, I want to send a reply and open an editable knowledge-update draft for review and publication, so that an unanswered question can improve future answers.
26. As an operator, I want reply-only requests to leave their knowledge gap visible, so that helping one family does not hide the missing information.
27. As an operator, I want a clearly labeled count of normalized matching questions while retaining individual requests, so that I can spot repetition without implying semantic grouping or automatically answering everyone.
28. As an enrolled parent, I want a subsequent question to benefit from an operator's published update, so that the same knowledge gap does not repeatedly require staff attention.

### Reviewer experience and demo operation

29. As a reviewer, I want an isolated fictional dataset without account creation, so that other visitors cannot change my demonstration or access its state.
30. As a reviewer, I want to switch between Parent and Operator views sharing that dataset, so that I can exercise the complete improvement loop myself.
31. As a reviewer, I want conversations, requests, knowledge updates, and source evidence to survive refreshes, so that the demo behaves as a persistent product.
32. As a reviewer, I want a confirmed Reset demo action that restores only my starting dataset, so that I can repeat the demonstration without affecting other visitors.
33. As a demo owner, I want server-enforced limits of 50 AI requests per session and 500 total per day, with bounded input and output, so that the public demo has controlled model usage.
34. As a demo owner, I want reset to preserve usage counters, so that resetting fictional content does not replenish the AI allowance.
35. As a reviewer, I want earlier answers to retain the policy text originally cited after later edits, so that the evidence for an old answer does not silently change.
36. As a reviewer, I want a concise explanation under one page and a simple architecture image, so that I can quickly understand the problem, product judgment, and implementation.

### Optional decision-time extension

37. **Stretch:** As an enrolled parent, I want to specify when I need an answer for a situational request, so that staff can see when the information matters without promising a response deadline.
38. **Stretch:** As an enrolled parent, I want a passed decision time to make missing confirmation visible while retaining the request, so that silence is never mistaken for approval or automatic resolution.

## Implementation Decisions

### Architecture and logical modules

The agreed stack is TypeScript and Next.js hosted on Vercel, with Neon PostgreSQL provisioned through Vercel Marketplace. The server uses OpenAI GPT-6 Luna through the Responses API with structured outputs. Keep the model configurable; change it only if representative checks expose quality problems. Provide the complete small published knowledge base in model context rather than adding a separate classification, embedding, or retrieval pipeline.

The following logical module boundaries organize the agreed behavior. They are not requirements for separate services or a large abstraction framework.

| Module | Responsibility and externally testable interface |
|---|---|
| Demo sessions and persistence | Initialize isolated fictional state, resolve the active session, enforce its data boundary, and reset content without resetting usage. |
| Published knowledge | List published entries, edit drafts, explicitly publish updates, and retain the text/version supporting earlier answers. |
| Answer service | Accept a question and relevant conversation context; return an answer with sources, a clarification, a handoff suggestion, or a technical failure. Encapsulate the model call and response validation. |
| Conversations and staff requests | Save messages, create requests without duplication, record staff attribution, and apply review, follow-up, closure, undo/reopen, and publication-related actions. |
| Usage policy | Atomically enforce session and daily AI allowances and bounded requests, independent of demo-content reset. |
| Parent and Operator views | Present the same session's state through the two user perspectives, including policy browsing, source inspection, inbox, request cards, and knowledge editing. |

Database access and model credentials remain server-side. The model does not directly write the database or approve service requests. Server logic controls mutations and verifies session scope for every relevant read and write. The demo perspective switch is a reviewer convenience, not production identity or role authentication.

### Data and response contracts

- Persist session-owned knowledge entries and their publication evidence, conversations, messages, requests, and usage accounting. Maintain a separate global daily allowance. Concrete table and endpoint names are implementation choices.
- Knowledge entries contain a title, policy text, and publication timestamp. Draft changes are not grounding material until explicitly published.
- Messages retain their speaker, time, and conversation context. Automated answers preserve their cited policy text; staff replies retain fictional staff attribution.
- Structured model results distinguish answer, clarification, and handoff suggestion, with supporting entry IDs where applicable. Validate shape and source references before display; a valid source ID alone does not prove the answer is supported.
- Use a stable submission identity or equivalent deduplication mechanism so retry after a lost response does not create another request. Persist successfully before claiming the request was saved.
- Count matching questions using normalized text that ignores capitalization, extra whitespace, and punctuation. Keep individual requests and label the count accurately.
- Retain fictional inquiry history for the demo lifetime, except an explicitly confirmed session reset. Retention does not authorize reuse of staff replies.

### Interaction rules

- Routine grounded answers do not create staff requests. Missing knowledge offers Ask staff; an explicit request for staff proceeds without duplicate confirmation.
- Sensitive inquiries (an incident involving a child, a custody or pickup restriction, a billing dispute, a staff complaint, a health matter beyond published policy) are never answered from policy. The assistant acknowledges briefly, offers Ask staff at once, flags the request as sensitive in the inbox, and suggests no knowledge-update draft.
- A request card distinguishes known policy, unresolved need, and staff progress. Saving a message does not prove review; review does not prove service approval.
- Staff progress supports awaiting review, staff reviewing, needs your reply, and closed. Review requires explicit staff action; a staff reply need not close the request. A parent response to a closed request reopens it.
- Closure is reversible and uses a clear action with undo/reopen rather than a routine confirmation modal. Reset requires confirmation because it removes the session's work.
- Sending a reply, closing a request, and publishing knowledge are separate actions. The reply-and-update workflow opens a draft for explicit publication. A situational reply alone cannot close the knowledge gap.
- Show office hours and a configured contact fallback without inventing live availability, response deadlines, or notification delivery.
- AI failure preserves the question and offers Retry, Browse center policies, and Ask staff. Exhausted AI allowances leave policy browsing and parent/staff messaging available.
- Decision time is a stretch feature and the first cut under the timebox. It is parent-provided context, not a guaranteed staff response deadline.

## Testing Decisions

Test observable behavior and important state transitions rather than component internals, method-call counts, or snapshots that simply mirror implementation. The repository currently contains planning documents and diagrams only; there is no existing application or test suite to reuse. Select the test runner during implementation and keep tests proportional to the three-hour scope.

| Area | Required verification |
|---|---|
| Grounded answers | Routine policy questions produce concise, supported answers with inspectable sources and no unnecessary request. Clarification, missing policy, conflicting information, and service-confirmation cases do not produce unsupported commitments. Sensitive inquiries get no policy answer and an immediate handoff offer. |
| Question history | Every parent question is listed in the Operator view with its outcome (answered, clarified, handoff offered, sensitive, failed), with or without a staff request. |
| Knowledge publication | Drafts and staff replies do not change future AI grounding; explicit publication does. Editing a policy preserves evidence cited by previous answers. |
| Request lifecycle | Saved requests appear in the operator view; opening alone does not mark review. Follow-up can wait for the parent; close is reversible; parent reply reopens. Closing does not publish knowledge. |
| Persistence and isolation | Refresh preserves both views' state. A second session cannot access or modify the first through the application. Reset affects only the active demo's content. |
| Failure and retry | Failed or uncertain saves preserve input and never claim receipt. Repeating the same submission produces one request. Model timeout or invalid output exposes the agreed recovery options. |
| Usage | The 50/session and 500/day limits hold under concurrent requests; reset cannot replenish allowance. Non-AI workflows remain usable at the limit. |
| Matching counts | Case, whitespace, and punctuation variants match as agreed, without implying semantic grouping. |
| Hosted experience | Verify the parent-to-staff-to-publication-to-improved-answer loop at a mobile viewport on the hosted app; check source readability, status clarity, and office-hours copy. |
| Optional decision time | If implemented, passing the selected time flags missing confirmation without approval, deletion, or automatic closure. |

Use controlled model responses for deterministic application tests and a small set of live model checks for grounding and handoff quality. The concrete seed policies and parent inquiries for both live in [test inquiries and seed knowledge](../docs/test-inquiries.md); this PRD names the behavior classes and does not carry sample text. Do not claim an automation success rate or benchmark that has not been measured. Source-reference validation is necessary but insufficient; inspect whether the cited policy actually supports the answer.

The decisive demonstration is a missing holiday entry (Veterans Day, the assignment's own example): ask the parent question, request staff help, reply without publication and verify the gap remains, explicitly publish the closure information, then ask again and receive a sourced answer. Also verify a meal request requiring staff confirmation so the demo shows the boundary between answering and acting.

## Out of Scope

- A separate prospective-family experience, multiple real centers, real personal data, or production account and role management.
- Document upload/parsing, embeddings, vector search, fine-tuning, a separate intent-classification pipeline, or semantic request grouping.
- Automatically treating staff replies as policies, automatically merging requests, or publishing/broadcasting answers to multiple families.
- Autonomous meal reservations, attendance clearance, policy exceptions, or other service commitments.
- Live staff presence, simulated queues, estimated response promises, email/SMS/push delivery, automatic reminders, or staff reassignment.
- Voice interaction, a proactive parent dashboard, and other new product surfaces beyond the agreed text-based prototype.
- Automated history deletion and full policy effective-date/expiration management. These remain production considerations distinct from optional request decision time.
- Decision-time stories as launch blockers. They remain stretch scope.
- Claiming production readiness or submitting the assignment to the external portal as part of PRD creation.

## Further Notes

### Delivery phases

1. **Working foundation:** establish the app, seeded policy viewing, isolated durable demo state, and initial deployment.
2. **Parent answers:** complete sourced AI answers, clarification and failure paths, and usage limits.
3. **Staff improvement loop:** complete tracked handoff, replies and request lifecycle, direct knowledge editing, and explicit publication improving later answers.
4. **Finish and demonstrate:** verify mobile behavior and failure cases, then align the concise explanation and architecture images with the implementation. Add decision time only if required work fits the budget.

Subsequent ticket planning should target roughly 8–10 small end-to-end slices with explicit dependencies, not separate frontend/backend workstreams. Human-only prerequisites sit in their own ticket, and each ticket carries a minute budget and cut line (see ADR 0007). Each slice should be demoable or independently verifiable. Keep the decision-time extension separately identifiable as stretch scope.

### Setup prerequisites and implementation details

OpenAI credentials and model access, the Vercel account/team, and the Neon provisioning plan still need verification. A previous local Vercel account check failed on DNS resolution; it did not establish that the account is unavailable. No resources have been provisioned as part of design or PRD consolidation.

Routine implementation details remain adjustable without reopening product discovery: exact schema and endpoint names, UI styling, request-length caps, the documented timezone for daily usage reset, and the mechanism for retaining the demo's session identity. These must preserve the agreed behaviors and acceptance checks. Limit counters need an atomic server-side implementation; daily reset semantics must be consistent and testable.

Production follow-on work includes authenticated access, staff ownership and backup coverage, notification reliability, policy validity/expiry, and inquiry retention suited to centers' needs. An unanswered request cannot be made resolved by a status label; operational coverage remains necessary.

### Supporting design documents

- [Consolidated prototype plan](../docs/prototype-plan.md)
- [Domain glossary](../CONTEXT.md)
- [Acceptance checks](../docs/acceptance-checks.md)
- [Test inquiries and seed knowledge](../docs/test-inquiries.md)
- [Communication research](../docs/communication-research.md)
- [Production considerations](../docs/production-notes.md)
- [Prototype focus decision](../docs/adr/0001-prototype-focus.md)
- [Publication and handoff decision](../docs/adr/0002-explicit-publication-and-staff-handoff.md)
- [Conversation and request decision](../docs/adr/0003-conversation-with-tracked-staff-request.md)
- [Demo isolation decision](../docs/adr/0004-isolate-reviewer-demo-sessions.md)
- [Persistence decision](../docs/adr/0005-managed-postgresql-for-demo-state.md)
- [Fixture set decision](../docs/adr/0006-fixture-set-for-seed-knowledge-and-test-inquiries.md)
- [Assignment examples and sensitive inquiries decision](../docs/adr/0008-cover-assignment-examples-and-sensitive-inquiries.md)
- [Ticket planning decision](../docs/adr/0007-isolate-human-prerequisites-and-budget-tickets.md)
- [Submission architecture SVG](../docs/architecture.svg) · [PNG](../docs/architecture.png)
- [Detailed architecture reference](../docs/architecture-detailed.svg)
- [Submission explanation draft](../docs/submission-explanation.md)

The submission explanation stays under one page. The architecture and explanation are design artifacts until checked against the working prototype. This PRD is the consolidated handoff for ticket creation; supporting research recommendations are not additional requirements unless included in the agreed scope above.
