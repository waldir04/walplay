# Feature Specification: Initial App Foundation

**Feature Branch**: `feat/001-app-foundation`

**Created**: 2026-11-19

**Status**: Draft

**Input**: Define the initial application foundation for Walplay: a responsive application shell, global navigation and an initial home page, initial routes and navigation behavior, consistent page layout, shared UI foundations aligned with the Walday design system, loading/error/empty/not-found states, application configuration and environment handling, basic accessibility and responsive behavior, English and Spanish internationalization foundations, and clear separation between application layout, feature modules, and shared UI. No catalog, search, availability, watchlist, accounts, playback, or other business functionality is included.

## Clarifications

### Session 2026-11-19

- Q: Should focus move to the page heading on the first page load, or only after in-app route changes? → A: Only after in-app route changes; on initial load focus stays at the document start so the skip link remains the first Tab stop.
- Q: When the browser reports a regional locale such as es-MX, es-419, or en-GB, should it match the base supported language or only exact en/es values? → A: Match the base language, so any es-* locale selects Spanish and any en-* locale selects English; fall back to English only when no supported base language is present.

### Session 2026-11-20

- Q: Which destinations should the initial global navigation contain? → A: Home (the default route) and Settings only; Settings contains only the language preference, a short purpose description, and the localized local-storage notice, with no version, environment, or business content.
- Q: Which configuration values are in scope, and which are required? → A: One required public environment name validated against `local`, `development`, `staging`, and `production`, plus one optional public application version with a documented default and no interface surface; no other configuration is introduced.
- Q: How should genuine route-loading and route-load failure states occur when the foundation renders no server data? → A: Each destination's content is prepared on demand so a real loading state appears on first navigation and a failed preparation shows the retryable error state, with no artificial delay and no data request.
- Q: Should the shell include a footer, legal links, or a persistent language shortcut in the header? → A: No; the shell contains none of these and language selection lives only in Settings.
- Q: Must unknown direct addresses produce a server-level not-found response in addition to the in-application not-found page? → A: Only the in-application not-found experience is guaranteed; host rewriting and server response status remain a documented deployment dependency.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrive in a consistent, responsive application shell (Priority: P1)

A visitor opens Walplay on a phone, tablet, or desktop and sees the same recognizable application frame: the Walplay brand, a way to move between the initial destinations, and a clearly defined content area. The frame adapts to the available width without clipping content or forcing sideways scrolling.

**Why this priority**: Every later Walplay feature depends on a stable, responsive frame. Without it, no page can be added or evaluated consistently.

**Independent Test**: Open each initial route at 360, 768, 1024, and 1440 pixel widths and at 200% browser zoom. Confirm the shell structure, readable content, reachable controls, and the absence of horizontal page scrolling.

**Acceptance Scenarios**:

1. **Given** any initial route, **When** the page finishes loading, **Then** exactly one application header with the Walplay brand, one labeled primary navigation region, one main content region, and one page-level heading are present.
2. **Given** a 360-pixel-wide viewport, **When** any initial route is opened, **Then** content is presented in a single readable column, navigation remains available through a compact control, and no horizontal page scrolling occurs.
3. **Given** 768, 1024, or 1440 pixel widths, **When** any initial route is opened, **Then** navigation follows the approved wide-layout behavior, content remains centered within its maximum width, and no text or control is clipped or overlapped.
4. **Given** any initial route at 360 pixels and 200% browser zoom, **When** the visitor reads and operates the page, **Then** all content and controls remain reachable and no content is lost.
5. **Given** the visitor moves from one route to another, **When** the new page appears, **Then** the header and navigation remain stable and focus moves to the new page heading.

---

### User Story 2 - Navigate the initial routes and understand the home page (Priority: P1)

A visitor uses the global navigation or the brand link to move between the initial destinations. The home page explains what Walplay is without pretending that entertainment content already exists, and an unknown address produces a clear not-found experience instead of a blank screen.

**Why this priority**: Navigation and the home placeholder are the minimum usable product surface. They prove that routing, layout, and the initial information architecture work end to end.

**Independent Test**: Start at the home route, move to every initial destination and back, use browser back and forward, and open each route through a direct address. Confirm every destination resolves, the home placeholder contains no fabricated entertainment content, Settings contains only the language choice, its purpose description, and the local-storage notice, and an unknown address shows the not-found page.

**Acceptance Scenarios**:

1. **Given** the application opens at the home route, **When** the home page appears, **Then** it identifies Walplay, explains its entertainment discovery purpose, and contains no invented titles, artwork, availability claims, ratings, or non-functional calls to action.
2. **Given** the home page, **When** the visitor selects the other initial destination in the global navigation, **Then** the destination's route loads, the address updates, and the destination's page heading is shown.
3. **Given** the visitor has moved between destinations, **When** they use browser back or forward, **Then** the corresponding route and page content are restored.
4. **Given** a direct address for any initial route, **When** the application opens, **Then** the correct page appears inside the full application shell.
5. **Given** any initial route, **When** the visitor activates the Walplay brand link, **Then** the home page is shown.
6. **Given** an unknown address, including an unknown nested address, **When** it is opened, **Then** a not-found page appears inside the shell, explains that the page does not exist, and offers a working way back to the home page.
7. **Given** an active destination, **When** the visitor inspects the navigation visually or with assistive technology, **Then** the current destination is identifiable through more than color alone and is exposed as the current destination.
8. **Given** the Settings destination, **When** it appears, **Then** it contains only the English/Spanish language choice, a short read-only description of its purpose, and the localized local-storage notice, with no version, environment, account, or other business content.

---

### User Story 3 - Use the application with a keyboard and assistive technology (Priority: P1)

A visitor who cannot use a mouse or who relies on a screen reader can reach every essential part of the foundation, understand where they are, and move between pages without encountering a keyboard trap or an unlabeled control.

**Why this priority**: Accessible navigation is a non-negotiable product quality requirement. Retrofitting it later would require reworking the shell and every shared foundation.

**Independent Test**: Complete the primary navigation journey using only the keyboard, then repeat it with a screen reader. Confirm skip-link behavior, visible focus, menu focus handling, current-destination announcements, and page-change announcements.

**Acceptance Scenarios**:

1. **Given** any initial route, **When** the visitor presses Tab for the first time, **Then** a skip link becomes visible and, when activated, moves focus to the main content.
2. **Given** any initial route, **When** the visitor navigates using only the keyboard, **Then** every navigation destination, menu control, and language control can be reached and operated, and focus is always visibly indicated.
3. **Given** a narrow viewport, **When** the visitor opens the compact navigation menu with the keyboard, **Then** focus moves into the menu, Tab and Shift+Tab remain within it, Escape closes it, and focus returns to the control that opened it.
4. **Given** the visitor changes route, **When** the new page appears, **Then** the page change is announced once to assistive technology and the new page heading receives focus.
5. **Given** a screen reader, **When** the visitor reviews the shell, **Then** the brand link, primary navigation, menu control, and language control have meaningful accessible names, the expanded state of the menu is exposed, decorative marks are ignored, and the active destination is identified.

---

### User Story 4 - Switch the interface language between English and Spanish (Priority: P2)

A visitor chooses English or Spanish and immediately sees the entire foundation in that language, including navigation, page headings, empty and error states, document titles, and accessibility labels. The choice survives a reload, and unsupported or corrupted preferences fall back safely.

**Why this priority**: English and Spanish support is a constitutional requirement, and the foundation is the correct place to establish it before feature pages add user-facing text.

**Independent Test**: Switch between English and Spanish in both directions, reload, clear or corrupt the stored preference, and inspect every initial route and state. Confirm the full interface updates without a reload and that no untranslated or blank text appears.

**Acceptance Scenarios**:

1. **Given** a first visit with a browser preference for Spanish, including a regional variant such as `es-MX` or `es-419`, **When** the application opens, **Then** the interface is shown in Spanish; **Given** a browser preference for an unsupported language, **When** the application opens, **Then** the interface is shown in English.
2. **Given** the interface is in English, **When** the visitor selects Spanish, **Then** all visible interface text, page titles, accessibility labels, and the document language update without a full page reload, and the change is announced.
3. **Given** the visitor has selected Spanish, **When** the page is reloaded or reopened, **Then** the interface remains in Spanish.
4. **Given** a stored language preference that is invalid or a storage mechanism that is unavailable, **When** the application starts, **Then** it falls back to the supported browser preference or English, does not crash, and still allows the visitor to switch languages for the current session.
5. **Given** a Spanish translation is missing for a visible string, **When** that string is shown, **Then** the English fallback appears and no raw translation key or blank space is displayed.
6. **Given** Spanish text is longer than its English counterpart, **When** it is shown at 360 pixels or at 200% zoom, **Then** it wraps without clipping, overlap, or horizontal page scrolling.

---

### User Story 5 - Recover from loading, empty, error, and unknown-route states (Priority: P2)

A visitor always understands what the application is doing. While a route is loading, they see a layout-stable placeholder; when something fails, they see a calm localized explanation with a meaningful recovery action; when a page has no content, the empty state explains why and offers an action only when one actually works.

**Why this priority**: Trustworthy states are part of the foundation's contract. They prevent the shell from feeling broken and set the pattern every later feature must follow.

**Independent Test**: Trigger each state deliberately: open an unknown route, force a route-content preparation failure, open a destination for the first time to observe its loading state, view the empty home placeholder in both languages, start with the required configuration value missing, and start with the optional configuration value absent. Confirm the shell remains usable, announcements occur, focus is managed, no raw technical detail is shown, and the configuration error replaces the interface safely.

**Acceptance Scenarios**:

1. **Given** an unknown address, **When** the not-found page appears, **Then** it is visually and semantically distinct from an error, explains that the page does not exist, offers a working home action, and sets an appropriate localized page title.
2. **Given** a route's content fails to load, **When** the error state appears, **Then** it shows a localized explanation, a retry action that genuinely re-attempts the load, and a home action, and it exposes no stack trace, internal identifier, or raw technical message.
3. **Given** a destination is opened for the first time in a session, **When** its content is being prepared, **Then** a layout-matching placeholder appears inside the shell before the page content, without an artificial delay and without any data request.
4. **Given** a route is loading, **When** the placeholder is displayed, **Then** it matches the final layout closely enough to avoid a visible content jump, exposes a busy state to assistive technology, hides decorative placeholders from assistive technology, and does not rely on a spinner or the words "Loading…" alone.
5. **Given** an empty or placeholder state, **When** the visitor can take a meaningful action, **Then** the state offers it; **When** no action is available, **Then** the state contains no non-functional call to action.
6. **Given** the visitor has selected Spanish, **When** any loading, empty, error, or not-found state appears, **Then** the entire state is shown in Spanish.
7. **Given** an unexpected rendering failure, **When** the fallback appears, **Then** the failure is contained to the affected area, the visitor receives a safe localized explanation and a recovery action, focus moves to the fallback heading, and technical details are not exposed.
8. **Given** the required configuration value is missing or invalid, **When** the application starts, **Then** it shows a safe localized configuration error instead of a partially working interface, exposes no secret or internal identifier, and loads normally once the value is corrected.
9. **Given** the optional configuration value is missing, **When** the application starts, **Then** the documented default applies, the visitor-facing experience is unchanged, and only a developer-visible warning is produced.

---

### Edge Cases

- The visitor navigates rapidly between destinations, including before a previous route finishes loading; the final route wins and no duplicate page headings or stale announcements remain.
- The compact menu is open when the viewport widens past the wide-layout threshold; the menu closes without leaving a keyboard trap or a hidden focused control.
- The visitor opens a deep link directly, then uses browser back before any in-application navigation; the shell remains stable and the correct route is restored. On the direct load, focus stays at the document start, so the skip link is the first Tab stop.
- The stored language preference is removed between sessions, contains an unsupported value, or cannot be read; the application starts in the documented fallback without an error.
- The stored language preference exists but its stored shape is outdated; the application handles it safely and does not crash.
- The browser prefers a regional variant such as `es-MX`, `es-419`, or `en-GB`; the matching base language is selected, and a supported language does not fall back to English merely because the region differs.
- Required configuration is missing or invalid; the application refuses to present a partially working interface and shows a safe configuration error instead of exposing internal details.
- An optional configuration value is missing; the documented default is used and a developer-visible warning is produced without changing the visitor-facing experience.
- A route's on-demand content fails after the shell has rendered; only the affected content area is replaced, and the visitor can retry or return home.
- The visitor uses reduced-motion preferences; the menu and route transitions become effectively immediate while all state changes remain understandable.
- The visitor uses a screen reader during rapid route changes; announcements are not duplicated or left in a stale language.
- Content is displayed at 200% zoom with a long Spanish label; text wraps and all controls remain reachable.
- The application is opened without network access after the initial shell has loaded; no foundation route fabricates content or makes a provider request to fill the gap.
- A route is opened through a direct address on a host that does not rewrite unknown paths to the application; this is a documented deployment dependency, not something the foundation guarantees; the in-application not-found experience still applies once the application loads.

## Requirements *(mandatory)*

### Functional Requirements

#### Application shell and layout

- **FR-001**: Every route MUST render inside one shared application shell that contains exactly one header with the Walplay brand, one labeled primary navigation region, one main content region, and one page-level heading.
- **FR-002**: The header MUST show the Walplay brand lockup: the shared W monogram followed by the live-text `Walplay` wordmark. The lockup MUST link to the home route, the link MUST carry the accessible application name, and the monogram MUST be decorative and excluded from the accessible name.
- **FR-003**: The shell and every initial page MUST remain usable at 360, 768, 1024, and 1440 pixel widths, with no horizontal page scrolling, clipped text, overlapping controls, or content that cannot be reached. Zoom behavior is governed by FR-031.
- **FR-004**: Global navigation MUST use a persistent wide-layout presentation and a compact narrow-layout presentation. The wide-layout breakpoint is 768 pixels. At most one compact menu may be open, and it MUST close on route change, on Escape, and when the viewport becomes wide.
- **FR-005**: The active destination MUST be identifiable through at least two non-color cues, such as a background change plus an underline or indicator, and MUST be exposed to assistive technology as the current destination.
- **FR-006**: Pages MUST share a consistent content layout: a centered maximum content width, 16-pixel page padding on the smallest supported width, 24-pixel page padding from the small breakpoint (640 pixels) upward, matching the shared spacing scale, consistent spacing between major sections, and a logical heading order that starts with one page-level heading. The shell MUST NOT include a footer, a legal-link region, or a persistent header language shortcut; language selection is reached only through Settings.

#### Routes, navigation, and home

- **FR-007**: The foundation MUST define the initial top-level destinations as Home (the default route) and Settings, and no other top-level destination. Settings MUST be limited to the English/Spanish language preference, a brief read-only description of its purpose, and a localized notice that the preference is stored only in this browser and may be lost if browser storage is cleared or the device changes; it MUST NOT display application version, environment, or other diagnostic information, and it MUST NOT introduce entertainment business functionality.
- **FR-008**: Every navigation link, brand link, recovery action, and other visible control in the foundation MUST resolve to an existing route or perform its stated action. No dead links or non-functional calls to action may be presented.
- **FR-009**: Unknown paths, including unknown nested paths, MUST show a not-found page inside the application shell. The not-found page MUST explain that the requested page does not exist, MUST offer a working home action, and MUST NOT redirect in a loop.
- **FR-010**: Route changes MUST update the address and the localized document title, MUST support browser back and forward, and MUST support opening any initial route through a direct address. On an in-app route change, focus MUST move to the page-level heading and the change MUST be announced once to assistive technology. On a first direct-address load, focus MUST remain at the document start so the skip link remains the first Tab stop, and the page MUST NOT move focus to the heading.
- **FR-011**: The home route MUST present a clearly labeled placeholder or empty state that identifies Walplay and explains its entertainment discovery purpose. It MUST comply with the content prohibitions in FR-044 and MUST NOT contain calls to action that do not work.

#### Page states

- **FR-012**: A route-loading state MUST be genuinely observable on the first navigation to each destination, produced by preparing that destination's content on demand rather than by an artificial delay, and MUST use a placeholder that matches the final layout closely enough to avoid a visible content jump. It MUST expose a busy state to assistive technology, hide decorative placeholder shapes from assistive technology, announce completion or failure, and MUST NOT rely on a spinner or a bare "Loading" message as its only indication.
- **FR-013**: A route-load failure or unexpected rendering failure MUST show a localized, safe error state with a retry action when retrying is meaningful and a home action always; the retry action MUST genuinely re-attempt the failed route preparation. It MUST NOT expose stack traces, internal identifiers, provider details, or raw technical messages.
- **FR-014**: An empty state MUST explain why the area is empty. It MUST offer a call to action only when that action is functional; otherwise it MUST omit the action.
- **FR-015**: Any foundation action that changes visible state, including a language change, MUST provide confirmation that is perceptible both visually and to assistive technology.
- **FR-016**: Error states MUST be announced as alerts; loading and non-error status changes MUST be announced politely. Announcements MUST occur once per change and MUST NOT leave stale text in the previous language.

#### Internationalization and localization

- **FR-017**: All user-facing interface text MUST be externalized from interface code, including navigation labels, page headings, descriptions, button and link labels, state messages, document titles, language names, and accessibility labels and descriptions.
- **FR-018**: English and Spanish resources MUST be complete for every key used by the foundation. English is the canonical source and fallback language. A missing Spanish entry MUST fall back to English without crashing and without displaying a raw key or a blank.
- **FR-019**: The Settings page MUST provide a language choice between English and Spanish. Changing the language MUST update all visible interface text, the document language, page titles, and accessibility announcements without a full page reload, within one second.
- **FR-020**: The selected language preference MUST persist across reloads through browser-local persistence. It MUST be validated when read. An invalid, missing, outdated, or unreadable value MUST fall back safely, MUST NOT crash the application, and MUST NOT prevent the visitor from switching languages for the current session. The Settings page MUST show the localized storage notice required by FR-007.
- **FR-021**: On a first visit with no stored preference, the interface MUST start in the first supported language preferred by the browser, matching by base language subtag so that any `es-*` locale selects Spanish and any `en-*` locale selects English, and falling back to English only when no supported base language is preferred.
- **FR-022**: No dates, numbers, pluralized counts, or interpolated values are displayed by the foundation. When any surface introduces them, it MUST use locale-aware `Intl` formatting and i18next pluralization/interpolation rather than hardcoded formats or ad hoc string concatenation.
- **FR-023**: The language control MUST have a meaningful accessible name, MUST indicate the current selection, MUST name each option in its own language, and MUST announce a completed change politely.

#### Accessibility and inclusive interaction

- **FR-024**: All initial routes and states MUST meet WCAG 2.2 Level AA. Automated accessibility evaluation MUST report no critical or serious violations, and manual keyboard and screen-reader checks MUST pass for the primary navigation journey. Visual contrast and non-color cue specifics are defined in FR-030.
- **FR-025**: Every essential function MUST be operable by keyboard with a logical focus order, no keyboard trap, and a visible focus indicator of at least a 2-pixel outline or equivalent ring with a 2-pixel offset. Focus MUST return to the invoking control when a menu closes.
- **FR-026**: The shell MUST expose a header landmark, a labeled navigation landmark, a main content landmark, and one page-level heading. The compact menu control MUST have a meaningful name and expose whether it is expanded. Decorative icons and marks MUST be hidden from assistive technology.
- **FR-027**: The first focusable element MUST be a skip link that becomes visible on focus and moves focus to the main content.
- **FR-028**: Interactive targets MUST be at least 24 by 24 CSS pixels. Primary controls and navigation destinations MUST be at least 44 by 44 CSS pixels.
- **FR-029**: Motion MUST be minimal and MUST respect the visitor's reduced-motion preference. State changes and navigation MUST remain understandable when animation is reduced, and transitions MUST NOT animate layout-affecting properties in a way that visibly shifts content.
- **FR-030**: Contrast and interface-element accessibility are governed by FR-024. Additionally, the canvas MUST NOT be pure black. Status, category, and current-destination meaning MUST NOT rely on color alone. The dark appearance is the only approved theme.
- **FR-031**: The interface MUST remain usable at 200% browser zoom and with enlarged text, without loss of content or function and without horizontal page scrolling.

#### Visual identity and shared UI foundations

- **FR-032**: Interface color, typography, spacing, and shape MUST come from the shared design foundations adopted from the Walday design system and restricted to Walplay's approved semantic set. Interface elements MUST NOT contain raw color values outside the shared design definitions.
- **FR-033**: Typography MUST use the shared Inter-based hierarchy of display, title, body, and caption, with consistent weights and a self-hosted font. Cards and list-like rows MUST use the shared 16-pixel radius, controls MUST use the shared 8-pixel radius, and status pills MUST be fully rounded. Surface separation MUST be expressed with borders before shadows.
- **FR-034**: The Walplay logo MUST preserve the shared W monogram geometry exactly, use token-driven mint for the mark, render `Walplay` as live text in the shared wordmark style, keep the monogram decorative, and MUST NOT be recolored per state, animated, rasterized, or loaded from an external image.
- **FR-035**: Shared interface foundations MUST be reusable and presentation-only. They MUST NOT fetch data, contain entertainment business rules, or depend on a specific feature module. The foundation MUST provide the shared brand lockup, navigation, page container, button and link treatments, skip link, empty state, error state, loading state, and language control.
- **FR-036**: The application layout, feature content, and shared interface foundations MUST remain clearly separated. The shell MUST NOT contain feature-specific entertainment content, and adding or replacing a feature page MUST NOT require restructuring the shared brand, navigation, or state foundations.
- **FR-037**: The visual identity MUST be recognizably part of the Wal family and consistent with the Walday Dark UI direction while using Walplay naming and branding. Walday-specific product content or features, including weather, tasks, commitments, and daily planning, MUST NOT appear.

#### Configuration and environment handling

- **FR-038**: Application configuration MUST be validated at startup. When a required value is missing or invalid, the application MUST fail fast and show a safe, localized configuration error that exposes no secrets or internal identifiers.
- **FR-039**: Only public, non-sensitive configuration values may be available to the browser. Secrets, credentials, and private provider keys MUST NOT be shipped to the client.
- **FR-040**: A documented configuration inventory MUST list every supported value, whether it is required or optional, its documented default, and a safe local example. The inventory MUST be limited to one required public environment name and one optional public application version. The environment name MUST be validated against `local`, `development`, `staging`, and `production` at startup; the application version uses its documented default when absent and is not shown in the interface. Environment-specific values MUST be changeable without editing application logic, and the foundation MUST require no entertainment provider credentials, backend endpoint, or other secret.
- **FR-041**: When an optional configuration value is missing, empty, or invalid, the application MUST use the documented default and produce a developer-visible warning that contains no secret and no unnecessary personal data. The visitor-facing experience MUST remain unchanged.

#### Scope boundaries

- **FR-042**: The foundation MUST NOT introduce a movie or television catalog, search, discovery, streaming availability, watchlists, favorites, trailers, user accounts, authentication, live television, video playback, notifications, recommendations, personal ratings, social features, database schemas, or external content-provider integrations.
- **FR-043**: The foundation MUST be usable without signing in and MUST NOT depend on server data, a database, or an entertainment provider to render its initial routes.
- **FR-044**: The foundation MUST NOT contain invented entertainment titles, artwork, availability, ratings, reviews, or promotional claims, and it MUST NOT place third-party entertainment content or tracking scripts.
- **FR-045**: The foundation MUST NOT add functionality beyond the application shell, global navigation, home placeholder, Settings language control, page states, shared UI foundations, configuration handling, accessibility, and internationalization described in this specification.

### Key Entities *(include if feature involves data)*

- **Supported Locale**: A language the interface can present. Attributes: locale code (`en`, `es`), endonym used in the language control, text direction, and whether it is the canonical fallback. A browser locale matches a supported locale by its base language subtag, so `es-MX` and `es-419` match `es`, and `en-GB` matches `en`. The foundation supports English and Spanish and must allow additional locales without changing the shell structure.
- **Language Preference**: The visitor's selected locale and how it was established. Attributes: selected locale, origin (explicit visitor choice or default detection), persistence state (stored, absent, invalid, or unavailable), and current session value. It is stored only in the browser for this foundation.
- **Application Route**: A navigable destination in the foundation. Attributes: path, localized page title, page kind (home, settings, not-found), navigation visibility, and whether it is the default route.
- **Application Configuration**: The validated set of values required for the application to start. Attributes: environment name (required, restricted to `local`, `development`, `staging`, and `production`), public application version (optional, documented default, never shown in the interface), validity state, and a documented safe local example per value. Configuration contains no secrets, backend endpoints, or provider credentials in the browser-facing set.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any initial route, a visitor can reach any other initial route in at most one navigation action, and 100% of visible navigation and recovery targets resolve to a working destination in testing.
- **SC-002**: At 360, 768, 1024, and 1440 pixel widths and at 200% zoom, every initial route shows zero horizontal page scrolling and zero clipped or overlapping essential content.
- **SC-003**: 100% of essential navigation, compact-menu, skip-link, and language-selection tasks are completed keyboard-only, with a visible focus indicator present at every step.
- **SC-004**: Automated accessibility evaluation reports zero critical or serious violations on every initial route and state, and a manual screen-reader check confirms meaningful names, current-destination state, menu state, and route announcements.
- **SC-005**: 100% of visible interface text is available in English and Spanish, and a language change completes in under one second without a page reload.
- **SC-006**: A selected language persists across 100% of reloads when browser storage is available, and invalid, missing, or unavailable storage causes zero startup failures.
- **SC-007**: 100% of unknown addresses tested, including nested addresses, show the not-found experience with a working home action, and zero raw technical details are exposed.
- **SC-008**: Primary content is visible within 2.5 seconds on a typical mobile broadband connection, and completing a route-loading state produces no visible jump of the main content.
- **SC-009**: 100% of loading states use layout-matching placeholders, announce busy and completion states, and avoid spinner-only or bare loading text as the sole indication.
- **SC-010**: A scope audit finds zero catalog, search, availability, watchlist, account, playback, provider-integration, database, or other out-of-scope capabilities, and zero fabricated entertainment content.
- **SC-011**: 100% of supported configuration values are documented with required or optional status and defaults; missing or invalid required values are detected at startup and produce a safe visitor-facing message with zero secret exposure.
- **SC-012**: Visual review confirms 100% of interface color, typography, spacing, and radius decisions come from the shared foundations, and the exact Walplay brand lockup contract is present with zero Walday product features.

## Assumptions

- The initial top-level destinations are Home (the default route) and Settings. Settings exists only to host the required language preference, a brief description of its purpose, and the localized local-storage notice; it is not a product feature area.
- The application is a responsive web experience with no footer, legal-link region, or persistent header language shortcut. Adding any of these later requires a specification change to the shell contract but not a restructure of the brand, navigation, or state foundations.
- The deployment environment can serve the application for direct addresses to the initial routes. Only the in-application not-found experience is guaranteed by this specification; host rewriting, fallback configuration, and server response status are documented deployment dependencies and are not delivered by the foundation. If a host does not rewrite unknown or nested paths to the application, the in-application not-found experience still applies after the application loads.
- English is the canonical fallback. On a first visit, the supported browser preference is honored before falling back to English.
- The dark appearance is the only theme. No light theme, theme switch, or system-theme override is introduced.
- No authentication, account model, database, backend data, or entertainment provider is introduced. The foundation renders without network data.
- The supported browser baseline is the latest two major versions of the current major desktop browsers and current mobile browsers. Offline mode, installable application behavior, and operation without JavaScript are out of scope for the foundation.
- Language preference is local to the browser and is not synchronized across devices.
- The product name `Walplay` is a brand name and is not translated. Other interface text is fully localized.
- The home page intentionally contains a placeholder or empty state rather than sample entertainment content. This is a deliberate foundation decision, not an unfinished catalog.
- The foundation may record the language preference locally. No analytics, advertising, or tracking beyond that preference is introduced.

## Resolved Decisions

The decisions previously recorded as unresolved are now confirmed and are reflected in the requirements, acceptance scenarios, and assumptions above.

- **RD-01 — Initial destinations**: Home (default) plus Settings; Settings contains only the language preference and a short purpose description.
- **RD-02 — First-visit language**: The first visit honors the supported browser preference, matching by base language, then falls back to English.
- **RD-03 — Direct-address not-found semantics**: Only the in-application not-found experience is guaranteed; host rewriting and server response status are a documented deployment dependency outside this foundation.
- **RD-04 — Settings content beyond language**: Settings does not expose application version, environment, or other diagnostic information.
- **RD-05 — Optional shell regions**: No footer, legal links, or persistent header language shortcut; language selection lives only in Settings.
