# ADR 0001: Route Loading and Error Containment

- **Status**: Accepted
- **Date**: 2026-11-20
- **Feature**: `001-app-foundation`
- **Context**: `research.md` R-01 (route loading) and R-02 (render-failure containment)

## Context

The foundation must show a genuine, layout-matching loading state on the first
navigation to each page, and a Retry action that genuinely re-attempts the
preparation. It must also contain a page render failure inside the main content
region so the header, navigation, and skip link stay usable. The constitution
requires functional components and arrow functions in frontend application code,
and the approved stack does not include an error-boundary library.

## Decision

1. **Route content loading** — each page slice is prepared on demand through a
   dynamic `import()` wrapped by `usePageModule(importer)`. The hook models
   `loading | ready | error`, invokes the importer only inside an effect, and
   exposes `retry()` which increments an attempt counter and re-invokes the same
   importer. A settled attempt from an unmounted route is ignored. Rejections are
   held in component state only, so a retry performs real work.

2. **Render-failure containment** — the layout route renders `AppShell`. A
   pathless child route with an `errorElement` (`RouteRenderError`) wraps the page
   routes. A page render error replaces only that pathless route's subtree, which
   lives inside the shell's `<main>`. The shell and its controls remain mounted.
   The fallback focuses its heading and offers a home action, but no retry,
   because re-rendering the same failing component is not a genuine recovery.

## Rejected Alternatives

- **`React.lazy` + `Suspense`** — caches a rejected import for the lifetime of
  the lazy component; Retry cannot genuinely re-attempt the import.
- **React Router route `lazy`** — code-splits, but its revalidation path does not
  re-run a failed `lazy` import, so a genuine retry is not possible.
- **Artificial `setTimeout` delay or stub network request** — forbidden by the
  specification; the skeleton must reflect real work.
- **Class component error boundary or `react-error-boundary`** — conflicts with
  the arrow-function/functional convention and adds an unapproved dependency.
- **Root-level or layout-level `errorElement`** — would unmount the shell or
  replace the whole layout, violating fault isolation.

## Consequences

- First navigation to a page may briefly show the skeleton; a dynamic import
  served from the browser module cache resolves without a visible loading state,
  which is correct because the content is already prepared.
- Each page is emitted as its own chunk (verified in the production build), and
  the shell chunk remains separate.
- The route-level state machine and the router error element have separate,
  explicit recovery semantics: retry for preparation failures, home recovery for
  render failures. Tests in `src/app/routing/` cover both paths.
