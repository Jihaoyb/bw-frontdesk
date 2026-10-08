# 017 — Make chat feel like chat

Small talk should not fail source validation. A saved answer should appear as soon as the API returns it.

- Add `chat` for social replies and off-topic redirection. Policy answers still require sources; chat carries no sources or staff handoff.
- Match a short list of whole-message greetings, thanks, and acknowledgments before model dispatch. Persist these turns, deduplicate retries, and consume no AI allowance. Mixed questions use the normal model path.
- Render validated, persisted API answers immediately, including source snapshots and handoff offers. Reconcile by saved message IDs during background refresh without duplicate bubbles.
- Keep existing persistence and usage enforcement. No streaming, new service, dependency, or client data cache.

Deployment: apply migration `008_chat_outcome.sql` before deploying the application.

Verification: focused small-talk, grounding, usage, handoff, and question-history tests; TypeScript and lint; local browser greeting and policy-question checks. Exact latency gains are not a benchmark.

Result: migration applied to the configured demo database. All 31 focused tests passed (the existing timeout test required one rerun). Production build, TypeScript, lint, and local desktop browser checks passed. A greeting used no allowance; a mixed greeting/policy question retained its source; off-topic text redirected without handoff. No deployment or push performed.
