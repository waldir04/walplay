# Implementation Plan: Personalized Recommendations

**Branch**: `feat/009-personalized-recommendations` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-personalized-recommendations/spec.md`

## Summary

Deliver one explainable recommendation area on the Home destination. The initial shipment is the
**guest non-personalized baseline**: a clearly labeled provider-popularity section with an in-place
Movies / TV shows scope, an always-reachable "How recommendations work" explanation, honest
loading/empty/error/stale states, provider attribution, and navigation into the existing title detail
destination. No personalization claim is made anywhere.

The initial implementation is frontend-only. It reuses the existing catalog popular list through
`GET /api/catalog/:mediaType/popular?language=&page=1`, the existing `CatalogCard` / `CatalogGrid` /
`CatalogCardSkeleton` contracts, the existing `ProviderAttribution` widget, the existing localized
catalog error classification, and the existing guest saved-library entity (read-only, device-local,
for local exclusion only). It adds no backend route, provider operation, cache, database table,
account, or authentication.

Seed-based personalization (the spec's P1 account-scope story) is **designed but not implemented**.
It is blocked by three independent gates: the open account model (OD-07), provider-terms validation
for recommendation/similar lists (RV-01), and privacy/consent approval for saved-title use (RV-02).
It is also blocked by the post-MVP product decision and the foundation home contract update (RV-04).
Implementing it now would require inventing an account model, which the specification and the
constitution prohibit. The plan records the intended boundary so the later phase can be added without
reworking the guest area.

The whole capability ships **dark** behind `VITE_RECOMMENDATIONS_ENABLED=false`. Tests exercise the
area with the flag enabled; no visitor sees it until the product decision, the `docs/product-overview.md`
update, and the feature 001 home contract update are recorded.

## Scope Decision

| Scope | Status in this plan | Gates |
|---|---|---|
| Guest non-personalized fallback area on Home with an in-place Movies / TV shows scope | Implemented, flag-gated off by default | Product promotion (OD-11), `docs/product-overview.md` Sections 5/6/11 update, feature 001 home contract update (RV-04), media-scope confirmation (RV-17) |
| "How recommendations work" explanation and provider attribution | Implemented with the guest area | Same as above; copy reviewed against RV-14 |
| Guest local exclusion of already-saved titles from the fallback | Implemented, read-only and device-local | Same as above; interpretation recorded in research.md D-06 |
| Account-scope seeded sections, first-use disclosure, dismissals, rotation, reset, personalization toggle | **Deferred design only** | OD-07, RV-01, RV-02, post-MVP product decision, RV-04, approved account persistence |
| Provider recommendation and similar-list endpoint | **Deferred design only** | RV-01, RV-06, account-scope adoption, provider-terms review |
| Guest recommendation preferences, guest dismissals, guest rotation | **Not implemented and not designed as a guest store** | FR-078/FR-133; any future guest model requires a separate capability (RV-15/RV-16) |

## Technical Context

**Language/Version**: TypeScript ~5.9 strict in both applications; React 19.1; Node.js >= 22.12 for tooling.

**Primary Dependencies**: Existing only — React 19, React Router 7, TanStack Query 5, Zod 4,
i18next 25 / react-i18next 15, Tailwind CSS 4, Vitest 3, React Testing Library, jest-dom, vitest-axe,
jsdom. No runtime or development dependency is added.

**Storage**: No recommendation storage is introduced. The in-place media scope is component state and is
never persisted. The guest area reads the existing
`walplay.saved-library.v1` envelope through `entities/saved-library` **only to exclude titles the guest
already saved**; nothing is written and no saved data leaves the device. Account-scope recommendation
preferences are deferred and have no implemented storage.

**Testing**: `npm --prefix frontend run lint`, `run typecheck`, `run test`, `run build`. Vitest + RTL +
jest-dom + vitest-axe for model, component, integration, a11y, responsive, keyboard, locale, and flag
tests. Backend tests remain untouched and green. No test performs a real network request. Tests must
also emit zero unexpected warnings (Principle VIII).

**Target Platform**: Responsive web SPA for modern evergreen browsers (Baseline), WCAG 2.2 AA,
English and Spanish, 360 / 768 / 1024 / 1440 px and 200% zoom.

**Project Type**: Web application in the existing `frontend` + `backend` repository. The initial
release changes only `frontend`. The deferred phase would also touch `backend`.

**Performance Goals**: The area reserves its layout and settles to content, empty, or error within
5 seconds under normal network conditions (SC-021); one provider request per active media scope and
language; no request waterfall; no repeated identical request; Home navigation and saved actions stay
interactive while the area loads or fails.

**Constraints**: No new dependency; no new route, primary-navigation entry, or Settings content; no
account, authentication, or sync; no guest saved-title transmission; no recommendation preference data
in guest scope; provider order preserved after exclusions; at most one fallback section and at most 12
items; no personalization language for provider popularity; no autoplay, carousel, infinite scroll, or
automatic rotation; capability hidden while disabled or unapproved.

**Scale/Scope**: One recommendation area, one fallback section at a time, two media scopes (Movies /
TV shows), up to 12 items; one new widget slice, a config flag, a Home composition change, and one new
i18n namespace. No backend surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | One small widget with pure selection/state functions; no speculative account or backend code; deferred design documented, not built | Pass |
| II. Strict TypeScript | Catalog and saved-library boundaries stay Zod-validated; new config flag parsed and typed; no new `any`; discriminated unions for area/section state | Pass |
| III. Feature-Sliced Design | New code lives in `widgets/recommendation-area`; it imports `entities/catalog`, `entities/saved-library`, and `shared` only; no cross-entity import; Home page composes the widget. The widget component consumes the existing entity query hooks (`useSectionPreviewQuery`, `useSavedLibrary`), matching the existing `catalog-section-preview` pattern; no data-fetching hook is defined in `widgets` or `shared` | Pass |
| IV. Arrow functions | All new frontend functions are arrow functions | Pass |
| V. Backend architecture | No backend change; existing routes, controllers, services, and provider adapters are untouched | Pass (N/A) |
| VI. Component design | Presentational section and card composition; selection and state logic in the widget model; no fetching in shared primitives; reused `CatalogCard`, `CatalogGrid`, `CatalogCardSkeleton`, `ProviderAttribution`, `Button`, `Link`, `LiveRegion` | Pass |
| VII. Styling, tokens, async states | Semantic tokens only; skeleton, empty-with-actions, error-with-retry, and stale labeling defined; responsive grids; visible focus; reduced motion respected | Pass |
| VIII. Testing and zero warnings | Model, component, integration, a11y, keyboard, responsive, locale, flag, and privacy tests; per-path coverage thresholds; zero unexpected warnings | Pass |
| IX. Performance | One request per media scope/language; shared catalog query cache and key; lazy route already in place; no new bundle dependency | Pass |
| X. Resilience and fault isolation | The area fails independently; Home, navigation, saved actions, and catalog are unaffected; stale data labeled; no automatic retry loop | Pass |
| XI. API contracts | Reuses the existing popular-list contract unchanged; no API change in the initial release | Pass (N/A) |
| XII. Constants and configuration | Max items, default media scope, copy keys, and state mappings are named constants; the capability is a validated `VITE_*` flag; no magic values in components | Pass |
| XIII. Security and data protection | No secrets; saved data read-only and never transmitted; no identifiers in requests beyond the existing media type/language/page; provider errors not exposed | Pass |
| XIV. Accessibility | Labelled region and section headings, semantic list, programmatic reason/basis association, live-region announcements, keyboard order, focus-visible, no hover-only access, reduced motion | Pass |
| XV. Internationalization | All Walplay copy externalized under a `recommendations` namespace in `en` and `es`; provider titles remain untranslated; locale-aware labels; no raw keys | Pass |
| XVI. Documentation | Plan, research, data model, contracts, and quickstart record the design, the guest-only delivery boundary, and the release gates | Pass |
| XVII. Quality gates | Uses only `lint`, `typecheck`, `test`, `build`; no commit or push without explicit authorization | Pass |
| XVIII. Server state and local persistence | Popular data is server state through TanStack Query only; saved membership is read through the saved-library entity, not a parallel store; no `useEffect` fetching; no recommendation persistence | Pass |
| XIX. Prisma persistence | Not applicable: no database, table, migration, or server write | Pass (N/A) |
| XX. External integrations | No new integration; the fallback reuses the catalog provider boundary and its existing data. The deferred endpoint would reuse the TMDB adapter behind a provider-neutral interface | Pass |
| XXI. Technology stack governance | No new dependency or stack change | Pass |

No gate violations. No complexity exception is requested.

## Project Structure

### Documentation (this feature)

```text
specs/009-personalized-recommendations/
├── plan.md                  # this file
├── research.md              # Phase 0 decisions
├── data-model.md            # Phase 1 model and invariants
├── quickstart.md            # Phase 1 validation guide
├── contracts/
│   ├── area.md              # UI, state, accessibility, and flag contract
│   ├── fallback-data.md     # existing endpoint reuse + deferred endpoint contract
│   └── i18n-resources.md    # EN/ES key contract
├── checklists/requirements.md # existing specification quality checklist
└── tasks.md                 # generated by /speckit.tasks
```

### Source Code (repository root)

Initial release (implemented):

```text
frontend/
├── .env.example                                  # MODIFIED: add VITE_RECOMMENDATIONS_ENABLED=false
├── vitest.config.ts                              # MODIFIED: hermetic flag env + coverage thresholds
└── src/
    ├── shared/
    │   ├── config/env.ts                         # MODIFIED: parse recommendationsEnabled + warning
    │   └── i18n/resources/
    │       ├── en.json                           # MODIFIED: recommendations namespace
    │       └── es.json                           # MODIFIED: recommendations namespace
    ├── pages/home/ui/HomePage.tsx                # MODIFIED: compose the area after existing content
    └── widgets/recommendation-area/              # NEW widget slice
        ├── index.ts
        ├── model/
        │   ├── constants.ts                      # caps, default media scope, state/copy maps
        │   ├── fallbackCandidates.ts             # exclusion, dedupe, order, limit
        │   ├── recommendationState.ts            # query state -> area/section state
        │   └── recommendationView.ts             # pure composition of scope + saved ids + query state
        └── ui/
            ├── RecommendationArea.tsx            # region, heading, explanation, states
            ├── RecommendationSection.tsx         # "Popular now" section and card grid
            ├── RecommendationMediaScope.tsx      # in-place Movies / TV shows scope
            ├── RecommendationExplanation.tsx     # always-reachable <details> panel
            └── RecommendationSkeleton.tsx        # layout-matching skeleton
```

Deferred design (not implemented by this plan):

```text
backend/src/
├── domain/recommendation.ts / recommendation.schemas.ts
├── providers/recommendation-provider.ts
├── providers/tmdb/tmdb.recommendation.{schemas,mapper,provider}.ts
├── services/recommendation.service.ts
├── controllers/recommendation.controller.ts
├── routes/recommendation.routes.ts
├── config/env.ts                                # RECOMMENDATIONS_ENABLED + cache TTL/stale/cap
└── app.ts                                       # conditional router mount

frontend/src/
├── entities/catalog/model/recommendation.ts
├── entities/catalog/api/recommendationClient.ts
├── entities/catalog/api/recommendationQueries.ts
└── widgets/recommendation-area/model/
    ├── seedSelection.ts                         # most-recent eligible saved titles
    ├── sectionCandidates.ts                     # per-seed pages, collision rule, rotation
    └── useRecommendationPreferences.ts          # account-scope only
```

**Structure Decision**: Keep the existing single-SPA layout and FSD boundaries. Recommendation
presentation and selection rules are a widget because they compose two entities (catalog data and
saved titles) and must not live in `shared` or in either entity. The widget's UI component consumes the
existing entity query hooks directly (the `catalog-section-preview` pattern); the widget model holds only
pure selectors and view derivation, so no data-fetching hook is added outside `entities`. The initial
release deliberately does not add an `entities/recommendation` slice: its only data source is the existing
catalog popular contract, and adding an entity with no unique data or persistence would be speculative.
If the deferred endpoint is approved, its client/model belong in `entities/catalog` beside trailers and
availability, because it is the same provider boundary and the same `CatalogItem` shape.

## Implementation Phases

### Phase 0 — Research and decisions

All decisions are recorded in [research.md](./research.md): delivery split, Home placement, data-source
reuse, media-scope behavior, guest saved-title exclusion interpretation, no guest preference store,
state and error mapping, explanation surface, flag strategy, announcements, attribution reuse, and the
deferred account-scope boundary.

### Phase 1 — Design artifacts

- [data-model.md](./data-model.md): initial guest area/section/item model, exclusion and ordering
  invariants, state transitions, constants, and the deferred account-scope model.
- [contracts/area.md](./contracts/area.md): region composition, headings, card contract, state
  presentation, announcements, keyboard/focus, responsive behavior, and flag behavior.
- [contracts/fallback-data.md](./contracts/fallback-data.md): the reused popular-list contract,
  exclusions, ordering, stale handling, error mapping, and the deferred recommendation endpoint.
- [contracts/i18n-resources.md](./contracts/i18n-resources.md): complete English/Spanish key contract.
- [quickstart.md](./quickstart.md): run and validation guide.

### Phase 2 — Task generation (complete)

`/speckit.tasks` derived tasks in [tasks.md](./tasks.md). Only the initial-release rows in the Scope Decision
table are eligible for tasks. Deferred rows must not become implementation tasks until their gates are
recorded as resolved.

## Dependencies

- **Existing, unchanged**: `GET /api/catalog/:mediaType/popular?language=&page=1`; `useSectionPreviewQuery`;
  `CatalogCard`, `CatalogGrid`, `CatalogCardSkeleton`, `PosterFallback`; `titleDetailPath`;
  `ProviderAttribution`; `Button`, `Link`, `LiveRegion`; `stateForError`; `useSavedLibrary`;
  `titleDetail` route and `from` navigation state.
- **Existing, modified**: `HomePage` composes the area; `AppConfig` gains `recommendationsEnabled`;
  both i18n resources gain the `recommendations` namespace; `vitest.config.ts` gains the hermetic flag
  and coverage thresholds.
- **Documentation prerequisites before enabling (not before building)**: promote recommendations from
  post-MVP (OD-11) with updates to `docs/product-overview.md` Sections 5, 6, and 11; update the
  feature 001 home contract to permit the area (RV-04); confirm the fallback media-scope interaction
  (RV-17); confirm provider terms for the fallback attribution treatment (RV-14) and, for the deferred
  phase, recommendation/similar lists (RV-01).
- **Deferred phase dependencies**: approved account model (OD-07), approved account persistence,
  privacy/legal approval of saved-title use and the first-use disclosure (RV-02), and resolution of
  account retention/deletion for recommendation preferences (RV-06/RV-13).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Recommendations remain post-MVP and OD-11 stays open | Building a user-visible surface would contradict the product overview | The area is hidden by a validated flag that defaults to `false`; tests enable it explicitly; enabling requires the recorded product and documentation updates |
| The feature 001 home contract still restricts Home content (RV-04) | The area could contradict the foundation contract | The plan records the contract update as a release prerequisite; the code remains dark until it is completed |
| Guest saved titles are read for local exclusion while the clarification says guests receive only the non-personalized fallback | Perceived conflict between FR-072 and the guest boundary | Resolved in the spec: FR-028/FR-077 and RD-13 now permit a local, read-only, non-transmitting exclusion read that is not seeding, ranking, or explanation. The decision and its copy treatment are recorded in research.md D-06 and remain a product/privacy review item |
| The spec does not say which provider popular list the single fallback section shows | Choosing silently would create an unsupported product assumption | Recorded as FR-153/FR-154 and RD-17: an in-place Movies / TV shows scope shows one provider list at a time, never merges lists, and preserves provider order; product/design confirmation is RV-17 |
| Saved titles removed from the fallback leave fewer than 12 items | A later provider item could be backfilled, which risks padding | The section shows fewer items; no backfill, no second page, no padding (FR-053) |
| Empty-after-exclusions is mistaken for a provider failure | Misleading state | Distinct empty copy and `role="status"` vs. error copy and `role="alert"`; tests assert the distinction |
| Stale cached popular data is presented as current | Honesty failure | Read `meta.stale` and show a localized "loaded earlier" label with the last-updated time |
| Existing Home tests assert one link, no buttons, and no images | Test churn or false regressions | Default flag stays off in the hermetic test env; existing Home tests remain valid; new flag-on tests render the area separately |
| Language switch duplicates requests or loses state | Performance and UX regression | Query key already includes language; one request per key; media scope stays in component state |
| The explanation becomes hover-only or truncated | Accessibility/truthfulness failure | Use an always-rendered `<details>`/`<summary>` panel; never a tooltip or hover-only surface |
| Config caching in tests hides flag changes | Flaky or false-positive tests | Component tests render the area directly or mock `getAppConfig`; config parser tests cover the flag values |
| Deferred account work is started prematurely | Scope creep and invented architecture | Deferred rows in the Scope Decision table are excluded from task generation until gates are recorded as resolved |

## Post-Design Constitution Check

Re-evaluated after Phase 1 artifacts. The design introduces no new violation.

| Concern | Post-design evidence | Status |
|---|---|---|
| Layer boundaries | `HomePage` composes `widgets/recommendation-area`; the widget imports `entities/catalog`, `entities/saved-library`, and `shared`; no entity imports another entity; no cross-slice internals | Pass |
| Backend untouched | No new route, controller, service, provider, cache, env, or database object in the initial release | Pass |
| Server state | Popular data is read through the existing TanStack Query hook and key; no manual fetch, no `useEffect` fetch, no parallel server store | Pass |
| Local persistence | Saved data is read-only through the saved-library entity; no recommendation write, version, or migration is introduced | Pass |
| Async UX | Skeleton with `aria-busy` and hidden decoration; empty with Browse/Search; error with retry; stale label; pending retry disables duplicate submission; result announced once | Pass |
| Accessibility | Area and section headings, labelled region, semantic list, card accessible names, `role="status"`/`role="alert"`, keyboard-operable details, focus-visible, no hover-only action | Pass |
| i18n | Complete `recommendations` namespace in English and Spanish; interpolation for media type; provider titles untranslated; no raw keys | Pass |
| Privacy | Guest saved identities are read locally only for exclusion, as permitted by FR-028/FR-077; no request carries saved data; no recommendation preference is stored; no account is implied | Pass |
| Performance | One cached popular request per media scope and language; up to 12 cards; no new dependency; layout reserved by skeleton | Pass |
| Scope | One fallback section, an in-place media scope that is component state only (FR-153/FR-154), no personalized section, dismiss, rotation, reset, account prompt, new route, Settings content, backend, ML/AI, or availability filter | Pass |

No unresolved `NEEDS CLARIFICATION` remains for the initial release. The account-scope questions are
not implementation clarifications; they are recorded product and legal gates (OD-07, RV-01, RV-02,
RV-06, RV-13) that the specification already defers. RV-17 confirms the in-place media scope already
recorded as FR-153/FR-154; it is a release confirmation, not an implementation blocker.

## Complexity Tracking

No constitution violations or complexity exceptions. The design adds one widget slice, one Home
composition change, one validated configuration flag, one i18n namespace, and tests. It adds no backend,
storage, account, provider, route, or dependency, which is the minimum needed to deliver the guest
baseline honestly.
