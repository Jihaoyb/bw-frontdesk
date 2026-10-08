# Open an isolated, persistent demo

Type: AFK

Budget: 30 of 180 minutes. Cut line: drop visual polish and any policy-browser search or filtering; keep session isolation, seed, reset, and the perspective switch.

## Parent PRD

`issues/prd.md`

## What to build

Deliver a mobile-friendly policy browser for one fictional center, with Parent and Operator perspectives sharing isolated, durable session state. Follow the PRD's Architecture and logical modules, Interaction rules, and Setup prerequisites sections. Use Next.js/TypeScript with PostgreSQL accessed only from the server; build and test locally first, then deploy to Vercel with Neon once issue 000 supplies access.

This issue owns session identity, seeded knowledge, office-hours and contact configuration, and session-scoped reset. Seed content, office hours, fallback contact, and fictional staff names come verbatim from `docs/test-inquiries.md`, including its deliberate holiday gaps; do not seed a policy conflict. Issue 002 owns conversation and message persistence. Create only the tables this slice needs (sessions, knowledge entries, center configuration); later slices add their own migrations for messages, requests, evidence, and usage. Keep session identity and usage accounting independent of resettable content.

## Acceptance criteria

- [x] A visitor can open the app without account creation, browse the seeded published policies K1–K10 from `docs/test-inquiries.md`, and switch perspectives within the same fictional dataset.
- [x] Policies, office hours, and the configured contact fallback are readable at a mobile viewport and do not imply live availability or guaranteed replies.
- [x] Refresh preserves session state. Server-side scope checks prevent a second session from reading or modifying the first, including attempts using another session's resource identifiers.
- [x] Confirmed Reset demo restores only the active session's starting content; cancellation changes nothing. Session identity survives reset so issue 004 can retain usage accounting.
- [x] Database credentials remain server-side; the perspective switch is described as a demo convenience, not production authentication.
- [x] Hosted on Vercel with Neon once issue 000 is complete; the local build and all other criteria do not wait for it.
- [x] Verify isolation, refresh, reset, and policy viewing through observable behavior.

## Blocked by

- Blocked by `issues/000-provision-hosting-and-model-access.md` for the hosted-deployment criterion only; local implementation can start immediately.

## User stories addressed

- User story 15
- User story 29
- User story 30
- User story 31 (session and seeded knowledge foundation; later issues extend persistence)
- User story 32

## Results

- Hosted: https://bw-frontdesk.vercel.app (Vercel project `bw-frontdesk`, Neon via Marketplace). Verified 2026-10-07: session cookie assigned on first visit, K1–K10 rendered in both views, same session across refresh, a second visitor gets a separate session, `/` redirects to `/parent`.
- Tests: 9 Vitest tests (seed verbatim and ordered, refresh keeps state, cross-session id lookup returns null, reset restores only the active session and keeps identity/reset_count, copy avoids live-availability wording, cookie tamper replaced).
- Cut line not needed: no search/filter built; visual polish minimal.
