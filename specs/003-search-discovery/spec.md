# Feature Specification: Search and Discovery

**Feature Branch**: `feat/003-search-discovery`

**Created**: 2026-11-22

**Status**: Draft

**Input**: Allow visitors to search movies and TV shows by title through a unified search experience, with debounced input, duplicate-request prevention, results metadata, incremental loading, distinct empty/loading/error/retry states, query clearing and updating, navigation to content details, and responsive, accessible interactions. TMDB is the initial metadata provider. Full detail pages, availability, watchlists, recommendations, and Live TV are out of scope.

## Clarifications

### Session 2026-11-22

- Q: When a settled search updates the address, should it replace the current browser history entry or add a new one? → A: Replace the current entry for every settled query; opening a result adds a new history entry, so Back returns to the active search rather than stepping through intermediate queries.
- Q: When a visitor opens a title from search, should the detail destination return to the active search or keep its existing catalog return behavior? → A: Extend the existing detail destination with a search-origin context so its return action goes to the active search; browser Back also works.
- Q: When a provider page contains no movies or TV shows but reports more pages, should Search load the next page automatically or wait for the visitor? → A: Wait for the visitor; keep existing results, state that the page had no titles, and keep Load more available.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search movies and TV shows from one place (Priority: P1)

A visitor opens Search, enters a title, and receives one unified result collection containing both movies and TV shows. Every result states its media type, and the visitor can open any result's detail destination and return to the same search.

**Why this priority**: Unified title search is the core value of this feature. Without a working search-to-detail journey, no other search behavior can be evaluated.

**Independent Test**: Open Search from the primary navigation and by direct address, search for a term that is known to match both a movie and a TV show, verify both appear in one collection with explicit type labels, open a result, return with browser back, and confirm the query and results are restored.

**Acceptance Scenarios**:

1. **Given** a visitor opens Search, **When** the surface appears, **Then** exactly one search page heading, one labelled search input, and an initial guidance state are present inside the shared application shell, and no provider request has been issued.
2. **Given** the visitor enters a valid query, **When** the search completes, **Then** movies and TV shows appear together in one result collection in the provider's order, and each result identifies its media type in text.
3. **Given** results contain both media types, **When** the visitor activates any result, **Then** the existing type-specific detail destination opens for that title without a duplicate detail destination being introduced.
4. **Given** the visitor opened a result from search, **When** they return with browser back or the detail destination's return action, **Then** the same search query and its results are shown again.
5. **Given** a search address is opened directly or reloaded, **When** the surface settles, **Then** the query from the address is active, submitted, and its results are shown inside the shell.
6. **Given** the visitor moves between Search and other destinations, **When** they use browser back and forward, **Then** the query and the matching results state are restored without showing results from a different query.
7. **Given** the active provider returns a result that is neither a movie nor a TV show, **When** the results are mapped, **Then** that result is excluded and the remaining movie and TV results keep the provider's order.
8. **Given** the visitor has searched several different queries in one visit and then opened and returned from a result, **When** they use browser back again, **Then** they return to the page they came from rather than stepping through every intermediate settled query.
9. **Given** a title detail destination opened directly or from the catalog, **When** the visitor activates its return action, **Then** it returns to the catalog and is not required to return to search.

---

### User Story 2 - Type, submit, and clear a search without unnecessary requests (Priority: P1)

A visitor edits the query naturally. The application waits for typing to settle, issues at most one request for the settled text, submits immediately when the visitor explicitly asks, and ignores empty, too-short, and over-long input. Clearing the query returns the surface to its initial state.

**Why this priority**: Search is input-driven. Without disciplined input handling, the feature would produce excessive provider traffic, flickering results, and a confusing experience.

**Independent Test**: Type a multi-character query at normal speed while observing request activity, submit with the keyboard, submit the same query again, clear the query, and try empty, whitespace-only, one-character, and over-long input. Verify request counts, states, query clearing, focus behavior, and browser history entries.

**Acceptance Scenarios**:

1. **Given** an empty or whitespace-only query, **When** the visitor submits or pauses typing, **Then** no request is issued, the initial guidance state remains, and no "no results" or error state appears.
2. **Given** a query shorter than the minimum or longer than the maximum, **When** the visitor types or submits, **Then** no request is issued and inline guidance states the accepted length without presenting an error.
3. **Given** the visitor is typing, **When** input continues to change before the settling interval elapses, **Then** no request is issued for the intermediate text.
4. **Given** input stops changing, **When** the settling interval elapses, **Then** at most one search request is issued for that settled query.
5. **Given** a valid query is entered, **When** the visitor explicitly submits it, **Then** the search is issued without waiting for the remaining settling interval.
6. **Given** current, non-stale results are already displayed for the active query and language, **When** the visitor submits the same normalized query again, **Then** no duplicate provider request is issued and the displayed results are preserved.
7. **Given** a query is being searched or displayed, **When** the visitor clears it, **Then** the query is removed from the address, any pending request for it is cancelled, its results are discarded, the initial guidance state returns, and focus remains in the input.
8. **Given** the visitor replaces the query, **When** the new search starts, **Then** results for the previous query are no longer presented as the new query's results, and any pending request for the previous query cannot complete the new search.
9. **Given** the visitor deletes text until the query becomes too short, **When** the input settles, **Then** any pending request for the longer query is cancelled, its results are discarded, and the minimum-length guidance appears.
10. **Given** results for the previous query are displayed, **When** the visitor edits the input so it no longer matches that query, **Then** the existing results remain explicitly identified with the previous query and are not presented as matches for the new text until the new search replaces them.

---

### User Story 3 - The newest query always wins (Priority: P1)

A visitor types or submits several queries in succession. The results shown always belong to the newest active query and language, even when earlier responses arrive later.

**Why this priority**: Out-of-order responses are a correctness defect. A stale response that replaces newer results undermines trust in every search.

**Independent Test**: Use controlled responses that resolve in reverse order and with different delays, rapidly change queries and interface languages, and verify that only the newest selection can change the visible results, count, pagination, or announcement.

**Acceptance Scenarios**:

1. **Given** search A is pending and search B is started, **When** A resolves after B, **Then** A's response is discarded and B's results remain.
2. **Given** search A is displayed and search B is started, **When** B is pending, **Then** A's results are not shown as if they belonged to B.
3. **Given** a load-more request for query A is pending and the visitor starts query B, **When** the load-more response for A arrives, **Then** it is discarded and no A items are appended to B.
4. **Given** the interface language changes while a search is pending, **When** responses resolve, **Then** only the new language's response may be shown and no mixed-language final state remains.
5. **Given** older responses are discarded, **When** the newest search settles, **Then** announcements describe only the newest state and no stale result count or error is announced.

---

### User Story 4 - Load more results without losing context (Priority: P2)

A visitor reviews a long result set, loads additional results, and continues browsing without losing the results already shown.

**Why this priority**: Title searches commonly exceed one provider page. Predictable incremental loading is required for the surface to remain usable and to respect the provider's paged model.

**Independent Test**: Search a term with multiple result pages, load successive pages, verify append behavior, duplicate handling, end-of-results messaging, a failed later page, and repeated activation.

**Acceptance Scenarios**:

1. **Given** a valid search with more than one provider page, **When** the first page settles, **Then** the page's valid movie and TV results are shown and a load-more action is available.
2. **Given** the visitor activates load more, **When** the next page succeeds, **Then** its valid results are appended below the existing results, all previously loaded results remain present in order, and the number of newly added titles is announced once.
3. **Given** several pages have been loaded, **When** more results are appended, **Then** no duplicate result identity appears and existing results are not reordered.
4. **Given** the provider reports no further pages, **When** the final page settles, **Then** the load-more action is removed and a localized end-of-results message is shown and announced.
5. **Given** a load-more request fails, **When** the failure is reported, **Then** existing results remain visible and usable, an inline localized error with a retry action appears for the failed page, and the whole result set does not collapse into a page-level error.
6. **Given** a load-more request is pending, **When** the visitor activates load more again, **Then** no second request is issued for the same page and the control exposes a busy state.
7. **Given** a search address is opened directly, **When** it settles, **Then** the first provider page is loaded and no previously loaded pages are required to be restored.

---

### User Story 5 - Distinguish no results from failure and recover (Priority: P2)

A visitor can always tell whether the search is loading, has no matching titles, is temporarily unavailable, or is showing previously loaded results that may be out of date. A failed search offers a retry that genuinely repeats the request.

**Why this priority**: Honest state communication is required by the product's trust guardrails. A provider outage must not look like an empty catalog, and an empty result must not look like a failure.

**Independent Test**: Force slow, empty, malformed, timed-out, rate-limited, and failed provider responses for the same query. Verify skeletons, distinct no-results and error presentations, retry behavior, stale labeling, announcements, and continued use of the rest of the application.

**Acceptance Scenarios**:

1. **Given** a valid search is loading its first page, **When** the surface renders, **Then** a layout-matching skeleton appears, the results region exposes a busy state, decorative skeleton shapes are hidden from assistive technology, and no spinner-only or bare "Loading" treatment is used.
2. **Given** a search completes successfully with no valid movie or TV results, **When** the surface settles, **Then** it shows a localized no-results state that echoes the active query, explains that no titles matched, offers a way to edit or clear the query, and is visually and semantically distinct from an error.
3. **Given** a search fails and no usable prior results exist for the active query and language, **When** the surface settles, **Then** it shows a localized unavailable state with a retry action and leaves the query editable.
4. **Given** the visitor activates retry, **When** it is processed, **Then** the same query is genuinely requested again, only the failed search surface enters its loading state, and repeated failure shows the same stable localized state without a retry loop.
5. **Given** usable results for the active query and language were loaded previously and a later refresh fails, **When** those results are still shown, **Then** they are labeled as cached or stale with a localized last-update indication and are not presented as current.
6. **Given** the provider is rate-limited, times out, is unavailable, or returns an invalid response, **When** the error reaches the interface, **Then** it appears as a stable localized state without a raw status code, provider message, response body, or internal identifier, and the difference between no results and failure remains clear.
7. **Given** a page returns no valid movie or TV titles while the provider reports further pages, **When** the surface settles, **Then** it does not show the no-results state, keeps any existing results, reports that the loaded page contained no titles, keeps load more available, and does not request another page until the visitor asks.
8. **Given** a provider failure affects search, **When** the visitor uses the rest of the application, **Then** navigation, language switching, other destinations, and previously displayed non-search content remain usable.

---

### User Story 6 - Use search on any screen with keyboard or assistive technology (Priority: P3)

A visitor searches, reviews results, loads more, and opens titles on a phone, tablet, desktop, keyboard, or screen reader without losing content, focus, or meaning.

**Why this priority**: Search is a primary product surface and must meet the accessibility and responsive standards that govern every Walplay feature.

**Independent Test**: Complete the full search journey at 360, 768, 1024, and 1440 pixels, at 200% zoom, keyboard-only, with a screen reader, with reduced motion, and in both interface languages.

**Acceptance Scenarios**:

1. **Given** any supported viewport width, **When** Search renders, **Then** the input, submit and clear actions, every result, load more, retry actions, and detail links remain reachable with no horizontal page scrolling, clipped text, or overlapping controls.
2. **Given** the visitor uses only a keyboard, **When** they search and review results, **Then** every control is reachable in a logical order with a visible focus indicator and no keyboard trap.
3. **Given** a screen reader, **When** a search starts, results arrive, a page is appended, the end is reached, or an error occurs, **Then** the state change is announced once and meaningfully, and the result collection exposes its structure and accessible name.
4. **Given** any result, **When** it is reviewed with assistive technology, **Then** its accessible name includes the title, media type, and the year and rating when present, artwork does not duplicate the announcement, and the result contains exactly one interactive target.
5. **Given** the visitor searches, either by explicit submission or by allowing input to settle, **When** results arrive, **Then** focus remains in the search input and the result count is announced without moving focus unexpectedly.
6. **Given** the visitor uses reduced motion, **When** loading or state changes occur, **Then** skeleton animation is suppressed or reduced and no layout-shifting motion occurs.
7. **Given** the visitor switches between English and Spanish, **When** search settles, **Then** all search-owned interface text and supported provider metadata are presented in the selected language, and dates, counts, and ratings use locale-aware formatting.

---

### Edge Cases

- The query is empty, whitespace-only, shorter than the minimum, or longer than the maximum after trimming; no request is issued, no no-results or error state appears, and guidance states the accepted length.
- The visitor types quickly through several intermediate queries; only the settled query issues a request, and no intermediate result set is presented as the final one.
- Two different raw queries normalize to the same identity (for example differing only by surrounding whitespace or letter case); the application does not issue a duplicate request for the same active language and page.
- The visitor changes the query while a page is loading; the old response is discarded and cannot replace or append to the new query's results.
- A response arrives for a query the visitor has already cleared; it is discarded and does not restore results or the address.
- The visitor clears the query while a request is pending; the request is cancelled where possible and its result is ignored even if it still arrives.
- The provider returns a page containing only excluded result types (for example people) while reporting further pages; the existing results are preserved, no no-results state appears, and no automatic extra request is issued.
- The provider returns a total count that includes excluded result types; the interface does not present that number as the number of movie and TV matches, and shows only the number of valid titles currently displayed.
- The provider returns the same result identity across pages, shifts items between pages, returns fewer items than a full page, or reports a last page inconsistent with the returned items; the loaded result set does not duplicate result identities, does not reorder existing results, and ends safely.
- Two distinct works share the same display title (for example a movie and a TV show, or a remake); they remain separate results and are not collapsed merely because their title text matches.
- The visitor edits the input while results for the previous query are displayed; before the new search starts, the existing results remain visibly and accessibly identified with the previous query, and once the new search starts they are replaced by its loading state.
- A title detail opened from search is reloaded directly; if the search origin cannot be restored, the detail destination's return action falls back to the media landing without an error, and no fabricated search state appears.
- The provider rejects the query as invalid; the surface shows editable guidance rather than a retryable outage and does not automatically repeat the same invalid request.
- The visitor enters a query longer than the supported maximum; no provider request is issued and localized guidance states the accepted length.
- The provider returns null or empty titles, missing posters, zero vote counts with zero averages, empty dates, or unknown genre identifiers; the affected optional field is omitted and no blank, zero, dash, or invented value is shown.
- A result has neither a usable localized title nor a usable original title; it is excluded rather than displayed as blank or "Untitled".
- The provider includes an adult-flagged title; it is excluded from all search surfaces.
- The provider returns an empty results array, a null results array, a malformed item, or a response that fails boundary validation; invalid items are dropped and an all-invalid successful response becomes the no-results state, not an error.
- The provider times out, returns a rate-limit response, returns a server error, or becomes unreachable after a successful search; the search surface degrades locally, cached results are labeled stale, and the rest of the application remains usable.
- The image service is unavailable while result metadata is available; results remain complete with artwork fallbacks.
- The visitor changes language while results are displayed or a page is pending; the query is re-run in the new language, previous-language results and pages are discarded, and no mixed-language final state remains.
- The visitor opens a search address with a query that is invalid, below the minimum, or above the maximum; the address is respected, no provider request is issued, and the appropriate guidance is shown.
- The visitor opens a search address with extra or duplicated query parameters; the application uses the first occurrence of the query parameter, ignores additional occurrences, and does not issue an invalid provider request.
- The visitor opens a search address, then uses browser back before any in-application navigation; the shell remains stable and the previous state is restored.
- The visitor returns from a title detail to search; the query and, where available in session cache, the previously loaded results are restored; otherwise the first page is requested again without duplication.
- The visitor reaches the final page, requests a page the provider does not return, or loads pages until the provider stops returning usable items; the surface ends with a clear end state and no infinite loading action.
- The visitor uses 200% zoom or enlarged text at 360 pixels with a long Spanish title or query; the layout reflows without horizontal scrolling or loss of controls.
- The visitor is offline after the application shell has loaded; search shows an unavailable state and no fabricated results.
- The provider stops supporting a documented search endpoint or changes its reported pagination metadata between visits; the surface reflects the active capability and degrades safely instead of assuming cached behavior.

## Requirements *(mandatory)*

### Functional Requirements

#### Search entry, scope, and navigation

- **FR-001**: The application MUST add exactly one new top-level destination, Search, reachable from the primary navigation and through a direct address, and rendered inside the existing shared application shell.
- **FR-002**: The Search surface MUST provide one single-line text input for searching movies and TV shows by title, a visible label or equivalent accessible name, a submit action, and a clear action that is available only when a query is present.
- **FR-003**: The active query MUST be reflected in a stable search address, and the address MUST be the source of truth for the active query. The address MUST reflect the settled active query rather than every keystroke. Opening, reloading, or revisiting a search address MUST activate and submit the query it carries. Navigating to Search without a query MUST show the initial guidance state and MUST NOT issue a provider request. Each settled query MUST replace the current history entry rather than add a new one; opening a result MUST add a new history entry so browser back returns to the active search instead of stepping through intermediate queries.
- **FR-004**: Search MUST present movies and TV shows in one unified result collection rather than separate per-type result lists. Results whose media type is neither movie nor TV show MUST be excluded, and excluding them MUST NOT reorder the remaining results.
- **FR-005**: Every displayed result MUST identify its media type in text. Color, position, or an icon alone MUST NOT be the only way the type is communicated.
- **FR-006**: Every result MUST contain exactly one interactive target that opens the existing type-specific minimal detail destination established by the catalog feature. This feature MUST NOT create a second detail destination or duplicate detail content.
- **FR-007**: The existing type-specific minimal detail destination MUST accept a search-origin context. When it is opened from search, its return action MUST return to the active search with the query preserved, and browser back MUST restore the search address and show results for the same query, using session-held results when available or requesting the first page again when they are not. When the detail destination is opened directly or from the catalog, its return action MUST keep the catalog behavior. If a search origin cannot be restored after a reload, the return action MUST fall back to the media landing without an error.
- **FR-008**: Search MUST preserve the selected interface language when navigating to a result and when returning to search.
- **FR-009**: The Search destination MUST NOT be implemented as a persistent global header field, MUST NOT change the Settings destination, and MUST NOT add additional top-level destinations. A detail destination opened from search MUST keep its catalog route and the catalog's active primary-navigation state; Search MUST be marked current only on the search surface.

#### Query input, submission, debouncing, and request discipline

- **FR-010**: The application MUST treat a query as valid only when it contains at least two non-whitespace characters after trimming and does not exceed 200 Unicode code points. Internal whitespace MUST be preserved in the query sent to the provider. A query below the minimum or above the maximum MUST NOT be sent to the provider.
- **FR-011**: Empty, whitespace-only, below-minimum, and above-maximum queries MUST NOT trigger a provider request. The surface MUST show localized guidance explaining the accepted length and MUST NOT present this condition as an error or as "no results".
- **FR-012**: The application MUST NOT issue a request while the input is actively changing. After the last input change, it MUST wait for a settling interval of at least 300 milliseconds and no more than 500 milliseconds, then issue at most one search request for that settled query.
- **FR-013**: Explicit submission, by the submit action or Enter, MUST submit a valid query immediately without waiting for the remaining settling interval, MUST cancel the pending settling interval, and MUST remain subject to the duplicate-request rule in FR-014.
- **FR-014**: A request MUST NOT be issued for a settled query, language, and page whose current, non-stale results are already displayed or whose identical request is already in flight. Query normalization for this comparison MUST be limited to trimming, collapsing whitespace, and case folding; it MUST NOT alter the query used for provider relevance.
- **FR-015**: At most one search request for the active search surface may be in flight at a time. A newer submitted query MUST supersede a pending one, and the superseded request's response MUST NOT alter the visible state.
- **FR-016**: A new query MUST reset incremental loading to the first provider page and replace the previous result set rather than appending to it.
- **FR-017**: Clearing the query MUST remove it from the address, cancel or supersede pending requests for it, discard its results and loaded pages, return to the initial guidance state, and keep focus in the input.
- **FR-018**: Deleting the query until it becomes invalid MUST cancel or supersede any pending request for the longer query and discard its results when they arrive.
- **FR-019**: The surface MUST NOT automatically retry a search because of input events. Retries MUST be bounded and MUST remain either boundary-managed resilience or an explicit visitor action.
- **FR-020**: Search MUST NOT provide autocomplete, suggestions, trending searches, recent searches, or persisted search history. The search input MUST disable user-agent autocomplete and form-history suggestions so that previously typed queries are not surfaced by the browser as Walplay search history. The active query in the address and ephemeral in-memory state (results and the search-origin context used to return from a detail destination) are the only query context this feature retains; none of it is persisted.

#### Results presentation and metadata

- **FR-021**: Every displayed result MUST present a title, its media type in text, a poster or a recognizable fallback, a release year when known, and a rating only when meaningful. Optional values MUST be omitted cleanly rather than shown as blank, zero, a dash, or an invented value.
- **FR-022**: The title MUST use the provider's localized title for the selected interface language when available; otherwise the original title MUST be used. A result with neither a usable title nor a usable identity MUST be excluded rather than rendered blank or as "Untitled".
- **FR-023**: The release year MUST be derived from the provider's movie release date or TV first-air date and shown as a four-digit year. An absent, empty, or invalid date MUST result in no year being shown.
- **FR-024**: A rating MUST be shown only when the provider supplies a valid average and a non-zero vote count, MUST be formatted for the selected locale, and MUST carry enough accessible context to be understood as a rating out of its known scale. It MUST NOT be shown when votes are zero or the value is missing or invalid.
- **FR-025**: Artwork MUST use provider-supplied poster references at approved sizes, reserve its aspect ratio, load off-screen images lazily, and use a neutral fallback containing the title and media type when artwork is absent or fails. A failed image MUST NOT cause a broken image, a persistent error message, or a layout shift.
- **FR-026**: Genre labels are optional. When shown, they MUST be resolved localized names supplied by the provider; unknown identifiers, empty lists, and unavailable names MUST be omitted, and raw provider identifiers MUST NOT be displayed.
- **FR-027**: The displayed ordering MUST be the provider's result order. Search MUST NOT re-sort, re-rank, merge separately requested result lists, invent a relevance explanation, or present a provider popularity value as a rating or recommendation.
- **FR-028**: The interface MUST NOT present a provider-reported total as the number of movie and TV matches when that total includes excluded result types. It MUST instead show the number of valid titles currently displayed, labeled so that it is not mistaken for the total number of matches.
- **FR-029**: When the provider reports further pages but a loaded page contains no valid movie or TV titles, the surface MUST NOT enter the no-results state, MUST preserve existing results, MUST state that the loaded page contained no titles, and MUST keep load more available without automatically issuing additional requests. It MUST NOT request another page until the visitor activates load more.
- **FR-030**: Long titles and metadata MUST remain readable without clipping. If visible text is truncated, the full title MUST remain available to assistive technology, and truncation MUST NOT hide the only occurrence of the title.
- **FR-031**: Adult-flagged titles MUST be excluded from results, loaded pages, counts, and navigation.
- **FR-032**: Results that fail boundary validation or lack the minimum usable identity MUST be dropped. A successful response in which every item is unusable MUST be treated as no results, never as a blank collection or a crash.

#### Incremental loading

- **FR-033**: A search MUST show the provider's first page initially. The page size MUST follow the provider and MUST NOT be invented by Walplay.
- **FR-034**: A load-more action MUST be available only when the provider reports additional pages and no load is in progress. Activating it MUST request the next page and append valid results below the existing results.
- **FR-035**: Appending a page MUST preserve all previously loaded results and their order, MUST NOT introduce duplicate result identities into the loaded set, and MUST announce the number of newly added titles once. Distinct works that share a display title MUST remain separate results.
- **FR-036**: While a page is loading, the load-more action MUST expose a busy state and prevent duplicate submissions. Existing results MUST remain visible and usable.
- **FR-037**: When the provider reports no further pages after at least one loaded result, the load-more action MUST be removed and a localized end-of-results message MUST be shown and announced.
- **FR-038**: A load-more failure MUST preserve existing results and MUST show an inline localized error with a retry action for the failed page. It MUST NOT replace the result set with a page-level error.
- **FR-039**: A direct search address MUST load its first page and MUST NOT display results for another query or language. Previously loaded pages need not be restored when a search address is opened directly.
- **FR-040**: Changing the query or the interface language MUST discard all loaded pages and restart from the first page in the new query or language.

#### Loading, no-results, error, stale, and retry states

- **FR-041**: Initial search loading MUST use a skeleton that matches the final result layout closely enough to avoid a visible content jump. It MUST expose a busy state to assistive technology, hide decorative skeleton shapes, and MUST NOT rely on a spinner or a bare "Loading" message.
- **FR-042**: A no-results state MUST appear only after a successful search returns zero valid movie or TV results. It MUST echo the active query, explain that no titles matched, offer a way to edit or clear the query, and be visually and semantically distinct from an error.
- **FR-043**: An error state MUST appear when a search fails and no usable prior results exist for the active query and language. It MUST be localized, MUST offer a retry that re-attempts the same query, MUST keep the query editable, and MUST be visually and semantically distinct from no results.
- **FR-044**: Error states MUST preserve the surrounding shell, navigation, search input, and language switching. They MUST NOT expose raw provider errors, status codes, response bodies, stack traces, internal identifiers, or provider-specific field names.
- **FR-045**: Provider timeouts, rate limits, unavailable services, malformed responses, and validation failures MUST map to stable internal search states and stable machine-readable error codes. The interface MUST localize those codes into calm, actionable messages. A provider validation failure attributable to the query MUST be shown as a localized editable guidance state and MUST NOT offer a retry that repeats the same invalid query.
- **FR-046**: Every retry action MUST re-attempt the failed request, MUST affect only the failed search surface, MUST prevent concurrent duplicate retries, and MUST remain either visitor-initiated or bounded by the boundary's retry policy. Repeated failure MUST show the same stable localized state. Once the query changes, a retry action for the previous query MUST no longer be presented.
- **FR-047**: When last-known-good results for the active query and language are shown while a refresh or later page fails, they MUST be labeled as cached or stale with a localized last-update indication and MUST NOT be presented as current. When no usable cached results exist, the unavailable state MUST be shown instead.
- **FR-048**: A failed artwork request MUST NOT produce a broken image, a persistent error message, or a layout shift; the standard fallback MUST appear.
- **FR-049**: Provider failures MUST NOT prevent navigation, language switching, attribution display, or already loaded search results from working, and MUST NOT affect other application destinations.

#### Response ordering and language changes

- **FR-050**: A response for any query, language, or page other than the newest active selection MUST be discarded and MUST NOT alter the visible results, count, pagination state, focus target, or announcements.
- **FR-051**: From the moment the input text differs from the active query, including the settling interval, the previous results MUST remain explicitly identified as results for the active query and MUST NOT be presented as matches for the new text. Once a newer search starts, the previous results MUST be replaced by the newer query's loading state or an equivalent unambiguous transition.
- **FR-052**: A load-more response belonging to a query or language that is no longer active MUST be discarded and MUST NOT append results to the current search.
- **FR-053**: Changing the interface language MUST re-run the active query in the new language, discard previous-language results and pages, and MUST NOT settle into a mixed-language final state.
- **FR-054**: Assistive announcements MUST describe only the newest active state. Discarded responses MUST NOT produce result counts, end-of-results messages, or error announcements.

#### Responsive layout and accessibility

- **FR-055**: All search functions MUST meet WCAG 2.2 Level AA. Automated accessibility evaluation MUST report no critical or serious violations, and manual keyboard and screen-reader checks MUST pass for the search-to-detail journey.
- **FR-056**: The search input MUST have a visible label or an equivalent accessible name and MUST be associated with any instructions or guidance it depends on. The submit and clear actions MUST have meaningful accessible names.
- **FR-057**: Every essential search function MUST be operable by keyboard with a logical focus order, a visible focus indicator of at least a 2-pixel outline or equivalent ring with a 2-pixel offset, and no keyboard trap.
- **FR-058**: The search surface MUST expose one page-level heading, a logical heading hierarchy, a labelled search region, a results status region, and the result collection as a semantic collection with visible context and an accessible name that identify the query whose results are displayed, which may differ from the input text while a new query is settling.
- **FR-059**: Settling, loading, result-arrival, an interim page with no titles, append, end-of-results, no-results, stale, and error states MUST be announced once and meaningfully. Errors MUST use alert semantics; loading and successful state changes MUST be announced politely without duplicate announcements.
- **FR-060**: Busy surfaces MUST expose a busy state to assistive technology, and decorative skeleton or placeholder shapes MUST be hidden from assistive technology.
- **FR-061**: After any search settles and results arrive, including a debounced search that the visitor did not explicitly submit, focus MUST remain in the search input unless the visitor has moved it. The result count and state change MUST be announced without an unexpected focus move.
- **FR-062**: When results are appended, focus MUST remain on the load-more action if it remains available. If the action is removed at the end, focus MUST move to the end-of-results status or another logical nearby target.
- **FR-063**: Interactive targets MUST be at least 24 by 24 CSS pixels. Primary controls, including submit, clear, and load more, MUST be at least 44 by 44 CSS pixels.
- **FR-064**: The search layout MUST remain usable at 360, 768, 1024, and 1440 pixel widths and at 200% browser zoom, with no horizontal page scrolling, clipped text, overlapping controls, or unreachable content. The input and actions MUST remain reachable at the narrowest supported width.
- **FR-065**: Motion MUST be minimal, MUST respect the visitor's reduced-motion preference, and MUST NOT animate layout-affecting properties in a way that visibly shifts content.
- **FR-066**: Search MUST NOT use hover as the only way to reveal essential information or reach an action, and MUST NOT require precise pointer movement for an essential task.

#### Localization

- **FR-067**: All search-owned interface text MUST be externalized and available in English and Spanish, including the page heading, input label and instructions, submit and clear labels, minimum-length guidance, initial guidance, result count, media-type labels, state messages, end-of-results message, document title, and accessibility labels and announcements.
- **FR-068**: Provider metadata MUST be requested in the language matching the selected interface language where the provider supports it, using the same language mapping established by the catalog feature. When localized metadata is unavailable, the original title MUST be used as a fallback, and the interface MUST NOT display a blank field or a raw translation key.
- **FR-069**: Walplay MUST NOT machine-translate or present provider-supplied text as verified Walplay copy. Provider metadata remains attributed to its source.
- **FR-070**: The visitor's query is user input and MUST NOT be translated, rewritten, or substituted. It MAY be displayed as plain text with special characters escaped, and it MUST NOT be rendered as markup.
- **FR-071**: Counts, years, ratings, and pluralized messages MUST use locale-aware formatting and the internationalization library's pluralization and interpolation mechanisms, not hardcoded formats or ad hoc string concatenation. Ratings and counts that benefit from vertical alignment MUST use tabular numerals.

#### Provider boundary, security, rate limits, and attribution

- **FR-072**: TMDB MUST be treated as the initial movie and TV show metadata and search provider for this feature, subject to the provider decision recorded in the Product Overview and to legal review of attribution, caching, and usage terms.
- **FR-073**: All provider search access MUST be mediated by Walplay's server-side boundary. The browser MUST NOT call a provider search endpoint directly, and provider credentials MUST NOT appear in client code, browser-delivered assets, image URLs, logs, errors, source maps, or user-facing messages.
- **FR-074**: The search boundary MUST use only the provider's documented search operations. It MUST NOT use scraping, undocumented private endpoints, authentication bypass, or any mechanism that conflicts with the provider's terms.
- **FR-075**: The search boundary MUST request only the parameters required by the active query: the query text, the provider language mapped from the selected interface language, the requested page, and adult-content exclusion. Discovery filters, region filters, year filters, genre filters, and sort overrides MUST NOT be sent by this feature.
- **FR-076**: Provider search responses MUST be treated as untrusted input and validated at the boundary. Provider response shapes MUST NOT reach the interface. Invalid items MUST be dropped, and a malformed top-level response MUST map to a stable invalid-response state.
- **FR-077**: Provider results MUST be mapped into a provider-neutral Walplay search model that reuses the catalog item model for identity, media type, localized and original title, release year, rating, genres, and artwork. Provider field names, provider-specific shapes, and provider numeric popularity scores MUST NOT be exposed to the interface or business logic.
- **FR-078**: Provider requests MUST use explicit timeouts, bounded retries only for idempotent reads, backoff with jitter, and caching with a defined freshness period. Cached entries MUST be keyed by every parameter that affects the result, including normalized query, language, page, and provider capability.
- **FR-079**: Repeated identical searches within the freshness period and concurrent identical requests MUST be served from cache or coordinated so that they do not create unbounded or duplicate provider traffic. Provider rate limits and retry-after guidance MUST be respected.
- **FR-080**: Raw provider errors MUST be mapped to stable internal error codes before reaching the interface. Logs MUST NOT contain provider credentials, unfiltered provider payloads, or the visitor's raw query text.
- **FR-081**: The visitor's query text MUST NOT be persisted as search history, included in error responses, or sent to analytics or tracking. The active query in the address and ephemeral in-memory state are the only context this feature retains, and the address remains under the visitor's control.
- **FR-082**: Every search surface that displays provider data, including loading-complete results, no-results states that follow a provider response, stale results, and partial pages, MUST display the provider attribution required by current terms, including the official mark and the required non-endorsement statement, using unmodified official assets and without implying endorsement. Surrounding explanatory text MUST be localized.
- **FR-083**: Search MUST respect provider rate limits, caching, attribution, and usage restrictions. The input settling interval MUST NOT be treated as a substitute for server-side caching and request coordination.

#### Scope boundaries and reuse

- **FR-084**: Search MUST reuse the shared application shell, layout, state components, design tokens, internationalization, accessibility patterns, and configuration handling established by feature 001, and the catalog item model, result card presentation, minimal detail destination, attribution treatment, and server-side provider boundary established by feature 002. It MUST NOT duplicate those patterns or introduce a parallel visual language.
- **FR-085**: Search-specific presentation MUST remain separated from provider access and from the shared application shell, so that replacing the search provider or extending the detail destination does not restructure the shell or shared UI.
- **FR-086**: This feature MUST NOT introduce discovery filters, advanced filtering, autocomplete, suggestions, recent searches, search history, personal ratings or notes, watchlists, favorites, watched status, availability information, provider links, recommendations, notifications, sharing, accounts, authentication, video playback, live television, cast or crew details, episodes, seasons, trailers, or full detail pages.
- **FR-087**: This feature MUST NOT change the Home, Browse, or Settings destinations beyond adding the Search destination to the primary navigation and making the existing detail destination return to search when search is the origin. It MUST NOT add other Home or Browse functionality.
- **FR-088**: Search MUST NOT display fabricated titles, artwork, ratings, rankings, relevance explanations, availability, or promotional content, and MUST NOT place third-party tracking or advertising scripts.
- **FR-089**: Search MUST be usable without signing in and MUST NOT depend on personal data, a watchlist, or an account.

### Key Entities *(include if feature involves data)*

- **Search Query**: The visitor's active search text. Attributes: raw text, display text, normalized form used only as a component of search request identity and duplicate detection, validity state (empty, too short, too long, valid), and the interface language in effect. The query is user input and is never translated.
- **Search Result Page**: One requested page of search results. Attributes: normalized query, language, page number, valid movie and TV results deduplicated by result identity, provider-reported page and total metadata, whether further pages exist, freshness, and load state.
- **Search Result Item**: A provider-neutral title summary displayed in the result collection. It reuses the catalog item model: stable Walplay identity, media type, localized title, original title, release year when known, rating and vote context when meaningful, genre labels when available, artwork reference or fallback state, and provider attribution reference.
- **Result Identity**: The Walplay opaque title identity that combines media type and provider record identity. It is used to deduplicate appended pages and to keep two distinct works that share a display title separate.
- **Media Type**: The catalog's classification of a title as a movie or a TV show, reused from feature 002. Every result and detail destination identifies it in text, and it is part of result identity.
- **Search State**: The observable state of the search surface, including initial guidance, minimum-length guidance, settling, loading, success, an interim page with no titles, no results, end of results, stale, unavailable, rate limited, timed out, and invalid response. It determines the displayed state, retry availability, and assistive announcement.
- **Search Request Identity**: The deduplication and cache identity of a search request, composed of the normalized query, language, page, and provider capability. Two raw queries with the same identity MUST NOT produce duplicate provider requests for the same active state.
- **Search Origin Context**: The active query and the results available in the current session when a visitor opens a title from search. It allows the detail destination's return action and browser back navigation to restore the same search without duplicating detail content.
- **Provider Search Capability**: The provider's documented support for unified and per-type title search, request parameters that affect results, language behavior, pagination metadata, rate limits, and attribution requirements. It governs which operations and limits the search feature may rely on.
- **Attribution Notice**: The provider-required mark and non-endorsement statement shown wherever provider search data appears, including its reusable placement and localized surrounding context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can perform a search and open a title in at most three actions (enter a query, submit, activate a result), and 100% of displayed results open a working detail destination with no dead links.
- **SC-002**: 100% of displayed results identify their media type in text, and at least 95% of test participants can correctly classify a mixed movie and TV result set without relying on color or position.
- **SC-003**: 100% of tested searches restore the same active query and results after browser back, browser forward, reload, direct address open, and return from a title detail.
- **SC-004**: Empty, whitespace-only, below-minimum, and over-long queries produce zero provider requests. Typing a multi-character query without pausing longer than the settling interval produces at most one request after input settles. Resubmitting an unchanged query and language produces zero additional provider requests.
- **SC-005**: In 100% of delayed and out-of-order response tests, including query and language changes, only the newest active search can change the visible results, count, pagination state, or announcements, with zero stale overwrites.
- **SC-006**: 100% of successful load-more actions append the next page without duplicate result identities and without removing or reordering previously loaded results; distinct works that share a display title remain separate results, and the final page produces a clear end state with no infinite loading action.
- **SC-007**: At least 95% of test participants can distinguish a no-results state from an error state and can locate the retry action after a failure, without relying on color alone.
- **SC-008**: Search passes WCAG 2.2 Level AA checks: automated evaluation reports zero critical or serious violations, and the keyboard and screen-reader search journeys pass manual review.
- **SC-009**: Search presents its content and controls without horizontal page scrolling, clipping, or unreachable actions at 360, 768, 1024, and 1440 pixels and at 200% browser zoom.
- **SC-010**: Under a mobile profile of 1.6 Mbps down / 750 Kbps up / 150 ms RTT with 4× CPU throttling, results become visible within 2.5 seconds after the query settles, and loading states cause no visible content jump.
- **SC-011**: 100% of search surfaces that display provider data show the required provider mark and non-endorsement statement, verified in both interface languages and at every supported viewport width.
- **SC-012**: Switching interface language re-runs the active query and settles into a single language for interface text and supported provider metadata, with no mixed-language final result set and no stale-language results.
- **SC-013**: A security and privacy review finds zero provider credentials, raw provider error payloads, or raw search query text in browser-delivered assets, client-visible errors, or logs, and finds zero persisted search history, autocomplete history, or third-party analytics of query text.
- **SC-014**: 100% of empty, short, and over-long query inputs show guidance rather than an error or no-results state, and 100% of provider page failures show a localized error with a working retry while previously loaded results remain usable, except query-validation failures, which show editable guidance without a pointless retry.
- **SC-015**: A scope audit finds zero discovery filters, availability, watchlist, favorites, watched status, recommendations, personal ratings, accounts, playback, Live TV, or full detail capabilities, and zero fabricated search results or relevance explanations.
- **SC-016**: In 100% of tested searches, intermediate settled queries add zero browser history entries, and opening a result adds exactly one entry that browser back reverses to the active search.

## Assumptions

- **Provider decision**: TMDB is approved as the initial metadata provider for this feature. Search uses only the provider's documented title-search operations; the provider's discovery operations are not used. Legal review of provider terms, attribution, caching, and rate limits remains a release dependency under the Product Overview's recorded OD-02 decision, with artwork licensing and display rules tracked under OD-13.
- **Search entry point**: Search is reached through one new top-level Search destination in the primary navigation. It is not a persistent global header field, and Browse, Home, and Settings are not restructured.
- **Unified results**: This feature delivers one unified result collection containing movies and TV shows, ordered by the provider and labeled by type. A media-type scope control (All / Movies / TV Shows) is not included; it is recorded as an optional future capability.
- **Query address**: The active query is carried in the search address, and Search without a query resolves to the initial guidance state. Each settled query replaces the current browser history entry; opening a result adds one entry so Back returns to the active search. The number of loaded pages is not encoded in the address; a direct open or reload loads the first page.
- **Minimum, maximum, and settling interval**: A query is valid at two non-whitespace characters and is capped at 200 Unicode code points, and input settles after 300–500 milliseconds of inactivity. These are Walplay product choices, not provider requirements, and may be tuned later without changing the feature's behavior contract.
- **Provider ordering**: The provider's unified result order is treated as the relevance order. Walplay does not merge separately requested movie and TV lists and does not invent a ranking. Excluded non-movie and non-TV results are removed without reordering the remaining results.
- **Displayed count**: Because the provider's unified search can include result types this feature excludes, the interface shows the number of valid titles currently displayed rather than presenting the provider's total as the number of movie and TV matches.
- **Incremental loading**: Incremental loading reuses the catalog's load-more pattern and provider page size. End-of-results is derived from provider page metadata and from the absence of further usable results.
- **Request page ceiling**: The backend rejects a requested page above a named defensive maximum (1000) as invalid input. This is a request-safety limit and API contract detail, not a claim about the provider's pagination metadata: `hasMore` and the end-of-results state still follow the pages the provider reports.
- **State semantics**: No results means a successful response with zero valid movie or TV titles. Failure means the request could not produce a validated response. Cached results are shown only for the same active query and language and are labeled stale.
- **Detail reuse**: Search links to the existing type-specific minimal detail destination, which accepts a search-origin context for its return action. When the detail destination is opened directly or from the catalog, it keeps the catalog return behavior; when a search origin cannot be restored after a reload, it falls back to the media landing. Search does not deliver a full detail page or duplicate detail content.
- **No search history**: Walplay does not store recent searches, autocomplete data, or search analytics. The query in the address is under the visitor's control through normal browser history and address editing.
- **Adult content**: Adult-flagged titles are excluded as a content-safety default, consistent with the catalog feature.
- **Spanish language**: The Spanish interface uses the provider's `es-ES` language setting, consistent with the catalog feature. Provider metadata may be partially translated, and original titles are used as fallback.
- **Region**: Search is not region-filtered and makes no regional relevance or availability claim. Region behavior remains an open product decision (Product Overview OD-12).
- **Shell reuse**: Search reuses feature 001's shell, page container, state components, design tokens, internationalization, and accessibility conventions, and feature 002's item model, card, detail destination, attribution, and server-side provider boundary.
- **Legal validation**: Production use of the provider remains subject to confirmation of current terms, attribution requirements, caching limits, and rate-limit behavior. No requirement authorizes use beyond those terms.

## Open Questions

These questions remain open at the product level. Conservative defaults are recorded in Assumptions; none blocks planning or changes the implementation scope.

- **OQ-01 — Media-type scope control**: Should Search offer an All / Movies / TV Shows scope control? This feature assumes one unified collection with type labels, because a type control would require per-type provider requests and a different pagination model.
- **OQ-02 — Discovery filters**: Should Walplay expose provider discovery filters such as genre, release or first-air year, rating, original language, region, or sort order? These are documented as optional capabilities in Appendix B and are not part of this feature.
- **OQ-03 — Minimum length, maximum length, and settling interval**: Are two characters, a 200-character maximum, and 300–500 milliseconds the right product defaults for this audience and query volume? These values can be tuned without changing the behavior contract.
- **OQ-04 — Recent searches**: Should a future version store recent searches locally? This feature deliberately does not, to avoid persisting potentially sensitive query text.
- **OQ-05 — Result count and attribution placement**: Is a shown-title count plus a page-level attribution region acceptable on search surfaces, or does the shared identity require a different placement? The current assumption avoids introducing a global footer prohibited by the foundation contract.
- **OQ-06 — Restored session depth**: Should returning to a search restore only the first page or every page loaded earlier in the session? This feature restores the query and uses session-held results when available; restoring all loaded pages is not required.

## Dependencies

- The feature depends on the approved TMDB provider decision and on confirmation of current terms, attribution, caching, and rate limits before production release.
- The feature depends on the application foundation from feature 001: shared shell, routing behavior, page container, state components, design tokens, bilingual resources, accessibility conventions, and configuration validation.
- The feature depends on feature 002's provider-neutral catalog item model, result card presentation, minimal type-specific detail destination, attribution treatment, error-code conventions, and server-side catalog boundary. Search extends that boundary with documented search operations; it does not create a parallel provider integration.
- The feature depends on feature 002's minimal detail destination accepting an optional search-origin context for its return action. This is a small additive extension to the catalog contract; it does not create a second detail destination. If the search origin cannot be restored after a reload, the detail destination falls back to its catalog return behavior.
- The feature depends on the provider's documented English and `es-ES` language behavior, search pagination metadata, adult-content flag, and rate-limit behavior. Capability evidence is recorded in Appendix A.
- The feature depends on legal confirmation of provider terms before public release. Search query privacy and non-persistence are product requirements, not a substitute for infrastructure-level log review.

## Appendix A — Provider Capability Evidence (verified 2026-11-22, non-normative)

This appendix records the provider capabilities used to bound search. It is evidence from the provider's current official documentation, not an instruction to implement a specific technology or a substitute for legal review.

| Capability | Documented operation and parameters | Search use and limitation |
|---|---|---|
| Unified search | `GET /3/search/multi`; `query` required, `include_adult`, `language`, `page` | Primary unified search operation. The provider describes it as searching movies, TV shows, and people in one request. It has no media-type filter, and its results and reported totals are not limited to movies and TV shows, so non-movie/non-TV results must be excluded and the provider total must not be presented as the movie/TV match count. |
| Movie search | `GET /3/search/movie`; `query` required, `include_adult`, `language`, `page`, plus documented optional `primary_release_year`, `region`, `year` | Available for a future media-type scope. This feature does not use it, to avoid merging separately ordered lists. |
| TV search | `GET /3/search/tv`; `query` required, `include_adult`, `language`, `page`, plus documented optional `first_air_date_year`, `year` | Available for a future media-type scope. This feature does not use it, to avoid merging separately ordered lists. |
| Search response metadata | `page`, `results`, `total_pages`, `total_results` | Used to decide whether further pages exist and to end pagination safely. Unified totals are not used as the movie/TV match count. |
| Movie result fields | `id`, `title`, `original_title`, `release_date`, `poster_path`, `genre_ids`, `vote_average`, `vote_count`, `adult`, `popularity` | Mapped to the catalog item model. `popularity` is never shown. Missing poster, date, or rating is omitted. |
| TV result fields | `id`, `name`, `original_name`, `first_air_date`, `poster_path`, `genre_ids`, `vote_average`, `vote_count`, `adult`, `origin_country`, `popularity` | Mapped to the catalog item model. Movie and TV field names are normalized at the boundary. |
| Multi result field | `media_type` with documented values including `movie` and `tv` and `person` | Only movie and TV results are kept; other types are excluded without reordering the remaining results. |
| Image configuration | `GET /3/configuration`; image `secure_base_url`, `poster_sizes` | Poster URLs are composed from the documented base URL, an approved size, and the returned file path, consistent with the catalog feature. |
| Genre lists | `GET /3/genre/movie/list`, `GET /3/genre/tv/list`; `language` | Resolves genre identifiers to localized names for optional labels, consistent with the catalog feature. |

Provider constraints verified from the official documentation:

- **Authentication**: Version 3 supports an API key query parameter or a bearer access token. The token must remain server-side. (Official application-authentication guide.)
- **Rate limiting**: The legacy limit of 40 requests every 10 seconds is disabled. An upper limit remains "somewhere in the 40 requests per second range," can change at any time, and `429` responses must be respected. (Official rate-limiting guide.)
- **Languages**: Metadata uses ISO 639-1 language codes usually paired with ISO 3166-1 country codes, for example `en-US`. The Spanish interface uses `es-ES`. Translation coverage has documented gaps. (Official languages guide.)
- **Regions**: Search does not require a region. Discover's `region` parameter affects regional release-date presentation and does not establish availability. (Official regions guide.)
- **Images**: A full image URL requires the base URL, a file size, and the returned file path. Documented poster sizes are `w92`, `w154`, `w185`, `w342`, `w500`, `w780`, and `original`. (Official image-basics guide and configuration reference.)
- **Attribution**: Provider terms require every application that uses its data or images to attribute TMDB as the source. Official logo assets and brand guidance are published by the provider, and attribution must not imply certification or endorsement. The exact required statement, logo variant, and link behavior MUST be taken from the provider's current published terms at implementation and legal-review time. (Official logos and attribution page.)
- **Missing metadata**: Search results can contain null artwork paths, empty dates, zero vote counts with zero averages, and empty genre lists. These must be treated as absent, not as valid content.
- **Adult flag**: Search results expose an adult flag. Adult-flagged titles are excluded.
- **Query length**: The reviewed search reference marks `query` as required but does not publish a minimum length or a documented maximum page. Walplay therefore chooses a two-character minimum and a 200-code-point maximum, and relies on provider pagination metadata and returned items to end pagination safely rather than assuming an undocumented provider page ceiling. The backend's named request-page maximum is a defensive input limit, not a provider assumption.

## Appendix B — Optional Discovery Capabilities (non-normative, not in scope)

The provider documents discovery operations with many filters. These are identified as optional capabilities only; none is included in this feature, and no filter UI, filter parameters, or region claims may be introduced without a separate specification decision.

| Optional capability | Provider basis | Why it is not included |
|---|---|---|
| Media-type scope (All / Movies / TV Shows) | Per-type search operations | Would split the unified result list and require a different pagination and ordering model. Recorded as OQ-01. |
| Genre filter | Discover operations with genre filters | Adds filter UI, multiple selector semantics, and provider-specific filter behavior beyond title search. |
| Release or first-air year filter | Search and discover year parameters | Useful for narrowing, but not required for the title-search journey. |
| Minimum rating or vote-count filter | Discover vote filters | Would require explaining provider rating semantics and could overstate quality. Not part of MVP search. |
| Original-language filter | Discover language filter | Requires a language-selection interface and product decisions about catalog language scope. |
| Region filter | Discover region parameter | Affects release-date presentation and does not establish availability; region behavior is an open product decision (OD-12). |
| Sort order | Discover `sort_by` | Would replace provider relevance with a Walplay-chosen ordering and requires a ranking explanation. |
| Streaming-provider filter | Discover watch-provider and monetization filters | Depends on a streaming availability provider and region policy, both out of scope and unapproved. |
