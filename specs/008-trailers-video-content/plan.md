# Implementation Plan: Trailers and Video Content

**Branch**: `feat/008-trailers-video-content` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-trailers-video-content/spec.md`

## Summary

Add a provider-backed trailer surface to the existing movie and TV detail pages. It lists eligible
promotional videos for the title, ranks them deterministically, and plays one only after an explicit
visitor activation, using YouTube's documented privacy-enhanced embedded player. Every activation is
preceded by a third-party disclosure adjacent to the list, and the canonical YouTube watch destination
is always available as the recovery and external-viewing path. Walplay never hosts, proxies, extracts,
or re-hosts video, never inspects player internals, and never contacts the video platform before
activation.

Technical approach, in short:

- Extend the existing TMDB integration rather than add a provider or dependency. TMDB's documented
  movie and TV `/videos` operations are the initial inventory source behind a new provider-neutral
  `TrailerProvider` interface. No new runtime dependency, SDK, or player library.
- Add one additive GET endpoint under the existing `/api/catalog` boundary:
  `GET /api/catalog/:mediaType/titles/:itemId/videos`. It returns a bounded, normalized, ranked
  inventory plus freshness metadata. No existing route changes. The endpoint is mounted only when
  `TRAILERS_ENABLED=true`.
- Normalize provider records into an internal model: drop invalid, unknown-type, non-YouTube, and
  unusable-identifier records; collapse duplicates by platform video identifier; keep the official
  flag strictly tri-state; never translate provider titles; never use `size`, country, or rating fields
  as claims; construct the documented embed and canonical watch URLs server-side from the validated
  identifier, using configured host allowlists.
- Add `TrailerService` with a dedicated in-memory `CatalogCache` (fresh 24 h, last-known retention
  7 days), explicit `no-videos` and failure states, and stable error codes reused from the existing
  envelope.
- Extend `entities/catalog` with trailer models, Zod envelope, client, query key, query hook, and
  deterministic ranking. Add `features/play-trailer` for selection, activation, player lifecycle,
  width compliance, load timeout, and announcements. Add `widgets/title-detail/ui/TrailerSection.tsx`
  and compose it after the detail actions. Replace the legacy feature-004 external-only trailer link
  with an in-page entry anchor that appears only when at least one eligible video is known, and remove
  the now-unused single-trailer field from the detail response and mapping so only one trailer
  pathway exists.
- Render the player only after activation, in a reserved 16:9 area, in the privacy-enhanced host, with
  a documented non-suppressing referrer policy, an accessible frame name, no overlay, and the
  platform's own controls intact. A measured-width rule prevents an undersized player below the
  platform's 200 × 200 CSS-pixel minimum, falling back to the external option with a stated reason.
- Detect player failure only through a load timeout, because a cross-origin frame exposes no reliable
  error signal. The adjacent external option is therefore always present next to the player, not only
  after a detected failure.
- Gate the capability with `TRAILERS_ENABLED=false` (backend) and `VITE_TRAILERS_ENABLED=false`
  (frontend). The surface is implemented and tested with flags enabled but ships disabled until the
  spec's Open Decisions are resolved. The required Product Overview and feature 004 amendments were
  completed on 2026-11-24.
- No database, no server persistence, no local persistence, no new top-level route, no per-video
  address, no playback telemetry, and no third-party request before activation.

## Technical Context

**Language/Version**: TypeScript 5.9 strict in both applications (`strict`,
`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
`noUnusedParameters`, `verbatimModuleSyntax`). Node.js 22.12+ per both manifests.

**Primary Dependencies**:

- Frontend (existing, no additions): React 19, Vite 7, React Router 7, Tailwind CSS 4 via
  `@tailwindcss/vite`, `@tanstack/react-query` v5, `zod` 4, `i18next` + `react-i18next`.
- Backend (existing, no additions): Express 5, `zod` 4, Node native `fetch`/`AbortSignal`. Reuses the
  TMDB client, `CatalogCache`, centralized error envelope, request IDs, CORS middleware, and logger.
- Playback: the platform's documented `<iframe>` embed only. No YouTube IFrame Player API script, no
  SDK, no player framework, and no postMessage integration.

**Storage**: No database and no server persistence. Trailer inventory uses a dedicated process-local
`CatalogCache` instance with single-flight and an entry cap. The browser stores nothing for this
feature: no selected-video persistence, no viewing history, no cookies, and no local storage writes.

**Testing**: Vitest + React Testing Library + jest-dom + `vitest-axe` for frontend unit, component,
and router tests. Vitest for backend mapper, provider, service, config, and real-Express route
integration tests on an ephemeral port. All provider traffic is mocked; no automated test contacts
TMDB or YouTube. Fake timers cover the player load timeout; controlled clocks cover freshness and the
seven-day retention boundary. Tests also cover the loading skeleton's `aria-busy` with hidden
decoration, the single player-readiness announcement, the visible caption-availability statement, the
provider request carrying no language parameter, and the disabled-capability page state.

**Target Platform**: Evergreen desktop and mobile browsers (latest two major versions); Node.js
22.12+ server deployed independently.

**Project Type**: Web application — existing React SPA (`frontend/`) plus existing JSON API
(`backend/`).

**Performance Goals**: At most one trailer-inventory request per title and media type per client cache
window; zero third-party requests before activation; one iframe at a time; iframe created only after
activation; inventory and region/availability surfaces load in parallel after the core detail
identity gate, so no new request waterfall; the API caps a ranked inventory at 24 videos and the
section renders at most six before in-place expansion; no polling, prefetch, preconnect, or
speculative title prefetch; the detail route remains a lazy chunk.

**Constraints**: No credential, provider DTO, provider field name, provider id, or raw provider error
in the browser, assets, logs, or errors; no stream URL, media file, download, probe, scrape, or
embeddability pre-check; the only third-party origins are the configured embed host and canonical
external host; HTTPS only; non-suppressing referrer for the frame; 16:9 reserved area; no overlay;
platform controls intact; no autoplay before explicit activation; WCAG 2.2 AA; no horizontal scrolling
at 360/768/1024/1440 px or 200 % zoom; design tokens only; English and Spanish Walplay copy with
provider titles untouched; 80 % global coverage and 90 % on trailer eligibility, ranking, dedupe,
playback-state mapping, player lifecycle, and URL authorization; zero unexpected test warnings.

**Scale/Scope**: Two media types, two locales, one additive API endpoint, one provider adapter, one
new detail section, one interaction feature, one in-memory cache, no persistence. Initial eligible
types are trailer, teaser, clip, featurette, behind the scenes, and bloopers. Initial embedded platform
is YouTube only. The API returns at most 24 ranked videos; the section shows six before in-place
expansion.

**Unknowns**: None for planning. Open Decisions OD-T2 through OD-T11 remain release gates owned by
legal/product; they are implemented as disabled capability flags and documented release dependencies,
not improvised in code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One responsibility per module; no speculative abstraction; reuse existing primitives | PASS — one trailer domain, one provider interface, one adapter, one service, one controller, one router, one feature, one presentational section family; eligibility, ranking, URL authorization, caching, and player lifecycle are separate units; no generic media framework |
| II. Strict TypeScript | Strict flags, no `any`, Zod at every boundary, literal unions, `z.infer` contracts | PASS — TMDB video DTOs and the API envelope are Zod schemas; type, playback, and availability states are literal unions; provider input is validated and narrowed; no `as` used to silence the compiler |
| III. Feature-Sliced Design | Downward imports only, public `index.ts`, no same-layer imports | PASS — trailer models/API/query extend `entities/catalog`; `features/play-trailer` owns activation and player lifecycle; `widgets/title-detail` owns presentation and imports the feature downward; `pages/title-detail` owns the inventory query and the entry-point decision; no widget imports another widget |
| IV. Arrow Function Syntax | Arrow functions in frontend application code; ESLint enforced | PASS — all new frontend code uses arrows; backend follows Principle V |
| V. Backend Architecture | `routes → controllers → services → provider adapters`, Zod on every input, centralized errors | PASS — no persistence, so no repository layer and no database; `trailer.routes.ts` → `trailer.controller.ts` → `trailer.service.ts` → `TrailerProvider`/TMDB adapter; params and query validated with strict Zod schemas; existing error middleware reused |
| VI. React Component Design | Small typed components, logic in hooks, discriminated unions | PASS — section, list, item, cover, player, and state components are small and prop-driven; selection/player logic is a typed hook; section state is a discriminated union; no data fetching in presentational components |
| VII. Styling & Tokens | Tailwind 4 only, `@theme` tokens, skeleton/empty/error states, no overlays, reduced motion | PASS — tokens only; layout-matched skeleton; distinct loading, no-video, error, ready, playing, and unavailable surfaces; no element is placed over the player; no attention-seeking motion |
| VIII. Testing & Zero Warnings | Vitest/RTL, observable behavior, every async state, coverage, no unexpected warnings | PASS — test strategy below covers DTO mapping, eligibility, dedupe, ranking, URL validation, service freshness/retention, route contracts, every section state including loading, activation privacy and readiness, timeout, width fallback, disabled-capability gating, caption statement, keyboard, a11y, i18n, and responsive contracts |
| IX. Performance | Route splitting, no waterfalls, lazy third-party media, deliberate caching | PASS — one inventory request per title/type, one iframe after activation, no preconnect/prefetch, no polling, server cache with single-flight, bounded list, cards already lazy |
| X. Resilience | Fault isolation, timeouts/retries/cache, stable codes, labeled stale data | PASS — dedicated endpoint, service, cache, query, and section; trailer failure cannot block detail, availability, seasons, credits, related, or personal lists; stale inventory is labeled and expires after seven days; existing provider timeout/retry policy reused |
| XI. API Contracts | Zod source of truth, single error envelope, correct status mapping, explicit CORS, no-store | PASS — `contracts/trailer-inventory-api.md`; existing error envelope and CORS allowlist; `Cache-Control: no-store`; provider-neutral shapes; stable error codes; no provider DTO exposure |
| XII. Constants & Configuration | Named business constants, centralized validated config, no magic values | PASS — eligible types, type order, identifier pattern, URL parameter set, host allowlists, cache TTLs, retention, visible maximum, and width/timeout thresholds are named constants or validated config; `.env.example` updated |
| XIII. Security | Secrets server-side, untrusted provider input validated, no XSS or open redirect, no sensitive logs | PASS — TMDB token stays backend-only; provider payloads validated and never surfaced; provider titles rendered as React text, never HTML; only server-constructed, HTTPS, host-allowlisted platform URLs are returned; no visitor identifier or token in the frame URL; no playback telemetry; frame origin restricted to the configured embed host |
| XIV. Accessibility | WCAG 2.2 AA, semantic structure, keyboard, live regions, targets, reduced motion, conditional media rules | PASS — labelled region and list, accessible frame name with title and platform, platform controls receive focus and remain operable, visible app focus, no keyboard trap, one announcement per state change, text for every state and playback mode, 44 px app controls, reduced motion respected |
| XV. Internationalization | i18next only, externalized text, `Intl` formatting, provider-supplied titles untouched | PASS — new `detail.trailers` namespace in both locales; `Intl.DisplayNames` for video languages; `Intl.DateTimeFormat` for dates; provider titles and platform names never translated; API returns stable codes, not localized errors |
| XVI. Documentation | Plan, ADR for durable decisions, English, contracts current | PASS — plan, research, data model, three contracts, quickstart; ADR-0007 records the inventory boundary, player limits, sizing rule, timeout-only detection, ranking, and release gating; the required Product Overview and feature-004 amendments were completed on 2026-11-24 and are verified by T091/T092 |
| XVII. Quality Gates | Same `lint`/`typecheck`/`test`/`build` contract; hooks and CI unchanged | PASS — no new scripts or hooks; both applications already expose the contract; no commit is created by this plan |
| XVIII. Server State | TanStack Query exclusive, key factory, deliberate `staleTime`/`gcTime`, no fetch in components | PASS — key added to the existing factory; `staleTime` = 24 h, `gcTime` ≥ staleTime, `retry: false`; activation and player state are local interaction state, not server state; no component fetches |
| XIX. Prisma Persistence | Prisma/PostgreSQL official persistence | N/A — no persistence; a database would be unjustified for read-only provider inventory |
| XX. External Providers | Isolated adapter, Zod validation, internal models, timeout/retry/cache, documented/authorized mechanisms, deferred-capability rule | PASS — TMDB video access is isolated in `TrailerProvider`/TMDB adapter; validated DTOs; documented `/videos` operations only; no scraping, probing, DRM, region, age, or access-control bypass; the capability is release-gated behind disabled flags until legal/platform decisions are resolved |
| XXI. Stack Governance | Approved stack only, new dependencies justified, lockfiles committed | PASS — zero new dependencies; native `<iframe>` playback; no player SDK, state library, date library, or UI kit |
| Visual Identity / Design System | Walday Dark UI tokens, typography, spacing, focus, responsive, reduced motion | PASS — existing tokens and shared primitives; no raw colors; no overlay framing of the player; long titles wrap; status text remains readable at 200 % zoom |

**Post-design re-evaluation**: PASS. Phase 1 adds no technology, persistence, provider, route
destination, or dependency. The single endpoint extends the existing catalog boundary. The only new
storage is a process-local cache. The player is a documented third-party iframe created on activation
only. Legal, platform, consent, and attribution gates remain disabled by default and are recorded as
release dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/008-trailers-video-content/
├── plan.md              # This file
├── research.md          # Phase 0 decisions and rejected alternatives
├── data-model.md        # Phase 1 entities, invariants, ranking, and state transitions
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/
│   ├── trailer-inventory-api.md   # Endpoint, response states, meta, errors
│   ├── player-activation.md       # UI, sizing, privacy, activation, timeout contract
│   └── i18n-resources.md          # Translation keys and localization rules
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── .env.example                                    # TRAILERS_* defaults
└── src/
    ├── app.ts                                      # mount trailer router when enabled
    ├── server.ts                                   # wire TMDB trailer provider + cache
    ├── config/env.ts                               # trailer flags, TTLs, hosts, limits
    ├── controllers/
    │   └── trailer.controller.ts                   # validate params/query, call service
    ├── domain/
    │   ├── detail.ts                               # remove legacy single-trailer field
    │   ├── trailer.ts                              # models, constants, eligibility, ranking
    │   └── trailer.schemas.ts                      # response envelope Zod schemas
    ├── providers/
    │   ├── trailer-provider.ts                     # internal provider interface
    │   └── tmdb/
    │       ├── tmdb.detail.mapper.ts                # remove single-trailer selector
    │       ├── tmdb.detail.provider.ts              # stop appending videos to detail
    │       ├── tmdb.detail.schemas.ts               # remove unused video DTO
    │       ├── tmdb.trailer.schemas.ts              # Zod DTO for /videos
    │       ├── tmdb.trailer.mapper.ts              # eligibility, dedupe, URLs, ranking
    │       └── tmdb.trailer.provider.ts            # documented movie/TV videos operations
    ├── routes/
    │   └── trailer.routes.ts                       # additive GET endpoint, no-store
    ├── services/
    │   └── trailer.service.ts                      # cache, freshness, retention, stable errors
    └── test/fixtures/
        ├── fakeTrailerProvider.ts                  # deterministic provider samples
        └── tmdb/trailers.ts                        # DTO fixtures incl. malformed records

frontend/
├── .env.example                                    # VITE_TRAILERS_ENABLED default
└── src/
    ├── entities/catalog/
    │   ├── model/
    │   │   ├── titleDetail.ts                      # remove legacy trailer field
    │   │   ├── trailer.ts                          # Zod API models, ranking, playback unions
    │   │   └── trailerFormatting.ts                # type/language/date labeling helpers
    │   ├── api/
    │   │   ├── trailerClient.ts                    # inventory request
    │   │   ├── trailerQueries.ts                   # TanStack Query hook + timings
    │   │   └── catalogKeys.ts                      # trailer inventory key
    │   └── index.ts                                # extend public API
    ├── features/play-trailer/
    │   ├── model/useTrailerPlayback.ts             # selection, activation, timeout, player state
    │   ├── model/useEmbedWidth.ts                  # measured width compliance
    │   └── index.ts
    ├── pages/title-detail/
    │   └── ui/TitleDetailPage.tsx                  # inventory query, entry point, section status
    ├── shared/
    │   ├── config/
    │   │   ├── detailCapabilities.ts               # trailer from validated config
    │   │   ├── env.ts                              # VITE_TRAILERS_ENABLED
    │   │   └── trailerPlatform.ts                  # platform name, sizes, timeout, limits
    │   └── i18n/resources/
    │       ├── en.json                             # detail.trailers keys
    │       └── es.json                             # detail.trailers keys
    ├── widgets/title-detail/
    │   ├── ui/TrailerSection.tsx                   # region, disclosure, states
    │   ├── ui/TrailerList.tsx                      # items, expansion, selection semantics
    │   ├── ui/TrailerItem.tsx                      # one video's identity, type, mode, actions
    │   ├── ui/TrailerCover.tsx                     # pre-activation cover and disclosure
    │   ├── ui/TrailerPlayer.tsx                    # reserved area, iframe, load timeout
    │   ├── ui/DetailActions.tsx                    # replace external-only link with entry anchor
    │   ├── ui/TitleDetailView.tsx                  # compose section after actions
    │   └── index.ts
    └── test/fixtures/
        └── trailer/index.ts                        # API envelopes and UI samples

docs/
├── adr/0007-trailer-inventory-and-embedded-playback-boundary.md
└── product-overview.md                             # record promotional trailers vs deferred title playback

specs/004-entertainment-details/spec.md             # supersede FR-065/FR-066 for trailers
```**Structure Decision**: The repository is an existing two-application web project. The feature adds
one backend domain/provider/service/controller/router family and one frontend entity extension, one
feature slice, one widget section family, and configuration/i18n additions. No new application,
package, or top-level route is introduced. The legacy trailer entry point and its detail-time video
fetch are removed rather than duplicated, because feature 004's external-only rule is superseded for
trailers by the approved clarification.

## Delivery Gates (release dependencies, not design blockers)

1. **Product Overview amendment — COMPLETED 2026-11-24**: authorized promotional trailers are recorded
   as a conditional capability separate from deferred in-app title playback (Sections 5, 6, 7, 9, and
   11; BR-11; OD-05 references). T091 verifies it.
2. **Feature 004 amendment — COMPLETED 2026-11-24**: FR-065 and FR-066 and the affected 004
   contract/data-model notes point at this specification; embedded playback is the preferred mode for
   trailers, external viewing the fallback, and all other 004 rules stand. T092 verifies the
   Markdown/contract text; the legacy fixture fields are removed by T031/T032 during implementation.
3. **Open Decisions**: OD-T2 (embedding/link-out authorization), OD-T3 (official flag), OD-T4
   (inventory caching), OD-T6 (external fallback), OD-T7 (consent), OD-T8 (eligible types), OD-T9
   (child-directed), OD-T10 (attribution/notices), OD-T11 (per-video addresses). Until resolved, both
   capability flags remain `false` and no production enablement occurs.
4. **CSP note**: if an application Content Security Policy is introduced, it must allow
   `frame-src https://www.youtube-nocookie.com` and must not add `noreferrer` to the frame context.
   No CSP exists today; the plan records the constraint rather than inventing a policy.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The feature adds no persistence, no new technology, no new provider, and no new
dependency. The one deliberate strictness beyond the platform minimum (a 16:9 sizing floor at 356 CSS
px so both the 200 px viewport minimum and the 16:9 presentation hold) is a product accessibility
decision recorded in research, not a constitutional exception.
