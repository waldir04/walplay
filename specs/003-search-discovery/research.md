# Phase 0 Research: Search and Discovery

**Feature**: `003-search-discovery` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

Technical Context contained no unresolved `NEEDS CLARIFICATION` items. The decisions below resolve
the design questions that the specification left to planning, and record the alternatives that were
rejected. Provider capability evidence is taken from spec Appendix A (TMDB `/3/search/multi`,
verified 2026-11-22) and is a release dependency on current terms.

---

## R-01 — Provider boundary for search

**Decision**: Add one server-side search adapter over TMDB's unified multi-search operation.

- New internal interface `backend/src/providers/search-provider.ts` exposing `id` and
  `fetchSearchPage({ query, language, page })`.
- New `tmdb.search.provider.ts` implements it with the same `TmdbClient`, `ImageResolver`, and
  `GenreResolver` instances used by the catalog adapter. It calls only `GET /3/search/multi` with
  `query`, `language`, `page`, and `include_adult=false`.
- The browser calls only `GET /api/search` on the Walplay API. No provider credential, DTO,
  popularity value, or field name crosses the boundary.
- Per-type `/search/movie` and `/search/tv` operations are not used, because merging separately
  ordered lists would conflict with FR-004, FR-027, and the spec's unified ordering assumption.

**Rationale**: Principle XX requires an isolated provider adapter, Zod validation, and no direct
frontend provider calls. Principle V's no-persistence flow is `routes → controllers → services →
provider adapters`. A separate `SearchProvider` interface keeps `CatalogProvider` focused and avoids
forcing catalog consumers and test fakes to carry an unused method.

**Alternatives considered**:

- Add `search` to `CatalogProvider`: rejected; it widens every catalog fake and conflates two
  contracts.
- Create a second TMDB client with its own auth/timeout/retry: rejected; duplicates integration
  logic and risks divergent resilience behavior.
- A BFF or Vite proxy: not part of the approved architecture.
- Client-side calls to TMDB: prohibited; credentials would leak and violates FR-073.

---

## R-02 — Endpoint and response shape

**Decision**: One read endpoint:

```text
GET /api/search?query=<text>&language=en|es&page=<positive integer>
```

It returns the existing envelope:

```json
{
  "data": {
    "page": 1,
    "items": [<catalog item>],
    "totalPages": 200,
    "hasMore": true
  },
  "meta": {
    "language": "en-US",
    "stale": false,
    "lastUpdatedAt": "2026-11-22T15:00:00.000Z",
    "source": "provider"
  }
}
```

- `items` reuse the catalog item shape exactly (opaque `id`, `mediaType`, localized/original title,
  optional year/rating/genres/poster).
- `totalResults` is deliberately **not** returned. The provider's unified total includes result
  types this feature excludes, and FR-028 forbids presenting it as the movie/TV match count.
- `totalPages` is returned only when the provider reports it. `hasMore` is
  `totalPages > page`, independent of how many valid items the page contained.
- The active query is not echoed. The frontend already has it from the address, and echoing user
  input into responses adds surface without benefit.
- The route sets `Cache-Control: no-store` so intermediaries cannot retain query-dependent results.

**Rationale**: Reusing the catalog envelope, meta, and item model satisfies FR-076, FR-077, FR-084,
and Principle XI without inventing a second contract style. Omitting `totalResults` makes FR-028
unrepresentable rather than relying on UI discipline.

**Alternatives considered**:

- Return `totalResults` and rely on the UI to hide it: rejected; easy to regress, violates the
  spirit of FR-028 and FR-077.
- A search-specific envelope or item type: rejected; duplicates contracts and forks the item model.
- `POST /api/search`: rejected; this is an idempotent read and must be cacheable server-side.

---

## R-03 — Address as the source of truth

**Decision**: `/search?q=<text>` is the single source of truth for the active query.

- The input has local draft text. After 350 ms without changes, the draft is written to the address
  with `navigate(..., { replace: true })`. Explicit submission (submit button or Enter) cancels the
  timer and writes immediately.
- Clearing removes `q` with `replace` and returns to the initial guidance state.
- Each settled query replaces the current history entry. Opening a result is a normal push, so
  browser back returns to the active search instead of stepping through intermediate queries.
- Query change keeps the same pathname, so the existing route announcement (which reacts to
  pathname) does not steal focus on every search.
- `URLSearchParams.get('q')` returns the first occurrence; extra or duplicated parameters are
  ignored, matching the spec edge case.
- A settlement always writes the trimmed draft; validity decides whether a request follows. This
  keeps invalid-but-present queries addressable while issuing no request.

**Rationale**: FR-003 requires the address to be authoritative and to reflect settled queries only.
TanStack Query keys derive from the address, so rendering is deterministic for reload, back, forward,
and direct open. The 350 ms delay is inside the specified 300–500 ms window.

**Alternatives considered**:

- Local-only query state: rejected by FR-003 and breaks reload/back restoration.
- Push a history entry per settled query: rejected by the clarification and SC-016.
- Encode loaded page depth in the address: rejected; a direct open loads page one (FR-039).

---

## R-04 — Query identity vs provider relevance

**Decision**: Separate the request identity from the text sent to the provider.

- **Sent to provider**: the trimmed query with internal whitespace preserved. This is user input and
  is never rewritten, translated, or normalized for relevance (FR-010, FR-070).
- **Request identity**: `trim → collapse whitespace runs to one space → case fold`. Used only for
  duplicate detection and cache keys. Combined with language and page.
- The TanStack key uses the identity and language; the query function sends the trimmed raw query.
  The backend cache key uses the same identity plus language, page, and provider.
- Two raw queries with the same identity therefore produce one provider request while the address
  still shows what the visitor typed.

**Rationale**: FR-014 limits normalization exactly to trimming, whitespace collapsing, and case
folding, and forbids altering provider relevance. Keying on identity is the only way to make
"resubmitting the same query" issue zero additional requests across cosmetic differences.

**Alternatives considered**:

- Key on raw text: rejected; case/whitespace variants would issue duplicate provider traffic.
- Rewrite the query for the provider: prohibited by FR-010 and FR-070.
- Unicode normalization or diacritic folding: rejected; beyond the permitted normalization and
  could change provider relevance.

---

## R-05 — Debounce, request discipline, and retries

**Decision**: A controlled input with a 350 ms settling timer in `features/search-query`.

- Timer resets on every input change. No request is issued while text changes.
- Explicit submission bypasses the remaining interval and cancels the timer.
- TanStack search queries use `retry: false`. Provider resilience remains server-side (bounded
  idempotent retries with backoff and jitter). Visitor retry is an explicit action.
- Same identity + language while results are fresh produces no request through key equality and
  `staleTime`.
- `staleTime` is the existing 5-minute catalog window, aligned with the backend freshness TTL so the
  client does not refetch data the server considers fresh; `gcTime` is 30 minutes.
- Clearing or shrinking below the minimum discards the query key; render switches to guidance.
- Cancellation is expressed as supersession: the settling timer is cancelled immediately, and an
  in-flight request whose key is no longer active cannot render. No additional network-abort layer
  is added to the shared HTTP client; the existing timeout bounds the request.

**Rationale**: FR-012, FR-013, FR-014, FR-019, and FR-046 require delaying while typing, immediate
submission, duplicate suppression, and no unbounded or automatic retry loops. Using one timer and
one keyed query avoids a second state machine.

**Alternatives considered**:

- `useDeferredValue` or a debounce library: rejected; a timer is smaller and the constitution
  prefers platform APIs.
- Client retries: rejected; would multiply provider traffic and weaken rate-limit control.
- Keeping the previous query key mounted to preserve results: rejected; it would present old
  results as current (FR-051).

---

## R-06 — Ordering, deduplication, and displayed count

**Decision**: Preserve provider order and deduplicate by opaque item ID across accumulated pages.

- The backend maps each response in order, drops invalid and non-movie/non-TV items, and
  deduplicates within the page by opaque ID.
- The frontend appends pages in order and removes any ID already seen, exactly as the catalog
  category list does.
- Displayed count is `items.length` across loaded pages, labeled as the number of titles currently
  shown. Provider totals are never displayed.
- Two distinct works sharing a title remain separate because identity includes media type and
  provider record ID encoded in the opaque token.

**Rationale**: FR-027, FR-028, FR-032, FR-035, and SC-006 require provider order, no duplicates, no
re-ranking, and honest counts.

**Alternatives considered**:

- Sort by rating or year: rejected; invents relevance.
- Deduplicate by title: rejected; collapses remakes and same-title movie/TV pairs.
- Merge per-type searches: rejected; produces a Walplay ordering and two pagination models.

---

## R-07 — Pagination and pages with no valid titles

**Decision**: Pagination follows provider page metadata only.

- `hasMore = totalPages !== undefined && totalPages > page`. An empty valid result set does **not**
  clear `hasMore`.
- No page size is invented; the provider's page is used. The backend still applies a named defensive
  request-page ceiling as input validation, which is unrelated to provider pagination metadata.
- The frontend keeps load more available when a page contained no valid movie/TV titles but the
  provider reports more pages. It states that the page had no titles and waits for the visitor. It
  never auto-requests the next page.
- End of results is `hasMore === false`, regardless of how many pages were loaded.
- A later-page failure is inline with retry and never collapses the loaded set. If the provider
  rejects a page request, the inline error remains available; the visitor can stop or retry.

**Rationale**: FR-029, FR-033, FR-037, FR-038, and SC-006. The empty-but-more case is the reason
`hasMore` must not depend on `items.length`, which differs from the catalog service's guard.

**Alternatives considered**:

- Auto-advance past empty pages: rejected by the clarification; unpredictable traffic.
- Derive `hasMore` from a full-page item count: rejected; provider page sizes vary and excluded
  types make the count unreliable.
- Cap pages at an assumed maximum: rejected; the provider documents no maximum and the spec forbids
  assuming one.

---

## R-08 — Cache, freshness, and stale results

**Decision**: Reuse `CatalogCache` unchanged with a second instance for search.

- Key: `tmdb:search:<identity>:<language>:<page>`. Identity and language are the only parameters that
  affect results; the page is included as required by FR-078.
- Fresh entries serve without provider traffic. Expired entries within the stale window serve
  last-known-good data with `meta.stale = true` and the original timestamp after a provider failure.
- Concurrent identical misses share one in-flight promise.
- Search uses the same `TMDB_CACHE_TTL_SECONDS`, `TMDB_CACHE_STALE_SECONDS`, and
  `TMDB_CACHE_MAX_ENTRIES` configuration; no new environment variable is introduced. A separate
  instance keeps search traffic from evicting catalog entries.
- A separate process-local instance means eviction and restart behavior are documented, not treated
  as correctness.

**Rationale**: FR-047, FR-078, FR-079, and Principle X. Reusing the tested cache avoids a second
resilience implementation; a separate instance preserves fault isolation.

**Alternatives considered**:

- Share one cache instance: rejected; a query-heavy session could evict catalog pages.
- Database-backed cache: rejected; no persistence requirement, violates Principles XIX/XXI intent.
- Browser HTTP caching: rejected; cannot label stale data or protect provider rate limits.

---

## R-09 — Error mapping and query-specific guidance

**Decision**: Reuse the existing stable catalog error codes and envelope.

| Condition | Code | UI treatment |
|---|---|---|
| Invalid query/language/page, or provider 400/422 attributable to the query | `VALIDATION_ERROR` (400) | Localized editable guidance; no retry action |
| Provider rate limit, no stale entry | `CATALOG_RATE_LIMITED` (429) | Localized unavailable state with retry |
| Provider timeout, no stale entry | `CATALOG_TIMEOUT` (504) | Localized unavailable state with retry |
| Network/5xx/outage, no stale entry | `CATALOG_UNAVAILABLE` (502) | Localized unavailable state with retry |
| Provider response fails boundary validation | `CATALOG_INVALID_RESPONSE` (502) | Localized unavailable state with retry |
| Unexpected server failure | `INTERNAL_ERROR` (500) | Localized unavailable state with retry |
| Unknown API path | `ROUTE_NOT_FOUND` (404) | Localized unavailable/not-found state |

- Search-specific UI mapping treats `VALIDATION_ERROR` as `query-invalid`, not as an outage.
- The search service implements the provider 400/422 → `VALIDATION_ERROR` branch locally; the
  shared catalog `mapProviderError` is not changed, so catalog behavior remains stable.
- Provider messages, status text, response bodies, and stack traces never reach the client.
- Query text is never included in error responses or logs.

**Rationale**: FR-043, FR-044, FR-045, FR-046, FR-080, SC-014. The distinction that matters to the
visitor is "your query cannot be searched" versus "the service is unavailable", and the existing
codes already express it.

**Alternatives considered**:

- New `SEARCH_*` code family: rejected; larger contract for identical semantics.
- Map provider 422 to `CATALOG_INVALID_RESPONSE`: rejected; it would offer a pointless retry for a
  query the provider will keep rejecting.
- Surface provider messages: prohibited.

---

## R-10 — Frontend server-state and race handling

**Decision**: One `useInfiniteQuery` per active query identity + language.

```text
['catalog', 'search', identity, language]
```

- `initialPageParam: 1`; `getNextPageParam` returns `page + 1` when `hasMore`, otherwise `undefined`.
- `retry: false`; `staleTime` 5 minutes; `gcTime` 30 minutes; no refetch on focus or reconnect, so
  every provider request has an explicit trigger (settle, submit, load more, retry, language change).
- The visible data is always derived from the current key's `data.pages`. A response for a
  superseded query or language writes to its own key and cannot alter the current render.
- Loading a new key has no `placeholderData`, so the previous results disappear behind the new
  query's skeleton as required by FR-051.
- Load-more uses `fetchNextPage`; the action is disabled while `isFetchingNextPage`, and
  `isFetchNextPageError` drives the inline page error.
- Announcements and append counts are computed from the current key's page count and reset when the
  key changes.

**Rationale**: FR-015, FR-050, FR-052, FR-053, FR-054, Principle XVIII. Key-based isolation makes
"newest wins" a property of the data layer rather than a set of timers.

**Alternatives considered**:

- A request-ID guard in component state: rejected; reinvents what query keys already guarantee.
- One query per page with manual assembly: rejected; more state, no language isolation.
- Keeping previous data during a key change: rejected; violates FR-051 and FR-053.

---

## R-11 — Search origin for the existing detail destination

**Decision**: Extend the existing detail return contract additively.

- Result cards pass `from` as the full origin path. Catalog usage keeps passing the pathname; search
  passes `/search?q=<encoded active query>`.
- `resolveDetailReturn` recognizes an internal `/search` origin with a valid query and returns that
  path with `origin: 'search'`. Invalid or foreign origins fall back to the media landing unchanged.
- The detail page uses the catalog label for a catalog origin and a search-owned return label for a
  search origin. The route stays `/browse/<type>/title/:itemId`, so Browse remains the current
  navigation destination (FR-009).
- On a direct open or reload, route state is absent and the fallback is the media landing, with no
  fabricated search state.
- Browser back restoration needs no extra code: the search address is the previous history entry
  and the query key still holds session results.

**Rationale**: FR-006, FR-007, FR-009, SC-003. The smallest change is to widen an existing string
origin and its validator; no second detail route, state store, or persisted origin is introduced.

**Alternatives considered**:

- Encode the origin in detail query parameters: rejected; exposes search context more broadly and
  changes the catalog address contract.
- Persist the origin in storage: rejected; FR-081 forbids persisting query context beyond the
  address and memory.
- A new search-specific detail route: prohibited by FR-006.

---

## R-12 — Accessibility, focus, and announcements

**Decision**: One search surface with explicit focus and announcement rules.

- Page: one `h1` (page heading id), a labelled `role="search"` region, a visible input label, hint
  via `aria-describedby`, and a results region with its own heading and status.
- Result collection is the existing semantic list/grid with an accessible name that includes the
  active query, not the input draft.
- Initial loading: `aria-busy` on the results region, layout-matching card skeletons with
  `aria-hidden` decoration, no spinner or bare "Loading".
- Announcements: one polite `LiveRegion` for settling, result arrival with displayed count, append
  count, interim-empty page, and end of results; `role="alert"` for failures. A key change resets
  announcement state so superseded responses cannot announce.
- Focus: debounced and explicit searches keep focus in the input; clear refocuses it; load more
  keeps focus on the action while it remains; on removal at the end, focus moves to the end status.
- Guidance for empty/short/over-long input is visible, described by the input, and not an alert.
- Targets: submit, clear, and load more are at least 44×44 px; cards keep one interactive target
  each.
- Reduced motion suppresses skeleton animation; no layout-affecting motion.

**Rationale**: FR-055 through FR-066 and Principle XIV. Reusing the catalog card and grid keeps the
accessible-name and target-size behavior already tested by feature 002.

**Alternatives considered**:

- Announce on every keystroke: rejected; noisy and violates "announced once and meaningfully".
- Move focus to the result heading after each search: rejected by FR-061.
- A custom combobox/suggestions pattern: out of scope and prohibited by FR-020.

---

## R-13 — Internationalization

**Decision**: New `search` namespace in both resource files, with shared catalog labels reused.

- Search-owned text includes the heading, label, hint, submit/clear labels, validity guidance,
  initial guidance, result-count wording, collection labels, state messages, end-of-results,
  announcements, and document title.
- Media-type labels, rating formatting, year formatting, card fallback text, and attribution copy
  are reused from the catalog namespace rather than duplicated.
- The detail return action gains a search-origin label alongside the catalog label.
- Provider metadata uses the existing `en-US`/`es-ES` mapping. Language is part of the query key, so
  a language change discards previous-language pages.
- Counts, dates, and ratings use i18next pluralization/interpolation and `Intl`, including tabular
  numerals where the catalog already does.

**Rationale**: FR-067 through FR-071 and Principle XV. Reusing catalog labels avoids two sources of
truth for the same concept.

**Alternatives considered**:

- A separate media-type label set for search: rejected; duplicated copy would drift.
- Machine translation of provider text: prohibited.
- Translating the visitor's query: prohibited.

---

## R-14 — Testing without new dependencies

**Decision**: Extend the existing Vitest/RTL/`vitest-axe` and backend Vitest setups.

- Backend route tests reuse `startTestServer` and a fake `SearchProvider`; provider network is never
  touched.
- Frontend debounce tests use `vi.useFakeTimers()` and advance timers; request counts are asserted
  through query keys/cache state or a stubbed client, not real timers.
- Out-of-order tests use deferred promises resolving in reverse order and assert that only the
  current key's result is rendered.
- Contract fixtures on both sides mirror `contracts/search-api.md`.

**Rationale**: Principle VIII and XXI. No new test library is needed; the existing harness already
covers router, query, i18n, axe, and server integration.

**Alternatives considered**:

- MSW or a new mocking library: rejected; existing stubs and fake providers are sufficient.
- End-to-end browser tooling: not present in the approved stack; manual verification covers it.

---

## Resolved planning questions

| Question | Resolution |
|---|---|
| Where does the settled query live? | In the `/search?q=` address, replaced per settlement (R-03). |
| How are cosmetic query variants deduplicated? | Normalized identity for keys/cache; trimmed raw text for the provider (R-04). |
| How are out-of-order responses prevented from rendering? | Query key per identity + language; no placeholder data (R-10). |
| How is `hasMore` computed for an empty page with more pages? | `totalPages > page`, independent of item count (R-07). |
| Are provider totals exposed? | No; only displayed valid-title count (R-02, R-06). |
| How does the detail destination return to search? | Additive `from` search path + fallback to media landing (R-11). |
| Which retries are allowed? | Backend bounded idempotent retries; frontend explicit retry only (R-05, R-09). |
| Are new dependencies or configuration required? | No (R-01, R-08, R-14). |

## Remaining release dependencies

- TMDB approval, current terms, attribution asset/wording, caching limits, and rate-limit behavior
  remain subject to legal confirmation (OD-13) before public release.
- Attribution and artwork requirements must be re-checked at implementation time; no placeholder
  mark is acceptable in production.
