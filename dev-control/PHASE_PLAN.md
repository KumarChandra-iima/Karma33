# Karma33 — Phase Plan

Date: 2026-06-21
Status: **Phase 2 (Repository Discovery) complete. Awaiting approval to proceed past Phase 2.**

This plan sequences the remaining phases from `ClaudMasterInstruction.md` based on what Phase 2–4 discovery actually found (see `docs/REPOSITORY_ASSESSMENT.md`, `docs/FEATURE_MATRIX.md`, `docs/CODE_REUSE_ANALYSIS.md`) rather than the generic template order — some phases are reordered where the dependency is clear (e.g. the layout split blocks most of Stream A's other work).

## Phase 0–2 — Done

- [x] Phase 0: Local environment validated (`docs/ENVIRONMENT_VALIDATION.md`) — no blockers.
- [x] Phase 1: Repo already present locally; `docs/`, `dev-control/`, `qa/` created.
- [x] Phase 2: Repository assessment complete (`docs/REPOSITORY_ASSESSMENT.md`).
- [x] Phase 3: Requirement mapping complete (`docs/FEATURE_MATRIX.md`).
- [x] Phase 4: Code reuse analysis complete (`docs/CODE_REUSE_ANALYSIS.md`).

## Decisions needed before Phase 5/6 (blocking)

These came out of discovery and should be resolved with the user before any code changes:

1. Keep, delete, or merge the duplicate `karma28-vercel/karma28-zip/` build (reduced, missing practice players) vs `karma28-vercel/k28zip/` (full, current)?
2. Karma28 → Karma33 storage-key migration strategy: fresh start vs. migrate-on-load.
3. AI provider/model choice for the Kommunicate coaching-feedback backend call.
4. Whether "Settings" should be a new general end-user destination separate from the existing Yoga-focused `AdminPanel`.

## Proposed phase sequence (pending approval)

### Phase 5 — Agent Execution Framework
Create `dev-control/MASTER_STATUS.md`, `dev-control/BUG_REGISTER.md`, `dev-control/AGENT_ACTIVITY_LOG.md`, `dev-control/ESCALATION_REGISTER.md`, `dev-control/live-status.json`. Pure scaffolding, no app code touched — safe to do immediately on approval.

### Phase 5.5 — QA artifacts (parallel, Stream D)
Per the master instruction's QA requirement, `qa/TEST_PLAN.md`, `qa/TEST_CASES.md`, `qa/AUTOMATION_PLAN.md`, `qa/QA_EXECUTION_REGISTER.md`, `qa/QA_SIGNOFF.md` should be drafted before Stream A/B/C development starts, since "development cannot be marked complete until QA passes." Given there is zero existing test infrastructure (no Vitest/Jest, no RTL), the Automation Plan needs to also propose a test-runner choice — recommend Vitest + React Testing Library given the Vite toolchain already in place.

### Phase 6 — Repo hygiene + decomposition (precondition for parallel streams)
Before Streams A/B/C can work in parallel without constant merge conflicts, the single 2,617-line `App.jsx`/`karma28.jsx` needs to be split into modules along the boundaries identified in the Code Reuse Analysis (timers, audio, calendar, streak engine, practice players, admin). This is REFACTOR-classified work, not REBUILD — no behavior change, file decomposition only. Recommend this lands as its own milestone with before/after manual QA (click through every practice once) given there's no automated test safety net yet.

### Stream A — UI (post-decomposition)
1. Extract design tokens (`buildTheme()`/`tabCfg` → `tokens.js`).
2. Build `DesktopLayout`, formalize existing mobile JSX as `MobileLayout`.
3. Add the `isNativeApp || !isWideScreen` switch in the app root.
4. Promote Calendar and Settings to first-class navigation destinations (desktop sidebar).
5. Service worker + manifest icon set (closes the PWA gaps from the Feature Matrix).

### Stream B — Business Layer (post-decomposition)
1. Extract pure `computeStreak()` / completion-tracking functions out of the root component (unblocks Stream D unit testing).
2. Karma28→Karma33 rename of storage keys, per the migration decision above.
3. IdealWeight audio-guided treatment (explicitly lower priority per spec — "could be a candidate... later if desired").

### Stream C — Backend
1. Supabase project setup: Auth + Postgres schema for app state sync.
2. Subscription/entitlement model wired to the tiers in `ClaudMasterInstruction.md` (Free Beta / per-module / any-two / full).
3. AI coaching API integration for Kommunicate (pending provider decision above).
4. Audio cloud-sync layer (additive on top of the existing local-first IndexedDB design — do not replace it).
5. Razorpay/Stripe/App Store/Play Store billing — explicitly deferred per spec, do not start until 1–3 above are stable.

### Phase target platform sequencing (per master instruction)
- Phase 1 target: PWA (depends on Stream A's service worker + icons work above).
- Phase 2 target: Android via Capacitor (`npx cap add android`) — trivial once the layout switch exists, since Android/iOS share one component tree by construction.
- Phase 3 target: iOS via Capacitor — needs Xcode/macOS, otherwise same as Android.

### Phase 6 (dashboard, master-instruction numbering) — Development Dashboard
Build `/dev-dashboard` reading `dev-control/live-status.json`, once Phase 5 scaffolding exists and there's real status data to display. Low priority relative to product work; sequence after Stream A's layout work since it can reuse the same design tokens/components.

## Out of scope for this plan (per `ClaudMasterInstruction.md §8` / explicit deferrals)
- True AI voice cloning.
- Fully native (non-shared-codebase) iOS/Android.
- Final payment wiring (Razorpay/Stripe) — tier structure can be designed now, billing integration waits.

---

**This plan does not authorize any development.** Per the master instruction's "First Task" and "Mandatory Rules," the five Phase 2–4 deliverables above are complete and this document is the requested Phase Plan; the next step is explicit user approval before Phase 5 scaffolding (or any code change) begins.
