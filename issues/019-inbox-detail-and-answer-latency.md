# 019 — Focus Inbox details, collapse closed replies, and investigate answer latency

Status: Implemented locally; deployment verification pending.

## Requested behavior

- Selecting an Inbox question shows that question and its answer with evidence, not the surrounding chat history.
- A staff request keeps its own messages and replies, without unrelated earlier conversation context.
- Closed requests show a Reopen button instead of the reply editor. Reopening restores the editor; failed actions retain retry/error feedback.
- Investigate parent answer latency and make evidence-backed improvements.

## Changes

- Inquiry detail selects message IDs from the inquiry's question/answer links.
- Request detail no longer queries or renders preceding chat context. Request-specific follow-ups, staff replies, sources, and Handbook controls remain available.
- Closed reply panels render only Reopen and delivery feedback.
- Inquiry claiming checks the expected active conversation within the insert, removing two sequential database reads on new questions. The session row lock, transaction, duplicate replay, stale-tab rejection, and retry rules remain intact.
- `/api/ask` emits a `Server-Timing` header with session, claim, grounding, model, persistence, and total durations when those stages run. Headers contain durations only, with no question text or identifiers.

## Investigation — October 8, 2026

Local Next development server at localhost:3001, remote configured database, configured `gpt-6-luna` model. Measurements are small diagnostic samples, not production percentiles.

A live care-hours question before the database change took 3,267 ms server-side: session 85 ms, claim 500 ms, grounding 87 ms, model 2,515 ms, persistence 81 ms. The model was the largest contributor.

After removing redundant reads, the same flow took 2,509 ms: session 90 ms, claim 367 ms, grounding 103 ms, model 1,848 ms, persistence 100 ms. Only the claim reduction is attributable to the database change; model variability explains most of the total difference. Two greeting calls also reduced claim time from 503/507 ms to 378/376 ms.

Compared `low` and `none` reasoning with six synthetic questions each: hours, an unlisted holiday, fever, a biting incident, spare lunch, and an attempted policy override. Both produced the expected outcome kinds and appropriate source behavior. Model durations were 1.95–4.45 seconds with low and 1.59–3.89 seconds with none; means were 2.80 and 2.91 seconds respectively. Kept low because this sample does not demonstrate a speed benefit from none.

Reference: [OpenAI latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization) and [reasoning guide](https://developers.openai.com/api/docs/guides/reasoning).

## Follow-up options

- Collect hosted Server-Timing measurements before choosing a new model or changing deployment/database regions. Local-to-database latency does not establish hosted latency.
- Benchmark another low-latency model on the existing policy, sensitive-topic, handoff, multilingual, and override cases before changing production configuration.
- Streaming can reduce perceived waiting, but partial structured responses have not yet passed outcome/source validation. A streaming design needs an explicit provisional state and must preserve final validation and persistence. It is not included in this change.
- Avoid generic answer caching: published policy revisions and conversation context affect correctness. Any future cache must include those dependencies and session isolation.

## Verification

- Browser: localhost:3001, Chromium via bundled Playwright (Browser plugin unavailable), desktop 1440×1000 and mobile 390×900.
- Selected one greeting after another greeting and a policy question in the same chat: detail contained only its two linked messages.
- Created a staff request, replied and closed it: editor and Send buttons disappeared; Reopen restored the editor.
- Page identity, meaningful content, no framework overlay, no page runtime errors, and no mobile horizontal overflow verified.
- Screenshots: `/tmp/019-selected-question.png`, `/tmp/019-closed-request.png`, `/tmp/019-closed-mobile.png`.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed.
- `npm test -- tests/ui-refinement.test.ts tests/answers-and-usage.test.ts tests/uncertainty-and-handoff.test.ts`: 27/27 passed, covering restart isolation, concurrent/repeated submissions, allowances, evidence, and handoffs.

No deployment or model configuration change made. Physical-device and hosted latency checks remain pending.
