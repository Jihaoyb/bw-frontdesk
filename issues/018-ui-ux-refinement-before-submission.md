# 018 — Refine operator navigation and parent conversations

Status: Implemented locally on October 8, 2026. Deployment and hosted recheck pending.

## Purpose and scope

Make operator work easier to find and parent conversations easier to use before submission. This issue records all nine requested refinements. The user authorized implementation with “do 018.”

Parent PRD: [issues/prd.md](prd.md). Builds on issues 014–017. This request supersedes issue 016's separate Inbox and Questions navigation. Preserve its complete question history, source evidence, matching counts, and session isolation.

The five screenshots supplied with this request are visual references, not product instructions. Image 1 illustrates Handbook categories and lower navigation; image 2 illustrates a combined inbox and summary; image 3 identifies uneven parent spacing; image 4 illustrates Start over placement; image 5 illustrates five suggested questions. Preserve the existing fictional center and current visual language. Do not copy screenshot errors, internal configuration messages, automatic-routing claims, or promises of immediate staff help.

## Requested changes and acceptance criteria

### 1. Put operator navigation below the header

- [x] Give section navigation its own row below the center title and subtitle, above page content, as in images 1–2.
- [x] After consolidation, show two primary tabs: **Inbox** and **Handbook**. Keep the Parent/Staff switch separate.
- [x] Make the active tab obvious through an underline or equivalent shape plus text treatment. Support keyboard focus and narrow screens without clipped labels.
- [x] Keep navigation placement consistent on list, detail, and editor screens.

### 2. Combine Inbox and Questions

- [x] Use one Inbox workspace for questions and staff requests. Remove the separate Questions tab.
- [x] Provide an **All** view containing every inquiry, including answered, clarified, handoff, sensitive, failed, and chat outcomes. Include direct staff requests that have no inquiry.
- [x] Keep **Open**, **Needs action**, and **Closed** filters for actual staff requests. Open means every non-closed request; Needs action means awaiting review; Closed means closed requests. Answered questions without requests belong in All, not Closed.
- [x] Default to Needs action to emphasize staff work; keep All one click away. Show an informative empty state when the selected filter has no items.
- [x] Link an inquiry and its staff request into one selectable item, without duplicate rows. Preserve individual repeated inquiries and normalized matching counts.
- [x] On desktop, show the list beside the selected question or request. Show the original question, AI outcome, source evidence, and relevant conversation context. Requests retain replies, lifecycle controls, and explicit Handbook publication actions.
- [x] On phones, use a list/detail flow with a clear Back action that preserves the chosen filter and selection.
- [x] Opening a row never changes review state. A handoff offer alone never implies a saved staff request.
- [x] Preserve access through existing question and request URLs with redirects or equivalent navigation. Keep historical threads readable after Start over.

### 3. Show the percentage answered on the spot

- [x] Add a compact Inbox summary labeled **Answered on the spot** with both percentage and supporting counts.
- [x] Define it as `answered inquiries / eligible inquiries × 100`, rounded to the nearest whole percent. Eligible outcomes are answered, clarified, handoff, sensitive, and failed. Exclude chat and pending inquiries. Count a retried inquiry once using its current persisted outcome.
- [x] Show **— · No questions yet** when the denominator is zero. Example: 5 answered out of 9 eligible inquiries displays **56% · 5 of 9 questions**.
- [x] Scope the summary to all retained conversations in the current demo session, independent of Inbox filters. Start over does not erase or reset it.
- [x] Explain the denominator in nearby help text. This describes recorded AI outcomes, not verified accuracy or confirmed resolution. Later staff involvement does not retroactively rewrite the original AI outcome.

### 4. Make request status filters easier to distinguish

- [x] Give Open, Needs action, and Closed distinct, readable text colors. Suggested palette: blue for Open, amber for Needs action, muted green for Closed.
- [x] Retain labels and counts; color must never be the only signal. Use a separate selected-state indicator and visible focus styling.
- [x] Verify contrast on the actual backgrounds. Closed indicates workflow state, not service approval or published knowledge.

### 5. Rename Knowledge to Handbook and add categories

- [x] Rename operator-facing navigation, headings, links, and action copy consistently to **Handbook**. Internal identifiers need not change.
- [x] Give each entry one persisted category. Initial categories: Hours, Tuition, Health, Food, Enrollment, Policies, Contact, and Other.
- [x] Add **All** and category filters with counts, plus category badges on entries. Classify seeded entries explicitly; use Other for uncategorized existing entries.
- [x] Allow category selection when creating and editing an entry. Category changes follow draft/save/publish behavior; unpublished edits never change parent-visible or AI-grounding content.
- [x] Count each operator-visible entry once, including an entry with unpublished edits. Clearly distinguish unpublished drafts from published entries.
- [x] Keep category controls usable on phones through wrapping or an accessible horizontal strip. Filtering never discards an unsaved edit silently.

### 6. Balance parent page spacing

- [x] Center the complete desktop layout, including conversation and side rail, within a shared maximum-width container.
- [x] Use equal outer gutters and align the header, conversation, side rail, and composer to that grid. Preserve intentional left/right message alignment.
- [x] At phone widths, use equal horizontal padding, no horizontal overflow, and safe-area spacing. Verify long messages and expanded source panels.

### 7. Grow multiline inputs with their content

- [x] Parent composer starts compact and grows with wrapping or explicit newlines to approximately four visible text lines. Beyond that, scroll inside the input.
- [x] Shrink after text deletion or successful send. Preserve content and height after failed or uncertain saves.
- [x] Keep Send accessible and reserve enough conversation space so the composer never covers the latest message or its actions.
- [x] Preserve documented desktop Enter/Shift+Enter behavior. Do not submit while an IME composition is active; verify mobile keyboard behavior.
- [x] Audit other multiline fields, including parent follow-ups and staff replies, for the same clipping problem. Apply suitable bounded growth. Handbook policy editors can retain a larger minimum height rather than shrinking to chat size.

### 8. Start a new parent conversation without losing operator history

- [x] Show **Start over** only after the current conversation has a persisted message. Hide it on a fresh or newly restarted conversation.
- [x] Start a new empty conversation within the same demo session. Do not invoke Reset demo, delete old records, create a new demo identity, or replenish usage limits.
- [x] Preserve old messages, inquiries, staff requests, replies, evidence snapshots, Handbook changes, and operator metrics. Group retained history by conversation with timestamps.
- [x] Ground new AI responses only in the new conversation and published Handbook, not previous chat context.
- [x] Retain parent access to earlier staff requests and new staff replies through Your requests or an equivalent history entry. Starting over must not orphan an unresolved request.
- [x] Persist the active conversation across refreshes and perspective switches. Repeated clicks or network retries create only one new conversation.
- [x] Disable restart while a send is pending or delivery is unconfirmed. If unsent text would be discarded, ask before discarding it.
- [x] Explain that Start over begins a new chat and staff can still see previous conversations. Keep Reset demo's separate destructive meaning clear.

Implementation note: current session initialization assumes one conversation per demo session. This is a persistence and context-scoping change, not merely clearing the rendered messages. Plan migration, existing-session compatibility, stale-tab behavior, and request/reply linkage before implementation. An in-flight response must stay attached to its originating conversation.

### 9. Offer five suggested parent questions

- [x] Show five accessible question buttons in the empty conversation, including after Start over:
  1. Are you open on Veterans Day?
  2. What is the tuition for infants?
  3. My child has a fever. Can they come in?
  4. I forgot to pack lunch. Can you provide lunch today, and what is on the menu?
  5. How can I schedule a tour?
- [x] Use **Suggested questions** as the heading. These are curated examples, not measured popularity rankings.
- [x] Selecting a suggestion fills and focuses the composer for review; Send submits through the existing flow. Do not overwrite existing typed text silently.
- [x] Hide the initial list once the conversation begins. Allow long labels to wrap and retain comfortable touch targets.
- [x] Suggestions do not bypass source validation, staff confirmation, usage limits, or retry deduplication. The missing holiday remains a legitimate handoff until staff publishes it.

## Verification required when implemented

- [ ] Check 390px phone, tablet, and desktop layouts; also inspect a narrow 320px viewport for overflow. Include keyboard navigation, visible focus, zoom, and expanded sources.
- [x] Exercise the combined Inbox with every outcome, every request state, direct staff messages, duplicates, and multiple conversations. Verify counts and detail context.
- [x] Verify the metric for 0 eligible inquiries, 5/9 answered, greetings, pending inquiries, retries, and retained history after restart.
- [x] Verify category migration, filtering, counts, draft isolation, explicit publication, and reset behavior.
- [x] Verify Start over with an unresolved request, a later staff reply, refresh, another tab, duplicate restart, and a second isolated demo session. Confirm no usage reset or context leakage.
- [ ] Verify multiline paste, line wrapping, deletion, send, uncertain saves, mobile keyboard, and IME input.
- [ ] Re-run the hosted missing-holiday publication loop and meal-confirmation boundary after these changes. Run appropriate regression tests, lint, typecheck, and production build.
- [x] Record actual results and remaining limitations. Recheck submission materials against final behavior before upload.

## Additional suggestions — optional, not required scope

1. Add Handbook search across titles and policy text, combined with category filters, as in image 1.
2. Show a Needs action badge on Inbox so staff can spot outstanding requests while editing the Handbook.
3. Consider **New chat** instead of **Start over** if testing shows parents interpret Start over as deleting history.

## Delivery guidance

Ship visual changes separately from conversation persistence if needed. Start over and category publication require more care than spacing or labels. Avoid adding unrelated analytics, semantic grouping, notifications, authentication, or redesigning the existing publication workflow. Respect the assignment timebox; document deferred work rather than treating every refinement as a submission blocker.


## Implementation and verification — October 8, 2026

All nine refinements are implemented. Optional search, a cross-page attention badge, and renaming Start over to New chat were not added.

- Operator navigation now has a dedicated Inbox/Handbook row. Inbox includes all outcomes and direct requests, defaults to Needs action, deduplicates linked requests, and groups All by chat. Detail pages retain source snapshots, conversation context, replies, and publication controls. The old Questions URL redirects to All.
- The answer percentage uses the documented denominator. Forwarding a failed AI answer preserves its failed outcome and adds the request link, so staff involvement cannot erase it from the metric.
- Handbook categories are persisted separately for published content and drafts. Seed classification, filters/counts, badges, selection, and unsaved-navigation protection are implemented.
- Parent pages share a centered layout. Textareas grow to four text lines before internal scrolling; policy editors retain six initial lines and a larger cap. Fresh chats show five curated suggestions that fill the composer.
- Start over uses a session-locked compare-and-swap against the active conversation. Duplicate restarts return the existing successor. Requests and retries remain attached to their originating chat. New submissions from stale tabs are rejected with their draft intact. Earlier staff requests and later replies remain accessible. All parent send controls participate in the restart guard, and discarding unsent follow-ups also requires confirmation.
- Applied additive migrations 009 and 010 to the configured database. The latter supports initial conversations seeded by older app instances during rollout. No production application deployment was performed.

Validation:

- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The final build required clearing a generated Turbopack cache that retained a sandbox port-permission error.
- Full regression run: 82 of 83 passed; the remaining test fixture attempted to create a second active conversation, which the new unique constraint correctly forbids. Updated it to use the session's active conversation. The final focused rerun passed all 22 tests across `audit-fixes`, `ui-refinement`, `copy-and-controls`, and `inbox-and-questions`. All 83 tests are covered by the passing full-run results plus that corrected rerun.
- Used bundled Playwright because the Browser plugin was not available. Tested `http://localhost:3001` with a real database, at 320, 390, 768, and 1440px. Verified page identity, meaningful content, absence of framework overlays, and no browser runtime errors. Screenshots were inspected outside the repository.
- Browser interactions verified suggestion fill/focus, grow/shrink (42px to 120px), mobile Enter/newline and IME handling, restart and refresh, retained requests and subsequent staff replies, stale-tab rejection, cancellation of unsent-follow-up discard, disabling restart during handoff, mobile detail/back preserving All, category filtering and draft persistence, unsaved category-navigation cancellation, and legacy Questions redirect. No horizontal overflow in tested layouts. Status filter contrast against the rendered white background: Needs action 6.27:1, Open 6.88:1, Closed 6.94:1.
- The real-model holiday loop passed through the 390px local UI: initial handoff, staff reply, still a handoff before publication, publish the holiday policy, then a sourced answer citing the new text. Expanded sources stayed within the viewport. The spare-lunch/menu question offered a handoff with no staff request automatically created.

Remaining verification: deploy and repeat the hosted loop; physical phone/IME keyboard and browser zoom were not manually tested. Mobile input was checked through browser emulation and keyboard-event checks. These are verification limits, not deferred implementation of the nine requested changes.
