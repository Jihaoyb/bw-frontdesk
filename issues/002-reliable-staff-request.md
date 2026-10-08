# Create a reliable staff request

Type: AFK

Budget: 20 of 180 minutes. Cut line: keep save/dedupe and the inbox entry; defer card styling and the unconfirmed-delivery state copy to plain text.

## Parent PRD

`issues/prd.md`

## What to build

Let a parent enter a question and choose the Ask staff button, then see a persistent request card and the matching individual request in the Operator inbox. Implement the PRD's Conversations and staff requests module and delivery/deduplication contracts.

This issue owns the conversation and message persistence model, including parent messages, speakers, timestamps, and conversation context. The parent sees a conversation screen showing their message and the request card; this is the screen issue 004 adds automated answers into, not a standalone form. Issue 003 extends it for staff replies; issue 004 adds automated answers. Natural-language detection of an explicit request for staff belongs exclusively to issue 005.

## Acceptance criteria

- [x] Ask staff saves the original question and conversation context in the active session and creates an individual request visible in its Operator inbox.
- [x] The request card separates known policy, unresolved need, and awaiting-review progress; it does not invent policy when none is available.
- [x] Saving, saved, and unconfirmed-delivery states are distinct from staff progress. Only successful persistence permits a saved claim.
- [x] Failed or uncertain saves preserve the parent's input and offer retry. Reusing a stable submission identity after a lost response creates one request, including concurrent retries.
- [x] Requests and parent messages survive refresh and remain inaccessible to other sessions.
- [x] Opening an inbox request does not mark it reviewed or imply service approval.
- [x] A request carries an outcome tag from its origin (parent-initiated, handoff offered, sensitive) so the inbox can show where the assistant struggled; issue 004 extends the same list to questions without requests.
- [x] Tests exercise successful creation, rejected/uncertain saves, duplicate retries, and cross-session access attempts.

## Blocked by

- Blocked by `issues/001-isolated-persistent-demo.md`

## User stories addressed

- User story 8
- User story 9
- User story 10
- User story 11
- User story 19 (individual staff requests; question history in issue 004, counts in issue 008)

## Results

- Migration `002_conversations_and_requests.sql`: `conversations`, `messages`, `staff_requests` (unique on `(session_id, submission_id)`; `origin` and `status` enums; nullable `known_policy_entry_id` for later issues). Reset now removes conversations, messages, and requests with the session content.
- `POST /api/requests` with `{submissionId, question}` → 201 created, 200 already saved (retry), 400 invalid (empty, whitespace, over `MAX_QUESTION_CHARS` default 1000, bad id), 401 no session. Only a 2xx lets the client show "Saved".
- Parent `/parent` is now the conversation screen: messages, request card per question (known policy / still needs staff / staff progress), Ask staff form with saving / saved / rejected / unconfirmed states; unconfirmed keeps the text and retries with the same submission id. Policies moved to `/parent/policies`.
- Operator `/operator/inbox` lists requests with status and origin tag (parent asked for staff / handoff offered / sensitive); `/operator/inbox/[id]` is read-only and 404s for another session's id.
- Tests: 7 new (16 total): creation, validation rejects before save, 5 concurrent retries → one request and one message, same submission id across sessions stays separate, cross-session reads null, refresh keeps / reset clears, origin tags, API status codes.
- Cut line not used: card is plain text with labels; no styling pass.
