# Quickstart: Entertainment Details

**Feature**: `004-entertainment-details` | **Date**: 2026-11-22

This guide validates the completed detail experience end to end. It is a run/validation guide, not
an implementation guide. Contracts and invariants live in
[contracts/](./contracts/) and [data-model.md](./data-model.md).

## Prerequisites

- Node.js 22 LTS (pinned by the repository).
- A TMDB API read access token for manual provider checks. Automated tests never call TMDB.
- Repository dependencies installed.
- Backend environment file with at least:

```env
NODE_ENV=development
PORT=4000
TMDB_ACCESS_TOKEN=<your TMDB v3 read access token>
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

- Frontend environment with the API base URL:

```env
VITE_APP_ENV=local
VITE_API_BASE_URL=http://localhost:4000
```

Refer to `.env.example` for every documented variable. Do not commit real tokens.

## Run

From the repository root:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

Open `http://localhost:5173`.

## Quality gates

Run the same contract in each application directory:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build

npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run build
```

Expected: all pass with zero unexpected warnings. Coverage is at least 80 % globally and about 90 %
for detail mapping, normalization, state mapping, and season selection.

## Automated validation

Provider traffic is mocked in both suites. Useful focused commands (run from each application):

```bash
npm --prefix backend run test -- detail
npm --prefix frontend run test -- title-detail
npm --prefix frontend run test -- season
```

The suites must cover:

- Every optional metadata class: overview, rating, popularity, status, artwork, runtime, dates,
  networks, and credits.
- Every secondary surface: success, empty, stale, failure, retry.
- Season resolution: valid, missing, malformed, out-of-range, not supplied, specials.
- Not-found versus recoverable error.
- Language switching with a preserved valid season.
- Rapid detail navigation and superseded responses.
- Axe checks on loaded, loading, error, and not-found states.
- 320/360/768/1024/1440 px and 200 % zoom contracts.

## Manual scenarios

Use a known complete movie, a known complete multi-season TV show, and titles with deliberately
incomplete metadata (for example an obscure title with no poster or overview). Record the addresses
used so the same sample can be repeated. Validate SC-003 with a fixed sample of at least 30 titles
spanning complete and incomplete metadata.

### US1 — Read the essential information

1. Open Browse, then activate a movie card.
   - Detail opens inside the shell.
   - The content type is stated in text as a movie.
   - Title, date, overview, genres, duration, poster, rating (when valid), and localized status
     are consistent; an original title appears only when it differs.
   - The document title reads the localized title and the localized content type.
   - TMDB popularity, when positive, appears only in the secondary provider area with the
     provider-values note and attribution; it never appears among primary facts.
   - Provider attribution is visible without interaction in loaded and error states; only the
     approved link treatment is present (no invented link).
2. Use the return action, then browser back/forward.
   - The originating catalog context is restored.
3. Open Search, run a query, and open a TV result.
   - The detail states "TV show" in text.
   - Returning restores the active search and query.
4. Copy each detail address, open it in a new tab, and reload.
   - The same title and type resolve with no prior navigation.
5. Open direct addresses for the same numeric provider id as a movie and as a TV show (use two
   different titles that happen to share an id).
   - Each address resolves only its own type; no cross-type substitution occurs.

### US2 — Trust what the page shows

For each incomplete sample, verify:

1. No overview: no overview block, no empty region, no invented summary.
2. Runtime zero, negative, missing, or absurd: no duration, no zero or dash.
3. Rating zero, zero votes, or out of range: no rating, no substitute from popularity.
4. No poster and no backdrop: neutral fallback names the title and type; no broken image or layout
   shift.
5. Only a minimal identity: the page remains usable, and no section claims the missing information
   does not exist.
6. Whitespace, empty strings, and recognizable placeholder values are not displayed in any field.
7. Popularity is zero, negative, or unavailable: nothing appears in the provider metadata area.
8. Provider status is unknown: no status is shown and no raw provider status string appears.

### US3 — Seasons and episodes

1. Open a TV show with several seasons.
   - Regular seasons ascend by number; specials appear last and are labeled as specials.
   - The first regular season is selected without an extra interaction.
   - Provider-reported season and episode counts are labeled as reported by TMDB, not as Walplay
     calculations.
   - Episodes show number, name, date, duration, overview, still, and rating when valid.
2. Select another season.
   - Episodes change; the title, actions, credits, and related sections remain.
   - The address updates with `?season=`; history is replaced.
   - Browser back returns to the origin, not the previous season.
3. Open a season address directly and reload.
   - That season is selected and its episodes resolve.
4. Try `?season=abc`, `?season=999`, and a season the provider no longer lists.
   - The first regular season is selected with no error page.
5. Open a movie detail.
   - No seasons or episodes section appears.
6. Find a season with no episodes.
   - A localized empty message appears inside the episode area; no fabricated episode.
7. Open a show with a very large season or episode list.
   - Seasons remain reachable without clipping; episodes are not truncated and remain scannable.

### US4 — Cast and crew

1. Open a title with complete credits.
   - At most 10 cast in provider order, with character when known.
   - At most 6 key crew with localized roles; unknown jobs are absent.
2. Open a title with no usable credits.
   - No cast or crew section appears; the rest of the page is unaffected.
3. Inspect a credit without a profile image.
   - A neutral fallback shows the name; no broken image or layout shift. A supplied profile renders
     at the approved `w185` size with reserved dimensions.

### US5 — Related titles

1. Open a movie that belongs to a collection and has similar titles.
   - Two separate labeled sections appear; neither is described as a recommendation.
   - Each is bounded and preserves provider order.
   - Related cards show title, content type, year, genres, and artwork; no rating appears without
     visible TMDB attribution.
   - Activating an item opens the matching type-specific detail page.
2. Open a title with no related data.
   - No related area appears.
3. Simulate a related failure (for example block one API path in devtools).
   - Only that section shows an inline error and retry; the rest of the page remains usable.
   - Retry succeeds without reloading the page or duplicating the request.

### US6 — Entry points

Production defaults disable every entry point. Verify:

1. No availability control, teaser, disabled control, or "coming soon" text appears.
2. No personal-list or favorites control appears.
3. No trailer control appears while `DETAIL_CAPABILITIES.trailer` is `false`.
4. In a test-only render with trailer enabled, a validated reference renders an external link with a
   visible label, external-navigation text, keyboard operation, and no in-page playback. Returning
   preserves the detail address and season.

### US7 — Devices, zoom, and assistive technology

1. At 320, 360, 768, 1024, and 1440 px, verify no horizontal page scrolling and no clipped or overlapping
   content.
2. At 200 % zoom, verify text and controls remain readable and operable.
3. With keyboard only, reach every control in logical order with a visible focus indicator: return
   action, overview expand, season controls, related titles, retries, and any enabled trailer link.
4. With a screen reader:
   - exactly one `h1`
   - section headings and lists are announced correctly
   - the content type, rating source, selected season, and entry-point states are understandable in
     text
   - a season change is announced once
   - loading and errors are announced without duplicates
   - navigating from a card or search result moves focus to the primary heading and announces once
5. Enable reduced motion; verify no essential information depends on animation.
6. Confirm the document language and localized document title follow the active locale.

### Language and resilience

1. Switch English ↔ Spanish on a loaded detail.
   - Interface copy, dates, counts, durations, and labels update.
   - Provider metadata is re-requested in the new language; the title and a still-valid season are
     preserved.
2. Stop the backend while a detail is loaded, then retry a secondary surface.
   - A stale or cached label with a last-update time appears when data is available; otherwise an
     inline or page-level localized error with retry appears.
   - No raw provider error, status code, or identifier is shown.
3. Open a detail while offline.
   - A localized unavailable state with retry appears; any cached data is labeled stale.
4. Open several details rapidly.
   - Only the newest title updates the page and announcements.
5. Trigger a single secondary failure and retry it.
   - Only that surface is re-requested; core and other sections are not refetched, and repeated
     activation while pending does not duplicate the request.
6. Trigger a page-level error and a not-found state.
   - Language switching and primary navigation remain usable, and the two states stay visually and
     semantically distinct.

## API smoke checks

With the backend running:

`MOVIE_ID` and `TV_ID` are the opaque `itemId` tokens extracted from catalog card links or detail
addresses, not TMDB numeric identifiers.

```bash
curl -s "$API/api/catalog/movie/titles/$MOVIE_ID/detail?language=en" | jq
curl -s "$API/api/catalog/movie/titles/$MOVIE_ID/credits?language=en" | jq
curl -s "$API/api/catalog/movie/titles/$MOVIE_ID/similar?language=en" | jq
curl -s "$API/api/catalog/movie/titles/$MOVIE_ID/collection?language=en" | jq
curl -s "$API/api/catalog/tv/titles/$TV_ID/seasons/1?language=es" | jq
```

Expected:

- `Cache-Control: no-store` and `X-Request-Id` are present.
- Responses use `{ data, meta }`; detail metadata includes `stale`, `source`, and `lastUpdatedAt`.
- No provider field names, provider ids, or raw provider messages appear.
- Invalid `language`, malformed `itemId`, or an out-of-range season returns the documented error
  envelope and status.
- A path `mediaType` that disagrees with the encoded item identity returns `CATALOG_NOT_FOUND`.
- A movie season request and a TV child request for a movie return the documented not-found code.
- A provider 404 on credits, similar, or collection returns an empty successful surface, not a
  missing title.
- A missing season returns `DETAIL_SEASON_NOT_FOUND`, not a generic title not-found.

## Expected outcomes

- Every user story passes its independent test.
- Omitted data never renders as zero, dash, N/A, "Unknown", or an empty section.
- Status is localized or omitted, popularity is source-labeled and secondary, and related cards
  never show an unattributed rating.
- Core and secondary failures are isolated and retryable without duplicate requests.
- Season selection is address-driven, replaces history, and preserves origin return.
- Both locales are complete, and document language/title follow the active locale.
- No unexpected test warnings and all quality gates pass.
