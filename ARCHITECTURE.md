# Architecture Notes

## Paper Stats Layering

The paper stats area uses a clear 3-layer structure:

1. Data/state layer: `components/use-paper-stats-data.ts`
2. Orchestrator layer: `components/paper-stats-overview-v2.tsx`
3. Presentation layer:
   - `components/paper-stats-teacher-section.tsx`
   - `components/paper-stats-student-section.tsx`
   - `components/paper-question-block.tsx`

Compatibility entry:
- `components/paper-stats-overview.tsx` re-exports `paper-stats-overview-v2`.

## Responsibilities

### 1) Data/state layer (`use-paper-stats-data`)

Owns:
- API requests and cancellation (`AbortController`)
- URL query sync (`replaceUrlWithQuery`)
- Derived lists/summaries/filtering/sorting
- UI state needed for stats interaction (mode, filters, visible count)

Does not own:
- JSX layout and styling details for teacher/student blocks

### 2) Orchestrator layer (`paper-stats-overview-v2`)

Owns:
- Page header composition
- Wiring hook output into presentation components
- High-level variant branching (`teacher` vs `student`)

Does not own:
- Raw fetch logic
- Heavy list transforms

### 3) Presentation layer

Owns:
- Visual rendering only
- Callbacks passed from parent

Rules:
- Keep presentation components stateless where possible.
- If local UI state is needed, keep it local and UI-only (e.g. expand/collapse).

## Performance Rules

- Abort in-flight requests when dependencies change.
- Memoize expensive derived data in the hook, not in presentation components.
- Avoid unnecessary history updates; only `replaceState` when URL actually changes.
- Use memoized list items (`paper-question-block`) for large lists.

## Extension Guide

When adding a new stats feature:

1. Add data fetch/derive logic in `use-paper-stats-data.ts`
2. Expose minimal typed outputs from the hook
3. Pass outputs via `paper-stats-overview-v2.tsx`
4. Render in teacher/student presentation components
5. Keep URL sync centralized through `replaceUrlWithQuery`

## Refactor Safety Checklist

Before merge:

- `npm run lint`
- `npm run build`
- Verify both routes:
  - `/papers/overview`
  - `/teacher/papers-overview`
- Verify mode switch, year filter, sort, and student selection behavior

## Naming and File Organization Conventions

Use the following conventions for future stats work:

- Hooks:
  - Prefix with `use` and place in `components/` when UI-scoped.
  - Example: `use-paper-stats-data.ts`.
  - Keep return shape explicit and stable; avoid leaking internal state names.

- Orchestrator components:
  - Suffix with `-overview` or `-panel` for composition components.
  - Should wire data + sections only; avoid heavy computation.

- Presentation sections:
  - Use `*-section.tsx` naming for teacher/student blocks.
  - Keep them mostly stateless; receive typed props from orchestrator.

- Reusable leaf UI:
  - Use focused names for list/row/cards, e.g. `paper-question-block.tsx`.
  - Local state is allowed only for local interaction (expand/collapse, tabs).

- Compatibility wrappers:
  - If replacing old entries, keep thin re-export wrappers temporarily.
  - Add a short comment in PR/notes when wrapper can be removed.

Recommended structure for this area:

- `components/use-paper-stats-data.ts`
- `components/paper-stats-overview-v2.tsx`
- `components/paper-stats-teacher-section.tsx`
- `components/paper-stats-student-section.tsx`
- `components/paper-question-block.tsx`
- `components/paper-stats-overview.tsx` (compat re-export)

## Testing Guidance

Use lightweight Node tests for pure logic and URL helpers:

- Test runner:
  - `npm run test`
  - Current command: `tsx --test tests/**/*.test.ts`

- Test file naming:
  - Place under `tests/`
  - Use `*.test.ts`
  - Example:
    - `tests/paper-stats-utils.test.ts`
    - `tests/client-url.test.ts`

- What to unit test:
  - Pure transforms/sorting/filtering functions in `lib/`
  - URL query synchronization helpers
  - Edge cases (invalid filters, no-op updates, empty rows)

- What to keep out of unit tests here:
  - Full React rendering snapshots for these sections
  - End-to-end API + UI flows (handle separately if needed)

- Minimum regression set for paper stats:
  - Year filter normalization
  - DP1 ordering transform
  - Student paper sort behavior (`risk_high`, `risk_low`, `latest`)
  - URL replace behavior (update/delete/no-op/window-undefined)

