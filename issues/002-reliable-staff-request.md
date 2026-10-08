# Create a reliable staff request

Type: AFK

Budget: 20 of 180 minutes. Cut line: keep save/dedupe and the inbox entry; defer card styling and the unconfirmed-delivery state copy to plain text.

## Parent PRD

`issues/prd.md`

## What to build

Let a parent enter a question and choose the Ask staff button, then see a persistent request card and the matching individual request in the Operator inbox. Implement the PRD's Conversations and staff requests module and delivery/deduplication contracts.

This issue owns the conversation and message persistence model, including parent messages, speakers, timestamps, and conversation context. The parent sees a conversation screen showing their message and the request card; this is the screen issue 004 adds automated answers into, not a standalone form. Issue 003 extends it for staff replies; issue 004 adds automated answers. Natural-language detection of an explicit request for staff belongs exclusively to issue 005.

## Acceptance criteria

- [ ] Ask staff saves the original question and conversation context in the active session and creates an individual request visible in its Operator inbox.
- [ ] The request card separates known policy, unresolved need, and awaiting-review progress; it does not invent policy when none is available.
- [ ] Saving, saved, and unconfirmed-delivery states are distinct from staff progress. Only successful persistence permits a saved claim.
- [ ] Failed or uncertain saves preserve the parent's input and offer retry. Reusing a stable submission identity after a lost response creates one request, including concurrent retries.
- [ ] Requests and parent messages survive refresh and remain inaccessible to other sessions.
- [ ] Opening an inbox request does not mark it reviewed or imply service approval.
- [ ] A request carries an outcome tag from its origin (parent-initiated, handoff offered, sensitive) so the inbox can show where the assistant struggled; issue 004 extends the same list to questions without requests.
- [ ] Tests exercise successful creation, rejected/uncertain saves, duplicate retries, and cross-session access attempts.

## Blocked by

- Blocked by `issues/001-isolated-persistent-demo.md`

## User stories addressed

- User story 8
- User story 9
- User story 10
- User story 11
- User story 19 (individual staff requests; question history in issue 004, counts in issue 008)
