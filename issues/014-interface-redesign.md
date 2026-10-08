# Redesign the interface for phone and desktop

Type: AFK

Budget: 60 of 180 minutes (post-audit slack). Cut line: keep (a) tokens + parent conversation and (c) desktop layouts; (b) staff screens may ship with the new tokens only; (d) motion may be reduced to the rise and the source opening.

## Parent PRD

`issues/prd.md`

## What to build

Replace the card-in-card look with one calm surface, and give desktop its own layout instead of a phone column with wide margins. The concept canvas "Front Desk Redesign" (six boards) is the reference; this ticket turns it into code without changing any behavior, data, or copy rule from issues 001–013.

(a) System. Ground #FBFAF7, ink #16181D, one green #1E6E5A for the assistant and anything it cites, amber #B7791F for people, red #B42318 for sensitive. Geist for all text, Geist Mono for timestamps, counts and ids. No text under 12px, eyebrows at 11px 600 only. Buttons are pills; primary names its recipient.
(b) Screens. Parent conversation: answers are plain text with a "Source" row that opens in place; only the parent gets a bubble; handoff offers are two pills; the composer is a pill with one arrow button. Request card becomes a three-step timeline (Known policy / Still needs staff / Reply from staff) with status as dot + two words. Pending turn: bubble rises, three pulsing dots, shimmer lines, caption that the question is saved. Staff inbox: filter chips (Needs action / Open / All), rows with a colored rail, policy and knowledge tags, match count in mono. Staff request: question as title, collapsed "What the family saw before asking", two fact tiles, thread, reply panel with outcome chips and one primary Send. Knowledge editor: same tokens, current text beside the draft.
(c) Desktop (≥1024px). Parent: conversation column (max 680px) plus a sticky right rail holding hours/contact, "Your requests" with status dots, and the opened source text (a source row opens in the rail instead of inline). Staff: master-detail, inbox list 400px left and the request on the right with the reply panel inline; Knowledge: entry list left, editor right. Tablet (768–1023px) keeps the phone layout at a wider measure. Width is used, not padded.
(d) Motion. New turn rises 220ms cubic-bezier(0.2,0.8,0.2,1), reply header 120ms later; waiting dots 1.1s stagger 150ms, shimmer 1.4s linear, caption changes after 8s; source opens via grid-template-rows 0fr→1fr in 240ms with the chevron rotating; staff reply sheet on phone springs 420ms cubic-bezier(0.32,0.72,0,1); nothing over 420ms; `prefers-reduced-motion` makes every animation an instant state change.

## Acceptance criteria

- [x] Tokens, type, and button styles are defined once in `globals.css`; no component carries its own palette; Geist loads via `next/font`.
- [x] Parent conversation, pending turn, request timeline, staff inbox, staff request, and knowledge editor match the canvas boards at 390px.
- [x] At ≥1024px the parent view shows the conversation column plus a right rail (contact, your requests, opened source) and the staff views are master-detail; nothing is a centered phone column with margins.
- [x] Motion follows (d) and collapses to instant state under `prefers-reduced-motion`.
- [x] Every behavior, data attribute, copy rule, and test from issues 001–013 still holds: 70 tests green, lint, typecheck, build clean; the hosted loop (I03 → reply → publish → answer) re-checked at phone and desktop widths.

## Blocked by

- Blocked by `issues/013-perceived-latency.md`

## User stories addressed

- User story 1, 2, 9, 10, 15 (quick, clear, trustworthy; copy never implies a person or a promise)
- User story 36

## Results

- System (`globals.css`, `layout.tsx`): tokens in `@theme` (ground, ink 1–3, brand green, person amber, alert red, soft tints, shadows, two easings); Geist and Geist Mono via `next/font/google` as CSS variables; component classes (`card`, `pill`, `chip`, `btn-*`, `field`, `eyebrow`, `measure`) in `@layer components` so utilities can override them; keyframes `rise`, `shimmer`, `pulse-dot`, `sheet-up`, the `.reveal` grid-rows open with `@starting-style`, and a `prefers-reduced-motion` block that turns every animation and transition off. No component carries a palette.
- Parent: `MessageBubble` gives only the parent a bubble; assistant turns are plain 17px text under a green dot "AI assistant · automated"; staff turns are amber and named. `Sources` are rows that open in place to the exact cited text with the published date in mono. `HandoffOffer` and `AnswerFailure` are two pills ("Send to school staff", "Browse policies") under the answer. `RequestCard` is a three-step timeline with the status pill as dot + two words. `Composer` is a pill with one arrow button (or "Send to school staff" when AI is off), hint line under it, optimistic `PendingTurn` with pulsing dots and shimmer. A request card now sits under the assistant answer that offered the handoff, so the thread reads question → answer → request.
- Staff: `InboxList` with filter chips as links (`?filter=open|action|all`, default Open), rows with a colored rail (amber review, green waiting on family, red sensitive, grey closed), policy and knowledge tags, match count in mono, the viewed request always kept in the list. Request page: question as title, collapsed "What the family saw before asking", two fact tiles (Known policy / Knowledge), thread, reply panel with outcome chips and one amber Send. Knowledge editor and reset restyled with the tokens.
- Desktop (≥1024px): parent and policies pages use a 680px conversation column plus a sticky 320px rail (hours/contact, "Your requests" with status dots and anchors, session note); inbox is list (400px) + question history; a request is list + detail with the reply panel inline; Knowledge is entry list + editor. Tablet keeps the phone layout at a wider measure. Header wraps to two rows under 640px.
- Motion: rise 220ms ease-out-soft (reply header 120ms later), dots 1.1s staggered 150ms, shimmer 1.4s, source and policy rows open via grid rows in 240ms with the chevron rotating, phone reply sheet 420ms on the sheet curve (static on desktop). Nothing over 420ms.
- Verification: 70 tests green (one assertion loosened to case-insensitive "automated"), lint, typecheck, build clean. Rendered screenshots at 390px and 1360px for parent, inbox, request, and knowledge pages from a seeded local session; fixed from them: header squeezing the center name on phone, the back button showing on desktop (layer precedence), the viewed request disappearing under the default filter, default filter now Open.
- Not changed: data, server actions, API, copy rules from 001–013, test ids and data attributes.
