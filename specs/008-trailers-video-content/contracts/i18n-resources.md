# Contract: Trailer Translation Resources

**Feature**: `008-trailers-video-content` | **Type**: i18n resource contract

All Walplay-owned trailer copy lives under `detail.trailers` in
`frontend/src/shared/i18n/resources/en.json` and `es.json`. English is canonical; Spanish must be
complete. Missing Spanish keys fall back to English and must never render a raw key. Provider-supplied
titles, video language codes, and the platform name are not translation keys.

## Key inventory

```text
detail.trailers.heading
detail.trailers.entry
detail.trailers.disclosure.loads
detail.trailers.disclosure.terms
detail.trailers.disclosure.privacy
detail.trailers.disclosure.privacyNote
detail.trailers.disclosure.hostingNote
detail.trailers.list.label
detail.trailers.list.selectedState
detail.trailers.list.playingState
detail.trailers.list.play
detail.trailers.list.expand
detail.trailers.list.collapse
detail.trailers.list.language
detail.trailers.list.published
detail.trailers.list.official
detail.trailers.types.trailer
detail.trailers.types.teaser
detail.trailers.types.clip
detail.trailers.types.featurette
detail.trailers.types.behindTheScenes
detail.trailers.types.bloopers
detail.trailers.mode.embedded
detail.trailers.mode.external
detail.trailers.player.title
detail.trailers.player.loading
detail.trailers.player.ready
detail.trailers.player.reload
detail.trailers.player.captionNote
detail.trailers.states.loading
detail.trailers.states.loaded
detail.trailers.states.noVideos.title
detail.trailers.states.noVideos.description
detail.trailers.states.error.title
detail.trailers.states.error.description
detail.trailers.states.error.retry
detail.trailers.states.stale.lastChecked
detail.trailers.states.stale.caution
detail.trailers.unavailable.title
detail.trailers.unavailable.description
detail.trailers.externalOnly.title
detail.trailers.externalOnly.description
detail.trailers.external.action
detail.trailers.external.leaves
detail.trailers.external.newTab
detail.trailers.announce.inventoryLoaded
detail.trailers.announce.selected
detail.trailers.announce.unavailable
detail.trailers.announce.retry
detail.trailers.announce.externalOnly
```

## Illustrative English values

| Key | Value |
|---|---|
| `heading` | `Trailer` |
| `entry` | `Watch trailer` |
| `disclosure.loads` | `Activating a video loads content from {{platform}}.` |
| `disclosure.terms` | `{{platform}} terms of service` |
| `disclosure.privacy` | `{{platform}} privacy policy` |
| `disclosure.privacyNote` | `Privacy-enhanced playback limits personalization. It does not eliminate third-party processing.` |
| `disclosure.hostingNote` | `Walplay does not host these videos.` |
| `list.label` | `Available videos` |
| `list.selectedState` | `Selected` |
| `list.playingState` | `Playing in the player` |
| `list.play` | `Play {{title}}` |
| `list.expand` | `Show more videos` |
| `list.collapse` | `Show fewer videos` |
| `list.language` | `Language: {{language}}` |
| `list.published` | `Published {{date}}` |
| `list.official` | `Official` |
| `types.trailer` | `Trailer` |
| `types.teaser` | `Teaser` |
| `types.clip` | `Clip` |
| `types.featurette` | `Featurette` |
| `types.behindTheScenes` | `Behind the scenes` |
| `types.bloopers` | `Bloopers` |
| `mode.embedded` | `Plays inside Walplay` |
| `mode.external` | `Opens on {{platform}}` |
| `player.title` | `{{title}} — {{platform}} player` |
| `player.loading` | `Loading the {{platform}} player for {{title}}` |
| `player.ready` | `{{title}} player loaded` |
| `player.captionNote` | `Captions are controlled by {{platform}} and the video’s owner.` |
| `states.loading` | `Loading trailer information` |
| `states.loaded` | `Trailer information loaded` |
| `states.noVideos.title` | `No trailer information available` |
| `states.noVideos.description` | `There is no promotional video information for this title right now.` |
| `states.error.title` | `Trailer information is unavailable` |
| `states.error.description` | `This section could not be loaded. Try again; the rest of the page is still available.` |
| `states.error.retry` | `Try again` |
| `states.stale.lastChecked` | `Last checked {{date}}` |
| `states.stale.caution` | `This information may be out of date.` |
| `unavailable.title` | `This video cannot be played here` |
| `unavailable.description` | `The video’s owner may have disabled embedding, or the video may be private, deleted, age-restricted, unavailable in your region, or blocked by your network.` |
| `externalOnly.title` | `The player cannot be shown at this width` |
| `externalOnly.description` | `Open the video on {{platform}} to watch it.` |
| `external.action` | `Watch on {{platform}}` |
| `external.leaves` | `Leaves Walplay` |
| `external.newTab` | `Opens in a new tab` |
| `announce.inventoryLoaded` | `Trailer information loaded` |
| `announce.selected` | `{{title}} selected. Loading the {{platform}} player.` |
| `announce.unavailable` | `This video cannot be played here. An external option is available.` |
| `announce.retry` | `Loading trailer information again` |
| `announce.externalOnly` | `A compliant player cannot be shown here. An external option is available.` |

Spanish values must convey the same meaning, not a literal word-for-word rendering. Example for the
most sensitive copy:

| Key | Spanish |
|---|---|
| `heading` | `Tráiler` |
| `entry` | `Ver tráiler` |
| `disclosure.loads` | `Al activar un video se carga contenido de {{platform}}.` |
| `mode.embedded` | `Se reproduce dentro de Walplay` |
| `mode.external` | `Se abre en {{platform}}` |
| `unavailable.description` | `Es posible que el propietario haya desactivado la inserción, o que el video sea privado, haya sido eliminado, tenga restricción de edad, no esté disponible en tu región o esté bloqueado por tu red.` |
| `external.leaves` | `Sale de Walplay` |

## Rules

- Every user-facing string in this section is a key; no hardcoded text in components.
- `player.reload` is present only when an explicit retry of a failed video is offered. The initial
  contract does not require per-video retry; FR-055 makes it optional. If no retry control is
  implemented, the key may be omitted from both locales rather than shipped unused.
- Type labels are Walplay-owned vocabulary; never render the provider's raw `type` value.
- Video language names use `Intl.DisplayNames` with the active locale, interpolated into
  `list.language`; do not add language names as keys.
- Publication dates use `Intl.DateTimeFormat` with the active locale, interpolated into
  `list.published`; do not concatenate localized and unlocalized values.
- Provider titles are interpolated as data and never translated. React escapes them; no HTML.
- The platform name is configuration-backed factual data (`YouTube`), not a translated brand.
- No key may promise that a trailer exists, plays, or remains available.
- No copy may claim captions exist or that a video is accessible because it is available.
- No copy may imply partnership, endorsement, sponsorship, or certification.
- Announcements are used once per state transition; do not reuse the same message for two live
  regions, and do not announce default selection.
- A test asserts both locale files contain the full key set and that no raw key is rendered.
