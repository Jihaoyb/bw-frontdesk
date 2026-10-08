# Provision hosting, database, and model access

Type: HITL

Budget: human time, runs in parallel with issue 001. Cut line: none; required for any hosted criterion.

## Parent PRD

`issues/prd.md`

## What to build

Resolve the human-only prerequisites from the PRD's Setup prerequisites section so every other ticket can run without waiting on a person. Verify the Vercel account/team, provision Neon PostgreSQL through Vercel Marketplace on the chosen plan, and confirm OpenAI credentials with GPT-6 Luna access. Place secrets in Vercel and local environment configuration only; never in the repository or ticket text. The earlier local CLI DNS failure is inconclusive; retry the account check.

Nothing in this ticket is application code. Issue 001 proceeds locally while this is open and consumes its output for the hosted-deployment criterion. See `docs/adr/0007-isolate-human-prerequisites-and-budget-tickets.md`.

## Acceptance criteria

- [ ] Vercel team access confirmed and the project can be created or linked.
- [ ] Neon database provisioned through Vercel Marketplace; connection string available to the deployment as an environment variable.
- [ ] OpenAI API key verified with a minimal Responses API call against the configured model; model identifier recorded as configuration.
- [ ] Unresolved prerequisites, plan limits, or substitutions (for example a different model or database plan) are recorded explicitly in this issue.
- [ ] No credential appears in the repository, tickets, or docs.

## Blocked by

None - can start immediately.

## User stories addressed

None directly; enables user stories 29–34 and the hosted verification in issue 009.
