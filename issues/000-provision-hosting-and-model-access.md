# Provision hosting, database, and model access

Type: HITL

Budget: human time, runs in parallel with issue 001. Cut line: none; required for any hosted criterion.

## Parent PRD

`issues/prd.md`

## What to build

Resolve the human-only prerequisites from the PRD's Setup prerequisites section so every other ticket can run without waiting on a person. Verify the Vercel account/team, provision Neon PostgreSQL through Vercel Marketplace on the chosen plan, and confirm OpenAI credentials with GPT-6 Luna access. Place secrets in Vercel and local environment configuration only; never in the repository or ticket text. The earlier local CLI DNS failure is inconclusive; retry the account check.

Nothing in this ticket is application code. Issue 001 proceeds locally while this is open and consumes its output for the hosted-deployment criterion. See `docs/adr/0007-isolate-human-prerequisites-and-budget-tickets.md`.

## Acceptance criteria

- [x] Vercel team access confirmed and the project can be created or linked.
- [x] Neon database provisioned through Vercel Marketplace; connection string available to the deployment as an environment variable.
- [x] OpenAI API key verified with a minimal Responses API call against the configured model; model identifier recorded as configuration.
- [x] Unresolved prerequisites, plan limits, or substitutions (for example a different model or database plan) are recorded explicitly in this issue.
- [x] No credential appears in the repository, tickets, or docs.

## Blocked by

None - can start immediately.

## User stories addressed

None directly; enables user stories 29–34 and the hosted verification in issue 009.

## Results

Verified 2026-10-07 from the project folder. No credential values printed or recorded.

Passed:
- Vercel: team `jihaoybs-projects`, project `bw-frontdesk` created and linked via `vercel link` (`.vercel/project.json` present, gitignored). `vercel env pull` succeeded, which confirms account auth and project access. `vercel whoami` was not run from the verification shell (sandbox has no Vercel login); link + env pull served as the account check. The earlier DNS failure did not recur.
- Neon: provisioned through Vercel Marketplace, Free plan. `DATABASE_URL` present in Vercel env (all environments) and in `.env.local`. `SELECT 1` succeeded over the pooled connection string (host `*-pooler...neon.tech`), PostgreSQL 18.6.
- OpenAI: `OPENAI_API_KEY` and `OPENAI_MODEL` present in Vercel env and `.env.local`. Minimal Responses API call with structured output (`json_schema`, strict) returned HTTP 200, response model `gpt-6-luna` matching the configured `OPENAI_MODEL`, JSON parsed. 49 tokens.
- Repository scan for API keys and connection strings: none found. `.gitignore` excludes `.env*`, `node_modules`, `.next`, `.vercel`.

Failed: none.

Substitutions / limits:
- Model: `gpt-6-luna` as configured, no substitution.
- Database plan: Neon Free. Compute autosuspends after inactivity; first query after idle may take ~1 s cold start. Acceptable for the prototype.
- `.env.local` also contains `VERCEL_OIDC_TOKEN` and Neon helper vars added by `vercel env pull`; unused by the app.

Note: `vercel env pull` appends a duplicate `.vercel` line to `.gitignore`; reverted, already covered by `.vercel/`.
