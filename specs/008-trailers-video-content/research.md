# Phase 0 Research: Trailers and Video Content

**Feature**: `008-trailers-video-content` | **Date**: 2026-11-24

Each decision below resolves a planning choice for the approved specification. Provider capability,
platform limits, and the privacy/activation posture are established in the spec's Appendix A and are
not re-litigated. Remaining open items are legal, platform, consent, and attribution release gates
(OD-T2 through OD-T11); they block production enablement, not design. Rejected alternatives are
recorded so later work does not reopen them without new evidence.

---

## D1. Backend API surface

**Decision**: Add one additive endpoint under the existing catalog boundary:

| Endpoint | Purpose |
|---|---|
| `GET /api/catalog/:mediaType/titles/:itemId/videos` | One title's normalized, ranked trailer inventory |

Use `trailer.controller.ts`, `trailer.routes.ts`, and `trailer.service.ts`, mounted at `/api/catalog`
only when `TRAILERS_ENABLED=true`. No `language` or `region` parameter is accepted. The endpoint is
read-only, returns `Cache-Control: no-store`, and reuses the existing error envelope and stable codes.

**Rationale**: Trailer inventory must load and fail independently of the detail payload (FR-006), so
embedding it in the detail response would couple failure and force the detail request to carry an
optional surface. The existing `/:mediaType/titles/:itemId/*` family already provides the correct
identity, validation, and containment. No language parameter: provider video titles are never
translated (FR-013, FR-090), type/language labels are localized client-side, and omitting the
parameter keeps inventory language-independent so a language switch never discards or refetches
inventory (FR-027, FR-093). No region parameter: provider country metadata is not availability data
(FR-103) and region restrictions are discovered only through the player or destination (FR-066).

**Alternatives considered**:

- Extend `GET .../detail` with a `videos` field: rejected; it couples inventory failure to the primary
  detail surface and duplicates the existing single-trailer extraction.
- New top-level `/api/trailers` boundary: rejected; the resource is a title sub-resource and already
  has the correct catalog identity and middleware.
- Pass interface language for provider translation preferences: rejected; it makes the cache key and
  the query language-dependent, which conflicts with the requirement not to discard inventory or
  interrupt playback on a language switch, and it risks narrowing the inventory (FR-102).
- Per-video endpoint or deep link: rejected; the spec explicitly excludes per-video addresses and
  deep linking.

---

## D2. Provider boundary and TMDB adapter

**Decision**: Define `TrailerProvider` in `backend/src/providers/trailer-provider.ts`:

```text
fetchVideos({ mediaType, providerId }) -> ProviderTrailerInventory | null
```

Implement it with `createTmdbTrailerProvider`, calling the documented movie and TV `/videos`
operations. Validate responses with a dedicated Zod DTO, map to internal models, and never expose
provider field names, provider record ids, `size`, country, or raw errors. Send no
`include_video_language` filter. Treat a 404 as not-found, an empty `results` array as a valid empty
inventory, and other provider failures through the existing `mapProviderError` mapping.

**Rationale**: TMDB is already the approved initial metadata provider and has documented `/videos`
operations for both media types. The adapter isolates provider shape and satisfies Principle XX. The
language filter is deliberately unused because it could hide the only eligible video (FR-102) and
because region/language filtering is not Walplay's decision here.

**Alternatives considered**:

- Reuse the detail response's `videos` block: rejected; it duplicates the detail request, couples the
  surfaces, and returns an unfiltered, unranked subset with a different lifetime.
- Use a second metadata provider or video search: rejected; FR-010 forbids search/crawling and no
  other provider is authorized.
- Request `include_video_language` for `en,es`: rejected; it narrows inventory and violates FR-102.
- Reuse the single-trailer selector from `tmdb.detail.mapper.ts`: rejected; it selects one trailer,
  ignores other eligible types, and drops the metadata the section must display.

---

## D3. Eligibility, identity, and deduplication

**Decision**: Keep only records that have:

- `site` equal to `YouTube` case-insensitively (the only authorized embedded platform),
- a `key` matching `^[A-Za-z0-9_-]{11}$` (YouTube's canonical identifier length),
- a mapped `type` in `trailer | teaser | clip | featurette | behind-the-scenes | bloopers`,
- a non-empty provider title after whitespace normalization.

Drop everything else rather than inventing values. Normalize type labels with a Walplay-owned mapping;
never display raw provider type values. Collapse records by platform plus identifier (`youtube:<key>`).
The merge rule is: primary record is the first with `official === true`, otherwise the lowest provider
index; take the primary's usable fields first, then fill missing `language` and `publishedAt` from the
next usable records in provider order; official is true if any collapsed record explicitly says true.

**Rationale**: FR-011, FR-012, FR-018, FR-019, FR-052, and FR-095 require safe dropping and a single
item per video. A deterministic merge prevents two list rows for the same video. `official` stays
tri-state: absent/null/non-boolean never becomes a claim (FR-014). Country and `size` are discarded
because they must not be used as availability or quality claims (FR-021, FR-103).

**Alternatives considered**:

- Accept any non-empty key: rejected; malformed or wrong-length identifiers cannot produce an
  authorized embed or canonical destination.
- Keep non-YouTube records as external-only: rejected for the initial release; FR-031 and the spec
  assumption limit the platform to the one whose embedding mechanism was validated.
- Merge duplicates by title: rejected; titles are not identifiers and may collide.

---

## D4. Deterministic ordering

**Decision**: The backend sorts the eligible list with a total, documented comparator and returns it
already ordered. The contract is:

1. type rank: `trailer` (0), `teaser` (1), `featurette` (2), `clip` (3), `behind-the-scenes` (4),
   `bloopers` (5);
2. official: explicit `true` before false/absent;
3. provider order index ascending (stable tiebreaker).

Type labels are localized in the interface; ranking never uses title text.

**Rationale**: FR-022 requires official trailers first, then other trailers, then teasers, then the
remaining types, and a documented stable tiebreaker. Ranking type first and official second satisfies
"official trailers before other trailers" while keeping a single ordered list. Language preference is
applied at render time by the client using the active interface language (see D11), because language
is presentation context and must not require a new request (FR-027, FR-093). Provider order is stable
for a given response, so equal items never shuffle between renders.

**Alternatives considered**:

- Rank by language on the server: rejected; it would make ordering depend on a request parameter and
  force a refetch or re-sort on language change.
- Rank by publication date or "newest first": rejected as the primary rule; it contradicts the
  required type hierarchy and can promote a recent teaser above an official trailer. Publication date
  is display-only.
- Score-based ranking: rejected; unnecessary complexity and not deterministic enough to audit.

---

## D5. Playback mode and URL authorization

**Decision**: The backend derives and validates both authorized URLs from the platform and video
identifier:

```text
embed    https://www.youtube-nocookie.com/embed/<key>?autoplay=1&playsinline=1
external https://www.youtube.com/watch?v=<key>
```

Hosts come from validated configuration (`TRAILERS_EMBED_HOSTS`, `TRAILERS_EXTERNAL_HOSTS`) with
those exact defaults. The client never constructs, edits, or adds parameters to a third-party URL. In
the UI, the playback mode is `embedded` when an embed URL exists and the measured player area meets the
sizing rule (D6); otherwise it is `external`; a video with neither usable URL is dropped at mapping
time and never rendered as playable. Embeddability of the specific video is not predicted: the owner's
setting and platform restrictions are discovered only by the player's outcome (FR-030, FR-066).

**Rationale**: FR-032, FR-047, and FR-052 require documented address shapes, no invented parameters,
and no unauthorized hosts. Server-side construction centralizes authorization and prevents an open
redirect or a client-side URL injection. `autoplay=1` is a documented parameter and is included because
choosing a listed video is the explicit activation that the clarification says starts that video
immediately (FR-034); it is never present on page load because no frame exists before activation
(FR-033). `playsinline=1` is documented and prevents an unwanted full-screen takeover on iOS.

**Alternatives considered**:

- Build URLs in the browser: rejected; it spreads authorization rules and parameter policy across the
  client and invites accidental extra parameters.
- Omit `autoplay=1` and rely on a second click inside the frame: rejected; it contradicts the approved
  activation model that choosing a video starts it.
- Include `mute=1` to defeat browser autoplay blocking: rejected; it starts playback without sound and
  produces a confusing state. Browsers may still block unmuted start; the platform's own controls
  remain available and Walplay does not claim failure.
- Add `enablejsapi`, `origin`, or postMessage control: rejected; it would require a third-party script
  and a player integration Walplay does not need (FR-043).

---

## D6. Player sizing, layout reservation, and width fallback

**Decision**: Reserve a 16:9 area before activation. Measure the available content width with a
`ResizeObserver`. Render the iframe only when the measured width is at least
`TRAILER_PLAYER_MIN_WIDTH_PX = 356` CSS px, which yields a 16:9 viewport of at least 356 × 200.25 and
therefore satisfies both documented platform minimums (200 × 200, and a 16:9 presentation). Below the
threshold, do not render a shrunken player: show a localized explanation and the canonical external
option, and state the reason. If a video had no external destination it would be omitted, but every
eligible YouTube video has one.

**Rationale**: The platform requires at least 200 × 200 CSS px and recommends 480 × 270 for 16:9. At a
360 px viewport the detail page's padded content is narrower than 356 px, so a 16:9 player would be
shorter than 200 px. The rule satisfies FR-039, FR-040, FR-085, FR-086, and SC-010 without distorting
or cropping the video and without introducing horizontal scrolling. The area is reserved with the same
aspect ratio, so activation causes no layout shift.

**Alternatives considered**:

- Render 16:9 regardless of height: rejected; it violates the platform viewport minimum and produces
  clipped or unusable controls.
- Switch to a 1:1 or 4:3 box at narrow widths: rejected for the initial release; it departs from the
  required 16:9 presentation and makes the player's visual behavior inconsistent.
- Full-bleed the player to gain width: rejected; it breaks the detail page's container rhythm and
  would still not guarantee a compliant player at the narrowest supported width.
- Use `aspect-ratio` CSS only without measurement: rejected; the condition depends on available
  container width, not viewport width, and container width can change with zoom and layout.

---

## D7. Activation lifecycle, failure detection, and announcements

**Decision**: Player state is a small discriminated union:

```text
idle | loading | ready | unavailable | external-only
```

- `idle`: default selection exists but no frame; the cover shows the disclosure.
- activation of any listed video (including the selected one) unmounts the previous frame if present,
  sets `loading`, and mounts exactly one iframe for the new video.
- `load` on the iframe sets `ready`; it is not proof of playback, only that the frame loaded.
- a configurable load timeout (`TRAILER_PLAYER_LOAD_TIMEOUT_MS = 15000`) without a `load` event sets
  `unavailable`, unmounts the iframe, and shows the localized explanation plus the external option.
- width below the sizing rule sets `external-only` before mounting, with a stated reason.
- navigating away, switching title, or replacing the video unmounts the frame so no audio or network
  activity continues (FR-035).

Failure copy names the possible causes the platform may be applying — embedding not permitted by the
owner, private/deleted video, age or sign-in restriction, region restriction, or a network/player
block — but asserts none of them, because a cross-origin frame exposes no reliable cause. The
platform's own in-frame message remains visible when it provides one. The external option is always
rendered adjacent to the player area, including in `ready`, so a visitor has a recovery path when no
failure is detected (FR-104, FR-105).

Announce exactly once per transition through the existing `LiveRegion` mechanism: inventory loaded /
no video / inventory error / video selected and player loading / player ready / player unavailable /
external-only fallback. Do not announce the default selection on first render as if it were activation.

**Rationale**: FR-025, FR-026, FR-035, FR-054, FR-055, FR-057, FR-082, and FR-105. Since the frame is
cross-origin and no SDK is used, load timeout is the only honest observable signal. Distinguishing
causes by guessing would violate FR-056 and FR-067. The persistent external option is the recovery
guarantee the spec defines for undetectable failures.

**Alternatives considered**:

- YouTube IFrame Player API: rejected; it adds a third-party script, requires API enrollment and
  terms acceptance, and creates a player integration that the spec does not require.
- Retry loops or probing the frame: rejected; prohibited by FR-055, FR-057, and FR-066.
- Use `onError` on the iframe: rejected; it does not fire for cross-origin policy or player-side
  failures in a way that can be mapped to the required causes.
- Keep the previous frame mounted while loading the next: rejected; FR-029 and FR-035 require at most
  one player and no background audio.

---

## D8. Privacy posture, disclosure, and consent boundary

**Decision**: Before activation the section performs no request to the video platform: no iframe, no
script, no image, no font, no style, no preconnect, no DNS prefetch, no preload, no prefetch, no cookie,
and no storage write. The cover uses the title artwork already loaded by the detail feature or a
Walplay-owned treatment. It names the platform, states that activation loads third-party content, and
links to the platform's terms of service and privacy policy. The disclosure sits adjacent to the list
and every play action (FR-106), not only at page level. The privacy-enhanced host is used by default.
The copy does not claim that third-party processing is eliminated.

**Rationale**: FR-068 through FR-076 and SC-004. The click-to-load gate is a privacy baseline, not a
legal consent solution; OD-T7 remains a release gate. Using already-authorized title artwork avoids a
new third-party image request and respects FR-069.

**Alternatives considered**:

- Load the player lazily on scroll or hover and only start playback on click: rejected; any pre-load
  contacts the platform and violates FR-033 and FR-068.
- Use the platform's thumbnail image on the cover: rejected; FR-069 forbids platform-hosted imagery.
- Treat click-to-load as sufficient legal consent: rejected; FR-074 and the spec explicitly say it is
  not, and consent is jurisdiction-specific.

---

## D9. Referrer and Content Security Policy

**Decision**: Set `referrerPolicy="strict-origin-when-cross-origin"` explicitly on the iframe. Do not
use `noreferrer`, `no-referrer`, or a sandbox that strips the referrer. Do not add query parameters
beyond the documented embed shape. Record the CSP requirement in ADR-0007: a future application CSP
must include `frame-src https://www.youtube-nocookie.com` and must not apply a referrer policy that
suppresses the player request's referrer.

**Rationale**: FR-041, FR-042, and the platform's documented error 153. The application currently has
no CSP, so the plan records the constraint instead of inventing a header policy in this feature.

**Alternatives considered**:

- `noreferrer`: rejected; it breaks playback.
- Add `origin` or `widget_referrer` parameters: rejected; undocumented data beyond the required shape
  and unnecessary without the JS API.

---

## D10. Caching, freshness, and retention

**Decision**: Use a dedicated `CatalogCache` instance:

```text
TRAILERS_CACHE_TTL_SECONDS       = 86400   (24 h fresh)
TRAILERS_CACHE_STALE_SECONDS     = 604800  (7 days last-known retention)
TRAILERS_CACHE_MAX_ENTRIES       = 500
TRAILERS_MAX_INVENTORY           = 24      (server-side ranked cap)
TRAILERS_MAX_VISIBLE             = 6       (visible before in-place expansion)
TRAILERS_PLAYER_LOAD_TIMEOUT_MS  = 15000   (frontend constant)
```

Cache key: provider + `trailers` + media type + numeric provider id. Meta reports
`stale`, `lastUpdatedAt`, `source`, and `freshness`. Beyond seven days from the applicable timestamp,
the service returns the existing unavailable error instead of stale inventory. The client uses
`staleTime` 24 h, `gcTime` 7 days (the server retention boundary, and always ≥ `staleTime`), and
`retry: false`. Expansion reveals additional eligible videos already present in the same response and
never issues a new request.

**Rationale**: FR-020, FR-061, FR-097, and SC-015. The server is the source of truth for retention;
the client must not show data the server would refuse. A 24 h TTL matches the spec assumption and the
availability precedent of explicit TTLs.

**Alternatives considered**:

- Reuse the detail cache TTL (5 min): rejected; trailer inventory changes slowly and would cause
  needless provider calls.
- No stale retention: rejected; FR-061 explicitly allows labeled last-known data within the retention
  period.
- Infinite client cache: rejected; it can outlive the server's retention guarantee.

---

## D11. Frontend slice placement and language behavior

**Decision**:

- Extend `entities/catalog` with the trailer inventory model, Zod envelope, client, key, query hook,
  ranking, and formatting. A sibling `entities/trailer` is not created.
- Add `features/play-trailer` with `useTrailerPlayback` (selection, activation, one-frame lifecycle,
  timeout, announcements) and `useEmbedWidth` (measured width compliance). Width measurement stays
  with the interaction because it determines whether embedding is allowed.
- Add the presentational components under `widgets/title-detail`: `TrailerSection`, `TrailerList`,
  `TrailerItem`, `TrailerCover`, `TrailerPlayer`, and state surfaces.
- Keep `pages/title-detail` as the query and entry-point orchestrator: it starts the inventory query
  after the core detail identity is usable, passes status/data/retry to the section, and renders the
  entry anchor only when the successful inventory has at least one eligible video.
- The default selection is the highest-ranked item, set on first successful render and never started.
  A language change re-ranks the visible list for the next render and updates labels, but preserves the
  current selection and never remounts, restarts, or stops an active player. Selection changes only
  through explicit visitor choice.

**Rationale**: FR-027, FR-093, and the FSD same-layer rule. Trailer inventory is a sub-resource of a
catalog title and reuses `MediaType`, item-id encoding, the HTTP client, the error envelope, and date
formatting; a sibling entity would need to import `entities/catalog`. Activation and player lifecycle
are user interactions, so they belong in a feature. Presentation is a layout region, so it belongs in
the existing detail widget. The page already owns the independent surface query, so it owns the entry
point's gating.

**Alternatives considered**:

- New `entities/trailer` slice: rejected; same-layer coupling or duplicated identity contracts.
- New `widgets/title-trailers`: rejected; it would split section composition across two widgets and
  require a page-level coordination layer for no benefit.
- Fetch inside `TrailerSection`: rejected; presentational widgets must not fetch, and the query must be
  independent of the detail payload.
- Reselect the top item on language change: rejected; it would discard the visitor's explicit choice
  and could surprise a viewer mid-section. Ordering changes; selection persists.

---

## D12. Localization

**Decision**: Add a `detail.trailers` namespace to both English and Spanish resources. Localize type
labels, section headings, disclosures, playback-mode text, availability explanations, external-link
warnings, announcements, expansion controls, and retry copy. Format video language names with
`Intl.DisplayNames` and publication dates with `Intl.DateTimeFormat`. Display provider titles and the
platform name exactly as supplied. Never show a raw translation key; English is the fallback.

**Rationale**: FR-012, FR-015, FR-017, FR-089 through FR-091, and Principle XV. Type labels and
language names are Walplay-owned vocabulary; titles are not.

**Alternatives considered**:

- Translate provider titles: rejected; FR-013 and FR-090 forbid it.
- Use a date library: rejected; `Intl` is already the project standard and no dependency is justified.
- Fetch type labels from the provider: rejected; raw provider values must not reach the interface.

---

## D13. Capability flags and release gating

**Decision**: Add validated configuration:

```text
backend:  TRAILERS_ENABLED=false (default)
          TRAILERS_CACHE_TTL_SECONDS=86400
          TRAILERS_CACHE_STALE_SECONDS=604800
          TRAILERS_CACHE_MAX_ENTRIES=500
          TRAILERS_MAX_INVENTORY=24
          TRAILERS_EMBED_HOSTS=www.youtube-nocookie.com
          TRAILERS_EXTERNAL_HOSTS=www.youtube.com
frontend: VITE_TRAILERS_ENABLED=false (default)
```

`DetailCapabilities.trailer` resolves from `VITE_TRAILERS_ENABLED`. When the backend flag is off, the
router is not mounted and the path falls through to the existing route behavior; no provider call is
possible. When the frontend flag is off, no section, entry point, placeholder, or "coming soon" text
appears (FR-007). Both flags must be enabled together for validation, and production enablement is a
release decision, not a deployment convenience.

**Rationale**: The spec requires the capability to be omitted entirely when unavailable, and the
constitution requires deferred capabilities to be validated before implementation. The availability
feature already established this flag pattern. Enabling only the frontend flag renders the section and
its localized error/retry state because the route is absent; enabling only the backend flag renders no
section and makes no request. Both are documented, non-misleading degradations, and production
enablement requires both flags plus the release gates.

**Alternatives considered**:

- Enable by default: rejected; legal and platform authorization remain unresolved.
- Frontend-only flag: rejected; the section would render an error state because the route is absent and
  no authorized data could be shown.
- Backend-only flag: rejected; an authorized route would exist with no reviewed surface to use it, and
  the capability would be reachable only by direct API calls.

---

## D14. Superseding feature 004's trailer entry point

**Decision**: Replace `DetailActions`' external-only trailer link with an in-page entry anchor rendered
through a new `trailerEntryPoint` prop. The anchor appears only when the trailer capability is enabled
and the loaded inventory contains at least one eligible video; activating it moves focus to the
trailer section heading (`tabIndex={-1}`). Remove the legacy `trailer` field from the detail domain,
detail mapping, TMDB detail DTO, frontend detail schema, and fixtures, and stop requesting
`append_to_response=videos` on the detail call. Remove the legacy `detail.actions.trailer` and
`detail.actions.trailerExternal` translation keys. Only the new inventory endpoint fetches videos, so
no second trailer pathway or duplicate provider call remains.

**Rationale**: FR-004 and the approved clarification; feature 004 FR-065/FR-066 are superseded for
trailers by this specification and must be amended. Rendering both the legacy link and the new entry
point would produce two trailer actions and violate FR-005 and FR-053. Keeping the unused field and
the detail-time video fetch would duplicate work, leave a stale external-only rule in the codebase, and
violate the simplicity principle.

**Alternatives considered**:

- Keep the legacy external link alongside the section: rejected; it duplicates the trailer action and
  contradicts the approved embedded-first model.
- Make the section the entry point itself: rejected; FR-004 requires a detail-page entry point that
  reveals the section and moves focus.
- Remove the entry point and rely on scroll discovery: rejected; FR-004 requires it when a video is
  known, and discoverability would regress.

---

## D15. Testing strategy

**Decision**:

- Backend unit: DTO validation, eligibility dropping, type mapping, tri-state official, dedupe/merge,
  ordering, URL construction and host validation, retention/freshness, error mapping.
- Backend route integration: real Express app, mocked provider; available, empty, not-found,
  validation (malformed item id, media-type mismatch, unknown query), timeout, rate limit, malformed
  provider response, disabled flag, `Cache-Control: no-store`, envelope contract.
- Frontend model: envelope validation, ranking with both locales, label/date/language formatting,
  expansion limit, playback-mode derivation.
- Frontend component: skeleton with `aria-busy`, no-video vs. error distinction, stale label, list
  semantics, disclosure adjacency, item mode text, official label presence/absence, missing language,
  long titles, expansion, external link accessible name and leaving notice.
- Activation/privacy: zero third-party request before activation (assert no iframe and no platform
  URL usage), one frame after activation, replacing a video unmounts the first, rapid successive
  choices keep only the newest, unmount on navigation/unmount, timeout → unavailable + external
  option, width below threshold → external-only with reason.
- Accessibility: axe on all states, keyboard order, focus after section entry, focus after player
  replacement, live-region single announcements, 44 px targets, reduced motion, 200 % zoom.
- i18n: both locales complete, no raw keys, provider titles untranslated, Spanish type/language/date
  labels.
- No real network calls; no warning output; no pending timers.

**Rationale**: Principle VIII and the spec's measurable outcomes. Every behavior in the spec maps to a
test, especially the privacy zero-contact claim and the absence of fabricated official claims.

**Alternatives considered**: none worth recording; this is the project's established test stack.

---

## D16. Documentation changes

**Decision**: Add `docs/adr/0007-trailer-inventory-and-embedded-playback-boundary.md` covering: the
TMDB inventory boundary and cache; YouTube-only embedded platform; privacy-enhanced host; server-side
URL construction and host allowlists; 16:9 sizing floor; timeout-only failure detection; ranking; no
pre-activation contact; release gating. Amend `docs/product-overview.md` to distinguish authorized
promotional trailers from deferred in-app title playback. Amend
`specs/004-entertainment-details/spec.md` FR-065/FR-066 to defer to this specification for trailers.
Keep `.env.example` current.

**Rationale**: Principle XVI and the spec's Scope Status section. These amendments are release gates
recorded in the plan; they do not block design.

**Alternatives considered**:

- Change product documents inside this plan: rejected; plan artifacts describe implementation, and the
  required product amendments need their own reviewed change.
- Skip the ADR: rejected; the player boundary, sizing rule, and failure-detection limitation are durable
  architectural decisions that later work must not silently reverse.
