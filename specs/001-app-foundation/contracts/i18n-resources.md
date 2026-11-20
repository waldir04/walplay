# Contract: Internationalization Resources

**Feature**: `001-app-foundation` | **Type**: translation resource contract

All user-facing interface text is externalized (FR-017). English is canonical and the fallback.
Spanish must be complete for every key used by the foundation.

## Resource files

| File | Locale | Role |
|---|---|---|
| `shared/i18n/resources/en.json` | `en` | Canonical source; defines key set |
| `shared/i18n/resources/es.json` | `es` | Complete translation; structurally identical to `en.json` |

Both files are bundled. No runtime request loads translations.

## Initialization contract

| Setting | Value |
|---|---|
| `fallbackLng` | `en` |
| `supportedLngs` | `['en', 'es']` |
| `load` | `'languageOnly'` behavior via base-subtag resolution |
| `initImmediate` | `false` (synchronous first paint) |
| `interpolation.escapeValue` | `false` (React escapes output) |
| Default namespace | `translation` |

`<html lang>` is updated on initialization and on every `languageChanged` event.

## Required key schema

Namespaces are flat, dot-delimited key strings. Every key below must exist in both locales.

### `app`
| Key | English intent |
|---|---|
| `app.name` | `Walplay` (brand name, identical in both locales) |
| `app.tagline` | One-sentence description of the entertainment discovery purpose |

### `navigation`
| Key | English intent |
|---|---|
| `navigation.label` | Accessible name of the primary navigation region |
| `navigation.home` | Home destination label |
| `navigation.settings` | Settings destination label |
| `navigation.openMenu` | Accessible name for opening the compact menu |
| `navigation.closeMenu` | Accessible name for closing the compact menu |
| `navigation.menuTitle` | Visible/accessible title of the compact menu |

### `meta`
| Key | English intent |
|---|---|
| `meta.title.home` | Document title for home |
| `meta.title.settings` | Document title for settings |
| `meta.title.notFound` | Document title for not-found |
| `meta.title.app` | Application name suffix used in titles |

### `a11y`
| Key | English intent |
|---|---|
| `a11y.skipToContent` | Skip link label |
| `a11y.navigatedTo` | Route-change announcement; interpolates `{{title}}` |
| `a11y.loading` | Busy-region label for route loading |
| `a11y.currentPage` | Screen-reader confirmation of current destination (if used) |
| `a11y.languageChanged` | Polite confirmation of a language change |

### `home`
| Key | English intent |
|---|---|
| `home.title` | Page heading |
| `home.empty.title` | Empty-state heading |
| `home.empty.description` | Explains purpose and that content is not yet available |

The home page must not expose any title, artwork, availability, rating, or promotional copy.

### `settings`
| Key | English intent |
|---|---|
| `settings.title` | Page heading |
| `settings.description` | Short read-only statement of the page's purpose |
| `settings.language.label` | Accessible group label for the language choice |
| `settings.language.helper` | Optional helper text describing the effect of the choice |
| `settings.language.storageNotice` | States that the preference is stored only in this browser and may be lost if browser storage is cleared or the device changes |

Settings must not display version, environment, account, or other diagnostic content (FR-007). It must display the localized local-storage notice alongside the language control.

### `states`
| Key | English intent |
|---|---|
| `states.loading.title` | Loading heading (skeleton carries layout; text is supplementary) |
| `states.error.title` | Route-load failure heading |
| `states.error.description` | Calm, localized explanation |
| `states.error.retry` | Retry action label |
| `states.notFound.title` | Not-found heading |
| `states.notFound.description` | Explains the page does not exist |
| `states.notFound.home` | Home action label |
| `states.empty.title` | Generic empty-state heading |
| `states.empty.description` | Generic empty-state explanation |

### `languages`
| Key | English intent | Spanish |
|---|---|---|
| `languages.en` | `English` | `English` |
| `languages.es` | `Español` | `Español` |

Endonyms are intentionally identical across locales and are never translated into the other
language (FR-023).

### `errors`
| Key | English intent |
|---|---|
| `errors.config.title` | Safe configuration-failure heading |
| `errors.config.description` | Generic explanation with no technical detail |
| `errors.render.title` | Safe rendering-failure heading |
| `errors.render.description` | Generic explanation with no technical detail |
| `errors.render.home` | Home recovery action label |

## Rules

- No hardcoded user-facing string may appear in a component; review and lint catch literal JSX text.
- No raw key, blank string, or English key name may leak into the interface.
- Interpolation uses i18next syntax; no string concatenation (FR-022).
- No date, number, or plural values are displayed initially. When introduced, they use `Intl` and i18next plural keys, never ad hoc formatting.
- The document title is composed from `meta.*` resources only.
- Announcement strings must be cleared before reuse so a stale language is never announced
  (FR-016).
- Spanish copy must be reviewed at 360 px and 200% zoom for wrapping without clipping (FR-019,
  US4 scenario 6).

## Missing-translation behavior

A missing Spanish key falls back to the English value. It must never render the key, `undefined`,
or an empty element. A parity test asserts both resource files expose the same leaf-key set.
