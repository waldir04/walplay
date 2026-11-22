# Quickstart Validation: Entertainment Catalog

**Feature**: `002-entertainment-catalog` | **Date**: 2026-11-22

This guide proves the catalog works end to end. It references the contracts and data model instead of
restating their details, and it contains no implementation code.

Related artifacts:

- [spec.md](./spec.md) — requirements and acceptance scenarios
- [plan.md](./plan.md) — architecture, constitution gates, risks, and testing strategy
- [data-model.md](./data-model.md) — entities, validation, and state machines
- [contracts/catalog-api.md](./contracts/catalog-api.md) — backend HTTP contract
- [contracts/routes.md](./contracts/routes.md) — frontend route and navigation contract
- [contracts/provider-boundary.md](./contracts/provider-boundary.md) — adapter, cache, and error contract
- [contracts/i18n-resources.md](./contracts/i18n-resources.md) — translation keys and provider languages

## Prerequisites

| Requirement | Value |
|---|---|
| Node.js | 22 LTS, pinned by `frontend/.nvmrc` and `backend/.nvmrc` |
| Package manager | `npm` with committed lockfiles in both applications |
| TMDB access | A server-side bearer access token approved for development use |
| Browser | Latest two major versions of a current desktop or mobile browser |
| Screen reader | VoiceOver, NVDA, or equivalent for the manual accessibility pass |
| Network | Internet access only for the live-provider smoke check; all automated tests are offline |

## Setup

### Backend

```bash
cd backend
npm ci
cp .env.example .env.local
```

`.env.local` must define at least:

- `TMDB_ACCESS_TOKEN` — server-side only; never committed, never exposed to the frontend.
- `CORS_ALLOWED_ORIGINS` — the local frontend origin, for example `http://localhost:5173`.
- Optional overrides are documented in [data-model.md](./data-model.md#12-configuration-inventory).

The application must fail fast with a safe developer message when a required backend value is missing
or invalid.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
```

`.env.local` must define:

- `VITE_APP_ENV` — `local` is the safe default.
- `VITE_API_BASE_URL` — the backend origin, for example `http://localhost:4000`.

No provider token, provider base URL, timeout, or TTL appears in a `VITE_*` variable.

## Run

Terminal 1:

```bash
cd backend && npm run dev
```

Terminal 2:

```bash
cd frontend && npm run dev
```

Quality scripts, runnable from each application directory:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Root pre-push runs the same contract for both applications, and CI's existing backend detection
activates the backend job once `backend/` exists (see `docs/ci.md`).

## Automated validation

| Command | Expected outcome |
|---|---|
| `backend npm run lint` | Exit 0; zero warnings; no `any`; no unchecked env access |
| `backend npm run typecheck` | Exit 0 with all strict flags |
| `backend npm run test` | Exit 0; unit and route-integration tests pass; no real provider calls; no unexpected warnings |
| `backend npm run build` | Exit 0; production server output |
| `frontend npm run lint` | Exit 0; zero warnings; arrow functions; token-only styling; no direct env access outside config |
| `frontend npm run typecheck` | Exit 0 with all strict flags |
| `frontend npm run test` | Exit 0; no unexpected `console.warn`/`console.error`, act warnings, or unhandled rejections; coverage ≥ 80% global and ≥ 90% for catalog mapping, cache, and error classification |
| `frontend npm run build` | Exit 0; one chunk per catalog page; no provider token or provider error text in output |

Required test coverage by surface:

- Backend: env validation, TMDB schemas/mapper, opaque ID codec, client timeout/retry/429, cache
  fresh/stale/single-flight/key isolation, service mapping, route envelope/CORS/status behavior.
- Frontend: API schema validation, error-code localization, card and fallback rules, section
  isolation/retry/empty/stale, category append/dedupe/end/error, detail from card and direct lookup,
  routing/back/forward, i18n parity and language reset, axe and keyboard journeys.

## Scenario 1 — Browse movies and TV shows (US1)

1. Open `/`, verify the Home surface offers a working entry point to Browse, then activate Browse in
   the primary navigation.
2. Observe the address, selected media type, and section order.
3. Switch to TV Shows and back.
4. Use browser Back and Forward.
5. Open `/browse/movies` and `/browse/tv-shows` directly in new tabs.

**Expected**:

- `/browse` replaces to `/browse/movies`; Movies is selected; Browse stays marked active on every
  nested catalog address.
- Home replaces the outdated "nothing to browse" placeholder with a working Browse entry and gains no
  other catalog functionality.
- Exactly one `h1`; trending, popular, and top rated appear in that order; no unsupported section
  placeholder appears.
- TV content fully replaces movie content; no movie item remains; address and selection agree.
- Back/forward restore the matching type and content with no cross-type items.
- Direct type addresses render inside the shell with no initial focus move.
- Provider order is unchanged; no Walplay ranking or popularity explanation is shown.
- If trending is not paginated, it has no "See all".

## Scenario 2 — Category list and title navigation (US2)

1. Use "See all" on Popular and Top Rated for each media type.
2. Open a category address directly in a new tab.
3. Activate a card, then use the detail return action.
4. Open a detail address directly.
5. Open an unknown item address and an unknown category slug.
6. Switch media type while on a category.

**Expected**:

- Category opens at page 1 in provider order with a category heading and a stable address.
- Direct category open restores no previous pages and shows only the correct type/category.
- Card activation opens a unique type-specific detail address; the detail shows title, media type,
  available card metadata, the localized "complete details not yet available" statement,
  attribution, and a working return.
- A directly opened detail resolves inside the shell using only the minimal lookup; missing metadata
  is not fabricated.
- Unknown title shows a localized not-found state inside the shell with a working return and no
  technical detail.
- Media switch from a category opens the matching category for the other type when supported;
  otherwise that type's landing.
- No dead links.

## Scenario 3 — Load more without losing context (US3)

1. Open a category with multiple pages.
2. Load several pages.
3. Activate "Load more" repeatedly while a request is pending.
4. Load until the end.
5. Force a later-page failure, then retry it.
6. Open the category address directly.

**Expected**:

- First page shows in provider order; "Load more" is present when more pages exist.
- Each successful activation appends below existing items; all existing items remain; the appended
  count is announced once.
- No duplicate items and no reordering; rapid activation issues one request per settled activation,
  and the control exposes a busy state.
- At the end, "Load more" is removed; a localized end-of-list message is shown and announced; focus
  moves to the end status when the control had focus.
- A later-page failure keeps all existing items usable and shows only an inline localized error with
  retry for that page; the list does not collapse into a page-level error.
- Direct open loads page 1 and does not require restoring prior pages.

## Scenario 4 — Incomplete metadata cards (US4)

Use controlled fixtures that omit or corrupt each optional field, then repeat with the live provider.

1. Render items with no poster, an empty path, a broken URL, and a failing image.
2. Render items with no date, an empty date, and a malformed date.
3. Render items with zero votes, no average, and an out-of-range average.
4. Render items with an empty localized title, only an original title, and neither title.
5. Render items with unknown genre IDs, empty genre lists, and unavailable names.
6. Render a response in which every item is unusable.

**Expected**:

- Every displayed card shows a title, textual media type, and artwork or a neutral fallback with no
  layout shift and no exposed error.
- Missing year/rating/genres are omitted cleanly: no blank label, dash, zero, or invented value.
- Original title is used when localized title is empty; an item with neither is excluded.
- Unknown genre IDs never appear; genres are omitted.
- An all-invalid response shows a localized empty/unavailable state, not a blank grid or crash.
- Adult-flagged items never appear.

## Scenario 5 — Loading, empty, and provider failures (US5)

1. Throttle the network and open Browse.
2. Fail one section while others succeed.
3. Fail every primary section.
4. Force an empty result.
5. Retry a failed surface, including repeated failure.
6. Serve a stale cached response after the provider becomes unavailable.
7. Force `429`, timeout, `5xx`, malformed JSON, and an invalid item list.
8. Switch media, change language, and navigate away while a request is pending.

**Expected**:

- Initial load shows layout-matching skeletons, busy state, and hidden decorative shapes; no
  spinner-only or bare "Loading" treatment; no visible content jump.
- One failed section shows an inline localized error with retry; other sections, navigation, media
  switch, language switch, and attribution stay usable.
- All-section failure shows one page-level localized error with retry inside the shell.
- Empty surfaces explain that no titles are available now and offer retry and, where meaningful, a
  media switch; no fabricated titles.
- Retry genuinely re-requests only the failed surface, prevents concurrent duplicate retries, and
  repeated failure shows the same stable state.
- Stale data is labeled cached/stale with a localized last-update time and is not presented as
  current; with no cached data, an unavailable state appears.
- Rate limit, timeout, outage, and invalid response map to calm localized states with no status code,
  provider message, or internal identifier.
- Navigation, media switch, language switch, attribution, and already loaded content keep working.
- The final selection's state is the only one shown; no stale response replaces it.

## Scenario 6 — Responsive, keyboard, screen reader, and language (US6)

1. Inspect the full journey at 360, 768, 1024, and 1440 px.
2. Repeat at 200% browser zoom and with enlarged text.
3. Complete the journey keyboard only.
4. Complete it with a screen reader.
5. Enable reduced motion.
6. Switch English/Spanish on a landing and on a category with several loaded pages.
7. Test long translated titles at 360 px.

**Expected**:

- At least 2 columns at 360, 3 at 768, 4 at 1024, and 5 at 1440 when enough items exist; consistent
  artwork aspect ratio; no horizontal page scrolling, clipping, overlap, or unreachable control.
- Media switch, See all, every card, Load more, retry, and return actions are keyboard reachable in
  logical order with a visible focus indicator and no trap.
- Screen reader announces structure, card names, media types, loading, appended count, end state, and
  errors once and meaningfully; artwork is not duplicated in the card announcement.
- Each card contains exactly one interactive target; its name includes title and media type, plus
  year/rating when present.
- Reduced motion suppresses skeleton animation and no layout-shifting motion occurs.
- No essential information or action requires hover; keyboard focus exposes the same content and
  actions.
- Language switch updates all catalog labels and provider metadata, uses locale-aware rating/date
  formatting, and restarts a loaded category at page one with no mixed-language final state. Once
  the new-language response resolves, the interface reaches its final state within one second
  (SC-010).
- Long titles wrap or truncate without clipping, and the full title remains available to assistive
  technology.
- No machine translation or auto-localization is applied; provider-supplied text remains attributed
  and no Walplay copy is invented for missing provider fields.
- Provider attribution mark and non-endorsement statement are present on every provider-data surface
  in both languages and at every width.

## Security and compliance checks

- Search the frontend build output, source maps, and browser network requests for the TMDB token,
  the token variable name, provider API base URL, and provider error text. All must be absent.
- Confirm image requests carry no credential and use only documented image hosts and approved sizes.
- Confirm API responses and logs contain no provider payload, provider field names, raw provider
  status text, stack trace, or internal identifier.
- Confirm CORS allows only configured origins and no wildcard-with-credentials combination.
- Confirm attribution uses the official unmodified mark and current required statement; legal review
  of terms, artwork, caching, and rate limits is a release gate (OD-13).

## Performance smoke check

- Under Lighthouse mobile emulation at 1.6 Mbps down / 750 Kbps up / 150 ms RTT with 4× CPU
  throttling, the page heading and first section content become visible within 2.5 s (SC-007).
- Section requests run in parallel, not as a waterfall.
- Repeated identical reads within the freshness period produce no additional provider traffic.
- Off-screen posters lazy-load with reserved aspect ratio and cause no visible layout shift.
- Loading states are skeletons, not spinners, and do not shift the final layout.

## Done criteria

The feature is complete only when every automated script passes in both applications with zero
unexpected warnings, the coverage thresholds hold, all six scenarios pass, security checks are
clean, and the remaining legal/attribution dependency is explicitly confirmed or recorded as a
release blocker.
