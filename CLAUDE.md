# AI Front Desk — working rules

Prototype for a take-home: mobile-friendly AI front desk for one fictional childcare center, Parent and Operator views. Three-hour implementation cap, hard.

## Read first, every session

1. `CONTEXT.md` (glossary; use these terms in code and copy)
2. `issues/prd.md` (behavior baseline; do not reopen scope)
3. `docs/test-inquiries.md` (exact seed text, inquiries, expected outcomes, demo script)
4. The one issue named in the prompt. Its Budget and Cut line are binding.

Skim `docs/adr/` only if a decision is unclear. Do not read other issues unless the current one references them.

## Rules

- Implement exactly the issue's acceptance criteria. Nothing from later issues, nothing "while I'm here".
- Vertical slice: the issue is done when its end state is usable in the browser, tests pass, and it is committed. Not before.
- Seed text, center config, staff names, and inquiry wording come verbatim from `docs/test-inquiries.md`. Never invent policies or samples.
- Model calls go through one server-side interface. Tests use stubbed responses; never call the live model from tests.
- Database access and model credentials stay server-side. Every read and write is scoped to the active demo session.
- Delivery, staff progress, and service confirmation are separate facts. Copy must never imply live staff, a reply deadline, or an approved service.
- Tests cover observable behavior and state transitions, not component internals or snapshots. Write them inside the ticket, before commit.
- Keep context small: `Read`/`Grep` files yourself instead of pasting output into chat; split a big ticket at its (a)/(b)/(c) markers if needed.
- Commit per ticket: `feat(NNN): <issue title>`. Tick the acceptance criteria in the issue file in the same commit.
- Do not touch `.env*`, never print secrets. Model and limits are config, not constants.

## Stack

TypeScript, Next.js (App Router, `src/app/`), PostgreSQL (Neon on Vercel; local Postgres for dev), OpenAI Responses API with structured outputs, Vitest. Hosted on Vercel.

## Commands

- `npm run dev` — local app
- `npm test` — unit + integration (needs `DATABASE_URL` to a test database)
- `npm run lint && npm run typecheck` — before commit
