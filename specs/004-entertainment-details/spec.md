# Feature Specification: Entertainment Details

**Feature Branch**: `feat/004-entertainment-details`

**Created**: 2026-11-22

**Status**: Draft

**Input**: Define a detailed and consistent experience for viewing information about a movie or TV show supplied by TMDB, including core descriptive metadata, genres and duration, attributed ratings and popularity, cast and crew, TV seasons and episodes, related-content navigation, entry points for related capabilities, resilient loading/error/not-found states, and responsive, accessible detail layouts. Streaming availability logic, video playback, watchlist persistence, recommendation algorithms, and Live TV are out of scope.

## Clarifications

### Session 2026-11-22

- Q: Should "favorites" be a separate concept from the personal watchlist? → A: Favorites is the same capability as the personal watchlist; the detail page shows one personal-save entry point (resolves OD-D1). This decision defines the single entry point when the capability exists; it does not require implementing the personal-list capability in this feature. **Superseded 2026-11-24 by feature 007** (`specs/007-watchlist-favorites/spec.md`): watchlist and favorites are two independent collections with two collection-specific entry points. OD-D1 is revised accordingly.
- Q: How should provider-supplied related titles be structured when both similar titles and collection membership exist? → A: Each relationship type gets its own labeled, bounded section, and empty sections are omitted.
- Q: When no overview exists in the selected interface language, what should the detail page show? → A: Fall back to the provider's original-language overview; omit the overview only when neither value is usable.
- Q: Should the selected TV season be reflected in the page address? → A: Yes. The season is reflected in the address and season changes replace the current history entry so return navigation is preserved.
- Q: Should TMDB popularity be displayed on the detail page? → A: Yes, but only in the secondary provider-metadata area, labeled as TMDB popularity, with no interpretation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the essential information about a title (Priority: P1)

A visitor opens a movie or TV show from the catalog or search results and immediately understands what the title is: its name, whether it is a movie or a TV show, when it was released or first aired, what it is about, and its primary descriptive facts. The visitor can return to where they came from.

**Why this priority**: This is the core value of the feature. Without a complete, trustworthy identity and overview, no other detail section is useful.

**Independent Test**: Open a movie and a TV show from catalog cards and from search results, and verify that title, content type, date, overview, genres, duration, artwork, and return navigation are correct and consistent. Reload each detail address directly and verify the same core information resolves without prior navigation.

**Acceptance Scenarios**:

1. **Given** a movie card in the catalog, **When** the visitor activates it, **Then** the movie's detail page opens inside the shared application shell, identifies the content type as a movie in text, and shows the available core information for that movie.
2. **Given** a TV show result in search, **When** the visitor activates it, **Then** the TV show's detail page opens and identifies the content type as a TV show in text.
3. **Given** a detail page opened from the catalog, **When** the visitor uses the return action or browser back, **Then** the catalog context they came from is restored.
4. **Given** a detail page opened from search, **When** the visitor returns, **Then** the active search and its query are restored as defined by the search feature.
5. **Given** a detail address opened directly or reloaded, **When** the page loads, **Then** the title resolves from its content type and identity without requiring previous navigation.
6. **Given** a valid title, **When** the page renders, **Then** the title name, content type, release or first-air date, and available core facts are presented in a consistent hierarchy that does not depend on which origin opened the page.

---

### User Story 2 - Trust what the page shows, including what it omits (Priority: P1)

A visitor encounters titles with incomplete provider metadata: no overview, no poster, no runtime, no rating, or no genres. The page remains coherent, never displays invented values or empty placeholders, and never presents provider data as more certain than it is.

**Why this priority**: External metadata is frequently incomplete. A detail page that breaks, shows zeros, or fabricates values undermines the product's core promise of trustworthy information.

**Independent Test**: Load detail pages for titles with each optional field missing, with empty strings, with zero values, and with invalid values, and confirm that only supported information is shown, the hierarchy closes gaps cleanly, and no placeholder or invented value appears.

**Acceptance Scenarios**:

1. **Given** a title with no overview, **When** its detail page renders, **Then** no overview block, empty region, or fabricated summary appears, and the remaining information still renders in order.
2. **Given** a title with a missing, zero, or invalid runtime, **When** the page renders, **Then** no duration is shown and no zero or dash placeholder appears.
3. **Given** a title with no rating or zero votes, **When** the page renders, **Then** no rating is shown and no substitute score is inferred from popularity or another field.
4. **Given** a title whose poster and backdrop are both unavailable, **When** the page renders, **Then** a neutral fallback identifies the title and content type without a broken image or layout shift.
5. **Given** a title with only the minimum usable identity, **When** the page renders, **Then** the page remains usable and no section claims that missing information does not exist.
6. **Given** a provider response containing whitespace, empty strings, or placeholder text, **When** the response is mapped, **Then** those values are treated as missing and are not displayed.

---

### User Story 3 - Explore a TV show's seasons and episodes (Priority: P2)

A visitor viewing a TV show can see how many seasons and episodes exist, choose a season, and review that season's episodes with their numbers, names, air dates, durations, descriptions, and artwork when available.

**Why this priority**: TV shows cannot be evaluated like movies. Season and episode structure is the main additional information a viewer needs, but it depends on the core detail page already working.

**Independent Test**: Open a TV show with multiple seasons, select different seasons, and verify episode lists, counts, specials handling, and missing episode metadata. Confirm that a movie never shows season or episode content.

**Acceptance Scenarios**:

1. **Given** a TV show with seasons, **When** the detail page renders, **Then** a seasons section lists the regular seasons in ascending season-number order, followed by any specials, with localized names, season numbers, years, and episode counts.
2. **Given** a TV show with a specials season numbered zero, **When** seasons are listed, **Then** the specials are labeled as specials, appear after the regular seasons, and are not described as a regular season or selected by default while a regular season is available; an explicit valid `season=0` address selects the specials and still labels them as specials.
3. **Given** the seasons section, **When** the visitor selects a season, **Then** that season's episodes are shown in the order supplied by the provider.
4. **Given** an episode with missing artwork, duration, air date, or overview, **When** it is displayed, **Then** the missing values are omitted cleanly and the episode remains identifiable by its number and name.
5. **Given** a selected season with no episodes, **When** the season loads, **Then** a localized empty state explains that no episodes are available, and no episode is fabricated.
6. **Given** a movie detail page, **When** it renders, **Then** no seasons or episodes section appears.
7. **Given** a TV detail address that includes a valid season, **When** the address is opened directly or reloaded, **Then** that season is selected and its episodes are shown.
8. **Given** the visitor changes the selected season, **When** they activate browser back, **Then** the originating catalog or search context is restored rather than a previously selected season.

---

### User Story 4 - Review who made the title (Priority: P2)

A visitor can see the main cast and key crew for a title when the provider supplies them, including the character or role where known, presented in a bounded and scannable way.

**Why this priority**: Cast and crew are important decision inputs for many viewers, but they are secondary to the title's own description and are often incomplete.

**Independent Test**: Open titles with complete credits, with partial credits, and with no credits. Verify bounded cast and crew presentation, provider order, missing-value handling, and independent failure behavior.

**Acceptance Scenarios**:

1. **Given** a title with cast credits, **When** the page renders, **Then** a bounded cast preview is shown in provider billing order with each person's name and character when known.
2. **Given** a title with crew credits, **When** the page renders, **Then** a bounded key-crew preview shows known roles with localized role labels.
3. **Given** a credit with no profile image, **When** it is displayed, **Then** a neutral fallback shows the person's name without a broken image.
4. **Given** a credit with no usable person name, **When** credits are mapped, **Then** that credit is omitted rather than rendered blank.
5. **Given** a title with no usable credits, **When** the page renders, **Then** no cast or crew section appears and the rest of the page is unaffected.

---

### User Story 5 - Move to related titles (Priority: P2)

A visitor who is interested in a title can move to other titles the provider identifies as related, such as similar titles or other entries in the same collection, without Walplay inventing recommendations.

**Why this priority**: Related navigation supports discovery and keeps the visit productive, but it is an enhancement rather than a prerequisite for reading details.

**Independent Test**: Open titles with provider-supplied similar titles and collection membership, verify bounded related lists and navigation, and confirm that titles without related data show no empty or fabricated section.

**Acceptance Scenarios**:

1. **Given** a title with provider-supplied similar titles, **When** the page renders, **Then** a labeled similar-titles section lists a bounded set in provider order.
2. **Given** a movie that belongs to a provider collection, **When** the page renders, **Then** a separately labeled collection section lists a bounded set in provider order and does not merge with similar titles.
3. **Given** a related title, **When** the visitor activates it, **Then** the matching type-specific detail page opens.
4. **Given** a title with no related data, **When** the page renders, **Then** no related section is shown.
5. **Given** a related list containing the current title, duplicates, adult-flagged titles, or unusable items, **When** the list is prepared, **Then** those items are excluded.
6. **Given** one related section fails independently, **When** the rest of the page has loaded, **Then** the core details and any other related section remain usable and the failure is contained to the failed section.

---

### User Story 6 - Use clearly identified entry points for related capabilities (Priority: P3)

A visitor can identify the available next actions from a detail page, such as checking streaming availability, saving the title to a personal list, or opening a trailer, without encountering dead or misleading controls.

**Why this priority**: Entry points connect detail viewing to the wider product, but each depends on a capability whose availability is not yet guaranteed.

**Independent Test**: Open detail pages while each implemented capability is enabled and disabled, and while capabilities without a destination or provider are absent. Verify that only supported, functional entry points appear, that trailer links open authorized external destinations, and that no placeholder or disabled control is exposed.

**Acceptance Scenarios**:

1. **Given** the availability capability is available, **When** a detail page renders, **Then** an availability entry point is presented with a localized label that does not promise that the title is available.
2. **Given** the availability capability is not available, **When** a detail page renders, **Then** no availability entry point, placeholder, or "coming soon" state appears.
3. **Given** the personal-list capability is available, **When** the visitor activates the save entry point, **Then** its pending, success, and failure states are communicated and the control reflects the resulting state.
4. **Given** the provider supplies an authorized trailer, **When** the visitor activates the trailer entry point, **Then** the trailer opens at an authorized external destination with clear external-navigation indication and no in-page playback.
5. **Given** a title with no trailer, **When** the page renders, **Then** no trailer entry point appears.
6. **Given** any entry point, **When** it is rendered, **Then** it has a visible text label, is keyboard and touch operable, and its state is not communicated by color alone.

---

### User Story 7 - Use the detail page on any device or with assistive technology (Priority: P3)

A visitor on a phone, a narrow window, a zoomed desktop, a keyboard, or a screen reader can read the detail page, change seasons, follow related titles, and operate every entry point without losing context.

**Why this priority**: Accessibility and responsive behavior are constitutional requirements and determine whether the feature is usable at all for part of the audience.

**Independent Test**: Complete the detail journey at mobile, tablet, and desktop widths, at 200 percent zoom, with keyboard only, and with a screen reader. Verify content order, focus, announcements, and control reachability.

**Acceptance Scenarios**:

1. **Given** a narrow viewport, **When** the detail page renders, **Then** the content reflows without horizontal page scrolling, clipped text, or overlapping controls, and the information hierarchy is preserved.
2. **Given** keyboard-only operation, **When** the visitor navigates the page, **Then** every interactive element is reachable in a logical order with a visible focus indicator.
3. **Given** a screen reader, **When** the detail page finishes loading or a season changes, **Then** the page's main heading is exposed and the change is announced once without duplicate announcements.
4. **Given** a zoom level of 200 percent, **When** the page renders, **Then** text and controls remain readable and operable without loss of content.
5. **Given** reduced-motion preference, **When** the page renders, **Then** non-essential motion is suppressed and no information depends on animation.

---

### Edge Cases

- The same numeric provider identifier exists for a movie and a TV show: the content type in the address decides which title resolves, and no cross-type substitution occurs.
- The address contains an unknown content type, a malformed identifier, or a missing identifier: a localized not-found state appears with a working return to the catalog, never a technical error.
- The provider reports the title as unknown, removed, or adult-flagged: the page shows the same not-found state as an invalid title and reveals no reason from raw provider data.
- The provider returns a title with no poster and no backdrop: a neutral artwork fallback identifies the title and content type; no broken image or empty hero remains.
- The provider returns an empty overview, whitespace, or placeholder text in both the selected language and the original language: no overview block is displayed.
- The runtime is zero, negative, missing, or implausible: no duration is displayed and no value is inferred from episode counts or other fields.
- A TV show has no seasons, only specials, or only an announced but unaired season: the seasons section reflects what the provider actually supplies and does not claim episodes exist when none do.
- A season contains episodes with missing numbers, names, air dates, durations, artwork, or descriptions: each missing value is omitted, and an episode is identified by whichever usable identity remains.
- A TV show's episode run time contains several values or an empty list: a localized range is shown only when it can be derived truthfully; otherwise the duration is omitted.
- The detail address contains a season identifier that is missing, malformed, or no longer supplied by the provider: the first regular season is selected without an error, and no season outside the provider's list is invented.
- The visitor changes seasons several times and then uses browser back: the origin is restored rather than stepping backward through previously selected seasons.
- A rating has a zero vote count, a zero or invalid average, or a value outside the provider's known scale: no rating is shown.
- The provider's popularity value is zero or unavailable: nothing is shown in its place.
- The provider's popularity value is valid and positive: it appears only in the secondary provider-metadata area with a TMDB popularity label, and never in the primary facts or as a rating.
- Credits contain the same person multiple times, an empty character name, an unknown job, or no usable name: duplicates and unusable entries are handled without blank rows or invented roles.
- Both similar titles and collection membership are available: they appear as separate labeled sections, and each is omitted independently when it has no usable titles.
- Cast, season, and related lists are bounded; a very large list remains scannable and preserves its defined ordering within the displayed subset. Episode lists are not truncated: every usable episode in the selected season remains present and scannable through semantic list presentation.
- Images are slow or fail after the page has rendered: reserved dimensions prevent layout shift and a fallback appears without an error message.
- The visitor changes language while a detail page is loading or after a season is selected: localized fields refresh, stale responses are discarded, and a valid season selection is preserved.
- The visitor rapidly opens several details in sequence: only the newest title's response may update the page.
- The provider times out, rate-limits, returns malformed data, or fails validation: a stable localized state is shown, the shell and return navigation remain usable, and no raw provider information is exposed.
- Cached detail data is shown while the provider is unavailable: it is labeled as cached or stale with a last-update indication and is not presented as current.
- An external trailer destination is unavailable after the page has loaded: the failure does not break the detail page, and no in-page replacement playback is attempted.
- The visitor opens a detail page with no network connectivity: a localized unavailable state with retry appears, and previously cached data, if any, is labeled as stale.

## Requirements *(mandatory)*

### Functional Requirements

#### Access, identity, and navigation

- **FR-001**: The application MUST use the existing type-specific detail destination established by the catalog feature for movies and TV shows. This feature MUST complete that destination rather than create a second detail destination or a new top-level navigation entry.
- **FR-002**: Every catalog card and every search result MUST open the matching type-specific detail page for its title, using the established navigation behavior of those features.
- **FR-003**: The detail address MUST identify both the content type and the title's provider identity. The content type in the address MUST be authoritative for lookup, and a title MUST NOT resolve from another content type that happens to share the same numeric identifier. The media type encoded in the provider identity MUST match the address content type; a mismatch MUST be treated as not-found, never resolved by substitution.
- **FR-004**: A detail address opened directly, reloaded, or restored from history MUST resolve without requiring prior catalog or search navigation.
- **FR-005**: Browser back and forward MUST restore the originating catalog or search context as defined by those features. The detail page's return action MUST use the same behavior and MUST remain available in every detail state, including loading, error, and not-found.
- **FR-006**: The detail page MUST state the content type in localized text in its primary identity area. Color, artwork, layout position, or an icon alone MUST NOT communicate whether the title is a movie or a TV show.
- **FR-007**: The detail page MUST reuse the catalog and search rules for localized title resolution, original-title fallback, release-year derivation, genre omission, rating validity, artwork fallback, and number and date formatting rather than redefining them differently.
- **FR-008**: Changing the interface language MUST reload localized detail information for the same title, discard responses for the previous language, and preserve the title and any still-valid selected season.
- **FR-009**: When the visitor navigates between titles or rapidly opens several detail addresses, only the newest selection may update the visible page, announce content, or change focus.
- **FR-010**: The browser document title MUST identify the localized title and content type. Navigation within the application to a detail page MUST be announced to assistive technology and MUST move focus to the page's primary heading.
- **FR-011**: A title that the provider flags as adult, reports as unknown or removed, or returns without a usable title and identity MUST show the localized not-found state. Adult-flagged titles MUST NOT be reachable or displayed through this feature.

#### Information hierarchy and core presentation

- **FR-012**: The detail page MUST present information in this consistent order: title identity and content type; primary facts including date and genres; overview; available entry points; seasons and episodes for TV shows; cast and crew; related-title sections; provider attribution. Sections without usable information MUST be omitted without leaving a gap in the remaining order.
- **FR-013**: On desktop widths the page MUST present artwork alongside the primary identity and facts. On narrow widths the same hierarchy MUST stack in reading order, with the title and content type preceding the artwork in the accessibility tree.
- **FR-014**: The title MUST use the provider's localized title for the selected interface language when a usable value exists; otherwise the original-language title MUST be used. An empty, whitespace-only, or placeholder title MUST NOT be displayed.
- **FR-015**: The overview MUST be the provider's localized description for the selected language when available, preserving paragraph structure. When no usable localized description exists, the provider's original-language description MUST be used. When neither is usable, the overview MUST be omitted. Walplay MUST NOT machine-translate, summarize, or fabricate an overview.
- **FR-016**: An overview longer than a calibrated preview MUST be presented collapsed with a keyboard-operable, accessible expand and collapse control that reveals the complete text. The full overview MUST remain available to assistive technology, and truncation MUST NOT be the only occurrence of the text.
- **FR-017**: A poster MUST be shown when the provider supplies a usable reference, at an approved image size and reserved aspect ratio. When it is absent or fails, a neutral fallback MUST show the title and content type instead of a broken image, empty region, or color-only placeholder.
- **FR-018**: A backdrop MUST be used only as supporting atmosphere when the provider supplies one. It MUST NOT be the sole carrier of the title's identity, MUST NOT delay the title and primary facts, and MUST fall back to the poster or neutral treatment without layout shift.
- **FR-019**: A release date for a movie or a first-air date for a TV show MUST be shown as a fully localized date when the provider supplies a valid complete date, or as a four-digit year when only a valid year is available. An absent, empty, or invalid date MUST result in no date being shown, and a date MUST NOT be inferred from another field.
- **FR-020**: Genres MUST use localized names supplied by the provider. Unknown identifiers, empty lists, and unavailable names MUST be omitted, and raw provider identifiers MUST NOT be displayed.
- **FR-021**: A movie runtime MUST be shown only when the provider supplies a positive duration. It MUST be formatted for the selected locale in hours and minutes and MUST NOT be shown for zero, negative, missing, or implausible values.
- **FR-022**: A TV show's episode duration MUST be shown when the provider supplies at least one positive value. A single value MUST be shown as the typical episode length; several distinct values MUST be shown as a localized range from the shortest to the longest. An empty list or invalid values MUST result in no duration being shown.
- **FR-023**: A provider tagline MAY be shown near the title when a usable value exists. It MUST be omitted when empty or unavailable and MUST NOT be presented as the overview.
- **FR-024**: Provider status values, including release, production, returning, ended, and canceled states, MUST be mapped to localized interface labels. Unknown status values MUST be omitted, and raw provider status strings MUST NOT be shown.
- **FR-025**: For TV shows, the provider-reported season count, episode count, and first and latest air dates MUST be shown as summary facts when supplied. They MUST be labeled so they cannot be mistaken for a count Walplay calculated, and specials MUST NOT be counted or described as regular seasons.
- **FR-026**: Numeric facts including ratings, vote counts, durations, season numbers, episode numbers, and counts MUST use locale-aware formatting and tabular numerals where the design system requires vertical alignment.

#### Missing and incomplete metadata

- **FR-027**: Missing optional information MUST be omitted cleanly. The interface MUST NOT display blank labels, zero values, dashes, "N/A", "Unknown", "Untitled", placeholder punctuation, or an empty section in place of absent metadata.
- **FR-028**: The minimum usable detail identity MUST consist of a supported content type, a usable localized or original title, and a provider identity. A title lacking the minimum identity MUST show the localized not-found state rather than a mostly blank page.
- **FR-029**: The failure or absence of any one optional field or section MUST NOT prevent the remaining fields and sections from rendering.
- **FR-030**: When a localized field is unavailable, the detail page MUST fall back to the provider's original-language value when one is usable. If neither is usable, the field MUST be omitted rather than shown empty or translated by Walplay.
- **FR-031**: Provider values that are empty, whitespace-only, null-like, or recognizable placeholder text MUST be normalized to missing before display.

#### TV seasons and episodes

- **FR-032**: A seasons section MUST appear only for TV shows and only when the provider supplies at least one usable season. Movies MUST NOT show any season or episode content.
- **FR-033**: The seasons section MUST list the provider's regular seasons in ascending season-number order, followed by a specials season when one exists. Each season MUST show its localized name or provider name, season number, air year when known, and episode count when known. A season numbered zero MUST be labeled as specials and MUST NOT be described or selected as a regular season.
- **FR-034**: The seasons section MUST provide a single-select season control or equivalent accessible navigation that identifies the selected season in text, exposes the full set of seasons without clipping, and reflects the selected season in the detail address through a season identifier that does not create a separate detail destination. Changing the season MUST replace the current history entry rather than add one.
- **FR-035**: The initially selected season MUST be the first regular season supplied by the provider, or the first available season when no regular season exists. A valid season identifier in the address MUST select that season; a missing, malformed, or unavailable identifier MUST fall back to the initial season without an error. Opening the page MUST NOT require the visitor to select a season before any episode information appears.
- **FR-036**: Selecting a season MUST show that season's episodes in provider order. The episode list MUST NOT be truncated; every usable episode in the selected season MUST be rendered. Each episode MUST show its episode number, localized name when available, air date when valid, duration when valid, overview when available, still image when available, and episode rating only under the rating rules in FR-041 through FR-044.
- **FR-037**: An episode name that is missing MUST NOT be invented. When the name is missing but a provider episode number exists, the episode MUST be identified by its number plus a localized "Episode" label. If neither a usable number nor a usable name exists, the episode MUST be omitted.
- **FR-038**: Episode overviews longer than a calibrated preview MUST be collapsed with an accessible expand and collapse control, and the complete text MUST remain available to assistive technology.
- **FR-039**: Season selection MUST NOT cause the page to lose the title identity, entry points, cast, or related sections. The selected season MUST be reflected in the control's visible and accessible state.
- **FR-040**: A season with no usable episodes MUST show a localized empty state inside the episode area. The seasons list and the rest of the page MUST remain usable, and no episode data MUST be fabricated.

#### Ratings, popularity, and attribution

- **FR-041**: A rating MUST be shown only when the provider supplies a valid average on its known scale and a non-zero vote count. A zero, negative, out-of-range, or missing average MUST result in no rating being shown.
- **FR-042**: Every displayed rating MUST identify its source as TMDB and be presented as a TMDB user rating, not as a Walplay rating, critic score, or editorial judgment. The source attribution MUST be visually associated with the rating itself, not only present elsewhere on the page. This includes ratings shown on related-title cards: a related card MUST omit a rating rather than display one without visible TMDB attribution.
- **FR-043**: Every displayed rating MUST be formatted for the selected locale and MUST expose its scale and vote count in accessible text, for example as a rating out of ten based on a localized vote count.
- **FR-044**: Ratings from different sources MUST NOT be averaged, blended, substituted, ranked against each other, or presented as interchangeable. Ratings from sources other than the approved initial provider MUST NOT be displayed until a separate product and provider decision authorizes them.
- **FR-045**: When the provider supplies a valid positive popularity value, the detail page MUST display it only in the secondary provider-metadata area adjacent to the provider attribution required by FR-046, labeled as TMDB popularity with its source and without interpretation or comparison. Popularity MUST NOT appear among the primary facts and MUST NOT be presented as a rating, quality signal, recommendation, ranking, or measure of audience approval. When popularity is unavailable or zero, it MUST be omitted.
- **FR-046**: The detail page MUST display the provider attribution required by TMDB's current attribution and brand guidelines, including the required notice or logo treatment and the link treatment required by current official guidance, in a visible provider-attribution area that does not require interaction to reveal. The exact wording, assets, and link placement MUST follow current official TMDB guidance and MUST NOT be improvised. Unresolved link treatment is recorded as a release dependency (OD-D4); until it is confirmed, the existing approved notice and logo treatment are reused and no link is invented.
- **FR-047**: The page MUST NOT claim that provider-supplied titles, descriptions, artwork, ratings, or other metadata are owned, verified, complete, or permanently accurate by Walplay.
- **FR-048**: A rating or popularity value MUST NOT be shown in a way that implies it is live or guaranteed; any provider-supplied volatility or freshness limitation MUST be communicated in localized text where the product presents such values as current.

#### Cast and crew

- **FR-049**: A cast section MUST appear only when the provider supplies usable cast credits. It MUST show a bounded preview of at most ten cast members in provider billing order.
- **FR-050**: Each displayed cast credit MUST show the person's name and the character name when known. Missing character names MUST be omitted without placeholder text, and a cast credit without a usable person name MUST be dropped.
- **FR-051**: A crew section MUST appear only when the provider supplies usable key-crew credits. It MUST show a bounded preview of at most six key crew credits and MUST map known roles such as director, creator, and writer to localized interface labels. Unknown or unmapped jobs MUST be omitted from the summary rather than guessed or invented.
- **FR-052**: Duplicate credits for the same person and role MUST be removed from the displayed preview without changing the provider order of the remaining credits.
- **FR-053**: Cast and crew profile images MUST use provider-supplied references at approved sizes, reserve their aspect ratio, and load lazily. A missing or failed profile image MUST show a neutral fallback carrying the person's name, without a broken image or layout shift.
- **FR-054**: Cast and crew images MUST NOT duplicate the person's accessible name. A profile image MUST be identified as the named person's image or be treated as decorative when the adjacent name already identifies the credit.
- **FR-055**: When no usable cast or crew credits exist, the corresponding section MUST be omitted entirely. A credits failure MUST NOT block the core detail page.

#### Related titles

- **FR-056**: Related titles MUST come only from relationships the provider supplies. Each supported relationship type MUST appear as its own clearly labeled section: similar titles, and collection membership for movies. Each section MUST label its relationship truthfully and MUST NOT describe provider lists as personalized recommendations or as based on the visitor's activity.
- **FR-057**: Each related section MUST show a bounded preview in provider order, MUST preserve each title's content type in text, and MUST contain only titles that match that section's relationship and a supported content type. Similar and collection results MUST NOT be merged into one list.
- **FR-058**: Activating a related title MUST open its matching type-specific detail page. Related sections MUST NOT create a second detail destination or duplicate card content.
- **FR-059**: The current title, duplicate titles, adult-flagged titles, titles of an unsupported type, and titles without a usable identity or title MUST be excluded from every related section. An empty related section MUST be omitted entirely; when every related section is empty, no related area is shown.
- **FR-060**: A related-section failure MUST be contained to that section, MUST offer a retry for that section only, and MUST NOT prevent the core detail page, seasons, credits, other related sections, or entry points from working.

#### Entry points for related capabilities

- **FR-061**: Entry points MUST be presented as a clearly identifiable action area in the detail hierarchy, with visible localized labels and states. Icon-only, color-only, or unlabeled controls MUST NOT be used for these actions.
- **FR-062**: An availability entry point MUST appear only when the streaming-availability capability is available to the application. It MUST use a localized label that clearly indicates the visitor will view availability information, MUST NOT state or imply that the title is available, and MUST follow the availability feature's own region, attribution, and limitation disclosures.
- **FR-063**: When the availability capability is not available, the detail page MUST NOT show an availability entry point, disabled control, placeholder, explanatory teaser, or "coming soon" message.
- **FR-064**: A personal-list (watchlist) entry point MUST appear only when the personal-list capability is available. It MUST reflect the current saved state in text, expose an accessible name that includes the title, show pending and success states, and report failure explicitly. The visual state MUST NOT rely on color alone. This feature does not define the collection model: when the personal-list capability exposes more than one collection, each collection has its own entry point defined by feature 007, and this feature implements none of them.
- **FR-065**: A trailer entry point MUST appear only when the provider supplies an authorized trailer reference for the title. Activating it MUST open the authorized external destination with a clear indication that the visitor is leaving Walplay, MUST NOT start in-page playback, and MUST NOT autoplay media.
- **FR-066**: A title with no authorized trailer MUST NOT show a trailer entry point. Embedded third-party players, unverified video sources, and fallback links to unauthorized copies MUST NOT be introduced.
- **FR-067**: The detail page MUST NOT render disabled, non-functional, placeholder, or "coming soon" entry points for any capability. Unsupported capabilities MUST be omitted entirely and MUST NOT reduce the usability of the remaining actions.
- **FR-068**: Every entry point MUST be keyboard operable, meet the design system's touch-target minimum, use a visible focus indicator, and preserve the detail page's address and state when the visitor returns from an external destination.

#### Loading, error, and not-found states

- **FR-069**: Initial detail loading MUST use a skeleton that matches the final identity, artwork, facts, overview, and section layout closely enough to avoid a visible content jump. The skeleton MUST expose a busy state to assistive technology, hide decorative shapes from assistive technology, and MUST NOT rely on a spinner or bare "Loading" text.
- **FR-070**: Core detail content MUST load as one primary surface. Secondary surfaces, including seasons and episodes, cast and crew, and each related section, MUST load and fail independently once the core identity is available.
- **FR-071**: A core detail failure with no usable cached content MUST show a page-level localized error with a retry action, the surrounding shell, and a working return to the catalog. It MUST be visually and semantically distinct from not-found.
- **FR-072**: A secondary surface failure MUST show a localized inline error with a retry action for that surface only. It MUST NOT replace the whole page with an error, and previously displayed content MUST remain usable.
- **FR-073**: The not-found state MUST appear for an unknown title, a malformed or missing identity, an unsupported content type, an adult-flagged title, or a title lacking the minimum usable identity. It MUST be localized, MUST offer a return to the catalog, MUST NOT expose technical details, and MUST NOT be presented as a temporary error.
- **FR-074**: Error and not-found states MUST preserve language switching and primary navigation. They MUST NOT expose raw provider errors, status codes, response bodies, stack traces, internal identifiers, or provider-specific field names.
- **FR-075**: Provider timeouts, rate limits, unavailable services, malformed responses, and validation failures MUST map to stable internal detail states and stable machine-readable error codes that the interface localizes into calm, actionable messages.
- **FR-076**: Every retry action MUST genuinely re-attempt the failed request, MUST affect only the failed surface, MUST prevent concurrent duplicate retries, and MUST remain user-initiated or bounded by the boundary's retry policy. Repeated failure MUST show the same stable localized state.
- **FR-077**: When last-known-good detail data is shown while the provider is unavailable, it MUST be labeled as cached or stale with a localized last-update indication and MUST NOT be presented as current. When no usable cached data exists, the error or not-found state MUST be shown instead.
- **FR-078**: Changing language, changing the selected season, or retrying a secondary surface MUST NOT allow an older response for a previous selection to alter the visible state.

#### Responsive, accessible, and localized presentation

- **FR-079**: The detail page MUST work at mobile, tablet, and desktop widths and at 200 percent browser zoom without horizontal page scrolling, clipped controls, overlapping content, or loss of information. The required identity and core facts MUST remain visible without requiring horizontal scrolling.
- **FR-080**: The page MUST use semantic landmarks and a logical heading hierarchy with exactly one primary heading for the title, section headings beneath it, and list semantics for genres, cast, crew, seasons, episodes, and related titles.
- **FR-081**: All interactive controls MUST be operable by keyboard in a logical order, with a visible and consistent focus indicator, no keyboard trap, and no interaction that requires precise pointer movement.
- **FR-082**: Navigation to a detail page and changes to the selected season MUST be announced once through an appropriate live region, and the busy state of loading surfaces MUST remain announced without duplicate or stale announcements.
- **FR-083**: Information MUST NOT be communicated exclusively through color, hover, icon shape, or visual position. Content type, availability-related labels, rating source, selected season, and entry-point states MUST be understandable in text.
- **FR-084**: Poster, backdrop, profile, still, and related-title images MUST reserve their dimensions to avoid layout shift, use appropriate alternative text or be marked decorative when adjacent text already identifies the subject, and provide the defined fallback on failure.
- **FR-085**: Essential typography and controls MUST meet WCAG 2.2 AA contrast and target-size requirements, remain usable with text resizing and spacing overrides, and respect the reduced-motion preference for any decorative motion.
- **FR-086**: All dates, durations, counts, ratings, and popularity values MUST be formatted with locale-aware conventions for English and Spanish, and durations MUST NOT mix localized units with unlocalized numerals or separators.
- **FR-087**: All Walplay-owned interface text, section labels, control labels, empty states, errors, and accessibility announcements MUST be available in English and Spanish. Provider-supplied content MUST NOT be presented as Walplay-authored or machine-translated copy.
- **FR-088**: The document language MUST reflect the active interface locale, and changing language MUST update the document title and metadata labels along with the rest of the page.

#### Provider boundary and TMDB integration

- **FR-089**: All TMDB requests MUST be made through the server-side boundary. TMDB credentials MUST NOT be exposed to the client, and the frontend MUST NOT call TMDB directly.
- **FR-090**: TMDB responses MUST be treated as untrusted input, validated at the boundary, and mapped to Walplay's internal detail domain. Provider response shapes, field names, identifiers, and errors MUST NOT reach the interface.
- **FR-091**: The internal title identity MUST combine the supported content type with the provider identifier, because TMDB movie and TV identifiers occupy separate namespaces.
- **FR-092**: The boundary MUST obtain the information required by this feature from current documented TMDB operations: movie details for movies; TV series details for TV shows; TV season details for a selected season's episodes; credits for movie cast and crew and aggregate credits for TV cast and crew; videos for trailer references; similar titles and collection membership for related titles; and the rating average, vote count, popularity, adult flag, and artwork references supplied by those responses. `append_to_response` MAY combine compatible sub-requests in one call, within TMDB's documented limit of 20 appended items.
- **FR-093**: Localized metadata MUST be requested with TMDB's English `en-US` and Spanish `es-ES` language settings, consistent with the catalog and search features, with a defined fallback to original-language values when localized fields are empty.
- **FR-094**: Provider requests MUST use an explicit configurable timeout, bounded retries on idempotent requests only with backoff and jitter, a defined cache lifetime keyed by content type, identifier, language, and season where applicable, and rate-limit-respecting request behavior.
- **FR-095**: Provider failures, timeouts, rate limits, invalid responses, and unknown titles MUST map to stable internal error and not-found codes. Raw provider errors and provider internals MUST NOT be logged as user-facing content or returned to the client.
- **FR-096**: The provider mapping MUST be explicit per displayed field. Fields the provider does not supply, or supplies on a different content type, MUST be treated as unavailable and MUST NOT be inferred, synthesized, or borrowed from another title.
- **FR-097**: TMDB attribution, artwork usage, caching, and link-out behavior MUST follow TMDB's current terms and brand guidance. Scraping, undocumented endpoints, authentication bypass, and unauthorized image or video sources MUST NOT be used.
- **FR-098**: The detail feature MUST NOT depend on TMDB-specific shapes outside its provider adapter, and replacing the metadata provider MUST NOT require rewriting the detail experience's behavior or requirements.

### Key Entities

- **Entertainment Title**: A movie or TV show identified by content type plus provider identity. Holds localized and original title, overview, tagline, release or first-air date, artwork references, adult flag, provider status, rating, popularity, genres, and collection membership when available.
- **Title Rating**: A provider-supplied average on a known scale with its vote count, source, and freshness context. It is distinct from popularity and from any future Walplay personal rating.
- **Genre**: A provider-supplied identifier mapped to a localized display name. Raw identifiers are internal and are not displayed.
- **Duration**: A positive movie runtime or TV episode duration expressed consistently for localized formatting. Missing, zero, or invalid values are not represented.
- **Person and Credit**: A person with a name and optional profile image, connected to a title as cast with a character and billing order, or as crew with a department and job. Usable name is required; other attributes are optional.
- **TV Show Summary**: Provider-reported season count, episode count, production status, first and latest air dates, and networks where available. Counts do not include specials as regular seasons.
- **Season**: A TV season with a season number, localized or provider name, optional air date, optional episode count, optional artwork, and optional overview. Season zero is specials. Regular seasons are ordered by ascending season number, specials follow them, and the selected season is reflected in the detail address.
- **Episode**: A TV episode with a season number and episode number, optional localized name, air date, duration, overview, still image, and episode rating. Usable number or name is required.
- **Related Title**: A provider-supplied association such as a similar title or collection member, with its relationship type, provider order, content type, and title identity. Each relationship type is presented in its own labeled section.
- **Provider Attribution**: The TMDB notice, logo treatment, and link required by current provider guidance, shown visibly in a dedicated area of the detail page.
- **Detail View State**: The distinct states of loaded content, partial content, loading, stale or cached content, recoverable error, and not-found, each with defined user-visible and assistive-technology behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 percent of movies and TV shows reachable from catalog cards and search results open a detail page that identifies the correct title and content type.
- **SC-002**: Detail pages opened directly or reloaded resolve the correct title and content type for every sampled valid address, with no reliance on prior navigation.
- **SC-003**: In a sample of at least 30 titles spanning complete and incomplete metadata, 100 percent render without missing-content errors, blank placeholders, fabricated values, or broken images.
- **SC-004**: Every displayed rating has a visible TMDB source attribution, and every displayed popularity value is labeled as TMDB popularity and is not presented as a rating, ranking, or recommendation.
- **SC-005**: 100 percent of TV shows with provider seasons allow a visitor to reach any season's episode list in no more than two interactions from the initial detail page state.
- **SC-006**: 100 percent of sampled entries in cast, crew, season, episode, related, and entry-point surfaces are keyboard reachable and have an accessible name.
- **SC-007**: Automated accessibility checks report zero critical or serious violations on the detail page, and manual keyboard and screen-reader checks pass for the complete detail journey.
- **SC-008**: At 320 CSS pixels width and at 200 percent zoom, the page has no horizontal page scrolling and no essential control or text is clipped or overlapped.
- **SC-009**: A visitor can switch between English and Spanish on a detail page and see localized interface text and available localized metadata within the same session, without losing the selected title or a valid selected season.
- **SC-010**: When the metadata provider is unavailable, 100 percent of tested detail pages either show labeled stale content or a localized recoverable state; none show raw provider errors, fabricated content, or a blank page.
- **SC-011**: Unknown, malformed, removed, and adult-flagged titles always produce the localized not-found state and never a technical error or a partial page that implies the title exists.
- **SC-012**: Every sampled title with no cast, crew, seasons, related titles, or entry-point capability omits the corresponding surface entirely, with no empty section, disabled control, or "coming soon" text.
- **SC-013**: 100 percent of sampled valid season addresses open with that season selected, invalid season addresses fall back to the initial season without an error, and browser back after a season change returns to the origin rather than a previous season.
- **SC-014**: 100 percent of sampled titles with both similar titles and collection membership show them as separate labeled sections, and no sampled title merges the two relationships into one list.

## Assumptions

- The detail destination's addresses, shell integration, and origin-return behavior already exist from the catalog and search features. This feature completes the destination rather than introducing parallel routes or navigation.
- TMDB is the approved initial metadata provider. No other metadata or ratings source is approved, and TMDB's `vote_average` and `vote_count` are the only rating data currently available.
- The English interface uses TMDB's `en-US` setting and the Spanish interface uses `es-ES`, consistent with the catalog and search features. Original-language values are the fallback when localized values are empty.
- TV season and episode information is presented within the title's detail page through season selection. The selected season is recorded in the detail address, and changing it replaces the current history entry. Separate episode detail pages are not required by this feature and are not introduced. Specials are listed after regular seasons, labeled as specials, and are not selected by default while any regular season exists; an explicit valid `season=0` address selects specials and still labels them as specials (resolving OD-D7).
- Cast and crew are summarized as bounded previews. A complete browsable credits experience and per-person pages are not part of this feature.
- Related titles are limited to provider-supplied associations, and each relationship type is presented in its own labeled section. Walplay does not compute, personalize, or explain recommendations in this feature.
- Streaming availability logic, personal-list persistence, and video playback are delivered by other features. This feature defines only the presence, labeling, and state contract of their entry points.
- Favorites is a separate product capability from 2026-11-24 (`specs/007-watchlist-favorites/spec.md`), superseding OD-D1. This feature defines only the presence, labeling, and state contract of personal-list entry points; it implements neither collection, so no save control renders until feature 007 provides them.
- TMDB popularity is a secondary provider data point. When valid and positive, it is shown with a TMDB popularity label next to the provider attribution and is not treated as a rating, ranking, or recommendation.
- Provider attribution, artwork licensing, caching limits, trailer link-out rights, and TMDB commercial terms remain release dependencies to be confirmed before release. Implementation uses the existing approved attribution widget and configured cache TTLs, keeps trailer rendering disabled until the link-out decisions are confirmed, and does not improvise wording or link treatment.
- Standard web application performance and availability expectations apply. No specific numeric latency target is guaranteed by this specification beyond avoiding avoidable layout shift and redundant requests.

## Dependencies and Open Decisions

The following decisions are unresolved. Each MUST be settled before the behavior that depends on it ships, or explicitly recorded as a release dependency with that behavior gated. They do not change this specification's user-visible requirements, but they determine whether certain requirements can be delivered as written.

| ID | Decision | Impact | Needed from |
|---|---|---|---|
| OD-D2 | Whether the availability entry point is rendered before a streaming-availability provider and feature exist, and how it is gated. | FR-062 and FR-063 currently require omission until the capability exists. | Product and availability-provider decision (Product Overview OD-03) |
| OD-D3 | Whether Walplay may link users out to trailers and other authorized external destinations, and under what conditions. | Trailer entry points depend on link-out rights and destination authorization. | Legal and provider terms review (Product Overview OD-04) |
| OD-D4 | TMDB's exact required attribution wording, logo treatment, placement, and link behavior, plus approved artwork sizes and caching limits. | FR-046, FR-092, and FR-097 must follow current official guidance; the exact treatment is not assumed here. | TMDB terms and brand guidance review |
| OD-D5 | Whether TMDB data may be cached, for how long, and under what storage and refresh constraints. | Affects stale-content behavior and provider request volume. | TMDB terms and legal review |
| OD-D6 | Which trailer sites and video types TMDB supplies are authorized for external linking in each supported region. | Determines when a trailer entry point may appear and which destinations are permitted. | Provider terms and legal review |
| OD-D8 | Whether ratings from sources other than TMDB will be added and how multiple sources would be presented. | FR-044 prohibits blending or substituting sources; a future decision must define separate presentation if approved. | Product and provider decision |
| OD-D9 | Regional availability and metadata completeness for Spanish and non-US catalogs, including titles with no Spanish localization. | Determines how often fallback and missing-metadata rules are exercised in production. | Provider capability review |
