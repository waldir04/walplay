# Feature Specification: Personalized Recommendations

**Feature Branch**: `feat/009-personalized-recommendations`

**Created**: 2026-11-25

**Status**: Draft

**Input**: Help visitors discover movies and TV shows that may match their interests. Display explainable recommendation sections in appropriate application areas, based on available preferences and saved titles; support guests with non-personalized or locally personalized discovery; support authenticated users only when account-based personalization becomes available; explain why a title is recommended; avoid repeated or irrelevant recommendations; handle insufficient data; provide loading, empty, and error states; allow navigation to recommended title details; and respect user control over personalization. Do not introduce machine learning, AI, paid recommendation services, social feeds, or user profiling beyond documented product requirements.

## Clarifications

### Session 2026-11-25

- Q: What should the initial release do with a guest's saved titles when producing recommendations? → A: Do not use guest saved titles; guests receive the labeled non-personalized fallback. Seed-based guest personalization is deferred.
- Q: Where should the recommendation area live? → A: On the Home destination only, with no new navigation destination.
- Q: Should saved-title personalization be on by default or require opt-in? → A: On by default in an approved account scope, with a first-use disclosure and a one-step off control; a stored off choice is honored.
- Q: Should recommendations exclude titles that are not available in Colombia? → A: No. Recommendations remain metadata-based, and availability remains separate.
- Q: How should the provider's recommendation and similar-title lists be used? → A: Use the recommendation list first; use the similar-title list only when the recommendation list yields no usable candidates; never merge the two lists in one section.

## Product Scope Alignment (Mandatory)

Recommendations are listed in `docs/product-overview.md` as a **post-MVP candidate** with an **Open** decision (OD-11), and Section 11 explicitly excludes "recommendations and personalization" from the initial product. This specification does **not** change that status. It defines the capability so that it can be evaluated and, only after an explicit product decision, enabled without contradicting the product documentation.

| Item | Current product position | Status in this specification |
|---|---|---|
| MVP scope | Recommendations are excluded from the MVP (`docs/product-overview.md` Section 6). | Unchanged. This feature MUST NOT be treated as an MVP deliverable or as an implied commitment. |
| Decision OD-11 | Whether recommendations belong in the product is open. | Still open. Release requires an explicit product decision and an update to `docs/product-overview.md`. |
| Core feature table | Listed as a post-MVP candidate. | Unchanged. This document defines behavior only if the capability is approved. |
| Product promise | No recommendation capability is promised to visitors. | No interface may present recommendations while the capability is disabled or unapproved. |

**Release gate**: The capability MUST NOT be enabled for visitors until all applicable items among the following are recorded:

1. An explicit product decision promoting recommendations into approved scope, with the required updates to `docs/product-overview.md` Sections 5, 6, and 11 and to OD-11.
2. Validation of provider terms, attribution, display, and caching for recommendation and similar-content data, if those sections are offered (see RV-01).
3. Completion of the foundation home contract update defined by feature 001 to permit the recommendation area (see RV-04).
4. Approval of the privacy and consent model for any saved-title use, if seed-based personalization is offered (see RV-02).
5. Approval of the account model (OD-07) if any seed-based personalization is to be offered. Without it, the feature delivers only the non-personalized fallback.

### Guest personalization boundary

Feature 007 establishes that, in guest mode, saved titles MUST NOT be transmitted to a server, uploaded, synchronized, or shared (feature 007's FR-054). The clarified initial release does not use guest saved titles as recommendation seeds, does not use them to obtain provider recommendations, and transmits none of them. It MAY read them locally, read-only, solely to exclude titles the guest already saved from the non-personalized fallback (FR-028, FR-072); that read never leaves the device and produces no personalization claim. Guests receive the clearly labeled non-personalized fallback. Seed-based guest personalization is deferred and is not part of this feature's initial scope.

Consequently:

- Guest scope has no personalized sections and no personalization controls that imply saved-title use.
- Guest saved titles are read locally, read-only, only to exclude already-saved titles from the non-personalized fallback; they are never used to seed, rank, or explain a selection, and no saved data is transmitted.
- Personalized sections are available only in an approved account scope.
- Any future guest personalization requires a separate approved capability and an explicit resolution of feature 007's no-transmission rule (RV-15/RV-16). It MUST NOT be assumed here.
- Without an approved account model, the feature delivers only the non-personalized discovery baseline.

Where this specification conflicts with the product overview, the product overview governs until it is explicitly updated. This specification identifies the conflict rather than reinterpreting it.

## Recommendation Strategy

The initial release uses only explainable, deterministic, provider-supported association. It does not learn, train, rank by inferred taste, or build a user profile.

### Taxonomy of recommendation sources

The feature distinguishes the following source categories explicitly, because they carry different honesty obligations:

| Source category | Definition | Used in the initial release? | Permitted product claim |
|---|---|---|---|
| Provider-generated recommendation or similar list | A provider-supplied association for a seed title. It is not visitor-specific: the same seed and provider parameters produce the same provider results for every visitor. | Yes, but only as the candidate pool for a saved-title section in an approved account scope. | The truthful saved-title basis. Never a claim that the provider list is personalized, that Walplay understands taste, or that the provider endorses the visitor. |
| Derived from watchlist or favorites | A selection whose seed comes from the visitor's saved titles. | Yes, only in an approved account scope. This is the only initial personalization. | "Because you saved {title}" and equivalent truthful wording. |
| Derived from explicit user preferences | A selection driven by user-stated genres, content types, or similar taste preferences. No such preference capability exists in the current product. | No. Conditional and never inferred. | None until a separate approved preference capability exists. |
| Provider popularity or ranking | A provider-supplied current popular list not tied to the visitor. | Yes, as the clearly labeled non-personalized fallback and the guest baseline, one media scope at a time. | "Popular now" with provider attribution. Never personalized language. |

### Supported recommendation bases

| Basis | What determines the selection | Is it personalized? | Permitted user-facing claim |
|---|---|---|---|
| Saved-title association (derived from watchlist or favorites) | The visitor's saved titles and favorites are used as seeds only in an approved account scope; the metadata provider supplies titles associated with each seed. | Yes, when the visitor's saved titles produce the selection in an approved account scope. | "Because you saved {title}" and equivalent truthful wording. |
| Provider popularity fallback | The provider's own current popular list for the active media scope; Walplay does not merge trending or top-rated lists, does not merge movies and TV shows, and does not re-rank it. | No. This is the guest baseline. | "Popular now" with provider attribution. Never "for you", "recommended for you", or "because you watched". |

No other recommendation basis is defined for the initial release. The personalized basis is available only when an approved account scope exists; otherwise only the fallback is available. The preferences that currently exist in the product — interface language and active region — do not express entertainment taste and MUST NOT be used as taste signals. Explicit taste preferences and watched-history signals do not exist yet, are conditional future inputs, and are not inferred (see FR-038 and FR-039).

**Guest scope**: The initial release does not use guest saved titles as seeds or to obtain provider recommendations, and it transmits no saved data. It reads them locally, read-only, only to exclude already-saved titles from the fallback. Guests receive the labeled non-personalized fallback. Seed-based guest personalization is deferred; the seed-based basis is available only in an approved account scope.

### Honesty rules

- **Provider association is not Walplay editorial judgment.** The provider's method for recommending or relating titles is not documented as a Walplay-verified taste model. The product MUST NOT describe provider output as Walplay's algorithm, editorial pick, or understanding of the visitor.
- **Popularity is not personalization.** A list selected only because it is popular is not personalized and MUST NOT be labeled as such.
- **Similarity is not a promise.** A recommended title MUST NOT be described as a match, a good fit, or something the visitor will enjoy. For a personalized item, the only defensible claim is the truthful basis: the visitor saved a seed title, and the provider associated this title with it. A fallback item has only the provider-popularity basis.
- **No hidden sources.** Every displayed recommendation MUST have a truthful, localized, user-visible basis. If a truthful basis cannot be stated, the title MUST NOT be shown.
- **No engagement mechanics.** Recommendations MUST NOT use artificial urgency, scarcity, autoplay, auto-rotation, streaks, or sponsored placement.

### Provider evaluation summary

The approved content metadata provider is TMDB in the initial product. TMDB documents recommendation and similar-title lists for movies and TV series, and popularity-based lists used by the catalog feature. The derivation behind recommendation and similar lists is not documented as a Walplay-verifiable model, so Walplay treats those lists as opaque provider associations. Provider terms, attribution, caching, and display rights for using these lists as recommendations require validation before release (RV-01). Capability evidence is recorded in Appendix A and is non-normative.

**Candidate policy**: When a saved title has both provider lists in an approved account scope, the recommendation list is the primary candidate pool. The similar-title list is used only when a successful recommendation-list response yields no usable candidate after exclusions. A recommendation-list failure shows the section error rather than switching lists. The two lists MUST NOT be merged or interleaved within one section.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get suggestions based on titles I saved (Priority: P1)

A visitor in an approved account scope opens the home destination and sees a small, calm set of titles that are connected to something they saved. Each section names the saved title that produced it, each card opens the correct detail page, and the visitor can ask for different titles without the product pretending to know more than it does.

**Scope note**: This story applies only in an approved account scope. Guest scope does not use saved titles as seeds in the initial release; guests use User Story 2's non-personalized baseline.

**Why this priority**: This is the core value of the feature and its only differentiator in an approved account scope. Guest scope deliberately uses the honest non-personalized baseline rather than transmitting saved data.

**Independent Test**: In an approved account scope with seed-based personalization, seed known saved titles, open the home destination, and verify the personalized sections, their seeds, reasons, exclusions, provider order, navigation, and "Show different titles" behavior using controlled provider results.

**Acceptance Scenarios**:

1. **Given** the visitor is in an approved account scope with seed-based personalization and has at least two resolvable saved titles, **When** the recommendation area settles, **Then** no more than two personalized sections appear, the most recently saved eligible title produces the first section, each section is tied to exactly one saved title, and each item's truthful reason names that saved title.
2. **Given** a personalized section is built from a saved title, **When** the provider returns titles that are the seed itself, already in the watchlist or favorites, already shown in another section, duplicated, adult-flagged, of an unsupported type, or without a usable identity or name, **Then** those titles are excluded and the remaining items preserve the selected provider list's order.
3. **Given** a personalized recommendation card, **When** the visitor activates it, **Then** the matching type-specific detail destination opens for that title and returning to the home destination restores the recommendation area where feasible.
4. **Given** a personalized section with additional usable results in its selected candidate list, **When** the visitor activates "Show different titles", **Then** a different usable set replaces the current items without repeating a currently displayed title, the visitor's position is remembered, the change is announced once, and the control is unavailable with an explanation when no alternative exists.
5. **Given** unchanged saved titles and unchanged provider results, **When** the visitor reloads the home destination, **Then** the same sections, items, and order are shown, with no random shuffle, time-based rotation, or automatic carousel.

---

### User Story 2 - Discover something when Walplay has no personal signal yet (Priority: P1)

A first-time guest, a guest with saved titles, or a visitor in an approved account scope who turned personalization off still finds a useful, honest discovery area. Walplay either shows a clearly labeled provider popularity section or explains the non-personalized basis and offers working ways to browse or search. It never pretends the content was chosen for the visitor.

**Why this priority**: A new visitor must not reach a dead end, and the product's trustworthiness depends on never faking personalization. This story is the guest baseline in the initial release and the fallback for approved account scopes when personalization is off or insufficient.

**Independent Test**: Open the home destination on a fresh browser profile, verify the fallback; in an approved account scope, save one usable title and verify personalization appears; turn personalization off and verify the fallback returns; inspect every label for false personalization claims.

**Acceptance Scenarios**:

1. **Given** a guest, or a visitor in an approved account scope with no personalized section available, **When** the recommendation area settles, **Then** no personalized section is shown, a localized explanation describes the non-personalized basis and does not imply that guest saved titles enable suggestions, working actions open Browse and Search, and a non-personalized "Popular now" section is shown only when the provider supplies a usable list. When an approved account capability exists, the explanation MAY state that saved titles enable personalized suggestions in account scope.
2. **Given** the non-personalized fallback is shown, **Then** it is labeled as provider popularity, it preserves provider order after exclusions, it does not use "for you", "recommended for you", or "because you watched" language, and it does not mix personalized and non-personalized items in the same section.
3. **Given** the visitor is in an approved account scope with seed-based personalization, there is exactly one usable saved title, and the provider returns at least one usable associated title, **When** the area settles, **Then** one personalized section is shown, the state is not presented as an error, and no fallback is substituted inside that section.
4. **Given** the provider succeeds but returns no usable fallback and no usable personalized candidates, **When** the area settles, **Then** the visitor sees a localized explanation with working next actions, not an error and not invented titles.
5. **Given** personalization is turned off in an approved account scope, **When** the home destination is opened again, **Then** no personalized section or personalization claim appears on any subsequent load until it is turned on, and the saved collections are unchanged.

---

### User Story 3 - Understand and control why I see a recommendation (Priority: P2)

In an approved account scope, a visitor can see why each suggestion appears, read a plain explanation of how recommendations work, dismiss a title that does not interest them, and turn personalization off or reset their recommendation controls without affecting their saved titles.

**Why this priority**: Personalization based on personal data requires transparency, reversibility, and user control. This story is not required to render the first recommendation, but it is required for a responsible release.

**Independent Test**: In an approved account scope, verify reasons on every personalized item, open the explanation, dismiss titles, toggle personalization, reset controls, confirm scope and announcements, and prove that watchlists, favorites, catalog, and search are unchanged.

**Acceptance Scenarios**:

1. **Given** a personalized item, **When** it renders, **Then** the truthful reason "Because you saved {title}" is available in visible text and to assistive technology, names only the seed that actually produced it, and does not claim genre matching, similarity of taste, or enjoyment.
2. **Given** the recommendation area, **When** the visitor opens "How recommendations work", **Then** a localized explanation identifies the provider-popularity fallback available in guest scope and, when an approved account capability exists, the saved-title basis available in account scope; it states that guest saved titles are not used to seed or explain suggestions, states that Walplay does not apply AI or machine learning and does not create a separate visitor profile, explains the active data scope, and describes how to dismiss, turn off, and reset where those controls exist.
3. **Given** a personalized item, **When** the visitor marks it as not interested, **Then** it is removed immediately and persistently from recommendations, the change is announced once, focus moves predictably, the item does not reappear until a reset, and no saved collection, catalog result, or search result is changed.
4. **Given** personalization is on in an approved account scope, **When** the visitor turns it off, **Then** personalized sections and claims disappear immediately, a labeled fallback or explanation replaces them, saved titles are unchanged, the choice persists for the active scope, and turning it back on restores recommendations from the current saved titles.
5. **Given** the visitor chooses to reset recommendation controls in an approved account scope, **When** the reset is confirmed, **Then** the confirmation states that dismissals and rotation positions but not saved titles will be cleared, completion is announced, and cancelling changes nothing.

---

### User Story 4 - See an honest state when recommendations cannot load (Priority: P2)

A visitor on a slow or failing connection sees a layout that reserves space, a contained error with a genuine retry, and a home destination that still works. An empty recommendation set is never presented as a failure, and a failure is never presented as an empty set or as fabricated content.

**Why this priority**: Recommendations are optional content. Their failure must not undermine the product's core promise that personal list management and navigation continue to work.

**Independent Test**: Simulate slow, empty, partially failed, rate-limited, timed-out, and fully failed provider responses; verify skeletons, per-section containment, retry behavior, announcements, state distinctions, and continued home, navigation, and saved-list usability.

**Acceptance Scenarios**:

1. **Given** recommendation content is loading, **When** the area renders, **Then** a skeleton matching the settled section and card layout is shown, the busy state is announced, no spinner or bare loading text is used, no avoidable content jump occurs, and no automatic rotation starts.
2. **Given** one personalized section fails while another succeeds, **When** the area settles, **Then** the failed section shows a localized inline error with a retry action for that section only, and the other section, the rest of the home destination, navigation, and saved actions remain usable.
3. **Given** every recommendation section fails, **When** the area settles, **Then** a localized area-level error with a retry action appears, no raw provider or technical detail is exposed, and the rest of the home destination remains usable.
4. **Given** the provider succeeds with no usable recommendations and no usable fallback, **When** the area settles, **Then** an empty explanation with working actions is shown and it is visually and semantically distinct from an error.
5. **Given** recommendation content was loaded earlier and the provider is now unavailable, **When** the area renders, **Then** the earlier content is not presented as current unless it is explicitly labeled as previously loaded, and otherwise an error or empty state is shown.
6. **Given** a retry action, **When** the visitor activates it, **Then** the failed section is genuinely re-requested, duplicate submissions are prevented while it is pending, the result is announced, and the action can be retried again if it fails.

---

### User Story 5 - Keep guest and account recommendation scopes separate (Priority: P3)

Guests can always use the non-personalized fallback without an account. Guest saved titles are never used as seeds for recommendations in the initial release, and no guest saved data leaves the device. When an optional account model is approved and implemented, personalized recommendations follow the account scope, never mix device and account data, never expose one account's suggestions to another, and fall back honestly when account data is unavailable.

**Why this priority**: The account model is an open product decision, and guest personalization is deferred to respect feature 007's no-transmission rule. The guest baseline must be honest now, and the account contract must be defined so that a later implementation cannot silently mix scopes.

**Independent Test**: Verify that guests see the non-personalized fallback even when they have saved titles, zero saved data is transmitted, and no sign-in prompt appears. When an account capability exists, test account A and account B isolation, declined adoption, successful and failed adoption, sign-in, sign-out, and account-service failure.

**Acceptance Scenarios**:

1. **Given** the guest-only product, **When** the recommendation area renders, **Then** guests see the labeled non-personalized fallback or a non-personalized explanation, no guest saved-title data is used as a seed, ranked, or explained, no saved-title data is transmitted, no account is required, and no sign-in, sign-up, or synchronization prompt is shown.
2. **Given** a guest has saved titles, **When** the area renders, **Then** those titles are not used as seeds, the fallback is labeled as non-personalized, and no saved-title data is transmitted.
3. **Given** no account capability exists, **When** the visitor reads the explanation, **Then** it does not advertise, promise, or link to an account, profile, synchronization, or personalization that does not exist.
4. **Given** an approved account capability and a signed-in visitor, **When** recommendations render, **Then** only the active account's saved titles and explicit preferences are used, no unadopted guest data affects the output, and no other account's data is used or shown.
5. **Given** a signed-in visitor who declined to attach guest data and whose account has no saved titles, **When** recommendations render, **Then** no guest-based recommendation is presented as account-based, and an honest insufficient-data state with a non-personalized fallback is shown where available.
6. **Given** a signed-in visitor with adopted titles, **When** the visitor signs out, **Then** account-derived recommendations are no longer shown, account data is not retained in a readable recommendation form on the device, and the guest non-personalized fallback becomes available again according to feature 007's scope rules.
7. **Given** an adoption that partially fails, **When** recommendations render, **Then** no unconfirmed title is treated as adopted, the state is honest, and retry follows the adoption contract of feature 007.

---

### User Story 6 - Use recommendations on any screen, with keyboard, assistive technology, or either language (Priority: P3)

A visitor on a phone, a narrow or zoomed window, a keyboard, or a screen reader can read every recommendation and its reason, operate every control, and change the interface language without losing the area's state or encountering untranslated copy.

**Why this priority**: The capability must meet the product's accessibility, responsive, and localization obligations, but these requirements do not change its core behavior.

**Independent Test**: Check 360, 768, 1024, and 1440 pixel widths and 200 percent zoom; complete the journey with keyboard only and a screen reader; switch between English and Spanish; test long titles, missing artwork, and reduced motion.

**Acceptance Scenarios**:

1. **Given** a supported width or 200 percent zoom, **When** the area renders, **Then** there is no horizontal page scrolling, no clipped reason or control, no overlap, cards and their actions remain operable, and long titles wrap without losing identity.
2. **Given** keyboard-only use, **When** the visitor moves through the area, **Then** every card, "Show different titles", dismiss, personalization toggle, reset, explanation, retry, and fallback action is reachable in a logical order with a visible focus indicator and no keyboard trap, and focus after a removal or reset is predictable.
3. **Given** assistive technology, **When** the area renders or changes, **Then** the recommendation area and its sections are named, each item's reason is programmatically associated with it, every action includes the affected title in its accessible name, and state changes are announced once without relying on color, hover, or icon alone.
4. **Given** the interface language changes, **When** the area re-renders, **Then** all Walplay-owned headings, reasons, explanations, controls, confirmations, empty states, and errors are in the selected language, provider-supplied title names remain as supplied, and no duplicate request or state loss is introduced.
5. **Given** the visitor prefers reduced motion, **When** items change or sections load, **Then** non-essential animation is suppressed, nothing auto-advances, and no motion distracts from the task.

---

### Edge Cases

- The visitor has no saved titles, or every saved title is unusable, deleted, adult-flagged, or of an unsupported type.
- A guest has saved titles that would be eligible in an account scope; the initial release must not use them and must show the non-personalized fallback with zero transmission.
- A guest expects personalized suggestions because the saved-title feature exists; the area must state that the guest experience is non-personalized and must not imply that guest saved titles are used.
- The visitor has saved titles but the provider returns no associated titles, only excluded titles, or fewer titles than the section would normally show.
- A saved title is in both the watchlist and favorites, or is removed while its personalized section is visible.
- The same title is returned for both seeds, or the provider repeats the seed, repeats a title across result pages, or returns duplicates within one page.
- The provider returns titles already in the watchlist or favorites, including a title saved in another open tab during the visit.
- The visitor dismisses a title, then removes it from a saved collection, then resets recommendation controls.
- The visitor turns personalization off while a personalized section is loading, or turns it on while the fallback is visible.
- A reset is confirmed while a section is loading, and a request settles afterwards.
- Recommendation preferences are malformed, partially readable, written by an older version, or written by an unknown version.
- Device storage is unavailable, full, in private browsing, or cleared between visits.
- The provider times out, rate-limits, returns malformed data, returns only the seed, or fails for one section while another succeeds.
- The provider supports the fallback but not seed-based recommendation, or the reverse.
- The provider's terms do not permit recommendation display, attribution, or the required caching behavior.
- The visitor is signed in with an account that has no saved titles, declined adoption, or signed out mid-session.
- An account adoption fails after partially applying, is retried, and the visitor signs out before retrying.
- The interface language or the active region changes while the area is open.
- The visitor zooms to 200 percent, uses only a keyboard, uses a screen reader, or enables reduced motion.
- A title has a very long name, a non-Latin name, missing artwork, or a missing year.
- The visitor navigates to a recommendation and returns with browser back, forward, or a direct address.
- The fallback is available but every item is excluded after filtering, leaving the section empty.
- The visitor has disabled personalization and the provider has no usable fallback.
- Every candidate in every personalized section is dismissed or excluded while eligible seeds still exist.

## Requirements *(mandatory)*

### Functional Requirements

#### Scope, host surface, and boundaries

- **FR-001**: The feature MUST provide an explainable recommendation capability for movies and TV shows that helps visitors discover titles associated with their saved titles or, when personalization is unavailable, with provider popularity.
- **FR-002**: The complete guest experience defined by this feature MUST work without registration, sign-in, email, or any personal identifier. This includes the labeled non-personalized baseline. No recommendation section, explanation, or control may require an account. Guest scope includes only the non-personalized baseline; seed-based personalization is available only in an approved account scope.
- **FR-003**: The initial host surface MUST be the home destination. The home destination MUST contain exactly one recommendation area containing the supported sections. The area MUST NOT replace or disable the home destination's existing purpose, navigation, or any personal summary that a later home-view capability provides.
- **FR-004**: The feature MUST NOT add a primary-navigation destination, a new top-level route, or new Settings content. The foundation's Settings destination is restricted by feature 001, and changing that restriction requires an update to feature 001, not a unilateral addition here.
- **FR-005**: The feature MUST NOT add recommendation sections to Browse, Search results, the Saved collections, or the detail page's related-titles area. Those surfaces remain governed by features 002, 003, 007, and 004 respectively. Provider-supplied related titles on the detail page MUST NOT be relabeled as personalized recommendations.
- **FR-006**: The feature MUST reuse the existing catalog, card, detail-navigation, attribution, and saved-title capabilities. It MUST NOT introduce a second provider integration, a second card system, a second detail destination, or a duplicate copy of saved-title data.
- **FR-007**: Recommendations MUST be limited to the supported entertainment content types: movies and TV shows. Episodes, people, collections, and any other provider entity MUST NOT be presented as recommended titles.
- **FR-008**: The feature MUST NOT imply that a recommended title is available to watch, playable, high quality, approved by Walplay, or a guarantee of enjoyment. It MUST NOT introduce playback, availability claims, ratings, or editorial judgment.
- **FR-009**: The feature MUST NOT introduce a separate persistence system, account model, authentication mechanism, or database schema. Recommendation preferences in an approved account scope MUST use the approved account persistence; any future guest personalization must use feature 007's device-local preference boundary.
- **FR-010**: Recommendation generation MUST treat saved titles as read-only. It MUST NOT add, remove, reorder, expire, or modify watchlist or favorites entries, counts, or saved-state presentation.
- **FR-011**: The feature MUST NOT introduce watched status, personal ratings, personal notes, notifications, reminders, sharing, social features, or playback.
- **FR-012**: The feature MUST remain useful when the provider fails. Provider failure MAY degrade recommendation content, but MUST NOT take down the home destination, global navigation, catalog, search, detail pages, or personal-list actions.
- **FR-013**: Every recommendation surface MUST be available in English and Spanish, MUST meet WCAG 2.2 AA for the critical journey, and MUST work at the supported responsive widths and at 200 percent zoom.

#### Recommendation sources and truthfulness

- **FR-014**: The feature MUST support exactly two recommendation bases: a personalized section derived from one saved title and the provider's associated titles, available only in an approved account scope, and a non-personalized fallback derived from the provider's current popular list, which is the guest baseline. When no approved account scope exists, only the fallback is available.
- **FR-015**: Provider recommendation and similar-title lists MUST be treated as provider-supplied associations. Walplay MUST NOT describe them as its own algorithm, editorial selection, verified taste model, or knowledge of what the visitor will enjoy.
- **FR-016**: The product MUST use personalization language only when the displayed selection is actually driven by the visitor's saved titles or approved explicit preferences in an approved account scope. Every other selection MUST be labeled as non-personalized.
- **FR-017**: A selection based only on provider popularity MUST be labeled with a truthful non-personalized basis such as "Popular now" and provider attribution. It MUST NOT use "for you", "recommended for you", "picked for you", "because you watched", or equivalent personalization language.
- **FR-018**: The product MUST NOT characterize the provider's recommendation method as collaborative filtering, artificial intelligence, machine learning, genre matching, audience matching, or "people like you", because that method is not documented as a Walplay-verified behavior.
- **FR-019**: In an approved account scope, a personalized section MUST use the provider's recommendation list for its seed as the primary candidate pool. The provider's similar-title list MUST be used only when a successful recommendation-list response yields no usable candidate after exclusions, and then only as the sole candidate pool for that section. A recommendation-list failure is not a no-candidate result and MUST follow the error behavior in FR-071. The two lists MUST NOT be merged or interleaved within one section.
- **FR-020**: Recommendations MUST NOT use search terms, browsing or click history, time spent, watch time, interface language, active region, device type, location, IP address, demographics, inferred sensitive attributes, cross-site data, or information about another person as taste signals. These signals MUST NOT be collected, inferred, or simulated for this feature. Interface language and active region MAY still be used only to localize displayed metadata; they MUST NOT select, rank, or explain recommendations.
- **FR-021**: The feature MUST NOT introduce machine learning, model training, embeddings, Walplay-built collaborative filtering, generative recommendations, or a paid recommendation service.
- **FR-022**: The feature MUST NOT include sponsored, promoted, paid, or commercially prioritized recommendations. Provider order and section order MUST NOT be altered for commercial reasons, affiliate relationships, or advertising.
- **FR-023**: The product MUST NOT claim recommendation accuracy, freshness, personal fit, confidence, or predicted enjoyment, and MUST NOT display fabricated match scores or percentages.
- **FR-024**: Adult-flagged titles MUST be excluded from every recommendation section.
- **FR-025**: Recommendation eligibility MUST NOT depend on streaming availability in the active region (Colombia in the initial product) in the initial release. This is a confirmed product decision for the initial release. A recommended title MUST NOT be described as available, unavailable, or region-restricted unless the availability feature supplies and governs that information. Whether availability should later affect eligibility is recorded as RV-03.
- **FR-026**: Provider data MUST be treated as untrusted input. A recommendation without a usable identity, supported content type, or displayable title MUST be excluded. Provider field names, identifiers, raw errors, and internal data shapes MUST NOT reach the visitor.
- **FR-027**: When the provider cannot be reached, recommendation content from an earlier load MUST NOT be presented as current unless it is explicitly labeled as previously loaded. Otherwise a localized error or empty state MUST be shown.

#### Personalization basis and seed selection

- **FR-028**: The only personalization signals available to the initial release are the visitor's saved titles in the watchlist and favorites, and they are used only in an approved account scope. Guest scope MUST NOT use saved titles as seeds, to rank a selection, or to explain a selection, and MUST NOT use them to obtain provider results. Guest scope MAY read saved titles locally, read-only, solely to exclude titles the guest already saved from the non-personalized fallback; that read MUST NOT transmit, persist, or repurpose them to select, rank, or explain content. Recommendation-specific preferences, dismissals, and rotation positions are control data, not taste data.
- **FR-029**: An eligible seed is a saved title with a usable internal identity, a supported content type, a displayable name, and no adult flag. A saved title that does not meet these conditions MUST be skipped without producing an error.
- **FR-030**: Watchlist and favorites membership MUST be equally eligible as a seed. Favorites MUST NOT be treated as a stronger taste signal than the watchlist unless a later documented product decision establishes otherwise.
- **FR-031**: A title saved in both collections MUST be treated as one seed. Its position MUST use its most recent save or membership event, and it MUST NOT produce two sections.
- **FR-032**: In an approved account scope, eligible seeds MUST be ordered by most recently saved first, using the most recent membership timestamp when a title is in both collections. The first two eligible seeds, when available, produce the two personalized sections. Additional seeds MUST NOT create additional sections in the initial release.
- **FR-033**: Each personalized section MUST be bound to exactly one seed. Its candidates MUST come only from that seed's candidate list selected under FR-019. Walplay MUST NOT merge candidates from multiple seeds into one section or combine reasons into an unverified compound claim.
- **FR-034**: When fewer than two eligible seeds exist in an approved account scope, the area MUST show the sections that can be truthfully produced, including one section for one seed, and MUST NOT treat the reduced number as an error.
- **FR-035**: Seed selection MUST be deterministic. The same saved titles, membership timestamps, applicable preferences, and provider results MUST produce the same sections and seed assignments across reloads.
- **FR-036**: The feature MUST use the entertainment domain model's content type and internal title identity. Provider-specific identifiers MUST NOT be stored as the recommendation key, presented to the visitor, or used as the visible title identity.
- **FR-037**: When a seed becomes unusable, deleted, or is removed from both collections while the area is displayed, its section MUST be removed or refreshed without continuing to claim a basis that is no longer true. When a new eligible saved title changes the seed order, the area MUST reflect the current eligible seeds.
- **FR-038**: Explicit taste preferences such as preferred genres or content types are not available in the current product. They MUST NOT be inferred from saved titles, language, region, or behavior. They MAY be used only after a documented, user-stated preference capability is approved, and then only with an equally explicit truthful label and a separate product update.
- **FR-039**: Watched status is a separate capability that is not available to this feature. It MUST NOT be inferred from saved titles or provider data. It MAY be used as a future signal only after that capability is approved and the recommendation impact is separately validated and labeled.
- **FR-040**: The personalization basis MUST come only from the active account's saved titles in an approved account scope. Guest scope has no personalization basis and MUST NOT use saved titles to seed, rank, or explain a selection; the local read-only exclusion permitted by FR-028 is not a personalization basis. The scopes MUST NOT be combined.

#### Eligibility, filtering, ordering, and repetition

- **FR-041**: Every recommendation candidate MUST be excluded when it is the seed itself, already in the watchlist or favorites, already dismissed, a duplicate of another candidate in the same section, adult-flagged, of an unsupported content type, or missing a usable identity or displayable name.
- **FR-042**: A title MUST appear at most once within a section and at most once within the recommendation area.
- **FR-043**: When a candidate is eligible for more than one personalized section, the section produced by the more recently saved seed MUST claim it first and the later section MUST omit it. This collision rule MUST be deterministic and MUST NOT depend on provider response timing.
- **FR-044**: Within a section, the order of the selected provider list MUST be preserved after exclusions. Walplay MUST NOT re-sort by rating, popularity, release date, quality, or inferred fit.
- **FR-045**: The recommendation area MUST show at most two personalized sections in an approved account scope and, separately, at most one non-personalized fallback section. Each section MUST show at most 12 titles at a time before any "Show different titles" action. Numbered pagination, infinite scrolling, and automatic loading of additional batches are not used.
- **FR-046**: With unchanged inputs, section membership, item membership, and order MUST remain stable. The feature MUST NOT use random shuffling, time-based rotation, per-render rotation, or automatic carousels.
- **FR-047**: Each personalized section MUST offer a "Show different titles" action only when the selected candidate list supplies a subsequent usable result page containing at least one eligible title that is not currently displayed in the area. Activating it MUST replace that section's items with the next usable page from that same candidate list, apply every exclusion rule, avoid repeating a title currently displayed in the area, store the position for that seed and active scope, and announce the change once. It MUST NOT switch from the recommendation list to the similar-title list, or the reverse. When no such page exists, the action MUST be unavailable with a localized explanation rather than failing or producing an empty section.
- **FR-048**: A section's rotation position MUST affect only that seed's section. It MUST NOT change seed selection, the other section, personalization controls, saved data, or provider order within a page, and it MUST wrap to the first usable page with a notice after the last page is exhausted.
- **FR-049**: In an approved account scope, dismissed titles MUST be excluded from every recommendation section until the visitor resets recommendation controls or the device's recommendation preferences are cleared with browser data. Dismissal MUST NOT affect catalog results, search results, watchlist membership, favorites membership, or saved-state presentation.
- **FR-050**: Adding a title to a saved collection MUST remove it from recommendation eligibility. Removing it from the collection MAY make it eligible again. The area MUST reflect the resulting state without continuing to display a title that the current rules exclude.
- **FR-051**: Dismissals and rotation positions MUST NOT be used to infer taste, rank other titles, weight sections, or build a profile. They are used only for exclusion and for the visitor-controlled position within a seed's results.
- **FR-052**: When exclusions leave a section with no items, that section MUST be omitted. When every personalized section is omitted in an approved account scope, the area MUST show the state that truthfully applies: insufficient data, personalization off, provider success with no results, or no remaining suggestions because all candidates were excluded or dismissed. The exhausted state MUST explain its actual cause. When dismissals caused it, a reset action MUST be offered. When existing saved titles or ineligible candidates caused it, reset MUST NOT be presented as a remedy; Browse, Search, retry, or an available "Show different titles" action applies instead. In guest scope, the applicable state is the non-personalized fallback or explanation; the interface MUST NOT use "insufficient data" to imply that guest saved titles would enable personalization. A separately labeled fallback may appear only under FR-055 and FR-071.
- **FR-053**: The feature MUST NOT pad a section with repeated, ineligible, non-personalized, or fabricated titles to reach a target count. A section may show fewer than the maximum, and the area may show none.
- **FR-054**: A title MUST NOT be recommended merely because it is popular, promoted by the provider, or present in a provider list other than the section's declared basis. Popularity is used only in the clearly labeled fallback section.
- **FR-055**: The fallback MUST NOT be displayed alongside a successfully rendered personalized section, and it MUST NOT repeat a title shown there. It is an alternative to unavailable personalization, not an additional personalized claim. It MAY appear alongside a failed personalized section only when the failure remains visible and the fallback is separately labeled under FR-071.

#### Explanations and transparency

- **FR-056**: Each personalized section MUST visibly state its basis and the saved title that produced it. Each item in that section MUST expose the same truthful reason in visible text and to assistive technology, either directly on the item or through an unambiguous programmatic association with the section's stated seed. A generic label such as "Picks for you" MAY accompany the section but MUST NOT replace the specific saved-title reason.
- **FR-057**: A personalized reason MUST name only the seed that actually produced the item. The product MUST NOT invent a reason, attribute the item to a title the visitor did not save, or claim multiple seeds when only one seed's list is used.
- **FR-058**: The non-personalized fallback MUST be visibly labeled as provider popularity and MUST carry provider attribution. Its items MUST NOT carry personalized reason language.
- **FR-059**: Explanations MUST NOT claim genre matching, taste similarity, audience similarity, quality, availability, or predicted enjoyment, and MUST NOT present provider popularity as Walplay's recommendation or editorial choice.
- **FR-060**: The recommendation area MUST provide a persistently reachable "How recommendations work" explanation that identifies the basis available in the active scope: the provider popularity fallback in guest scope and, when an approved account capability exists, the saved-title basis available in account scope. It MUST state that guest saved titles are not used to seed or explain suggestions, that Walplay does not apply AI or machine learning to the visitor's data and does not create a separate visitor profile, the active data scope, the available controls where they exist, and the data-loss conditions for guest data.
- **FR-061**: The first time a personalized section is shown in an approved account scope, the interface MUST disclose before or with that section that the visitor's saved titles are used to produce suggestions and MUST identify how to turn personalization off. The disclosure MUST be available in text in the same view, MUST NOT be hidden behind hover, and MUST remain available later through the explanation surface. Guest scope shows no personalized section and therefore no such disclosure.
- **FR-062**: Reasons, headings, explanations, disclosures, controls, confirmations, empty states, and errors MUST be Walplay-owned localized text in English and Spanish. Provider-supplied title names MUST remain as supplied and MUST NOT be presented as translated Walplay copy.
- **FR-063**: A reason or attribution MUST NOT be available only through a tooltip, hover state, icon, color, or truncated text. Assistive-technology names and descriptions MUST include the title and the reason context needed to understand the item.
- **FR-064**: When a truthful reason cannot be produced for an item, the item MUST NOT be shown. A generic "recommended for you" label MUST NOT be used as a substitute for a factual basis.

#### Insufficient data, fallback, and disabled personalization

- **FR-065**: In an approved account scope, when no eligible seed exists, the area MUST show no personalized section, MUST NOT use personalization language, and MUST show a localized explanation that saving titles enables personalized suggestions in an approved account scope, with working actions to Browse and Search. In guest scope, the area MUST show the non-personalized fallback or an explanation of its non-personalized basis, and MUST NOT state or imply that guest saved titles enable suggestions.
- **FR-066**: In an approved account scope, when exactly one eligible seed exists and the provider returns usable candidates, the area MUST show one personalized section and MUST NOT present the state as an error or as insufficient.
- **FR-067**: In an approved account scope, when the provider succeeds but returns no usable personalized candidates, the area MUST explain that no suggestions are available for the current saved titles, MUST offer a retry and a Browse or Search action, and MUST NOT present the state as a loading failure. When the cause is that every candidate was dismissed, the explanation MUST state that cause and offer a reset action. When the cause is that every candidate is already saved or otherwise ineligible, reset MUST NOT be presented as a remedy; the explanation MUST state the actual cause and offer Browse, Search, or an available "Show different titles" action instead.
- **FR-068**: In an approved account scope, when every saved title is unusable or no longer resolvable, the area MUST treat the state as having no eligible seed, MUST NOT reference a missing title in a reason, and MUST offer the same next actions as FR-065.
- **FR-069**: In an approved account scope, when personalization is turned off, the area MUST show no personalized section or claim, MUST NOT use the visitor's saved titles for selection or ordering, MUST show the fallback only when it is truthfully non-personalized, and MUST leave saved collections unchanged.
- **FR-070**: In an approved account scope, when recommendation-specific preferences cannot be read or are structurally unreadable, personalization MUST default to off for the session, no personalized content or claim may be shown, the fallback or explanation MUST appear, and a reset action MUST be available without guessing at the missing state.
- **FR-071**: A non-personalized fallback MUST NOT silently replace a personalized section that failed. A failed personalized section MUST show its own error and retry; a separately labeled fallback MAY appear only if it does not imply that personalization succeeded.
- **FR-072**: The fallback MUST exclude saved titles, dismissed titles, the adult-flagged, unsupported types, duplicates, and unusable titles, and MUST preserve provider order for the remaining items.
- **FR-073**: When the provider does not supply a usable popularity fallback, the area MUST show the applicable explanation or empty state and MUST NOT fabricate a fallback, substitute catalog sections, or present a different provider list as popularity.
- **FR-074**: Insufficient-data, personalization-off, provider-success-with-no-results, exhausted-by-exclusions, and error states MUST be visually and semantically distinct. None MAY be presented as another, and none MAY imply that the visitor has no saved titles when the actual cause is different. In guest scope, no state may imply that saved titles are used or would enable personalization.
- **FR-075**: The fallback MUST NOT be described as tailored, curated for the visitor, influenced by the visitor's activity, or a recommendation from Walplay.

#### Guest and authenticated scope

- **FR-076**: Guests MUST always be able to access the recommendation area without an account. The guest experience is the non-personalized fallback when the provider supplies it, or the explanation and Browse/Search actions otherwise. Guest saved titles MUST NOT be used as recommendation seeds in the initial release, and no guest saved data may be transmitted for recommendations. Personalized sections are available only in an approved account scope.
- **FR-077**: In guest scope, saved titles, dismissals, and rotation positions MUST NOT be transmitted, uploaded, synchronized, or shared. Guest saved titles MUST NOT be used to obtain provider recommendations in the initial release. Local, read-only exclusion of already-saved titles from the non-personalized fallback (FR-028) is permitted; it MUST NOT transmit or persist recommendation data. Any future guest personalization requires a separate approved capability that explicitly resolves feature 007's no-transmission rule (RV-15/RV-16); it MUST NOT be implemented from this specification.
- **FR-078**: Guest scope does not expose recommendation preferences in the initial release. If a future guest personalization capability is approved, its preferences MUST be device-local, versioned, and validated on read, with individually malformed entries dropped without breaking the area.
- **FR-079**: Any future guest recommendation preferences MUST be subject to the same device and browser-profile boundary as feature 007. They MUST NOT be promised across devices, browsers, or browser profiles, and they MAY be lost when browsing data is cleared or in private browsing.
- **FR-080**: While no account capability exists, the recommendation area MUST NOT show sign-in, sign-up, account, profile, or synchronization prompts, and MUST NOT describe account-based personalization as available. It MAY state that personalized recommendations are not available in guest mode.
- **FR-081**: Authenticated personalization is conditional on an approved and implemented account model (OD-07). Until then, no authenticated recommendation experience may be shown or implied.
- **FR-082**: When an account capability exists, recommendations in account scope MUST use only the active account's saved titles and any approved explicit preferences. They MUST NOT use another account's data, device guest data, or inferred profile data.
- **FR-083**: Guest fallback content and account recommendations MUST NOT be mixed or displayed as one personalized scope. Unadopted guest data MUST NOT influence account recommendations, and account-derived recommendations MUST NOT be presented as guest content.
- **FR-084**: A signed-in visitor whose account has no eligible saved titles MUST see the account-scope insufficient-data state, not a guest-derived recommendation. A clearly labeled non-personalized fallback MAY be shown where available.
- **FR-085**: On sign-out, account-derived recommendations MUST no longer be shown, account recommendation data MUST NOT remain readable on the device beyond the account capability's approved sign-out behavior, and the guest non-personalized fallback MUST resume from the remaining device scope according to feature 007.
- **FR-086**: Guest-to-account adoption of saved titles MUST follow feature 007. Adopted titles MUST become eligible account seeds exactly once, unresolved or failed adoption MUST NOT be treated as adopted, and partial failure MUST show an honest state with retry.
- **FR-087**: When the account or recommendation service is unavailable, recommendations MUST degrade with a contained error or an honest fallback, MUST NOT claim personalization, and MUST NOT block saved-list behavior governed by feature 007.
- **FR-088**: The personalization on/off preference, dismissals, and rotation positions MUST be scoped to an approved account scope. Guest scope has no such controls in the initial release. A future guest model must keep its preferences separate from account preferences and from saved data.

#### Loading, empty, error, and resilience

- **FR-089**: The recommendation area MUST load independently from the rest of the home destination. Its loading or failure MUST NOT prevent navigation, saved-title actions, or other home content from working.
- **FR-090**: During loading, each section MUST show a skeleton that matches the settled section and card layout closely enough to avoid a visible content jump, MUST expose a busy state to assistive technology, and MUST NOT use a spinner or bare loading text.
- **FR-091**: Recommendation sections MUST load and fail independently. A failed section MUST show a localized inline error with a retry action while every other section and the rest of the home destination remain usable. In the initial guest baseline the area contains one fallback section, so the area-level error defined by FR-092 satisfies this requirement; per-section partial failure applies only when more than one section exists.
- **FR-092**: An area-level error MUST appear only when all recommendation content has failed or is unavailable. It MUST offer a retry action, MUST be localized, and MUST NOT expose raw provider errors, identifiers, stack traces, or technical messages.
- **FR-093**: An empty recommendation result MUST NOT be presented as an error, and an error MUST NOT be presented as an empty result. The distinction MUST be visible in text and accessible structure.
- **FR-094**: A retry action MUST genuinely re-attempt the failed request, MUST prevent duplicate submissions while pending, MUST announce the result once, and MUST remain available after another failure.
- **FR-095**: A partial failure MUST degrade only the affected section. Usable sections MUST remain visible and operable, and no section may be filled with fabricated or unlabeled stale content to mask the failure.
- **FR-096**: No recommendation failure may delete, hide, or block maintenance of saved titles, and no recommendation control may require the provider to be available.
- **FR-097**: When the application shell is available but the provider is not, the area MUST show the applicable localized error or fallback. The feature MUST NOT promise offline recommendations, background refresh, or push updates.
- **FR-098**: Provider timeouts, rate limits, and malformed responses MUST be mapped to stable, localized user-facing states. The interface MUST NOT retry automatically in a loop or expose provider internals.
- **FR-099**: When the personalization state cannot be determined because saved data or preferences are unreadable, the area MUST NOT show personalized content. It MUST show an honest explanation or a labeled fallback with a recovery action where meaningful.
- **FR-100**: The area MUST reserve its layout space while loading and after state changes so that navigation, headings, and nearby content do not jump or become obscured.

#### Navigation and presentation

- **FR-101**: Activating a recommendation MUST open the matching type-specific detail destination for that title. It MUST NOT open a second detail surface, an external destination, a provider page, or a duplicate route.
- **FR-102**: Returning from a detail destination MUST restore the home destination and the recommendation area's observable state where feasible, including the active scope and any visitor-controlled rotation position.
- **FR-103**: Recommendation cards MUST reuse the catalog card contract and MUST present a consistent identifying set: title name, content type, release or first-air year when known, permitted artwork when available, the truthful reason or fallback basis, and required provider attribution. They MUST NOT add new quality, popularity, or availability claims that the catalog card does not already define.
- **FR-104**: Recommendation cards MUST NOT imply availability, playback, a provider offer, or an outbound destination. Labels such as "Watch now", "Play", or "Available" MUST NOT be introduced by this feature.
- **FR-105**: The area MUST present one accessible name and heading, with a heading for each section that identifies its truthful basis. Any personalized section that renders MUST appear before a fallback that is present under FR-071, and seed order MUST follow FR-032.
- **FR-106**: The area MUST NOT use an auto-advancing carousel, autoplay, infinite scrolling, or motion that draws attention away from the visitor's task. All content changes MUST be visitor-initiated or the result of an explicit retry.
- **FR-107**: Every "Show different titles", dismiss, personalization toggle, reset, explanation, and retry control MUST be reachable by keyboard and touch, MUST NOT depend on hover, and MUST name its scope or the affected title in its accessible name.
- **FR-108**: When an item is dismissed, a section rotates, personalization is toggled, or controls are reset, the interface MUST announce the change once, MUST keep focus within the recommendation area, and MUST NOT strand focus on a removed element.
- **FR-109**: The home destination's existing purpose, navigation, and any personal summary MUST remain present and operable. The recommendation area MUST NOT become the only content of the home destination or block access to discovery.
- **FR-110**: Recommendation sections MUST be bounded as defined by FR-045. The feature MUST NOT introduce a full recommendations catalog, a "load more" loop, or a dedicated recommendation destination in the initial release.

#### Responsive layout, accessibility, and localization

- **FR-111**: At 360, 768, 1024, and 1440 pixels, and at 200 percent browser zoom, the area MUST present content without horizontal page scrolling, clipped reasons or controls, overlapping elements, or unreachable content. Cards and controls MUST remain operable and long titles MUST wrap.
- **FR-112**: The home destination MUST retain exactly one page-level heading. The recommendation area MUST be a labelled region, each section MUST have a logical heading, and each section's items MUST be exposed as a semantic collection with an accessible name.
- **FR-113**: All recommendation functions MUST be operable by keyboard with a logical focus order, a visible focus indicator, and no keyboard trap, including cards, section rotation, dismissal, personalization, reset, explanation, retry, and fallback actions.
- **FR-114**: Each item's reason, fallback basis, and control context MUST be programmatically associated with the item or its section. State changes, loading, errors, and confirmations MUST be announced once to assistive technology.
- **FR-115**: Artwork MUST follow the existing catalog and detail rules for alternative text, decorative treatment, fallback, and reserved dimensions. Missing or failed artwork MUST NOT change the item's identity or cause layout shift.
- **FR-116**: Information MUST NOT be communicated only through color, hover, icon shape, or visual position. Personalization state, fallback basis, dismissal, loading, empty, and error states MUST be understandable in text.
- **FR-117**: Motion MUST be minimal, and `prefers-reduced-motion` MUST be respected. No automatic rotation or attention-seeking animation is permitted.
- **FR-118**: All Walplay-owned copy MUST be externalized and localized in English and Spanish, including headings, reasons, explanations, disclosures, controls, confirmations, empty states, errors, and attribution labels. Raw translation keys MUST NOT be shown.
- **FR-119**: Switching the interface language MUST re-render the area without losing the active section state, duplicating provider requests, or changing the truthful basis. Provider-supplied title names MUST remain as supplied.
- **FR-120**: Years, counts, and pluralized labels MUST use localized formatting. Accessible names and descriptions MUST be localized, and truncation MUST NOT remove the reason or the control's title context.

#### User control, privacy, and data minimization

- **FR-121**: In an approved account scope with eligible saved titles, personalization MUST be enabled by default for a visitor who has not previously turned it off; a stored off choice MUST be honored. The recommendation area MUST provide a visible personalization on/off control that the signed-in visitor can operate, that turns personalization off in one explicit action, that is not hidden behind hover or a secondary dialog only, and that is reversible. In guest scope, the area MUST NOT present a control that implies guest saved titles can be used; it MUST explain that personalized recommendations are not available in guest mode.
- **FR-122**: In an approved account scope, turning personalization off MUST immediately remove personalized sections and claims, MUST stop using saved titles for recommendation selection and ordering, MUST show the labeled fallback or explanation, MUST leave saved collections unchanged, and MUST announce the resulting state once.
- **FR-123**: In an approved account scope, turning personalization on MUST restore recommendations from the current eligible saved titles, MUST show the required disclosure if it has not been shown, and MUST announce the resulting state once.
- **FR-124**: In an approved account scope, each personalized item MUST offer a "Not interested" control that names the title, removes the item immediately and persistently from recommendations until a reset or the clearing of recommendation preferences, keeps focus predictable, and does not alter the catalog, search, or saved collections.
- **FR-125**: In an approved account scope, the area MUST provide a reset control for recommendation controls. Reset MUST require explicit confirmation that states it clears dismissals and rotation positions but not saved titles, MUST leave the personalization on/off choice unchanged, and MUST announce completion.
- **FR-126**: The reset confirmation MUST be keyboard and screen-reader operable, MUST state its scope, MUST allow cancellation without side effects, and MUST NOT use dark patterns, repeated nagging, or a hidden default that changes saved data.
- **FR-127**: The "How recommendations work" explanation MUST be reachable from the area at all times and MUST explain the provider popularity fallback available in guest scope and, when an approved account capability exists, the saved-title basis available in account scope and not used as a basis in guest scope. It MUST state that Walplay does not apply AI or machine learning to the visitor's data and does not create a separate visitor profile, the active data scope, the controls where they exist, the retention behavior, and the device-data loss conditions.
- **FR-128**: The feature MUST NOT use pre-checked consent for unrelated uses, guilt, urgency, nagging, forced personalization, a hidden off switch, or engagement pressure. Turning personalization off or dismissing a title MUST take one explicit action.
- **FR-129**: Recommendation data MUST be limited to saved-title identities, collection membership, and save timestamps already owned by feature 007, plus the account-scope personalization on/off choice, dismissed title identities, rotation positions, and any approved explicit preference. No additional personal data, behavioral history, or inferred attribute may be collected. Guest scope creates no recommendation preference data in the initial release.
- **FR-130**: Dismissals and rotation positions MUST NOT be repurposed to infer taste, score titles, target content, or build a profile. They MUST be used only for exclusion and visitor-controlled position.
- **FR-131**: Guest recommendation data MUST remain on the device and MUST NOT be sold, shared, used for advertising, or combined with data about other visitors. No guest saved-title data may be transmitted for recommendations in the initial release.
- **FR-132**: The feature MUST NOT introduce advertising, affiliate placement, recommendation analytics intended to profile visitors, or a third-party recommendation service.
- **FR-133**: Guest scope does not create recommendation preference data in the initial release. Account recommendation data, when accounts exist, MUST follow the approved account retention and deletion behavior, and this feature MUST NOT create an undisclosed indefinite retention path.
- **FR-134**: The interface MUST NOT present a personalized section in an approved account scope before the disclosure required by FR-061 is available.

#### Provider boundary, attribution, and prohibited behavior

- **FR-135**: The feature MUST obtain recommendation and popularity data only through documented provider operations already permitted for the catalog capability. Scraping, undocumented endpoints, authentication bypass, and geographic-restriction bypass are prohibited.
- **FR-136**: Provider requests, credentials, rate limits, attribution, and error mapping MUST follow the existing provider boundary. Provider credentials MUST NOT be exposed to the client, and provider-specific data shapes MUST NOT reach the interface.
- **FR-137**: Provider terms for recommendation display, attribution, caching, and artwork MUST be validated before release. If the provider does not permit a use required by this feature, the affected section MUST be omitted rather than implemented around the restriction.
- **FR-138**: Provider-supplied titles, artwork, and metadata MUST retain the attribution required by the catalog feature, including the official provider mark and the required non-endorsement statement wherever provider data appears. The exact wording, assets, and placement MUST follow current official provider guidance and MUST NOT be improvised. Walplay MUST NOT claim ownership, editorial selection, completeness, or permanent accuracy for provider data.
- **FR-139**: The feature MUST NOT infer or expose another visitor's data, social proof, audience similarity, or any cross-user signal. Provider aggregate data may be consumed only as the opaque provider list permitted by the catalog integration.
- **FR-140**: The feature MUST NOT introduce a second metadata or recommendation provider, merge lists from multiple providers, or select a provider per visitor without an explicit product decision and provider validation.
- **FR-141**: When the provider lacks a documented capability or returns no usable content, the corresponding section MUST be omitted or replaced by the truthful empty state. The feature MUST NOT simulate provider capability.
- **FR-142**: The feature MUST NOT present provider popularity as a Walplay rating, quality measure, audience approval, personalized fit, or recommendation. Attribution and labeling MUST keep those meanings distinct.
- **FR-143**: The feature MUST comply with the product's prohibition on artificial urgency, false scarcity, autoplay, dark patterns, and engagement manipulation.
- **FR-144**: Recommendation content MUST NOT be used to imply that a title is trending among the visitor's friends, region, or similar people. No such data is available or permitted.

#### Scope guard and anti-requirements

- **FR-145**: The feature MUST NOT change Browse, Search, detail, availability, trailer, or Saved behavior. It MUST NOT add, remove, reorder, or relabel sections on those surfaces.
- **FR-146**: The feature MUST NOT add a primary-navigation entry, a new Settings section, or account-management UI. Any such change requires an update to the owning feature and a new product decision.
- **FR-147**: The feature MUST NOT introduce registration, sign-in, authentication, profile editing, or an account gate for guests.
- **FR-148**: The feature MUST NOT introduce watched status, personal ratings, notes, episode progress, notifications, reminders, social feeds, shared lists, or playback.
- **FR-149**: The feature MUST NOT introduce machine learning, AI, paid recommendation services, user profiling beyond the data listed in FR-129, or a recommendation-specific analytics program.
- **FR-150**: The feature MUST NOT present people, episodes, collections, or unsupported provider entities as recommended titles, and MUST NOT invent categories or rankings beyond the supported bases.
- **FR-151**: The feature MUST NOT autoplay, auto-advance, auto-load additional pages, use infinite scroll, or create a full recommendation catalog in the initial release.
- **FR-152**: The feature MUST NOT use personalization language when data is insufficient, personalization is off, only provider popularity is used, or the provider recommendation method is unverified.

#### Fallback media scope (amendment 2026-11-25)

- **FR-153**: The non-personalized fallback MAY present an in-place media-type scope limited to the supported content types (movies and TV shows). At most one provider popular list MUST be shown at a time; the two lists MUST NOT be merged or interleaved. The scope MUST be component state, MUST NOT be persisted, and MUST NOT create recommendation preference data. It is not a route, a primary-navigation entry, or Settings content.
- **FR-154**: The default media scope MUST be movies. Changing the scope MUST NOT alter saved data, MUST re-request only the selected provider list, MUST preserve provider order within that list after exclusions, and MUST NOT use interface language, active region, or any behavioral signal to select the scope. Product and design confirmation of the in-place scope is recorded as RV-17.

### Key Entities *(include if data involved)*

- **Recommendation Area**: The single home-destination region that hosts recommendation sections. Attributes: active scope (guest or account), personalization state where it exists, section list, loading/error/empty state, and disclosure state in an approved account scope.
- **Recommendation Section**: A bounded group with one declared basis. Attributes: basis type (saved-title association or provider popularity fallback), media scope (movies or TV shows) for the non-personalized fallback, seed title reference only in an approved account scope, localized heading, ordered items, rotation position when applicable, and section state.
- **Recommendation Item**: One recommended movie or TV show. Attributes: content type, internal title identity, display snapshot, truthful reason or fallback basis, selected provider order, and dismissal state in an approved account scope.
- **Seed Title**: A saved title eligible to produce a personalized section in an approved account scope. Attributes: internal identity, content type, collection membership, most recent membership timestamp, resolvability, adult flag, and display name.
- **Recommendation Preference**: Account-scope visitor-controlled recommendation state in the initial release. Attributes: personalization enabled, dismissed title identities, per-seed rotation positions, version, and storage status. Guest scope creates no recommendation preference.
- **Recommendation Basis**: The truthful explanation category for a section or item, limited to saved-title association in an approved account scope and provider popularity fallback in any scope.
- **Recommendation Explanation**: The localized "How recommendations work" content and the account-scope first-use disclosure. Attributes: data used, scope-specific basis, controls where they exist, retention and loss conditions, and provider attribution.
- **Conditional Explicit Preference** *(future, not initial scope)*: A user-stated genre or content-type preference. Not present in the current product and not inferred.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 percent of tested personalized sections, every item exposes a truthful reason naming the exact saved title that produced it, and no item displays a reason that is absent from the section's declared basis.
- **SC-002**: In 100 percent of tested non-personalized fallback sections, no item or section uses personalization language, and every fallback item is attributed to provider popularity.
- **SC-003**: A scope audit finds zero personalized claims for provider-popularity-only content, zero claims that Walplay applies AI, machine learning, collaborative filtering, genre matching, or audience similarity to produce the initial recommendations, and zero fabricated match scores.
- **SC-004**: In an approved account scope, with two eligible saved titles and controlled provider results, 100 percent of tested loads show at most two personalized sections in most-recently-saved-first order, and every section is tied to exactly one saved title.
- **SC-005**: In 100 percent of tested exclusion cases in an approved account scope, the seed itself, saved titles, dismissed titles, duplicates, adult-flagged titles, unsupported content types, and unusable titles are absent from every section.
- **SC-006**: A guest, including one with saved titles, sees zero personalized sections, a localized explanation of the non-personalized basis, at least one working Browse or Search action, and either a labeled provider fallback or an empty explanation; no test presents the state as an error or implies that guest saved titles were used to choose or personalize suggestions.
- **SC-007**: In an approved account scope, a visitor with exactly one eligible saved title and at least one usable provider candidate sees one personalized section in 100 percent of tested cases, and the state is not presented as an error.
- **SC-008**: With unchanged saved data, preferences, and provider results, 100 percent of reloads produce the same section membership, item membership, and order; a test finds zero random, time-based, or per-render changes.
- **SC-009**: In an approved account scope, 100 percent of tested "Show different titles" runs replace the current items without repeating currently displayed titles, preserve all exclusion rules, remember the position for the active seed and scope, and announce the change once; when no alternative exists, the control is unavailable with an explanation.
- **SC-010**: In an approved account scope, 100 percent of tested dismissal runs remove the title immediately, keep it absent across reloads until reset, announce the change once, and leave catalog, search, watchlist, and favorites unchanged.
- **SC-011**: In an approved account scope, 100 percent of tested personalization-off runs show no personalized section or claim on the current or subsequent loads, leave saved collections unchanged, and allow personalization to be re-enabled in one explicit action.
- **SC-012**: In an approved account scope, 100 percent of tested resets clear dismissals and rotation positions with explicit confirmation, leave the personalization choice and saved collections unchanged, and have no side effect on cancellation.
- **SC-013**: In 100 percent of tested loading cases, a layout-matching skeleton with an announced busy state appears, no spinner or bare loading text is used, and no avoidable content jump is observed.
- **SC-014**: In 100 percent of tested single-section failures, the failed section shows a localized inline error with retry, other sections remain usable, and the rest of the home destination, navigation, and saved actions remain operable.
- **SC-015**: In 100 percent of tested total recommendation failures, an area-level localized error with retry appears, zero raw provider or technical details are exposed, and the rest of the home destination remains usable.
- **SC-016**: In 100 percent of tested empty results, the state is distinguishable from an error, insufficient data, and exhausted-by-exclusions, and no fabricated title or fake fallback appears.
- **SC-017**: In 100 percent of tested provider-failure cases, saved titles remain visible and maintainable, and the feature performs zero automatic retry loops.
- **SC-018**: In 100 percent of tested recommendation activations, the correct type-specific detail destination opens, and a second detail surface or external destination is never used.
- **SC-019**: Keyboard-only and screen-reader checks at 360, 768, 1024, and 1440 pixels and at 200 percent zoom find zero critical accessibility failures, zero horizontal page scrolling, and 100 percent reachability and naming for every control present in the tested state, including cards, reasons, rotation, dismissal, toggle, reset, explanation, retry, and fallback actions.
- **SC-020**: English and Spanish checks find complete Walplay-owned recommendation copy, zero raw translation keys, correct pluralization, and provider title names displayed as supplied.
- **SC-021**: In an approved account scope, with personalization on and two eligible saved titles, 95 percent of sampled loads reserve the recommendation area immediately and settle to content, fallback, or error within five seconds under normal network conditions.
- **SC-022**: In 100 percent of guest-scope audits, zero saved-title data is transmitted for recommendations, guest saved titles are never used as seeds, no recommendation preference data is created, and any local read-only exclusion of already-saved titles transmits nothing and is not presented as personalization.
- **SC-023**: When an account capability exists, 100 percent of tested account pairs show no cross-account recommendation, no unadopted guest title in account recommendations, and no account-derived recommendation after sign-out.
- **SC-024**: In 100 percent of tested unfamiliar state transitions — sign-in, sign-out, declined adoption, failed adoption, and account-service failure — the interface never claims personalization that the active scope cannot support.
- **SC-025**: A scope audit finds zero modifications to Browse, Search, detail, availability, trailer, Saved, primary navigation, Settings, account UI, watched status, ratings, notes, notifications, sharing, playback, or ML/AI behavior. Reused catalog card data is permitted only as defined by FR-103.
- **SC-026**: In an approved account scope with eligible saved titles and no stored off choice, 100 percent of tested first-time visits show the first-use disclosure before or with the first personalized section; a previously stored off choice results in no personalized section and no personalization claim.
- **SC-027**: In approved account-scope tests where both provider lists are available, 100 percent of personalized sections use the recommendation list as the primary candidate pool; the similar-title list appears only when a successful recommendation-list response yields no usable candidate, and no section mixes items from both lists.
- **SC-028**: In 100 percent of tested recommendation sets, changing a title's streaming availability does not change its inclusion, exclusion, or order; no availability-based filter is observed.

SC-023 applies only when an approved account capability exists. SC-024 applies to all scopes, with its account-specific cases verified only when accounts exist.

## Recommendation Behavior Reference

These tables summarize expected behavior. Functional requirements remain authoritative.

### Basis and label matrix

| Displayed section | Selection driver | Personalization claim | Required label | Ordering |
|---|---|---|---|---|
| Personalized seed section | Visitor's saved title plus the selected provider list | Yes, only in an approved account scope while personalization is on and the seed is eligible | "Because you saved {title}" and equivalent localized wording | Selected provider list order after exclusions; first section from the most recent seed |
| Provider popularity fallback | Provider's current popular list for the active media scope | No | "Popular now" with provider attribution; in guest scope, accompanied by an explanation that guest saved titles are not used | Provider order after exclusions |
| Insufficient data (account scope) | No eligible seed | No | Explanation that saving titles enables personalized suggestions in an approved account scope, with Browse and Search actions | Not applicable |
| Personalization off (account scope) | Visitor choice | No | Explanation and, where available, labeled provider fallback | Provider order after exclusions |

### State matrix

Seed-based rows apply only in an approved account scope. In guest scope, none of the seed-based rows apply; the guest baseline is the labeled fallback or explanation, no guest saved-title data is used as a seed or transmitted, and only local, read-only exclusion of already-saved titles may apply.

| Personalization | Eligible seeds | Provider result | Expected outcome |
|---|---|---|---|
| On | Two or more | Usable candidates | Up to two personalized sections, most recent seed first |
| On | One | Usable candidates | One personalized section; not an error |
| On | One or more | No usable candidates | Personalized empty explanation with retry and Browse/Search; separately labeled fallback only if truthful |
| On | None | Any | No personalized section; explanation with Browse/Search; labeled fallback if available |
| On | One or more | Usable candidates but all excluded or dismissed | No personalized section; exhausted-by-exclusions explanation with reset; labeled fallback only under FR-055 and FR-071 |
| Off | Any | Any | No personalized section or claim; labeled fallback or explanation |
| On | Any | Failure | Contained error with retry; no personalization claim; no silent fallback inside the failed section |
| Unreadable preferences | Unknown | Any | Personalization off for the session; honest state; reset available |

### Guest and account scope matrix

| Scope | Source of seeds | Stored where | Shown when | Cross-scope behavior |
|---|---|---|---|---|
| Guest | Read locally, read-only, only to exclude already-saved titles; never used as seeds | Device-local saved titles remain on the device; no recommendation preferences are created | No account is active | Labeled non-personalized fallback; zero saved-title transmission |
| Account | Active account's watchlist and favorites | According to the approved account model | The account is active | Never mixed with unadopted guest data; hidden after sign-out |

### Repetition and control matrix

Dismiss, rotation, personalization toggle, and reset rows apply only in an approved account scope. The guest fallback has no such controls in the initial release.

| Event | Effect on recommendations | Effect on saved data |
|---|---|---|
| Save a title | Excludes it from recommendations; when personalization is on in an approved account scope, may add a new seed and section | Saved list changes as defined by feature 007 |
| Remove a title from a collection | May make it eligible again; when personalization is on in an approved account scope, may remove a seed and its section | Saved list changes as defined by feature 007 |
| Dismiss a title | Excludes it from all recommendation sections until reset or browser data is cleared | None |
| Show different titles | Advances only that seed's section to the next usable provider page | None |
| Turn personalization off | Removes personalized sections and claims; stops using saved titles | None |
| Reset recommendation controls | Clears dismissals and rotation positions; keeps on/off choice | None |
| Clear browser data (guest) | Loses saved titles; guest scope has no recommendation preferences in the initial release | Guest lists lost, as disclosed by feature 007 |
| Sign out (account scope) | Hides account-derived recommendations; the guest non-personalized fallback resumes | Per feature 007 |

## Recommendation Decisions Requiring Validation

These items are recorded as decisions that require product, privacy, provider, or legal validation before release. They MUST NOT be silently resolved by implementation.

| ID | Decision requiring validation | Why it matters | Validation owner |
|---|---|---|---|
| RV-01 | Whether TMDB's documented recommendation and similar-content lists may be used for this purpose, with the required attribution, display, and caching terms. | The capability depends on permitted provider use; if not permitted, the affected section cannot ship. | Product, legal, provider terms |
| RV-02 | Whether the approved privacy and consent basis permits the on-by-default model with a first-use disclosure and one-step off control. The product default is settled as on in an approved account scope; privacy and legal approval of the disclosure and lawful basis remains. | Affects trust, consent, and privacy obligations; the product default must still be approved for lawful use. | Product, privacy, legal |
| RV-03 | Future consideration only: whether a later release should filter recommendations by availability. The initial release does not filter, as clarified on 2026-11-25. | Availability is incomplete and region-limited; filtering could improve relevance but empty sections and hide titles. | Product, availability owner |
| RV-04 | The exact feature 001 home contract update required to permit the recommendation area on the Home destination. Home is confirmed as the host and no new destination is added, as clarified on 2026-11-25. | The foundation restricts the home placeholder and Settings; the contract update is still required before implementation. | Product, design, feature 001 owner |
| RV-05 | The section cap of two and the item cap of 12 for the initial experience, and whether "Show different titles" is the right repetition control in an approved account scope. | Caps affect calmness, provider pagination, and the usefulness of the experience; usability validation is needed. | Product, design, research |
| RV-06 | Whether authenticated personalization will be offered, and how account retention and deletion apply to recommendation preferences and dismissals. | Depends on the open account model (OD-07) and privacy obligations. Without it, only the non-personalized fallback ships. | Product, privacy, account owner |
| RV-07 | Whether explicit taste preferences such as genres or content types should be introduced, and how they would be disclosed and controlled. | Introducing them expands personal data collection and requires a separate approved capability; they are not inferred here. | Product, privacy |
| RV-08 | Whether watched status should become a recommendation signal once that capability exists, and how it would be labeled. | Watched status is a separate capability; using it would change the basis and the explanation. | Product, data owner |
| RV-09 | Whether recommendation sections should appear on other surfaces such as Browse, Search, or the detail page, and which owning features would need contract updates. | Current feature contracts fix those surfaces; adding sections requires coordinated product and feature changes. | Product, feature owners |
| RV-10 | Future consideration only: whether a dedicated recommendation destination or primary-navigation entry should exist. The initial release uses Home only and adds no destination, as clarified on 2026-11-25. | Would change information architecture beyond the home area and is intentionally excluded here. | Product, design |
| RV-11 | Whether recommendation content may be cached between visits and, if so, for how long and with what freshness label. | Affects honesty when the provider is unavailable and the visitor sees earlier content. | Product, provider terms |
| RV-12 | Whether non-movie and non-TV entities (for example, episodes or collections) should ever be recommended. | Current scope and the catalog are movie/TV based; widening it would change the domain and card contracts. | Product, catalog owner |
| RV-13 | Whether account-scope dismissals and rotation positions should have a maximum size or automatic expiry. | Bounded data avoids unbounded growth, but expiry could surprise the visitor; both need a product decision. | Product, privacy, engineering |
| RV-14 | Whether the recommendation area should disclose the provider's role in a separate attribution line in addition to existing catalog attribution. | Provider terms may require specific wording that product copy must honor. | Legal, provider terms, design |
| RV-15 | Deferred future decision: how guest seed-based personalization could exist without violating feature 007's rule that guest saved data is never transmitted. Not part of the initial release. | The clarified initial guest scope is non-personalized only; any future guest model requires a separate approved capability. | Product, privacy, feature 007 owner |
| RV-16 | Deferred future decision: feasibility, explainability, and product approval of a client-local deterministic association model, such as local genre overlap, that produces guest personalization without transmitting saved data. Not part of the initial release. | If revisited, it adds a new truthful basis and requires its own validation; it must not become profiling. | Product, engineering, privacy |
| RV-17 | Whether the in-place Movies / TV shows scope in the non-personalized fallback is approved and whether its labels are sufficient. The scope is component state only and creates no stored preference. | It is the only visitor control added by the initial release and affects discoverability and copy. | Product, design |

RV-15 and RV-16 are deferred future decisions. They are not release gates for the initial guest scope, which is non-personalized only. RV-17 confirms an implemented interaction (FR-153/FR-154); it is not a deferred capability.

## Recorded Decisions

| ID | Decision | Basis |
|---|---|---|
| RD-01 | The feature is specified but not promoted to MVP; release requires the product-overview update and the gates in the Product Scope Alignment section. | `docs/product-overview.md` lists recommendations as post-MVP and OD-11 open, and Section 11 excludes them from the initial product. |
| RD-02 | The host surface is the Home destination, using one recommendation area with bounded sections and no new navigation destination. | Confirmed by clarification on 2026-11-25; the product vision describes a calm personal home view, and a new top-level destination is a larger information-architecture decision recorded as RV-10. |
| RD-03 | Personalized sections are seed-per-section, capped at two, and never merge multiple seeds into one explanation. | Keeps every reason literally true and deterministic; avoids inventing a combined taste claim. |
| RD-04 | Provider order is preserved after exclusions; Walplay does not re-rank recommendations. | Matches the catalog and detail features' honesty rules and avoids an unjustified quality or fit claim. |
| RD-05 | The only initial personalization signal is saved titles, used only in an approved account scope; favorites and watchlist are equally eligible; explicit preferences and watched status are conditional future inputs. | Only saved titles exist today; the product overview forbids user profiling beyond documented requirements and treats watched status and preference capabilities separately. |
| RD-06 | Provider popularity is allowed only as a clearly labeled non-personalized fallback, never as personalized recommendation. The fallback uses one provider-declared current popular list at a time (FR-153) and MUST NOT merge trending, top-rated, movies/TV, or Walplay-computed rankings. | The product must not misrepresent popularity or provider ranking as personalization, and the fallback must have a single truthful basis. |
| RD-07 | The fallback appears as an alternative to unavailable personalization, not as a silent substitute inside a failed personalized section. | Preserves the distinction between empty, insufficient, disabled, and failed states. |
| RD-08 | Repetition is controlled by exclusion of saved and dismissed titles, stable output, and a visitor-initiated "Show different titles" action in an approved account scope. No impression tracking or behavioral rotation is used. | Avoids profiling and non-deterministic behavior while giving the visitor control. |
| RD-09 | The personalization control lives in the recommendation area because feature 001 restricts Settings to language and the storage notice. | Avoids silently widening the Settings contract; a later Settings placement requires updating feature 001 (RV-04). |
| RD-10 | The initial guest scope creates no recommendation preferences. Any future guest personalization must use device-local, versioned preferences with the same loss conditions as feature 007. | Reuses the guest persistence boundary and avoids introducing an account or server dependency. |
| RD-11 | Recommendation failures are contained per section, with an area-level error only when all recommendation content fails. | Recommendations are optional content and must not take down the home destination or personal lists. |
| RD-12 | Provider method claims are prohibited; the product explains the active scope's truthful basis — saved-title association in an approved account scope, or provider popularity in guest scope — and the provider association. | The provider's method is not documented as a verified Walplay behavior. |
| RD-13 | The initial guest scope is the labeled non-personalized fallback only. Guest saved titles are not used as seeds and are never transmitted; they are read locally, read-only, only to exclude already-saved titles from the fallback. Seed-based guest personalization is deferred to a separate approved capability. | Confirmed by clarification on 2026-11-25 and required by feature 007's no-transmission rule; the local exclusion interpretation is recorded in research.md D-06. |
| RD-14 | In an approved account scope with eligible saved titles, personalization defaults to on for a visitor who has not turned it off, with a first-use disclosure and a one-step off control; a stored off choice is honored. | Confirmed by clarification on 2026-11-25; privacy and legal approval of the disclosure and lawful basis remains RV-02. |
| RD-15 | Recommendations are not filtered by streaming availability in the initial release; availability remains a separate, informational capability. | Confirmed by clarification on 2026-11-25; avoids empty sections and unsupported availability inferences. |
| RD-16 | In an approved account scope, the provider recommendation list is the primary candidate pool; the similar-title list is used only when the recommendation list yields no usable candidate; the lists are never merged in one section. | Confirmed by clarification on 2026-11-25; preserves a single provider order and deterministic behavior. |
| RD-17 | The non-personalized fallback offers an in-place Movies / TV shows scope, shows one provider popular list at a time, defaults to movies, and is component state only. | Keeps both supported content types discoverable without merging provider lists, creating a stored preference, or adding a destination; product/design confirmation is RV-17 and the behavior is FR-153/FR-154. |

## Assumptions

- **Post-MVP gate**: Recommendations remain a post-MVP capability until the product overview is explicitly updated. This specification is planning context, not a commitment to ship.
- **Provider continuity**: TMDB remains the approved initial metadata provider. The feature reuses its documented recommendation, similar-title, and popularity capabilities through the existing provider boundary. No additional recommendation provider is selected.
- **Content scope**: Recommendations are limited to movies and TV shows, matching the entertainment catalog. Episode-level, people, and collection recommendations are out of scope.
- **Guest priority**: The initial release is guest-first in access: every guest can use the non-personalized fallback without an account. Guest saved titles are not used as seeds and are read locally, read-only, only to exclude already-saved titles, and seed-based guest personalization is deferred. Accounts are optional and conditional on OD-07.
- **Home host**: The home destination is the intended host, confirmed by clarification. The foundation home placeholder must be updated through feature 001's contract, and a future personal home view must coexist with, not absorb or duplicate, the recommendation area.
- **No new navigation**: No primary-navigation entry, top-level route, or Settings section is added. The area is reachable from the home destination, which is the default route.
- **Saved-title equality**: In an approved account scope, watchlist and favorites are equally valid recommendation signals. Favorites are not treated as a stronger taste signal, consistent with feature 007's prohibition on ranking the collections.
- **Deterministic first**: The initial capability is deterministic and explainable. No learning, optimization, experimentation, or multi-armed bandit behavior is assumed.
- **Provider opacity**: The provider's reason for relating two titles is not known to Walplay. The only claim the product can make is that the visitor saved the seed and the provider associated the recommended title with it.
- **Availability independence**: Recommendations are not availability-filtered in the initial release, confirmed by clarification. Availability, when shown, remains governed by feature 006 and is not a recommendation promise.
- **Privacy boundary**: Recommendation data is limited to account-scope saved-title identities, membership, timestamps, the personalization choice, dismissals, rotation positions, and approved explicit preferences. Guest scope does not create recommendation preference data; guest saved titles are never used as seeds or transmitted and are read locally, read-only, only to exclude already-saved titles. No behavioral history or inferred profile is created.
- **Disclosure model**: Confirmed by clarification: in an approved account scope, personalization defaults to on for a visitor who has not turned it off, with a first-use disclosure and a one-step off control; a stored off choice is honored. Privacy and legal approval of the disclosure and lawful basis remains RV-02.
- **Supported experience**: Standard responsive web expectations, WCAG 2.2 AA, English and Spanish, keyboard and screen-reader support, and reduced-motion support apply as defined by the constitution and product overview.
- **Performance**: The area loads independently and never blocks the rest of the home destination. A five-second settle target is a quality benchmark, not a provider guarantee.
- **No offline promise**: Recommendations are not available offline by design, and no background synchronization, push, or service-worker behavior is introduced.
- **No commercial influence**: No advertising, sponsorship, affiliate placement, or paid ranking affects recommendations.
- **Localization of provider text**: Provider titles, artwork text, and provider-supplied descriptions remain as supplied. Walplay localizes only its own copy and reasons.

## Dependencies

- **Feature 001 — App foundation**: The home destination and Settings restrictions must be updated to permit a recommendation area on the home route. No new navigation or Settings content may be added without that update.
- **Feature 002 — Entertainment catalog**: Reuses the catalog card contract, provider boundary, provider attribution, supported content types, and detail navigation. No catalog section order or provider ranking may be changed.
- **Feature 003 — Search and discovery**: Provides the Browse and Search actions used by insufficient-data states. No search ordering or results may be changed.
- **Feature 004 — Entertainment details**: Provides the type-specific detail destination and owns the detail page's provider-supplied similar and collection sections. This feature MUST NOT duplicate or relabel them.
- **Feature 006 — Streaming availability**: Owns any availability display and region restrictions. Recommendations do not claim or filter availability in the initial release.
- **Feature 007 — Watchlist and favorites**: Provides saved-title identities, membership, timestamps, guest device-local persistence, account adoption, and scope rules. Recommendation generation is read-only over that data. Feature 007's guest no-transmission rule means guest saved titles are not used as seeds and are read locally only for exclusion in the initial release; any future guest model requires RV-15/RV-16 and an explicit amendment.
- **Account model (OD-07)**: Required for any seed-based personalization. Until approved, authenticated personalization remains unavailable and only the non-personalized fallback ships.
- **Guest data-flow decision (RV-15, RV-16)**: Deferred future work, not required for the initial guest baseline. Guest scope remains non-personalized and transmits no saved data.
- **Provider capability and terms**: TMDB recommendation, similar-title, and popularity operations, with permitted attribution and caching, are required. RV-01 must resolve before release.
- **Product decision and product-overview update**: Required to promote recommendations from post-MVP candidate to approved scope (OD-11, Sections 5, 6, and 11).
- **Privacy and legal review**: Required for the account-scope consent model, saved-title use, recommendation preferences, and provider attribution.
- **Personal home view (future)**: If that MVP capability is specified, this feature's area must integrate with its placement and must not replace its saved summary.

## Out of Scope

- Social recommendation feeds, shared recommendations, follower activity, public profiles, and any cross-user signal.
- Machine learning, artificial intelligence, generative recommendations, model training, embeddings, collaborative filtering built by Walplay, and paid recommendation services.
- User profiling beyond saved-title identities, collection membership, save timestamps, account-scope recommendation controls, and any separately approved explicit preference.
- Guest seed-based personalization in the initial release. Any future guest model requires a separate approved capability and an explicit amendment to feature 007.
- Transmitting guest saved titles to a server as a profile or recommendation history. The initial release transmits no guest saved data for recommendations.
- Behavioral tracking: search terms, browsing history, click history, watch time, time of day, device fingerprinting, location tracking, cross-site data, demographics, and sensitive-attribute inference.
- Recommendations on Browse, Search results, the detail page's related area, the Saved collections, or any other surface owned by another feature.
- A dedicated recommendation destination, a new primary-navigation entry, or new Settings content.
- Recommendations of episodes, people, collections, or provider entities outside the movie and TV show catalog.
- Sponsored, promoted, paid, affiliate, or commercially prioritized recommendations.
- Notifications, reminders, emails, push messages, and calendar entries.
- Watched status, personal ratings, notes, episode-level progress, and using any of them as recommendation signals.
- Account registration, authentication, profile management, and synchronization design.
- Availability filtering, availability claims, outbound provider destinations, playback, trailers, and Live TV.
- Offline recommendations, background refresh, push updates, service workers, and native applications.
- Analytics or experimentation intended to profile visitors or optimize engagement.
- Implementation tasks, technical design, endpoint selection, database schema, and provider selection.
- Any claim that recommendations are personalized when they are based only on provider popularity or provider ranking.

## Appendix A — Provider Capability Evidence (verified 2026-11-25, non-normative)

This appendix records the provider capabilities that the requirements rely on. It is evidence for planning and does not override current provider terms, which govern display, attribution, caching, and permitted use.

| Provider capability | Documented behavior relevant to this feature | Consequence for Walplay |
|---|---|---|
| Movie recommendations | TMDB documents a recommendation list for a movie (`/movie/{id}/recommendations`) that returns provider-ordered, paginated movie results. | Primary candidate pool for a personalized section built from a saved movie seed in an approved account scope, subject to provider terms and exclusions. |
| Movie similar titles | TMDB documents a similar-titles list for a movie (`/movie/{id}/similar`) that returns provider-ordered, paginated movie results. | Used only when the movie recommendation list yields no usable candidate; never merged with the recommendation list. Its internal derivation is not documented as a Walplay-verified behavior. |
| TV recommendations | TMDB documents a recommendation list for a TV series (`/tv/{id}/recommendations`) that returns provider-ordered, paginated TV results. | Primary candidate pool for a personalized section built from a saved TV seed in an approved account scope. |
| TV similar titles | TMDB documents a similar-titles list for a TV series (`/tv/{id}/similar`) that returns provider-ordered, paginated TV results. | Used only when the TV recommendation list yields no usable candidate; never merged with the recommendation list. |
| Popularity-based lists | TMDB documents popular and trending lists used by the catalog feature, ordered by provider popularity criteria. | Usable only as the clearly labeled, non-personalized fallback and guest baseline. Walplay uses the current popular list, not a merged or Walplay-computed ranking. The catalog feature already consumes these lists, so no second integration is introduced. |
| Attribution and brand guidance | TMDB's terms and brand guidance require attribution wherever its data or artwork appears, including the official mark and non-endorsement statement defined by the project's catalog and detail contracts. | The recommendation area must reuse the approved attribution treatment. Recommendation-specific placement and wording must be validated (RV-14). |

**Provider personalization boundary**: TMDB does not expose per-Walplay-visitor recommendation data. A request based on the same seed and provider parameters returns provider-side results that are independent of the visitor's saved-title list. Walplay's personalization is therefore limited to selecting seeds from the visitor's saved titles and filtering the provider's response in an approved account scope. Guest scope does not use saved titles as seeds and receives only the non-personalized fallback; it may read saved titles locally, read-only, only to exclude already-saved titles.

**Candidate policy**: In an approved account scope, the recommendation list is the primary candidate pool. The similar-title list is used only when the recommendation list yields no usable candidate after exclusions. The two lists are not merged or interleaved within one section, and "Show different titles" stays within the list that produced the section.

**Derivation opacity**: The provider documents that these lists exist but does not document a method that Walplay can verify as genre matching, audience similarity, or collaborative filtering. The product therefore treats the lists as opaque associations and makes no method claim.

**Coverage and completeness**: Provider result counts, pagination depth, language coverage, and regional catalog coverage vary. A recommendation list may be empty, short, duplicated, or contain adult-flagged and unsupported entities. The requirements handle these cases by filtering, omitting sections, and showing honest states rather than assuming completeness.

**Validation required**: Prior to release, the provider terms must be confirmed for recommendation and similar-content display, caching, attribution, and artwork use. If a required use is not permitted, the affected section must be omitted. This evidence does not authorize use beyond current terms.
