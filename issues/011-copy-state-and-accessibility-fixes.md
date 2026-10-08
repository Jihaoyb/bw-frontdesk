# Make copy, card state, and controls honest and usable

Type: AFK

Budget: 20 of 180 minutes (post-audit slack). Cut line: keep (a) and (b); (c) through (e) may ship as copy and ordering only.

## Parent PRD

`issues/prd.md`

## What to build

A UX review after issue 009 found copy and control problems that sit inside the PRD's demo model (stories 29–32 stay as they are). Fix them without changing the product shape:

(a) Name the recipient. Automated messages are labeled as the AI assistant, never as a person. The composer's primary action says who gets the message ("Ask AI" / "Send to school staff"), and parent-facing copy says staff messaging is asynchronous.
(b) State-aware request cards. A closed request does not say "Still needs staff". A request with no linked policy says "No policy attached", not "No published policy covers this yet"; a confirmed knowledge gap is only claimed once staff open a draft.
(c) Staff reply controls. One primary "Send reply"; the resolution choice (keep open / needs the family's reply / close) is a labeled option, not three competing buttons; the knowledge-draft action stays separate. Helper text matches the chosen action.
(d) Publication review cues. The editor keeps the current published text visible beside the draft, warns before leaving with unsaved edits, and reminds the operator to remove family-specific details before publishing.
(e) Privacy and session copy. The parent view states that the conversation lives in this browser's demo session, that staff in this demo can read messages sent to them, and what Reset deletes.
(f) Accessibility basics. Visible focus ring on the composer and reply fields, secondary text at readable contrast, Enter sends only on desktop with Shift+Enter for newlines, IME composition never submits, and controls meet a 44px touch target.

## Acceptance criteria

- [x] No parent-facing copy presents the automated assistant as a person; the composer's primary button names the recipient and the asynchronous nature of staff messaging is stated once on the parent view.
- [x] Request cards never show "Still needs staff" on a closed request; the known-policy area distinguishes "No policy attached" from a staff-confirmed gap.
- [x] The staff reply panel has one primary send action with an explicit resolution choice; the helper text changes with the choice; the knowledge-draft action remains separate.
- [x] The knowledge editor warns before navigation with unsaved edits and shows a family-specific-details reminder next to Publish.
- [x] The parent view explains session persistence, staff visibility, and what Reset removes, without implying server-side expiry.
- [x] Focus is visible on all text fields, Enter/Shift+Enter behavior is as specified and IME-safe, small text meets AA contrast, and interactive controls are at least 44px tall on phones.
- [x] Tests cover the state-aware card copy and the composer key handling; existing copy tests still pass.

## Blocked by

- Blocked by `issues/009-hosted-verification-and-submission-materials.md`

## User stories addressed

- User story 9, 10, 15 (copy that never implies live staff, approval, or a human responder)
- User story 36 (submission quality)

## Results

- (a) `MessageBubble` labels automated turns "AI assistant" with an "Automated" pill; the composer's primary button reads "Ask AI" (or "Send to school staff" when AI is off or exhausted) and the secondary link "Send to school staff"; the welcome card states that staff messaging is not live chat. The handoff offer says "school staff".
- (b) `RequestCard` label follows status: "Still needs staff" while open, "Your request" on needs-your-reply, "What you asked" when closed. No linked policy reads "No policy attached. Staff decide whether a knowledge update is needed." Sensitive copy unchanged.
- (c) `StaffReplyPanel`: one primary "Send reply" plus an "After sending" radio (Keep it open / Ask the family to reply / Close the request) with helper text per choice; "Send & open knowledge draft" stays separate. The three competing send buttons are gone.
- (d) `KnowledgeEditor`: reminder above Publish about family-specific details; `UnsavedGuard` adds a beforeunload warning while a form has unsaved edits (cleared on submit). The "Currently published" box from issue 006 remains beside the draft.
- (e) Parent view footer (`data-session-note`): conversation lives in this browser's demo session, does not expire on its own, staff in this demo can read messages sent to them, Reset deletes conversation, requests and published updates.
- (f) `globals.css`: buttons and links are 44px min-height with a visible focus-visible ring; fields focus with a brand ring; eyebrow text darkened to stone-600 (AA on white); composer card shows a focus-within ring. `src/lib/compose-keys.ts`: Enter sends only with a fine pointer, Shift+Enter inserts a newline, IME composition (isComposing / keyCode 229) never submits; the hint "Enter sends · Shift+Enter for a new line" shows on desktop only.
- Tests: `tests/copy-and-controls.test.ts` (card labels per state, no-policy copy, AI assistant naming, Enter rules). Suite 70 tests; lint, typecheck, build clean. Local smoke confirmed the new copy on parent, request and editor pages.
