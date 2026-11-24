# Feature Specification: Watchlist and Favorites

**Feature Branch**: `feat/007-watchlist-favorites`

**Created**: 2026-11-24

**Status**: Draft

**Input**: Allow visitors to save movies and TV shows they want to watch and mark titles as favorites, without mandatory registration. The feature covers adding and removing titles from a watchlist and from favorites, reviewing both collections in dedicated sections, distinguishing the two lists, preventing duplicates, presenting saved title information consistently, handling unavailable or deleted catalog entries, empty/loading/error states, clear action feedback, guest persistence boundaries, and later association of guest data with an optional account without loss or duplication. Social sharing, collaborative lists, subscription management, recommendation algorithms, account management, and implementation tasks are out of scope.

## Clarifications

### Session 2026-11-24

- Q: How should watchlist and favorites relate, given that `specs/004-entertainment-details/spec.md` recorded decision OD-D1 stating that favorites is the same capability as the personal watchlist? → A: Two independent lists. Watchlist records intent to watch; Favorites records titles the visitor loves. A title may be in either list, both lists, or neither. This supersedes OD-D1 and requires the Product Overview capability list to add favorites.
- Q: Must the full capability work without an account? → A: Yes. Guest use is the initial persistence model, with device-local storage and no registration gate. Accounts are optional and, when introduced, must be able to adopt guest data explicitly and without loss or duplication.
- Q: Which persistence model applies before accounts exist? → A: Device-local, versioned personal data owned by the visitor's browser profile on that device. No server, database, authentication provider, or account schema is assumed by this feature.
- Q: Should the two collections appear as two separate top-level navigation destinations, or as two sections of one "Saved" destination? → A: One "Saved" primary-navigation destination containing both collections, each with its own stable address so it can be linked and tested directly.
- Q: How should adoption resolve a title that the device has saved but the account previously removed? → A: Union per collection. The device entry is added to the account, duplicates are collapsed, and the adoption preview states how many titles will be added. Prior account removals are not tracked as tombstones in this contract.
- Q: How should a saved section present a large collection? → A: Most-recently-saved-first batches of up to 50 entries with a "Show more" control. Numbered pagination is not used.
- Q: When a visitor is signed in but declined or skipped adoption, and when that visitor later signs out, what should the saved sections show? → A: While signed in, only account collections are shown; unadopted guest data remains on the device, hidden and intact, and is shown again after sign-out. Guest and account scopes are never merged or displayed together.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a title to the watchlist as a guest (Priority: P1)

A guest viewing a movie or TV show decides they want to watch it later. The guest uses a clearly labeled save control on the existing detail destination. The control confirms that the title is now in the watchlist, the same title is not added twice, and the choice is still there after a reload or a return visit.

**Why this priority**: Saving a title without an account is the core value of the feature. Without a reliable add/remove loop, the two collections and every downstream behavior are meaningless.

**Independent Test**: With empty saved data, add a movie and a TV show from their detail destinations, reload the pages, revisit the destinations, and verify membership, duplicate handling, feedback, and persistence; then remove one and verify the state and the saved section.

**Acceptance Scenarios**:

1. **Given** a movie detail destination and an empty watchlist, **When** the guest activates the watchlist save control, **Then** the title is added once, the control changes to a removal action whose text states the title is in the watchlist, and a success message is announced.
2. **Given** a title already in the watchlist, **When** the guest activates the save action again or reloads and repeats it, **Then** exactly one watchlist entry exists, the guest is told it is already saved, no duplicate is created, and no error is presented.
3. **Given** a title in the watchlist, **When** the guest activates the removal action, **Then** the title is removed from the watchlist only, the removal is announced, and the control returns to its add state.
4. **Given** a title that was never saved, **When** a removal is requested for it, **Then** the outcome is treated as already removed without an error and without creating an entry.
5. **Given** a guest who has saved titles, **When** the guest reloads the page, opens a new tab, or returns in a later browser session on the same device, **Then** the saved state is restored for every saved title.
6. **Given** the storage write fails or is unavailable, **When** the guest saves a title, **Then** the interface does not claim the title was saved durably, reports a localized error with a retry, and states that the change applies only to the current session when it remains visible.
7. **Given** a pending save or removal, **When** the guest activates the same control again, **Then** the duplicate submission is prevented and the control exposes a pending state.

---

### User Story 2 - Mark favorites as a distinct personal collection (Priority: P1)

A guest wants to remember the titles they love, separately from the titles they still intend to watch. The guest can mark or unmark a favorite from a detail destination, sees that favorites are a different collection from the watchlist, and can tell for any saved title which of the two collections contain it.

**Why this priority**: The request defines favorites as an independent concept. If the two lists are conflated, the feature delivers neither the watchlist intent nor the favorites meaning.

**Independent Test**: Mark titles as favorites and as watchlist items, verify independent membership and counts, verify that removing from one list leaves the other intact, and verify that list controls and section headings name the correct collection.

**Acceptance Scenarios**:

1. **Given** a title not in favorites, **When** the guest marks it as a favorite, **Then** exactly one favorites entry is created, the favorite control reflects the new state in text, and a success message is announced.
2. **Given** a title already in favorites, **When** the guest repeats the favorite action, **Then** no duplicate is created and the guest is told it is already a favorite.
3. **Given** a title in both the watchlist and favorites, **When** the guest removes it from favorites, **Then** the title remains in the watchlist, the watchlist count is unchanged, and the interface does not describe the title as unsaved.
4. **Given** a title in both lists, **When** the guest removes it from the watchlist, **Then** the title remains in favorites.
5. **Given** a saved entry in either section, **When** the guest adds it to the other collection, **Then** the entry appears in both collections and the action is named for the target collection.
6. **Given** the watchlist and favorites controls on one detail destination, **When** the guest inspects them, **Then** each control is labeled for its collection, exposes the title in its accessible name, and neither control uses the generic word "save" alone to mean both lists.
7. **Given** a title is in favorites, **When** the guest marks it as watched in a future capability, **Then** this feature leaves list membership unchanged; watched status is not introduced or inferred here.

---

### User Story 3 - Review saved titles in dedicated sections (Priority: P2)

A guest opens the Saved destination and selects the Watchlist or Favorites collection to review saved titles. Each collection has its own stable address inside the destination, is reachable from one primary-navigation entry, shows the most recently saved titles first in batches, presents each title consistently, and handles empty, loading, partial, and error states without pretending a failure is an empty list.

**Why this priority**: Saving has no value if the guest cannot review, act on, and maintain the collection. The saved sections are also where maintenance happens.

**Independent Test**: Open both collections with empty data, with populated data, during metadata loading, with partial metadata, and with a failing metadata lookup; verify ordering, batching, counts, state separation, navigation, and per-entry actions.

**Acceptance Scenarios**:

1. **Given** the guest has saved titles, **When** the guest opens the Saved destination and selects Watchlist, **Then** the section lists the watchlist titles with the most recently saved first, shows a watchlist-specific heading and count, and offers per-entry removal.
2. **Given** the guest has saved titles, **When** the guest opens the Saved destination and selects Favorites, **Then** the section uses favorites-specific copy and count, lists only favorites, and does not present itself as the watchlist.
3. **Given** an empty watchlist, **When** the section loads, **Then** it shows a watchlist-specific empty state that explains what the collection is for and offers a primary action that starts discovery.
4. **Given** an empty favorites collection, **When** the section loads, **Then** it shows a distinct favorites-specific empty state with a discovery action, not a generic message reused from the watchlist.
5. **Given** the saved section's own data has not yet been read, **When** the section renders, **Then** a skeleton that matches the final entry layout is shown, a busy state is exposed to assistive technology, decorative shapes are hidden from it, and no spinner or bare loading text is used.
6. **Given** entries whose catalog details are still refreshing, **When** the section renders, **Then** each entry keeps its stored snapshot with a busy indicator instead of being replaced by a skeleton, and no layout shift occurs.
7. **Given** saved entries that cannot be resolved by the catalog, **When** the section renders, **Then** usable entries still render, and the affected entries are presented in a degraded form rather than silently removed or replaced.
8. **Given** the saved section fails to load, **When** the failure state renders, **Then** a localized error with a retry action is shown and the state is not presented as an empty collection.
9. **Given** the guest removes an entry, **When** the removal completes, **Then** focus moves to the next entry or to the section heading when none remains, the removal is announced once, and the count updates.
10. **Given** the guest changes data in another open tab on the same device, **When** the guest returns to the saved section, **Then** the section reflects the change without requiring a manual reload and without losing entries.
11. **Given** a collection containing more than 50 entries, **When** the section renders, **Then** it shows the first 50 most recently saved entries with a visible total count and a "Show more" control, and activating it reveals the next batch, announces the revealed range, and keeps the guest's position.
12. **Given** a collection containing 200 or more entries, **When** the guest reviews and maintains it through batches, **Then** the section remains operable and scannable, no entry becomes unreachable, and the first batch becomes visible within one second of opening the collection.

---

### User Story 4 - Handle unavailable or deleted catalog titles (Priority: P2)

A guest has saved titles whose catalog information later becomes temporarily unavailable, changes, or disappears. The saved entry remains identifiable from what the guest saved, is clearly marked as degraded or no longer available, and can still be removed or added to the other collection.

**Why this priority**: Saved titles are the visitor's personal record. Silent deletion or an unusable section when metadata fails would break the product promise that personal lists remain usable when external providers fail.

**Independent Test**: Seed saved entries, then simulate a metadata timeout, a title rename, a not-found title, an entry with a corrupted identity, and the return of a previously deleted title; verify each state, the available actions, and the absence of silent data loss.

**Acceptance Scenarios**:

1. **Given** a saved title and an unavailable metadata provider, **When** the guest opens the saved section and the detail destination, **Then** the entry still shows the last saved identifying information, is marked as temporarily unavailable for details, offers retry where meaningful, and can still be removed.
2. **Given** a saved title that the catalog reports as no longer existing, **When** the entry renders, **Then** it is marked as no longer available in the catalog, remains counted and visible, and is not removed automatically.
3. **Given** a saved title marked as no longer available, **When** the catalog later resolves it again, **Then** the marker clears and current title information is shown without the guest re-adding the title.
4. **Given** a saved entry whose stored identity is malformed or cannot be interpreted, **When** the section renders, **Then** the entry is shown in a minimal unreadable-entry state with a removal action and does not break the rest of the section.
5. **Given** a saved title whose display name changed at the catalog, **When** the section renders, **Then** the current name is shown while the same entry identity and list membership are preserved.
6. **Given** a saved title with degraded catalog information, **When** the guest removes it or adds it to the other collection, **Then** the action succeeds independently of catalog availability.
7. **Given** any saved entry, **When** availability information fails or is absent, **Then** the saved state, list membership, and counts are unaffected.

---

### User Story 5 - Keep guest data within documented limits and adopt it into an account later (Priority: P3)

A guest understands that saved titles live only on this device, what causes them to be lost, and what an account would change. When optional accounts exist, the guest can explicitly attach the device's saved titles to an account in a merge that keeps everything, creates no duplicates, and survives partial failure.

**Why this priority**: Persistence boundaries must be honest, and the migration path must not be invented later in a way that loses data. It is lower priority than the core loops because no account capability exists yet.

**Independent Test**: Review the persistence notice in both sections; clear browsing data and verify the documented loss; simulate an explicit account adoption with overlapping and disjoint titles, a repeated adoption, and a mid-adoption failure; verify union, dedupe, no loss, retry, and the state after sign-out.

**Acceptance Scenarios**:

1. **Given** a guest with saved titles, **When** either saved section renders, **Then** a persistent, localized notice states that saved titles are stored only on this device, can be lost if browsing data is cleared or the browser or device changes, and are not synchronized across devices.
2. **Given** the localized notice and no account capability in the product, **When** the notice renders, **Then** it does not advertise, promise, or link to a sign-up feature that does not exist.
3. **Given** the guest clears the site's browsing data, **When** the saved section is opened again, **Then** the documented behavior occurs: the section shows the empty state and the interface does not claim the previous data was recovered.
4. **Given** an optional account capability and a guest with saved titles, **When** the guest chooses to attach them to the account, **Then** the guest sees an explicit confirmation describing that local titles will be merged into the account before anything is uploaded.
5. **Given** the guest declines the adoption, **When** the guest continues, **Then** no data is transmitted, the guest lists remain on the device, and the account still becomes usable without them.
6. **Given** an account that already has saved titles and a guest device with overlapping and different titles, **When** the adoption completes, **Then** each list is the union of both scopes, each title appears at most once per list, and no account entry is lost.
7. **Given** an adoption that fails partway, **When** the failure is reported, **Then** no title is lost from either scope, the device data is not marked as migrated, the failure is explained, and the adoption can be retried without creating duplicates.
8. **Given** a successful adoption, **When** the guest returns to the saved sections, **Then** the titles are shown from the account, the migrated device copy is cleared, and a repeated adoption does not recreate duplicates.
9. **Given** an authenticated visitor who declined adoption and then signs out on the device, **When** the saved sections render again, **Then** account lists are no longer exposed, the device does not retain a readable copy of account lists, the unadopted guest collections become visible again with their entries intact, and the visitor can save new guest titles.

---

### User Story 6 - Use saved titles on any device and with assistive technology (Priority: P3)

A guest using a phone, a keyboard, a screen reader, browser zoom, reduced motion, or the Spanish interface can save, review, remove, and understand saved titles. The two collections remain distinguishable in every state and every supported width.

**Why this priority**: Personal lists are core content. An inaccessible or untranslated saved experience would exclude visitors from the product's central promise.

**Independent Test**: Exercise both saved sections and the detail controls at 360, 768, 1024, and 1440 pixels and at 200 percent zoom, using keyboard only, a screen reader, reduced motion, and both English and Spanish; verify reading order, focus, announcements, contrast, target sizes, wrapping, and complete localization.

**Acceptance Scenarios**:

1. **Given** the detail save controls, **When** a keyboard user navigates them, **Then** both collection controls are reachable in a logical order with a visible focus indicator and no keyboard trap.
2. **Given** the saved sections, **When** a screen reader reads them, **Then** each section exposes its collection name, count, entries as a list, each entry's title, content type, membership in the other collection, degraded state, and available actions without duplicate or stale announcements.
3. **Given** the same title appears in both sections, **When** a screen reader reads each occurrence, **Then** each entry's accessible context identifies which collection is being read.
4. **Given** a guest who cannot perceive color, **When** the interface renders membership, degraded, empty, pending, and error states, **Then** every state remains understandable from text and structure.
5. **Given** a narrow viewport or 200 percent zoom, **When** the saved sections and detail controls render, **Then** there is no horizontal page scrolling, clipped control, overlapping content, or lost title identity.
6. **Given** a long or non-Latin title, **When** it renders in a saved entry or control, **Then** the full title remains available to assistive technology and the layout remains operable.
7. **Given** the Spanish interface, **When** the feature renders, **Then** all Walplay-owned labels, headings, counts, states, notices, dates, and announcements are in Spanish while title names remain as supplied.
8. **Given** the reduced-motion preference, **When** saved entries are added, removed, or refreshed, **Then** non-essential animation is suppressed and no motion draws attention or blocks the task.

---

### Edge Cases

- The same catalog identity exists as a movie and as a TV show; both are saved independently.
- Two different titles share the same display name or the same release year.
- A title is saved, then renamed, then saved again from its new detail destination.
- A title is in the watchlist, then added to favorites, then removed from one list.
- A saved title's provider identity changes or the catalog merges two records.
- A catalog record is deleted, then restored, then deleted again.
- The metadata provider times out, rate-limits, returns malformed records, or is entirely unavailable while a saved section is open.
- The guest has never saved anything and lands directly on a saved section address.
- The saved section address is opened for a collection the device has no data for.
- Browser storage is disabled, full, or evicted while the guest is using the app.
- Two tabs add and remove the same title at nearly the same time.
- The device's stored data was written by an older or newer version of the product.
- The stored data is partially corrupted, contains unknown fields, or contains an entry with no usable identity.
- The guest clears browsing data in the middle of a session.
- The guest uses private browsing and the saved state disappears in a new private window.
- The guest switches interface language or region while a saved section is open.
- An account adoption is started, interrupted, retried, and then the visitor signs out on the same device.
- An account adoption is attempted when the account already contains the same titles.
- A signed-in visitor has unadopted guest data stored on the same device.
- A collection has exactly 50 entries, and then exactly 51 entries.
- Guest data is adopted in one open tab while another tab has a saved section open.
- A saved title has no permitted artwork, no year, or no localized name.
- A saved list contains more entries than fit comfortably on one screen.
- A guest attempts to use the feature while offline after the app shell is available.

## Requirements *(mandatory)*

### Functional Requirements

#### Scope, entry points, and boundaries

- **FR-001**: The feature MUST provide two independent personal collections: a **Watchlist** for titles the visitor intends to watch and **Favorites** for titles the visitor loves. Each collection MUST be separately identified in every surface where it appears.
- **FR-002**: The complete capability MUST be available to guests without registration, sign-in, email, or any personal identifier. No saved-title action, saved section, or recovery path may require an account.
- **FR-003**: The primary save entry point MUST be the existing movie and TV show detail destination, which already defines a single personal-save entry point. This feature replaces that single entry point with two collection-specific controls and MUST update the detail feature's contract accordingly.
- **FR-004**: The product MUST expose exactly one "Saved" primary-navigation entry that opens a destination containing both collections. Each collection MUST have its own stable address within that destination, so that the watchlist and favorites can be linked, restored, and tested directly. The destination and both collection addresses MUST be reachable when empty and MUST NOT be gated or hidden for guests.
- **FR-005**: The initial release MUST NOT add save controls to catalog, discovery, or search result cards. If such entry points are added later, they MUST obey the same membership, duplicate, feedback, and accessibility rules defined here.
- **FR-006**: The feature MUST use the entertainment domain model. A saved title MUST be referenced by content type plus the product's internal title identity. Provider response structures, provider field names, and provider-specific identifiers MUST NOT be stored as the membership key or exposed to the visitor.
- **FR-007**: Personal-list actions and saved sections MUST continue to work when external metadata or availability providers fail. Provider failure MUST NOT delete, hide, or block maintenance of saved titles.
- **FR-008**: The feature MUST NOT introduce watched status, personal ratings, personal notes, recommendations, sharing, collaboration, subscription management, or playback. It MUST NOT infer any of these from list membership.
- **FR-009**: The feature MUST NOT introduce user-created lists, list naming, list decoration, or an arbitrary number of collections. The product provides exactly two collections.
- **FR-010**: Saved state MUST be presented on the detail destination for the title currently shown, and only when the title identity is valid. An unresolved title MUST NOT show save controls or saved state for another title.

#### Membership lifecycle

- **FR-011**: A guest MUST be able to add a title to the watchlist and to add a title to favorites from the detail destination, using two distinct controls that name their collection.
- **FR-012**: A guest MUST be able to remove a title from each collection from the detail destination and from the entry in that collection's saved section.
- **FR-013**: After every add or removal, the control MUST reflect the resulting membership in text, not by color or icon alone, and the change MUST be announced once to assistive technology.
- **FR-014**: Adding a title that is already in the same collection MUST NOT create a duplicate, MUST NOT present an error, and MUST report that the title is already present in that collection.
- **FR-015**: Removing a title that is not in the collection MUST be treated as an idempotent success without presenting an error and without creating an entry.
- **FR-016**: Uniqueness MUST be enforced per collection, scope, content type, and internal title identity. A movie and a TV show that share a provider identifier MUST be treated as different titles.
- **FR-017**: A title MAY be present in both collections. Membership in one collection MUST NOT imply, create, or remove membership in the other.
- **FR-018**: Removing a title from one collection MUST NOT change the other collection, its count, or its presentation.
- **FR-019**: A saved entry MUST allow the guest to add or remove the same title in the other collection without leaving the saved section, and the action MUST name the target collection.
- **FR-020**: Every membership mutation MUST expose a pending state for the duration of the persistence operation and MUST prevent duplicate submission while the operation is in progress. A synchronous local write MUST still set and clear an explicit busy state and block re-entry for its duration. Every mutation MUST report success visibly and accessibly and MUST report failure explicitly with a recovery action.
- **FR-021**: The interface MUST NOT report a title as saved until the change is durably recorded by the persistence boundary. Optimistic presentation is permitted only with rollback and visible error feedback on failure.
- **FR-022**: Within a saved section, entries MUST be ordered by most recently added first. The order MUST be deterministic, stable across reloads, and unaffected by metadata failure, availability failure, or degraded-entry state.
- **FR-023**: Adding or removing a title MUST NOT expire, archive, auto-remove, or reorder unrelated saved entries.
- **FR-024**: Removing the final entry in a collection MUST immediately present that collection's empty state.
- **FR-025**: A membership change made in one open tab on the same device MUST be reflected in other open tabs without a manual reload and MUST NOT silently drop an entry.

#### Distinguishing the collections

- **FR-026**: The words used for each collection MUST be distinct in English and Spanish and MUST NOT be used interchangeably in headings, controls, counts, empty states, or announcements.
- **FR-027**: Each saved section MUST state the purpose of its collection in Walplay-owned localized text: watchlist as titles the visitor intends to watch, favorites as titles the visitor loves.
- **FR-028**: A saved entry MUST state, in text, which collections contain that title, including when it belongs to both.
- **FR-029**: Counts MUST be reported per collection. A combined count MUST NOT be presented as the count of either collection.
- **FR-030**: Controls MUST be distinguished by accessible name and visible label, for example "Add to watchlist" and "Add to favorites" or "Remove from favorites". A generic "Save" label MUST NOT be the only label for either action.
- **FR-031**: The two collections MUST remain visually distinguishable through their labels, headings, and structure. Color alone MUST NOT be the distinguishing signal.
- **FR-032**: The feature MUST NOT describe favorites as a higher or more important state than the watchlist, and MUST NOT suggest that adding to one collection should replace the other.

#### Saved sections and presentation consistency

- **FR-033**: Each saved section MUST present a consistent, documented set of identifying information for every entry: the title name, the content type, the release or first-air year when known, permitted artwork when available, collection membership, and any degraded or unavailable state.
- **FR-034**: Entries MUST present the same information set in both saved sections, differing only in collection-specific labels, counts, empty-state copy, and available collection actions.
- **FR-035**: When catalog information is available, a saved entry MUST show current title information while preserving the original saved identity and membership. When catalog information is unavailable, the last successfully saved identifying information MUST be shown.
- **FR-036**: A saved section MUST provide a skeleton loading state while its own saved data has not yet been read. The skeleton MUST match the final entry layout closely enough to avoid visible content shift, MUST expose a busy state, and MUST NOT rely on a spinner or bare loading text. An entry whose catalog details are merely refreshing MUST keep showing its stored snapshot with a busy indicator rather than being replaced by a skeleton.
- **FR-037**: A saved section MUST provide a collection-specific empty state that explains the collection's purpose and offers a primary action that starts discovery or search. The empty action MUST be functional and MUST NOT be a dead or misleading control.
- **FR-038**: An empty state MUST NOT be presented as an error, and an error MUST NOT be presented as an empty collection.
- **FR-039**: A saved section MUST provide a localized error state with a retry action when the failure is recoverable. Failure of one collection's section MUST NOT prevent the other collection from rendering.
- **FR-040**: Partial failures MUST degrade only the affected entry. Usable entries MUST remain visible and operable when other entries are degraded.
- **FR-041**: Saved sections MUST expose their counts in visible text and in accessible structure.
- **FR-042**: Saved entries MUST remain operable with long titles, missing artwork, missing year, and non-Latin names without clipping, overlap, or loss of identity.
- **FR-043**: A saved section MUST present entries in most-recently-saved-first batches of up to 50. When more entries remain, a "Show more" control MUST reveal the next batch, MUST announce the revealed range once, and MUST preserve the guest's position and focus. Numbered pagination and infinite auto-loading are not used. All entries MUST remain reachable, and each saved section MUST support at least 200 entries per collection while remaining operable and scannable.
- **FR-044**: The saved section MUST be usable offline only to the extent that the application shell is already available; the feature MUST NOT promise offline availability, background synchronization, or push updates.

#### Unavailable and deleted catalog entries

- **FR-045**: A saved entry MUST remain displayable from stored identifying information when the catalog cannot be reached, so the guest can still recognize and maintain it.
- **FR-046**: When catalog details cannot be retrieved, the entry MUST be marked in text as temporarily unavailable for details, and retry MUST be offered where retry is meaningful.
- **FR-047**: When the catalog authoritatively reports that a saved title no longer exists, the entry MUST remain visible and counted, MUST be marked as no longer available in the catalog, and MUST offer removal. It MUST NOT be removed silently.
- **FR-048**: When a previously unavailable title becomes resolvable again, the degraded or not-available marker MUST clear and current information MUST be shown without re-adding the title.
- **FR-049**: A stored entry with a missing, malformed, or uninterpretable identity MUST be presented in a minimal unreadable-entry state with a removal action. It MUST NOT break the section, be counted as another title, or be silently discarded.
- **FR-050**: Degraded entries MUST remain removable and MUST remain individually addable to the other collection.
- **FR-051**: Availability information MUST NOT affect list membership, counts, ordering, or the saved state. Unavailable, stale, or missing availability MUST NOT be presented as evidence that a saved title is invalid.
- **FR-052**: A saved title that is unavailable in the active region MUST remain saved without any region-specific removal or warning beyond the documented availability behavior of the availability feature.

#### Device-local persistence for guests

- **FR-053**: Guest watchlist and favorites data MUST persist across page reloads, navigation, and new browser sessions on the same device and browser profile, until the guest removes it or the browser data is cleared.
- **FR-054**: In guest mode, saved data MUST remain on the device. It MUST NOT be transmitted to a server, uploaded, synchronized, or shared with another device or person.
- **FR-055**: Guest saved data MUST be scoped to the application's own storage in that browser profile. Data MUST NOT be shared across browsers, browser profiles, or devices.
- **FR-056**: The interface MUST persistently disclose, in both saved sections, that saved titles are stored only on this device; can be lost if browsing data is cleared, if the browser or device changes, or in private browsing; and are not synchronized across devices. This implements the local-only warning requirement of the constitution and Product Overview BR-10.
- **FR-057**: The disclosure MUST also be presented the first time a guest saves a title. It MUST be available in text, MUST NOT be hidden behind hover or a dismissible-only notice, and MUST NOT be omitted because the guest is returning.
- **FR-058**: When no account capability exists in the product, the disclosure MUST NOT advertise, promise, or link to accounts, synchronization, or sign-up.
- **FR-059**: Stored data MUST be treated as untrusted input and validated on read. An entry that is structurally malformed (not an object, or missing the required identifying fields) MUST be dropped individually. An entry that is structurally readable but whose identity is unusable MUST be retained as the unreadable entry defined by FR-049. Unknown fields MUST NOT cause a failure.
- **FR-060**: Stored data MUST be versioned. Data written by an older version MUST be migrated safely without loss of valid entries or duplication. Data written by a newer or unknown version MUST NOT be destroyed without explicit guest confirmation.
- **FR-061**: If the stored data cannot be read at all, the interface MUST show a localized recovery state rather than a crash or a silent empty state. Resetting unusable stored data MUST require explicit guest confirmation.
- **FR-062**: If a storage write fails, is rejected, or exceeds available space, the interface MUST NOT claim durable success. It MUST explain the failure, offer retry, and state that any visible change is limited to the current session.
- **FR-063**: The guest MUST be able to delete saved data from the device for each collection and for both collections together. Deletion of a whole collection MUST require explicit confirmation; deletion of a single entry MUST NOT require confirmation.
- **FR-064**: Guest saved data MUST NOT contain sensitive personal information beyond the minimum needed for the feature: title identity, collection membership, saved timestamps, and the identifying display information used to render degraded entries.
- **FR-065**: Guest saved data MUST NOT be used for recommendations, profiling, advertising, analytics enrichment, or any purpose other than presenting and maintaining the two collections.
- **FR-066**: Saved data MUST survive ordinary application version upgrades through the versioning and migration rules in FR-060.

#### Optional account association and migration

- **FR-067**: When an optional account capability exists, a guest MUST be able to attach the device's saved titles to the authenticated account. Adoption MUST be an explicit, visitor-initiated choice.
- **FR-068**: Before anything is transmitted, the guest MUST see a confirmation that identifies both collections and the number of titles that will be merged. Declining MUST leave the guest data usable and local, and MUST NOT block using the account without it.
- **FR-069**: Adoption MUST NOT occur silently in the background, on page load, on sign-in without confirmation, or as a side effect of any other action.
- **FR-070**: Adoption MUST merge each collection as the union of the account's entries and the device's guest entries. Entries MUST be deduplicated by collection, content type, and internal title identity. No entry present in either scope may be lost.
- **FR-071**: Adoption MUST be idempotent and replay-safe. Repeating an adoption, retrying after a partial failure, or resuming after an interruption MUST NOT create duplicates or remove entries.
- **FR-072**: A partially failed adoption MUST leave the device copy intact and unmarked as migrated, MUST report a localized failure, and MUST allow a retry that converges to the same merged result.
- **FR-073**: A successful adoption MUST clear only the device copy that was successfully migrated, and MUST NOT clear data that was not migrated.
- **FR-074**: While a visitor is signed in, saved sections MUST present only the account's collections. Any device guest data that was not adopted MUST remain stored, MUST NOT be displayed while the account is active, and MUST NOT be merged implicitly. After a successful adoption, the account's collections MUST be presented in both saved sections.
- **FR-075**: Account-owned saved data MUST be readable only by its owner. One visitor's lists MUST NOT be exposed to another visitor, to a guest, or across accounts.
- **FR-076**: On sign-out, account collections MUST stop being displayed, and a readable copy of account collections MUST NOT remain accessible on the device. Any unadopted guest collections that remain on the device MUST become visible again, and the signed-out visitor MUST be able to save new guest titles.
- **FR-077**: Adoption and account behavior MUST NOT assume a specific authentication provider, identity provider, database, storage engine, or schema. The product behavior in FR-067 to FR-078 is the contract those later decisions must satisfy.
- **FR-078**: Adoption MUST NOT track or replay prior account removals as conflicts. A device entry whose title the account previously removed is added under the union rule in FR-070, and the adoption preview MUST state how many titles will be added, including these titles. Adoption MUST NOT silently delete a guest entry, MUST NOT drop an entry to avoid a conflict, and MUST NOT present a removal conflict as an error.

#### Feedback and announcements

- **FR-079**: Every add, removal, adoption, decline, retry, and deletion outcome MUST produce a visible localized confirmation or error, and the outcome MUST be announced once through an appropriate live region.
- **FR-080**: Success feedback MUST remain perceivable long enough to be read and MUST NOT be conveyed only by a transient visual effect that assistive technology cannot access.
- **FR-081**: Failure feedback MUST state what failed, what the current state is, and what the visitor can do next. Raw storage errors, stack traces, provider errors, and internal identifiers MUST NOT reach the interface.
- **FR-082**: Pending mutations MUST expose a busy or pending state on the affected control and MUST NOT change the accessible name in a way that loses the title or collection context.
- **FR-083**: When an entry is removed from a saved section, focus MUST move to the next entry, or to the section heading when the collection becomes empty, and the move MUST be announced without duplicate messages.

#### Accessibility and responsive behavior

- **FR-084**: The feature MUST meet WCAG 2.2 Level AA.
- **FR-085**: Saved entries MUST use semantic list or equivalent structure, with a logical heading order beneath the saved section heading.
- **FR-086**: Every control MUST have a meaningful accessible name that includes the title and the collection where relevant, and MUST NOT rely on an icon alone.
- **FR-087**: Every interactive element MUST be keyboard operable in a logical order, MUST have a visible and consistent focus indicator, and MUST NOT create a keyboard trap.
- **FR-088**: Interactive targets MUST be at least 24 by 24 CSS pixels. Primary controls and row actions MUST be at least 44 by 44 CSS pixels.
- **FR-089**: Membership, degraded, unavailable, pending, empty, and error states MUST NOT be communicated exclusively through color, hover, icon shape, animation, or visual position.
- **FR-090**: The feature MUST work at 360, 768, 1024, and 1440 pixel widths and at 200 percent browser zoom without horizontal page scrolling, clipped controls, overlapping content, or loss of information.
- **FR-091**: Long titles, long localized labels, plural forms, and non-Latin scripts MUST remain identifiable and operable. Truncation MUST NOT be the only way to access the full title.
- **FR-092**: Decorative motion MUST be minimal and MUST respect the visitor's reduced-motion preference. The feature MUST NOT autoplay media or animate to draw attention.
- **FR-093**: Essential text, controls, and state indicators MUST meet WCAG 2.2 AA contrast and must remain usable with text resizing and spacing overrides.

#### Localization

- **FR-094**: All Walplay-owned saved-title text, labels, collection names, headings, counts, empty states, errors, notices, confirmations, dates, and accessibility announcements MUST be available in English and Spanish.
- **FR-095**: Missing translations MUST fall back to English and MUST NOT display raw translation keys.
- **FR-096**: Title names, artwork alt text supplied by the catalog, and other provider-supplied content MUST NOT be machine-translated or presented as Walplay-authored copy.
- **FR-097**: Counts, saved dates, and relative statements such as "saved 2 days ago", when shown, MUST be formatted for the selected locale and MUST use correct plural forms for each language.
- **FR-098**: Changing the interface language MUST NOT alter list membership, ordering, counts, or saved data.

#### Privacy, trust, and prohibited patterns

- **FR-099**: Saved lists MUST remain personal. The feature MUST NOT expose one visitor's saved titles to another visitor and MUST NOT offer sharing, public links, or collaborative lists.
- **FR-100**: The feature MUST NOT use artificial urgency, false scarcity, guilt, engagement pressure, or dark patterns to encourage saving, keep visitors signed in, or discourage removal.
- **FR-101**: Removing a saved title MUST be immediate and MUST NOT require an account, an email address, a survey, or a retention offer.
- **FR-102**: The feature MUST NOT imply that saving a title changes availability, grants access, or represents a commitment, reservation, or notification.
- **FR-103**: The feature MUST NOT present a saved title as watched, rated, reviewed, or recommended.
- **FR-104**: The device-persistence disclosure required by FR-056 and FR-057 MUST be visible, honest, and localized, and MUST NOT be weakened into a generic privacy footnote.

### Key Entities

- **Saved Entry**: One title's membership in one collection within one persistence scope. Its key attributes are the internal title identity, content type, collection, saved timestamp, and the identifying display snapshot used when catalog details are unavailable. It has no ratings, notes, watched state, or availability state.
- **Saved Collection**: One of exactly two visitor-owned collections, watchlist or favorites, for one persistence scope. It holds saved entries, a deterministic most-recently-saved ordering, and a count. Collections are independent of each other.
- **Title Identity Reference**: The product-internal way to identify a saved movie or TV show, composed of content type and the internal catalog identity. It is stable across provider response shapes and is the uniqueness key for membership.
- **Display Snapshot**: The minimum stored identifying information needed to render a saved entry when the catalog is unavailable: title name, content type, optional year, optional artwork reference, and the time it was captured. It is refreshed when catalog data is available.
- **Persistence Scope**: The boundary that owns a collection. A guest scope is device-local and browser-profile-scoped. An account scope is owned by an authenticated visitor and is not readable by guests or other visitors.
- **Stored Data Envelope**: The versioned, validated container for guest collections. It records a schema version, the collections, and their entries, and defines migration, corruption, and unknown-version behavior.
- **Adoption Record**: The outcome of attaching guest collections to an account. It records which guest entries were merged, whether the adoption completed, and whether the device copy may be cleared. It does not grant access to account data.
- **Collection State**: The distinct presentation states of a saved section: loading, empty, populated, partially degraded, recoverable error, and unrecoverable stored-data recovery. Each has defined visible and assistive-technology behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 percent of tested save and removal cases, the resulting membership is visible in text and exposed to assistive technology, and no state is communicated by color alone.
- **SC-002**: After 20 consecutive add, remove, reload, and tab-switch cycles, each tested title appears at most once per collection and no entry is lost.
- **SC-003**: In 100 percent of duplicate-add and absent-remove tests, no duplicate entry is created and no error is shown to the visitor.
- **SC-004**: In 100 percent of dual-membership tests, removing a title from one collection leaves the other collection and its count unchanged.
- **SC-005**: At least 90 percent of first-time test participants can save a title to the watchlist and to favorites, and explain the difference between the collections, within 60 seconds without assistance.
- **SC-006**: At least 90 percent of test participants correctly identify, for a title present in both collections, which collections contain it.
- **SC-007**: 100 percent of tested empty watchlists and empty favorites collections show collection-specific explanatory copy and a working discovery action, and are not presented as errors.
- **SC-008**: In 100 percent of tested loading cases, a layout-matching skeleton is shown with an announced busy state and no spinner, bare loading text, or avoidable layout shift.
- **SC-009**: In 100 percent of tested saved-section failures, a localized error with retry is shown, the state is not presented as empty, and the other collection remains usable.
- **SC-010**: In 100 percent of tested deleted, renamed, malformed, and temporarily unavailable titles, the saved entry remains identifiable, is marked honestly, and is never silently removed.
- **SC-011**: In 100 percent of tested provider-failure cases, saved titles remain visible and maintainable, and list counts and ordering do not change.
- **SC-012**: Guest saved titles survive 100 percent of tested reloads, new tabs, and later browser sessions on the same device, and are absent when browser data is cleared, matching the documented disclosure.
- **SC-013**: In 100 percent of tested save attempts with unavailable, full, or failing storage, the interface does not claim durable success and shows a localized error with a next step.
- **SC-014**: In 100 percent of tested older-version, newer-version, partially corrupted, and fully unreadable stored-data cases, no valid entry is lost without confirmation and the application does not crash or silently reset data.
- **SC-015**: In 100 percent of tested adoptions, including overlapping collections, repeated adoption, and mid-adoption failure, the merged result contains every entry from both scopes exactly once per collection and no entry is lost.
- **SC-016**: A scope audit finds zero accounts required for saving or reviewing titles, zero social or collaborative surfaces, zero recommendation, watched-status, rating, or notification behavior, and zero transmission of guest saved data.
- **SC-017**: Keyboard-only and screen-reader checks for both detail controls and both saved sections pass, with zero critical accessibility violations on the critical journey, including focus placement after removal.
- **SC-018**: Both saved sections and the detail controls pass checks at 360, 768, 1024, and 1440 pixels and at 200 percent zoom with no horizontal page scrolling, clipped controls, or lost title identity.
- **SC-019**: English and Spanish checks find complete Walplay-owned copy, zero raw translation keys, correct plural forms for counts, and title names displayed as supplied.
- **SC-020**: With 200 entries in a collection, the first batch of 50 becomes visible within one second of opening the collection, each "Show more" reveals the next batch without losing the guest's position, and every entry remains reachable and operable without unbounded loading or loss of entry identity.
- **SC-021**: In 100 percent of tested devices and both saved sections, the device-storage limitation notice is visible in text without interaction, and no nonexistent account or synchronization capability is advertised.
- **SC-022**: A 30-second task test with five participants finds that at least four can explain what happens to saved titles when browsing data is cleared or the device changes.
- **SC-023**: In 100 percent of tested runs, exactly one primary-navigation entry labeled for saved titles opens both collections, each collection address restores its own collection, and both are reachable while empty.
- **SC-024**: In 100 percent of tested sign-in and sign-out sequences with unadopted guest data, guest and account collections are never displayed together, no account entry is exposed after sign-out, and every unadopted guest entry reappears unchanged after sign-out.

SC-015 and SC-024 apply only when an optional account capability exists. They are not verifiable in the guest-only release and do not block it.

## Persistence and Account Behavior

This section records the expected guest experience, the persistence boundary, and the account-association contract. Functional requirements remain authoritative.

### Guest persistence boundary

| Event | Documented behavior |
|---|---|
| Save a title | Recorded locally on the device; shown in the corresponding collection immediately after durable local recording. |
| Reload, navigate, or start a new browser session on the same device | Collections are restored from device-local data. |
| Open another browser profile or another browser | No guest data is present; collections start empty. |
| Use a different device | No guest data is present; collections start empty. |
| Clear the site's or browser's browsing data | Guest collections are lost. The empty state is shown and no recovery is claimed. |
| Private or incognito browsing | Data may be discarded when the private session ends. Durability is never claimed. |
| Storage unavailable, full, or write rejected | The interface reports that the change is not durably saved and limits the claim to the current session. |
| Application version upgrade | Valid entries are migrated by version; no loss or duplication is introduced. |
| Guest deletes saved data | Data is removed from the device; whole-collection deletion requires explicit confirmation. |
| Visitor signs in without adopting | Saved sections show only the account's collections; unadopted guest data stays stored on the device, hidden and intact. |
| Adoption succeeds | Each collection is the union of both scopes; the migrated device copy is cleared; account collections are shown. |
| Visitor signs out | Account collections are no longer shown or readable; any unadopted guest data becomes visible again and new guest titles can be saved. |

### Account association contract

- Adoption is explicit, visitor-initiated, previewed with per-collection counts, and never silent.
- Merge semantics are union per collection with identity-based deduplication; nothing is deleted from either scope.
- Prior account removals are not tracked as conflicts: a device entry is added even when the account previously removed that title, and the preview states how many titles will be added.
- Adoption is idempotent, replay-safe, and failure-safe; the device copy is cleared only for entries confirmed as migrated.
- Declining adoption leaves guest data local and usable.
- While signed in, only account collections are displayed and unadopted guest data remains hidden on the device.
- Signed-out devices do not retain a readable copy of account collections, and unadopted guest data becomes visible again.
- No authentication provider, identity provider, database, or schema is assumed or selected by this feature.

### Open persistence and migration questions

These questions are documented rather than decided. They MUST be resolved before account adoption is implemented and MUST NOT be settled by silent implementation behavior.

1. **Adoption entry points and timing**: Is adoption offered only during sign-in or account creation, or also later from a saved section or settings? The product-level contract allows any explicit entry point and does not prescribe one.
2. **Cross-device conflict resolution**: Once lists are account-based and edited on several devices, which version wins for concurrent removals and additions? This is outside this feature but constrains the account data model.
3. **Identity changes at the catalog**: If the internal title identity changes because records are merged or replaced, should saved entries be reconciled automatically, or require visitor confirmation? The current contract treats an unresolvable identity as a degraded entry with removal only.
4. **Guest collection size limits**: No product-imposed limit is defined. Whether a limit should exist, and how it is communicated, is unresolved; current behavior is bounded only by available storage.
5. **Availability of account capability**: Until an account model is approved, FR-058 forbids advertising it. The trigger for introducing account adoption is a separate product and technical decision.

## Conflicts With Existing Specifications and Product Documents

- **Superseded decision**: `specs/004-entertainment-details/spec.md` OD-D1 stated that favorites is the same capability as the personal watchlist with one personal-save entry point. With the visitor's direction recorded in Clarifications, this specification supersedes OD-D1 and requires two independent collections and two detail-destination controls.
- **Requirement revised (2026-11-24)**: `specs/004-entertainment-details/spec.md` FR-064 previously prohibited a second favorites action and a separate favorites model. That clause is superseded by FR-001, FR-011, and FR-030 of this specification, and FR-064 has been revised to defer the collection model to this feature. The rest of FR-064, including saved-state reflection, pending state, and accessible naming, remains binding.
- **Product Overview updated (2026-11-24)**: `docs/product-overview.md` now includes personal favorites as a capability and MVP item with this feature as its basis, and records the OD-08 and OD-09 decisions described below. No further product-document change is required before implementation.
- **Product Overview decisions touched**: This feature resolves OD-08 (guest or local-only mode and migration) for planning by requiring guest device-local mode with explicit adoption, and partially resolves OD-09 by defining the persistence contract and leaving cross-device conflict resolution open. OD-07 (account model and authentication provider) remains open and is not assumed.
- **Unchanged boundaries**: `specs/002-entertainment-catalog/spec.md` and `specs/003-search-discovery/spec.md` exclude watchlist and favorites from their scope; this feature does not modify those exclusions. The personal home view remains a separate capability; this feature supplies the collections it would summarize.
- **Availability boundary**: `specs/006-streaming-availability/spec.md` FR-056 requires availability failure not to block personal-list actions; this feature satisfies that boundary without introducing availability behavior.

## Assumptions

- **Two independent collections**: Watchlist means intent to watch; favorites means affection for a title. Membership is independent, and both are visible in their own dedicated sections. This is recorded as a deliberate product decision in Clarifications.
- **Guest-first**: The initial release delivers the full capability without accounts. Guest data is device-local. Accounts are optional and introduced by a later decision.
- **No assumed account technology**: No authentication provider, identity provider, session strategy, database, or schema is selected or implied. The migration contract is provider-agnostic and belongs to the layer that later owns accounts.
- **Initial entry points**: The detail destination is the only save entry point in the initial release, because the detail feature already defines that surface. Catalog and search cards are excluded to avoid widening catalog and discovery scope.
- **Destination structure**: One "Saved" primary-navigation entry opens a destination containing both collections. Each collection keeps its own stable address inside that destination so it can be linked, restored, and tested directly. The destination and both collection addresses are reachable when empty, and none is hidden or gated for guests.
- **Presentation scale**: Saved sections reveal entries in most-recently-saved-first batches of up to 50 through a "Show more" control. Numbered pagination and infinite auto-loading are not used, which keeps the collection scannable and the interaction explicit.
- **Ordering**: Most recently saved first is the default order. Manual reordering is not included.
- **No list limit**: No product-imposed maximum number of saved titles is defined; the practical limit is available device storage. The 200-entry benchmark in FR-043 and SC-020 is a quality target, not a cap.
- **Watched status**: Watched status is a separate MVP capability. Saving a title does not mark it watched, and marking it watched later does not remove it from either collection.
- **Availability**: Availability is informational and belongs to the availability feature. Saved state does not imply availability, and availability does not affect membership.
- **Data minimization**: Guest data stores only title identity, collections, timestamps, and the identifying display snapshot. No profile, contact information, or behavioral history is stored by this feature.
- **Device scope**: "Same device" means the same browser and browser profile on that device. Browser-level and operating-system-level account sync, if present in the browser, is outside the product's control and is not claimed.
- **Private browsing**: Durability is never claimed in private browsing. The limitation notice covers the possibility that data disappears when the private session ends.
- **Disclosure form**: The device-only disclosure required on first save and for returning guests is implemented as a continuously visible hint under the detail controls plus a persistent notice in both saved collections. A dismissible or one-time dialog is not required and would weaken the disclosure.
- **Localization scope**: English and Spanish are the initial interface languages, consistent with the product requirements. Provider-supplied titles are not translated.
- **No notifications**: Saving does not create reminders, notifications, emails, or calendar entries. These are explicitly out of scope.
- **No offline promise**: The feature does not introduce a service worker, background synchronization, or an offline-first mode. It works with device-local data when the application is otherwise available.
- **Performance**: Standard responsive web expectations apply. The first batch of a saved collection becomes visible within one second of opening it, each subsequent batch is revealed within 500 ms, a save or removal is reflected within one second, and no interaction blocks on metadata for unrelated entries.
- **Legal and privacy**: Saved lists are personal data belonging to the individual visitor. No third-party sharing, advertising use, or profiling is permitted. Retention is controlled by the visitor through removal and deletion.

## Out of Scope

- Social sharing, public list links, follower feeds, and any collaborative or multi-user collection.
- Subscription management, rental, purchase, payment, or provider account changes.
- Recommendation algorithms, personalized suggestions, and ranking based on saved titles.
- Full account management: registration flows, credentials, profile editing, password recovery, provider selection, and session policy.
- Watched status, personal ratings, personal notes, and episode-level progress.
- Notifications, reminders, emails, and calendar integration.
- Manual reordering, custom list names, nested lists, tags, or collections beyond the two defined here.
- Import from or export to third-party watchlists, and provider-specific list synchronization.
- Offline mode, background synchronization, push updates, and native mobile applications.
- Adding save controls to catalog, discovery, or search result cards.
- Cast, crew, seasons, episodes, availability, or playback behavior inside saved sections.
- Analytics, experiments, advertising, and monetization of saved data.
- Implementation tasks, technical design, provider selection, and database schema.
