# Contract: Language Preference Persistence

**Feature**: `001-app-foundation` | **Type**: browser storage contract

The preference is the only persisted value in the foundation. It is untrusted on read and is always
validated before use.

## Storage key

```text
walplay.language.v1
```

The version suffix is part of the key. A future incompatible shape uses `walplay.language.v2` and
must still read/migrate/ignore `v1` safely.

## Stored shape

```json
{ "version": 1, "locale": "en" }
```

| Field | Type | Rules |
|---|---|---|
| `version` | literal `1` | Must equal `1`; any other value is outdated |
| `locale` | `"en" \| "es"` | Must be in the supported locale set |

- The schema is strict: unknown fields cause rejection unless a version bump adds them.
- The value is serialized with `JSON.stringify` and parsed with `JSON.parse` inside a guarded block.
- No personal data, timestamp, or device identifier is stored.

## Read algorithm

```text
try read key
  └─ null/absent ───────────────────────► persistence = absent
  └─ parse error ───────────────────────► persistence = invalid
  └─ schema/version/locale mismatch ────► persistence = invalid
  └─ valid ─────────────────────────────► persistence = stored, use locale
storage access throws ──────────────────► persistence = unavailable
```

In every non-valid case the resolved locale comes from the detection chain:
**stored → `navigator.languages` base-subtag match → `en`**.

## Write algorithm

```text
visitor selects a locale
  ├─ write succeeds ──► persistence = stored
  └─ write throws ────► persistence = unavailable; session still changes
```

A write failure must never block the language change or surface a raw storage error.

## Session guarantee

`sessionValue` is always set after bootstrap. Even with storage disabled, the visitor can switch
between English and Spanish for the current session (FR-020).

## Detection chain (first visit or invalid stored value)

| Input | Result |
|---|---|
| `navigator.languages = ['es-MX', ...]` | `es` |
| `navigator.languages = ['es-419', ...]` | `es` |
| `navigator.languages = ['en-GB', ...]` | `en` |
| `navigator.languages = ['fr-FR', 'es-ES']` | `es` (first supported preference wins) |
| `navigator.languages = ['fr-FR', 'de-DE']` | `en` (canonical fallback) |
| `navigator` unavailable or `languages` empty | `en` |

## Security and privacy

- The stored value is treated as untrusted external input (Principle XIII).
- No authentication token or user content is stored here; `localStorage` is acceptable for this
  preference.
- A visible storage-loss warning is **not** required for an interface preference, because the
  application safely recovers by detection. If user content is ever stored locally, that warning
  becomes mandatory (Principle XIII, BR-10).
- No analytics or tracking is written alongside this key.

## Test obligations

- Valid value is restored across a simulated reload.
- Invalid JSON, wrong version, unsupported locale, missing key, and throwing storage each fall back
  without throwing.
- Selection persists after a reload when storage works.
- Selection still applies for the session when storage throws.
