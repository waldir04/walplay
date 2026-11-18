<!--
Sync Impact Report
==================
Version change: none → 1.0.0
Bump rationale: Initial ratification. 1.0.0 is the baseline constitution for Walplay;
there is no prior version to remain compatible with.

Modified principles: none (new document).

Added sections:
- Core Principles I–XXI.
- Visual Identity and Design System (Walday Dark UI / Calm Tech Dark).
- Technology Stack and Architectural Boundaries.
- Development Workflow, Quality Gates, and Definition of Done.
- Architectural Decisions Intentionally Deferred.
- Governance.

Removed sections: none.

Adaptation notes:
- Walday product-specific rules were excluded: weather providers and weather caching,
  daily tasks and agenda management, planning suggestions, task-row interactions,
  weather-specific visual indicators, and guest-data migration mandates.
- Walplay-specific requirements were added: mandatory frontend arrow functions,
  content-provider and playback integration rules, the zero-unexpected-warnings policy,
  and the Conventional Commits workflow.

Follow-up TODOs:
- Ratification date is recorded as the initial adoption date, 2026-11-18.
- `docs/product-overview.md` does not exist yet in the Walplay repository; product scope
  MUST be defined there before feature specifications are authored.
- Provider selection, playback feasibility, and live-television support remain deferred
  pending validated product requirements and technical research.
-->

# Walplay Constitution

This document defines **how** Walplay must be engineered. Product scope, functionality, and
business requirements are defined in `docs/product-overview.md` and in feature specifications.
Where the two overlap, the product overview governs product behavior and this constitution
governs engineering standards.

Walplay is part of the same product family as Walday. The shared engineering standards and the
shared visual identity are defined here once and apply to every Walplay surface. The Walday
reference material in `docs/reference/walday/constitution.md` and
`docs/reference/walday/logo.svg` is the authoritative source for the shared brand identity; this
constitution is the authoritative source for Walplay engineering governance.

## Core Principles

### I. Clean Code, SOLID, and Simplicity (NON-NEGOTIABLE)

The codebase MUST prioritize readability, maintainability, and clarity.

- Follow Clean Code principles and apply SOLID where appropriate.
- Write self-documenting code with meaningful names for variables, functions, components,
  classes, and modules.
- Prefer simple and explicit solutions over unnecessary abstractions.
- Keep functions and components focused on a single responsibility.
- Each module MUST have one primary reason to change.
- Avoid duplicated logic and unnecessary coupling.
- Avoid premature optimization and overengineering.
- Do not introduce speculative abstractions for imagined future needs; solve the problem at
  hand.
- Use abstractions when they provide clear benefits, not merely to follow a pattern.
- Keep business logic separate from presentation, HTTP, and infrastructure concerns.
- Avoid excessively large files, components, functions, and modules. A unit MUST remain
  reviewable in a single pass; split it by responsibility rather than by line count.
- Comments explain complex decisions, constraints, or non-obvious behavior, never what the
  code already expresses.

SOLID and design patterns are applied pragmatically rather than mechanically. Complexity MUST be
justified by a current requirement, not by an anticipated one.

### II. Strict TypeScript and Type Safety (NON-NEGOTIABLE)

TypeScript MUST be used throughout frontend and backend.

Compiler settings:

- `strict: true` MUST be enabled in every TypeScript project, including the solution-level
  configuration and every referenced project.
- `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` MUST also be enabled.
- Relaxing any of these settings requires a constitutional amendment, not a per-project
  decision.

Type discipline:

- The use of `any` is strictly prohibited, whether explicit or implicit.
- `@ts-ignore` and `@ts-expect-error` MUST have an adjacent justification. Prefer
  `@ts-expect-error` with the expected error described. Use them only for genuine third-party
  typing defects.
- Type assertions (`as`) and non-null assertions (`!`) are permitted only at validated
  boundaries and MUST have a written justification. They MUST NOT be used to silence the
  compiler.
- Use `unknown` when a value is genuinely unknown and narrow it safely before use.
- Use generics when they provide meaningful type reuse and stronger type safety.
- Prefer explicit domain types, interfaces, and discriminated unions with well-defined
  contracts.
- Avoid duplicating types when they can be shared through a contract or schema.
- Prefer literal unions over TypeScript `enum`; where the compiler forbids enums (for example
  `erasableSyntaxOnly`), literal unions are mandatory.

Runtime validation:

- External data MUST be validated at runtime with Zod when it enters the application: HTTP
  requests and responses, browser storage, environment variables, and third-party API
  payloads.
- Do not assume API responses, environment variables, or third-party data are valid simply
  because TypeScript types describe them.
- Contract types SHOULD be derived from Zod schemas (`z.infer`) so that validation and static
  types have a single source of truth.
- Prisma types and persistence models MUST NOT be exposed through the API; map them to domain
  models or DTOs.

Type safety MUST be preserved across every application boundary.

### III. Frontend Architecture: Feature-Sliced Design (NON-NEGOTIABLE)

The frontend MUST follow Feature-Sliced Design (FSD).

Layer model:

- The canonical layers are `app`, `pages`, `widgets`, `features`, `entities`, and `shared`.
- Imports MUST flow downward only: `app` may import any lower layer, `pages` may import
  `widgets`, `features`, `entities`, and `shared`, and so on. A layer MUST NOT import from a
  layer above it.
- Slices at the same layer MUST NOT import each other directly. `features` and `entities`
  communicate through their public APIs and are composed by higher layers.
- Each slice exposes a public API through an `index.ts` file. Importing another slice's
  internal files is prohibited.

Responsibilities:

- `shared` contains UI primitives, utilities, configuration, and infrastructure adapters. It
  MUST NOT contain business rules.
- Data-fetching hooks and server-state logic belong in `entities` or `features`, never in
  `shared`.
- `entities` hold domain models, validation, and business rules for a single domain concept.
- `features` hold user interactions and use cases composed from entities.
- `pages` and `widgets` compose features and entities into screens and layout regions.
- `app` holds providers, routing, global configuration, and application-level composition.

Structure:

- Avoid relative import chains that climb directories (`../../../`). Use configured path
  aliases.
- Avoid circular dependencies and uncontrolled cross-feature imports.
- Features MUST remain cohesive and reasonably independent.
- Avoid unnecessary layers or folders without a clear architectural purpose.
- Tests MUST be colocated with their subject or mirrored in a test location without breaking
  layer boundaries.
- Routing structure MUST stay aligned with the FSD layer model.

### IV. Frontend Function Syntax: Arrow Functions (NON-NEGOTIABLE)

All functions written in Walplay frontend application code MUST use arrow function syntax.

This requirement applies to:

- React functional components.
- Custom hooks.
- Event handlers.
- Callback functions.
- Utility functions.
- Data transformation functions.
- Local helper functions.
- Functions passed to array methods and other APIs.

Reference form:

```typescript
const MovieCard = ({ movie }: MovieCardProps) => {
  return <article>{movie.title}</article>;
};

const useMovies = () => {
  // Hook implementation
};

const handleSelectMovie = (movieId: string) => {
  // Handler implementation
};
```

- Traditional `function` declarations MUST NOT be used in frontend application code.
- ESLint MUST enforce this convention automatically. At minimum, `func-style` with the
  `expression` option and `prefer-arrow-callback` MUST be enabled for frontend source files.
- The rule MUST be enforced by the `lint` quality gate; a violation is a defect, not a style
  preference.
- Readability MUST NOT be sacrificed to satisfy the rule. Do not introduce wrapper functions,
  unnecessary currying, or extra abstractions solely to avoid a declaration.
- Generated files, third-party code, and configuration files outside frontend application
  source are out of scope.
- Arrow functions MUST still be typed explicitly where inference would be unclear, and generic
  arrow functions in `.tsx` files MUST use the `<T,>` form where required by the parser.

Backend code is explicitly exempt from this principle and follows Principle V.

### V. Backend Architecture and Modular Design (NON-NEGOTIABLE)

The backend MUST follow a layered, feature-oriented architecture.

Mandatory request flow: `routes → controllers → services → repositories`, with validation,
authentication, authorization, not-found handling, and centralized error middleware.

Layer responsibilities:

- `routes`: path definitions and middleware wiring only. No business logic, no validation
  logic beyond attaching middleware.
- `controllers`: parse validated input, call a service, and map the result to an HTTP
  response. Controllers MUST NOT contain business logic and MUST NOT access Prisma.
- `services`: framework-agnostic business rules, transaction orchestration, and typed domain
  errors. Services MUST NOT depend on Express request or response objects.
- `repositories`: the sole access point to Prisma. Repositories MUST NOT contain HTTP concerns
  or business rules.

Request validation:

- Zod validation is mandatory on **every** endpoint for `body`, `params`, and `query`, even
  when a given part is empty.
- Request bodies MUST use strict schemas (`.strict()`) unless a documented reason justifies
  allowing unknown keys.
- Handler input types MUST be inferred from the validation schemas, not declared separately.

Error handling:

- A single centralized error middleware MUST produce one response envelope, stable
  machine-readable codes, and a correct HTTP status mapping.
- Production responses MUST NOT include stack traces, database errors, or internal
  identifiers.
- Logged errors MUST be correlated with the request and MUST NOT contain secrets or personal
  data.
- Asynchronous errors MUST reach the error middleware without producing unhandled rejections.

Cross-cutting concerns:

- Configuration MUST be typed and validated at startup; the application MUST fail fast on
  invalid or missing configuration.
- CORS MUST use an explicit per-environment allowlist. Wildcard origins MUST NOT be combined
  with credentials.
- Request body size limits MUST be configured.
- Sensitive endpoints (authentication, account changes, credential handling) MUST be rate
  limited, whether at the edge or through approved middleware.

Function syntax:

- The backend MUST use idiomatic TypeScript and select the most appropriate function syntax
  for each situation.
- Arrow functions and traditional function declarations are both acceptable when they improve
  clarity and maintainability. Neither form is mandatory.
- Express and Prisma MUST NOT be coupled to business rules.
- Frontend FSD layers MUST NOT be reproduced in the backend.

### VI. React Component Design and Reusability

React components MUST remain small, focused, and maintainable.

- Prefer small components with clear responsibilities.
- Presentational components MUST NOT fetch data or contain business rules.
- Separate data access, state management, and presentation; extract logic into custom hooks
  when appropriate.
- Component props MUST be explicitly typed. Variant-driven components SHOULD use
  discriminated unions rather than loosely related boolean flags.
- Prefer composition over configuration-heavy components and compound components when they
  provide a meaningful API.
- Keep state as close as possible to where it is needed.
- Avoid deep prop drilling; lift composition or use targeted context rather than introducing
  indiscriminate global state.
- Avoid excessively large JSX structures and deeply nested conditional rendering.
- Use memoization only when there is a demonstrated or reasonably justified performance
  benefit; avoid premature `React.memo`, `useMemo`, and `useCallback`.
- Forms MUST be controlled and validated with a shared Zod schema. Field errors MUST be
  associated with their inputs (for example through `aria-describedby`) and, for longer forms,
  summarized accessibly.

Reusable components have clear APIs, predictable behavior, and appropriate tests.

### VII. Styling, Design Tokens, and Visual Consistency

Tailwind CSS is the only styling mechanism.

- CSS-in-JS, component kits, and additional styling frameworks are prohibited.
- Inline styles are prohibited unless a justified technical need exists.
- `!important` is prohibited unless there is a clear and justified technical reason.
- Arbitrary values are permitted only when the design system has no suitable token.

Design tokens:

- Design tokens MUST have a single source of truth: the Tailwind v4 `@theme` block.
  Duplicated token definitions in any legacy configuration MUST be consolidated into that
  source when the affected area is touched.
- The semantic palette MUST define at least `canvas`, `surface`, `surface-raised`, `border`,
  `text`, `text-muted`, `primary`, `primary-strong`, `danger`, `success`, `warning`, `focus`,
  `tag-border`, and `tag-text`, and MUST meet WCAG AA contrast where used for text and
  interface elements.
- Components MUST NOT contain raw hex colors; they MUST use semantic tokens. The only
exception is the brand mark defined in Visual Identity §6.
- Typography MUST follow an explicit hierarchy (display, title, body, caption) with consistent
  spacing, radius, shadow, and density scales.
- Visual implementation MUST align with the Walday Dark UI identity defined in
  "Visual Identity and Design System (Walday Dark UI / Calm Tech Dark)". Dark mode is the
  default and only approved theme until a later constitutional amendment introduces another
  theme.

Layout and interaction:

- Use semantic HTML and follow a logical heading hierarchy.
- `focus-visible` styling is mandatory on every interactive element and MUST be consistent
  across the application.
- Layouts MUST be mobile-first and fully responsive, verified at 360, 768, 1024, and 1440
  pixel widths.
- No horizontal scrolling may be introduced at supported widths, except inside a deliberately
  contained region recorded as an explicit constitutional exception.
- Touch targets MUST be at least 24 by 24 CSS pixels (44 pixels recommended).
- Motion MUST be minimal and MUST respect `prefers-reduced-motion`.

Mandatory asynchronous UX states: every asynchronous surface MUST implement all of the
following.

- **Skeleton** loading state that matches the final layout. A spinner, loose text such as
  "Loading…", or a layout-shifting placeholder is not acceptable.
- **Empty state** with a clear explanation and a primary call to action when the user can act.
- **Error state** with a localized message and a retry action when retry is meaningful.
- **Success feedback** for mutations that change user-visible data.

Loading and status changes MUST be exposed to assistive technologies (`aria-busy`, live
regions) and MUST avoid avoidable layout shift.

### VIII. Testing, Quality Assurance, and Zero-Warning Policy (NON-NEGOTIABLE)

- Use Vitest and React Testing Library for frontend unit and component testing.
- Use Vitest for backend services, repositories, and route-level integration tests.
- Route integration tests MUST exercise the real application with network dependencies
  mocked.
- Apply the Arrange-Act-Assert (AAA) pattern.
- Test observable behavior rather than implementation details.
- Avoid tests excessively coupled to internal component structure; snapshot-only tests are
  not evidence of correctness.
- Control time and timers deterministically. Unit tests MUST NOT perform real network calls.
- Prioritize meaningful tests for business rules, critical user journeys, and edge cases.
- Test loading, success, empty, and error states, plus relevant boundary states.
- Test Zod validation at boundaries, authorization and ownership rules, transactions and
  rollback behavior, and centralized error middleware.
- Test keyboard interaction and accessible roles for critical journeys.
- Mock external services and network dependencies appropriately.
- Backend business logic, services, validation, and API behavior MUST also be tested.

Coverage: minimum 80% global; approximately 90% for critical business logic and high-risk
functionality. Exclusions MUST be justified and documented. Do not sacrifice test quality to
increase coverage. Coverage is an indicator of completeness, not proof of quality.

Zero unexpected warnings policy. A test suite MUST pass without unexpected warnings or errors.

- React `act()` warnings MUST be resolved.
- Missing React keys and invalid DOM property warnings MUST be resolved.
- Unhandled promise rejections MUST NOT occur.
- Tests MUST NOT leave pending timers, subscriptions, or asynchronous operations.
- Unexpected `console.warn` and `console.error` output MUST be treated as test failures.
- Vitest configuration warnings MUST be resolved.
- Third-party warnings MUST be investigated rather than indiscriminately suppressed.
- Globally disabling console warnings or errors to make tests appear clean is prohibited.
- Explicitly expected warnings MAY be asserted when warning behavior is part of the
  functionality under test.

**No task is complete without the relevant tests written and passing, with no unexpected
warning or error output.**

### IX. Performance and Resource Efficiency

- Avoid unnecessary rendering and expensive computations.
- Apply route-level code splitting and lazy loading where appropriate.
- Separate third-party dependencies into appropriate bundles when beneficial.
- Avoid loading unnecessary resources during initial application startup.
- Use memoization only when justified.
- Use virtualization for large collections when rendering all elements would negatively
  affect performance.
- Optimize network requests: no request waterfalls, no repeated identical requests, and
  deliberate TanStack Query `staleTime` and invalidation behavior.
- Review bundle size and dependency impact whenever a dependency is added.
- Optimize images and assets; encode the required dimensions and use responsive image
  sources for variable-density artwork where appropriate.
- Lazy-load non-critical media and off-screen content.
- Enable HTTP compression for production responses where supported.
- Consider Core Web Vitals and use Lighthouse to identify relevant performance issues.
- Backend queries MUST select only required fields, MUST NOT produce N+1 query patterns, and
  MUST avoid unbounded result sets.
- Establish performance budgets when sufficient baseline information is available.

Performance improvements MUST be based on actual bottlenecks or reasonable architectural
evidence.

### X. Scalability, Resilience, and Fault Isolation

- Keep modules cohesive and loosely coupled.
- Avoid making unrelated features depend on a single external service.
- Handle third-party API failures gracefully.
- Provide meaningful loading, empty, and error states.
- Failure of a non-critical provider MUST NOT prevent unrelated core product functionality from
  working.
- Communicate degraded states explicitly and in a localized way (`stale`, `unavailable`)
  rather than presenting outdated or missing data as current.
- Use explicit timeouts, bounded retries with backoff, and caching with a defined TTL for
  external requests.
- Prefer last-known-good data over hard failure only where the feature contract explicitly
  allows it, and clearly mark it as stale.
- Never propagate raw provider errors to the interface; map them to stable codes.
- Isolate failures per feature and allow partial degradation.
- Avoid uncontrolled propagation of errors between application modules.
- Design interfaces and contracts that can evolve without unnecessary breaking changes.
- Do not introduce premature microservices or distributed infrastructure.

### XI. API Contracts and Independent Deployment (NON-NEGOTIABLE)

- Zod schemas are the source of truth for request and response contracts.
- Shared or synchronized contract schemas MUST be kept consistent between frontend and
  backend and covered by contract tests where duplication is unavoidable.
- Define clear request and response structures for every endpoint.
- Maintain a single error envelope: `{ "error": { "code": string, "message": string,
  "details"?: unknown } }`, with stable machine-readable codes.
- Return correct HTTP status codes and never expose internal implementation details through
  API responses.
- Keep frontend and backend responsibilities clearly separated and deployable independently.
- Configure CORS explicitly for required application origins.
- Do not use unrestricted wildcard CORS policies in production when credentials are involved.
- Keep environment-specific origins and endpoints configurable.
- Apply appropriate HTTP caching headers.
- Never cache user-specific or sensitive responses in shared caches.
- Document API behavior and important contract decisions.

Backend errors MUST provide stable, machine-readable codes so the frontend can display
localized messages. The API versioning strategy remains deferred.

### XII. Constants, Hardcoded Values, and Configuration Management

- Do not scatter magic numbers, unexplained string literals, or business constants throughout
  the codebase.
- Define named constants for meaningful business rules, thresholds, limits, default values,
  and shared application values.
- Centralize configuration that is shared or environment-dependent in a dedicated, typed
  configuration module.
- Environment configuration MUST be validated with Zod at startup on both frontend and
  backend, and the application MUST fail fast when required values are missing or invalid.
- Only public, non-sensitive values may be exposed to the frontend through `VITE_*`
  variables. Secrets MUST never be shipped to the client.
- Direct access to `import.meta.env` or `process.env` MUST be centralized in the
  configuration module; components and services MUST consume validated config, not raw
  environment values.
- Timeouts, TTLs, limits, origins, and provider endpoints MUST be named per-environment
  configuration.
- A `.env.example` MUST be maintained with every documented variable.
- Do not hardcode API URLs, credentials, secrets, environment-specific endpoints, timeouts,
  or other deployment-specific settings.
- Use literal unions or typed structures when they improve consistency and type safety.
- Keep configuration responsibilities separate from business logic.

Practical exception: simple, self-explanatory values intrinsic to an operation may remain
inline when extracting them would reduce readability or add unnecessary indirection. The
objective is to eliminate magic values and duplicated rules, not to create a constant for every
string or number.

### XIII. Security and Data Protection (NON-NEGOTIABLE)

- Never commit secrets, credentials, private keys, or sensitive environment configuration.
- Validate and sanitize external input at appropriate boundaries.
- Apply authentication and authorization checks on every protected backend resource.
- Enforce ownership checks on every user-scoped resource query and mutation to prevent
  insecure direct object references. Never rely on a client-supplied user identifier for
  authorization.
- Never rely exclusively on frontend validation for security.
- Protect against common web vulnerabilities, including injection, XSS, and CSRF, where
  applicable.
- If cookie-based authentication is chosen, cookies MUST be `httpOnly`, `Secure`, and use an
  appropriate `SameSite` policy.
- Authentication tokens MUST NOT be stored in `localStorage`.
- Apply CSRF protection where cookie-based sessions make it relevant.
- Use secure transport through HTTPS in production.
- Apply appropriate security headers, including a Content Security Policy.
- Avoid exposing sensitive information in logs, API responses, or error messages.
- Hash passwords with an established, adaptive algorithm; never store or log plaintext
  credentials.
- Follow least-privilege principles.
- Protect user-specific data and ensure one user cannot access another user's information.
- Enforce request payload limits and rate limiting on sensitive endpoints.
- Treat third-party API responses as untrusted external data.
- Prisma queries MUST be parameterized. Raw SQL (`$queryRaw`, `$executeRaw`) requires written
  justification and safe parameterization.
- `dangerouslySetInnerHTML` is prohibited unless the content is sanitized by a justified,
  reviewed mechanism.
- Data read from browser storage MUST be treated as untrusted and validated on read.
- If locally stored user data is supported, the interface MUST clearly warn that locally
  stored information can be lost if browser storage is cleared or the device changes.
- Provider credentials, API keys, and signing secrets MUST remain on the backend.
- Review authentication, session, and token-management decisions during the appropriate
  planning stage.

### XIV. Accessibility and Inclusive Design (a11y) (NON-NEGOTIABLE)

Target: WCAG 2.2 Level AA. Accessibility is considered during specification, design,
implementation, and testing.

Semantic structure:

- Use semantic HTML elements appropriately; maintain a logical heading hierarchy.
- Use native form controls and interactive elements whenever possible.
- Ensure buttons, links, inputs, and other controls have meaningful accessible names.
- Do not use semantic elements incorrectly to achieve visual effects.
- Use ARIA only when native HTML semantics are insufficient.
- Provide a skip link to the main content where navigation precedes it.
- The document `lang` attribute MUST reflect the active locale.

Keyboard accessibility:

- All essential functionality MUST be available through keyboard interaction.
- Maintain a visible and consistent `focus-visible` indicator and a logical focus order;
  prevent keyboard traps.
- Manage focus appropriately in dialogs, menus, forms, and other interactive components,
  including returning focus to the invoking element when a dialog closes.
- Do not require precise pointer movement to complete essential tasks.

Screen reader support:

- Provide appropriate labels and descriptions.
- Associate form fields with their instructions and validation messages.
- Communicate dynamic changes, loading states, and important status updates; use live regions
  for asynchronous results and localized announcements.
- Ensure meaningful information is not communicated exclusively through icons, colors, or
  visual positioning.
- Use ARIA live regions appropriately; do not use ARIA as a replacement for correct semantic
  HTML.

Visual accessibility:

- Meet WCAG 2.2 AA contrast requirements: at least 4.5:1 for normal text and 3:1 for large
  text and interface components.
- Ensure interactive targets meet the WCAG 2.2 minimum target size.
- Do not use color as the only way to communicate status, availability, or errors.
- Support browser zoom and text resizing; maintain readable typography and sufficient spacing.
- Respect `prefers-reduced-motion`; ensure focus indicators are clearly visible; avoid
  unnecessary animations.

Responsive and touch accessibility:

- Ensure accessible interaction on desktop and mobile devices.
- Provide sufficiently large and well-spaced touch targets per WCAG 2.2.
- Avoid interactions depending exclusively on hover.
- Preserve usability at different viewport sizes and zoom levels.

Forms and validation:

- Provide visible labels and clear instructions.
- Display validation errors meaningfully and accessibly; associate errors with fields and
  provide an accessible error summary for longer forms.
- Communicate submission success and failure; preserve user input when practical after
  validation failures.

Asynchronous interfaces:

- Loading surfaces MUST expose `aria-busy` and announce completion or failure through
  appropriate live regions.
- Skeletons MUST be hidden from assistive technologies when they carry no information, while
  the busy state remains announced.
- Availability, region restrictions, and provider degradation MUST NOT rely exclusively on
  icons or colors and MUST be stated in text.

Media playback (conditional):

- If video playback is introduced, player controls MUST be fully keyboard operable and expose
  their roles and states to assistive technologies.
- Player controls MUST have accessible names, a visible focus indicator, and no keyboard trap.
- Captions and subtitles MUST be supported where the authorized source provides them, and the
  interface MUST state when they are unavailable.
- Autoplay MUST NOT start with audible sound, and playback MUST respect `prefers-reduced-motion`.
- Icon-only player controls MUST expose text alternatives.

Accessibility testing:

- Include accessibility checks in component and integration testing.
- Use tools such as axe-core and Lighthouse where appropriate; these are evaluation tools
  made available in development and CI, not runtime dependencies.
- Test keyboard navigation and focus management.
- Perform manual screen reader checks for critical user journeys.
- Automated tools MUST NOT be considered sufficient proof of accessibility compliance.

Accessibility violations affecting critical user journeys MUST be treated as defects.

### XV. Internationalization and Localization (i18n/l10n) (NON-NEGOTIABLE)

Initial supported languages: English (`en`), Spanish (`es`). The architecture MUST allow
additional languages without structural changes.

The project uses `i18next` and `react-i18next`. These are the approved internationalization
libraries; introducing another i18n library requires a constitutional amendment.

Translation architecture:

- English is the canonical source language for translation keys and developer-facing
  technical artifacts.
- All user-facing interface text MUST be externalized from React components into structured
  translation resources.
- Hardcoded user-facing text inside components is prohibited.
- Use descriptive, consistent translation keys; organize logically by feature or shared
  interface area.
- Keep translation resources separate from business logic.
- Support fallback behavior when a translation is missing; English is the fallback language.
- Persist the user's language preference when appropriate.
- Allow users to switch languages without requiring a full application reload.
- Load translation resources efficiently, using lazy loading where appropriate.
- Translate pluralization and interpolation via the i18n library's safe mechanisms, never
  through ad hoc string concatenation.

Localized content MUST include navigation and interface labels, buttons and actions, form
labels and validation messages, notifications and feedback, empty/loading/error states,
content metadata labels, availability and region notices, playback states, and accessibility
labels and screen reader descriptions.

Locale-aware formatting:

- Format dates, times, numbers, currencies, and units with `Intl` according to the selected
  locale.
- Respect relevant calendar and regional conventions.
- Keep timezone preferences independent from the selected interface language.
- Avoid assuming all users share the same date, time, or measurement conventions.
- Handle dynamic translation interpolation safely.

Backend localization:

- Backend APIs MUST return stable, machine-readable error codes rather than localized
  user-facing messages.
- The frontend MUST translate those codes into the selected language.
- Technical logs and developer-facing messages MUST remain in English.
- If the backend generates user-facing messages, it MUST support an appropriate localization
  strategy.

### XVI. Documentation and Technical Communication

- Developer-facing documentation MUST be written in English.
- Document important architectural decisions and their rationale.
- Keep project documentation aligned with the actual implementation.
- Document setup instructions, environment variables, and development workflows.
- Maintain clear API documentation where appropriate.
- Document non-obvious business rules and important edge cases.
- Prefer concise, useful documentation over excessive or duplicated descriptions.
- Keep technical documentation, code comments, naming conventions, and development artifacts
  in English.
- Ensure documentation changes accompany significant architectural or behavioral changes.
- Record durable architectural decisions as Architecture Decision Records (ADRs).
- Document constitutional exceptions as ADRs, including scope and remediation intent.
- Specifications MUST follow the Spec Kit workflow.
- Every implementation plan MUST include an explicit Constitution Check.
- AI-generated code MUST comply with exactly the same standards as manually written code.

A separate `design-system.md` or `branding.md` is not required. The shared visual identity is
defined in this constitution and in the Walday reference material; a separate document MUST
only be introduced if the identity grows enough to require independent maintenance.

### XVII. Automated Quality Gates, Git Hooks, and Commit Convention (NON-NEGOTIABLE)

- Every application in the repository MUST expose the same script contract, runnable from the
  application directory: `lint`, `typecheck`, `test`, and `build`.
- These scripts MUST be the canonical entry points; Git hooks and CI MUST invoke the same
  commands rather than duplicating their logic.
- Husky and lint-staged MUST be used for Git hooks.
- Pre-commit hooks MUST execute fast checks on staged files, such as formatting and linting.
- Pre-push hooks MUST execute `lint`, `typecheck`, `test`, and `build`.
- Hook execution MUST remain reasonably fast to avoid disrupting the development workflow.
- Do not duplicate expensive validations across multiple stages without a clear reason.
- Critical quality checks MUST also run in CI/CD pipelines, regardless of local Git hook
  execution.
- Local Git hooks MUST NOT be considered a replacement for CI/CD validation.
- Ensure all developers and contributors can install and use the same hook configuration
  consistently.
- Document how to install, execute, and troubleshoot the project's Git hooks.
- Any mechanism to bypass hooks MUST be treated as an exceptional action, not a normal
  development workflow.

Commit convention: Walplay MUST use Conventional Commits.

Commit messages MUST follow `type(scope): description`, where the type is one of:

| Type | Purpose |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fixes |
| `refactor` | Code restructuring without behavior changes |
| `test` | Tests and testing infrastructure |
| `docs` | Documentation changes |
| `style` | Formatting or non-functional style changes |
| `perf` | Performance improvements |
| `build` | Build system and dependencies |
| `ci` | Continuous integration changes |
| `chore` | Maintenance tasks |

Examples:

```text
feat(movies): add movie discovery
fix(auth): resolve session expiration
refactor(api): simplify provider integration
test(watchlist): cover favorite interactions
docs(readme): update setup instructions
```

- Commit-message validation MUST be automated (for example with commitlint) and invoked from
  the Git hook or CI.
- Hook tooling MUST remain development-only and MUST NOT introduce runtime dependencies.

### XVIII. Frontend Server State and Async UX (NON-NEGOTIABLE)

TanStack Query is the only server-state mechanism.

- Server data MUST be read and written through `useQuery` and `useMutation` (or their
  framework-equivalent APIs).
- The following are prohibited: `useEffect` for HTTP requests, manual `fetch` calls inside
  components, and parallel stores that duplicate server data (Redux, MobX, Zustand, or ad hoc
  context stores).
- Data-fetching hooks belong in `entities` or `features`, never in `shared`.

Query discipline:

- A single `QueryClient` is configured at the application root.
- Query keys MUST be produced by a key factory to avoid inconsistent or duplicated keys.
- `staleTime`, `gcTime`, and refetch behavior MUST be deliberate per resource, not left to
  defaults without review.
- Mutations MUST invalidate or update the affected queries after success.
- Optimistic updates are permitted only with a defined rollback path and visible error
  feedback.
- The query cache MUST be cleared on sign-out when authentication exists.
- Sensitive query data MUST NOT be persisted to storage.

Mutation UX:

- Every mutation MUST expose a pending state, prevent duplicate submission while pending, and
  report failure explicitly. Mutations MUST NOT fail silently.
- Every asynchronous surface MUST implement the skeleton, empty-with-CTA, and error-with-retry
  states defined in Principle VII.

Boundary with local persistence:

- `useEffect` is permitted for non-network side effects, including synchronizing local
  persistence, subscriptions, timers, and focus management. It is not permitted for fetching
  or mutating server data.
- Locally stored data is not server state. It MUST be encapsulated behind a storage or
  repository layer (for example in `shared/lib` infrastructure or an entity repository) and
  MUST NOT be read or written ad hoc throughout components.
- Persisted local data MUST be versioned, validated on read, and migrated safely when its
  shape changes.
- Local and remote data MUST NOT be mixed without a defined conflict-resolution strategy.

### XIX. Data Integrity and Persistence with Prisma (NON-NEGOTIABLE)

PostgreSQL and Prisma are the official persistence layer.

Schema and migrations:

- `schema.prisma` is the source of truth for the data model.
- Migrations MUST be versioned, committed, and reviewed. Applied migrations MUST NOT be
  edited.
- `prisma db push` is prohibited in production environments.
- The Prisma Client is the typed access layer. Explicit `select` (or `include` where
  justified) MUST be used to avoid over-fetching.
- `$queryRaw` and `$executeRaw` require written justification and safe parameterization.
- Prisma types MUST NOT leak into API contracts or UI models; map them to domain models and
  DTOs.

Transactions and invariants:

- Transactions are mandatory for multi-write invariants and for create or update operations
  that check for conflicts.
- Partial writes MUST NOT be possible for a single user action.
- Transactions MUST be kept short and free of external network calls.
- If a guest-to-account or local-to-remote migration is introduced, it MUST be explicit,
  transactional on the server, safe against partial failure, and specified before
  implementation.

Modeling:

- Constraints and indexes MUST exist for real query filters and uniqueness rules.
- Foreign keys and `onDelete` behavior MUST be explicit.
- Records MUST have creation and update timestamps; identifiers MUST be UUIDs unless a
  documented reason exists otherwise.
- Status and type fields SHOULD use database enums or constrained values, aligned with literal
  unions in application code.

Ownership and concurrency:

- Every query and mutation on user-owned resources MUST be scoped by the authenticated user
  identifier, and the repository layer MUST enforce ownership.
- Optimistic concurrency control (`updatedAt` or an explicit version field) MUST be used where
  concurrent edits can cause data loss.

### XX. External Integrations and Content Providers (NON-NEGOTIABLE)

Walplay is expected to integrate with external content information providers, streaming
availability services, and potentially video playback sources. No provider is approved by this
constitution; provider selection and feasibility MUST be established through the Spec Kit
workflow before implementation.

Integration architecture:

- Every third-party integration MUST be isolated behind a provider adapter.
- Provider responses MUST be validated with Zod and mapped to internal domain models. Provider
  DTOs MUST NOT reach the UI.
- Business logic MUST NOT be coupled to a single provider; callers depend on internal
  contracts, not provider-specific shapes.
- Provider adapters MUST be replaceable without rewriting feature logic.
- The frontend MUST NOT call provider APIs directly when a secret, proxy, or policy
  requirement applies; those calls belong on the backend.
- Provider responses MUST be treated as untrusted input.

Failure and resilience:

- Requests MUST use an explicit, configurable timeout.
- Retries MUST be bounded, applied to idempotent requests only, and use backoff with jitter.
- Caching MUST use a defined TTL keyed by the request parameters that affect the result.
- Provider failures, timeouts, rate limits, and unavailable services MUST be handled
  gracefully and mapped to stable internal error codes.
- Raw provider errors MUST NOT reach the client.
- Rate limiting from providers MUST be respected; the application MUST NOT make uncontrolled
  or unbounded requests.
- Logs MUST NOT contain secrets or unnecessary personal data.

Legal and authorization:

- Provider documentation, licenses, attribution requirements, and terms of service MUST be
  respected.
- API keys and secrets MUST be kept exclusively on the backend when required.
- Scraping, reverse engineering, bypassing authentication, DRM, geographic restrictions, or
  access controls is prohibited.
- Publicly accessible streaming URLs MUST NOT automatically be considered authorized for
  third-party integration or redistribution.
- Video playback integrations MUST use documented and authorized mechanisms.
- Integrations MUST NOT be implemented against undocumented or unstable private endpoints.
- Availability data MUST NOT be presented as guaranteed; region restrictions and inaccuracies
  MUST be communicated accurately.

Deferred capability rule:

- Live television and external video playback MUST NOT be treated as guaranteed technical
  capabilities.
- Their feasibility, permissions, legal constraints, and technical requirements MUST be
  validated during research and specification before implementation decisions are made.
- Speculative streaming infrastructure, player frameworks, or provider dependencies MUST NOT be
  introduced without a validated requirement.

### XXI. Technology Stack Governance and Dependency Discipline (NON-NEGOTIABLE)

The approved stack is defined in **Technology Stack and Architectural Boundaries**. That table
is closed.

- A new runtime dependency MUST be justified in writing with: the need it addresses,
  alternatives considered, bundle and performance impact, license, security posture, and
  constitutional fit.
- Prefer platform APIs and existing dependencies over adding new ones.
- Duplicated concerns are prohibited by default. Examples: HTTP clients instead of native
  `fetch`, Redux/MobX/Zustand for server state, CSS-in-JS or UI kits alongside Tailwind, form
  libraries that duplicate Zod validation, date libraries instead of `Intl`, and utility
  libraries without a specific need.
- Development-only tooling (ESLint or oxlint, Prettier, Husky, lint-staged, commitlint,
  axe-core, Lighthouse) is permitted without amendment and MUST be documented.
- Lockfiles MUST be committed.
- The Node.js version MUST be pinned in the repository.
- Dependency updates MUST be reviewed; deprecated or unmaintained packages MUST NOT be
  introduced.
- Minor and patch upgrades within an approved major version are routine maintenance. Major
  version upgrades, replacements, or removals require a constitutional amendment.
- Frontend and backend MUST remain independently deployable.

## Visual Identity and Design System (Walday Dark UI / Calm Tech Dark)

The Walday Dark UI is the mandatory visual identity for every Walplay user-facing surface. It is
shared with Walday and is not an opportunity to introduce a different visual direction.
Principle VII governs token mechanics and styling technology; this section defines the canonical
visual values and interaction character. When both apply, the stricter accessibility requirement
wins.

### 1. Personality and Visual Direction

- Walplay MUST present the same calm, refined dark mode ("Calm Tech Dark") as Walday, adapted
  to an entertainment-focused experience.
- The interface MUST feel restful on the eyes, crisp without harsh pure black, and highly
  scannable.
- `#000000` MUST NOT be used as the canvas or as a primary surface color.
- Heavy shadows, glossy effects, unrelated gradients, and decorative animation MUST NOT be
  introduced.
- Entertainment content MAY be visually prominent through artwork, typography hierarchy, and
  spacing. It MUST NOT be achieved through new hues, neon effects, or unrelated decoration.
- The brand logo MUST be the shared Walday W monogram with the `Walplay` wordmark, as defined
  in §6.

### 2. Canonical Dark Palette

The following values are the canonical token definitions. They MUST be defined once in the
Tailwind v4 `@theme` block and consumed through semantic token names. Components MUST NOT
hardcode these hex values.

| Semantic token | Canonical value | Use |
|---|---|---|
| `canvas` | `#0B1215` | Main application background; calm, low-glare backdrop |
| `surface` | `#131D22` | Cards, containers, and content rows |
| `surface-raised` | `#152026` | Nested panels, hover surfaces, and elevated containers |
| `border` | `#23323A` | Subtle 1px boundaries for cards, rows, and controls |
| `text` | `#F3F4F6` | Headings, titles, and primary content |
| `text-muted` | `#8B9BA3` | Timestamps, metadata, and secondary labels |
| `primary` | `#34D399` | Brand logo, active indicators, and primary actions |
| `primary-strong` | `#10B981` | Primary hover and active states |
| `success` | `#34D399` | Confirmed and completed states; MUST pair with text or an icon |
| `warning` | `#FBBF24` | Caution, availability, and non-blocking degradation |
| `danger` | `#F87171` | Destructive actions and error states |
| `focus` | `#34D399` | `focus-visible` rings and active focus indication |
| `tag-border` | `#2A3B44` | Category and status pill border |
| `tag-text` | `#9CA3AF` | Category and status pill label |

Palette rules:

- Text and interactive elements MUST meet WCAG AA contrast against their actual background.
- Color MUST NOT be the sole carrier of state, category, availability, or validation meaning; a
  text label or icon MUST accompany it.
- Darker and lighter state variants MAY be derived from these tokens but MUST preserve the
  approved hue and contrast relationships.
- Product-specific accent surfaces MUST be derived from approved tokens. Introducing new hues
  requires a constitutional amendment.
- Walday product-specific tokens (weather highlights and suggestion-card surfaces) are NOT part
  of the Walplay identity and MUST NOT be introduced without an approved requirement.

### 3. Typography and Numerals

- The primary typeface MUST be Inter, with `system-ui` as the fallback.
- A single geometric sans-serif family MUST be used for interface text; a second display
  typeface MUST NOT be introduced.
- The type hierarchy (display, title, body, caption) and spacing scale MUST be reused; this
  identity does not authorize a parallel scale.
- All numeric data where vertical alignment matters MUST render with `tabular-nums`, including
  timestamps, durations, episode numbers, counts, ratings, and progress percentages.
- Headings MUST express real document structure; typography MUST NOT be used to fake heading
  hierarchy.

### 4. Shape, Spacing, and Row Density

- Main cards and list rows MUST use a 16px radius (`rounded-2xl`).
- Buttons MUST use an 8px radius (`rounded-lg`).
- Category, status, and metadata pills MUST use a fully rounded shape (`rounded-full`).
- Card padding MUST be generous (20px to 24px). Vertical gaps between list rows MUST be 12px
  to 16px.
- Boundaries MUST be expressed with the subtle border token first. Shadows MUST remain minimal
  and MUST NOT provide the only separation between surfaces.
- A list row MUST show at most three primary data points: the leading visual or status
  control, the title with its supporting metadata, and a trailing pill or primary action.
- Secondary actions (edit, remove, reveal more) MUST be hidden by default and revealed smoothly
  on row hover. They MUST also be revealed on keyboard focus and MUST remain visible or
  otherwise directly reachable on touch and narrow viewports; hover MUST NOT be the only
  access path.
- Revealing secondary actions MUST NOT shift the row layout.
- Category and status pills MUST be implemented with the `tag-border` and `tag-text` tokens,
  not arbitrary hex values.

### 5. Motion, States, and Micro-interactions

- Hover borders and state transitions MUST use `150ms ease-out`.
- Hover emphasis on interactive rows MAY use `primary` at 50% opacity on the border.
- All motion MUST respect `prefers-reduced-motion`; reduced-motion users MUST receive the same
  state changes without essential animation.
- Empty states MUST use a calm dark card with a subtle mint icon, a clear explanation, and a
  primary call-to-action when the user can act.
- Success, warning, danger, and conflict states MUST use semantic tokens, include text or an
  icon, and MUST NOT rely on color alone.
- `focus-visible` styling is mandatory on every interactive element, including row actions
  that appear on hover.
- Transitions MUST NOT animate layout-affecting properties in ways that cause visible shift.

### 6. Brand Logo

The Walplay logo MUST preserve the exact same geometric W monogram used by Walday: the same
smooth, rounded wave/check strokes, the same mint color (`#34D399`), the same proportions, and
the same off-white wordmark treatment. The wordmark MUST read `Walplay` instead of `Walday`.

Implementation requirements:

- The logo MUST be an inline SVG React component named `WalplayLogo.tsx` placed under
  `frontend/src/shared/ui/`.
- It MUST reuse the Walday geometry without redesign:

```tsx
<svg
  width="28"
  height="28"
  viewBox="0 0 32 32"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  stroke="#34D399"
  strokeWidth="3.6"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M5 10 L11 22 L16 13 L21 22 L27 10" />
</svg>
```

- The path geometry, stroke width, stroke caps, stroke joins, viewBox, and mint stroke MUST NOT
  be altered or replaced with a different brand symbol.
- The logo is the only approved raw-hex surface: because the mark is the brand asset itself, it
  MAY reference `#34D399` directly. Every other component MUST consume the `primary` token.
- The wordmark MUST use the off-white text token, not pure white.
- Raster logos, externally loaded logo images, and third-party brand marks MUST NOT be used.
- The component MUST expose accessible text so the logo is not unlabeled when it conveys the
  product name.
- The Walday reference file `docs/reference/walday/logo.svg` is the authoritative source for
  the geometry.

### 7. Compliance and Verification

- New UI and any UI touched by a change MUST use the Walday Dark UI tokens, radii, spacing,
  typography, and interaction behavior defined here.
- Reviews MUST verify: no raw hex in components other than the brand logo, no pure-black canvas,
  correct `tabular-nums`, token-only pills, keyboard and touch access to row actions, and WCAG
  AA contrast.
- Responsive verification MUST cover 360, 768, 1024, and 1440 pixel widths and 200% browser
  zoom, with no horizontal scrolling and no hover-only behavior.
- Dark mode MUST be the default and only approved theme.
- Any surface that predates this constitution MUST be migrated when the affected area is
  touched and MUST NOT be used as precedent for new work.

## Technology Stack and Architectural Boundaries

The following stack is approved as of version 1.0.0 of this constitution. Versions indicate the
approved major line; routine minor and patch updates within it do not require an amendment.

| Area | Approved technology | Notes |
|---|---|---|
| Frontend framework | React 19 | Functional components and hooks |
| Language | TypeScript 5 | Strict settings everywhere (Principle II) |
| Build tool | Vite | |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` | `@theme` is the only token source |
| Routing | React Router 7 | Routing structure aligned with FSD |
| Server state | TanStack Query | Exclusive server-state mechanism (Principle XVIII) |
| Validation | Zod | HTTP, storage, environment, and external API boundaries |
| Internationalization | i18next, react-i18next | English and Spanish initially; no alternative i18n library |
| Frontend testing | Vitest, React Testing Library, jest-dom | |
| Lint and formatting | ESLint, Prettier (oxlint permitted) | Development tooling |
| Backend runtime | Node.js LTS | Version pinned in the repository |
| Backend framework | Express | |
| Backend language | TypeScript | Same strict settings as frontend |
| Backend validation | Zod | `body`, `params`, and `query` on every endpoint |
| ORM | Prisma | Sole persistence access layer (Principle XIX) |
| Database | PostgreSQL | |
| Backend testing | Vitest | Services, repositories, and route integration |
| Authentication | Deferred | Provider and session strategy defined by product specification |
| Content metadata providers | Deferred | Provider adapters only (Principle XX) |
| Streaming availability providers | Deferred | Provider adapters only; authorization and terms verified |
| Video playback | Deferred | Documented, authorized mechanisms only; feasibility required |

Architectural boundaries:

- Walplay is a React single-page application backed by an independent JSON API.
- GraphQL, microservices, server-side rendering, and a shared backend-for-frontend layer are not
  part of the approved architecture unless added by amendment.
- The frontend lives in `frontend/`; the backend lives in `backend/`. Frontend and backend MUST
  be deployable independently.
- Environment-specific origins and endpoints MUST be configurable per environment.
- The stack is changeable only through a constitutional amendment. A feature specification or
  implementation plan MUST NOT introduce a technology outside this table.
- The backend MUST expose a documented JSON contract; the versioning mechanism remains
  deferred.

Frontend standards:

- Use functional React components and hooks with arrow function syntax (Principle IV).
- Keep presentation, application state, and business logic appropriately separated.
- Use TanStack Query as the exclusive server-state mechanism.
- Avoid global client-state libraries unless a concrete requirement justifies one.
- Use accessible, reusable UI components aligned with the design tokens.
- Validate forms with Zod schemas shared with the boundary contract where possible.
- Ensure asynchronous operations expose loading, empty, success, and failure states.
- Review bundle size and dependency impact when adding libraries.
- Keep routing and navigation consistent with the feature structure.

Backend standards:

- Use TypeScript consistently across the backend.
- Use idiomatic function syntax; arrow functions are not mandatory.
- Keep controllers focused on HTTP request and response handling.
- Place business rules in application or domain services.
- Validate every request at the system boundary.
- Use centralized error handling with stable codes.
- Avoid leaking database or infrastructure details into business logic or API responses.
- Keep database operations predictable and efficient.
- Use transactions when business consistency requires them.
- Keep API responses consistent.
- Avoid unnecessary abstractions or infrastructure.

## Development Workflow, Quality Gates, and Definition of Done

### Specification workflow

Before creating or modifying a feature specification, implementation plan, or task list, the
work MUST review:

1. `docs/product-overview.md` for product scope and business rules.
2. This constitution for engineering standards.

The Spec Kit flow is: specification, then plan including an explicit Constitution Check, then
tasks, then implementation.

- A plan's Constitution Check MUST reference principles by number and name. Renumbering
  principles is prohibited for this reason.
- Specifications authored after this ratification MUST also evaluate Principles XVIII through
  XXI, in addition to the principles they directly touch.
- Requirements that conflict with this constitution or the product overview MUST be identified
  explicitly rather than silently reinterpreted.
- If a significant product decision changes, the author MUST determine whether
  `docs/product-overview.md` also needs an update.
- Product features, providers, and integrations MUST NOT be invented in a plan or constitution
  amendment. Unvalidated capabilities remain deferred.

### Quality gates

- Every application MUST expose `lint`, `typecheck`, `test`, and `build` scripts and they MUST
  pass before a task is considered complete.
- Pre-commit checks MUST run fast validation such as linting and formatting of staged files.
- Pre-push checks MUST run `lint`, `typecheck`, `test`, and `build`.
- CI MUST run the same commands and MUST be mandatory for pull requests.
- Git hooks MUST NOT replace CI validation.
- Bypassing hooks or CI is an exceptional action that MUST be justified and reviewed.
- The zero-unexpected-warnings policy (Principle VIII) is part of the `test` gate.

### Definition of Done

A task is complete only when all of the following hold:

- The implementation complies with this constitution.
- `lint`, `typecheck`, `test`, and `build` pass.
- Relevant tests exist for new business logic and critical flows, and they pass.
- No unexpected warnings or errors are emitted by tests.
- No `any`, unjustified type assertions, or unjustified suppressions were introduced.
- Type safety is preserved at every application boundary.
- Untrusted data is validated with Zod at every boundary it crosses.
- Loading, empty, error, and success states are implemented for asynchronous surfaces.
- Keyboard interaction, focus behavior, and responsive layout at supported widths were
  verified.
- User-facing content is available in both English (`en`) and Spanish (`es`).
- Documentation or an ADR was updated when architecture, contracts, configuration, or behavior
  changed.
- No secrets, credentials, or unauthorized integrations were introduced.
- CI is green.
- The change complies with this constitution, and any exception is recorded and justified.

### Code review

- Reviews MUST verify constitutional compliance, not only functional correctness.
- Reviewers MUST check for duplicated logic, unnecessary complexity, type safety, runtime
  validation, test quality, accessibility, responsive behavior, performance impact, security
  implications, and documentation.
- Reviewers MUST verify that frontend code uses arrow functions and that backend code uses
  appropriate function syntax without enforcing frontend conventions in the backend.
- Exceptions MUST be recorded and justified; silent deviations are defects.
- AI-generated code MUST meet the same quality, security, testing, and review standards as
  manually written code.

## Architectural Decisions Intentionally Deferred

The constitution MUST NOT prematurely lock down decisions that require further product or
technical analysis. The following remain open until the relevant specification and planning
work:

- Product scope, feature set, and business rules. `docs/product-overview.md` does not exist yet
  and MUST be established before feature specifications are authored.
- Authentication provider selection, account model, and configuration.
- Session management and token strategy.
- API versioning strategy.
- Hosting, deployment, and environment topology.
- Monitoring, logging, and observability tooling.
- Specific caching policies beyond the requirements in Principles X and XX, and performance
  budgets.
- The mechanism for sharing API contracts between frontend and backend.
- Where rate limiting is enforced (edge/proxy versus application middleware).
- Detailed database schema and relationships, defined per feature specification within the
  constraints of Principle XIX.
- Selection of content metadata, streaming availability, and playback providers.
- Feasibility, authorization, legal constraints, and technical viability of video playback and
  live television.
- PWA offline capabilities and synchronization behavior.
- Guest or local-only usage models and any migration to an account.

These decisions MUST be made through the Spec Kit workflow and documented when they have
meaningful architectural impact. Do not introduce infrastructure or design patterns solely
because they are common in larger systems.

## Governance

The constitution is the authoritative source of Walplay engineering standards.

- All specifications, plans, tasks, and implementation work MUST be consistent with the
  constitution.
- New features MUST respect the established architectural and quality standards.
- If an implementation decision conflicts with a constitutional principle, the conflict MUST be
  explicitly identified and resolved.
- Any exception MUST have a clear justification and, when durable, an ADR.
- Changes to the constitution MUST be intentional and reviewed.
- Do not weaken an existing principle merely to accommodate a shortcut or temporary
  implementation convenience.
- The Walday reference material governs shared brand identity; this constitution governs
  Walplay engineering. A genuine conflict between the two MUST be resolved by amendment, not
  by silent divergence.

### Recorded exceptions

These are narrow, explicitly accepted deviations from a principle's default rule. They do not
amend or weaken the principle for any other area and MUST NOT be cited as precedent.

- None recorded at ratification.

### Amendments

1. Propose the change with its rationale and affected principles.
2. Classify the version bump according to the rules below.
3. Review the change for conflicts with `docs/product-overview.md` and existing
   specifications.
4. Update affected templates, plans, and specifications that cite the changed principles.
5. Record the amendment date in the footer.

### Versioning

The constitution uses semantic versioning:

- MAJOR: incompatible changes to existing principles, principle renumbering, removal of a
  principle, or governance changes.
- MINOR: new principles or sections, or materially expanded guidance.
- PATCH: clarifications, corrections, or wording improvements that do not change the intended
  requirements.

### Compliance review

- Reviews MUST verify compliance with this constitution.
- Compliance review covers architecture, type safety, validation, testing, accessibility,
  internationalization, performance, security, and dependency discipline.
- A deviation that is not recorded and justified is a defect.
- Recurring deviations indicate that the constitution or the implementation approach requires
  an explicit amendment, not repeated exceptions.

### Transitional compliance

- New code and changed code MUST comply with this version immediately.
- Existing code that predates this version MUST be brought into compliance when the affected
  area is touched, and MUST NOT be used as precedent for new work.
- Pre-existing debt MUST NOT block unrelated features, but a change MUST NOT introduce new
  violations.
- Violations affecting security, data integrity, or accessibility of critical journeys take
  priority over cosmetic compliance.
- Deviations MUST be recorded in the known-gaps register below or in an ADR until resolved.

### Known-gaps register (as of 1.0.0)

These gaps are tracked, not accepted as compliant behavior. Each MUST be closed when the
affected area is touched.

- `docs/product-overview.md` has not been authored; Principles and product-dependent
  decisions remain untestable until product scope is defined.
- The backend application does not exist yet; Principles V, XI, XIX, and XX describe its
  mandatory target state.
- The frontend design tokens, dark theme, shared UI primitives, and `WalplayLogo.tsx` are not
  yet implemented; the Visual Identity section describes their mandatory target state.
- Provider integrations and playback capability are unselected and unvalidated; no integration
  may be implemented until a specification approves it.

The constitution evolves as the project matures, but every change MUST preserve its role as a
consistent engineering standard.

**Version**: 1.0.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
