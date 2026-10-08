# 020 — Keep operator content visible during navigation

Status: Implemented locally; hosted verification pending.

## Problem and cause

Selecting an Inbox filter, request, or Handbook category could replace the main section with loading skeletons. This was a Next.js client navigation, not a browser document reload. The operator route-level `loading.tsx` boundaries replaced both columns while dynamic server data loaded. A 30-second dynamic router cache masked this on repeated clicks, explaining the intermittent behavior.

## Changes

- Remove the whole-section loading boundaries for Inbox, request detail, and Handbook. React transitions retain the current screen until the destination is ready.
- Add a shared navigation link using Next.js `useLinkStatus`. A screen-reader-only status communicates pending navigation without shifting layout. The visible green indicator was removed at the user's request.
- Use it for Inbox filters/rows, section tabs, Handbook categories, and perspective switches. Links retain native URL, keyboard, and new-tab behavior.
- Add a decorative `>` after Parent View and Operator View; accessible link names remain unchanged.
- Keep existing caching and data invalidation. This fix does not depend on extending the cache or showing stale data indefinitely.

## Validation

- Local Chromium via bundled Playwright at 1440×1000 and 390×900.
- Delayed React server responses by 1.2 seconds to expose pending behavior.
- Checked filter → request → Handbook → category navigation and request navigation after waiting beyond the 30-second cache window.
- Existing Inbox content remained visible during pending navigation; no Inbox/request/Handbook loading skeleton appeared.
- A document marker survived navigation and only the initial document request occurred.
- Both perspective buttons show arrows and retain correct destinations; no mobile horizontal overflow or page runtime errors.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed.
- Browser checks passed for both cold navigation and expired-cache navigation. Screenshot: `/tmp/021-navigation.png`.

Initial direct visits still wait for server-rendered content. Parent route loading screens are unchanged. No deployment performed.
