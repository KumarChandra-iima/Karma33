# Karma33 — Test Plan

Last updated: 2026-06-21

## Scope

Covers everything currently implemented in `src/App.jsx` (the canonical root scaffold, ported from `karma28.jsx`): onboarding, all four Yoga & Dhyan practices, IdealWeight, Kommunicate, Admin panel, calendar/streaks, audio engine, and the PWA shell added in this round of work.

## Strategy

Given the app started with **zero automated test coverage** on a single 2,600+ line component, testing is being built up in layers rather than attempted all at once:

1. **Unit tests (Vitest)** — pure, side-effect-free logic only. Started with `src/tokens.js` (`buildTheme`, tab configs). Next candidates as they get extracted from `App.jsx`: streak/completion computation, schedule generation (`buildSchedule`), breath-pattern/timing math (Bhastrika pacing, Kriya 20/40/40 duration-fitting). Pure functions are extracted *before* being tested — testing logic still entangled with React state/localStorage I/O isn't worth the mocking overhead.
2. **Component tests (Vitest + React Testing Library)** — for components with non-trivial conditional rendering once they're extracted into their own files (e.g. `DotCal`, `StreakRow`, practice setup screens). Not yet started — blocked on the monolith decomposition work tracked in `docs/CODE_REUSE_ANALYSIS.md`.
3. **Manual / visual QA** — for anything timer-driven, audio-driven, or requiring real device permissions (mic recording, speech synthesis, notifications) that doesn't meaningfully unit-test. See `qa/TEST_CASES.md`.
4. **Deployment verification** — every build is checked against a real running instance (local preview and/or the live Vercel URL) using `dev-control/scripts/verify-deployment.sh` (Playwright screenshot + local Ollama vision-model judgment), not just "the build command exited 0."

## Out of scope for now

- End-to-end browser automation (e.g. full Playwright test suite driving actual user flows) — flagged in `qa/AUTOMATION_PLAN.md` as a future addition once the component decomposition makes selectors stable.
- Load/performance testing — not relevant pre-launch with no real traffic.
- Native (Capacitor) app testing — no native build exists yet.

## Entry/exit criteria

- A change is **mergeable** when: `npm run build` succeeds, `npm test` passes, and (for anything affecting rendered output) a deployment verification check returns PASS.
- A milestone/module is **QA-signed-off** only with evidence recorded in `qa/QA_EXECUTION_REGISTER.md` and `qa/QA_SIGNOFF.md` — per `ClaudMasterInstruction.md`'s mandatory rule, never marked passed without execution proof.
