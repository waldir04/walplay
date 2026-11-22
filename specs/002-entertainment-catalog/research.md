# Phase 0 Research: Entertainment Catalog

**Feature**: `002-entertainment-catalog` | **Date**: 2026-11-22

Every item below resolves a technical unknown from the plan's Technical Context. There are no
remaining `NEEDS CLARIFICATION` markers. Provider capabilities are taken from the specification's
Appendix A, which records the official TMDB documentation verified on 2026-11-22; this document
does not re-verify external terms and does not authorize use beyond them.

---

## R-01 — Provider access boundary

**Decision**: All TMDB access lives in the new `backend/` Express application behind a
`CatalogProvider` interface. The SPA calls only Walplay's internal JSON API at `VITE_API_BASE_URL`.
The TMDB bearer token exists only in backend configuration and is never used in a browser request,
image URL, log line, error response, or source map.

**Rationale**: FR-058, FR-059, and Principle XX require server-side mediation and untrusted-input
validation. The constitution explicitly excludes server-side rendering, GraphQL, microservices, and
a shared BFF; a separate JSON API is the approved architecture. TMDB list and detail results can be
served by an ordinary HTTP API, so no SSR mechanism is needed for "server-side lookup".

**Alternatives considered**:

- Vite dev proxy only: rejected. A proxy does not exist in production and would expose the token in
  any built client path that calls TMDB directly.
- Serverless/edge function: rejected. Not in the approved stack or deployment topology.
- Server-side rendering: rejected by the constitution.
- Client-side calls with a restricted key: rejected; TMDB credentials must remain server-side and
  the browser must not call provider endpoints.

---

## R-02 — Catalog API shape and section isolation

**Decision**: Expose four read endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/catalog/capabilities` | Section IDs, order, supported media types, pagination support |
| `GET /api/catalog/:mediaType/:section?language=&page=` | One section page slice |
| `GET /api/catalog/:mediaType/titles/:itemId?language=` | Minimal card fields for a directly opened detail |
| `GET /api/health` | Deployment liveness only; no provider call |

The landing page requests one section-page query per supported section, in parallel, plus one
capabilities query. There is no aggregate "landing" endpoint, because a single response would make
per-section failure isolation and independent retry impossible without duplicating state in the
payload.

**Rationale**: FR-033 requires sections to load and fail independently. Separate queries map
directly to that requirement and to TanStack Query's independent cache entries. Section IDs are
stable internal identifiers (`trending`, `popular`, `top-rated`), not provider endpoint names.

**Alternatives considered**:

- One `GET /catalog?mediaType=` aggregate: rejected; any provider failure collapses all sections and
  retry cannot target one surface.
- Provider-shaped endpoints (`/movie/popular`): rejected; leaks provider vocabulary and makes the
  adapter non-replaceable.
- GraphQL: rejected by the constitution.

---

## R-03 — Minimal detail destination

**Decision**: The detail page is a normal SPA route. When navigation comes from a card, the card
passes its already-known `CatalogItem` through router state; the page validates that state with the
item schema, verifies the ID and media type match the address, and renders without a second request.
When the address is opened directly, the page calls the backend detail endpoint, which performs a
minimal TMDB movie/TV lookup and maps only card fields. Invalid, unknown, adult-flagged, or failed
lookups show a localized not-found or unavailable state with a working catalog return.

**Rationale**: FR-011 and FR-012 distinguish the two entry paths. Using card metadata avoids a
redundant request and guarantees the destination matches the card. Router state is untrusted data,
so it is validated rather than assumed. No detail sections, cast, seasons, availability, or playback
are introduced.

**Alternatives considered**:

- Always fetch by ID, even from a card: rejected; slower, adds a request for data already known,
  and risks a card/detail mismatch.
- Pass full provider payload in state: rejected; would carry provider DTOs into the client.
- Server-render the detail page: rejected by the architecture.

---

## R-04 — Frontend server-state layer

**Decision**: Add `@tanstack/react-query` v5 and one `QueryClient` at the application root.

- A central key factory produces every catalog key:
  `['catalog','capabilities']`, `['catalog','section',mediaType,section,language,page]`,
  `['catalog','item',mediaType,itemId,language]`.
- Section previews and direct item lookups use `useQuery`.
- Category lists use `useInfiniteQuery` with `initialPageParam: 1` and `getNextPageParam` derived
  from the server's `hasMore`/`nextPage`.
- `staleTime` follows the server's reported freshness window (default 5 minutes); `gcTime` is 30
  minutes. No refetch-on-focus behavior is required for this read-only catalog; the configuration is
  explicit rather than defaulted.
- Category pages are derived from `data.pages` by appending items and deduplicating by opaque ID;
  they are never re-sorted.
- Language is part of every key. When the language changes, the infinite query key changes, which
  discards previously loaded pages and restarts at page one, satisfying FR-055.

**Rationale**: Principle XVIII makes TanStack Query the only server-state mechanism and requires a
key factory and deliberate freshness. Per-section queries implement independent failure; infinite
queries implement append semantics without inventing page sizes.

**Alternatives considered**:

- `useEffect` + `fetch`: prohibited by Principle XVIII.
- A global store (Redux/Zustand): prohibited; duplicates server data.
- One infinite query per landing page: rejected; cannot isolate section failures.
- Retaining pages across language keys: rejected by FR-055 and would produce mixed-language lists.

---

## R-05 — Cache, freshness, and stale serving

**Decision**: Implement a small bounded in-memory cache in `backend/src/services/catalog-cache.ts`
with two thresholds per entry: `freshUntil` and `staleUntil`.

- Fresh entry: serve immediately without contacting TMDB.
- Expired but within the stale window and provider fails: serve the last-known-good entry with
  `meta.stale = true` and the original `lastUpdatedAt`.
- Expired and no usable entry: return a stable error.
- Keys include media type, section, language, and page; detail keys include media type, item ID, and
  language; capabilities and image configuration have their own keys.
- Concurrent identical misses are coordinated through a single in-flight promise, so duplicate
  provider traffic is not created.
- Cache size is bounded; oldest/expired entries are evicted. No provider payload is logged.

**Rationale**: FR-037, FR-064, FR-065, and Principle X require defined TTL caching, cache-key
completeness, duplicate-request coordination, and clearly labeled stale data. A process-local cache
is sufficient because the feature has no user data and no persistence requirement; introducing
Prisma/PostgreSQL for a read-through cache would add an unused persistence dependency.

**Alternatives considered**:

- No cache: rejected; violates FR-064/FR-065 and invites rate-limit failures.
- Database-backed cache: rejected as premature; no persistence requirement exists and Principle XXI
  discourages unused infrastructure.
- HTTP-only browser caching: rejected; it hides stale metadata and cannot implement last-known-good
  after a provider failure.
- Stale-while-revalidate on the client: rejected; provider traffic would leak to the browser and
  stale labeling would be unreliable.

---

## R-06 — Timeouts, retries, and rate limits

**Decision**: Every provider request uses `AbortSignal.timeout(TMDB_TIMEOUT_MS)` (default 5 s).
Idempotent GET reads may be retried at most twice with exponential backoff and jitter. `429`
responses are not retried blindly: `Retry-After` is respected, the request maps to
`CATALOG_RATE_LIMITED`, and a stale entry may be served if one exists. `401`/`403` are treated as a
server configuration failure and mapped to `CATALOG_UNAVAILABLE` without exposing the response.

**Rationale**: FR-038, FR-064, FR-066, and Principle XX require explicit timeouts, bounded
idempotent retries, backoff with jitter, and rate-limit respect. User-initiated retry is a separate,
single-flight frontend action, so the system never creates an uncontrolled loop.

**Alternatives considered**:

- Unlimited retries: rejected; can amplify an outage or violate provider limits.
- Retrying non-idempotent calls: rejected; all used calls are reads, so retries are limited to GETs.
- Client-side retries: rejected; duplicate provider traffic and weaker rate-limit control.

---

## R-07 — Provider validation, mapping, and identity

**Decision**: Define Zod schemas for each used TMDB response in `tmdb.schemas.ts`. Parse at the
adapter boundary, map valid records to internal `CatalogItem` values, and drop individual invalid
items. A response whose top-level shape is invalid maps to `CATALOG_INVALID_RESPONSE`. Filter
`adult === true` before mapping. Resolve localized title with fallback to the original title;
exclude items with neither. Ratings require a finite average in `0..10` and `vote_count > 0`.
Release year is extracted from a valid date's first four digits; invalid dates yield no year.
Genres are resolved through the localized genre list; unresolved IDs are omitted.

Opaque identity: the API exposes a Walplay item ID encoded from `wl1:<mediaType>:<providerId>` as
base64url. The browser treats it as opaque. The backend decodes it, validates the prefix and media
type against the route, and never returns the raw provider ID or the encoding scheme. The mapping
from provider record to Walplay item stays inside the boundary.

**Rationale**: FR-015 through FR-019, FR-023, FR-059, FR-060, FR-070 and Principle II require
runtime validation and a provider-neutral model. An opaque ID avoids exposing a provider identifier
while remaining deterministic without persistence.

**Alternatives considered**:

- Use TMDB numeric IDs directly: rejected; FR-060 requires provider-neutral identity and a
  provider-shaped identifier would leak through the API.
- Random UUIDs with a database mapping: rejected; requires persistence that this feature does not
  need, and would make IDs unstable across restarts.
- Pass provider DTOs through: prohibited.

---

## R-08 — Artwork resolution

**Decision**: Fetch `GET /3/configuration` at the backend, cache the image base URL and approved
poster sizes with a long TTL, and map each item to one or two absolute poster URLs (`w342` for the
grid, `w780` for larger candidates). Compose URLs only from the documented base URL, an approved
size, and the returned file path. If configuration or the path is unavailable, omit artwork so the
card fallback is used. The browser requests only the image host, with no credentials.

**Rationale**: FR-018, FR-050, FR-067 require approved sizes, responsive candidates, reserved aspect
ratio, and no credential on image requests. Resolving at the boundary prevents the frontend from
knowing provider URL rules.

**Alternatives considered**:

- Build URLs in the frontend: rejected; leaks provider image conventions and terms into the client.
- Use `original`: rejected; excessive transfer and outside the approved size discipline.
- Proxy images through Walplay: not required and adds bandwidth/legal scope; direct image-host use
  is permitted only if current terms allow it, which remains a legal-review item.

---

## R-09 — Provider attribution

**Decision**: Add `widgets/provider-attribution` rendering the official TMDB mark and the required
non-endorsement statement on every catalog surface that displays provider data: landing, category,
and minimal detail. The mark is an official, unmodified asset committed under
`frontend/src/shared/assets/`; surrounding explanatory text is localized. Link behavior and the
exact statement are taken from current published terms at implementation/legal review.

**Rationale**: FR-068, FR-069, SC-009, and Principle XX require attribution wherever provider data
appears and prohibit implying endorsement. A reusable surface-level widget avoids a global footer,
which the foundation contract prohibits.

**Alternatives considered**:

- Global footer: rejected by the feature 001 shell contract and OQ-05's stated assumption.
- Text-only attribution: rejected; current terms require the official mark.
- A placeholder logo: rejected; would be a compliance defect if shipped.

---

## R-10 — Route and address model

**Decision**:

| Address | Behavior |
|---|---|
| `/browse` | Redirects with `replace` to `/browse/movies` |
| `/browse/movies` | Movies landing |
| `/browse/tv-shows` | TV shows landing |
| `/browse/movies/popular` | Movies popular category |
| `/browse/movies/top-rated` | Movies top-rated category |
| `/browse/tv-shows/popular` | TV popular category |
| `/browse/tv-shows/top-rated` | TV top-rated category |
| `/browse/movies/title/:itemId` | Movie minimal detail |
| `/browse/tv-shows/title/:itemId` | TV minimal detail |
| anything else under `/browse` | Localized not-found inside the shell |

Trending has no category address because the provider documents no page request parameter for it;
it is a bounded preview only. Media switching on a category targets the same category for the other
type when supported, otherwise that type's landing. On a landing it targets the other landing. The
address is the source of truth; browser back/forward restores the matching view.

**Rationale**: FR-002, FR-003, FR-008, FR-009, FR-031, and FR-013 require stable, type-specific
addresses, an always-present type, and final-selection-wins behavior. Explicit type segments avoid
inferring type from item IDs.

**Alternatives considered**:

- `/browse?type=movie`: rejected; weaker direct-address semantics and awkward category/deep links.
- One `/browse/category/:id` with a media switch in state: rejected; address would not fully describe
  the view.
- `/browse/movies/:itemId` without a `title/` segment: rejected; collides with category slugs.

---

## R-11 — Pagination, ordering, and end conditions

**Decision**: Category lists use the provider's first page initially and request the next page only
on user action. Server page size is the provider's; Walplay never substitutes its own. Appending
preserves existing items and order, deduplicates by opaque item ID, and announces the number of newly
added items once. `hasMore` is computed from the provider's reported page/total pages and the
presence of at least one valid item; contradictory metadata ends pagination safely. The final page
removes "Load more" and shows and announces a localized end state. A failure shows an inline error
with a retry for that page and never replaces the loaded list. Section previews never paginate.

**Rationale**: FR-024 through FR-031 and the spec's volatility edge cases. Provider order is
authoritative; no ranking explanation is invented.

**Alternatives considered**:

- Offset pagination invented by Walplay: rejected; violates FR-024 and provider semantics.
- Infinite scroll: not required, harder to make accessible and testable, and would add scroll-driven
  motion; an explicit control satisfies the requirement.
- Client-side re-sorting: prohibited by FR-063.

---

## R-12 — Accessibility, announcements, and responsive layout

**Decision**:

- Each surface has exactly one `h1` with `PAGE_HEADING_ID`; sections use `h2` and labelled
  `<section>`/`aria-labelledby`; the grid is a semantic list with an accessible name.
- Each card is one link. Its accessible name combines title, media type, and optional year/rating.
  Poster and fallback decoration are `aria-hidden`; the visible media-type text is real text.
- Skeletons reserve the card aspect ratio, use `Skeleton` (`aria-hidden`), and the container exposes
  `aria-busy="true"`. No spinner-only state.
- Load, append, end, empty, stale, and error messages use the shared polite/assertive live regions
  once. Appended counts and end states are polite; errors are alerts.
- After appending, focus stays on "Load more" while it remains; when removed, focus moves to the
  end-of-list status. Retry affects only the failed surface and disables while pending.
- Grid columns: 2 at base, 3 from `sm`, 4 from `lg`, 5 from `xl`, within the existing max-width
  container; artwork keeps a fixed aspect ratio. No horizontal scrolling at 360, 768, 1024, 1440 px
  or 200% zoom.
- Reduced motion suppresses skeleton animation; no layout-affecting transitions.
- Card image uses `loading="lazy"`, `decoding="async"`, explicit dimensions/aspect ratio, and
  `srcSet` candidates.

**Rationale**: FR-032 through FR-051, FR-044 through FR-050, SC-005, and SC-006. A single
interactive target per card simplifies the screen-reader announcement and prevents duplicate links.

**Alternatives considered**:

- Card with separate poster link and title link: rejected; two targets violate the one-target rule
  and duplicate announcements.
- Hover-revealed actions: rejected; hover must not be the only path.
- Virtualization: rejected for the bounded preview and moderate category sizes; it complicates
  focus management and accessibility without a demonstrated bottleneck.

---

## R-13 — Internationalization and provider language

**Decision**: Add catalog resources under a new `catalog.*` namespace and per-route `meta.title.*`
keys in both `en.json` and `es.json`. Map interface locale to provider language:
`en -> en-US`, `es -> es-ES`. Provider requests include the mapped language for sections, item
lookups, and genre lists. Provider metadata remains provider text with attribution. Numeric rating
uses `Intl.NumberFormat` for the active locale; years are four-digit strings. On language change,
TanStack Query keys change, category lists restart at page one, and the catalog does not settle
with mixed-language pages. A transition/loading state is shown while new language data loads.

**Rationale**: FR-052 through FR-056, SC-010, and Principle XV. `es-ES` is fixed by the spec
clarification; `en-US` is the documented English fallback for provider metadata.

**Alternatives considered**:

- `en` and `es` alone as provider parameters: rejected; the provider expects language-region codes
  and Spanish is explicitly `es-ES`.
- Machine translation: prohibited by FR-054.
- Retaining old pages while fetching the new language: rejected by FR-055 and SC-010.

---

## R-14 — Testing approach without new test dependencies

**Decision**: Frontend tests inject a fresh `QueryClient` with retries disabled and stub the global
`fetch` (or the entity API functions) per scenario; no MSW or supertest dependency is added.
Backend route tests start the real Express `app` on port `0` with native `fetch`, then close it
after the suite. Provider calls are replaced through the adapter interface or a stubbed client.
Timers are controlled with Vitest fake timers for retry/backoff tests. `vitest-axe` covers automated
accessibility checks on key states.

**Rationale**: The constitution permits Vitest/RTL/jest-dom/vitest-axe; adding another mocking
framework is unnecessary. Testing through the adapter interface also proves the provider boundary is
replaceable. Native HTTP integration exercises the real middleware, validation, and error envelope.

**Alternatives considered**:

- MSW: rejected as an unnecessary development dependency for a small, explicit contract.
- Supertest: rejected; native `fetch` covers the same route-level behavior without another package.
- Snapshot-only tests: rejected; they do not prove behavior or accessibility.

---

## Resolved spec open questions

These remain product assumptions in the specification, not technical blockers:

- **OQ-02 (trending window/pagination)**: weekly preview only; no "See all" because no page request
  parameter is documented.
- **OQ-03 (region ordering)**: no region parameter and no regional claim.
- **OQ-05 (attribution placement)**: page-level attribution region on each catalog surface; no
  global footer.

## Remaining release dependencies

- Current TMDB terms, attribution wording, official logo variant, artwork use, caching limits, and
  rate-limit behavior must be confirmed before production (OD-13).
- Deployment origin/API base configuration and the image-host CSP must be set per environment.
