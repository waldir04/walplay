# Contract: Application Configuration

**Feature**: `001-app-foundation` | **Type**: startup configuration contract

Only public, non-sensitive values are exposed to the browser. The inventory is closed: no other
configuration may be introduced without a specification change (FR-040).

## Inventory

| Variable | Visibility | Required | Default | Accepted values | User-facing surface |
|---|---|---|---|---|---|
| `VITE_APP_ENV` | public | yes | — | `local`, `development`, `staging`, `production` | none |
| `VITE_APP_VERSION` | public | no | `0.0.0` | non-empty version-like string (e.g. `1.4.2`) | none |

**Never allowed in the client inventory**: secrets, API keys, provider credentials, backend URLs,
database URLs, tokens, personal data.

## Validation

- Validation runs exactly once at startup, before the router renders.
- `shared/config/env.ts` is the **only** module that reads `import.meta.env`; all other code receives
  the validated object.
- Access to raw environment values anywhere else is a defect.
- Schema is strict about the environment enum and treats an empty-string version as an invalid optional value: apply `0.0.0` and emit a field-only warning, never fail startup.

## Failure behavior

| Condition | Result |
|---|---|
| `VITE_APP_ENV` missing or not in the enum | Do not render the application; render `AppConfigError` |
| `VITE_APP_VERSION` missing | Apply `0.0.0`; no visitor-facing change; emit a developer-visible warning naming the field only |
| `VITE_APP_VERSION` present but empty/invalid | Apply `0.0.0`; emit a developer-visible warning naming the field only |

`AppConfigError` must:

- be localized in the resolved startup language;
- state that the application cannot start and that configuration must be corrected;
- expose no variable value, stack trace, internal identifier, or file path;
- contain no partially working navigation or shell.

## Developer warning contract

- Written in English.
- Names the field and the rule violated; never prints the value.
- Contains no secret and no unnecessary personal data.
- Emitted once per invalid optional field.

## Local example

A committed `.env.example` documents every variable with safe placeholder values:

```dotenv
# Required. One of: local | development | staging | production
VITE_APP_ENV=local

# Optional. Defaults to 0.0.0 when absent. Never shown in the interface.
VITE_APP_VERSION=0.0.0
```

Local development copies this to `.env.local`. No real secret is ever added to either file.

## Startup order (normative)

1. Resolve initial language (storage → browser base language → English).
2. Initialize i18n with bundled resources.
3. Validate configuration.
4. Valid → render router. Invalid required → render `AppConfigError`.

Steps 1–2 must not depend on configuration, so a configuration failure is still localized.
