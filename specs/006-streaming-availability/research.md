# Phase 0 Research: Streaming Availability

**Feature**: `006-streaming-availability` | **Date**: 2026-11-23

Each decision below resolves a planning unknown for the approved specification. The provider
selection, region policy, aggregate-link policy, freshness behavior, and stale-retention behavior
were clarified on 2026-11-23. Remaining open items are legal, commercial, coverage, ad-supported
scope, and future episode-level scope; they are release gates rather than unresolved planning
choices. Rejected alternatives are recorded so later work does not re-litigate them without new
evidence.

---

## D1. Frontend slice placement

**Decision**: Extend `entities/catalog` with availability models, Zod schemas, client functions,
query keys, and TanStack Query hooks. Add `features/select-availability-region` for the versioned
local region preference and selector. Add the availability section to `widgets/title-detail`. Keep
`pages/title-detail` as the data and state orchestrator.

**Rationale**: Availability is a sub-resource of a catalog title and reuses the existing
`MediaType`, item-id contract, HTTP client, error envelope, date formatting, and query provider.
Creating a sibling `entities/availability` slice would require importing `entities/catalog` for the
title identity and media type, which the FSD same-layer rule prohibits. The region preference is a
user interaction with local state, so it belongs in a feature, not an entity. The section is a
composed layout region, so it belongs in the existing title-detail widget. The page already
orchestrates five detail surfaces and is the correct place to coordinate the availability query,
region state, retries, and announcements.

**Alternatives considered**:

- New `entities/availability` slice: rejected; it would need `entities/catalog` imports, violating
  the same-layer rule or forcing duplication of the title contract.
- New `widgets/title-availability` widget: rejected; it would duplicate section composition and
  require the page or title-detail widget to coordinate two widgets. The existing widget already
  composes cast, crew, related, seasons, and actions.
- Put the availability data access inside the section component: rejected; presentational widgets
  must not fetch, and the page already owns the detail-surface orchestration.
- Put region preference in `shared`: rejected; it is a product interaction with validation and
  persistence, not a generic primitive.

---

## D2. Backend API surface

**Decision**: Add two additive read endpoints under the existing catalog boundary:

| Endpoint | Purpose |
|---|---|
| `GET /api/catalog/:mediaType/titles/:itemId/availability?region=CO` | One title's availability in one region |
| `GET /api/catalog/availability/regions` | The validated region allowlist for the selector |

Use a dedicated `availability.controller.ts`, `availability.routes.ts`, and
`availability.service.ts`, mounted at `/api/catalog` when the capability is enabled. When the flag is
off, the router is not mounted and existing routing applies: the title-availability path has no match
and returns `404 ROUTE_NOT_FOUND`, while `/api/catalog/availability/regions` is matched by the
existing `/:mediaType/:section` route and receives its `400 VALIDATION_ERROR`. No provider call is
possible either way.

**Rationale**: The first endpoint is a secondary surface that must fail and retry independently of
the core detail. The second avoids duplicating the backend region allowlist in the frontend and lets
the selector list only validated regions. A separate controller/service keeps provider integration,
attribution gating, region policy, and freshness logic out of the detail controller. The route paths
remain under the existing catalog resource and reuse the opaque item id, CORS, request IDs, error
envelope, and no-store policy.

**Alternatives considered**:

- Add availability to the core detail response: rejected; a provider failure would break the whole
  detail page, violating the isolation requirement and the secondary-surface pattern from feature
  004.
- Put availability in the existing detail controller: rejected; the detail controller would depend
  on a second service and mix two provider concerns; the new feature has its own legal gates,
  cache policy, and region allowlist.
- Use a separate `/api/availability` namespace: rejected; availability is a title sub-resource and a
  parallel namespace would duplicate parsing, CORS, and error wiring.
- Hardcode the region list in the frontend: rejected; it drifts from the backend allowlist and
  bypasses validation.
- Derive the region list from TMDB's watch-provider regions operation: rejected for the initial
  release; that operation lists regions where the provider has data, not the set Walplay has
  validated for release, and it would add a provider call and an overclaim risk. The configured
  allowlist is the safer product contract.

---

## D3. Region allowlist and default

**Decision**: The backend owns a validated allowlist of supported region codes. The initial value is
`CO` and the configuration parser requires `CO` to be present. The frontend fetches the allowlist from
the regions endpoint, localizes names with `Intl.DisplayNames`, and defaults to `CO` when no valid
stored preference exists. A valid stored code outside the allowlist is preserved and shown as an
unsupported-region state; it is never silently replaced with another region.

**Rationale**: The specification requires country-specific availability, an explicit region, and a
selector that lists only regions the source can serve. A configured allowlist is the only way to
make that promise without assuming complete provider coverage. Requiring `CO` preserves the agreed
initial market. The region endpoint gives the frontend a single source of truth. Preserving an
unsupported stored code avoids a silent regional substitution that could mislead the visitor.

**Alternatives considered**:

- Accept any two-letter ISO code and treat absent data as no-information: rejected; it cannot
  distinguish an unsupported region from a title with no offers.
- Auto-detect by IP or device locale: rejected; the clarified policy explicitly prohibits silent
  geolocation and keeps the visitor in control.
- Store the region on the server per account: rejected; there is no account model, and the spec
  requires only same-device retention when storage is available.
- Put `CO` only in the frontend and let the backend accept anything: rejected; the backend must
  enforce the same policy, and a frontend-only list would drift.

---

## D4. TMDB watch-provider operation and provider adapter

**Decision**: Use only the documented TMDB movie and TV watch-provider operations:

| Need | Operation |
|---|---|
| Movie availability | `GET /movie/{id}/watch/providers` |
| TV availability | `GET /tv/{id}/watch/providers` |

Implement them in a new `AvailabilityProvider` interface and a TMDB adapter that reuses the existing
TMDB client, bearer token, timeout, bounded retry with jitter, image resolver, and provider error
types. Validate the response with a Zod DTO. Map only the active region. Do not request the full
watch-provider catalog, scrape JustWatch, call undocumented endpoints, or fetch provider pages.

**Rationale**: TMDB is already the approved metadata provider and the only integration available
without a new vendor or credential. The operation is documented for both media types, returns
country-grouped offers, and is the lowest-complexity path to a truthful first release. The adapter
keeps the feature replaceable if the legal or coverage gates fail. The response may contain many
countries; mapping only the active region bounds the client payload and keeps the contract focused.

**Alternatives considered**:

- Watchmode: documented 54-country coverage including Colombia and provider links, but it is a new
  vendor with new cost, mapping, and legal review. Recorded as the fallback if TMDB fails coverage,
  freshness, or link requirements. Not selected for the initial plan.
- JustWatch direct: the underlying data supplier, but the official partner API shape, pricing,
  coverage, and terms could not be verified during research. Not selected.
- Scrape provider sites or JustWatch pages: prohibited by the specification and constitution.
- Use TMDB's watch-provider regions or provider-list operations to build a complete catalog:
  rejected for the initial release; they do not establish per-title coverage and would create an
  overclaim.
- Add a third-party streaming SDK: rejected; unnecessary dependency and likely undocumented access.

---

## D5. Category mapping, order, and ad-supported offers

**Decision**: Map TMDB group keys to a closed internal category union:

| TMDB group | Internal category | User-facing label |
|---|---|---|
| `flatrate` | `subscription` | Included with a subscription |
| `free` | `free` | Free |
| `ads` | `ads` | Free with ads |
| `rent` | `rent` | Rent |
| `buy` | `buy` | Buy |

Render groups in the fixed order above. Within a group, preserve source display priority ascending,
then source order for ties. Collapse duplicate providers by provider id within a category. Omit
unknown groups, unmapped monetization values, and empty groups. Do not infer a category from provider
name, price, or another group.

**Rationale**: The spec requires distinguishable categories and honest handling of incomplete data.
A fixed group order makes acceptance tests deterministic and keeps the interface stable across
titles. TMDB supplies `display_priority`, which is the closest documented source-order signal.
`ads` remains a distinct category so a free ad-supported offer is not mislabeled as a clean free
offer; OD-SA8 can remove it later without touching the rest of the model.

**Alternatives considered**:

- Merge `ads` into `free`: rejected; it would misrepresent ad-supported availability.
- Omit `ads` in the initial implementation: rejected; the clarified default is to show it when the
  source explicitly supplies it, and the category is isolated enough to remove if OD-SA8 changes.
- Alphabetize providers: rejected; it would discard source priority and introduce Walplay-authored
  ranking.
- Show all categories even when empty: rejected; it would fabricate availability structure.
- Display prices or plan names: rejected; the source does not supply them for this feature and the
  spec defers pricing.

---

## D6. Freshness, staleness, and retention

**Decision**: The backend computes freshness and owns the clock. The availability response carries:

- `meta.lastUpdatedAt`: when Walplay last successfully observed the data.
- `meta.sourceUpdatedAt?`: only when the source supplies a valid timestamp; absent for TMDB.
- `meta.freshness`: `current` or `stale`, based on the applicable timestamp and a 24-hour window.
- `meta.stale`: true when the cache was served stale after a provider failure or when `freshness` is
  stale.
- `meta.source`: `provider`, `cache`, or `stale-cache`.

The applicable timestamp is the earlier of a valid source timestamp and the observation time. Invalid
or future source timestamps are ignored, and the observation time is used. The server cache uses a
6-hour fresh TTL and a 7-day stale/retention TTL. Offers are not returned when the applicable
timestamp is older than seven days; the section shows the source-error state. The frontend formats
the timestamp with `Intl.DateTimeFormat` and never infers source freshness from its own clock.

**Rationale**: TMDB's watch-provider response has no last-updated field. The spec requires a
clearly labeled Walplay check time when the source supplies none, and it requires stale data to be
labeled and expired after seven days. Backend computation makes the behavior deterministic, avoids
client clock skew, and keeps the same result for all visitors. A shorter cache TTL than the 24-hour
freshness window allows the data to refresh without unnecessarily calling the provider on every
request. The seven-day stale TTL implements the clarified retention decision.

**Alternatives considered**:

- Compute freshness in the frontend from `lastUpdatedAt`: rejected; client clock skew and multiple
  tabs would produce inconsistent labels.
- Show the source timestamp as "last updated" when none exists: rejected; it would fabricate
  freshness.
- Keep stale data indefinitely: rejected; the clarified policy is seven days.
- Use a zero stale TTL: rejected; a provider outage would immediately remove useful last-known data.
- Show a generic "recently checked" label without a date: rejected; the spec requires a visible
  localized date and time.

---

## D7. Capability and release gating

**Decision**: Gate the feature with explicit configuration on both sides:

- Backend `AVAILABILITY_ENABLED` (default `false`): when false, the availability router is not
  mounted.
- Backend `AVAILABILITY_LOGOS_ENABLED` (default `false`): when false, the API omits provider logo
  references and the UI shows names only.
- Frontend `VITE_AVAILABILITY_ENABLED` (default `false`): when false, the detail page does not render
  the section or issue availability/region queries.
- `DETAIL_CAPABILITIES.availability` is resolved from the frontend flag, while the page still accepts
  an explicit capability prop for tests.

**Rationale**: The spec requires the section to be omitted when the capability is unavailable and
requires legal, attribution, logo, and coverage gates before release. A dark launch is the simplest
way to implement and test the full experience without exposing an unapproved integration. The
backend gate prevents direct API access when the feature is off; the frontend gate prevents requests
and rendering. The logo gate implements the spec's "names only until permitted" fallback without a
separate UI branch.

**Alternatives considered**:

- Always on: rejected; violates the release gates and the spec's omission requirement.
- Static compile-time flag only: rejected for the backend; a deployed API should be operationally
  disableable. The frontend uses validated environment configuration for the same reason.
- Rely on provider credentials being absent: rejected; TMDB credentials are already present for
  metadata, so credentials do not indicate availability approval.
- Gate only in the UI: rejected; direct API access could still trigger unapproved provider calls.

---

## D8. Region preference storage

**Decision**: Store one global availability-region preference in `localStorage` under a versioned
key (`walplay.availability-region.v1`) with the shape `{ version: 1, region: 'CO' }`. Validate the
value with Zod on read. Missing, malformed, or wrong-version values fall back to `CO` and the invalid
entry is removed safely. A valid code that is not in the current allowlist is preserved and produces
the unsupported-region state. The preference applies to all titles until changed. It is not synced
across devices.

**Rationale**: The clarified policy is a manual selector with Colombia as the default, remembered on
the device, and no automatic geolocation. A versioned schema satisfies the constitution's local
storage rules. Keeping a valid unsupported code prevents a silent substitution. A global preference
matches visitor expectations and avoids a per-title state explosion.

**Alternatives considered**:

- Store the region in the URL: rejected; it would create a second address shape and complicate
  detail return/origin behavior.
- Store it in server state: rejected; no account model and no need to persist this preference on the
  server.
- Reset to Colombia on every session: rejected; the clarified policy is device retention.
- Auto-detect and store without disclosure: rejected; explicitly out of scope.

---

## D9. External destination policy

**Decision**: Allow one aggregate external destination supplied by the availability source, and only
when it passes backend validation. Do not construct provider URLs, do not link provider entries
individually, and do not use a Walplay redirect endpoint. The frontend opens the destination in a new
tab with `noopener noreferrer`, a visible external-navigation notice, and the destination host in the
notice.

Backend validation:

- HTTPS only.
- Host in the configured allowlist (default official TMDB hosts).
- No username/password.
- If a `locale` query parameter is present, it must match the active region; a language-region form
  such as `es-CO` is accepted when its region subtag matches, and a different region is rejected.
- The URL is used exactly as supplied; no path or query construction.

**Rationale**: TMDB supplies one aggregate watch page link, not per-provider deep links. The clarified
policy accepts that aggregate destination and rejects invented provider links. Backend validation
prevents an open redirect or a wrong-region link, and the new-tab behavior preserves the detail
context. Provider entries remain plain text/logo rows, so users are not led to a fabricated provider
destination.

**Alternatives considered**:

- Construct `provider.com/search?title=...` links: rejected; not authoritative, potentially wrong,
  and violates the no-construction rule.
- Link each provider name to the aggregate page: rejected; it would imply a per-provider destination
  that does not exist.
- Omit all external links: rejected; the clarified policy allows one aggregate source page and users
  benefit from the additional source context.
- Add a Walplay redirect endpoint: rejected; unnecessary, adds an open-redirect surface, and breaks
  the "use the supplied URL" rule.
- Use an affiliate or sponsored link: rejected; not authorized and prohibited by the spec.

---

## D10. Attribution and brand treatment

**Decision**: Add an `AvailabilityAttribution` component that displays the required JustWatch
attribution in text and keeps the existing TMDB attribution visible on the detail page. Do not invent
a JustWatch logo or brand treatment. Provider logos are omitted by default until
`AVAILABILITY_LOGOS_ENABLED` is enabled after OD-SA4. The exact JustWatch wording, link, logo, and
placement remain a release gate.

**Rationale**: The spec requires JustWatch attribution when using TMDB watch-provider data and
requires the existing TMDB attribution to remain. The exact official JustWatch treatment was not
confirmed during research. A text-only attribution with the supplier's name is the safest
implementation fallback, and the feature flag prevents an unapproved treatment from being released.
Separating the logo flag implements the spec's names-only fallback.

**Alternatives considered**:

- Invent or approximate a JustWatch logo: rejected; brand misuse and a likely terms violation.
- Use the TMDB logo as a substitute for JustWatch attribution: rejected; it names the wrong source.
- Put attribution only in a footer or an About page: rejected; the spec requires it visible in or
  adjacent to the availability section.
- Remove attribution when logos are disabled: rejected; the supplier attribution is not optional.

---

## D11. UI state model and placement

**Decision**: The page maps the availability query into a discriminated state:

```text
loading
ready (data.state = available | no-information | unsupported-region)
error
```

On `ready`, a separate `stale` flag controls the last-known banner; the stale state also offers the
retry action required by the spec. The section renders after `DetailActions` and before seasons,
credits, similar titles, and collection. It is not a separate route, page, modal, or collapsible
drawer. The region line remains visible in loaded, no-information, unsupported, and error states. The
selector renders whenever the region list is available, including after an availability-only failure;
when the region-list query itself failed, the region line plus the retry action replace the empty
selector.

**Rationale**: Placement after the action area makes availability visible at the point of intent
without reordering existing content. A discriminated state keeps no-information, unsupported, and
error distinct; the spec explicitly requires that missing information not be presented as an error
or as proof of unavailability. Keeping the region context visible in every non-loading state makes
the regional scope explicit. A separate page would contradict the integration requirement and add a
destination the spec does not want.

**Alternatives considered**:

- Separate availability page: rejected; the spec requires integration into detail pages and no new
  top-level destination.
- Collapsible drawer: rejected; it hides the region and availability context and complicates
  discoverability.
- Treat no-information as an empty error state: rejected; the spec requires an honest distinction.
- Hide the region selector when the availability request fails: rejected; the active region must
  remain explicit and, while the region list is available, the visitor must be able to change it. A
  regions-list failure is different: an empty select would be misleading, so the region line and the
  shared retry replace it.

---

## D12. TanStack Query and cache behavior

**Decision**: Add `catalogKeys.availability(mediaType, itemId, region)` and
`catalogKeys.availabilityRegions()`. The availability key includes media type, title id, and region,
but not language. The regions key is language-independent. Use `retry: false`, a
10-minute client `staleTime` and 30-minute `gcTime` for availability, and a 24-hour `staleTime` with a
24-hour `gcTime` for the region list. Do not poll, prefetch all regions, or include language in the
availability key.

The availability and region-list queries start in parallel after the core detail resolves; the
availability query does not wait for the list. An unsupported stored code is a valid
`200 unsupported-region` response and produces no backend provider call, so requesting availability
for it is not a provider-cost or correctness problem.

**Rationale**: Availability data is language-independent; provider names are supplied and the
interface labels are localized client-side. Excluding language preserves results on a language
switch and prevents duplicate provider calls. The region key ensures a region change never displays
the previous region's offers. `retry: false` keeps retries explicit through the section action. The
server cache handles provider freshness; the client cache only prevents duplicate navigation
requests. The region-list `gcTime` matches its `staleTime` so remounting the detail page does not
silently refetch the list after the default collection window.

**Alternatives considered**:

- Include language in the key: rejected; it would refetch and could drop the region results on a
  language switch, violating the spec.
- Prefetch availability for all regions: rejected; unbounded provider calls and unnecessary data.
- Poll for changes: rejected; no requirement and unnecessary provider load.
- Keep previous region data during a change: rejected; it could display the wrong region's offers.
- Use a client cache longer than the seven-day retention: rejected; the server remains the
  freshness authority.

---

## D13. Provider 404, no-information, and unsupported-region semantics

**Decision**:

- Unsupported region: `200` with `data.state = 'unsupported-region'`, no `meta`, and no provider
  call.
- Provider success with no country entry: `200` with `data.state = 'no-information'` and no
  destination.
- Provider success with a country entry but no usable offers: `200` with
  `data.state = 'no-information'` and the validated destination when supplied.
- Provider 404 for the title: `404 CATALOG_NOT_FOUND`, consistent with the detail surface. The
  frontend does not request availability until the core detail resolves, so this is a defensive
  direct-API path.
- Provider timeout, rate limit, invalid response, or unavailable service: the existing stable error
  codes, mapped through the existing error middleware.

**Rationale**: The spec requires missing information, unsupported regions, source failures, and
not-found titles to be distinct. A 200 no-information response is not an error and must not be
presented as unavailability. An unsupported region is a successful, expected outcome of the selector
and must not produce an error page. Using existing error codes keeps the frontend error mapping and
observability consistent.

**Alternatives considered**:

- Return `CATALOG_NOT_FOUND` for no offers: rejected; it would conflate missing availability with a
  missing title and break the honest no-information state.
- Return a 404 for an unsupported region: rejected; it would surface an error and prevent the
  selector explanation.
- Treat provider 404 as no-information: rejected; a 404 means the title is not found, not that
  availability data is missing.
- Invent new error codes: rejected; the existing codes cover the failure classes and the frontend
  already maps them.

---

## D14. Testing strategy

**Decision**: Use unit tests for schemas, mapping, formatting, and storage; service tests for
freshness/retention and cache behavior; route integration tests against a real Express app with a
fake provider; component tests for every availability state; page integration tests for capability
gating, region changes, language preservation, retries, and failure isolation; axe checks for the
section; and manual quickstart checks against real TMDB data. No automated test calls TMDB.

**Rationale**: The feature spans a provider boundary, a cache with time behavior, a versioned local
preference, and a stateful UI. Each boundary needs a test at its own level. Route integration tests
prove the real app wiring and error envelope; fake providers keep tests deterministic and avoid
provider quota. Controlled clocks are necessary for the 24-hour and seven-day rules. Manual checks
are limited to real provider behavior and attribution, not automated coverage claims.

**Alternatives considered**:

- Live TMDB integration tests: rejected; flaky, slow, provider-dependent, and against the project's
  no-real-network test rule.
- Contract tests only: rejected; they would not prove UI state behavior, cache retention, or local
  storage validation.
- Manual-only validation: rejected; the feature has critical legal and state semantics that need
  automated regression coverage.
- Snapshot tests for the section: rejected; behavior and accessibility assertions are more valuable.

---

## D15. Persistence and playback boundaries

**Decision**: Add no database, no server persistence, no playback, no stream proxy, no provider
account linking, and no subscription or transaction action. The only stored value is the
availability-region preference in browser storage. The only external navigation is the validated
aggregate source page.

**Rationale**: The spec explicitly excludes reproducing content, managing subscriptions,
circumventing restrictions, and live TV. A database would be unjustified for read-only provider
availability. Playback would require separate content rights, DRM, and player work that the
specification does not authorize. The region preference is the only user-level state needed to meet
the clarified policy.

**Alternatives considered**:

- Persist availability in PostgreSQL: rejected; no user data and no query need, and it would add a
  provider data store with legal retention implications.
- Cache logos or streams locally: rejected; unnecessary and potentially outside provider terms.
- Add a player for free providers: rejected; out of scope and requires separate rights.
- Add subscription or rental handoff: rejected; out of scope.

---

## D16. Ad-supported category open decision

**Decision**: Implement `ads` as a distinct internal category and label it "Free with ads". The
category is rendered only when the source explicitly supplies it. OD-SA8 remains open; if the product
decision is to exclude ad-supported offers from the initial set, remove the `ads` mapping and label
without changing the rest of the model.

**Rationale**: The clarified default is to show it when explicitly supplied, and TMDB's official
examples include an `ads` group. A distinct category avoids mislabeling. The mapping is isolated in
one table, so the open decision has a small, testable blast radius.

**Alternatives considered**:

- Drop `ads` until the decision is resolved: rejected for planning; it would hide a supplied
  category and make the default behavior untestable. The release gate can still exclude it.
- Merge into `free`: rejected; misleading.

---

## Summary of resolved planning unknowns

| Unknown | Resolution |
|---|---|
| Where availability data lives on the frontend | `entities/catalog` models/API/queries; feature for region; widget for section; page orchestrator |
| Backend surface | Two additive endpoints under `/api/catalog`; separate controller/service/router |
| Region policy | Configured allowlist with `CO` required; regions endpoint; manual selector; device persistence |
| Provider source | Existing TMDB watch-provider operations via a new provider adapter; no new vendor |
| Category semantics | `flatrate`/`free`/`ads`/`rent`/`buy` mapped to a fixed category union and order |
| Freshness and retention | Backend-computed 24-hour freshness; 6-hour fresh cache; 7-day stale/retention |
| Link policy | One aggregate source-supplied destination; no per-provider links |
| Logos and attribution | Names always; logos behind a flag; text-only JustWatch attribution; existing TMDB notice remains |
| Capability gating | Backend and frontend flags default false; logos flag default false |
| UI states | loading / ready (available, no-information, unsupported-region) / error; separate stale flag |
| Query behavior | Region included, language excluded; no polling or region prefetch |
| Persistence and playback | None; local region preference only |
