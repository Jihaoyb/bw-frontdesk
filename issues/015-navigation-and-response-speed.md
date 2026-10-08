# Make navigation instant and answers faster

Type: AFK

Budget: 40 of 180 minutes (post-audit slack). Cut line: keep (a) and (c); (b) may ship as the model settings and the allowance statement only.

## Parent PRD

`issues/prd.md`

## What to build

Measured locally after 014: a page change takes 0.25–0.45 s and nothing moves on screen until the new page arrives; an AI answer takes 3.3–5.3 s, of which the model is 2.5–4.5 s and the database the rest. Three causes: every page is dynamic and shows no loading state, each page costs three sequential database round trips (session, data, lookups), and the ask path spends twelve round trips around a model call made at the model's default reasoning effort.

(a) Navigation. Each route segment gets a `loading.tsx` so a tap shows the next screen's frame within one frame, with the header staying put (the header moves into the `parent/` and `operator/` layouts and reads the current section from the pathname). The client router keeps dynamic pages for 30 s (`staleTimes.dynamic`) so Parent ↔ Staff ↔ Knowledge switches come from cache; every mutation already invalidates it (server actions call `revalidatePath`, API saves call `router.refresh()`). Page lookups that depend on an earlier query (known policies, knowledge drafts for requests) become joins so each page is one session check plus one parallel batch.
(b) Answer path. The allowance reservation becomes one statement (session row locked first, then the day counter, then the increment; a rejection still consumes nothing). Grounding reads run alongside the reservation. Persisting an answer and its evidence becomes one statement. The model call sends `reasoning.effort` and `text.verbosity` from `OPENAI_REASONING_EFFORT` and `OPENAI_VERBOSITY` (both default `low`; empty disables); the schema, validation, and copy rules are unchanged. Round trips per ask: 12 → 4.
(c) Keyboard on desktop. Enter sends in every text box (composer, parent follow-up, staff reply), Shift+Enter inserts a newline, Cmd/Ctrl+Enter always sends; Escape leaves the focused box, or closes an open source or policy row when none is focused; `/` focuses the page's main text box when focus is not already in one. Touch keyboards keep Enter as newline. The hint line names the keys.

## Acceptance criteria

- [x] Navigating between Conversation, Policies, Inbox, a request, and Knowledge shows the destination's loading frame before data arrives, with the header unchanged; the router cache keeps dynamic pages for 30 s and every save still shows fresh data after it.
- [x] Parent, Inbox, Request, Policies, and Knowledge pages each issue one session check plus one parallel batch of queries (no query depends on another page query's result).
- [x] The ask path issues 4 database round trips (was 12) and the live smoke (I01, I03, I27, a sensitive case, explicit staff intent) returns the same kinds; before/after timings recorded in Results.
- [x] Enter, Shift+Enter, Cmd/Ctrl+Enter, Escape, and `/` behave as in (c) on a fine pointer; Enter stays a newline on touch; IME composition never submits; tests cover the rules.
- [x] 70+ tests green, lint, typecheck, build clean; no copy change implies a live person, a deadline, or an approval.

## Blocked by

- Blocked by `issues/014-interface-redesign.md`

## User stories addressed

- User story 1, 2 (quick and clear)
- User story 36

## Results

- Navigation: `parent/layout.tsx` and `operator/layout.tsx` render the header once; `SectionTabs` (client) lights the most specific matching section from the pathname, so the header never re-renders between pages. Route groups `parent/(conversation)` and `operator/(knowledge)` give the conversation and the knowledge editor their own `loading.tsx` without catching sibling routes; policies, inbox, and request have theirs. Loading frames (`loading-frame.tsx`) are shapes only, no copy, rendered and checked at 390px and 1360px. `experimental.staleTimes = { dynamic: 30, static: 180 }`; in Next 16 `router.refresh()` invalidates the segment cache and every server action calls `revalidatePath`, so a save is never followed by a stale page.
- Pages: `listRequestKnowledge(sessionId)` returns every entry a request points at (known policy or draft) in one session-scoped query, so parent, inbox, and request pages are one session check plus one `Promise.all` (request page: 6 queries in one batch, `notFound()` after). Knowledge and policies were already one query. Local timings after: parent 0.28 s, inbox 0.19 s, knowledge 0.21 s, policies 0.19 s (before: 0.35, 0.24, 0.33, 0.29).
- Ask path: `consumeAllowance` is one statement (`FOR UPDATE` on the session row, then the day counter, then the session increment; concurrency tests unchanged and green); grounding reads run alongside it; `persistResult` is one statement returning the message, evidence, and inquiry as JSON rows with dated columns revived. Round trips: session check, claim, reservation + grounding, persist = 4 (was 12). Model: `reasoning.effort` and `text.verbosity` from `OPENAI_REASONING_EFFORT` / `OPENAI_VERBOSITY`, default `low`, documented in the README. Measured on the configured model with the real system prompt, 3 runs each: hours 1.6–2.4 s (default 1.9–5.6 s), Veterans Day 1.9–3.6 s (2.9–4.5 s), biting incident 1.6–1.7 s (2.5–3.3 s); kinds identical (answer, handoff, sensitive). Live smoke through `/api/ask` after: I01 answered with 1 source, I27 answered with the return rule, I03 handoff_offered citing holiday closures, biting sensitive with no source, "talk to someone at the office" staff_requested, "What's the policy?" clarified, forgotten lunch handoff_offered. One transient `model_error` seen once in 15 calls (not reproducible); the server now logs the failure message, never the request.
- Keyboard: `shouldSendOnEnter` adds Cmd/Ctrl+Enter (any pointer, never mid-composition); `shouldLeaveOnEscape`, `isFocusShortcut`, `isEditable` in `compose-keys.ts`; `KeyboardShortcuts` (mounted in the root layout) handles `/` and Escape; Enter-to-send wired into the parent follow-up and staff reply boxes; `data-shortcut-focus` on the composer and the staff reply box; hint copy "Enter sends · Shift+Enter new line · Esc leaves · / focuses" on the composer (sm and up) and "Enter sends, Shift+Enter new line" on the staff box. Three new tests cover the rules.
- Verification: 71 tests green in three batches, lint, typecheck, build clean. Not changed: data, copy rules, server actions, test ids. Note: with a loading boundary the request page streams its shell first, so an unknown or other-session id now renders the not-found page with HTTP 200 instead of 404; the isolation itself is unchanged (nothing of another session is read or shown).
