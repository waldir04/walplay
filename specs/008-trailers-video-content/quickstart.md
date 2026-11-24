# Quickstart: Trailers and Video Content

**Feature**: `008-trailers-video-content` | **Date**: 2026-11-24

This guide validates the trailer experience end to end. It is a run and validation guide, not an
implementation guide. Shapes and invariants live in [contracts/](./contracts/) and
[data-model.md](./data-model.md).

> The capability ships disabled. Enable both flags locally only for validation. Enabling it in a shared
> environment requires the Open Decisions and document amendments recorded in [plan.md](./plan.md) to be
> resolved first.

## Prerequisites

- Node.js 22.12+ (pinned by both application manifests).
- Repository dependencies installed.
- A TMDB API read access token for manual provider checks. Automated tests never call TMDB or YouTube.
- A movie and a TV show whose provider inventory contains at least one YouTube trailer. Record their
  opaque Walplay addresses; do not assume a fixed title keeps its videos.
- A title with no eligible videos for the empty state.
- A title with multiple videos in mixed types and languages for ordering, expansion, and selection.
- Browser devtools with request blocking for the privacy and unavailable checks.

## Local environment

Backend (`backend/.env.local`), in addition to the existing TMDB token:

```env
NODE_ENV=development
PORT=4000
CORS_ALLOWED_ORIGINS=http://localhost:5173
TMDB_ACCESS_TOKEN=<your TMDB read access token>

TRAILERS_ENABLED=true
TRAILERS_CACHE_TTL_SECONDS=86400
TRAILERS_CACHE_STALE_SECONDS=604800
TRAILERS_CACHE_MAX_ENTRIES=500
TRAILERS_MAX_INVENTORY=24
TRAILERS_EMBED_HOSTS=www.youtube-nocookie.com
TRAILERS_EXTERNAL_HOSTS=www.youtube.com
```

Frontend (`frontend/.env.local`):

```env
VITE_APP_ENV=local
VITE_APP_VERSION=0.0.0
VITE_API_BASE_URL=http://localhost:4000
VITE_TRAILERS_ENABLED=true
```

Do not commit real tokens. Both flags and the host allowlists default to `false`/platform defaults in
`.env.example`.

## Run

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

Open a detail page through the application's own navigation (not a hand-written API URL).

## Automated checks

```bash
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run test

npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build
```

Expected: zero lint warnings, zero type errors, all tests passing, zero unexpected console warnings,
no pending timers or real network calls, and coverage at or above the project thresholds.

## API checks

With a valid opaque `itemId` from a detail address:

```bash
curl -s "http://localhost:4000/api/catalog/movie/titles/<itemId>/videos" | jq
curl -s "http://localhost:4000/api/catalog/tv/titles/<itemId>/videos" | jq
```

Verify:

- `data.state` is `available` or `no-videos`.
- Every video has one of the two URL fields and no stream, country, size, or provider record id.
- `meta.lastUpdatedAt` is current and not in the future.
- `Cache-Control: no-store` is present on the response.
- An unknown query parameter returns `400 VALIDATION_ERROR`.
- A `mediaType` that disagrees with the item id returns `404 CATALOG_NOT_FOUND`.
- With `TRAILERS_ENABLED=false`, the path returns `404 ROUTE_NOT_FOUND` and no provider call occurs.

## Validation scenarios

### 1. Embedded playback (US1, SC-001, SC-008)

1. Open a movie detail page with an embeddable official trailer.
2. Confirm the labeled section is present, the official trailer is selected first, and no player has
   loaded. Confirm no separate legacy "Watch trailer" external link remains in the action area.
3. Confirm the detail page remains usable and no layout shift occurs when the player appears.
4. Activate the selected video. Confirm exactly one 16:9 player loads in the reserved area and the
   platform's controls are present and operable.
5. Repeat on a TV detail page.
6. Tab to the player. Confirm the platform's controls receive focus and remain operable.
7. Reload the page and repeat without interacting. Confirm no playback starts.

### 2. Identity, type, and mode (US2, SC-002, SC-017, SC-018)

1. Open an inventory containing a trailer, teaser, clip, and featurette.
2. Confirm each row states localized type, provider title, platform, language when supplied, official
   status only when explicitly marked, and whether it plays inside Walplay or opens an external
   destination.
3. Confirm a record without the official flag shows no official claim.
4. Switch to a title whose only eligible video is not in the interface language. Confirm it is listed,
   labeled, and not presented as localized.
5. Ask a reviewer to identify the playback mode for each item; the expected result is correct on the
   first attempt.

### 3. Ordering, selection, expansion (US3)

1. Confirm the official trailer is first and selected without playing.
2. Confirm two official trailers in different languages prefer the interface language and the other
   remains listed and labeled.
3. Choose a different video. Confirm the current playback stops, the previous player unmounts, the new
   identity appears, and exactly one new player loads.
4. Click several videos rapidly. Confirm only the newest choice is shown and only one frame exists.
5. Change the interface language while a video plays. Confirm labels and order update on the next
   render, the selection stays, and playback is not restarted or interrupted.
6. If more than six eligible videos exist (the API caps at 24), confirm six are visible and the
   expansion reveals the rest without a new network request.
7. Navigate to another title before the inventory resolves. Confirm the earlier response never alters
   the new title's section.

### 4. Unavailable and recovery (US4, SC-005, SC-006, SC-019)

Use devtools request blocking or an owner-disabled video, one case at a time:

1. Block `www.youtube-nocookie.com` and activate. Confirm the timeout produces the localized
   unavailable state, the frame is unmounted, and the external option remains adjacent.
2. Try a private or deleted video. Confirm the platform's own message is not contradicted and the
   external option is present.
3. Try an age-restricted or sign-in-restricted video. Confirm Walplay does not claim the video is
   deleted and never suggests bypassing the restriction.
4. Try a region-restricted video. Confirm the copy says the external destination may be restricted too.
5. Confirm other listed videos remain selectable and the rest of the detail page is unaffected.
6. Confirm no raw player error code or platform status appears in the page copy.

### 5. Privacy (US5, SC-004, SC-016)

1. Open a clean browser profile with devtools recording.
2. Load a detail page with the section.
3. Before any activation, confirm zero requests to YouTube or Google asset hosts, zero cookies, zero
   local/session storage entries for the platform, no iframe, and no preconnect/prefetch/preload.
4. Confirm the cover names the platform, states that activation loads third-party content, and links
   to the terms and privacy policy adjacent to the list.
5. Activate and confirm exactly one request to the configured privacy-enhanced host with no Walplay
   identifier, session token, analytics, or advertising parameter.
6. Ask a reviewer what happens on activation; the expected answer is that content from another company
   loads.

### 6. Accessibility and responsiveness (US6, SC-007, SC-009, SC-010)

1. Keyboard-only: tab through the entry point, list, activation, external option, and expansion in a
   logical order with visible focus. Confirm no trap before, during, or after player loading.
2. Screen reader: confirm the region and list are announced, the iframe name contains the title and
   platform, and each state change is announced once without duplicates.
3. Check 360, 768, 1024, and 1440 px widths and 200 % zoom. Confirm no horizontal page scrolling,
   clipped controls, overlapping content, or distorted video.
4. At 360 px, confirm no undersized player is rendered; the section explains the width limit and offers
   the external destination (SC-010).
5. Enable reduced motion. Confirm no attention-seeking animation.
6. Run axe on loading, available, no-video, error, playing, and unavailable states; confirm zero
   critical violations.

### 7. Empty, error, and stale (US7, SC-012, SC-014, SC-015)

1. Open a title with an empty inventory. Confirm the labeled section states that no trailer information
   is available, with no frame, play control, disabled control, spinner, or future promise.
2. Stop the backend or force a 5xx. Confirm a localized inline error with retry appears, the detail
   page and personal-list actions still work, and retry is single-flight.
3. Confirm the error state is visually and semantically distinguishable from the no-video state.
4. With a populated cache, make the provider fail and confirm the list is labeled last checked and not
   presented as current.
5. Advance the clock past seven days in a test (do not wait) and confirm the service returns the error
   state instead of stale data.

### 8. Localization (SC-011)

1. Switch between English and Spanish. Confirm all Walplay copy, type labels, state messages,
   disclosures, and announcements are localized without a page reload.
2. Confirm provider titles remain exactly as supplied and are not translated.
3. Confirm dates and language names use the selected locale.
4. Confirm no raw translation key appears.

### 9. Capability gating (FR-007)

1. Set `TRAILERS_ENABLED=false` and `VITE_TRAILERS_ENABLED=false`. Confirm no trailer section, entry
   point, placeholder, or "coming soon" copy exists, and the rest of the detail page is unchanged.
2. Set only the frontend flag on. Confirm the section renders its localized error state with retry (the
   route is absent), the rest of the page works, and no provider call is possible.
3. Set only the backend flag on. Confirm the UI is unchanged and no section renders.

### 10. Scope audit (SC-013)

Review the implementation diff and the browser network log:

- no download, proxy, mirror, transcoding, scraping, probing, DRM bypass, or access-control bypass code;
- no stream URL, media file, or provider record id in code, API responses, or logs;
- no new dependency, player SDK, or package;
- only the configured privacy-enhanced embed host and canonical external host are referenced;
- no visitor identifier, token, analytics, advertising, or personalization parameter in the frame URL;
- both capability flags default to `false` and `.env.example` is current.

## What not to test manually

Do not attempt to download, probe, or inspect video files or player internals, construct alternate
player URLs, bypass age/region/sign-in/owner restrictions, or add undocumented parameters. The design
detects no cause beyond the load outcome, and those actions violate the specification.
