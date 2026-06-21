# Karma33 — Automation Plan

Last updated: 2026-06-21

## Stack chosen

| Layer | Tool | Why |
|---|---|---|
| Unit tests | **Vitest** | Already in the Vite ecosystem (same transform pipeline as the app build), fast, no separate config language to maintain. |
| Component tests | **React Testing Library** (`@testing-library/react` + `@testing-library/jest-dom`), running under Vitest + `jsdom` | Standard pairing with Vitest; tests behavior/output, not implementation details. |
| Deployment verification | **Playwright CLI + local Ollama vision model** (`dev-control/scripts/verify-deployment.sh`) | Confirms a deployed URL actually renders a working UI (not a blank/404/error page) without a human opening a browser. See `feedback_ollama_deploy_verification` memory for why this replaced manual checks. |
| End-to-end (future) | **Playwright Test** (not yet added) | The `playwright` CLI is already installed locally; adding `@playwright/test` for scripted user-flow tests (e.g. "complete onboarding → mark Surya Namaskar done → see streak = 1") is the natural next step once components are stable enough that selectors won't constantly break during the monolith decomposition. |

## Current automated coverage

- `npm test` (`vitest run`) — runs `src/tokens.test.js` (7 tests, theme/token logic). This is necessarily small right now because almost all of `src/App.jsx`'s logic is still entangled with React state and is not yet extracted into pure, testable functions.

## Why so little is automated yet

The app was inherited as a single 2,600+ line component with zero existing tests (see `docs/REPOSITORY_ASSESSMENT.md` §6). Rather than write brittle tests against internals that are about to be refactored (see the monolith decomposition item in `docs/CODE_REUSE_ANALYSIS.md`), the automation plan is sequenced to track extraction:

1. Extract a piece of logic into its own pure function/module (e.g. `tokens.js` — done).
2. Write unit tests for it immediately (`tokens.test.js` — done).
3. Repeat for: streak/completion computation, `buildSchedule`, breath-pattern timing math (Bhastrika pacing, Kriya duration-fitting), NLP intent parser.
4. Once components themselves are split out of `App.jsx`, add React Testing Library tests for the ones with real conditional logic (`DotCal`, `StreakRow`, setup screens).
5. Add `@playwright/test` E2E coverage for the 2-3 most critical user flows (onboarding, completing a Yoga practice, viewing the calendar) once (4) makes the DOM structure stable enough that E2E selectors won't need constant rewriting.

## CI

No CI pipeline exists yet (`.github/workflows/` is empty — see `docs/REPOSITORY_ASSESSMENT.md` §6). Recommended next step once test coverage is non-trivial: a GitHub Actions workflow running `npm test` and `npm run build` on every PR. Not added in this pass since there's not yet enough test surface to make a CI gate meaningful, and adding CI config is itself a "modifying CI/CD pipelines" action that should be explicitly confirmed with Kumar first per the standing risk-confirmation rules.
