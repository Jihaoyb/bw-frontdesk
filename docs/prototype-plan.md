# Prototype plan

**Status: Design complete — October 7, 2026.** The user confirmed shared understanding and authorized closing the design stage. This is the agreed implementation baseline; application implementation and deployment have not begun.

## Agreed scope

- Three-hour build budget including deployment, verification, and submission explanation.
- Enrolled-family experience for a fictional center, with parent and operator perspectives.
- Demonstrate the operator improvement loop: an inquiry exposes missing knowledge, staff explicitly publishes an update, and a subsequent inquiry benefits.
- Individually editable knowledge entries with a title, policy text, and publication timestamp. Staff can maintain knowledge independently of requests.
- Focus on handbook and routine questions about closures, illness, and meals. Exercise direct answers, clarification, missing information, and staff confirmation.
- Concise automated answers with a clickable source exposing the exact published policy text.
- Individual pending requests with a simple recurring-question count.
- Staff replies appear in the original parent conversation. Waiting status changes when staff replies.
- Fictional inquiry history lasts for the demo; saved replies are not automatically reusable knowledge.
- Provide the complete small published knowledge base to the model, with a structured answer/clarification/handoff result and supporting entry IDs; avoid a separate classification or retrieval pipeline.
- Staff replies retain the original question, fictional staff identity, and timestamp. Preserve the policy text cited by earlier automated answers so later edits do not rewrite their supporting record.
- Count matching questions by normalized text, ignoring capitalization, extra whitespace, and punctuation; do not imply semantic grouping.
- Use a persistent asynchronous conversation with an embedded staff request card as the required interaction model. Show known policy information, the unresolved need, and staff progress separately from message delivery.
- An optional parent-selected decision time is the intended differentiator, but is the first feature to cut if it threatens the three-hour build. It never promises a response deadline.
- Distinguish saved requests, explicit staff review, and substantive staff confirmation. Show office hours and a contact fallback without implying live staff availability. Do not promise external notifications in the prototype.
- Offer Ask staff for unanswered policy questions; an explicit parent request to contact staff initiates handoff without asking twice. Preserve the conversation context.
- Separate Send reply from Send & close. Staff follow-up questions can mark a request Needs your reply; parent replies to closed requests reopen them. Closing a request does not publish knowledge or close its knowledge gap.
- Use a clear Send & close action with undo/reopen rather than a routine confirmation modal, since closure is reversible. Confirm Reset demo because it removes the session's work.
- Give each browser session an isolated fictional demo persisted on the server and surviving refresh. Parent and Operator views share that session's data. Reset demo restores the fictional starting state.
- Build with TypeScript and Next.js, host on Vercel, and use OpenAI GPT-6 Luna initially through the Responses API with structured outputs. Keep the model configurable and reconsider it only if representative quality checks expose problems.
- Persist conversations, requests, and published knowledge in managed PostgreSQL, accessed through the server with each record scoped to its isolated demo session.
- Use Neon through Vercel Marketplace for managed PostgreSQL; verify account access and the selected plan before provisioning.
- If AI inference fails, preserve the question and offer Retry, Browse center policies, and Ask staff; distinguish technical failures from knowledge gaps.
- Limit AI requests to 50 per demo session and 500 total per day, with bounded input/output lengths. Demo reset does not reset usage allowance. Policy browsing and parent/staff messaging remain available when AI limits are reached.
- Deliver a concise written explanation under one page and an architecture image. Keep the explanation easy to understand and align it with the verified implementation before submission.
- Use a simplified architecture/answer-flow diagram for submission (`docs/architecture.svg` and `.png`); retain the detailed component diagram as `docs/architecture-detailed.svg` and `.png` for reference. Both depict the planned design until implementation is verified.

## Setup checks before implementation/deployment

- Verify OpenAI API credentials and GPT-6 Luna access without exposing secrets.
- Verify Vercel account/team and Neon provisioning plan. The local CLI account check encountered a DNS resolution failure; existing integrations remain unknown.

## Implementation priorities

1. Establish the application, isolated persistent demo data, and deployment path.
2. Complete the parent answer → staff request → staff reply → explicit publication → improved answer loop.
3. Verify source grounding, request persistence and retry behavior, session isolation, usage limits, and the mobile experience against `acceptance-checks.md`.
4. Add the optional decision-time field only if the required flow and verification fit the three-hour budget.
5. Update the concise submission explanation and architecture images to match the verified implementation.
