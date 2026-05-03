# AGENTS.md

## Project Context
- CRM application built with Angular.
- Stack: Angular + PrimeNG + `node_modules/drstyles` as the UI/design system.
- Always review and follow documentation from `node_modules/drstyles` when working on UI, styles, or visual patterns.
- Prioritize small, clear changes aligned with the existing architecture.
- Before modifying shared logic, evaluate impact on `sidebar`, `home`, navigation, and laundry-related modules.

## Working Preferences
- Do not spend time on unit tests unless explicitly requested.
- For maintenance or adjustments, prioritize implementation and functional validation over test coverage.
- Avoid unnecessary changes outside the requested scope.
- Do not refactor working code purely for style.

## Navigation and UI
- Maintain consistency between sidebar menu, `home` shortcuts, and actual application routes.
- When adding a new navigable feature, validate whether it must also appear in `sidebar` and `home`.
- Avoid duplicating navigation configuration if a single source of truth can be used.
- In `src/app/modules/laundry/pages/form-preview`, prefer classes and patterns from `node_modules/drstyles` first.
- In `src/app/modules/laundry/pages/form-preview`, avoid custom colors and avoid custom classes outside `drstyles` and PrimeNG whenever possible.
- If `drstyles` does not provide an adequate solution in `src/app/modules/laundry/pages/form-preview`, use PrimeNG classes and PrimeNG color tokens/list before introducing custom styling.
- Any UI action that triggers async processes (API calls, sockets, state changes) must provide clear loading feedback.
- Any screen that loads data asynchronously on init, route change, filter change, refresh, or similar flow must include `LoaderDialogComponent` or an equivalent blocking loader while that data is being fetched.
- If a button triggers an async action (`async/await`, HTTP request, `fetch`, observable subscription, socket event, or similar), the button must be disabled until the action finishes, whether it succeeds or fails.
- Any failed user-triggered action must show a clear failure message to the user.
- If the action affects critical business state or may cause double submissions or inconsistent states, use `LoaderDialogComponent` or an equivalent blocking pattern.

## Laundry Module
- Be especially careful with state flows, queue views, and back navigation.
- Do not break transitions between `pending`, `process`, `delivery`, `detail`, and `socket-queues`.
- Before modifying laundry flows, evaluate impact on:
  - state transitions
  - ordering logic
  - socket updates
  - navigation consistency

## Editing Guidelines
- Apply the smallest safe change first.
- Do not rewrite functional code unless necessary to meet the requirement.
- Avoid changes outside the requested scope.
- Prefer reusing existing services, components, and patterns over creating new ones.
- If ambiguity is minor, infer from existing project patterns.
- Ask only when ambiguity blocks a safe or correct implementation.
- When modifying shared logic, consider side effects across related modules.

## Verification
- When possible, validate changes using build, lint, or local functional checks.
- Do not invest time in test suites unless explicitly requested.
- If verification was not performed, state it clearly.

## Response Style
- Be concise by default.
- Remove filler, pleasantries, and unnecessary narrative.
- Prefer short, direct sentences.
- Preserve technical accuracy at all times.
- Keep exact code, paths, identifiers, commands, diffs, and commit messages intact.
- Do not omit relevant warnings, constraints, or risks.
- For code changes, always include:
  1. what changed
  2. why
  3. how to verify

## Compression Modes
- Required skill: `caveman`.
- Install command: `npx skills add JuliusBrussee/caveman`.
- If `caveman` is available, use it as the repository communication rule.
- If `caveman` is not installed, not available in the session, or cannot be applied, fall back to the short, concise response style already defined in this `AGENTS.md`.
- Default: `caveman full`.
- If the user says `caveman`, switch to highly compressed output.
- If the user says `normal mode`, return to standard concise output.
- Compression affects wording only, never technical accuracy, safety, or completeness.

## Caveman Reference
- Reference: https://github.com/JuliusBrussee/caveman
- Install with: `npx skills add JuliusBrussee/caveman`
- Treat `caveman` as a communication rule for collaborators, not as a project dependency.

## Repository Rule
- `AGENTS.md` must remain versioned in this repository so other developers and agents can follow the same collaboration rules.
