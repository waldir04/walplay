# Feature Specification: Trailers and Video Content

**Feature Branch**: `feat/008-trailers-video-content`

**Created**: 2026-11-24

**Status**: Draft

**Input**: Let visitors discover and watch official trailers and other authorized promotional videos for a movie or TV show from its existing detail page; identify each video's type, title, source, language, and available metadata; prioritize official trailers when the provider reliably marks them; embed videos only through authorized, documented third-party players where the owner permits it; offer an authorized external viewing option when embedding is unavailable or not allowed; handle unavailable, private, deleted, restricted, and region-limited videos gracefully; provide responsive, accessible, and localized loading, empty, and error states; never start playback automatically with sound; and respect visitor privacy and third-party player requirements. Hosting, downloading, stream extraction, DRM or geographic bypass, and general-purpose video infrastructure are out of scope.

## Clarifications

### Session 2026-11-24

- Q: Does this feature have approval to add in-page trailer playback now, given that the Product Overview defers in-app playback and feature 004 allows trailers only as external links? → A: Approved. Embedded promotional trailer playback is in scope as a capability distinct from playback of the title itself, and the Product Overview and feature 004 must be amended to record that distinction.
- Q: Once the visitor has seen the third-party disclosure, should choosing a different video in the list start it immediately, or only change the selection and require a separate play action? → A: Choosing a listed video is an explicit activation and starts it immediately. No page-load, scroll, hover, focus, or default-selection playback occurs.
- Q: When a title has no eligible promotional video, should the detail page show a trailer section with a localized no-video message, or omit the trailer section entirely? → A: Always show the labeled trailer section with a localized no-video message whenever the trailer capability is enabled.

## Scope Status and Required Document Changes

This feature introduces an in-page promotional video surface for the first time. The product decision to include it is recorded in **Clarifications** (2026-11-24). The two required document amendments were completed on 2026-11-24, and the authorization decisions in **Open Decisions** continue to gate release.

- **Product Overview resolved**: Section 5 records authorized promotional trailers as a conditional capability distinct from deferred in-app playback of the title itself, Section 6 lists the conditional capability, Section 7 records it as a separate conditional journey, BR-11 limits the non-guarantee to title playback and Live TV, and OD-05 points promotional-trailer authorization at this specification. The overview explicitly does not promise trailer availability.
- **Feature 004 resolved**: `specs/004-entertainment-details/spec.md` FR-065 and FR-066 now defer trailer presentation and playback to this specification instead of restating the external-only rule. Embedded playback is the preferred mode where authorized and permitted, and external viewing is the fallback and the alternative. All other feature 004 entry-point rules remain in force.
- **Feature 006 compatibility**: `specs/006-streaming-availability/spec.md` FR-064 forbids the availability section from embedding players. That requirement is unchanged. The trailer surface defined here is a separate section and MUST NOT be merged into, or used to justify playback inside, the availability section.
- **Constitution alignment**: Principle XIV defines conditional media-playback accessibility rules; Principle XX requires documented and authorized mechanisms, forbids scraping, DRM circumvention, authentication bypass, and geographic-restriction bypass, and requires deferred capabilities to be validated before implementation. This specification satisfies those rules by design and depends on the decisions below for legal authorization.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch a trailer without leaving the title (Priority: P1)

A visitor is reading a movie or TV show detail page and wants to see what the title looks like before deciding. The page shows a clearly labeled trailer section with the most relevant promotional video selected. The visitor activates that video and it plays inside the page through the platform's own authorized player, with the platform's controls and branding intact.

**Why this priority**: Watching a trailer at the decision point is the core value of the feature. Without it, the remaining behavior has nothing to organize.

**Independent Test**: Open controlled movie and TV detail pages whose provider inventory contains a playable, embeddable trailer, and verify that the section appears, the expected video is selected first, activation loads the official player in the reserved player area, playback starts only after that activation, and the rest of the detail page remains usable.

**Acceptance Scenarios**:

1. **Given** a movie detail page whose provider inventory contains an embeddable official trailer, **When** the visitor opens the page, **Then** the trailer section is visible with a localized heading and the official trailer is selected by default.
2. **Given** the trailer section with a selected embeddable video, **When** the visitor activates the play control, **Then** the authorized player loads in the reserved area and begins playback, and no second player is created.
3. **Given** a TV show detail page whose provider inventory contains an embeddable trailer, **When** the visitor activates it, **Then** the same trailer experience works and the page identifies the video as belonging to the show.
4. **Given** the visitor is watching an embedded video, **When** the visitor uses the keyboard to reach the player, **Then** the platform's own controls receive focus and remain operable.

---

### User Story 2 - Understand what each video is and where it will play (Priority: P1)

The visitor sees more than one available video and needs to know what each one is before choosing. Each item shows its promotional type, the provider-supplied title, its source platform, and its language, and the interface makes clear whether activating it plays inside Walplay or opens an external destination.

**Why this priority**: A video list without identity, type, and playback mode is not trustworthy. The visitor must not be surprised by leaving the site, and must not mistake a teaser, clip, or featurette for the main trailer.

**Independent Test**: Present a controlled inventory containing a trailer, a teaser, a clip, and a featurette, and verify that each item's type, title, source, language, official status when supplied, and playback mode are stated in visible and accessible text.

**Acceptance Scenarios**:

1. **Given** an inventory with several promotional types, **When** the visitor views the list, **Then** each item states its localized type and its provider-supplied title.
2. **Given** a video that will play in-page, **When** the visitor inspects the item, **Then** the interface states that it plays inside Walplay.
3. **Given** a video that will open externally, **When** the visitor inspects the item, **Then** the interface states that the visitor will leave Walplay and names the destination platform.
4. **Given** a video whose provider record explicitly marks it official, **When** the visitor views it, **Then** the official indication is shown; **Given** a record that does not mark it official or omits the flag, **Then** no official claim is made.
5. **Given** a video whose language differs from the interface language, **When** the visitor views it, **Then** the video's language is labeled in the interface language and the video is not presented as localized.

---

### User Story 3 - Choose among the available videos (Priority: P2)

The visitor wants to compare options. The section presents the official trailer first, then other trailers, then shorter or supplementary promotional material, in a predictable order. The visitor can play any available video from the list, and choosing one replaces the current playback with that video without reloading the page.

**Why this priority**: Titles often have several legitimate videos. Ordering and selection turn a single lucky result into a usable experience, but the feature still delivers value with only one video.

**Independent Test**: Present an inventory with multiple videos, official and unofficial, in mixed languages and types, and verify the ranking, the default selection, that choosing a listed video plays it, that only one player exists at a time, and that the list state is preserved.

**Acceptance Scenarios**:

1. **Given** an inventory with an official trailer, a second trailer, and a featurette, **When** the section renders, **Then** the official trailer is first and selected by default without starting playback.
2. **Given** two official trailers in different languages, **When** the interface language is English or Spanish, **Then** the trailer matching the interface language is preferred, and the other remains available and labeled.
3. **Given** the visitor chooses a different video from the list, **When** the choice is made, **Then** any current playback stops, the previous player is unloaded, the new video's identity is shown, and the new video begins playing, announced once.
4. **Given** the visitor chooses videos in rapid succession, **When** earlier choices resolve late, **Then** only the newest choice is shown and only one player remains loaded.
5. **Given** the visitor has started a video, **When** the interface language changes, **Then** the current playback is not restarted or interrupted.

---

### User Story 4 - Recover when a video cannot be played (Priority: P2)

The visitor chooses a video and discovers it is private, deleted, embedding-disabled, age-restricted, blocked in their region, or blocked by their network. The page explains the situation in plain language, keeps the rest of the section usable, and offers an authorized external destination when one exists.

**Why this priority**: Third-party video availability changes without warning. Without this story, a single unavailable video looks like a broken product.

**Independent Test**: Force each unavailable condition in a controlled player and verify that a localized explanation appears, an external option is offered when authorized, other videos remain selectable, and the detail page is unaffected.

**Acceptance Scenarios**:

1. **Given** the chosen video's owner has disabled embedding, **When** the visitor attempts playback, **Then** the interface explains that the video cannot be played here and offers the authorized external option.
2. **Given** the chosen video is age-restricted and the platform redirects playback to its own site, **When** the visitor attempts playback, **Then** the interface explains the restriction and does not claim the video is broken or deleted.
3. **Given** the selected video is unavailable in the visitor's region, **When** the player reports the failure, **Then** the interface explains the restriction and states that the external destination may be restricted too.
4. **Given** the player fails to load within the configured time, **When** the timeout is reached, **Then** the section shows a localized error with a retry action and unloads the player.
5. **Given** one video in the list is unusable, **When** the visitor returns to the list, **Then** the other videos remain available and the list state is preserved.

---

### User Story 5 - Use the video section privately and with informed expectations (Priority: P2)

A privacy-conscious visitor opens a detail page and no third-party video request has been made yet. The cover area states that playing the video loads the named third-party platform, with links to its terms and privacy policy. Only an explicit activation loads the player. Nothing plays on its own.

**Why this priority**: Embedding a third-party player creates a data relationship with another company. The product's trust posture depends on making that relationship explicit and on refusing silent third-party loads.

**Independent Test**: Load a detail page with the trailer section in a clean session, capture the network log before any interaction, and verify zero requests to the video platform; then activate the video and verify the disclosure, links, and single player load.

**Acceptance Scenarios**:

1. **Given** a fresh page load, **When** the trailer section renders, **Then** no request, cookie, local storage entry, preconnect, prefetch, or preload touches the video platform.
2. **Given** the unactivated video cover, **When** the visitor reads it, **Then** it names the platform, states that activation loads third-party content, and links to the platform's terms of service and privacy policy.
3. **Given** the privacy-enhanced player host is available, **When** the player loads, **Then** that host is used and Walplay makes no claim that third-party processing is eliminated.
4. **Given** the visitor never activates a video, **When** they leave the page, **Then** no player was ever created and no playback occurred.

---

### User Story 6 - Use trailers on any device and with assistive technology (Priority: P3)

A visitor using a phone, a zoomed desktop viewport, a keyboard, a screen reader, or reduced-motion settings can reach the trailer section, understand its state, choose a video and start playback without clipped controls, a keyboard trap, or misleading announcements.

**Why this priority**: Accessibility and responsive behavior are mandatory for every surface, but they refine a journey that must first exist.

**Independent Test**: Run keyboard-only, screen-reader, 200 percent zoom, and supported-viewport checks across the section's loading, success, empty, error, playing, and unavailable states.

**Acceptance Scenarios**:

1. **Given** a keyboard-only visitor, **When** they tab through the section, **Then** the video list, the play activation, the external option, and any list expansion are reachable in a logical order with visible focus.
2. **Given** a screen-reader user, **When** the player loads, **Then** the embedded frame has an accessible name that identifies the video and its platform, and state changes are announced once.
3. **Given** a 360-pixel-wide viewport, **When** the section renders, **Then** no control is clipped, the layout does not scroll horizontally, and an undersized player is not used to satisfy the video requirement.
4. **Given** the visitor prefers reduced motion, **When** the section renders and states change, **Then** no attention-seeking or decorative motion plays.

---

### User Story 7 - Understand when no promotional video exists (Priority: P3)

The visitor opens a title with no usable promotional videos. The section appears with a calm localized statement that no trailer information is available, without a dead player, a spinner, or a "coming soon" promise.

**Why this priority**: Most titles will not have a usable trailer. Absence must look intentional, not broken.

**Independent Test**: Open controlled titles with an empty inventory, a malformed inventory, and a failed inventory request, and verify distinct, localized, non-misleading states.

**Acceptance Scenarios**:

1. **Given** a title whose inventory is empty, **When** the detail page renders, **Then** the labeled trailer section appears, states that no trailer information is available, and shows no player frame, play control, or placeholder.
2. **Given** a title whose inventory request fails, **When** the section renders, **Then** a localized inline error with retry appears and is distinguishable from the no-video state.
3. **Given** a title with no video information, **When** the visitor reads the statement, **Then** it does not claim that no trailer exists anywhere or that the title has no promotional material.

---

### Edge Cases

- A title has only a teaser, only a clip, or only a behind-the-scenes video, and no trailer.
- A provider record omits the official flag, or the flag contradicts the video's title text.
- Two records reference the same video in different languages or regions.
- A record has a valid site but an empty, malformed, or wrong-length video identifier.
- A record's site is not YouTube in the initial release.
- A video's owner allows playback on the platform but not embedding.
- A video was public when the inventory was retrieved and becomes private or deleted before activation.
- Playback requires sign-in, is age-restricted, or is blocked in the visitor's region.
- The visitor's network, browser settings, extensions, or content policy block the third-party player.
- The player loads slowly, never loads, or loads without audio until the visitor interacts.
- The visitor selects another video while the previous one is loading or playing.
- The visitor changes the interface language while a video is playing.
- The visitor navigates away while the player is loading, producing background audio if not unmounted.
- The visitor opens the external destination and uses browser Back.
- The available width would make a compliant player impossible without breaking the layout.
- Video titles are very long, contain markup-like text, or use a non-Latin script.
- The video is vertical or has an unusual aspect ratio.
- Captions are absent, auto-generated only, or unavailable in the interface language.
- The visitor uses 200 percent zoom or text-spacing overrides.
- The trailer section and the availability section both render on the same page.
- The metadata provider is degraded while personal list actions are used.

## Requirements *(mandatory)*

### Functional Requirements

#### Integration and scope

- **FR-001**: The trailer experience MUST be presented only within the existing movie and TV show detail destinations. It MUST NOT introduce a new top-level navigation entry, a separate trailer page, or a parallel detail destination.
- **FR-002**: The experience MUST apply to both movies and TV shows and MUST use the title's identity and content type to obtain its promotional video inventory.
- **FR-003**: The inventory MUST be title-level. Episode-level, season-level, and per-episode promotional video browsing are not part of this feature, and the interface MUST NOT imply that the listed videos belong to a specific episode.
- **FR-004**: The trailer section MUST be a distinct, labeled region with a localized heading and a stable in-page location. The detail page's trailer entry point MUST appear only when at least one eligible promotional video is known, and activating it MUST reveal the section and move focus to it.
- **FR-005**: The section MUST follow the detail feature's information hierarchy and MUST NOT reorder, replace, hide, or duplicate the title identity, overview, seasons, cast, crew, related titles, availability, or personal-list sections.
- **FR-006**: The section MUST load and fail independently of the detail page's primary content and of every other secondary section. Trailer loading, emptiness, or failure MUST NOT block any other detail-page capability, including personal-list actions.
- **FR-007**: When the video capability is unavailable, unconfigured, or not authorized, the detail page MUST NOT show a trailer section, disabled control, placeholder, explanatory teaser, or "coming soon" message.
- **FR-008**: Walplay MUST NOT host, upload, download, record, proxy, mirror, transcode, or redistribute video content, and MUST NOT expose stream URLs or media files. Playback is limited to the platform's authorized embedded player; navigation is limited to authorized external destinations.
- **FR-009**: The experience MUST NOT present full-length titles, live channels, user-uploaded content, fan-made edits, reaction content, recap content, or any video obtained outside the approved provider boundary.

#### Inventory, identity, and metadata

- **FR-010**: The inventory MUST come only from the title's promotional video records supplied through the approved provider boundary. Walplay MUST NOT use video search, crawling, scraping, or visitor-supplied links to discover or supplement videos.
- **FR-011**: Each presented video MUST have a usable source platform, a usable video identifier, a recognized promotional type, and a non-empty title. A record missing any of these MUST be dropped rather than displayed with invented values.
- **FR-012**: Each video MUST display its localized type label using Walplay-owned vocabulary mapped from the provider's type value. Raw provider type values and provider field names MUST NOT be shown.
- **FR-013**: Each video MUST display its provider-supplied title as supplied. Walplay MUST NOT translate, rewrite, correct, or embellish the title, and MUST NOT invent a marketing title.
- **FR-014**: An official indication MUST be shown only when the provider explicitly marks that specific video as official. When the flag is absent, null, or not a boolean, the video MUST be shown without any official claim. Walplay MUST NOT infer or override official status from the title text, channel, uploader, publication date, or the "official" wording inside a title.
- **FR-015**: The video's language MUST be displayed when the provider supplies a usable language code, labeled in the interface language. When the language is missing or unusable, no language MUST be guessed or displayed.
- **FR-016**: The video's source platform MUST be displayed when a usable value exists and MUST be presented as the platform's factual name, not as a Walplay brand or endorsement.
- **FR-017**: A provider-supplied publication date MUST be displayed in localized form only when it is valid and not future-dated. Invalid or implausible dates MUST be omitted rather than corrected.
- **FR-018**: Only these promotional types are eligible initially: trailer, teaser, clip, featurette, behind the scenes, and bloopers. Types outside this set, unknown types, and types Walplay cannot map MUST be omitted. Full titles, opening credits, recaps, and live content MUST NOT be presented.
- **FR-019**: The same video MUST appear at most once. Records that resolve to the same platform and video identifier MUST be merged without duplicating the item, and the most complete usable metadata among them MUST be used.
- **FR-020**: The section MUST present a bounded list with a documented initial maximum of six videos and an in-place way to reveal additional eligible videos already returned by the same inventory. Expansion MUST NOT issue a new inventory request, and the section MUST NOT request or render an unbounded inventory.
- **FR-021**: Provider-supplied image, quality, size, and rating fields MUST NOT be presented as verified quality claims. No video resolution, HD, 4K, or "best quality" claim may be made unless a separate product and legal decision authorizes it.

#### Selection and ordering

- **FR-022**: The section MUST order eligible videos deterministically by promotional type in this fixed order: trailer, teaser, featurette, clip, behind-the-scenes, bloopers. Within the same type, a record explicitly marked official MUST come before one that is not, so official trailers precede other trailers. Within the same type-and-official step, a video whose language matches the active interface language MUST come before one that does not. Remaining ties MUST be broken by provider order and then by platform video identifier, never randomly.
- **FR-023**: The interface MUST select the highest-ranked usable video by default and MUST NOT start playback automatically.
- **FR-024**: The visitor MUST be able to play any listed video through an accessible control whose name states that it plays that video and includes the video title. The selected and playing states MUST be conveyed in text or accessible state, not by color, hover, or position alone.
- **FR-025**: Choosing a video MUST stop any current playback, unload the previous player, update the selected item's state, show the new video's identity, and start the new video as one coherent change, announced once to assistive technology.
- **FR-026**: When choices occur in rapid succession, earlier choices and their late responses MUST NOT overwrite the newest choice.
- **FR-027**: Changing the interface language MUST reorder the list only for the next rendering of the section and MUST NOT interrupt, restart, or stop a video that is currently playing.
- **FR-028**: The section MUST NOT claim that its order reflects quality, popularity, freshness, editorial judgment, or a recommendation.
- **FR-029**: Choosing a different video MUST stop the previous video's playback and unload its player before the next player is created, so that at most one player is loaded at a time.

#### Embedded playback

- **FR-030**: Embedded playback MUST be offered only when the source platform is supported by this feature, the video identifier is valid, and the feature is authorized for that platform and destination. The video owner's embedding setting and any platform-side restriction are established by the authorized player's outcome, never by prior inspection or probing (FR-066).
- **FR-031**: The initial release MUST support only the approved platform's documented embedded player. Other platforms, undocumented player hosts, third-party mirror sites, and embeddable copies of unknown origin MUST NOT be used.
- **FR-032**: The embedded player MUST be loaded only from the platform's documented embed address shape derived from the video identifier, on the platform's official embed host. Walplay MUST NOT construct player addresses from titles, names, or search terms, and MUST NOT add undocumented parameters.
- **FR-033**: The player MUST NOT be requested, created, preconnected, prefetched, prefetched by DNS, or preloaded before the visitor explicitly activates that specific video. No third-party request for the player may occur on page load, on scroll, on hover, or on focus.
- **FR-034**: Choosing a listed video is an explicit activation of that specific video and MAY begin playback. Playback MUST NOT begin on page load, on scroll, on hover, on focus, when the default selection is applied, on interface language change, or without an explicit activation of that specific video.
- **FR-035**: The section MUST load at most one player at a time. A player that has been replaced, the visitor has closed, or the section has left MUST be unmounted so that no audio or network activity continues in the background.
- **FR-036**: Walplay MUST NOT modify the player beyond documented parameters and MUST NOT place overlays, frames, captions, gradients, watermarks, promotional panels, or any other visual element in front of any part of the player, including its controls.
- **FR-037**: The platform's player controls MUST remain intact and available. Walplay MUST NOT hide, replace, or disable them, and MUST NOT present its own controls as if they controlled the third-party video.
- **FR-038**: The embedded frame MUST expose an accessible name that includes the video title and the source platform, and MUST NOT be announced only as "video" or "iframe".
- **FR-039**: The player MUST be sized so that its controls are fully visible and its viewport meets the platform's documented minimum. A 16:9 presentation MUST be used where it fits. When the available width cannot satisfy the platform minimum without breaking the layout, the section MUST NOT render an undersized player and MUST offer the authorized external option. When no authorized external destination exists, that video MUST be omitted and the reason MUST be stated; other videos MUST remain usable.
- **FR-040**: The player area MUST reserve its final dimensions before activation to prevent layout shift, and the visual aspect ratio MUST NOT be distorted or cropped.
- **FR-041**: The player MUST be loaded in a context that provides the referrer information required by the platform. Walplay MUST NOT suppress the referrer for the player and MUST use a referrer policy compatible with the platform's documented requirement.
- **FR-042**: The player request MUST NOT carry Walplay user identifiers, session tokens, analytics parameters, advertising parameters, or any data beyond what the documented player address requires.
- **FR-043**: If Walplay controls playback programmatically, it MUST do so only through the platform's documented player interface and MUST comply with the platform's visibility, autoplay, and single-player requirements. Programmatic control is not required by this feature.
- **FR-044**: Fullscreen MUST be available only through the platform's own fullscreen control when the platform provides it. Walplay MUST NOT force fullscreen, trap focus, or prevent the visitor from leaving fullscreen.
- **FR-045**: The interface MUST NOT use hover- or touch-initiated actions over the player to perform actions on the visitor's behalf, such as opening destinations or starting playback.

#### External viewing

- **FR-046**: An external viewing option MUST be offered for an eligible video when its authorized external destination can be derived from the provider-supplied platform and video identifier, and MUST be offered whenever embedded playback is unavailable, not permitted, blocked, or too small to present compliantly.
- **FR-047**: External destinations MUST be limited to the source platform's canonical watch destination for the same video identifier. Walplay MUST NOT construct search results, redirectors, affiliate links, shorteners, download pages, mirror sites, or destinations for a different video.
- **FR-048**: Every external destination MUST be labeled in localized text, MUST state that the visitor is leaving Walplay, MUST name the destination platform, and MUST expose that warning in its accessible name.
- **FR-049**: Activating an external destination MUST open it without navigating the detail page away from its current state, and the section, selected video, and list position MUST remain available when the visitor returns.
- **FR-050**: The external option MUST NOT open, preload, prefetch, or preview the destination before the visitor activates it.
- **FR-051**: The external option MUST NOT imply that the destination is available in the visitor's region, that it will play without restriction, or that Walplay controls what happens there.
- **FR-052**: A destination that fails authorization, uses insecure transport, uses an unapproved host, or lacks a usable identifier MUST NOT be rendered as a link. When a video has neither permitted embedded playback nor an authorized destination, it MUST NOT be presented as playable and MUST be omitted from the list of playable videos.
- **FR-053**: The interface MUST NOT describe external viewing as playback inside Walplay, and MUST NOT merge the embedded and external actions into one ambiguous control.

#### Unavailability, failure, and restrictions

- **FR-054**: A player-reported or platform-implied unavailability MUST produce a localized, non-technical explanation. The explanation MUST distinguish, at minimum: embedding not permitted by the owner; video private, deleted, or otherwise unavailable; playback restricted by age or sign-in requirement; playback restricted by region; and player blocked or unreachable on the visitor's network.
- **FR-055**: When a video is unavailable, the section MUST keep the video identifiable in the list, MUST offer the authorized external option when it exists, and MUST NOT retry the same failing video without a new visitor action. An explicit retry for the failed video MAY be offered; repeated automatic retries are prohibited.
- **FR-056**: An unavailable video MUST NOT be described as proof that the title has no promotional material, that the title is unreleased, or that the platform deleted the video, unless the platform explicitly states the cause.
- **FR-057**: A player that fails to load within the configured load timeout MUST be replaced by the localized unavailable state, and the player element MUST be unloaded.
- **FR-058**: Inventory loading MUST show a skeleton that matches the final section layout closely enough to avoid visible content shift. The skeleton MUST expose a busy state, hide decorative shapes from assistive technology, and MUST NOT rely on a spinner or bare "Loading" text.
- **FR-059**: A successful inventory with no eligible video MUST show a localized no-video state that is distinct from an error. It MUST NOT render a player frame, play control, disabled control, or promise future content.
- **FR-060**: An inventory failure with no usable cached data MUST show a localized inline trailer error with a retry action. The error MUST be distinguishable from the no-video state and from the detail page's not-found state.
- **FR-061**: An inventory failure with usable cached data MUST show the cached list with a clearly labeled last-checked indication and MUST NOT present the cached metadata as current. Cached inventory MUST NOT be shown beyond the defined last-known retention period; after that, the error state MUST be shown.
- **FR-062**: Timeouts, rate limits, unavailable services, malformed responses, unauthorized responses, and validation failures MUST map to stable internal states and stable machine-readable error codes that the interface localizes.
- **FR-063**: Raw provider or platform errors, status codes, response bodies, stack traces, internal identifiers, field names, and player error codes MUST NOT reach the interface.
- **FR-064**: Retry MUST re-attempt only the failed inventory surface, MUST prevent concurrent duplicate retries, and MUST remain visitor-initiated or bounded by the boundary's retry policy. Repeated failure MUST produce the same stable localized state.
- **FR-065**: When the visitor moves to another title, changes the interface language, or leaves the section before the inventory resolves, an older response MUST NOT alter the visible section or its announcements.
- **FR-066**: The experience MUST NOT attempt to predict or pre-verify embeddability by scraping the platform's pages, calling undocumented endpoints, or probing video files. Embeddability is established from authorized provider configuration and from the authorized player's own outcome.
- **FR-067**: The experience MUST NOT bypass, defeat, or work around age restrictions, sign-in requirements, owner embedding settings, geographic restrictions, paywalls, DRM, or any other access control, and MUST NOT advise the visitor to do so.

#### Privacy and third-party obligations

- **FR-068**: Before the visitor activates a specific video, the section MUST NOT contact the video platform in any way. It MUST NOT load third-party scripts, frames, images, fonts, or styles from the platform, and MUST NOT create cookies or local storage entries on the platform's behalf.
- **FR-069**: The pre-activation cover MUST NOT use imagery hosted by the video platform. It MUST use artwork already authorized for the title through the approved metadata provider or a Walplay-owned treatment.
- **FR-070**: Before activation, the section MUST identify the third-party platform that will be loaded, state that activation loads third-party content, and provide prominent, easily accessible links to the platform's terms of service and privacy policy.
- **FR-071**: Where the platform offers a privacy-enhanced embedded player, that player MUST be used by default. The interface MUST NOT claim that privacy-enhanced mode eliminates third-party data collection, cookies, or personalization, and MUST NOT guarantee what the platform does with playback data.
- **FR-072**: The player request MUST include only documented playback parameters that Walplay is authorized to set. The documented `autoplay` and `playsinline` parameters MAY be used only on an explicitly activated player; personalization, advertising, tracking, and any other parameter Walplay is not authorized to set MUST NOT be included. Walplay MUST NOT pass personal data to the platform through the player address.
- **FR-073**: Walplay MUST NOT collect, record, or transmit the visitor's playback activity from the embedded player. Any local state required by the feature MUST be limited to non-sensitive presentation preferences, validated on read, and removable by the visitor.
- **FR-074**: Consent obligations that apply to visitors in jurisdictions where third-party consent is legally required MUST be satisfied by an approved mechanism. The click-to-load activation is a privacy baseline and MUST NOT be treated as a complete legal consent solution by itself.
- **FR-075**: The interface MUST NOT imply that the platform's player, recommendations, advertisements, captions, or related-video behavior are controlled, endorsed, or verified by Walplay.
- **FR-076**: Walplay MUST NOT obscure, replace, or remove the platform's required branding, attribution, or notices inside the player.
- **FR-077**: Promotional video availability MUST NOT be presented as a guaranteed product capability, and no copy may promise that a trailer exists, plays, or remains available.

#### Presentation, accessibility, and localization

- **FR-078**: The section MUST use semantic structure with one localized heading at the correct level beneath the detail page's primary heading, and list or equivalent semantics for the available videos.
- **FR-079**: The section MUST provide visually and semantically distinct loading, success, no-video, error, playing, and unavailable states. The no-video state MUST NOT be styled or announced as an error.
- **FR-080**: Every interactive control in the section MUST be operable by keyboard in a logical order, MUST have a visible and consistent focus indicator, and MUST NOT create a keyboard trap. Focus MUST remain visible when the player loads and after the player is replaced.
- **FR-081**: Interactive targets MUST meet the design system's minimum target size, and primary controls MUST meet its primary-control target size.
- **FR-082**: Loading completion, no-video, error, video choice and playback start, player readiness, retry outcome, and unavailability MUST be announced once through appropriate live regions, without duplicate, stale, or double announcements.
- **FR-083**: Captions and subtitles are controlled by the platform and the video owner. The interface MUST NOT claim that captions exist, MUST state that caption availability is determined by the platform and the video, and MUST NOT describe a video as accessible solely because it is available.
- **FR-084**: The selection state, video type, official indication, playback mode, and unavailability MUST NOT be communicated exclusively through color, hover, icon shape, animation, or visual position. Text and accessible state MUST carry the meaning.
- **FR-085**: The section MUST work at 360, 768, 1024, and 1440 pixel widths and at 200 percent browser zoom without horizontal page scrolling, clipped controls, overlapping content, or loss of information.
- **FR-086**: Long video titles, long platform names, and non-Latin scripts MUST remain identifiable. Truncation MUST NOT be the only way to read the full title, and controls MUST remain usable.
- **FR-087**: Essential text and interface elements MUST meet WCAG 2.2 AA contrast and target-size requirements and MUST remain usable with text resizing and text-spacing overrides.
- **FR-088**: Decorative motion MUST be minimal and MUST respect the visitor's reduced-motion preference. The cover, section transitions, and state changes MUST NOT animate for attention. Playback starts only on explicit activation, Walplay MUST NOT add motion inside or around the player, and the platform controls the player's own playback behavior.
- **FR-089**: All Walplay-owned copy, type labels, state messages, disclosures, notices, and accessibility announcements MUST be available in English and Spanish. Missing translations MUST fall back to English and MUST NOT display raw translation keys.
- **FR-090**: Provider-supplied video titles, platform names, and third-party brand names MUST NOT be machine-translated or presented as Walplay-authored copy. Type labels, language names, dates, and platform descriptions owned by Walplay MUST be localized.
- **FR-091**: Dates and language names MUST be formatted for the selected locale and MUST NOT mix localized words with unlocalized values.
- **FR-092**: The section MUST NOT delay or block the detail page's primary content. The inventory request MUST start only after the title identity is usable, and player loading MUST occur only after explicit activation.
- **FR-093**: Changing the interface language MUST localize all Walplay-owned text without reloading the page and MUST NOT discard the loaded inventory, the selected video, or an active player.

#### Provider boundary and operational constraints

- **FR-094**: All inventory data MUST be obtained through the application's documented provider boundary on the server. The browser MUST NOT call the metadata provider directly when a credential, proxy, attribution, or policy requirement applies.
- **FR-095**: Provider responses MUST be treated as untrusted input, validated, normalized, and mapped to an internal promotional video model. Provider-specific response shapes MUST NOT reach the interface, and invalid records MUST be dropped safely.
- **FR-096**: Provider credentials and secrets MUST remain on the server and MUST NOT be exposed to the browser.
- **FR-097**: Inventory requests MUST use explicit timeouts, bounded retries for idempotent reads only, and caching with a defined lifetime keyed by every parameter that affects the result: title identity and content type. The inventory request is language-independent and carries no language parameter; interface language affects presentation ordering only and MUST NOT be part of the server cache key.
- **FR-098**: Provider rate limits MUST be respected. The feature MUST NOT generate uncontrolled, unbounded, or speculative requests, and MUST NOT prefetch inventories for unrelated titles.
- **FR-099**: Trailer failures MUST be isolated from unrelated features and MUST NOT propagate through application modules or take down catalog, search, detail, availability, or personal-list behavior.
- **FR-100**: Logs and telemetry MUST NOT contain secrets, unnecessary personal data, raw provider payloads, or third-party player error payloads. Video identifiers may be logged only as needed for diagnosis, without visitor identifiers.
- **FR-101**: Only documented and authorized provider operations and platform mechanisms are permitted. Undocumented, private, unstable, or unauthorized operations MUST NOT be used for discovery, playback, or verification.

#### Requirements resolved during specification review

- **FR-102**: The inventory MUST NOT be narrowed to the interface language in a way that hides the only available eligible video. Videos in other languages MUST remain eligible and MUST be labeled under FR-015 and FR-090, and the absence of an interface-language video MUST NOT produce the no-video state when another eligible video exists.
- **FR-103**: Provider-supplied country metadata MUST NOT be presented as a guarantee that a video is available in the visitor's region and MUST NOT be used to filter or hide a video unless an explicit, documented rule authorizes it. Duplicate records for the same platform video with different country values MUST collapse under FR-019, and country values MUST NOT be displayed as availability claims.
- **FR-104**: A third-party player may fail or restrict playback without exposing a signal the host page can observe. Whenever an authorized external destination exists, the external option MUST remain available adjacent to the player, regardless of whether an unavailable state was detected, so the visitor always has a recovery path.
- **FR-105**: A player load failure, load timeout, blocked frame, or unavailable frame MUST be treated as an unavailable playback outcome and mapped to the states in FR-054. Walplay MUST NOT require a signal the platform does not provide, MUST NOT inspect player internals, and MUST NOT infer success from the absence of an error.
- **FR-106**: The third-party disclosure required by FR-070 MUST be visible adjacent to the list and its play actions, so that every explicit activation is preceded by the disclosure and not only by a page-level notice.

### Key Entities *(include if feature involves data)*

- **Title Video Inventory**: The complete set of promotional video records for one title identity and content type in one language context. It contains the inventory state, eligible videos, the language context used, the observation or last-checked time, and any failure information. It is the unit rendered by the trailer section.
- **Promotional Video**: One eligible third-party video. Its attributes are the source platform, the platform video identifier, the provider-supplied title, the mapped promotional type, the provider-supplied official indicator when explicitly present, language, publication date, and the provider order used for deterministic ranking. It never contains a stream URL, file, or download reference.
- **Promotional Type**: The normalized category of a video, initially limited to trailer, teaser, clip, featurette, behind the scenes, and bloopers. It drives eligibility and ordering and is always labeled in the interface language.
- **Playback Mode**: The state that determines how a video can be accessed: embedded in-page, external destination only, or unavailable. It is derived from the source platform, authorization, and whether a compliant player can be presented, and it is always stated in text. The visitor's activation starts a playback session but does not change the video's own mode.
- **Playback Session**: The visitor's explicit activation of one video in the player area. It holds the selected video, the player lifecycle state, the load timeout, and the resulting availability outcome. At most one session exists at a time.
- **Player Availability State**: The normalized outcome of a playback attempt: ready, loading, embed not permitted, private or deleted, age or sign-in restricted, region restricted, network blocked, timed out, or failed. It carries a localized explanation and determines whether an external option is offered.
- **Authorized External Destination**: The canonical watch destination for the same platform video identifier, with its authorization status, host, localized label, and leaving-Walplay notice. It is never a Walplay-constructed search, affiliate, redirect, or mirror link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 percent of tested titles whose inventory contains at least one eligible video, the trailer section is present, labeled, and reachable from the detail page.
- **SC-002**: At least 95 percent of usability-test participants correctly identify, on their first attempt, whether the selected video plays inside Walplay or opens an external destination.
- **SC-003**: In 100 percent of tested inventories containing an official trailer, that trailer appears before any non-official trailer.
- **SC-004**: A clean browser profile with no prior third-party state records zero requests, cookies, or storage writes to the video platform before explicit activation, across every tested detail page.
- **SC-005**: In 100 percent of tested unavailable cases (embedding disabled, private, deleted, age-restricted, region-restricted, network-blocked, timed out), the visitor sees a localized explanation and, when an authorized destination exists, an external option, with no raw technical error shown.
- **SC-006**: In 100 percent of tested unavailable cases, the rest of the detail page and the other listed videos remain usable.
- **SC-007**: Keyboard-only and screen-reader checks pass for section entry, choosing a video and starting playback, the external option, retry, and state announcements, with zero critical accessibility violations on the critical journey.
- **SC-008**: No tested entry path starts playback without an explicit activation of that specific video, and no page load, default selection, or interface-language change produces audible playback.
- **SC-009**: The section passes the supported viewport and 200 percent zoom checks with no horizontal page scrolling, clipped controls, distorted video, or hidden information.
- **SC-010**: In 100 percent of tested widths where a compliant player cannot fit, no undersized player is rendered; the section offers external viewing when an authorized destination exists and otherwise omits that video with a stated reason while keeping other videos usable.
- **SC-011**: English and Spanish checks find complete Walplay-owned copy, zero raw translation keys, and provider-supplied titles shown as supplied with language labels.
- **SC-012**: In 100 percent of tested titles with an empty inventory, the labeled section and its localized no-video message appear, and no player frame, play control, disabled control, spinner, or future-content promise is shown.
- **SC-013**: A scope audit finds zero downloads, stream extraction, proxying, scraping, mirror sites, DRM circumvention, access-control bypass, or unapproved video hosts.
- **SC-014**: In 100 percent of tested inventory-failure cases, the trailer section fails independently, shows a localized error with retry, and the title's core detail and personal-list actions continue to work.
- **SC-015**: In 100 percent of tested stale or cached cases, the list is labeled as last checked and is not presented as current; beyond the retention period the error state appears instead.
- **SC-016**: At least 90 percent of usability-test participants correctly explain, after reading the cover disclosure, that activating the video loads content from another company.
- **SC-017**: In 100 percent of tested videos with no explicit official flag, no official claim is visible or announced.
- **SC-018**: In 100 percent of tested titles whose only eligible video is in a non-interface language, the video is presented and labeled and the no-video state does not appear.
- **SC-019**: In 100 percent of tested player-failure cases where an authorized destination exists, the external option is available adjacent to the player even when the failure state was not detected.

## Assumptions

- **Initial source**: TMDB remains the approved initial metadata provider, so its official movie and TV video operations are the initial inventory source for planning, behind the existing provider-neutral boundary. Release remains gated on confirmed terms, attribution, caching permissions, and legal review.
- **Promotional distinction**: "Trailer" in this feature means third-party promotional material about a title. It is distinct from streaming the title itself, which remains deferred under Product Overview BR-11 and OD-05. The 2026-11-24 clarification approved this distinction for the feature, and the Product Overview must record it before implementation.
- **Supported platform**: YouTube is the only embedded platform in the initial release, because it is the only platform whose official embedding mechanism was validated for this specification. Other platforms, including Vimeo, are not embedded and are not linked in the initial release; they are omitted. Supporting them later requires a separate decision.
- **Eligible types**: Trailers, teasers, clips, featurettes, behind-the-scenes videos, and bloopers are treated as promotional. Opening credits, recaps, full titles, unknown types, and unmapped types are excluded. This is a product default, not a provider guarantee.
- **Official flag**: The provider's official flag is metadata owned by the provider and is not proof of rights-holder authorization. It controls labeling and priority only. Videos without the flag remain eligible but are never described as official.
- **Language strategy**: The inventory request MUST NOT be narrowed in a way that hides the only available video. Videos in languages other than the interface language remain eligible, are labeled, and are ranked below an interface-language equivalent. The provider's translation-preference behavior governs which titles a request returns; Walplay's eligibility rule, not the request language, determines the no-video state.
- **Empty section**: When the trailer capability is enabled, the labeled section is always present, including the no-video and error states. It is omitted only when the capability itself is unavailable, unconfigured, or not authorized (FR-007).
- **Activation model**: The default video is selected but not played. Choosing any listed video, including the selected one, is an explicit activation that starts playback. This resolves the interaction ambiguity without weakening the no-autoplay rule.
- **Region metadata**: Provider-supplied country values are descriptive metadata only. They are not used to hide videos and are not presented as evidence of regional availability; regional restriction is discovered only through the authorized player or the external destination.
- **Detection limits**: A cross-origin player may fail without exposing an observable error. The persistent adjacent external option (FR-104) is the recovery guarantee; detected failures still receive the explicit unavailable state.
- **Absence is normal**: Many titles have no eligible video. The design must treat absence as a normal outcome, not an error, and must not backfill with unofficial sources.
- **Inventory bound**: The section shows at most six videos before expansion. The exact maximum may be tuned in planning without changing the behavior contract.
- **Freshness**: The initial inventory cache lifetime is 24 hours, keyed by title identity, content type, and language. Last-known inventory may be shown for at most seven days from the applicable timestamp with a labeled last-checked indication; after that the error state is shown. These values may be tuned in planning without changing the behavior contract.
- **Player load timeout**: The initial player load timeout is 15 seconds. A player that has not become ready within it is treated as unreachable under FR-057 and is unloaded. The value may be tuned in planning without changing the behavior contract.
- **Privacy baseline**: Click-to-load activation with a platform disclosure, a privacy-enhanced player host, and no pre-activation third-party contact is the baseline privacy posture. Jurisdiction-specific consent tooling is a separate legal decision.
- **Placement**: The trailer section is a secondary section of the existing detail destination. It does not create a new route or navigation entry and does not define the detail page's overall section order.
- **Personal data**: The feature introduces no account, profile, viewing-history, or cross-device synchronization behavior. It does not record what the visitor watched.
- **Attribution**: The existing TMDB attribution remains required where its metadata is shown. YouTube's player branding and notices are controlled by the platform and must not be altered. Exact additional wording is a legal dependency.
- **No per-video addresses**: Choosing a video is in-page state, not a new address. Deep-linking to a specific video is not required and is not introduced.
- **Performance**: Standard web application expectations apply. The specification does not promise a numeric latency target beyond avoiding layout shift, unnecessary third-party contact, and repeated identical requests.
- **Informational notice**: The privacy and leaving-Walplay notices are not legal advice and do not replace terms review.

## Provider Research and Decision Status

This section separates capabilities confirmed from current official documentation, product assumptions, and unresolved decisions. Research was performed on 2026-11-24. Evidence is recorded in Appendix A.

### Confirmed capabilities of the initial metadata source

- TMDB documents official video operations for movies and TV shows. Both return a title identifier and a results array of video records.
- The documented record fields are language, country, name, key, site, size, type, official, publication timestamp, and a provider record identifier. The examples show `site` values of `YouTube` and types such as `Trailer`, `Teaser`, `Behind the Scenes`, and `Opening Credits`.
- The movie operation accepts a language parameter. The TV operation accepts a language parameter and a language filter that accepts multiple comma-separated values.
- The API reference does not enumerate the complete set of allowed `type` or `site` values, so unknown values must be treated as unrecognized rather than assumed valid.
- The `official` flag is not guaranteed to be present: at least one official TV example omits it while the schema shows a default. It must therefore be treated as tri-state: true, false, or absent.
- The operations return no embeddability status, no streaming URL, no region availability status, no caption information, and no playback guarantee.
- Nothing in the documentation guarantees that a title has any video record. An empty result is a normal response.

### Confirmed capabilities and constraints of the initial playback platform

- YouTube documents official embedded playback through its embedded player using the documented embed address shape and its privacy-enhanced host.
- Owners can disable embedding for a video. The platform states that age-restricted videos cannot be watched on most third-party websites and redirect viewers back to YouTube.
- The platform requires embedders to provide the HTTP Referer. Missing referrer information blocks playback with error 153. The documented recommendation is a referrer policy that does not suppress the referrer, and `noreferrer` must not be used in the player context.
- Embedded players must have a viewport of at least 200 by 200 pixels, and 16:9 players are recommended to be at least 480 by 270 pixels.
- The platform prohibits overlays, frames, or other visual elements in front of any part of the player, including its controls, and prohibits changes to the player not described in its documentation.
- The platform documents autoplay parameters and states that autoplay occurs without user interaction and that playback data collection happens on page load. It also limits automatic playback to one player at a time and requires more than half of an autoplaying player to be visible.
- The platform documents caption parameters. It does not guarantee that a given video has captions in a given language.
- The YouTube API Services Terms of Service and Developer Policies apply to all use of the embedded player. Privacy-enhanced mode is described as available for embedded players on websites and reduces personalization influence; it is not described as eliminating third-party data processing.
- Google's EU user consent policy requires disclosures and legally valid consent for end users in the EEA, the UK, and Switzerland when a Google product incorporates that policy, including consent for cookies or local storage where legally required and for personalization of ads.
- The platform applies region, age, and owner-controlled availability that the metadata source does not expose in its video records.

### Confirmed limitations and unresolved evidence

- The metadata source does not state whether a listed video is embeddable, available in the visitor's region, age-restricted, or still public.
- The metadata source does not document whether its `official` flag is verified against rights holders, nor how it is curated.
- The metadata source's terms for caching video metadata, for using video titles, and for displaying platform names alongside trailer surfaces have not been confirmed for this feature.
- Neither source authorizes Walplay to reproduce video content outside its own player. No evidence supports downloading, proxying, or re-hosting.
- The exact set of provider `type` values and their stability over time is not documented in the reviewed reference.
- Whether Vimeo or another platform can be supported under an authorized embedding mechanism was not validated for this feature.

### Recommendation and decision status

- **Recommended for planning**: a click-to-load trailer surface that uses TMDB video records as inventory, YouTube as the only embedded platform, the privacy-enhanced player host, no autoplay, a reserved 16:9 player area, and an authorized canonical external destination as the fallback.
- **Not approved for release**: embedded playback, external linking, or production use until the legal and authorization decisions (OD-T2, OD-T6, OD-T7, and the remaining platform and attribution decisions) are resolved. The product approval for the capability itself is recorded in Clarifications, and the two required document amendments were completed on 2026-11-24.
- **Rejected by design**: scraping video pages, extracting undocumented stream URLs, proxying or downloading media, using mirror or aggregator sites, bypassing DRM or regional restrictions, and inferring availability from metadata.

## Legal and Product Constraints

- Walplay is not a streaming service and does not host, distribute, or redistribute content. This feature must not blur that boundary in copy, controls, or behavior.
- Only documented and authorized mechanisms may be used. Undocumented endpoints, scraped player pages, and access-control bypass are prohibited.
- The third-party player's branding, notices, controls, and behavior must remain intact, and no overlay or modification may obscure any part of it.
- Promotional video availability is not a product promise. Copy must not guarantee that a trailer exists, plays, or remains available.
- Provider and platform terms, attribution, caching, and link-out rights govern what may be displayed, cached, linked, or played. Unresolved terms must gate the dependent behavior rather than be treated as permission.
- The feature must not create a false impression of partnership, endorsement, sponsorship, or certification with the metadata source, the playback platform, or a rights holder.
- Visitors must be able to understand, before activating a video, that third-party content will load and that they may be leaving Walplay.
- No personal viewing history is created by this feature, and no playback telemetry is collected by Walplay.

## Out of Scope

- Hosting, uploading, downloading, recording, proxying, transcoding, or redistributing video content.
- Reproducing copyrighted content outside the authorized third-party player.
- General-purpose video streaming infrastructure, media pipelines, or player frameworks owned by Walplay.
- Live television, live events, and linear channels.
- Streaming the movie or TV show itself, including full-length title playback.
- Episode-level, season-level, or per-scene video browsing.
- User-supplied video links, comments, reactions, ratings, or reviews of videos.
- Video search, recommendation of videos, or personalized trailer selection.
- Advertising, monetization, sponsored placement, or affiliate links in the trailer section.
- Deep links to a specific video, shareable per-video addresses, or playback position persistence.
- Offline playback, background audio, picture-in-picture control by Walplay, or download-for-later.
- Supporting video platforms other than the approved initial platform.
- Collecting viewing history or using trailer activity in recommendations.

## Open Decisions

The following decisions are unresolved unless marked resolved. Each unresolved decision MUST be settled before the behavior that depends on it ships, or explicitly recorded as a release dependency with that behavior gated. They do not change this specification's user-visible requirements, but they determine whether certain requirements can be delivered as written.

| ID | Decision | Impact | Needed from |
|---|---|---|---|
| OD-T1 | Resolved 2026-11-24: authorized promotional trailer playback is approved as a capability distinct from deferred in-app title playback (see Clarifications). The Product Overview and feature 004 were amended on 2026-11-24. | The embedded surface is in scope; release still depends on OD-T2 and the remaining legal/platform decisions. | Product owner (decision and documentation complete) |
| OD-T2 | Whether Walplay may embed the platform's player and link out to its canonical watch destination for trailers, under which terms and in which regions. | Gates embedded playback and external viewing; determines whether the feature ships as specified or as external-only. | Legal and provider/platform terms review |
| OD-T3 | Whether the metadata source's official flag may be used to label and prioritize videos, and what wording is permitted. | Affects FR-014, FR-022, and the trust claim in User Story 2. | Provider terms and legal review |
| OD-T4 | Whether caching trailer metadata is permitted, for how long, and under what storage constraints. | Affects FR-061, FR-097, and the stale-inventory behavior. | Provider terms and legal review |
| OD-T5 | Whether any platform other than the initial one is in scope, and under which authorized mechanism. | Currently non-initial platforms are omitted; supporting them changes FR-031 and FR-052. | Product and legal decision |
| OD-T6 | Whether external fallback may use the platform's canonical watch destination, and what warning wording and region caveat are required. | Affects FR-046 through FR-052 and the leaving-Walplay treatment. | Legal review |
| OD-T7 | Which consent mechanism satisfies EEA, UK, and Switzerland obligations, and whether the target market triggers it. | Affects FR-070 and FR-074; the click-to-load gate is a baseline, not a legal solution. | Legal and privacy review |
| OD-T8 | Whether the initial release should include clips, featurettes, behind-the-scenes videos, and bloopers, or trailers and teasers only. | Affects FR-018 and the eligible inventory size. | Product decision |
| OD-T9 | Whether Walplay must self-designate as child-directed for any embedded platform, and what that changes. | Affects platform compliance and player behavior. | Product and legal review |
| OD-T10 | The exact attribution and notice required for trailer metadata and for the embedded player beyond existing TMDB attribution and platform-controlled branding. | Affects FR-070, FR-076, and the Legal and Product Constraints section. | Provider, platform, and legal review |
| OD-T11 | Whether a selectable video may receive a shareable per-video address, and whether the selected video should survive a reload. | Currently out of scope; revisiting changes FR-004 and the Assumptions. | Product decision |

## Dependencies

- The existing movie and TV detail destination, its identity resolution, and its section hierarchy from feature 004.
- The existing provider boundary and TMDB integration from features 002 and 004, including server-side credentials, validation, timeouts, caching, and stable error mapping.
- The existing attribution treatment and localization infrastructure, including English and Spanish resources.
- The existing design system rules for target sizes, focus, contrast, reduced motion, and responsive breakpoints.
- The feature 004 trailer entry point, which must be updated to target this section instead of an external-only destination.
- The Product Overview and feature 004 amendments described in the Scope Status section. Both were completed on 2026-11-24; T091/T092 verify they remain accurate.
- Resolution of the Open Decisions that gate authorization, consent, and platform support.

## Appendix A — Provider Capability Evidence (verified 2026-11-24, non-normative)

| Evidence | Source | What it establishes |
|---|---|---|
| Movie videos operation returns `id` and `results` with `iso_639_1`, `iso_3166_1`, `name`, `key`, `site`, `size`, `type`, `official`, `published_at`, and record `id`. | TMDB API reference, movie videos page | The available metadata fields and that the source supplies platform plus identifier, not a stream. |
| TV videos operation returns the same shape and adds a multi-value language filter; examples include `Trailer` and `Behind the Scenes` with `official: true`, and one trailer record without an `official` field. | TMDB API reference, TV videos page | TV parity, the language filter, and that the official flag is not guaranteed present. |
| Neither operation documents embeddability, region restrictions, captions, playback status, or a guarantee that a title has videos. | TMDB API reference, movie and TV videos pages | The feature must not infer playback or restrictiveness from metadata. |
| Documented embed address uses the platform embed path with a video identifier; privacy-enhanced mode changes the host to the no-cookie domain and is described for embedded players on websites. | YouTube Help, "Embed videos & playlists" | The authorized embed mechanism and the privacy-enhanced host. |
| Owners can disable embedding; age-restricted videos cannot be watched on most third-party websites and redirect viewers to YouTube. | YouTube Help, "Embed videos & playlists" | Owner-controlled and age-controlled unavailability must be handled at the player, not predicted from metadata. |
| Embedders must provide HTTP Referer; missing referrer blocks playback with error 153; a non-suppressing referrer policy is recommended and `noreferrer` must not be used. | YouTube Help and YouTube required minimum functionality | The referrer requirement in FR-041 and the technical meaning of a blocked player. |
| Embedded players must be at least 200 by 200 pixels; 16:9 players are recommended at 480 by 270 or larger. | YouTube player parameters and required minimum functionality | The sizing rule and the external-only fallback for narrow layouts. |
| Overlays, frames, or visual elements in front of any part of the player are prohibited, and undocumented player changes are prohibited. | YouTube required minimum functionality | FR-036 and FR-037, and why the pre-activation cover must not be an overlay on a loaded player. |
| Autoplay occurs without user interaction and playback data collection happens at page load; one autoplaying player maximum and more than half visibility required. | YouTube player parameters and required minimum functionality | The no-autoplay rule and why pre-activation contact is avoided entirely. |
| Caption parameters exist, but caption availability per video and language is not guaranteed. | YouTube player parameters | The caption statement in FR-083. |
| YouTube API Services Terms and Developer Policies apply to embedded player use; privacy-enhanced mode reduces personalization influence but is not described as eliminating processing. | YouTube Help and required minimum functionality | The platform compliance and privacy-claim limits. |
| Google's EU user consent policy requires disclosures and legally valid consent for EEA, UK, and Switzerland end users, including cookies or local storage where required and ad personalization. | Google EU user consent policy | The unresolved consent decision OD-T7 and the limits of a click-to-load gate. |
