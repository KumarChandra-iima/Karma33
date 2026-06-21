# Karma33 — QA Sign-off

Last updated: 2026-06-21

Per `ClaudMasterInstruction.md`: "Development cannot be marked complete until QA passes." This file tracks sign-off status per module/milestone, gated on evidence recorded in `qa/QA_EXECUTION_REGISTER.md`.

| Module / Milestone | QA Status | Evidence | Notes |
|---|---|---|---|
| Vercel deployment scaffold (root Vite app) | ✅ Signed off | `dev-control/QA_EXECUTION_REGISTER.md`; production verified live | BUG-001 closed |
| Storage key migration (karma28_* → karma33_*) | 🟡 Partial | Build green; migration logic not exercised against a real browser with legacy data yet (MIG-01 in `qa/TEST_CASES.md` is 📋) | Logic is straightforward (3-line copy-forward) but unverified end-to-end |
| Design token extraction (`src/tokens.js`) | ✅ Signed off | `qa/QA_EXECUTION_REGISTER.md` — 7/7 unit tests passing, build unchanged in size, visual re-verification PASS | |
| PWA (manifest, icons, service worker) | 🟡 Partial | Build produces all expected files; HTTP-level checks pass; install prompt / offline-load behavior (PWA-01–04 in `qa/TEST_CASES.md`) not yet manually verified on a real device | |
| Yoga & Dhyan practices (pre-existing) | 🟡 Partial | Inherited working implementation per `docs/REPOSITORY_ASSESSMENT.md`; no regression testing performed against the new scaffold beyond "app loads and shows correct branding" | Full practice-by-practice manual QA (YOGA-01–09) not yet executed |
| IdealWeight, Kommunicate, Calendar/Streaks (pre-existing) | 🟡 Partial | Same as above — ported as-is, not regression tested module-by-module | BUG-002 (Kommunicate AI coach) known-failing, documented |
| Desktop layout | ⬜ Not started | — | Not built yet |
| Backend (Supabase: schema) | ✅ Signed off | `profiles` + `user_state` tables confirmed live via read-only select; RLS enabled with owner-only policies | Applied by Kumar directly via Supabase Studio |
| Backend (Supabase: auth gate) | 🟡 Partial | Build/test/visual checks green; client correctly reaches the live project (`auth.getSession()` succeeds) | **Not end-to-end tested**: no real email has been sent through the OTP flow, and Google OAuth needs a provider configured in the Supabase dashboard (Client ID/Secret) which hasn't happened yet. Until both are confirmed, merging to `main` would put the *live, only* entry point to the app behind an unverified gate — flagged for Kumar before merge. |
| Subscription/billing | ⬜ Not started | — | Explicitly deferred per spec |
| Mobile (Capacitor) | ⬜ Not started | — | Phase 2/3 target, not yet attempted |

## How to read this table

- ✅ Signed off — evidence exists, no known open issues for this scope.
- 🟡 Partial — built and passing the checks that have actually been run, but some test cases remain unexecuted (manual/device-dependent, or blocked on further refactor).
- ⬜ Not started — no work done yet.

This table should be updated every time a module's QA status changes, in the same commit/PR as the work, not retroactively.
