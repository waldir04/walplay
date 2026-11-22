# Feature Specification: Entertainment Catalog

**Feature Branch**: `feat/002-entertainment-catalog`

**Created**: 2026-11-22

**Status**: Draft

**Input**: Define the entertainment catalog experience that lets visitors browse movies and TV shows supplied by TMDB, organized into provider-supported sections, with paginated category lists, resilient loading and failure states, responsive and accessible layouts, navigation to a minimal detail destination, and a strict boundary between provider data and Walplay's internal domain model. Advanced search, full detail pages, availability, watchlist, favorites, recommendations, and playback are out of scope.

## Clarifications

### Session 2026-11-22

- Q: Should this specification treat TMDB as the approved initial metadata provider, or must it stay provider-neutral until the Product Overview's open provider decision (OD-02) is resolved? → A: Approve TMDB as the initial provider for this feature and update Product Overview OD-02 to record it.
- Q: When a visitor opens a minimal detail address directly, how should the catalog obtain the title and card metadata it must display? → A: Use a minimal server-side provider lookup by title ID and media type, map only card fields, and show a localized not-found state for unknown titles.
- Q: Should the minimal detail destination be delivered by this catalog feature, or by a separate detail feature that must exist first? → A: This catalog feature owns the minimal detail destination so card navigation is never dead.
- Q: Which Spanish provider language setting should the catalog request for Spanish interface users? → A: Use the provider's `es-ES` setting for the Spanish interface.
- Q: When the interface language changes after multiple category pages have been loaded, what should happen to the loaded list? → A: Reset the category list to its first page in the new language and discard previously loaded pages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse movies and TV shows by media type (Priority: P1)

A visitor opens the new Browse destination and immediately sees movie titles arranged in meaningful sections. They can switch to TV shows and back, and the address, current media type, and section content always agree.

**Why this priority**: Browsable catalog content is the core value of this feature. Without a reliable media-type entry point, no other catalog behavior can be evaluated.

**Independent Test**: Open Browse from the primary navigation, verify the default media type and section order, switch to TV shows, verify that movie content is fully replaced, then use browser back and forward and open both type addresses directly. Use controlled catalog data so section membership, order, and media types are known.

**Acceptance Scenarios**:

1. **Given** a visitor opens Browse, **When** the catalog appears, **Then** Movies is the selected media type, exactly one catalog page heading is present, and the Movies view shows the supported sections in the required order.
2. **Given** the Movies view, **When** the visitor selects TV Shows, **Then** the address and the selected media type update, TV content replaces the movie content, and no movie item remains visible.
3. **Given** a direct address for either media type, **When** the catalog opens, **Then** the correct type is selected and its content is shown inside the shared application shell.
4. **Given** the visitor has switched media types, **When** they use browser back or forward, **Then** the matching media type and content are restored without stale items from the other type.
5. **Given** the active provider does not support one of the catalog sections, **When** the catalog renders, **Then** that section is omitted entirely and no empty section placeholder is shown for it.
6. **Given** any supported section, **When** it renders, **Then** items appear in the provider's order and Walplay does not re-rank, re-sort, or invent a ranking explanation.

---

### User Story 2 - Open a category list and a title (Priority: P1)

A visitor who wants more than a section preview opens the full category list, reviews results in a consistent card layout, and selects a title to reach its detail destination.

**Why this priority**: Catalog items are only useful if the visitor can go deeper. Category lists and title navigation complete the browse-to-detail journey that later features build on.

**Independent Test**: Open a supported category through its section action and through a direct address, verify the first page and provider order, activate a card, confirm the detail destination identifies the selected title and media type, and return to the catalog.

**Acceptance Scenarios**:

1. **Given** a section whose provider documents pagination, **When** the visitor activates its "See all" action, **Then** the corresponding category list opens at its stable address with a category heading and the first page of results in provider order.
2. **Given** a section whose provider does not document pagination, **When** the section renders, **Then** it shows its bounded preview without a "See all" action and does not imply that more results are reachable.
3. **Given** any catalog card, **When** the visitor activates it, **Then** the application opens a unique, type-specific detail destination that identifies the selected title and media type.
4. **Given** the detail destination reached from a card, **When** it renders, **Then** it shows the known title, media type, available card metadata, a clear statement that complete details are not yet available, the required provider attribution, and a working action that returns to the originating media type or category.
5. **Given** a detail address opened directly without preceding catalog navigation, **When** it renders, **Then** it resolves inside the shared shell without a technical error, identifies the selected title and media type by retrieving only the minimal card fields through the server-side boundary, does not fabricate missing metadata, and offers a working return to the catalog.
6. **Given** the visitor is on a category list, **When** they switch media type, **Then** the corresponding category for the other media type opens when supported, or that media type's catalog landing opens when it is not.
7. **Given** an unknown title address, **When** it is opened, **Then** a localized not-found or unavailable state appears inside the shell and no raw technical detail is exposed.

---

### User Story 3 - Load more results without losing context (Priority: P2)

A visitor reviews a long category list, loads additional results, and continues browsing without losing the titles already shown or the position of the content.

**Why this priority**: Catalogs are larger than one page. Consistent incremental loading is required for the browse experience to remain usable and to satisfy the provider's paged data model.

**Independent Test**: Open a paginated category with known multi-page data, load successive pages, verify append behavior, duplicate handling, end-of-list messaging, failure of a later page, and repeated activation.

**Acceptance Scenarios**:

1. **Given** a category with more than one result page, **When** the first page loads, **Then** a "Load more" control is available and the first page is shown in provider order.
2. **Given** the visitor activates "Load more", **When** the next page succeeds, **Then** its items are appended below the existing items, all existing items remain present, and the appended count is announced once.
3. **Given** multiple pages are available, **When** the visitor continues loading, **Then** items are added without duplicates in the already loaded list and without reordering existing items.
4. **Given** the final page has been loaded, **When** the last items appear, **Then** the "Load more" control is removed and a localized end-of-list message is shown and announced.
5. **Given** a load-more request fails, **When** the failure is reported, **Then** the existing items remain visible and usable, an inline localized error with a retry action appears for the failed page, and the whole list does not collapse into a page-level error.
6. **Given** the visitor activates "Load more" repeatedly while a request is pending, **When** the requests are processed, **Then** only one request per activation is issued, no duplicate items appear, and the control exposes a busy state.
7. **Given** a direct category address, **When** it is opened without previous catalog navigation, **Then** the first page loads and the previously loaded page count is not required to be restored.

---

### User Story 4 - See consistent cards when metadata is incomplete (Priority: P2)

A visitor sees a stable, readable card for every displayed title even when the provider omits a poster, a release year, a rating, or another optional field.

**Why this priority**: External metadata is not guaranteed. Inconsistent cards, broken images, or fabricated values would undermine trust and make the catalog feel unreliable.

**Independent Test**: Render the catalog with controlled items that omit each optional field, contain empty values, and include an item with no usable identity. Verify that every displayed card remains complete and that invalid items are excluded.

**Acceptance Scenarios**:

1. **Given** a title without a poster, **When** its card renders, **Then** a neutral fallback treatment that includes the title and media type is shown instead of a broken image or an empty area.
2. **Given** a title without a release year, **When** its card renders, **Then** no year label, placeholder character, or invented date is shown.
3. **Given** a title with no rating or a provider rating based on zero votes, **When** its card renders, **Then** no rating is shown and no zero value is presented as a real rating.
4. **Given** a title whose localized title is missing or empty, **When** it is mapped, **Then** the original title is used; when both are missing, the item is not displayed.
5. **Given** a title whose genre names cannot be resolved, **When** its card renders, **Then** genres are omitted and no raw genre identifiers are displayed.
6. **Given** a poster image fails to load, **When** the failure occurs, **Then** the same fallback treatment appears without layout shift and without exposing an error.
7. **Given** a provider response in which every item is unusable, **When** the section or category renders, **Then** it shows a localized empty or unavailable state rather than a blank grid.

---

### User Story 5 - Recover from loading, empty, and provider failures (Priority: P2)

A visitor always understands whether catalog content is loading, empty, stale, or temporarily unavailable, and can recover or continue using the rest of the application.

**Why this priority**: The catalog depends on an external provider. Honest, isolated failure behavior is required so provider problems never break the whole application or misrepresent missing data as current.

**Independent Test**: Force slow, empty, malformed, timed-out, rate-limited, and partially failed provider responses, and verify skeletons, announcements, per-section isolation, retry behavior, stale labeling, and continued navigation and language switching.

**Acceptance Scenarios**:

1. **Given** catalog content is loading for the first time, **When** the surface renders, **Then** a layout-matching skeleton appears, the region exposes a busy state to assistive technology, decorative skeleton shapes are hidden, and no spinner-only or bare "Loading" treatment is used.
2. **Given** one section fails while other sections succeed, **When** the catalog renders, **Then** the failed section shows a localized inline error with a retry action while the other sections, navigation, media switch, and attribution remain usable.
3. **Given** every primary catalog section fails, **When** the page settles, **Then** a localized page-level error with a retry action appears inside the shell, and the visitor can still use navigation, switch language, and leave the page.
4. **Given** a category or section has no valid results, **When** it settles, **Then** it explains that no titles are available right now and offers a retry and, where meaningful, a media-type switch; it contains no fabricated titles.
5. **Given** a failed surface offers retry, **When** the visitor activates it, **Then** the failed request is genuinely attempted again, only that surface enters its loading state, and repeated failure shows the same safe localized result.
6. **Given** previously loaded catalog data exists and the provider becomes unavailable, **When** that data is still shown, **Then** it is clearly labeled as cached or stale with its last update time and is not presented as current; when no usable cached data exists, an unavailable state is shown instead.
7. **Given** the provider reports a rate limit, a timeout, an unavailable service, or an invalid response, **When** the error reaches the interface, **Then** it appears as a stable localized unavailable or temporarily limited state without a raw status code, provider message, or internal identifier.
8. **Given** a one-time retry action, **When** it is activated, **Then** it does not create an uncontrolled retry loop, and repeated activations remain user-initiated.

---

### User Story 6 - Use the catalog on any screen with keyboard or assistive technology (Priority: P3)

A visitor browses, switches media types, loads more results, and opens titles on a phone, tablet, desktop, keyboard, or screen reader without losing content, focus, or meaning.

**Why this priority**: The catalog is a primary product surface and must meet the accessibility and responsive standards that govern every Walplay feature.

**Independent Test**: Exercise the full catalog journey at 360, 768, 1024, and 1440 pixels, at 200% zoom, with keyboard only, with a screen reader, with reduced motion, and in both interface languages.

**Acceptance Scenarios**:

1. **Given** any supported viewport width, **When** the catalog renders, **Then** content remains readable, cards preserve a consistent artwork aspect ratio, controls remain reachable, and no horizontal page scrolling, clipped text, or overlapping controls appears.
2. **Given** the visitor uses only a keyboard, **When** they move through the catalog, **Then** the media switch, section actions, every card, "Load more", retry actions, and return actions are reachable in a logical order with a visible focus indicator and no keyboard trap.
3. **Given** a screen reader, **When** the catalog loads, appends results, reaches the end, or reports an error, **Then** the catalog structure, card names, media types, loading state, appended count, end state, and error state are announced once and meaningfully.
4. **Given** any card, **When** it is reviewed with assistive technology, **Then** its accessible name includes the title and media type, plus the year and rating when present, the artwork does not duplicate the announcement, and the card contains exactly one interactive target.
5. **Given** the visitor uses reduced motion, **When** loading or state changes occur, **Then** skeleton animation is suppressed or reduced and no layout-shifting motion occurs.
6. **Given** the visitor switches between English and Spanish, **When** the catalog settles, **Then** all catalog interface labels and all provider metadata that supports the selected language are presented in that language, no mixed-language final state remains, locale-aware number and date formatting is used, and a category list with previously loaded pages restarts at its first page in the new language.
7. **Given** a long translated title or a narrow viewport, **When** the card renders, **Then** the visible text wraps or truncates without clipping and the full title remains available to assistive technology.

---

### Edge Cases

- A title has a null poster, an empty poster reference, a broken image URL, or an image that fails to load; a fallback is shown without layout shift.
- A title has an empty release or first-air date, a malformed date, or a date without a usable year; the optional field is omitted.
- A title has zero votes, a missing average, an out-of-range average, or a rating without a vote count; the rating is omitted rather than shown as zero or as fact.
- A title has an empty localized title but a usable original title; the original title is shown. Neither title is usable; the item is excluded.
- A title has an unknown genre identifier, an empty genre list, or genre names that are unavailable in the selected language; genres are omitted without exposing identifiers.
- The provider returns duplicate items across pages, shifts items between pages between requests, returns fewer items than a full page, or reports a last page inconsistent with the returned items; the loaded list does not duplicate items, does not order unstable content, and still ends safely.
- The provider returns an empty results array, a null results array, a malformed item, or a response that fails boundary validation; invalid items are dropped and an all-invalid result becomes an empty or unavailable state.
- The provider times out, returns a rate-limit response, returns a server error, or becomes unreachable after a previous successful load; the affected surface degrades locally, cached content is labeled stale, and the rest of the application remains usable.
- The image service is unavailable while catalog metadata is available; cards remain complete with fallbacks.
- The visitor switches media type or category rapidly, or switches language while a request is pending or after multiple category pages have loaded; the final selection wins, the category list restarts at its first page in the new language when the language changes, no stale content from the previous selection or language remains, and announcements are not duplicated.
- A section is unsupported by the active provider, while other sections are supported; the unsupported section is omitted, not shown as empty or failed.
- The provider includes an adult-flagged title; it is excluded from all catalog surfaces.
- The visitor opens a category or detail address directly, refreshes a category page, or uses browser back and forward; the address remains the source of truth and no wrong-type content appears.
- A direct detail address references a title the provider no longer returns, or its minimal lookup times out; the destination shows a localized not-found or unavailable state with a working return and no fabricated metadata.
- The visitor reaches the final page, requests a page beyond the reported last page, or loads pages until the provider stops returning items; the catalog ends with a clear end state and no infinite loading action.
- The visitor uses 200% zoom or enlarged text at 360 pixels with a long Spanish title; the layout reflows without horizontal scrolling or loss of controls.
- The visitor is offline after the application shell has loaded; the catalog shows an unavailable or stale state and no fabricated content.
- The provider unexpectedly drops support for a section between visits; the catalog reflects the active capability rather than a cached assumption.

## Requirements *(mandatory)*

### Functional Requirements

#### Catalog access, structure, and navigation

- **FR-001**: The application MUST add exactly one new top-level destination, Browse, reachable from the primary navigation and through a direct address, and rendered inside the existing shared application shell.
- **FR-002**: Browse MUST default to Movies and MUST provide a media-type switch between Movies and TV Shows. The selected type MUST be reflected in the address, in the visible selection state, and in the content shown. The Browse entry address MUST resolve to the Movies type address so the selected type is always present in the address.
- **FR-003**: Direct addresses for both media types MUST resolve correctly, and browser back and forward MUST restore the matching media type and content without showing items from the other type.
- **FR-004**: Each media-type view MUST present the supported catalog sections in this fixed order: trending, popular, and top rated. Trending MUST use a weekly window unless the provider exposes only a daily window.
- **FR-005**: The catalog MUST render only sections that the active provider declares as supported. An unsupported section MUST be omitted entirely and MUST NOT appear as empty, failed, or "coming soon".
- **FR-006**: Each supported section MUST show a bounded preview drawn from the first provider page in provider order, MUST identify the section with a heading, and MUST offer a "See all" action only when the provider documents pagination for that section. The preview MUST NOT exceed one provider page.
- **FR-007**: The catalog MUST NOT invent categories, rankings, time windows, or popularity explanations beyond the sections the provider supports. Provider order MUST be preserved, and provider popularity values MUST NOT be presented as Walplay ratings or recommendations.
- **FR-008**: Each media type MUST expose stable addresses for its paginated category lists. A direct category address MUST load the first page of that category for the correct media type.
- **FR-009**: When the visitor switches media type on a category list, the corresponding category for the other media type MUST open when supported; otherwise that media type's landing MUST open. When the visitor switches media type on a landing, the other landing MUST open.
- **FR-010**: Every catalog card MUST expose one unique, type-specific detail destination. Activating the card MUST navigate to that destination and update the address.
- **FR-011**: This feature MUST provide only a minimal detail destination. It MUST identify the selected title and media type, show the same available card metadata, state clearly in localized text that complete details are not yet available, preserve provider attribution, and offer a working return action. When reached from a card it MUST use the card's known metadata; when opened directly it MUST use only the minimal lookup described in FR-012. It MUST NOT present full details, cast, seasons, episodes, availability, recommendations, trailers, user actions, or playback.
- **FR-012**: A detail destination opened directly without preceding catalog navigation MUST resolve inside the shell, derive the media type from the address, retrieve only the minimal card fields through the server-side boundary, avoid fabricating metadata, and provide a working return to the catalog. A title the provider reports as unknown, or a lookup that fails, MUST show a localized not-found or unavailable state without technical detail.
- **FR-013**: Rapid media-type, category, or title navigation MUST result in the final selection being shown. Stale content, duplicate page headings, stale announcements, and content from a previous selection MUST NOT remain.

#### Card presentation and incomplete metadata

- **FR-014**: Every displayed catalog card MUST present a consistent primary set: title, media type in text, a poster or a recognizable fallback, a release year when known, and a rating only when meaningful. Optional values MUST be omitted cleanly rather than shown as blank, zero, a dash, or an invented value.
- **FR-015**: The title MUST use the provider's localized title for the selected interface language when available; otherwise the original title MUST be used. An item with neither a usable title nor a usable identity MUST be excluded rather than rendered blank or as "Untitled".
- **FR-016**: The release year MUST be derived from the provider's release or first-air date and shown as a four-digit year. An absent, empty, or invalid date MUST result in no year being shown.
- **FR-017**: A rating MUST be shown only when the provider supplies a valid average and a non-zero vote count, MUST be formatted for the selected locale, and MUST carry enough accessible context to be understood as a rating out of its known scale. It MUST NOT be shown when votes are zero or the value is missing or invalid.
- **FR-018**: Artwork MUST use provider-supplied poster references at approved image sizes. When artwork is absent or fails to load, a neutral fallback containing the title and media type MUST be shown instead of a broken image, empty region, or color-only placeholder.
- **FR-019**: Genre labels are optional. When shown, they MUST be resolved localized names supplied by the provider; unknown identifiers, empty lists, and unavailable names MUST be omitted, and raw provider identifiers MUST NOT be displayed.
- **FR-020**: Every card MUST identify its media type in text, not only through color, position, or an icon. In any context where movies and TV shows could be confused, the media type MUST remain explicit.
- **FR-021**: Each card MUST contain exactly one interactive target, and its accessible name MUST include the full title and media type, plus the year and rating when present. Artwork and fallback decoration MUST NOT duplicate the accessible announcement.
- **FR-022**: Long titles and metadata MUST remain readable without clipping. If visible text is truncated, the full title MUST remain available to assistive technology, and truncation MUST NOT hide the only occurrence of the title.
- **FR-023**: Items that fail boundary validation or lack the minimum usable identity MUST be dropped from the displayed set. A response in which every item is unusable MUST be treated as an empty or unavailable result, never as a blank grid or a crash.

#### Pagination and incremental loading

- **FR-024**: A paginated category list MUST show the provider's first page initially. The result page size MUST follow the provider and MUST NOT be invented by Walplay.
- **FR-025**: A "Load more" control MUST be available when the provider reports additional pages and no load is in progress. Activating it MUST request the next page and append valid items below the existing items.
- **FR-026**: Appending a page MUST preserve all previously loaded items and their order, MUST NOT introduce duplicate items into the loaded list, and MUST announce the number of newly added items once.
- **FR-027**: While a page is loading, the control MUST expose a busy state and prevent duplicate submissions. Existing items MUST remain visible and usable.
- **FR-028**: When the final page has loaded, or the provider returns no further usable items, the "Load more" control MUST be removed and a localized end-of-list message MUST be shown and announced.
- **FR-029**: A load-more failure MUST preserve existing items and MUST show an inline localized error with a retry action for the failed page. It MUST NOT replace the whole list with a page-level error.
- **FR-030**: Section previews MUST NOT paginate and MUST NOT show a "Load more" control. Only category lists may paginate.
- **FR-031**: A direct category address MUST load its first page and MUST NOT display items from another category or media type. Previously loaded pages need not be restored when the category is reopened.

#### Loading, empty, error, stale, and retry states

- **FR-032**: Initial catalog loading MUST use a skeleton that matches the final section and card layout closely enough to avoid a visible content jump. It MUST expose a busy state to assistive technology, hide decorative skeleton shapes, and MUST NOT rely on a spinner or a bare "Loading" message.
- **FR-033**: Catalog sections MUST load and fail independently. A failed section MUST show a localized inline error with a retry action while other sections remain usable. A page-level error MUST appear only when all primary catalog content has failed or is unavailable.
- **FR-034**: A category or section with no usable results MUST show a localized empty state that explains that no titles are available right now and offers a retry action and, where meaningful, a media-type switch. It MUST NOT contain fabricated titles or non-functional actions.
- **FR-035**: Error states MUST be localized, MUST preserve the surrounding shell and navigation, and MUST NOT expose raw provider errors, status codes, response bodies, stack traces, internal identifiers, or provider-specific field names.
- **FR-036**: Every retry action MUST genuinely re-attempt the failed request, MUST affect only the failed surface, MUST prevent concurrent duplicate retries, and MUST remain user-initiated. Repeated failure MUST show the same stable localized state.
- **FR-037**: When last-known-good catalog data is shown while the provider is unavailable, it MUST be labeled as cached or stale with a localized last-update indication. It MUST NOT be presented as current. When no usable cached data exists, an unavailable state MUST be shown instead.
- **FR-038**: Provider timeouts, rate limits, unavailable services, malformed responses, and validation failures MUST map to stable internal catalog states and stable machine-readable error codes. The interface MUST localize those codes into calm, actionable messages.
- **FR-039**: Provider failures MUST NOT prevent navigation, media switching, language switching, attribution display, or already loaded catalog content from working. Other application routes MUST remain unaffected.
- **FR-040**: Beyond FR-013, rapid interface-language changes MUST also prevent an older response from replacing a newer selection. The final language's loading, success, empty, or error state MUST be the only one shown, and pending responses from the previous language MUST NOT render.
- **FR-041**: A failed artwork request MUST not produce a broken image, a persistent error message, or a layout shift; the standard fallback MUST appear.

#### Responsive layout and accessibility

- **FR-042**: The catalog MUST use a responsive card grid that preserves a consistent artwork aspect ratio and increases its column count with available width. It MUST show at least two columns at 360 pixels, at least three at 768 pixels, at least four at 1024 pixels, and at least five at 1440 pixels when enough items exist.
- **FR-043**: At 360, 768, 1024, and 1440 pixels, and at 200% browser zoom, the catalog MUST present content without horizontal page scrolling, clipped text, overlapping controls, or unreachable content. Sections MUST stack, and the media switch and category navigation MUST remain operable.
- **FR-044**: Each catalog surface MUST expose one page-level heading, a logical heading hierarchy, labelled section regions, and the card collection as a semantic collection with an accessible name.
- **FR-045**: All catalog functions MUST be operable by keyboard with a logical focus order, a visible focus indicator, and no keyboard trap. This includes the media switch, section actions, every card, "Load more", retry actions, and return actions.
- **FR-046**: Interactive targets MUST be at least 24 by 24 CSS pixels. Primary controls, media-switch destinations, and "Load more" MUST be at least 44 by 44 CSS pixels.
- **FR-047**: Loading, append, end-of-list, empty, stale, and error states MUST be announced once and meaningfully to assistive technology. Errors MUST be announced as alerts; loading and successful state changes MUST be announced politely without duplicate announcements.
- **FR-048**: When new items are appended, focus MUST remain in a predictable place. If "Load more" remains available, focus MUST stay on it; if it is removed at the end of the list, focus MUST move to the end-of-list status or another logical nearby target.
- **FR-049**: Motion MUST be minimal, MUST respect the visitor's reduced-motion preference, and MUST NOT animate layout-affecting properties in a way that visibly shifts content.
- **FR-050**: Artwork MUST reserve its aspect ratio, use responsive image candidates appropriate to the rendered size, and lazy-load off-screen images so that image loading does not cause layout shift or unnecessary initial transfer.
- **FR-051**: The catalog MUST NOT use hover as the only way to reveal essential information or reach an action.

#### Localization

- **FR-052**: All catalog-owned interface text MUST be externalized and available in English and Spanish, including headings, section labels, media-type labels, card labels, buttons, state messages, end-of-list messages, document titles, and accessibility labels.
- **FR-053**: Provider metadata MUST be requested in the language matching the selected interface language where the provider supports it. For Spanish, the provider language MUST be `es-ES`. When localized metadata is unavailable, the original title MUST be used as a fallback and the interface MUST NOT display a blank field or a raw translation key.
- **FR-054**: Walplay MUST NOT machine-translate or present provider-supplied text as verified Walplay copy. Provider metadata remains attributed to its source.
- **FR-055**: Changing the interface language MUST update all catalog interface text and provider metadata that supports the selected language without a full page reload. While the new language loads, the catalog MUST show a loading state or a clear transition and MUST NOT settle into a mixed-language final state. A category list that has already loaded multiple pages MUST restart from its first page in the new language, and previously loaded pages MUST be discarded rather than retained with mixed-language metadata.
- **FR-056**: Years, ratings, counts, and other displayed numeric or date values MUST use locale-aware formatting. Rating values MUST use tabular numerals where vertical alignment matters.

#### Provider boundary, security, and attribution

- **FR-057**: TMDB MUST be treated as the initial movie and TV show metadata provider for this feature, subject to the provider decision recorded in the Product Overview update and to legal review of attribution, artwork, caching, and usage terms.
- **FR-058**: All provider API access MUST be mediated by Walplay's server-side catalog boundary. The browser MUST NOT call a provider API endpoint directly, and provider credentials MUST NOT appear in client code, browser-delivered assets, image URLs, logs, errors, source maps, or user-facing messages. Artwork image delivery is not provider API access, but any provider image host used by the browser MUST receive no credential.
- **FR-059**: Provider responses MUST be treated as untrusted input and validated at the boundary. Response DTOs MUST NOT reach the interface. Invalid responses and invalid items MUST be rejected safely and mapped to stable internal states.
- **FR-060**: Provider data MUST be mapped into a provider-neutral Walplay catalog model covering identity, media type, localized and original title, release year, rating, genres, artwork, and section membership. Provider field names, provider-specific shapes, and provider numeric popularity scores MUST NOT be exposed to interface or business logic.
- **FR-061**: The catalog MUST depend on internal sections and item contracts, not on TMDB-specific shapes. Replacing the provider MUST NOT require rewriting the catalog's interface behavior; only capability declarations, mapping, and provider access may change.
- **FR-062**: The provider adapter MUST declare which sections it supports and whether each section is paginated. The catalog MUST use those declarations to decide what to render and whether to offer "See all" or "Load more".
- **FR-063**: The provider adapter MUST expose provider section order unchanged; FR-007 governs presentation and prohibits re-sorting, invented ranking algorithms, popularity scores presented as ratings, and recommendation wording.
- **FR-064**: Provider requests MUST use explicit timeouts, bounded retries only for idempotent reads, backoff with jitter, and caching with a defined freshness period. Cached entries MUST be keyed by every parameter that affects the result, including media type, section, language, and page.
- **FR-065**: Repeated identical catalog requests within the freshness period and concurrent identical requests MUST be served from cache or coordinated so that they do not create unbounded or duplicate provider traffic. Provider rate limits and retry-after guidance MUST be respected.
- **FR-066**: Raw provider errors MUST be mapped to stable internal error codes before reaching the interface. Logs MUST NOT contain provider credentials or unfiltered provider payloads.
- **FR-067**: Artwork references MUST be resolved at the boundary using the provider's documented image configuration and approved sizes. Walplay MUST NOT invent image URLs, redistribute artwork outside the provider's permitted use, or alter provider branding. Provider artwork hosts MAY be used for image delivery only when the provider's terms permit it, and the browser MUST NOT attach provider credentials to those requests.
- **FR-068**: Every catalog surface that displays provider data, including section previews, category lists, and the minimal detail destination, MUST display the provider attribution required by current terms, including the official TMDB mark and the required non-endorsement statement, using unmodified official assets and without implying endorsement. The statement MUST remain present in every interface language, and any surrounding explanatory text MUST be localized.
- **FR-069**: The catalog MUST respect provider rate limits, caching, attribution, artwork, and usage restrictions. It MUST NOT use scraping, undocumented private endpoints, authentication bypass, or any mechanism that conflicts with the provider's terms.
- **FR-070**: The catalog MUST exclude adult-flagged titles from all sections, category lists, previews, and detail destinations.

#### Scope boundaries and reuse

- **FR-071**: The catalog MUST reuse the shared application shell, layout, state components, design tokens, internationalization, and accessibility patterns established by feature 001. It MUST NOT duplicate those patterns or introduce a parallel visual language.
- **FR-072**: Catalog-specific presentation MUST remain separated from provider access and from the shared application shell, so that replacing the provider or extending a detail page does not restructure the shell or shared UI.
- **FR-073**: This feature MUST NOT introduce advanced search, text search, free-form filters, personal ratings or notes, watchlists, favorites, watched status, availability information, provider links, recommendations, notifications, sharing, accounts, authentication, video playback, live television, cast or crew details, episodes, seasons, trailers, or full detail pages.
- **FR-074**: This feature MUST NOT change the Settings destination, its navigation entry, or the established shell contract beyond adding the Browse destination, the catalog surfaces described here, and a minimal Home update that replaces the outdated foundation placeholder copy with a working entry point to Browse. It MUST NOT add other Home functionality.
- **FR-075**: The catalog MUST NOT display fabricated titles, artwork, ratings, availability, rankings, or promotional content, and it MUST NOT place third-party tracking or advertising scripts.

### Key Entities *(include if feature involves data)*

- **Media Type**: Walplay's classification of a catalog title as a movie or a TV show. It determines which sections, category addresses, and detail destinations apply, and it is always exposed in text.
- **Catalog Section**: A provider-supported grouping such as trending, popular, or top rated, scoped to one media type. Attributes: identity, localized label, order, capability support, whether it is paginated, a bounded preview, and a category address when pagination is supported.
- **Catalog Item**: A provider-neutral title summary displayed in a card or detail destination. Attributes: stable Walplay identity, media type, localized title, original title, release year when known, rating and vote context when meaningful, genre labels when available, artwork reference or fallback state, and provider attribution reference.
- **Catalog Page Slice**: One requested page within a category list. Attributes: media type, section, page number, valid items, reported total pages or results, end-of-list state, freshness, and load state.
- **Catalog Load State**: The observable state of a section or category, including idle, loading, success, empty, stale, unavailable, rate limited, timed out, or invalid response. It determines the displayed state, retry availability, and assistive announcement.
- **Provider Capability**: The provider's declared support for a section and for pagination, plus the documented request parameters that affect results. It governs which sections and actions may be shown.
- **Provider Reference**: The internal mapping between a provider record and a Walplay catalog item. It remains inside the server-side boundary and is never exposed as a provider-specific interface model.
- **Attribution Notice**: The provider-required mark and non-endorsement statement shown wherever provider data appears, including its reusable placement and localized surrounding context.
- **Catalog Navigation State**: The selected media type, section, category address, and detail destination that the address and interface must keep in agreement, including back-and-forward behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can reach the movie catalog or the TV show catalog from any application page in at most two actions, and every catalog card opens a working detail destination with no dead links.
- **SC-002**: 100% of displayed catalog cards show a title, a textual media type, and either artwork or a recognizable fallback; optional values are absent cleanly, with no blank labels, broken images, or fabricated zeros.
- **SC-003**: For every supported paginated category, a successful load-more action appends the next page without duplicates and without removing or reordering already loaded items in 100% of tested cases.
- **SC-004**: A provider failure in one section leaves all other sections, navigation, media switching, language switching, and the rest of the application usable in 100% of tested failure modes.
- **SC-005**: The catalog passes WCAG 2.2 Level AA checks: automated evaluation reports zero critical or serious violations, and the keyboard and screen-reader journeys pass manual review.
- **SC-006**: The catalog presents all content and controls without horizontal page scrolling, clipping, or unreachable actions at 360, 768, 1024, and 1440 pixels and at 200% browser zoom.
- **SC-007**: Under a mobile profile of 1.6 Mbps down / 750 Kbps up / 150 ms RTT with 4× CPU throttling, the catalog's primary content (the page heading and first section content) becomes visible within 2.5 seconds, and loading states cause no visible content jump.
- **SC-008**: A security review finds zero provider credentials or raw provider error payloads in browser-delivered assets, network responses, logs exposed to the client, or user-facing messages.
- **SC-009**: 100% of catalog surfaces that display provider data show the required provider mark and non-endorsement statement, verified in both languages and at every supported viewport width.
- **SC-010**: Switching interface language updates catalog labels and provider metadata to a single language within one second after the new-language response becomes available, with no final mixed-language card content; the interval is measured from response resolution, not from the user action.
- **SC-011**: 100% of empty category and section results show an explanatory message and a working retry action, and no empty result is presented as a broken or permanently loading surface.
- **SC-012**: At least 95% of test participants can identify the difference between movie and TV catalog content and can locate the action that opens a title, without relying on color alone.

## Assumptions

- **Provider decision**: TMDB is approved as the initial metadata provider for this feature (clarified 2026-11-22). The Product Overview's OD-02 record has been updated to reflect that approval; its artwork, attribution, caching, and legal-review dependencies (OD-13) remain open.
- **Catalog placement**: The catalog is reached through one new top-level Browse destination. Movie and TV separation is handled inside that destination through the media-type switch and type-specific category addresses, rather than by adding two top-level navigation items.
- **Section set**: The catalog exposes only trending, popular, and top-rated sections for movies and TV shows, because these are the sections the selected provider documents. Trending uses a weekly window by default. No additional category, ranking, or editorial grouping is introduced.
- **Previews and pagination**: Section previews are bounded and use the first provider page. Popular and top-rated category lists are paginated because the provider documents a page parameter for them. The trending response includes page metadata, but the provider's current documentation does not list a page request parameter, so trending is treated as a preview only and offers no "See all" action.
- **Detail scope**: Full detail pages are out of scope. A minimal detail destination is provided by this feature only so that catalog card navigation is real and testable; it identifies the selected title and type, states that complete details are not yet available, and contains no detail sections or actions. A directly opened detail address uses only a minimal server-side lookup that maps card fields; it is not a full detail page.
- **Region and availability**: The catalog is not region-filtered and does not claim regional relevance or availability. Any future region behavior requires a separate product decision under the Product Overview's open region decision (OD-12).
- **Adult content**: Adult-flagged titles are excluded from the catalog as a content-safety default. This is recorded as an assumption because the Product Overview does not state a content-rating policy for the catalog.
- **Spanish language**: The Spanish interface maps to the provider's `es-ES` language setting (clarified 2026-11-22). When the provider lacks a Spanish translation for a field, the original-language value is shown as attribution-bearing provider metadata, not as Walplay copy.
- **Language fallback**: Provider metadata may arrive in a different language or with partial translations. Walplay does not machine-translate and does not promise complete localization of third-party titles or descriptions.
- **Provider availability**: The provider is assumed to return list-level metadata with optional fields that may be null, empty, or absent. The catalog is designed for missing posters, dates, ratings, genres, and localized titles rather than assuming completeness.
- **Provider paging**: Provider page size and total-page reporting are treated as authoritative for the current request. Walplay does not invent a different page size and ends pagination safely when reported pages and returned items disagree.
- **Shell reuse**: The catalog reuses feature 001's shell, page container, shared state components, design tokens, i18n, and accessibility conventions. The catalog adds a page-level attribution region because provider attribution is required wherever provider data appears; this is not a global footer or legal-link region.
- **Home and Settings**: Settings remains unchanged. Home is updated only enough to replace the foundation's outdated "nothing to browse" placeholder copy with a working entry point to Browse, so the application does not claim that catalog content is unavailable. The catalog itself is discovered through the new Browse destination in the primary navigation.
- **Data freshness**: Catalog data is not real-time. A bounded freshness period is configured and documented, and degraded cached content is labeled rather than silently presented as current.
- **Legal validation**: Production use of TMDB remains subject to confirmation of current terms, attribution requirements, artwork licensing, caching limits, and rate-limit behavior. No feature requirement authorizes use beyond those terms.

## Open Questions

These questions remain open at the product level. The approved implementation assumptions are recorded in Assumptions; none of them blocks this feature's planned tasks or changes the implementation scope.

- **OQ-02 — Trending window and pagination**: Should trending be daily or weekly, and may trending be paginated when the provider's current documentation does not list a page parameter even though its response includes page metadata? The catalog assumes weekly and a first-page preview only.
- **OQ-03 — Region-specific catalog ordering**: Should popular or top-rated ordering ever vary by viewer region? The catalog currently makes no region claim and does not use a region filter.
- **OQ-05 — Attribution surface placement**: Is a page-level attribution region on catalog surfaces acceptable, or does the shared identity require a different global placement? The current assumption avoids introducing a global footer prohibited by the foundation contract.

## Dependencies

- The feature depends on the clarified approval of TMDB as the initial metadata provider and on confirmation of current terms, attribution, artwork usage, caching, and rate limits before production.
- The feature depends on the application foundation from feature 001: shared shell, routing behavior, page container, state components, design tokens, bilingual resources, accessibility conventions, and configuration validation.
- The minimal detail destination is delivered by this catalog feature; no separate detail feature is a prerequisite for card navigation.
- The feature depends on a server-side catalog boundary that keeps provider credentials out of the browser and maps provider responses into Walplay's domain model. Feature 001 deliberately introduced no server; this feature requires that boundary.
- The feature depends on the provider's documented English and `es-ES` Spanish language behavior, image configuration, list endpoints, and minimal movie and TV detail lookups. Capability evidence is recorded in Appendix A.
- The feature depends on the Product Overview's recorded provider decision and on legal review of the remaining provider terms before public release.

## Appendix A — Provider Capability Evidence (verified 2026-11-22, non-normative)

This appendix records the provider capabilities used to bound the catalog. It is evidence from the provider's current official documentation, not an instruction to implement a specific technology or a substitute for legal review.

| Capability | Documented endpoint and parameters | Catalog use and limitation |
|---|---|---|
| Trending movies | `GET /3/trending/movie/{time_window}`; `time_window` is `day` or `week`; `language` | Weekly preview. Response includes page metadata, but `page` is not a documented request parameter. |
| Trending TV | `GET /3/trending/tv/{time_window}`; `time_window` is `day` or `week`; `language` | Weekly preview. Same pagination limitation as movie trending. |
| Trending combined | `GET /3/trending/all/{time_window}`; `time_window`, `language` | Available, but not required because the catalog separates movies and TV shows. |
| Popular movies | `GET /3/movie/popular`; `language`, `page`, `region` | Paginated category. Provider describes it as a discover call ordered by popularity. |
| Popular TV | `GET /3/tv/popular`; `language`, `page` | Paginated category. |
| Top-rated movies | `GET /3/movie/top_rated`; `language`, `page`, `region` | Paginated category. |
| Top-rated TV | `GET /3/tv/top_rated`; `language`, `page` | Paginated category. |
| Movie details | `GET /3/movie/{movie_id}`; `language` | Minimal card fields only for a directly opened detail address; the catalog must not present full detail content. |
| TV details | `GET /3/tv/{series_id}`; `language` | Minimal card fields only for a directly opened detail address; the catalog must not present full detail content. |

| Discover movies and TV | `GET /3/discover/movie`, `GET /3/discover/tv`; `page`, `language`, `sort_by`, and many optional filters | Underlying provider capability; the catalog uses only the provider's documented section behavior and introduces no additional filters. |
| Image configuration | `GET /3/configuration`; image `secure_base_url`, `poster_sizes`, `backdrop_sizes` | Poster URLs are composed from the documented base URL, an approved size, and the returned file path. |
| Movie genres | `GET /3/genre/movie/list`; `language` | Resolves genre identifiers to localized names for optional labels. |
| TV genres | `GET /3/genre/tv/list`; `language` | Resolves genre identifiers to localized names for optional labels. |

Provider constraints verified from the official documentation:

- **Authentication**: Version 3 supports an API key query parameter or a bearer access token. The token must remain server-side. (Official application-authentication guide.)
- **Rate limiting**: The legacy limit of 40 requests every 10 seconds is disabled. An upper limit remains "somewhere in the 40 requests per second range," can change at any time, and `429` responses must be respected. (Official rate-limiting guide.)
- **Languages**: Metadata uses ISO 639-1 language codes usually paired with ISO 3166-1 country codes, for example `en-US`. The Spanish interface uses `es-ES`. Translation coverage has documented gaps. (Official languages guide.)
- **Regions**: `region` filters regional release-date presentation and falls back to the primary release date when regional data is absent. It does not establish availability. (Official regions guide.)
- **Images**: A full image URL requires the base URL, a file size, and the returned file path, for example `https://image.tmdb.org/t/p/w500{file_path}`. Documented poster sizes are `w92`, `w154`, `w185`, `w342`, `w500`, `w780`, and `original`. (Official image-basics guide and configuration reference.)
- **Attribution**: Provider terms require every application that uses its data or images to attribute TMDB as the source. Official logo assets and brand guidance are published by the provider, and the attribution must not imply certification or endorsement. The exact required statement, logo variant, and link behavior MUST be taken from the provider's current published terms at implementation and legal-review time. (Official logos and attribution page.)
- **Missing metadata**: List responses can contain null artwork paths, empty overviews, empty dates, zero vote counts with zero averages, and empty genre lists. The catalog must treat these as absent, not as valid content.
- **Adult flag**: List and trending items expose an adult flag. The catalog excludes adult-flagged titles.
- **Trending pagination**: The current official reference lists only `time_window` and `language` parameters for trending. Response examples include page metadata but no documented page request parameter, so this specification does not rely on trending pagination.
