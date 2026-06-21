# Code Reuse Analysis — Karma33

Date: 2026-06-21
Scope: classify the existing `karma28.jsx` (= `karma28-vercel/k28zip/src/App.jsx`, confirmed byte-identical) by module, per Phase 4 of `ClaudMasterInstruction.md`.

Classification key: **RETAIN** (use as-is or near-as-is) · **REFACTOR** (logic is sound, structure needs work — typically: extract from the monolith into its own file/module) · **REBUILD** (logic and/or UI needs to be substantially rewritten) · **REMOVE** (delete, superseded or unused).

## Layouts

**Classification: REBUILD** (the layout *shell*, not the content inside it)

Today there is exactly one layout — a single mobile-width column, no breakpoint logic, no `DesktopLayout`/`MobileLayout` split, no `Capacitor.isNativePlatform()` check anywhere in the code. `CROSS_PLATFORM_PLAN.md` is explicit that this should be a `MobileLayout` (already exists, just not named/extracted that way) plus a new `DesktopLayout`, switched by a single check high in the tree. Recommendation: treat the current JSX structure for tab content, practice cards, calendar, and streak rows as the reusable "what" (RETAIN, see below), and build the layout *containers* around them fresh. This is the highest-leverage single piece of work in Stream A because nothing else in the Dashboard/Mobile/PWA feature areas can proceed cleanly until the layout switch exists.

## Timers

**Classification: RETAIN (logic), REFACTOR (structure)**

The timer/pacing logic is the most mature part of the codebase and matches the spec closely:
- `PranayamaRunner`-style stage runner (generic inhale/hold/exhale/hold pattern, lines ~715–781) — reused across Kriya and Sanyam. Sound.
- `CountedBreathing` (Bhastrika rapid-breath counter), `RestCountdown`, `BellTimer` (~1302–1337) — all correctly implement the timing math described in `ADMIN_SPEC.md` (e.g. Bhastrika speed presets 1400/950/600/380ms, bell spacing 15s–120s steps).
- `BreathRing` (426–449) — the circular breath visual, described in the requirements as the secondary (non-primary) instruction channel. Visually fine, reusable.

Rationale for REFACTOR rather than pure RETAIN: these are currently private functions inside one 2,617-line file with no exports — extracting them into standalone modules (e.g. `practices/timers.js`, `components/BreathRing.jsx`) is necessary before Stream B (business layer) or Stream A (UI) can work on them in parallel without merge conflicts on a single file. No logic rewrite needed, just file decomposition + prop-interface cleanup.

## Calendar

**Classification: RETAIN (logic), REFACTOR (layout integration)**

`DotCal` (~2064–2119) implements the 28-day calendar with real dates grouped by month, per-tab completion dots, missed-day tracking, and day drill-down — this matches `KARMA28_REQUIREMENTS.md §3` exactly. The computation logic (date math, completion lookup) is sound and should be kept. It currently renders only in the single mobile layout; per `CROSS_PLATFORM_PLAN.md`'s table, the desktop layout needs the *same* `DotCal` component just given more room (full month grid, no scroll) — meaning the component itself doesn't change, only its container does. This is exactly the "rearrange not redesign" principle from the plan, so once Layouts are rebuilt, `DotCal` should slot in unchanged.

## Streak engine

**Classification: REFACTOR**

Streak/record (best-streak) computation currently lives inline inside the root `Karma28` component's state object and render logic rather than as an isolated, testable function. The computation itself (current streak from `c_yoga`/`c_weight`/`c_comm` completion maps, "record" = best historical streak) is correct per spec but is not unit-testable in its current form because it's tangled with React state and localStorage I/O in the same scope. Recommendation: extract to a pure function (e.g. `computeStreak(completionMap, today)`) that the component calls — this is also a prerequisite for Stream D (QA) to write meaningful unit tests, since there is currently zero test coverage and no pure functions to test in isolation.

## Storage

**Classification: REFACTOR, with a REBUILD component for sync**

- `localStorage` (`karma28_v8` app state, `karma28_practice_config_v1` config, `karma28_voice_rate_v1`, `karma28_test_mode_v1`) and `IndexedDB` (`karma28_audio_v1`) — the read/write functions (`loadPracticeConfig`/`savePracticeConfig`, etc.) are simple and correct. RETAIN the functions; REFACTOR their location (currently inline, should move to a `storage/` module) and REFACTOR the key names as part of the Karma28→Karma33 rename (needs a deliberate migration strategy — see Open Items below, not a silent rename).
- Multi-device sync via Supabase is **net-new** — REBUILD/build-from-scratch, since no sync layer, no conflict resolution, and no auth-gated read/write exists today. This is Stream C's primary deliverable.

## Audio

**Classification: RETAIN**

This is the strongest-built subsystem relative to spec. `useMicRecorder()`, the IndexedDB blob store, `playBlob()` with rate adjustment, the synthesized chime/beep generation via Web Audio API, and the cue-priority fallback (user recording → AI TTS) all match `KARMA28_REQUIREMENTS.md §4.5` and `ADMIN_SPEC.md`'s "How recording works" section precisely, including the explicitly-scoped-out true voice-cloning. Keep as-is; only needs the same file-extraction treatment as Timers (REFACTOR for modularity, not for correctness) and eventually a cloud-sync wrapper around it (additive, not a rewrite of the local-first behavior).

## Navigation

**Classification: REBUILD**

Currently a flat tab-switch (`tab` state: yoga/weight/comm) with no router, baked into the single mobile layout. The Cross-Platform Plan calls for the desktop shell to add Calendar and Settings as their own first-class sidebar destinations (not just modal overlays as they are today) — that's a navigation model change, not just a visual one, so it's classified REBUILD rather than REFACTOR. No client-side router (e.g. React Router) exists yet; introducing one is a reasonable option to evaluate during Stream A planning, though a manually-managed view-state may still suffice given the app's limited destination count.

## Settings

**Classification: RETAIN (Yoga/Admin config), REBUILD (general app settings)**

`AdminPanel` (1643–1833) — the Yoga practice configuration UI — is comprehensive and correct per `ADMIN_SPEC.md`; keep it. However, "Settings" as a general end-user-facing destination (distinct from the founder-facing Admin/practice-config panel) doesn't exist as its own concept yet — persona/mode switches live in a `PersonaBar` header strip, not a settings screen. If Karma33 needs a conventional Settings destination (account, notifications, subscription management), that's new construction, not a refactor of `AdminPanel`, which should stay scoped to practice configuration.

## Onboarding

**Classification: RETAIN**

`SetupWizard` (1928 onward) is a complete 3-step first-run flow (name → wake time → yoga duration), correctly computes the "start yoga by" reminder time working backward from 6 AM, sets `startDate` to tomorrow, and speaks a welcome message — this matches `KARMA28_REQUIREMENTS.md §3` setup-wizard description exactly, including the recommended 3:30–4:00 AM wake window. Only change needed is updating the spoken/displayed product name from "Karma28" to "Karma33" as part of the rename pass; no structural work required.

---

## Open items to resolve before Phase 5/6 execution begins

1. **Duplicate Vite build**: `karma28-vercel/karma28-zip/` (850-line reduced `App.jsx`, missing all 4 practice players and Admin Panel) sits alongside `karma28-vercel/k28zip/` (full, current). Recommend confirming with the user whether `karma28-zip` is intentionally retained (e.g. a lighter demo deployment) before removing it — classified tentatively **REMOVE** pending confirmation, not removed in this pass per the "never remove existing code before reuse analysis" rule, and this analysis is the reuse analysis, not the removal action itself.
2. **Storage key rename strategy** (Karma28→Karma33): decide between (a) bump version and start fresh (`karma33_v1`, users lose existing local data) or (b) read-old-key/write-new-key migration on first load. Affects Storage and is a Stream C/B coordination point.
3. **AI coaching backend for Kommunicate**: UI captures the input; no API call exists. Needs an explicit decision on which AI provider/model to call before Stream C can build it (flagged in `docs/FEATURE_MATRIX.md` §3).
4. **Tracked `.DS_Store` files**: cosmetic but should be removed from git and `.gitignore`'d during the first Stream A or repo-hygiene pass.
