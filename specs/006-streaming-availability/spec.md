# Feature Specification: Streaming Availability

**Feature Branch**: `feat/006-streaming-availability`

**Created**: 2026-11-23

**Status**: Draft

**Input**: Define a streaming-availability experience that lets visitors see where a movie or TV show can be legally watched in an explicitly identified region, distinguishing subscription, free, ad-supported, rental, and purchase options supplied by an authorized availability source, with provider names and permitted logos, freshness and staleness disclosure, honest handling of missing or incomplete data, authorized external destinations, resilient failure behavior, and integration into existing entertainment detail pages. Playback, subscription management, geographic-restriction bypass, and Live TV are out of scope.

## Clarifications

### Session 2026-11-23

- Q: Which availability source should the MVP plan against? → A: TMDB's watch-provider capability is the initial source for planning, subject to legal, attribution, and Colombia coverage validation, behind a provider-neutral boundary.
- Q: Should the initial release let visitors change the availability region, or show Colombia only? → A: Include a manual region selector with Colombia as the default and remember the choice on the device; no automatic geolocation.
- Q: What external destination should the availability section offer in the initial release? → A: One aggregate source-supplied external availability page, clearly labeled; do not invent or require per-provider links in the initial release.
- Q: When the source provides no freshness timestamp, should the section always show when Walplay checked the data? → A: Yes. Always show a clearly labeled Walplay check time; never claim source freshness.
- Q: How long may last-known availability be shown after the source fails or the data ages? → A: At most seven days; after that, show the source-error state instead of last-known offers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See where a title can be watched (Priority: P1)

A visitor viewing a movie or TV show detail page wants to know where the title can be watched. The visitor finds a clearly labeled availability section that names the region, groups the available services by how they offer the title, and identifies each service by name and, when permitted, by logo. The visitor can tell whether an option is included with a subscription, free, available to rent, or available to buy, and can distinguish ad-supported free offers when that category is in scope.

**Why this priority**: This is the core value of the feature. Without a trustworthy, understandable view of where a title may be watched, no other availability behavior matters.

**Independent Test**: Open detail pages for controlled movie and TV samples in Colombia with known offers, and verify that the section appears in the detail page, states the region, shows the correct category groups and providers in source order, identifies each category in text, and never presents playback controls.

**Acceptance Scenarios**:

1. **Given** a movie detail page and a successful availability response containing subscription and rental offers in Colombia, **When** the page renders, **Then** a localized availability section appears in the detail page, states Colombia in text, and shows the subscription and rental groups with the correct provider names.
2. **Given** a TV show detail page, **When** the availability section renders, **Then** it uses the same region, category, provider, and limitation rules as the movie experience and does not present episode or season controls.
3. **Given** a provider that appears in both rental and purchase results, **When** the section renders, **Then** that provider appears in both groups and neither group implies the other.
4. **Given** a provider supplied without a usable logo, **When** it is displayed, **Then** its name is still shown and no broken image or blank logo placeholder appears.
5. **Given** the availability section, **When** the visitor reviews it, **Then** no control starts playback, opens a player, downloads content, or creates a subscription, rental, or purchase.
6. **Given** an availability response with offers, **When** the section renders, **Then** the offers appear in the order supplied by the source and Walplay does not re-rank, advertise, or promote a provider.

---

### User Story 2 - Trust the region and the limits of the information (Priority: P1)

A visitor needs to know which country the results describe and how current they are. The interface always identifies the active region, never silently assumes a region from the visitor's network or language, distinguishes current results from last-known results, and explains that availability is informational rather than a guarantee.

**Why this priority**: Availability is meaningless or misleading without regional context. The product's core promise is honest information, not a claim that a title is definitely watchable.

**Independent Test**: Load the availability surface with controlled data for several regions, change the active region, simulate fresh and stale data, and verify that the region is always stated in text, previous-region offers disappear, freshness is labeled accurately, and the informational limitation is visible.

**Acceptance Scenarios**:

1. **Given** no previously stored region preference, **When** availability first renders, **Then** Colombia is the active region and is stated in localized text next to the availability content.
2. **Given** an active region of Colombia, **When** the visitor changes the region to another supported country, **Then** the region text and the offers update, and no offer from the Colombian result set remains visible or announced.
3. **Given** a stored region preference, **When** the visitor returns or reloads the page directly, **Then** the stored region is used and displayed.
4. **Given** the availability source supplies a freshness timestamp within the freshness window, **When** the section renders, **Then** the section identifies the information as recently checked and shows the localized date and time.
5. **Given** the availability source supplies no freshness timestamp, **When** the section renders, **Then** no source-freshness claim is invented, and a clearly labeled Walplay check time is shown with the localized date and time.
6. **Given** last-known data older than the freshness window, **When** the section renders, **Then** it is labeled as last-known or possibly outdated, shows the localized last-checked date and time, and is not presented as current.
7. **Given** any availability result, **When** the visitor reads the section, **Then** a visible informational notice explains that availability is region-specific, may change, may depend on plan or eligibility, and is not a guarantee that the title can be watched.

---

### User Story 3 - Understand missing, incomplete, or failed availability data (Priority: P2)

A visitor encounters a title whose availability source has no information, only partial information, or is temporarily failing. The interface explains the situation honestly, never turns missing information into a claim that the title is unavailable, and never lets an availability failure break the rest of the detail page.

**Why this priority**: External availability data is frequently incomplete and can fail. Mishandling these cases would violate the product's honesty promise and could make the detail page unreliable.

**Independent Test**: Load the availability section with no region entry, empty category groups, partial provider data, malformed values, a timeout, a rate-limit response, and a source outage with and without cached data; verify each state is distinct, honest, localized, and isolated to the availability section.

**Acceptance Scenarios**:

1. **Given** a successful response with no offers for the active region, **When** the section renders, **Then** it states that availability information could not be found for that region, explains that this does not prove the title is unavailable, and does not fabricate a provider or category.
2. **Given** a response with subscription offers but unusable rental data, **When** the section renders, **Then** the subscription group is shown, the unusable rental data is omitted, and the remaining detail page is unaffected.
3. **Given** a source failure with no usable cached data, **When** the section renders, **Then** it shows a localized inline error with a retry action, no raw provider error, and the title identity, overview, seasons, cast, and related titles remain usable.
4. **Given** a source failure with usable cached data, **When** the section renders, **Then** the last-known offers are shown with a stale label and a retry action.
5. **Given** a provider record with an empty name, a whitespace-only name, or no usable provider identity, **When** the response is validated, **Then** that offer is dropped and no blank or invented provider appears.
6. **Given** the visitor retries after a failure, **When** the retry is pending, **Then** duplicate concurrent retries are prevented and the section exposes a busy state.
7. **Given** a title that does not resolve, **When** the detail page shows its not-found state, **Then** no availability request result, section, or availability error is presented.
8. **Given** cached availability older than the maximum last-known retention period, **When** the source is unavailable, **Then** the cached offers are not shown and the source-error state is presented.

---

### User Story 4 - Change region and use authorized destinations (Priority: P3)

A visitor who is interested in another country can change the active region, and a visitor who wants more detail can follow an authorized external destination supplied by the availability source. The interface makes clear that the visitor is leaving Walplay, that the destination is not a Walplay player, and that Walplay does not control the destination's content or offers.

**Why this priority**: Region switching makes the feature useful beyond a single market, and authorized destinations complete the decision journey. Both depend on the core availability display and region rules already working.

**Independent Test**: Change the region through the availability section, follow the supplied external destination, and verify its label, leaving notice, destination legitimacy, and return behavior; verify that no per-provider link is invented when the source supplies only an aggregate destination.

**Acceptance Scenarios**:

1. **Given** a supported region selector, **When** the visitor changes the region by keyboard or pointer, **Then** the new region is selected, the change is announced once, and the results correspond to the new region.
2. **Given** an authorized aggregate destination supplied by the source, **When** the visitor activates it, **Then** the interface clearly identifies it as an external availability page, warns that the visitor is leaving Walplay, and opens a legitimate secure destination without navigating the detail page away.
3. **Given** the initial release, **When** the section renders provider entries, **Then** provider entries are not clickable, only the authorized aggregate source page may be linked, and no provider URL is constructed, guessed, or inferred.
4. **Given** the visitor returns from the external destination, **When** the detail page is restored, **Then** the title, active region, and availability state remain available.
5. **Given** a region that the source does not support, **When** it is selected, **Then** no offers are shown for another region, and a localized explanation identifies the region as unsupported.
6. **Given** the visitor changes region while an earlier request is still pending, **When** the earlier response arrives, **Then** it does not replace or mix with the results for the newly selected region.

---

### User Story 5 - Use availability on any device and with assistive technology (Priority: P3)

A visitor using a phone, a keyboard, a screen reader, browser zoom, or the Spanish interface can understand and operate the availability experience. Region, category, provider, freshness, stale, empty, and error information is available in text and is not conveyed by color alone.

**Why this priority**: Availability and region information are core content. Inaccessible or untranslated availability would exclude users from the product's central promise.

**Independent Test**: Exercise the availability section at 360, 768, 1024, and 1440 pixels and at 200 percent zoom, using keyboard only, a screen reader, and both English and Spanish; verify reading order, focus, announcements, contrast, target sizes, wrapping, and complete localization.

**Acceptance Scenarios**:

1. **Given** the availability section, **When** a keyboard user navigates it, **Then** the region control, retry action, and any external destination are reachable in a logical order with a visible focus indicator and no keyboard trap.
2. **Given** a screen reader, **When** the section finishes loading, **Then** the region, each category group, each provider, freshness state, limitations, and external-link warning are exposed without duplicate or stale announcements.
3. **Given** a visitor who cannot perceive color, **When** the section renders, **Then** category, stale, empty, error, and selected-region states remain understandable from text and structure.
4. **Given** a narrow viewport or 200 percent zoom, **When** the section renders, **Then** there is no horizontal page scrolling, clipped control, overlapping content, or lost provider identity.
5. **Given** the Spanish interface, **When** the section renders, **Then** all Walplay-owned labels, category names, states, notices, dates, and announcements are in Spanish, while provider names remain as supplied.
6. **Given** a logo that fails to load, **When** the section renders, **Then** the reserved space does not collapse into a broken image, and the provider remains identifiable by name.

---

### Edge Cases

- The source returns a successful response without the active country entry.
- The source returns the active country with every category empty.
- The source returns only an unsupported or unknown category.
- The source returns the same provider more than once in one category or in several categories.
- A provider name is extremely long, contains non-Latin characters, or is whitespace-only.
- A provider logo reference is missing, malformed, or fails to load.
- The source returns an external destination that is missing, malformed, not secure, or not on the authorized destination.
- The source returns a freshness timestamp in the future or an otherwise invalid timestamp.
- The active region is unsupported, malformed, or no longer available.
- The visitor changes region, title, or interface language while an availability request is pending.
- The source times out, rate-limits, returns malformed data, or is entirely unavailable.
- Cached availability exists for the same title and region but is older than the freshness window.
- Cached availability exists for the same title and region but is older than the maximum last-known retention period.
- Cached availability exists only for a different region or a different title.
- A TV show has title-level availability but the source indicates that availability varies by season or episode.
- A movie detail page and a TV detail page share a numeric identifier but are different titles.
- The visitor opens a detail page directly or reloads it with a stored region.
- The visitor uses 200 percent browser zoom or a very narrow viewport with many providers.

## Requirements *(mandatory)*

### Functional Requirements

#### Integration and scope

- **FR-001**: Availability MUST be presented only within the existing movie and TV show detail destinations. This feature MUST NOT introduce a new top-level navigation destination, a separate availability page, or a parallel detail destination.
- **FR-002**: The availability experience MUST apply to both movies and TV shows and MUST use the title's content type and provider identity to obtain results.
- **FR-003**: The availability information MUST be title-level. It MUST state that offers describe the title and that availability may vary by season or episode where the source indicates variation. Episode-level or season-level availability is not part of this feature.
- **FR-004**: The availability section MUST be a distinct, labeled region of the detail page with a localized heading and a stable in-page location. When the detail page presents its availability entry point, that entry point MUST reveal or move focus to this section and MUST NOT state or imply that the title is available.
- **FR-005**: The availability section MUST be positioned according to the detail feature's information hierarchy and MUST NOT reorder, replace, hide, or duplicate existing detail sections.
- **FR-006**: The availability section MUST load and fail independently of the detail page's primary content and of other secondary sections. Completion, emptiness, staleness, or failure of availability MUST NOT prevent the title identity, overview, seasons, cast, related titles, or existing actions from working.
- **FR-007**: When the availability capability is unavailable, unconfigured, or not authorized, the detail page MUST NOT show an availability section, disabled control, placeholder, explanatory teaser, or "coming soon" message.
- **FR-008**: The availability experience MUST NOT contain playback controls, embedded players, stream URLs, download actions, or any control that reproduces paid streaming content.
- **FR-009**: Availability MUST NOT be inferred from release dates, original language, production country, popularity, catalog section, search origin, or any other metadata. It MUST come only from the availability source.
- **FR-010**: A title that lacks a usable identity or content type MUST NOT trigger availability retrieval or render availability content; the detail page's not-found state governs.

#### Region and regional context

- **FR-011**: Every availability result set MUST have exactly one active region, represented as an ISO 3166-1 alpha-2 country code with a localized country name.
- **FR-012**: The active region MUST be stated in visible text next to the availability content and MUST be repeated in the accessible name or description of the section. Color, a flag icon, or the visitor's interface language MUST NOT be the only indication of region.
- **FR-013**: When no valid stored region preference exists, the active region MUST default to Colombia (`CO`).
- **FR-014**: The visitor MUST be able to change the active region through an accessible single-select control that lists only regions the availability source can serve. The active region MUST be a single visitor-level preference applied to all titles until the visitor changes it.
- **FR-015**: Changing the region MUST update the displayed offers and MUST remove every provider, category, and freshness indication that belongs to the previous region. A previous-region offer MUST NOT remain visible or announced while the new region is active.
- **FR-016**: The region request and response MUST be discarded when the visitor changes the region before that request completes. Only the newest region selection may update the visible section or its announcements.
- **FR-017**: A selected or stored region code that is well-formed but unsupported, or no longer supported, MUST NOT fall back silently to another region. The section MUST show the requested region and MUST present a localized unsupported-region explanation. A malformed, unparseable, or unknown-version stored preference is not a region request: it is treated as absent under FR-013, defaults to Colombia (`CO`), and the invalid entry is removed safely.
- **FR-018**: The active region MUST NOT be inferred silently from the visitor's network address, device locale, interface language, time zone, or metadata language. Automatic region detection is not approved by this specification. If it is introduced later, it MUST be disclosed and the visitor MUST be able to review and change the detected region before availability is shown.
- **FR-019**: The region preference MUST be retained for the visitor's future visits on the same device when storage is available. When storage is unavailable, the preference applies for the current session. Cross-device synchronization is not required and depends on an account model that is not part of this feature.
- **FR-020**: Changing the interface language MUST NOT change the active region or discard availability results. Region names, labels, notices, dates, and announcements MUST localize without requiring the visitor to reselect the region.
- **FR-021**: Region selection and its changes MUST be operable by keyboard and assistive technology, and each change MUST be announced once without duplicate announcements.

#### Categories, providers, and ordering

- **FR-022**: The availability experience MUST distinguish, in localized text, the categories that the source supplies: included with a subscription, free, rent, and buy. When ad-supported availability is in scope and the source explicitly supplies it, it MUST be distinguished as free with ads.
- **FR-023**: Each category MUST have a visible localized label and MUST NOT rely on color, icon shape, or layout position alone to communicate its meaning.
- **FR-024**: A category group MUST appear only when the availability source supplies at least one usable offer for that category in the active region. Walplay MUST NOT infer, cross-map, or fabricate a category.
- **FR-025**: If the source does not explicitly identify an offer as ad-supported, the offer MUST NOT be labeled "free with ads". If the source does not explicitly identify an offer as free, it MUST NOT be labeled "free".
- **FR-026**: A provider that appears in more than one category MUST be shown in each category for which the source supplies it. Appearance in one category MUST NOT imply appearance in another.
- **FR-027**: Duplicate offers for the same provider and category in the same region MUST be collapsed into one provider entry without changing the provider's source order.
- **FR-028**: Each provider entry MUST show the provider name supplied by the source. A logo MUST be shown only when the source supplies a usable reference and display is authorized; otherwise the name alone MUST identify the provider.
- **FR-029**: A provider logo MUST be treated as a third-party brand asset. It MUST NOT be recolored, cropped, distorted, animated, combined with Walplay marks, or used to imply partnership, endorsement, or certification.
- **FR-030**: A provider logo MUST NOT be the sole identifier of the provider. When the provider name is adjacent, the logo MUST be decorative to assistive technology; when it is not adjacent, the logo MUST expose the provider name as its accessible name.
- **FR-031**: Provider entries within a category MUST follow the source-supplied order or display priority. Walplay MUST NOT re-rank, alphabetize, promote, or insert paid placement, and MUST NOT explain the order as a recommendation or quality judgment.
- **FR-032**: When the source supplies no usable order, the section MUST use a stable, deterministic order and MUST NOT imply that it reflects quality or popularity.
- **FR-033**: Source provider identifiers MUST remain internal. Raw identifiers, provider-specific field names, and provider response structures MUST NOT be displayed.
- **FR-034**: Unknown, unsupported, or unmapped category or monetization values MUST be omitted rather than guessed, merged into another category, or displayed as a provider claim.
- **FR-035**: Provider-supplied prices, plan names, quality labels, or promotional claims MUST NOT be displayed unless a separate product and legal decision authorizes them. The section MUST NOT imply that a provider offer is free of conditions, taxes, or eligibility requirements.
- **FR-036**: A provider name MUST be presented as supplied and MUST NOT be translated, corrected, or replaced by a Walplay-authored marketing name.
- **FR-037**: The section MUST NOT describe an availability offer as playable inside Walplay, as owned by Walplay, or as verified by Walplay.

#### Freshness, missing data, and stale data

- **FR-038**: When the availability source supplies a reliable last-updated or freshness timestamp, the section MUST display it in localized date and time format and identify it as source-supplied freshness.
- **FR-039**: When the availability source supplies no freshness timestamp for a successful result set, the section MUST NOT invent a source-freshness claim. It MUST show when Walplay retrieved the information, clearly labeled as when Walplay checked it rather than when the source updated it, with the localized date and time.
- **FR-040**: The section MUST treat data as stale when the applicable timestamp is older than the defined freshness window. In the stale state, it MUST label the offers as last-known or possibly outdated, show the localized date and time, and offer a retry when retry is meaningful.
- **FR-041**: Invalid, malformed, or future-dated freshness timestamps MUST NOT be presented as valid freshness. The section MUST fall back to the observation time with an accurate label or omit the timestamp rather than make an unsupported claim.
- **FR-042**: Stale or last-known offers MUST NOT be presented as current, verified, or guaranteed. Last-known offers MUST NOT be shown when the applicable timestamp is older than the maximum last-known retention period, initially seven days. When no usable cached data exists or the retention limit is exceeded, the section MUST show the source-error state instead of stale offers.
- **FR-043**: Cached availability MUST be scoped to the title identity, content type, and active region. Data for another title or region MUST NOT be reused.
- **FR-044**: A successful response with no usable offers for the active region MUST show a localized no-information state that states that availability information could not be found for that region. A current successful response MUST take precedence over any older cached offers for the same title, content type, and region; cached offers MUST NOT be shown as current when the source has just reported none.
- **FR-045**: The no-information state MUST state that missing information does not prove the title is unavailable, that the title may still be available, and that the visitor may check the source or the provider directly.
- **FR-046**: The absence of a provider, a category, or a country entry MUST NOT be presented as evidence that the title is unavailable, that a provider does not carry the title, or that a category does not exist.
- **FR-047**: When the source supplies only partial or incomplete availability data, the section MUST show the usable groups and MUST NOT fill gaps with inferred providers, categories, regions, or links.
- **FR-048**: Provider names, category values, logo references, region entries, and links that are null, empty, whitespace-only, malformed, or recognizable placeholders MUST be treated as missing. Offers without a usable provider identity MUST be dropped.
- **FR-049**: A failure of one category, provider record, logo, or destination MUST NOT prevent other usable availability content from rendering.

#### Failure, retry, and resilience

- **FR-050**: A source failure with no usable cached data MUST produce a localized inline availability error with a retry action, distinct from the no-information state and from the detail page's not-found state.
- **FR-051**: A source failure with usable cached data MUST show the last-known offers with a stale label and a retry action, unless the applicable timestamp is older than the maximum last-known retention period. The cached data MUST NOT be presented as fresh.
- **FR-052**: Timeouts, rate limits, unavailable services, malformed responses, unauthorized responses, and validation failures MUST map to stable internal availability states and stable machine-readable error codes that the interface localizes.
- **FR-053**: Raw provider errors, status codes, response bodies, stack traces, internal identifiers, and provider field names MUST NOT reach the interface.
- **FR-054**: Retry MUST re-attempt only the availability surface, MUST prevent concurrent duplicate retries, and MUST remain user-initiated or bounded by the integration's retry policy. Repeated failure MUST produce the same stable localized state.
- **FR-055**: Changing the title, content type, region, or interface language MUST prevent an older availability response from altering the visible section or its announcements.
- **FR-056**: An availability failure MUST NOT block personal-list actions or any other detail-page capability that is otherwise available.
- **FR-057**: Availability requests MUST be limited to the selected title, content type, and region. The section MUST NOT preload availability for every region, every provider, or unrelated titles.

#### External destinations and authorization

- **FR-058**: An external destination MUST be shown only when the availability source supplies it and it passes authorization checks for scheme, host, and path. Walplay MUST NOT construct, template, guess, or infer a provider URL or deep link.
- **FR-059**: When the source supplies one aggregate availability destination rather than per-provider destinations, the section MUST present that destination as an external availability source page, not as a specific provider's offer page.
- **FR-060**: Provider entries MUST NOT be individual links in the initial release. A future per-provider link capability requires a separate product and legal decision. A provider name or logo MUST NOT be made clickable through a Walplay-authored URL.
- **FR-061**: Every external destination MUST be labeled in localized text, MUST state that the visitor is leaving Walplay, and MUST expose that warning in its accessible name or description.
- **FR-062**: Activating an external destination MUST NOT navigate the detail page away from its current state. The detail page, active region, and availability results MUST remain available when the visitor returns.
- **FR-063**: Availability external destinations MUST use secure transport and legitimate, authorized hosts. A destination that fails authorization MUST NOT be rendered as a link or replaced with a search engine, redirector, affiliate link, or unverified copy.
- **FR-064**: The section MUST NOT embed, frame, proxy, mirror, transcode, autoplay, or redistribute third-party streams or player content.
- **FR-065**: The section MUST NOT start, complete, or prefill a subscription, rental, purchase, account change, or payment. Any such action requires an explicit action on an authorized external service.
- **FR-066**: The availability experience MUST NOT use affiliate redirects, sponsored placement, or monetized links unless a separate product and legal decision authorizes them and the presentation clearly discloses the relationship.
- **FR-067**: A blocked, failed, or unavailable external destination MUST NOT break the availability section or the detail page, and MUST NOT be presented as evidence of availability or unavailability.

#### Attribution, legal disclosures, and trust

- **FR-068**: The section MUST display the attribution required by the availability source and any underlying data supplier. For the initial source, this includes the required JustWatch attribution and the existing TMDB attribution required by the detail feature.
- **FR-069**: Availability attribution MUST be visible in or adjacent to the availability section without requiring interaction to reveal it. It MUST NOT replace or weaken the detail page's existing provider attribution.
- **FR-070**: The exact attribution wording, logo treatment, and placement MUST follow the current official guidance of the source and data supplier. Walplay MUST NOT improvise, paraphrase into a weaker claim, or remove required attribution.
- **FR-071**: The section MUST include a visible informational notice that availability is not a guarantee; is region-specific; may change without notice; may depend on the visitor's plan, account, payment method, device, or eligibility; and does not grant rights to stream content.
- **FR-072**: The section MUST NOT claim that Walplay owns, verifies, completes, or permanently guarantees provider-supplied availability, provider names, logos, or destinations.
- **FR-073**: The section MUST NOT imply a partnership, endorsement, sponsorship, or certification relationship with a provider, the availability source, or an underlying data supplier beyond the required factual attribution.
- **FR-074**: Provider names and logos MUST be displayed only as permitted by applicable provider and source terms. When logo display is not authorized or cannot be confirmed, the provider name alone MUST be used.
- **FR-075**: The availability experience MUST use only documented and authorized data and destinations. It MUST NOT scrape provider sites, call undocumented or private endpoints, bypass authentication, bypass DRM, bypass geographic restrictions, or use data obtained through such means.
- **FR-076**: The availability experience MUST NOT facilitate or advise circumventing regional restrictions, provider limitations, account requirements, or payment obligations.

#### Presentation, accessibility, and localization

- **FR-077**: The availability section MUST use semantic structure with one localized section heading, a logical heading order beneath the detail page's primary heading, and list or equivalent semantics for categories and providers.
- **FR-078**: The section MUST provide a skeleton loading state that matches the final availability layout closely enough to avoid visible content shift. The skeleton MUST expose a busy state to assistive technology, hide decorative shapes from assistive technology, and MUST NOT rely on a spinner or bare "Loading" text.
- **FR-079**: The skeleton, no-information, stale, error, and success states MUST be visually and semantically distinct. The no-information state MUST NOT be presented as an error, and the error state MUST NOT be presented as proof of unavailability.
- **FR-080**: Every interactive control in the section MUST be keyboard operable in a logical order, MUST have a visible and consistent focus indicator, and MUST NOT create a keyboard trap.
- **FR-081**: Interactive targets MUST meet the design system's minimum target size. Primary controls and row actions MUST meet the larger primary-control target size.
- **FR-082**: The section MUST announce loading completion, no-information, stale, error, region change, and retry outcome through appropriate live regions without duplicate, stale, or conflicting announcements.
- **FR-083**: Category, provider, region, freshness, stale, empty, error, and selected-region information MUST NOT be communicated exclusively through color, hover, icon shape, animation, or visual position. Text MUST carry the meaning.
- **FR-084**: Provider logos MUST reserve their dimensions to avoid layout shift, load lazily when appropriate, and provide the defined text fallback on failure.
- **FR-085**: The section MUST work at 360, 768, 1024, and 1440 pixel widths and at 200 percent browser zoom without horizontal page scrolling, clipped controls, overlapping content, or loss of information.
- **FR-086**: Long provider names and long region names MUST remain identifiable. Truncation MUST NOT be the only way to read the full name, and controls MUST remain usable.
- **FR-087**: Essential text and interface elements in the section MUST meet WCAG 2.2 AA contrast and target-size requirements and MUST remain usable with text resizing and spacing overrides.
- **FR-088**: Decorative motion MUST be minimal and MUST respect the visitor's reduced-motion preference. Availability MUST NOT autoplay media or animate for attention.
- **FR-089**: All Walplay-owned availability text, labels, category names, state messages, notices, attribution text owned by Walplay, dates, times, and accessibility announcements MUST be available in English and Spanish.
- **FR-090**: Missing translations MUST fall back to English and MUST NOT display raw translation keys. Provider names, source-supplied content, and third-party brand names MUST NOT be machine-translated or presented as Walplay-authored copy.
- **FR-091**: Dates, times, and relative freshness statements MUST be formatted for the selected locale and MUST NOT mix localized words with unlocalized numerals or separators.
- **FR-092**: The interface MUST NOT present source-supplied or provider-supplied text as verified, editorial, or Walplay-authored content. Source limitations MUST be stated in Walplay-owned localized text.

#### Provider boundary and operational constraints

- **FR-093**: All availability data MUST be obtained through the application's documented provider boundary on the server. The browser MUST NOT call the availability source directly when a credential, proxy, attribution, or policy requirement applies.
- **FR-094**: Source responses MUST be treated as untrusted input, validated, normalized, and mapped to an internal availability model. Source-specific shapes MUST NOT reach the interface, and invalid records MUST be dropped safely.
- **FR-095**: Source credentials and secrets MUST remain on the server and MUST NOT be exposed to the browser.
- **FR-096**: Availability requests MUST use explicit timeouts, bounded retries for idempotent reads, and caching with a defined lifetime keyed by the parameters that affect the result, including title, content type, and region.
- **FR-097**: Provider rate limits MUST be respected. The feature MUST NOT generate uncontrolled, unbounded, or speculative availability requests.
- **FR-098**: Availability failures MUST be isolated from unrelated features and MUST NOT propagate through application modules or take down detail, catalog, search, or personal-list behavior.
- **FR-099**: Logs and telemetry for this feature MUST NOT contain secrets, unnecessary personal data, or raw provider payloads. Region preference MUST be treated as limited personal context and MUST NOT be exposed beyond what the feature requires.
- **FR-100**: The feature MUST NOT use undocumented, private, unstable, or unauthorized source operations. Only documented and authorized availability capabilities are permitted.

### Key Entities *(include if feature involves data)*

- **Availability Result Set**: The complete availability outcome for one title identity, content type, and active region. It contains the availability state, usable offers, freshness information, any authorized external destination, and the required attribution. It is the unit rendered by the availability section.
- **Availability Offer**: One provider's offering of the title in one region under one category. Its key attributes are the provider, the category, the active region, and the source-supplied order. It contains no price, plan, quality, or playback guarantee.
- **Availability Provider**: A streaming, rental, purchase, free, or ad-supported service identified by a source identity and a display name, with an optional logo reference. Provider-level destinations are not part of the initial release. Provider names are not translated by Walplay.
- **Region**: The country used for availability results, identified by an ISO 3166-1 alpha-2 code, a localized display name, and whether the source can serve it. Colombia is the initial default market.
- **Freshness Record**: The time basis for the result set. It distinguishes source-supplied freshness from Walplay's observation time when the source supplies none, determines whether the result set is current or stale, and enforces the maximum last-known retention period.
- **Authorized Destination**: An external URL supplied by the source for additional availability information, with its authorization status, host, and display label. In the initial release this is one aggregate source page; per-provider destinations are not included. It is never a Walplay-constructed provider link or a stream.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 percent of tested availability result sets, the active region is stated in visible text adjacent to the availability content and is exposed to assistive technology.
- **SC-002**: In a controlled test matrix of no-region-entry, empty-category, and partial-data responses, zero availability surfaces state or imply that the title is unavailable.
- **SC-003**: At least 90 percent of usability-test participants correctly identify whether a controlled title is offered by subscription, for free, for rent, or for purchase within 30 seconds.
- **SC-004**: At least 90 percent of usability-test participants correctly explain that a no-information result means the information could not be found, not that the title is unavailable.
- **SC-005**: In 100 percent of tested stale or last-known cases, the surface displays a localized last-known label and the applicable date and time, and does not present the data as current.
- **SC-006**: In 100 percent of tested source-failure cases, the core movie or TV detail page remains usable and the availability section shows a localized error or stale state with a retry where retry is meaningful.
- **SC-007**: After a region change, zero offers belonging to the previously active region remain visible or announced in the tested region matrix.
- **SC-008**: In 100 percent of tested external-destination cases, only secure, authorized destinations are rendered as links, and every rendered link states that the visitor is leaving Walplay.
- **SC-009**: In 100 percent of tested availability surfaces, the required source and metadata attribution is visible without interaction.
- **SC-010**: A scope audit finds zero playback controls, embedded players, stream URLs, download actions, subscription or purchase transactions, geographic-restriction bypass, or undocumented data access.
- **SC-011**: Keyboard-only and screen-reader checks for the availability section pass for region selection, retry, external destinations, provider reading order, and state announcements, with zero critical accessibility violations on the critical journey.
- **SC-012**: The availability section passes the supported viewport and 200 percent zoom checks with no horizontal page scrolling, clipped controls, or lost provider identity.
- **SC-013**: English and Spanish checks find complete Walplay-owned availability copy, zero raw translation keys, and provider names displayed as supplied.
- **SC-014**: In a controlled freshness matrix, 100 percent of valid source timestamps, absent timestamps, stale records, and invalid timestamps are labeled according to their actual meaning; when no source timestamp exists, a labeled Walplay check time is always shown and no fabricated source-freshness claim appears.
- **SC-015**: In 100 percent of tested invalid or unusable provider records, the record is omitted and no blank, invented, or misclassified provider or category appears.
- **SC-016**: In 100 percent of tested cases where cached availability exceeds the seven-day last-known retention period, the offers are not shown and the source-error state is presented.

## Assumptions

- **Initial source**: TMDB's official watch-provider capability, which is powered by JustWatch, is the selected initial availability source for planning because TMDB is already the approved metadata provider. Public release remains gated by confirmed terms, attribution, logo permissions, and a representative Colombia coverage validation. The provider-neutral boundary remains mandatory.
- **Initial market**: Colombia (`CO`) is the initial market and the default active region, as directed by the feature request. The Product Overview does not establish a different initial market. Coverage and completeness for Colombia are not assumed.
- **Region choice**: The active region is a single visitor-level preference applied to all titles until the visitor changes it. A manual region selector defaults to Colombia (`CO`) and the choice is remembered on the same device when storage is available; without storage it applies for the current session. Automatic network or locale geolocation is not used. Travel and relocation are handled by manually changing the region. This resolves Product Overview OD-12 for this feature and should be recorded there.
- **Scope of availability**: Availability is title-level for both movies and TV shows. Season-level and episode-level availability are not included, even when the source may contain episode-level data elsewhere.
- **Placement**: Availability is a secondary section within the existing detail destination. It does not create a separate availability route, page, or navigation entry. The detail feature's existing availability entry point, when rendered, targets this section and does not promise availability.
- **Category mapping**: The feature assumes the source can distinguish subscription, free, rental, and purchase availability, and can identify ad-supported availability when that category is in scope. The initial source's official examples show `flatrate`, `free`, `ads`, `rent`, and `buy` groups. Unknown or unsupported values are omitted.
- **Ordering**: Source-supplied order is treated as the display order. Walplay does not re-rank or monetize the order.
- **Freshness**: The source's response shape reviewed for the initial source does not include a last-updated field. When no source timestamp exists for a successful result set, the section MUST show a clearly labeled Walplay check time with the localized date and time. The initial freshness window is 24 hours. Last-known availability is retained and shown for at most seven days from the applicable timestamp; after that, the source-error state is shown. These values may be tuned in planning without changing the behavior contract.
- **Logos**: The initial source supplies logo references, but separate per-provider trademark permissions are not confirmed by the reviewed documentation. Logos are shown only when display is authorized; otherwise provider names alone are used.
- **External destinations**: The initial source supplies one aggregate availability page link per region, not full per-provider deep links. The initial release allows one aggregate source-supplied external destination and no per-provider links. This resolves Product Overview OD-04 for this feature. Any future per-provider link capability requires a separate product and legal decision.
- **Attribution**: The initial source requires JustWatch attribution, and the existing TMDB attribution remains required. Exact wording, logo treatment, and placement must follow current official guidance and legal review.
- **Commercial terms**: TMDB describes free use for non-commercial purposes with attribution and requires a commercial license for commercial use. Walplay's commercial classification and licensing are not resolved. This specification does not authorize production use beyond confirmed terms.
- **Legal review**: Provider terms, attribution, logo display, caching, the aggregate link authorization, and regional coverage remain release dependencies. A requirement that depends on an unresolved authorization must be gated rather than delivered with an improvised treatment.
- **No pricing**: Provider prices, plan eligibility, promotions, and quality tiers are not displayed. The section describes categories only.
- **No persistence expansion**: Availability results are not added to the personal watchlist, watched status, or recommendation model by this feature. Region preference is the only visitor-level preference introduced.
- **Performance**: Standard web application expectations apply. The specification does not guarantee a numeric latency target beyond avoiding avoidable layout shift, request waterfalls, and repeated identical requests.
- **Request sequencing**: The availability request starts only after the core detail successfully resolves. This identity gate implements FR-010 and User Story 3 scenario 7 (a title that does not resolve issues no availability request). "Load and fail independently" in FR-006 means availability failure is isolated from the detail content; it does not require the availability request to precede the identity gate.
- **Availability entry point**: This feature introduces no new entry point. FR-004's entry-point clause applies only when the detail page renders feature 004's availability entry point, which does not exist yet and remains subject to feature 004's open decision OD-D2.
- **Informational notice scope**: The FR-071 notice is shown in the available, no-information, unsupported-region, and stale states. The error state is governed by FR-050 and shows the availability-specific error copy with retry instead.
- **Season variation wording**: The initial source supplies no season- or episode-level variation indicator, so the conditional FR-003 statement about variation is dormant. If a future source supplies such an indicator, the statement becomes required.
- **Freshness display**: When a valid source timestamp exists, the section displays source-supplied freshness. The clearly labeled Walplay check time is mandatory when the source supplies no timestamp; displaying both is permitted but not required. No source-freshness claim is made without a source timestamp.

## Provider Research and Decision Status

This section distinguishes capabilities confirmed from current official documentation, product assumptions, and unresolved provider decisions. It records TMDB's watch-provider capability as the initial source for planning while keeping the availability source replaceable. Research was performed on 2026-11-23. Evidence is recorded in Appendix A.

### Confirmed capabilities of the initial source

- TMDB's official API documents watch-provider operations for both movies and TV shows.
- Results are grouped by country, and the official examples include Colombia (`CO`) with usable offers.
- The reviewed response examples include `flatrate`, `free`, `ads`, `rent`, and `buy` offer groups. The prose describes streaming, rental, and purchase availability per country and provider.
- Provider records in the official examples include a provider identifier, provider name, logo path, and display priority. Each country entry includes one aggregate link to a TMDB watch page with a locale parameter.
- The data is powered by JustWatch. The official documentation states that JustWatch attribution is required and that access may be revoked for non-compliance.
- The documentation states that the operation does not return full deep links; it returns enough information to display what is available where and directs integrators to the supplied TMDB URL for the actual deep links.
- The reviewed response shape contains no last-updated or freshness timestamp.
- TMDB's FAQ states that the API is free for non-commercial use with attribution, requires a commercial license for commercial use, provides no SLA, and may change over time.

### Confirmed limitations and unresolved evidence

- The official examples demonstrate that Colombia is represented but do not establish complete or accurate Colombian coverage for every title or provider. Coverage completeness must be validated with a representative sample before release.
- The reviewed documentation does not publish a per-provider deep-link capability. Per-provider official destinations are therefore not assumed.
- The reviewed documentation does not specify per-provider logo-display permissions beyond supplying logo paths. Trademark and brand-use review remains required.
- The exact required JustWatch attribution wording, logo treatment, and placement were not found in the reviewed API reference. They must be confirmed from current official guidance before release.
- TMDB's full API terms page could not be retrieved during this research. The FAQ and API reference are treated as evidence, not as a substitute for legal review of the complete terms.
- The reviewed response shape implies no data freshness guarantee. The age of the underlying JustWatch data cannot be determined from the response.
- The initial source's regional availability may change without notice. No completeness, freshness, or continuity claim is made.

### Source comparison

| Option | Confirmed basis | Trade-offs and unresolved points |
|---|---|---|
| TMDB watch providers (JustWatch data) | Official movie and TV operations; country-grouped offers; Colombia observed; category groups; aggregate link; JustWatch attribution; selected initial source for planning; free non-commercial tier; already the approved metadata provider. | No per-provider deep links; no freshness timestamp; Colombia completeness unverified; exact JustWatch and logo attribution treatment unconfirmed; commercial licensing unresolved; coverage and accuracy unknown. |
| JustWatch direct partner API | JustWatch is the underlying data supplier for the initial source. A direct commercial data relationship is a plausible alternative but could not be verified during this research. | Partner site and public API documentation could not be retrieved. API shape, coverage, pricing, freshness, deep-link rights, attribution, and contract terms are unverified. Do not assume capability or cost. |
| Watchmode | Official site states 436 services across 54 countries including Colombia; subscription, free, rent, and buy sources; provider links and deeplinks; daily updates and change endpoints; TMDB ID mapping; free developer plan with 2,500 monthly credits, 3 countries, non-commercial use with attribution; paid Startup plan at $349/month for commercial use and 54 countries. | New vendor and cost; plan-dependent links and coverage; TMDB ID mapping required; separate legal review of terms and attribution; freshness depends on daily refresh; no commitment without validation. |
| Other aggregators and marketplace APIs | Some availability aggregators exist through marketplace APIs. | Not evaluated in this research. Reliability, Colombia coverage, licensing, freshness, link rights, and cost are unknown. They must not be treated as viable without the same validation. |

### Recommendation and decision status

- **Bottom line**: TMDB's official watch-provider capability is the selected initial source for planning. It is sufficient for the minimum product display of where a title is available by region and category, including Colombia, provider names and permitted logos, and one aggregate source-supplied destination. It is not sufficient on its own for source-level freshness, per-provider official deep links, or proven Colombian completeness.
- **When another provider is required**: If the product requires per-provider official destinations, source-level freshness, or validated coverage beyond TMDB's demonstrated capability, an additional provider is required. Watchmode and a JustWatch direct relationship are the evaluated candidates, subject to the validation and licensing work recorded here.
- **Recommended next step**: Proceed with TMDB's watch-provider capability for planning while validating Colombia with a representative title and provider sample, including coverage, category correctness, freshness lag, and attribution requirements.
- **Initial source decision**: TMDB is selected for planning, but public release remains gated by confirmed terms, required JustWatch and TMDB attribution treatment, per-provider logo permissions, Colombian coverage validation, and authorization of the aggregate source destination. If per-provider deep links, stronger freshness, or better Colombian coverage become mandatory, Watchmode or a JustWatch direct relationship must be evaluated before changing the source.
- **Provider-neutral contract**: Requirements in this specification describe the availability source, not a specific payload. This allows the source to be replaced without changing user-visible behavior.
- **Release gate**: The feature must remain disabled or omit availability where a required authorization, attribution treatment, logo permission, link authorization, or coverage validation is unresolved.

## Legal and Product Constraints

- Availability information is informational only and MUST NOT be presented as a guarantee that a title can be watched at a given time, in a given region, on a given plan, or through a given provider. This implements Product Overview BR-01.
- Region restrictions and known inaccuracies MUST be communicated accurately. Region-specific results MUST NOT imply global availability. This implements BR-02.
- Only documented and authorized mechanisms are permitted. Scraping, reverse engineering, undocumented endpoints, DRM circumvention, authentication bypass, and geographic-restriction bypass are prohibited. This implements BR-03.
- Provider and data-supplier attribution, licensing terms, and usage restrictions MUST be honored. This implements BR-04.
- Provider failures MUST map to stable internal states, and unavailable or stale data MUST be labeled. Raw provider errors MUST NOT reach the user. This implements BR-05.
- Personal-list and watched-status behavior MUST remain usable when availability fails. This implements BR-06.
- Availability MUST NOT be described as playback. Walplay MUST NOT imply that a title can be played inside Walplay unless an authorized playback capability exists. This implements BR-07.
- Walplay MUST NOT automatically start playback, create a subscription, rent, purchase, or change a provider account. This implements BR-09.
- Walplay MUST NOT claim ownership, editorial control, completeness, or permanent accuracy for provider-supplied availability, names, logos, or destinations. This implements BR-12.
- The availability experience MUST NOT use artificial urgency, false scarcity, autoplay, sponsored ranking, or other dark patterns. This implements BR-13.
- Displaying availability information does not grant Walplay or the visitor rights to stream content.
- Third-party streams MUST NOT be embedded, proxied, mirrored, transcribed, or redistributed without explicit authorization.
- External destinations MUST point only to legitimate, authorized destinations. Publicly accessible URLs are not automatically authorized.
- Provider logos and names MUST be used only as permitted. A logo reference supplied by a data source is not, by itself, proof of trademark or brand-display permission.
- TMDB's watch-provider capability is the initial source for planning. Public release remains contingent on confirmed terms, attribution, logo permissions, and Colombian coverage validation.
- The initial release links only to the aggregate source-supplied availability page. Provider names and logos are not individual links, and no provider URL may be constructed or inferred.
- Availability data MUST NOT be presented as current when its freshness is unknown or its age exceeds the freshness window.
- Provider credentials and API keys MUST remain on the server.
- Live TV and in-app playback remain deferred capabilities and MUST NOT be implied by this feature.

## Out of Scope

- Reproducing, hosting, streaming, downloading, or redistributing paid or free content.
- Embedded players, playback controls, autoplay, trailers, or deep links that begin playback.
- Managing subscriptions, creating accounts, renting, purchasing, or processing payments with providers.
- Linking a Walplay account to a provider account or reading a visitor's provider subscriptions.
- Live television, linear channels, sports schedules, or TV listings.
- Season-level or episode-level availability.
- Price comparison, plan eligibility, payment-method requirements, taxes, promotions, or quality tiers.
- Availability alerts, notifications, or reminders when a title changes providers.
- Personalized "available on my services" filtering, service selection, or recommendations based on availability.
- Multi-region comparison, travel planning, relocation handling, or VPN and geographic-restriction advice.
- Circumventing regional restrictions, provider limitations, DRM, authentication, or payment obligations.
- Scraping provider catalogs or calling undocumented or private endpoints.
- Affiliate monetization, sponsored provider placement, or paid ranking.
- Public reviews, ratings, or community content about providers.
- Offline mode, PWA synchronization, or native mobile applications.
- Any availability capability that conflicts with the Product Overview or the constitution without an explicit product decision.

## Open Decisions

The table records resolved and unresolved decisions. Unresolved decisions MUST be settled before the dependent behavior ships, or that behavior MUST remain omitted or disabled. Resolved decisions were confirmed on 2026-11-23 and should be reflected in the Product Overview where the Product Overview owns the decision.

| ID | Decision | Status | Impact | Needed from |
|---|---|---|---|---|
| OD-SA1 | Which availability source is used for the initial market (Product Overview OD-03). | Resolved 2026-11-23: TMDB watch providers, subject to release gates. | Determines coverage, category fidelity, freshness, links, cost, and contract obligations. | Release gates: confirmed terms, attribution, logo permissions, and Colombian coverage validation. |
| OD-SA2 | Whether Walplay may link to an aggregate source page, per-provider destinations, or both (Product Overview OD-04). | Resolved 2026-11-23: one aggregate source page only; no per-provider links. | Determines whether the section can offer an external destination and whether provider entries are clickable. | Release gate: aggregate link authorization. Future per-provider links require a separate decision. |
| OD-SA3 | How the active region is determined and how travel or relocation is handled (Product Overview OD-12). | Resolved 2026-11-23: manual selector, Colombia default, device retention, no automatic geolocation. | Determines the region control, default behavior, persistence, and detection policy. | Product Overview OD-12 should record the policy. |
| OD-SA4 | The exact JustWatch and TMDB attribution wording, logo treatment, and placement, plus per-provider logo-display permission. | Open | Determines what attribution and logos may be shown and where. Until confirmed, required attribution is present and unconfirmed logos are omitted in favor of names. | Source guidance, trademark, and legal review. |
| OD-SA5 | Whether Walplay's use is commercial and which TMDB, JustWatch, or other license applies. | Open | Determines whether the feature may launch under a free tier, what it costs, and what usage restrictions apply. | Business, legal, and provider terms review. |
| OD-SA6 | The freshness window, whether Walplay's observation time is shown, and how long last-known data is retained. | Resolved 2026-11-23: 24-hour window, mandatory labeled Walplay check time, seven-day last-known retention. | Determines stale labeling, retry behavior, and retention limits. | The chosen values should be reflected in product documentation. |
| OD-SA7 | Whether Colombian coverage and category accuracy meet the product's honesty bar for the initial release. | Open | Determines whether the initial source is acceptable and whether any provider, category, or title must be excluded. Presence in an official example is not sufficient evidence. | Coverage validation with a representative sample. |
| OD-SA8 | Whether ad-supported availability belongs in the initial category set and how it is labeled. | Open | The initial source's examples include an ad-supported group, but the product wording and MVP inclusion are not settled. The default is to show it only when explicitly supplied and label it "free with ads". | Product decision. |
| OD-SA9 | Whether episode-level or season-level availability will be added later. | Open, but out of scope for this feature | Determines future scope and data needs. It must not be promised by this feature. | Product and provider decision. |
| OD-SA10 | Whether availability may be cached, for how long, and under what storage and refresh constraints. | Resolved 2026-11-23 for product behavior: seven-day last-known retention. Cache lifetime, storage, and refresh mechanics remain plan-level. | Affects stale behavior, provider request volume, and legal compliance. | Provider terms and legal review for cache mechanics. |

## Dependencies

- The feature depends on feature 001's application foundation: shared shell, page container, loading/empty/error state components, design tokens, English and Spanish resources, accessibility conventions, and validated configuration.
- The feature depends on feature 002's type-specific detail destination, provider boundary, error-code conventions, and attribution treatment.
- The feature depends on feature 003's title identity and origin-return behavior for direct, catalog, and search entry. Availability must not change those behaviors.
- The feature depends on feature 004's detail-page information hierarchy, secondary-surface isolation, and availability entry-point contract. This feature supplies the availability section that the detail page's entry point targets when the capability exists.
- The feature depends on the recorded TMDB metadata-provider decision (Product Overview OD-02) and on the initial availability-source decision to use TMDB's watch-provider capability for planning, with release gates.
- The feature depends on legal confirmation of source terms, JustWatch and TMDB attribution, per-provider logo display, caching, and the aggregate outbound link. Per-provider links are not in scope for the initial release.
- The feature depends on the region policy resolved for this feature: manual selection with Colombia as the initial market, applied to all titles, and retained on the same device when storage is available. Product Overview OD-12 should record this policy.
- The feature depends on the account and persistence model only if region preference is later synchronized across devices. This feature requires only same-device retention when storage is available, or session retention otherwise.
- The feature depends on coverage validation for Colombia. The initial source's official examples do not establish complete coverage.
- If a different availability source is selected, the provider-neutral requirements remain valid, but the category mapping, freshness behavior, link behavior, and attribution must be revalidated before release.

## Appendix A — Provider Capability Evidence (verified 2026-11-23, non-normative)

This appendix records the capabilities used to bound this specification. It is evidence from current official documentation, not an implementation instruction and not a substitute for legal review. The full source terms were not all retrievable during this research; unresolved points are recorded in Open Decisions.

| Capability | Documented behavior | Use and limitation |
|---|---|---|
| Movie availability | Official watch-provider operation for a movie, keyed by the movie identifier. | Initial source for movie availability. The operation is documented but does not guarantee coverage or freshness. |
| TV availability | Official watch-provider operation for a TV show, keyed by the series identifier. | Initial source for TV availability. Uses the same regional and category rules as the movie operation. |
| Country grouping | Results are grouped by country code. The official TV example includes `CO` with subscription offers for recognized services. | Supports explicit regional context. Presence in an example does not prove complete Colombian coverage. |
| Offer categories | Official examples include `flatrate`, `free`, `ads`, `rent`, and `buy` groups. Prose describes streaming, rental, and purchase availability per country. | Supports subscription, free, ad-supported, rental, and purchase categories. The product must not infer a category that the source does not supply. |
| Provider metadata | Provider records include provider identifier, provider name, logo path, and display priority. | Supports provider names, optional logos, and source order. Display rights and trademark use require separate confirmation. |
| Aggregate destination | Each country entry includes one link to a TMDB watch page with a locale parameter. Documentation explicitly states that full deep links are not returned. | Supports one aggregate source-supplied external destination. It does not support per-provider destinations or constructed provider URLs. |
| JustWatch attribution | Documentation states that JustWatch attribution is required and access may be revoked for non-compliance. | Requires visible JustWatch attribution. Exact wording and treatment are not specified in the reviewed reference and remain an open decision. |
| TMDB attribution | TMDB's FAQ requires the TMDB logo and the notice that the product uses the TMDB API but is not endorsed or certified by TMDB, with attribution in an About or Credits type section. | Continues the attribution already required by the detail feature. Availability attribution must be additional, not a replacement. |
| Freshness | The reviewed response shape contains no last-updated or staleness field. | No source-freshness claim can be made from this capability. Walplay must show its own check time with an accurate label. |
| Commercial terms | TMDB's FAQ states that the API is free for non-commercial use with attribution, requires a commercial license for commercial use, has no SLA, and may change. | Production use depends on Walplay's commercial classification and confirmed terms. Access may change without notice. |
| Rate limits and availability | TMDB documents that rate limits exist and must be respected, and provides no SLA. | Requires bounded retries, caching, and graceful degradation. Raw rate-limit or provider errors must not reach the user. |
| Colombian coverage | Colombia is present in the official example. No completeness or accuracy guarantee is published. | Must be validated with a representative sample. Absence of an offer must never be treated as proof of unavailability. |
| Alternative source evidence | Watchmode's official site states support for 436 services across 54 countries including Colombia, subscription/free/rent/buy sources, provider links and deeplinks, daily updates, change endpoints, TMDB ID mapping, and tiered free and paid plans. | Establishes a viable alternative for evaluation if the initial source does not meet link, freshness, or coverage needs. It is not approved and its terms require separate review. |
