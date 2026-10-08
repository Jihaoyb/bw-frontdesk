# AI Front Desk

*Verified against the hosted prototype on October 7, 2026: https://bw-frontdesk.vercel.app*

Parents need quick, trustworthy answers. Staff need fewer repeated questions. This prototype is an AI front desk for enrolled families at a fictional childcare center, covering everyday questions about closures, illness rules, meals, tuition, and tours.

The front desk answers only from staff-published policies and attaches the exact text it relied on; that evidence is a snapshot, so an old answer still shows what it cited even after the policy changes. When the policies do not settle a question, or a request needs a staff decision (a same-day lunch, a pickup exception), the assistant says what the policy covers and offers Ask staff. A request card in the conversation separates the known policy from what still needs staff, and nothing in the UI implies a reservation, an approval, or a reply deadline. Sensitive matters (an incident, a custody change, a billing dispute, a staff complaint) are never answered from policy: the assistant acknowledges briefly and offers Ask staff (or opens the request directly when the parent asks for a person), and the request is flagged in the inbox.

Staff reply in the same conversation and track progress (reviewing, needs your reply, closed, reopen). A reply alone never changes future answers: the request shows "no knowledge update yet" until an operator opens a draft, reviews it, and explicitly publishes. That is the central loop, verified end to end on the hosted app: "Are you open on Veterans Day?" is a handoff, staff reply, the same question is still a handoff, staff publish the updated closure list, and the next ask is a sourced answer. Operators can also create and edit knowledge directly; drafts persist but stay out of the policy browser and the AI until published.

Architecture: one Next.js app on Vercel, Neon PostgreSQL for policies, drafts, conversations, requests, evidence snapshots and usage counters, and OpenAI GPT-6 Luna through the Responses API with a strict JSON schema; the server validates every result and source id before anything is shown. Each browser gets an isolated, resettable demo session; the Parent/Operator switch is a reviewer convenience. AI usage is capped at 50 per session and 500 per day on the server; policy browsing and staff messaging keep working when the cap is hit, and a failed model call keeps the question and offers retry, policies, or staff.

Deferred on purpose: live staff presence, email/SMS delivery, document ingestion, real authentication and school-wide tenancy (see [production notes](production-notes.md)), and the optional parent decision time (issue 010, not implemented). Known limit: grounding quality is checked on a small live sample per behavior class, not measured as a success rate.

[Architecture diagram (SVG)](architecture.svg) · [PNG](architecture.png) · [Detailed](architecture-detailed.svg)
