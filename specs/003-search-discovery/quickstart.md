# Quickstart Validation: Search and Discovery

**Feature**: `003-search-discovery` | **Date**: 2026-11-22

This guide proves search works end to end. It references the contracts and data model instead of
restating details and contains no implementation code.

Related artifacts:

- [spec.md](./spec.md) — requirements and acceptance scenarios
- [plan.md](./plan.md) — architecture, constitution gates, risks, and testing strategy
- [data-model.md](./data-model.md) — query identity, pages, states, and invariants
- [contracts/search-api.md](./contracts/search-api.md) — backend HTTP contract
- [contracts/routes.md](./contracts/routes.md) — address, history, focus, and detail-return contract
- [contracts/provider-boundary.md](./contracts/provider-boundary.md) — adapter, mapping, cache, and errors
- [contracts/i18n-resources.md](./contracts/i18n-resources.md) — translation keys and language mapping

## Prerequisites

| Requirement | Value |
|---|---|
| Node.js | 22 LTS, pinned by `frontend/.nvmrc` and `backend/.nvmrc` |
| Package manager | `npm` with committed lockfiles in both applications |
| TMDB access | A server-side bearer access token approved for development use |
| Browser | Latest two major versions of a current desktop or mobile browser |
| Screen reader | VoiceOver, NVDA, or equivalent for the manual accessibility pass |
| Network | Internet access only for live-provider smoke checks; automated tests are offline |

## Setup

The feature adds no environment variable. Reuse the catalog setup.

```bash
cd backend && npm ci && cp .env.example .env.local
cd ../frontend && npm ci && cp .env.example .env.local
```

Backend `.env.local`: `TMDB_ACCESS_TOKEN` and `CORS_ALLOWED_ORIGINS` (for example
`http://localhost:5173`). Frontend `.env.local`: `VITE_APP_ENV=local` and
`VITE_API_BASE_URL=http://localhost:4000`. No provider token, provider URL, timeout, or TTL may
appear in a `VITE_*` variable.

## Run

Terminal 1: `cd backend && npm run dev`
Terminal 2: `cd frontend && npm run dev`

Quality scripts, runnable from each application directory:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Automated validation

```bash
cd backend && npm run test
cd frontend && npm run test
```

Expected green suites include:

- Backend: query validation and identity, multi-search DTO/mapper exclusions and order,
  empty-but-more `hasMore`, cache key isolation/stale/single-flight, error mapping, and route
  integration (envelope, `no-store`, CORS, no query/provider leakage).
- Frontend: query validity/identity, response schema and append dedupe, debounce and request counts
  with fake timers, immediate submit, clear/focus, all result states, out-of-order responses,
  language switch, route/history, detail origin, axe states, keyboard, reduced motion, responsive
  widths, and i18n key parity.

## API spot checks

With the backend running:

```bash
# Valid search
curl -i "http://localhost:4000/api/search?query=the%20matrix&language=en&page=1"

# Invalid (too short) -> 400 VALIDATION_ERROR, no provider call
curl -i "http://localhost:4000/api/search?query=a&language=en"

# Unknown key -> 400 VALIDATION_ERROR
curl -i "http://localhost:4000/api/search?query=matrix&language=en&sort=popularity"

# Page above the defensive maximum -> 400 VALIDATION_ERROR, no provider call
curl -i "http://localhost:4000/api/search?query=matrix&language=en&page=1001"
```

Expected:

- `200` responses carry `data.page` echoing the request, `data.items`, optional `data.totalPages`,
  `data.hasMore`, and `meta`; **no** `totalResults` field.
- Every search response has `Cache-Control: no-store`.
- Error bodies contain only `error.code`, a stable developer `message`, and optional safe `details`.
- No provider name beyond attribution copy, credential, provider field name, raw payload, or query
  echo appears in any response.
- Repeating the same normalized query with the same language and page within the freshness window is
  served from cache/single-flight (observable in backend logs as a cache outcome, without query
  text).

## Manual scenarios

### 1. Initial state and direct open

1. Open `/search`. Expect one `h1`, one labelled input, initial guidance, no provider request in the
   network panel, and Search marked current in the primary navigation.
2. Open `/search?q=the%20matrix` directly. Expect the input populated, the query submitted, results
   inside the shell, and no intermediate query history entry.
3. Open `/search?q=t`. Expect too-short guidance, zero requests, and no error/no-results state.

### 2. Typing, debounce, and duplicate suppression

1. Clear the network log and type a multi-character query at normal speed without pausing longer
   than 300 ms. Expect zero requests for intermediate text and at most one request after settling.
2. Press Enter while the debounce timer is still pending. Expect an immediate request and no second
   request when the timer would have fired.
3. Submit the same normalized query again (for example with different case or extra spaces). Expect
   zero additional requests and preserved results.
4. Use the address bar: `/search?q=a&q=b&extra=1` resolves to the first `q` only.

### 3. History, clearing, and returning

1. Type several queries in a row. Inspect browser history: settled queries add zero entries.
2. Open a result. Expect the existing type-specific detail destination, Browse still current in
   navigation, and a return action labeled for search.
3. Use the return action or browser Back. Expect `/search?q=<active query>` with the same results.
4. Clear the query. Expect `q` removed with a history replacement, pending requests cancelled or
   ignored, initial guidance restored, and focus in the input.
5. Reload a detail opened from search. Expect the return action to fall back to the media landing
   without an error or fabricated search state.

### 4. Unified results and metadata

1. Search a term matching both a movie and a TV show. Expect one collection in provider order with
   both types in text.
2. Inspect results in both languages. Expect localized titles when available, original titles
   otherwise, four-digit years, ratings only when votes are non-zero, no blank/dash/zero placeholders,
   resolved genre names only, and poster fallbacks when artwork is absent.
3. Confirm two works sharing a title remain separate and no result is duplicated after loading
   several pages.
4. Confirm the visible count reflects titles currently displayed, not the provider total.

### 5. Pagination and empty pages

1. Search a term with multiple pages and activate Load more repeatedly. Expect append-only growth,
   stable order, no duplicate IDs, and one announcement per append.
2. Continue to the end. Expect Load more removed, a localized end message announced once, and focus
   moved to the end status only when Load more had focus.
3. Force a provider page that contains only excluded types while more pages remain. Expect existing
   results preserved, an interim "page had no titles" message, Load more still available, and no
   automatic next request.
4. Force a later-page failure. Expect existing results usable, an inline localized error with retry,
   and no page-level collapse.

### 6. No results versus failure versus query rejection

1. Search a term with zero matches. Expect a no-results state that echoes the query, explains no
   titles matched, offers edit/clear, and is not an alert.
2. Force a timeout, `429`, `5xx`, network failure, and malformed response for a valid query. Expect a
   localized unavailable state with retry, no raw status/provider text, and no no-results wording.
3. Force a provider query rejection (`400`/`422`). Expect editable guidance without a retry action.
4. Retry a failed search. Expect a genuine new request, only that surface in loading, and the same
   stable state on repeated failure.
5. Serve stale data after a failed refresh. Expect the cached label and last-update time, never
   presented as current.
6. Simulate a failed refresh while results are displayed (for example, after the freshness window,
   make the next request fail through the resubmit path). Expect the existing results to remain,
   labeled cached with the last successful update time, with an inline retry rather than a
   page-level error.

### 7. Newest wins

1. Use controlled delayed responses to resolve query A after query B. Expect B's results only.
2. Start a load-more for A, then switch to B, and let A's page arrive. Expect no A items appended to
   B.
3. Change the interface language while a search is pending. Expect only the new-language response
   to render and no mixed-language final state.
4. Verify superseded responses produce no count, end, or error announcements.

### 8. Accessibility and responsive behavior

1. Keyboard only: reach the input, submit, clear, load more, retry, and every result in logical
   order with a visible focus ring and no trap.
2. Screen reader: each search start, result arrival, append, interim-empty page, end, no-results,
   stale, and error is announced once; failures use alert semantics; busy states are exposed and
   skeletons are hidden.
3. Verify focus stays in the input after debounced and explicit searches, refocuses after clear,
   and remains on Load more while it is available.
4. Verify 360, 768, 1024, and 1440 px and 200 % zoom: no horizontal scrolling, clipping, overlap, or
   unreachable control; long Spanish titles remain readable with full accessible names.
5. Enable reduced motion: skeleton animation is suppressed and nothing shifts layout.

### 9. Localization

1. Switch between English and Spanish while results are displayed and while a page is pending.
   Expect all search-owned copy to update, the active query to re-run in the new language, and no
   mixed-language result set.
2. Confirm counts, dates, and ratings use locale-aware formatting, and the Spanish provider metadata
   uses `es-ES` with original-title fallback where translation is missing.
3. Confirm the query is displayed as plain text and never translated or rendered as markup.

### 10. Privacy and scope audit

1. Inspect network responses, browser storage, and built assets. Expect no provider credential,
   provider DTO field name, provider raw error, query text in errors, or persisted search history.
2. Confirm no autocomplete, suggestions, trending/recent searches, filters, availability,
   watchlists, accounts, playback, or second detail destination exists.
3. Confirm attribution appears on every surface displaying provider data, including successful
   results, no-results, stale, and partial pages, in both languages and at all supported widths.

## Definition of done

- Both applications pass `lint`, `typecheck`, `test`, and `build`.
- No unexpected test warnings; no `any`, unjustified assertion, or suppression.
- All manual scenarios above pass, including keyboard, screen reader, reduced motion, and the four
  viewport widths.
- No secrets, provider payloads, or query text leaked to the browser, logs, or persistent storage.
- ADR-0003 records the URL/identity and search-origin decisions.
