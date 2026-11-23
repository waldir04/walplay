# Contract: Availability Localization Resources

**Feature**: `006-streaming-availability` | **Type**: i18n resource contract

All Walplay-owned availability text is externalized under the existing `detail` namespace. Provider
names are supplied by the source and are not translated. Region names are localized at runtime with
`Intl.DisplayNames`; dates use the existing `formatLastUpdated` / `Intl.DateTimeFormat` helper. The
API returns stable codes and timestamps, never localized messages.

## New section key

| Key | English | Spanish |
|---|---|---|
| `detail.sections.availability` | Where to watch | Dónde ver |

`frontend/src/shared/i18n/resources/resources.test.ts` must add `availability` to its expected
section-key list. The test also verifies that every detail key is referenced by application source,
so every key below must be used.

## Region context

| Key | English | Spanish |
|---|---|---|
| `detail.availability.regionLabel` | Availability in {{region}} | Disponibilidad en {{region}} |
| `detail.availability.regionSelectorLabel` | Availability region | Región de disponibilidad |
| `detail.availability.regionSelectorPlaceholder` | Choose a supported region | Elige una región compatible |
| `detail.availability.regionAnnouncement` | Availability region changed to {{region}} | Región de disponibilidad cambiada a {{region}} |
| `detail.availability.regionUnsupported` | Availability information is not available for {{region}} yet. Choose another region. | La información de disponibilidad aún no está disponible para {{region}}. Elige otra región. |
| `detail.availability.unsupportedRegion.title` | Region not supported | Región no compatible |

`{{region}}` is always the formatted `Country name (CODE)` string. The country name is localized
with `Intl.DisplayNames`; the code is always displayed. The unsupported title and description are
text, not color-only. The selector placeholder is used only when the active stored code is outside
the allowlist.

## Category labels

| Key | English | Spanish |
|---|---|---|
| `detail.availability.categories.subscription` | Included with a subscription | Incluido con una suscripción |
| `detail.availability.categories.free` | Free | Gratis |
| `detail.availability.categories.ads` | Free with ads | Gratis con anuncios |
| `detail.availability.categories.rent` | Rent | Alquilar |
| `detail.availability.categories.buy` | Buy | Comprar |

The category code is stable and language-independent. The frontend maps codes to these keys; it must
not use the code as a translated string. The fixed display order is subscription, free, ads, rent,
buy. If OD-SA8 removes ad-supported availability, remove the `ads` mapping and this key together.

## Freshness and staleness

| Key | English | Spanish |
|---|---|---|
| `detail.availability.loading` | Loading availability information | Cargando información de disponibilidad |
| `detail.availability.freshness.checked` | Checked by Walplay on {{date}} | Verificado por Walplay el {{date}} |
| `detail.availability.freshness.sourceUpdated` | Updated by the source on {{date}} | Actualizado por la fuente el {{date}} |
| `detail.availability.freshness.lastKnown` | Last known availability | Última disponibilidad conocida |
| `detail.availability.freshness.lastChecked` | Last checked on {{date}} | Última verificación el {{date}} |
| `detail.availability.freshness.caution` | Availability may have changed since this information was checked. | La disponibilidad puede haber cambiado desde que se verificó esta información. |

Rules:

- `checked` is used when the source supplies no timestamp (TMDB's case).
- `sourceUpdated` is used only when `meta.sourceUpdatedAt` is present.
- `lastKnown`, `lastChecked`, and `caution` are used together when `meta.stale` is true.
- The stale banner reuses `detail.availability.retry` for its retry action (FR-051).
- `{{date}}` is already localized by `formatLastUpdated`; do not format it again inside the
  translation string.
- Never display a source-updated claim when the source supplied no timestamp.

## Missing and unsupported information

| Key | English | Spanish |
|---|---|---|
| `detail.availability.noInformation.title` | Availability information not found | No se encontró información de disponibilidad |
| `detail.availability.noInformation.description` | We could not find availability information for {{region}}. This does not mean the title is unavailable; it may still be available. You can check the availability source or a provider directly. | No encontramos información de disponibilidad para {{region}}. Esto no significa que el título no esté disponible; puede seguir estándolo. Puedes consultar la fuente de disponibilidad o a un proveedor directamente. |

The no-information copy must not be rephrased into "not available". It must include the actionable
guidance required by FR-045: the visitor may check the availability source or the provider directly.
The unsupported-region keys are defined once in [Region context](#region-context) and are reused
here; they must remain distinct from the no-information copy.

## Error and retry

| Key | English | Spanish |
|---|---|---|
| `detail.availability.error.title` | Availability could not be loaded | No se pudo cargar la disponibilidad |
| `detail.availability.error.description` | Availability information is temporarily unavailable. Try again. The rest of the title page is still available. | La información de disponibilidad no está disponible temporalmente. Inténtalo de nuevo. El resto de la página del título sigue disponible. |
| `detail.availability.retry` | Try again | Reintentar |

The error state uses `role="alert"` and the retry action. It must not reuse the no-information
description, and it must not imply that the title is unavailable.

## Destination and informational notice

| Key | English | Spanish |
|---|---|---|
| `detail.availability.destination` | View availability details | Ver detalles de disponibilidad |
| `detail.availability.destinationExternal` | Opens {{host}} in a new tab | Abre {{host}} en una pestaña nueva |
| `detail.availability.disclaimer` | Availability is informational, region-specific, and may change. It is not a guarantee that the title can be watched. Walplay does not host or stream content. | La disponibilidad es informativa, depende de la región y puede cambiar. No garantiza que el título se pueda ver. Walplay no aloja ni transmite contenido. |

`{{host}}` is derived from the validated destination URL and displayed as text. The link opens in a
new tab; the notice is visible and exposed to assistive technology. The disclaimer is visible without
interaction and is not hidden in a tooltip. It is rendered in the available, no-information,
unsupported-region, and stale states. The error state uses the error copy instead, because it
presents no availability claim.

## Attribution

| Key | English | Spanish |
|---|---|---|
| `detail.availability.attribution.justWatch` | Availability data provided by JustWatch | Datos de disponibilidad proporcionados por JustWatch |
| `detail.availability.attribution.sectionLabel` | Availability attribution | Atribución de disponibilidad |

Rules:

- The JustWatch attribution is visible in or adjacent to the availability section without
  interaction.
- The existing TMDB attribution (logo and notice) remains visible on the detail page. The
  availability attribution is additional, not a replacement.
- Do not invent a JustWatch logo, wordmark, or link treatment. The exact official treatment is
  OD-SA4 and is a release gate. The text-only attribution is the fallback until approved.
- Provider logos are omitted unless `AVAILABILITY_LOGOS_ENABLED=true`; names remain visible.

## Formatting and language rules

- `Intl.DisplayNames` formats the country name in the active interface locale; if unavailable,
  fall back to the ISO code.
- The ISO code is always shown with the country name to keep the region unambiguous.
- `formatLastUpdated` formats `meta.lastUpdatedAt` and `meta.sourceUpdatedAt` in the active locale.
- Provider names are rendered exactly as supplied (after trimming and dropping unusable values);
  they are never machine-translated.
- The section heading and all Walplay-owned labels, category names, states, notices, dates, and
  accessibility announcements must exist in both English and Spanish.
- Missing translations fall back to English; raw keys must never appear.
- No plural forms are introduced by this feature. If a future copy change adds plurals, add complete
  `_one`/`_other` pairs in both locales.
- The document language remains controlled by the existing locale setup; this feature does not add a
  second language mechanism.

## Test expectations

- Both locale files define the same `detail.availability` keys.
- Every new key is referenced in application source so the unused-key check passes.
- The section label `detail.sections.availability` is unique among section labels.
- English and Spanish renders contain no raw keys.
- Region names, dates, and destination hosts are localized/ formatted according to the active
  locale.
- Provider names remain unchanged across locales.
- A language change does not alter the active region or refetch availability data.
