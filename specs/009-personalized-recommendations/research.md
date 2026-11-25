# Research: Personalized Recommendations

**Feature**: `009-personalized-recommendations` | **Date**: 2026-11-25

This research resolves the technical and product-design questions required by the initial guest
release. Account-scope personalization questions are not resolved here; they are deferred product and
legal gates recorded in the specification (OD-07, RV-01, RV-02, RV-06, RV-13) and are not implementation
clarifications.

## D-01 — Delivery split: guest baseline now, account-scope personalization deferred

**Decision**: The initial implementation delivers only the guest non-personalized baseline. Seeded
sections, dismissals, rotation, reset, the first-use disclosure, and the personalization toggle remain
designed in `data-model.md` and `contracts/` but are not implemented until an approved account model
exists.

**Rationale**: The specification itself makes seeded personalization conditional on an approved account
model (OD-07) and on provider-terms (RV-01) and privacy (RV-02) approval. The account model does not
exist in the product or the codebase. The constitution forbids inventing product capabilities in a plan,
and FR-081 forbids showing or implying an authenticated experience until the model is approved.
Implementing account-shaped code now would either invent architecture or produce dead code.

**Alternatives considered**:
- Implement a fake "account scope" over device data. Rejected: it would mix guest and account scopes and
  violate FR-040/FR-083.
- Implement the whole seeded pipeline behind a flag with a stub account provider. Rejected: the stub
  would be speculative, the preference persistence would be invented, and the tests would assert
  behavior the product does not have.
- Ship nothing and wait. Rejected as the only option: the guest baseline is independently useful,
  honest, and fully specified, and building it now de-risks the later account work.

## D-02 — Host surface and placement

**Decision**: Add one recommendation area to the existing Home page, after the existing "Start browsing"
entry. Do not add a route, navigation entry, Settings content, or section on Browse/Search/Saved/detail.

**Rationale**: Confirmed by the specification's clarifications (RD-02) and FR-003/FR-004/FR-005. Home
currently contains the page heading, a tagline, and a working Browse entry. Appending the area preserves
the existing purpose and leaves room for the future personal home summary that the product overview
lists as an MVP capability.

**Alternatives considered**:
- Put the area on Browse. Rejected: Browse is owned by feature 002 and the spec forbids new sections
  there.
- Add a dedicated destination. Rejected: explicitly out of scope (RV-10, RD-02).
- Replace the Browse entry. Rejected: FR-109 requires the home purpose and discovery access to remain.

## D-03 — Reuse the existing catalog popular list; no backend change

**Decision**: The guest fallback reads the existing
`GET /api/catalog/:mediaType/popular?language={en-US|es-ES}&page=1` through
`useSectionPreviewQuery`, then applies recommendation-specific exclusions and caps in the widget. No new
backend endpoint, provider operation, cache, or environment variable is added.

**Rationale**: The specification defines the fallback as the provider's current popular list and says the
catalog feature already consumes it (Appendix A). Reusing that contract is the simplest maintainable
approach: it inherits the provider adapter, Zod validation, cache, error mapping, language handling, and
attribution already reviewed for the catalog. A second endpoint would duplicate that machinery for no
product gain.

**Alternatives considered**:
- Add a `/recommendations/fallback` endpoint. Rejected: no new provider capability is needed; it would
  add backend code, config, cache, and contract tests for identical data.
- Reuse `trending`. Rejected: RD-06 requires a provider popular list, not trending, and no merged or
  Walplay-computed ranking.
- Client-call TMDB directly. Rejected: the provider boundary keeps credentials server-side (FR-136,
  Principle XX).

## D-04 — One fallback section with an in-place media scope

**Decision**: The area renders at most one fallback section at a time. It offers an in-place
Movies / TV shows scope, defaulting to Movies. The selected scope selects one existing provider popular
list; the two lists are never merged or interleaved. The section preserves provider order after
exclusions and shows at most 12 items. The behavior is recorded in spec FR-153/FR-154 and RD-17, with
product/design confirmation tracked as RV-17.

**Rationale**: The spec's fallback is a single provider list, but TMDB's popular list is per media type,
and the product supports both movies and TV shows. A scope control lets the guest discover either
content type honestly while keeping one section and one provider order. It reuses the existing
`catalog.mediaType.*` copy and the established segmented-control pattern from `MediaTypeSwitch`.

**Alternatives considered**:
- Movie-only fallback. Rejected: TV shows would be undiscoverable in the only shipped recommendation
  state, and the feature would not cover both supported content types in guest scope.
- Two fallback sections (movies and TV). Rejected: FR-045 permits at most one non-personalized fallback
  section.
- Merge movies and TV into one list. Rejected: RD-06 prohibits merging provider lists and Walplay
  rankings; it would also break a single truthful basis and provider order.
- Reuse `MediaTypeSwitch`. Rejected: it navigates to Browse routes; the area needs an in-place scope
  change without leaving Home.

## D-05 — Media scope state behavior

**Decision**: The media scope is component state, defaulting to Movies, and is not persisted. It resets
to Movies on a fresh Home load. It is visitor-initiated, deterministic per selection, and does not
change saved data or recommendation eligibility beyond which provider list is shown.

**Rationale**: Persisting a media scope would create a new stored preference not listed in FR-129 and
would raise account/guest scope questions. Component state keeps the feature stateless and honest.
FR-102 requires restoring observable state only "where feasible"; browser back after a detail visit may
reset the scope, which is acceptable and testable.

**Alternatives considered**:
- URL query parameter. Rejected: it adds a new addressable Home state and route-contract complexity not
  required by the spec.
- `localStorage`/`sessionStorage`. Rejected: it creates recommendation preference data in guest scope,
  which FR-078/FR-133 prohibit.
- Use the last Browse media type. Rejected: it introduces a hidden cross-surface signal and is not a
  documented recommendation input.

## D-06 — Guest saved titles: local exclusion only, never a seed

**Decision**: In guest scope, the area reads the existing device-local saved library **only** to exclude
titles the guest already saved from the provider-popularity list. It does not use saved titles to select,
rank, seed, or explain suggestions, and it transmits no saved data. If the saved library is unreadable or
unavailable, the fallback still renders without exclusions. The specification now records this
interpretation explicitly in FR-028, FR-077, RD-13, and SC-022.

**Rationale**: FR-072 explicitly requires the fallback to exclude saved titles, and FR-050 requires a
newly saved title to leave recommendation eligibility. At the same time, the clarification and FR-076/077
prohibit using guest saved titles to obtain recommendations and prohibit transmitting them. Local
read-only exclusion satisfies both: the provider list is obtained independently, the exclusion is a
post-processing step that stays on the device, and no personalization claim is made. The explanation copy
states that saved titles are not used to choose suggestions; it does not imply that guest saved titles
enable personalization.

**Alternatives considered**:
- Do not exclude saved titles. Rejected: violates FR-072/FR-050 and produces a poor, repetitive result.
- Send saved identities to the backend to filter. Rejected: violates FR-077 and feature 007's
  no-transmission rule.
- Store exclusions as guest preferences. Rejected: FR-078/FR-133 create no guest recommendation
  preferences; the saved library already supplies the only needed identity set.

**Review note**: This interpretation touches the boundary between FR-072 and the guest no-use statements.
It must be confirmed with product/privacy during release-gate review. The implementation remains hidden
behind the flag until then.

## D-07 — No guest recommendation preference store

**Decision**: The initial release introduces no storage key, schema, version, migration, dismissals, or
rotation positions for recommendations. Guest scope creates no recommendation preference data.

**Rationale**: FR-078, FR-129, FR-131, and FR-133 prohibit guest recommendation preferences in the initial
release. The only device data read is the existing saved library, which is owned by feature 007.

**Alternatives considered**:
- A guest dismissal key. Rejected: explicitly out of scope and would create a personalization control
  the guest scope must not imply.
- Account-shaped preferences stored locally. Rejected: mixes scopes and invents account behavior.

## D-08 — State model and error mapping

**Decision**: Model the area as a discriminated union of `loading`, `ready`, `empty`, and `error`, with a
`stale` flag carried on `ready`. Map query errors with the existing `stateForError` classification, then
render recommendation-specific localized copy for rate-limited, timed-out, and unavailable/invalid
states. Provider success with zero usable items is `empty`, never `error`. A failed request is never
rendered as an empty result, and an empty result is never rendered as an error.

**Rationale**: FR-074/FR-093 require distinct empty and error states; FR-098 requires stable localized
mappings for timeouts, rate limits, and malformed responses; reusing `stateForError` avoids duplicating
the catalog's error taxonomy.

**Alternatives considered**:
- One generic error message. Rejected: violates FR-098 and gives the visitor no useful distinction.
- Reuse the catalog's copy verbatim. Rejected: the recommendation area needs its own truthful wording and
  must not imply catalog-wide failure.

## D-09 — Explanation surface

**Decision**: Render an always-present "How recommendations work" `<details>`/`<summary>` panel in the
area header. It is keyboard-operable, not hover-dependent, not a dialog, and has no focus trap. Its copy
is localized, names the provider-popularity basis, states that guest saved titles are not used to choose
suggestions, states that Walplay does not apply AI/ML or create a visitor profile, states the guest data
scope and browser-data loss condition, and describes the controls that actually exist (none in guest
scope).

**Rationale**: FR-060/FR-127 require the explanation to be persistently reachable and complete. Native
`<details>` is the smallest accessible mechanism and avoids dialog focus management, backdrop, and
escape handling. It remains available during loading, empty, and error states.

**Alternatives considered**:
- A modal dialog. Rejected: unnecessary focus-trap and dismissal complexity for static explanatory text.
- A hover/focus tooltip. Rejected: FR-063/FR-012 prohibit hover-only access.
- A separate route. Rejected: no new route is allowed.

## D-10 — Capability flag

**Decision**: Add `VITE_RECOMMENDATIONS_ENABLED` to the validated frontend configuration, defaulting to
`false`, with the same strict boolean parsing and warning behavior as the existing availability/trailer
flags. The area renders only when the flag is true. No backend flag is added because the initial release
has no backend surface.

**Rationale**: The specification's release gate requires no interface to present recommendations while
the capability is disabled or unapproved. A validated flag keeps the code testable while ensuring the
shipped default is dark. It mirrors the established feature-008 pattern.

**Alternatives considered**:
- Always render and rely on the product decision. Rejected: violates the release gate and would expose
  post-MVP content.
- Build-time dead-code elimination. Rejected: unnecessary complexity; a runtime validated flag is the
  established pattern.
- Backend flag. Rejected: no backend endpoint is added; a backend flag would control nothing.

## D-11 — Announcements and focus

**Decision**: Use one polite `LiveRegion` for settled area transitions (`ready`, `empty`, `error`,
stale-change) and no announcement for the initial idle state. Announce the retry result once. Keep focus on
the activated control; do not steal focus on initial load. The explanation `<details>` manages its own
native focus. No removal or rotation controls exist in the guest scope, so focus-restoration rules for
those actions are deferred with them.

**Rationale**: FR-108/FR-114 require single announcements and predictable focus. The existing `LiveRegion`
implementation re-announces identical messages safely. Avoiding focus theft on page load preserves Home's
route-focus behavior.

**Alternatives considered**:
- Announce every query render. Rejected: duplicate and noisy announcements.
- Focus the error heading automatically. Rejected: surprising on initial load; `role="alert"` already
  announces.

## D-12 — Attribution reuse

**Decision**: Reuse the existing `ProviderAttribution` widget inside the area, and label the section as
provider popularity in the section heading/sub-label. Provider-supplied title names remain untranslated.

**Rationale**: FR-138 requires the official provider mark and non-endorsement statement wherever provider
data appears; the catalog/detail features already implement and test that treatment. Reusing it keeps one
attribution source of truth. RV-14 may later require recommendation-specific wording; the plan keeps the
copy review as a release-gate item.

**Alternatives considered**:
- New attribution copy/assets. Rejected: risks improvised wording and duplicates the approved treatment.
- Rely on the catalog page attribution. Rejected: the Home area needs its own visible attribution.

## D-13 — Deferred account-scope candidate endpoint

**Decision (deferred, not implemented)**: When the gates clear, add an additive endpoint
`GET /api/catalog/:mediaType/titles/:itemId/recommendations?language=&page=` backed by a provider-neutral
`RecommendationProvider`. The TMDB adapter requests the provider recommendation list first, normalizes and
filters provider-usable items, and falls back to the similar-title list only when the recommendation
response succeeds with zero provider-usable candidates. The response carries `source:
'recommendations' | 'similar'`, the provider-ordered items, and `hasMore`. The two lists are never merged.
A recommendation-list failure maps to the existing stable error envelope and does not trigger the similar
list. The service uses a dedicated `CatalogCache` with configurable fresh/stale TTLs and an entry cap.

**Rationale**: FR-019 and Appendix A define exactly this policy. Reusing the existing detail provider's
patterns (schemas, mapper, cache, error mapping) keeps the later phase small. The `source` field makes the
list choice observable and testable and prevents accidental merging.

**Open questions deferred with the endpoint**: How client-side saved/dismissed exclusions interact with
`hasMore` and "Show different titles" eligibility (FR-047), whether the server or the account model owns
dismissals, and the exact account persistence shape (FR-125/FR-129). These require OD-07 and account
storage decisions and must not be guessed now.

**Alternatives considered**:
- Set-based merging of recommendation and similar lists. Rejected: FR-019 prohibits it.
- Client-side provider calls. Rejected: credentials and provider boundary.
- Reuse the existing `/similar` endpoint as the primary pool. Rejected: FR-019 makes recommendations the
  primary pool; a new source-aware contract is required.

## D-14 — Deferred seed and control model

**Decision (deferred, not implemented)**: In an approved account scope, seeds come only from the active
account's saved titles, ordered by most recent membership (favorites and watchlist equal), capped at two
sections. Each section is bound to one seed and one provider list. Exclusions and collision rules follow
FR-041–FR-044. Dismissals, rotation positions, and the on/off choice are account-scope preferences behind
the approved account persistence; guest scope has none of them.

**Rationale**: These rules are fully specified in the feature spec (FR-028–FR-052, FR-121–FR-130) and
do not need re-derivation. They do need an account model, which is the blocking decision.

**Alternatives considered**: none; the specification is prescriptive. The only design choice is where the
preference data lives, which belongs to the account model owner.

## D-15 — Testing strategy

**Decision**: Use pure model tests for candidate exclusion/ordering/state mapping, component tests for
the area and its states, integration tests for the Home composition and flag behavior, a11y tests with
`vitest-axe` and keyboard interaction, responsive tests using the existing matchMedia harness, locale
tests in English and Spanish, and privacy tests asserting that no request carries saved data and no
recommendation storage is written. Add per-path coverage thresholds for the new widget model and the
configuration flag.

**Rationale**: Principle VIII requires meaningful behavior tests and zero warnings. The feature's highest
risks are truthfulness and privacy, so tests assert the absence of personalization language, the presence
of attribution, the distinct empty/error states, and the lack of saved-data transmission.

**Alternatives considered**:
- Snapshot-only tests. Rejected: not evidence of truthfulness or accessibility.
- Manual-only verification. Rejected: the constitution requires automated coverage for critical rules.
