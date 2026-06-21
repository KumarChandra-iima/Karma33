# Karma33 — Test Cases

Last updated: 2026-06-21
Status legend: 🤖 Automated (Vitest) · 🖐 Manual only (timer/audio/permission-dependent) · 📋 Not yet executed

## Automated (current coverage: `src/tokens.test.js`)

| ID | Case | Type | Status |
|---|---|---|---|
| TOK-01 | ADULT_TABS and TEENS_TABS both expose exactly `yoga`/`weight`/`comm` keys | 🤖 | Passing |
| TOK-02 | Every tab object has the fields `buildTheme` depends on (`A`,`B`,`vivBg`,`fg`,`fgMid`,`fgSoft`,`fgGhost`) | 🤖 | Passing |
| TOK-03 | Dark mode background is identical across tabs (fixed near-black palette) | 🤖 | Passing |
| TOK-04 | Dark mode accent color (`acc`) still varies per tab | 🤖 | Passing |
| TOK-05 | Vivid mode `appBg` equals the tab's `vivBg` gradient | 🤖 | Passing |
| TOK-06 | Vivid mode backgrounds differ between tabs (no shared hardcode) | 🤖 | Passing |
| TOK-07 | `buildTheme` works against the Teens tab set, not just Adult | 🤖 | Passing |

## Manual — Onboarding

| ID | Case | Status |
|---|---|---|
| ONB-01 | First run shows `SetupWizard` (3 steps: name → wake time → yoga duration) | 📋 |
| ONB-02 | Reminder time computed correctly: `6:00 AM − yogaDuration − 5min` | 📋 |
| ONB-03 | `startDate` defaults to tomorrow's date | 📋 |
| ONB-04 | Spoken welcome message says "Karma33" (post-rename) | 📋 |
| ONB-05 | Setup is not shown again after completion (persisted via `karma33_v1`) | 📋 |

## Manual — Yoga & Dhyan (all 4 practices)

| ID | Case | Status |
|---|---|---|
| YOGA-01 | Surya Namaskar: 1 round = 24 poses, mantra cycles 1→12 then repeats | 📋 |
| YOGA-02 | Sudarshan Kriya: stage order Pranayama → Bhastrika → Lock → Om → Main Kriya → Savasana | 📋 |
| YOGA-03 | Bhastrika speed presets (Slow/Medium/Fast/Super Fast) change pacing as documented in `ADMIN_SPEC.md` | 📋 |
| YOGA-04 | Padmasana Dhyan: all 3 guide sources selectable (YouTube/My Voice/AI Voice) | 📋 |
| YOGA-05 | Sanyam Dhyan: bell rounds respect configured count + spacing | 📋 |
| YOGA-06 | "Do All 4 Together" runs all four practices back-to-back without individual setup screens | 📋 |
| YOGA-07 | Test Mode (Admin → General) shows a Skip button on every timed step | 📋 |
| YOGA-08 | Recording a cue, then replaying, plays the user's voice (not AI) per the priority rule | 📋 |
| YOGA-09 | Global voice-character slider changes recorded-cue playback rate uniformly | 📋 |

## Manual — IdealWeight

| ID | Case | Status |
|---|---|---|
| WT-01 | 28-day schedule generates with correct rest days (Thu/Sun) | 📋 |
| WT-02 | Difficulty increases at the Week 1-2 → Week 3-4 boundary | 📋 |

## Manual — Kommunicate

| ID | Case | Status |
|---|---|---|
| COMM-01 | Recording + written summary capture both work | 📋 |
| COMM-02 | "Analyze with AI Coach" — **known failing**, see BUG-002 in `dev-control/BUG_REGISTER.md`; expected result is the graceful "Analysis unavailable" fallback, not a crash | 📋 |
| COMM-03 | Connections panel: tap-to-mark-connected-today persists per contact | 📋 |

## Manual — Calendar / Streaks

| ID | Case | Status |
|---|---|---|
| CAL-01 | 28-day dot calendar shows correct completion dots per tab | 📋 |
| CAL-02 | Missed days are visually distinct from not-yet-completed future days | 📋 |
| CAL-03 | Streak count and "record" (best streak) update correctly after completing/missing days | 📋 |

## Manual — PWA (new in this round)

| ID | Case | Status |
|---|---|---|
| PWA-01 | `manifest.webmanifest` is reachable and lists all 3 icons | 📋 |
| PWA-02 | Service worker registers and precaches build assets | 📋 |
| PWA-03 | App is installable ("Add to Home Screen" prompt appears) on a mobile browser | 📋 |
| PWA-04 | App loads (cached shell) when offline after first visit | 📋 |

## Manual — Storage migration (new in this round)

| ID | Case | Status |
|---|---|---|
| MIG-01 | A browser with existing `karma28_v8` data, on first load of the new build, ends up with that data copied into `karma33_v1` | 📋 |
| MIG-02 | A fresh browser with no prior data starts clean under the `karma33_*` keys, no errors | 📋 |

Cases marked 📋 require either a real browser session (manual click-through) or component test scaffolding that doesn't exist yet (blocked on monolith decomposition, see `docs/CODE_REUSE_ANALYSIS.md`). They are not claimed as passing anywhere in `dev-control/` until actually executed — see `qa/QA_EXECUTION_REGISTER.md`.
