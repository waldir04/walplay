# Phase 0 Research: Entertainment Details

**Feature**: `004-entertainment-details` | **Date**: 2026-11-22

Each decision below resolves a planning unknown for the approved specification. Rejected
alternatives are recorded so later work does not re-litigate them without new evidence.

---

## D1. Frontend slice placement

**Decision**: Extend the existing `entities/catalog` slice with detail models, API, queries, and
presentational primitives. Add a `features/select-season` slice, a `widgets/title-detail` slice, and
keep `pages/title-detail` as the route/data orchestrator.

**Rationale**: Every detail entity reuses the catalog title identity, `CatalogItem`, formatting
helpers, card, poster fallback, error-state mapping, query client, and attribution widget. The
constitution prohibits sibling entity slices importing each other directly. Feature 003 already
extended `entities/catalog` for the same reason. Detail data is the same title domain, not a separate
domain.

**Alternatives considered**:

- New `entities/title-detail` slice: rejected; it would need `entities/catalog` imports, violating
  the FSD same-layer rule, or force duplication of the title contract.
- Move shared item primitives to `shared`: rejected; `CatalogItem` is a business entity, and
  `shared` must not contain business rules.
- Put everything in the page: rejected; pages would accumulate business rules, data access, and
  presentational components, violating Principles I, III, and VI.

---

## D2. API surface split

**Decision**: Add five additive read endpoints under the existing catalog boundary:

| Endpoint | Surface |
|---|---|
| `GET /api/catalog/:mediaType/titles/:itemId/detail` | Core identity, facts, overview, seasons list, collection membership, rating, popularity, trailer reference |
| `GET /api/catalog/:mediaType/titles/:itemId/credits` | Cast and key crew previews |
| `GET /api/catalog/:mediaType/titles/:itemId/similar` | Similar titles |
| `GET /api/catalog/:mediaType/titles/:itemId/collection` | Collection membership parts (movies) |
| `GET /api/catalog/:mediaType/titles/:itemId/seasons/:seasonNumber` | Season header and episodes (TV) |

The core response is the only required surface. Credits, similar titles, collection parts, and
season episodes fail and retry independently.

**Rationale**: FR-070, FR-072, and FR-076 require secondary surfaces to load and fail independently
once core identity is available. A single aggregate response cannot isolate a credits or similar
failure without either failing the page or fabricating partial success. Five endpoints also let the
frontend request each surface once per key and expose per-surface retry. Similar and collection are
separate endpoints because FR-060 requires each related section to fail independently; a combined
related response would lose the successful section when the other fails.

**Alternatives considered**:

- One aggregate endpoint with `append_to_response`: rejected; a malformed credits block would fail
  validation for the whole response, violating independent failure.
- GraphQL or a BFF: rejected; not in the approved stack.
- Separate top-level `/api/details` namespace: rejected; detail data belongs to the existing catalog
  resource and the existing item address, and a parallel namespace would duplicate parsing,
  validation, CORS, and error wiring.

---

## D3. Core surface identity gate for secondary surfaces

**Decision**: Start credits, similar, collection, and seasons-list-dependent episode queries only
after the core detail query resolves successfully. Episode loading starts after core resolves and
the effective season is known from the core season list.

**Rationale**: FR-070 explicitly allows secondary surfaces to load "once the core identity is
available". Gating prevents four secondary provider calls for malformed or not-found addresses and
secondary requests for adult or removed titles. The single identity gate is not a chain of dependent
requests: after core, credits, similar, and collection load in parallel, and only the episode surface
needs the resolved season.

**Alternatives considered**:

- Request all surfaces in parallel immediately from `itemId`: rejected; wastes provider quota on
  invalid identities and contradicts FR-070's ordering.
- Sequential loading of each secondary surface: rejected; creates avoidable latency and a true
  waterfall.

---

## D4. Season address representation

**Decision**: Represent the selected TV season as a `season` query parameter on the existing detail
address: `/browse/tv-shows/title/:itemId?season=N`. Season `0` is valid and means specials. A
missing, malformed, out-of-range, or non-supplied season resolves to the initial season. Season
changes use `navigate(..., { replace: true })`.

**Rationale**: FR-034 requires the season to be reflected in the address without creating a second
detail destination, and history replacement so back returns to the origin. A query parameter keeps
the pathname and route match stable, so the existing route table, lazy route, origin-return logic,
and Browse current state are unchanged. It also lets the page replace the season without remounting
the page.

**Alternatives considered**:

- Path segment `/seasons/:season`: rejected; would create a second address shape and risk a
  parallel detail destination, contrary to FR-001/FR-034.
- Hash fragment: rejected; not part of the server-visible address contract and awkward for
  restoration and history replacement.
- Client-only state: rejected; violates FR-034 and direct/reload requirements.

**Initial-season algorithm** (FR-035):

1. If `season` parses to an integer in `0..999` and matches a provider-supplied season, select it.
2. Otherwise select the lowest-numbered regular season (`season_number > 0`).
3. If no regular season exists, select the first available provider season (which may be specials).
4. If no seasons exist, do not select or render a season; show only the TV summary facts.

Specials are listed after regular seasons and are never selected by default while a regular
season exists. An explicit valid `season=0` is honored because FR-035 requires a valid address
identifier to select that season; the specials are still labeled as specials and are never treated
as a regular season.

---

## D5. TMDB operations and `append_to_response`

**Decision**: Use only documented TMDB v3 operations:

| Need | Operation |
|---|---|
| Movie core | `GET /movie/{id}` with `append_to_response=videos` |
| TV core | `GET /tv/{id}` with `append_to_response=videos` (response includes season summaries) |
| Movie credits | `GET /movie/{id}/credits` |
| TV credits | `GET /tv/{id}/aggregate_credits` |
| Similar titles | `GET /movie/{id}/similar` or `GET /tv/{id}/similar` |
| Collection parts | `GET /collection/{id}` after reading `belongs_to_collection.id` from the cached movie detail |
| Season episodes | `GET /tv/{id}/season/{season_number}` |

`append_to_response` is used only for `videos` (one appended item, well under TMDB's documented
limit of 20). Collection membership uses a separate call because movie details expose the collection
identity but not its parts.

**Rationale**: The specification names exactly these operations. Appending videos to core keeps the
trailer reference available in the same primary response without a second primary call. Reading the
collection identity from the cached core movie detail avoids asking the frontend for a provider
collection id, which would leak a provider identifier.

**Alternatives considered**:

- Append `credits`/`similar` to core: rejected; couples secondary failures to the core response.
- Fetch the collection id by a second movie-details call even when core is cached: rejected; the
  service reads the core cache key first, and the existing cache already provides single-flight.
- `include_adult` or undocumented parameters: rejected; unsupported for detail operations.

---

## D6. Original-language fallback for overview and tagline

**Decision**: Use the localized response first. When the localized overview is missing and
`original_language` differs from the requested language base, issue one conditional TMDB detail
request with `language=<original_language>` and use its overview/tagline only if usable. The request
is triggered only by an unusable localized overview; a tagline from that response is used only when
it was fetched and usable, otherwise the tagline is omitted. Cache that alternate response under a
key that includes the effective language. Never machine-translate, summarize, or fabricate copy.

**Rationale**: TMDB detail responses expose one localized `overview` and `original_language`; they do
not include the original overview alongside the localized one. FR-015/FR-030 require an
original-language fallback when the selected language is empty. The conditional request is bounded,
only occurs for incomplete localized metadata, and is cached, so it does not affect the common path.
If that fallback request fails, the affected optional field is omitted and the core detail still
succeeds.

**Alternatives considered**:

- Always request twice: rejected; doubles provider traffic for titles with usable localized text.
- Omit the overview whenever localized text is missing: rejected; violates FR-015/FR-030 when a
  usable original-language value exists.
- Translate with an external service: rejected; prohibited by the specification and constitution.

Title fallback does not need a second request because `original_title`/`original_name` is present in
the same response and is already used by the catalog mapper.

---

## D7. Placeholder and empty-value normalization

**Decision**: Normalize with `trim()` and treat empty strings, whitespace-only strings, `null`, and
`undefined` as missing for every optional provider field. Apply a conservative recognizable-
placeholder list per field class:

| Field class | Additional placeholder values treated as missing |
|---|---|
| Titles | `n/a`, `null`, `undefined`, `tbd` |
| Overview, tagline, character, season/episode names, collection names | `n/a`, `na`, `tbd`, `unknown`, `untitled`, `-`, `--`, `—` |

Do not treat `Unknown` or `Untitled` as a placeholder for a primary title, because they can be
legitimate titles.

**Rationale**: FR-027/FR-031 require placeholder text to be treated as missing, but dropping a real
title named "Unknown" would violate trustworthiness. The split keeps normalization honest without
inventing values.

**Alternatives considered**:

- One aggressive global list including `Unknown`/`Untitled`: rejected; risks discarding legitimate
  titles.
- No placeholder handling beyond empty strings: rejected; violates FR-031.

---

## D8. Rating and popularity rules

**Decision**: Reuse the existing rating builder semantics: display only when the average is finite,
`0 < average <= 10`, and `voteCount` is an integer greater than zero. Round to one decimal for
presentation, keep the scale (`10`) and vote count in the contract, and format both with `Intl`.
Display popularity only when finite and greater than zero; keep it in the secondary provider-metadata
area next to attribution, labeled as TMDB popularity, with no comparison or interpretation.

**Rationale**: FR-041 through FR-045 and the existing catalog behavior already encode these rules.
Reusing the same semantics keeps cards and detail pages consistent and avoids a second rating model.
TMDB supplies `vote_average` (0–10), `vote_count`, and `popularity`; popularity is not a quality
signal.

**Alternatives considered**:

- Show ratings with zero votes: rejected; implies a rating from no evidence.
- Blend popularity with rating: rejected; explicitly prohibited.
- Hide vote count: rejected; FR-043 requires accessible scale and vote count.

---

## D9. TV summary and season counting

**Decision**: Show provider-reported `number_of_seasons` and `number_of_episodes` as summary facts
labeled "Seasons reported by TMDB" and "Episodes reported by TMDB", plus first and latest air dates
and up to five usable network names from `networks[].name`. Do not present the counts as
Walplay-calculated and do not describe specials as regular seasons. The seasons section separately
lists regular seasons in ascending order followed by specials. When a provider fact is unavailable,
omit that fact.

**Rationale**: FR-025 requires provider-reported counts, labels that prevent mistaking them for
Walplay calculations, and no specials described as regular seasons. Keeping the provider value and
labeling its source is truthful even when the provider count includes specials; the seasons list is
the authoritative regular/specials breakdown.

**Alternatives considered**:

- Compute a regular-season count and present it as provider data: rejected; it would be a Walplay
  derivation mislabeled as provider information.
- Omit provider counts entirely: rejected; violates FR-025 when supplied.

---

## D10. Status and crew-role mapping

**Decision**: Map provider status strings to a closed internal union:
`released | in-production | post-production | planned | rumored | returning | ended | canceled |
pilot`. Map raw values case-insensitively (`Cancelled` and `Canceled` both map to `canceled`).
Unknown statuses are omitted. Map crew jobs to `director | creator | writer`, accepting
`Director`, `Creator`, `Writer`, `Screenplay`, `Story`, and `Teleplay`; unknown jobs are omitted.
Deduplicate by person + mapped role while preserving provider order.

**Rationale**: FR-024 and FR-051 require localized labels for known values and omission of unknown
raw provider strings. A closed union keeps provider strings out of the interface and lets both
locales translate consistently.

**Alternatives considered**:

- Display raw status/job strings: rejected; provider copy would leak and would not be localized.
- Invent labels for unknown jobs: rejected; violates no-fabrication.

---

## D11. Cast, crew, and related bounds

**Decision**: Cast preview: at most 10 usable credits in provider billing order. Crew preview: at
most 6 usable key credits. Similar titles: at most 12. Collection items: at most 12. Exclude the
current title, duplicate identities, adult-flagged titles, unsupported content types, and titles
without a usable identity/title. Keep each relationship in its own section and omit an empty section
entirely.

**Rationale**: FR-049, FR-051, FR-057, and FR-059 define these bounds and exclusions. A single
relation list merged across types would violate FR-056/FR-057.

**Alternatives considered**:

- Unbounded lists: rejected; violates bounded, scannable presentation and provider payload
  protection.
- One combined "related" list: rejected; explicitly prohibited.

---

## D12. Image sizes and fallbacks

**Decision**: Extend the image resolver with:

| Asset | Size(s) | Use |
|---|---|---|
| Poster | `w342`, `w780` | Hero poster; existing card sizes unchanged |
| Backdrop | `w780`, `w1280` | Supporting atmosphere only |
| Profile | `w185` | Cast/crew portraits |
| Still | `w300` | Episode still images |

All images reserve aspect ratio, use `loading="lazy"` and `decoding="async"`, and fall back to the
existing neutral poster fallback or a neutral person placeholder without layout shift. Backdrop
failure never removes or delays title identity.

**Rationale**: FR-017, FR-018, FR-053, and FR-084 require approved sizes, reserved dimensions,
lazy loading, and fallbacks. Existing image configuration already returns all size buckets; only the
Zod schema and resolver need additive support.

**Alternatives considered**:

- Original-size images: rejected; unnecessary bandwidth and layout risk.
- Backdrop as the hero background carrying identity: rejected; prohibited.

---

## D13. Duration and date formatting

**Decision**: Format movie runtime only for a positive integer up to a named plausibility ceiling
(900 minutes); format as localized hours and minutes using `Intl.NumberFormat` unit formatting plus
a translated join pattern. Format TV episode runtime from distinct positive values: one value =
typical length; several = localized min–max range; no valid values = omit. Parse dates with a strict
`YYYY-MM-DD` check, validate year `1888..2100`, and format using `Intl.DateTimeFormat` in UTC to
avoid timezone shifts. Year-only output is used when only a valid year is available.

**Rationale**: FR-019, FR-021, FR-022, FR-026, FR-086 require locale-aware formatting and truthful
omission of implausible values. Named ceilings prevent `0`, negative, and absurd values from
rendering.

**Alternatives considered**:

- A date/duration library: rejected; `Intl` covers the requirement and the stack prohibits
  duplicate concerns.
- Local-time parsing of date-only strings: rejected; shifts dates across time zones.

---

## D14. Overview expansion

**Decision**: Add a generic `shared/ui/ExpandableText` primitive. It always renders the complete text
in the DOM; when the text exceeds a calibrated preview length (600 code points for title overviews,
320 for episode overviews), it applies a visual clamp and renders a keyboard-operable
`aria-expanded` control with a visible localized label. The full text remains available to assistive
technology whether clamped or expanded.

**Rationale**: FR-016 and FR-038 require an expand control, complete text availability to assistive
technology, and no truncation-only occurrence. Keeping the full text in the DOM avoids an extra
request and preserves text for screen readers.

**Alternatives considered**:

- CSS-only line clamp: rejected; no keyboard expand and no way to reveal the full text.
- Fetching the rest on expand: rejected; slow, unnecessary, and risks a second failure surface.
- Truncating the stored text: rejected; violates assistive-technology access.

---

## D15. Entry-point capabilities

**Decision**: Add `shared/config/detailCapabilities.ts` with the typed shape
`{ readonly trailer: boolean }`, defaulting to `false` in every environment. `DetailActions` receives
capabilities by prop (defaulting to the config) and renders only:

- A trailer link when `trailer === true` **and** the core detail contains a validated authorized
  YouTube trailer key. The link opens the external destination in a new tab with visible external-
  navigation text and `rel="noopener noreferrer"`; no in-page playback, no autoplay.

Availability and personal-list entry points are not implemented because no streaming-availability
provider is approved (OD-D2) and no personal-list capability or persistence exists. Their absence is
the specification's required behavior when a capability is unavailable (FR-063/FR-067).

**Rationale**: FR-061 through FR-068 require supported actions only. Implementing speculative save
mutations, availability routes, or disabled controls would violate the deferred-capability rule and
Principle I. The trailer path is real, testable, and isolated behind one flag until OD-D3/OD-D6 are
resolved.

**Alternatives considered**:

- Render availability/save controls with "coming soon": rejected; explicitly prohibited.
- Add a watchlist API and local persistence: rejected; out of scope and requires a product decision.
- Build a generic capability registry for all future actions: rejected; speculative abstraction.

---

## D16. Caching, retries, and error codes

**Decision**: Reuse the existing `CatalogCache` with one dedicated instance per process and keys:
`tmdb:detail:<mediaType>:<providerId>:<language>`,
`tmdb:credits:<mediaType>:<providerId>:<language>`,
`tmdb:similar:<mediaType>:<providerId>:<language>`,
`tmdb:collection:<mediaType>:<providerId>:<language>`,
`tmdb:season:<providerId>:<season>:<language>`.
Reuse configured fresh/stale TTLs and entry cap. Reuse bounded retries with backoff and jitter only
for idempotent GETs. Map provider failures to existing stable codes
(`CATALOG_TIMEOUT`, `CATALOG_RATE_LIMITED`, `CATALOG_UNAVAILABLE`, `CATALOG_INVALID_RESPONSE`,
`CATALOG_NOT_FOUND`) and add one code, `DETAIL_SEASON_NOT_FOUND` (404), so the frontend can
distinguish a missing season from a missing title and fall back to the initial season.

**Rationale**: FR-094/FR-095 and Principles X/XX require timeout, bounded retries, TTL caching, and
stable codes. A distinct season code prevents an invalid season address from rendering the
title-level not-found page while keeping provider details internal.

**Alternatives considered**:

- Reuse `CATALOG_NOT_FOUND` for a missing season: rejected; the page would incorrectly claim the
  title does not exist.
- Per-surface cache instances: rejected; unnecessary memory duplication for the same key discipline.
- Cache by raw provider URL: rejected; would key on provider shape and couple the cache to TMDB.

---

## D17. Language switching and stale responses

**Decision**: Include the interface language in every frontend query key and in every backend cache
key. Language change creates new query keys; responses for the previous language land in keys the
page no longer reads. A season selection is kept when that season number is still supplied in the
new language's core response; otherwise the initial-season rule applies.

**Rationale**: FR-008 and FR-078 require localized refresh, discarded stale responses, and
preservation of a valid season. Key isolation is the existing pattern in features 002 and 003.

**Alternatives considered**:

- Manually abort and cancel queries: unnecessary; supersession by key already prevents stale
  rendering, and the request timeout bounds orphaned work.
- Keep season by database identity: impossible; season numbers are the provider's stable identifier.

---

## D18. Document title and announcements

**Decision**: Keep a single document-title writer. Add a generic title-override context in
`shared/lib/documentTitle.tsx` so pages can register an override without importing the `app` layer
(Principle III). `usePageTitle` in `app/routing` writes `override ?? t(routeTitleKey)` in one layout
effect; the detail page registers a localized `{{title}} · {{mediaType}}` override while a loaded
identity exists and clears it on unmount or when the identity becomes unavailable. `mediaType` is
interpolated from the localized `catalog.mediaType.*` label, never the raw `movie`/`tv` enum.
Season changes do not move focus; the season control announces the new selection once through a
polite live region and marks the episode region busy while loading. The existing route announcement
continues to handle navigation between titles.

**Rationale**: FR-010, FR-082, and FR-088 require a document title with title and content type, one
announcement per change, and focus on the primary heading for navigation. A page-level effect writing
`document.title` directly would race the layout-level route title: child effects run before parent
effects, so the layout effect would overwrite the detail title on language change. One writer
composing a route key with a page override removes the race. The season change keeps the same
pathname, so the route announcement would not fire; a dedicated live region is required.

**Alternatives considered**:

- Page effect writing `document.title` directly: rejected; the layout's route-title effect runs
  afterward and overwrites it on route or language changes.
- Encode the title in the route handle: impossible; the handle is static metadata and the title is
  data-driven.
- Skip the layout title effect on detail paths: rejected; hidden path coupling and duplicate title
  logic.
- Move focus on season change: rejected; would disrupt keyboard users working through the season
  control.

---

## D19. Testing and provider isolation

**Decision**: Mock all provider traffic in tests through the existing fake-provider pattern and
fixture files. Add fixture sets for complete, every-optional-field-missing, empty-string, invalid,
adult, 404, original-language-only, huge lists, and malformed responses. Assert provider-neutral
output and no provider field names in responses. Use fake timers for any time-dependent formatting
and controlled clocks for cache TTL tests.

**Rationale**: Principle VIII and the zero-warning policy require deterministic tests with no real
network calls. The existing catalog and search suites already use this pattern.

**Alternatives considered**:

- Record/replay against live TMDB: rejected; non-deterministic, credential-dependent, and violates
  test isolation.
- Contract tests against a shared schema package: rejected; the project duplicates frontend/backend
  schemas by existing convention, and contract documents plus mirrored fixtures cover parity.

---

## D20. Release-dependency isolation

**Decision**: Record OD-D3, OD-D4, OD-D5, OD-D6, and OD-D2 as release dependencies. Implement
against the existing attribution widget and configured cache TTLs, and do not improvise attribution
wording, artwork licensing, link-out rights, or retention behavior. Trailer rendering stays behind
`DETAIL_CAPABILITIES.trailer = false` until the link-out decisions are confirmed.

**Rationale**: FR-046, FR-065, FR-092, and FR-097 require current official guidance and authorized
destinations. Guessing these values would violate the constitution's provider and legal rules.

**Alternatives considered**:

- Implement trailer links now with a best guess: rejected; unauthorized link-out.
- Invent attribution copy: rejected; explicitly prohibited.
