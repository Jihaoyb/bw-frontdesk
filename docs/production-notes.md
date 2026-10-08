# Production considerations

This prototype is a reviewer-isolated demo on purpose: every browser gets its own fictional center, policies, inbox, and conversation, and a Parent/Operator switch replaces login (PRD stories 29–32). The sections below record what a real deployment changes. Each one was considered during the build and kept out of the prototype deliberately; they are not oversights.

## Roles and navigation

Today: the Parent/Operator switch is a demo convenience. Staff pages and actions are reachable from any browser that owns the session.
Why: story 30 asks reviewers to exercise both sides of the loop without accounts.
Real deployment: separate public and staff navigation; staff pages and server actions require an authenticated staff role; parents get a public help surface with no staff entry point.

## Tenancy: school-owned knowledge and queue, private conversations

Today: policies, drafts, and the staff inbox belong to the browser session that created them. Publishing in one session changes nothing for another.
Why: story 29 (isolated dataset) and story 32 (reset affects only one demo).
Real deployment: one knowledge base and one staff queue per center, shared by all staff; each family's conversation is private to that family and visible to staff. Reviewer isolation, if still wanted, becomes a separate sandbox tenant.

## Identity at handoff and return access

Today: a request carries the question text and the conversation; there is no family identity, and the conversation is reachable only from the browser that holds the cookie.
Why: no accounts in the demo; collecting contact details without identity would be theater.
Real deployment: at handoff, collect the minimum staff need (child's name or classroom, a way to reach the family) and verify identity before handling individual records or sensitive decisions; offer a secure return link or an authenticated family account so a lost cookie or a second device does not lose the thread.

## Staff attribution and ownership

Today: staff pick a name from a seeded dropdown (Dana R., Priya S.).
Why: fictional staff from `docs/test-inquiries.md`; no login to derive it from.
Real deployment: the responder is the signed-in staff member; request ownership (who is handling it) is tracked separately from who last replied.

## Incoming replies and unread state

Today: staff replies appear under the original question after a refresh; there is no unread marker, polling, or notification.
Why: the PRD defers email/SMS delivery and live presence; copy says staff read messages during office hours.
Real deployment: a "Your requests" view, unread markers, incoming-message refresh (polling or push), and an explicit statement of how families are notified (in-app only, email, SMS) with the matching consent.

## New conversation vs. reset

Today: one conversation per session; Reset demo deletes the conversation, requests, and published updates together.
Why: story 32 needs a one-step restore of the starting dataset.
Real deployment: "New conversation" starts a fresh thread while pending requests and published policies persist; deleting history is a separate, explicit control that never cancels an open request silently.

## Retention and privacy copy

Today: the session cookie lasts 30 days; server data persists until reset. The parent view says so and names what Reset deletes.
Why: fictional data; no retention policy is appropriate to invent for a demo.
Real deployment: a configurable inquiry-retention policy agreed with each center; unresolved requests stay visible until resolved or explicitly closed rather than expiring; published knowledge supports effective dates, optional expiration, and replacement by newer versions, with superseded text excluded from answers and prior versions retained per policy. Time-sensitive requests (a lunch for a particular day) become visibly outdated instead of implying an ongoing commitment. Privacy copy states who can read what and for how long.

## Queue operations

Today: the inbox sorts by creation time with a status pill, origin, and knowledge-update state.
Why: ticket scope; the loop is the demonstration, not queue management.
Real deployment: owner assignment, needs-action and unread filters, last-activity sorting, and reopened requests returning to the top.

## Help surface and composer

Today: the parent view opens on the conversation; policies are a tab; one composer with named destinations ("Ask AI" / "Send to school staff"); each request has its own reply box.
Why: the PRD's demo starts from a question.
Real deployment: a help landing page (hours, contact, handbook, common questions tied to published policies) with "Ask a question" beneath; one active conversation or request at a time with one clearly labeled composer; "Ask about this policy" entry points from the policy browser.
