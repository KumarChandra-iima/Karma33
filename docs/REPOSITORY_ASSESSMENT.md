# Repository Assessment — Karma33 (formerly Karma28)

Date: 2026-06-21

## 0. What's actually in this repo

This is a **spec + prototype** repository, not a scaffolded application yet. There is no top-level `package.json`, no `src/`, no shared `vite.config.js` at the root. The real code lives in two places:

```
karma28.jsx                                   ← root-level monolithic React component (2,617 lines / 185KB)
karma28-platform-mockup.html                  ← static HTML mockup of desktop/mobile layouts
KARMA28_REQUIREMENTS.md                       ← product spec (317 lines)
CROSS_PLATFORM_PLAN.md                        ← UI/layout architecture plan (125 lines)
ADMIN_SPEC.md                                 ← config reference for the Yoga practice engine (201 lines)
ClaudMasterInstruction.md                     ← this orchestration instruction
karma28-vercel/
  karma28-zip/                                ← Vite project, App.jsx = 850 lines (older/reduced build)
  k28zip/                                     ← Vite project, App.jsx = 2,617 lines, byte-identical to root karma28.jsx
```

`.DS_Store` files are committed at the repo root and inside `karma28-vercel/` — should be removed from git tracking and added to `.gitignore` at some point (not done now, since no dev work is authorized yet).

## 1. Technology stack

- **Framework**: React 18.2 (function components + hooks only — no class components, no Context API, no external state library).
- **Build tool**: Vite 5, via `@vitejs/plugin-react` 4.2. Two near-duplicate Vite projects exist under `karma28-vercel/`.
- **Language**: plain JavaScript/JSX. No TypeScript anywhere (no `tsconfig.json`).
- **Styling**: 100% inline `style={{...}}` objects driven by a `buildTheme()` function. No CSS framework, no CSS Modules, no Tailwind, no styled-components.
- **Persistence**: `localStorage` for app/config state, `IndexedDB` for recorded audio blobs. No backend, no network calls, no auth.
- **Audio**: Web Audio API (synthesized chimes/beeps), `MediaRecorder` for mic capture, native `speechSynthesis` for AI TTS narration.
- **Deployment target** (per spec): Vercel today; Capacitor-wrapped Android/iOS planned; Supabase planned for backend/auth/sync — none of this is implemented yet.

## 2. Folder structure

Flat and minimal. No `components/`, `hooks/`, `services/`, or `assets/` directories exist anywhere — everything is in one file per build. The two Vite projects each have the standard Vite skeleton (`index.html`, `src/main.jsx`, `src/App.jsx`, `public/manifest.json`) but no further decomposition.

## 3. Existing features (implemented in `karma28.jsx` / `k28zip/src/App.jsx`)

- Full theme system: Adult vs Teens persona, Dark vs Vivid mode, per-tab gradient branding (Yoga: orange→magenta, Weight: red→amber, Kommunicate: blue→cyan).
- Voice/NLP: a 7-intent command parser (complete_yoga, complete_weight, complete_comm, log_water, log_meal, log_fast, status) driving a "Tap & Talk" voice quick-log button.
- Audio engine: synthesized chime/beep tones, `useMicRecorder()` hook, IndexedDB-backed cue storage (`karma28_audio_v1`), playback with rate adjustment.
- All four Yoga & Dhyan practices fully built as standalone players: Surya Namaskar (24-pose, 12-mantra cycling), Sudarshan Kriya (3-stage pranayama → Bhastrika → locks → Om → main Kriya → Savasana), Padmasana Dhyan (YouTube embed / recorded / AI narration modes), Sanyam Dhyan (Bhogar pranayam → pratyahar → samadhi timer → bell rounds → closing mantra).
- Combined "Do All 4 Together" sequencing flow (`CombinedSetup`, `sequenceQueue`/`sequenceIdx` state).
- Full Admin Panel: per-practice config editing, per-cue mic recording (record/play mine/play AI/remove), test-mode skip-button toggle, global voice-character (playback rate) control.
- IdealWeight module: 28-day generated exercise schedule (`buildSchedule`), Week1-2 "Foundation" vs Week3-4 "Intensity" split, exercise cards with instructions/tips.
- Kommunicate module: 28-day curriculum (adult + teen variants) with named techniques (FORD Method, Yes-And, SBI Model, etc.), audio recording per topic, a written self-summary capture point (AI coaching feedback itself is **not** wired to a real API — no network call exists in this file).
- Connections/CRM panel: VIP/casual contact list with daily tap-to-mark-connected.
- 28-day dot calendar (`DotCal`) with month grouping, completion/missed indicators, day drill-down (`DayView`).
- Streak tracking and "record" (best streak) display per tab.
- Daily wellness habit checklist (water/yoga-before-6/noon-meal/no-food-after-6) with local reminder notifications.
- Certificate/completion modal on day completion.

## 4. Existing architecture

Single monolithic component file, ~35 top-level function declarations, no module boundaries. State lives in one root `Karma28` component (lines ~2446–2617) and is threaded down via props — no Context, no reducer/store library. This is a deliberate "single-file component architecture" per the requirements doc, not an oversight, but it is the central scalability risk for further development (see Code Reuse Analysis).

## 5. Existing dependencies

Only `react`, `react-dom` (runtime) and `vite`, `@vitejs/plugin-react` (dev). No router, no UI kit, no icon library (emoji used as icons), no animation library, no HTTP client, no state management library, no testing library.

## 6. Existing test coverage

**None.** No test files, no test runner config (no Jest/Vitest/RTL), no CI workflow (no `.github/workflows`), no lint config (no ESLint/Prettier config files). This is a green-field QA opportunity, not a regression risk yet — but it means every refactor from here forward is currently unverifiable except by manual click-through.

## 7. Existing storage approach

- `localStorage` keys in use: `karma28_v8` (main state: completions, streaks, habits, connections), `karma28_practice_config_v1` (`DEFAULT_PRACTICE_CONFIG`), `karma28_voice_rate_v1`, `karma28_test_mode_v1`.
- `IndexedDB` database `karma28_audio_v1` for recorded audio blobs (kept out of localStorage deliberately because audio blobs are large).
- No backend, no multi-device sync — single-device only today. Supabase is the named future plan in both the requirements doc and the master instruction, but zero Supabase code/config exists yet.

## 8. Existing audio architecture

Already fairly sophisticated for a no-backend app: per-cue priority (user recording → AI TTS fallback), global voice-character/pitch-rate control applied uniformly across all recorded cues, synthesized (not file-based) chime/bell tones, and an explicit non-goal of true voice cloning. This matches the spec in `ADMIN_SPEC.md` and `KARMA28_REQUIREMENTS.md §4.5` closely — implementation and spec are in sync here.

## 9. Existing dashboard implementation

There is a single mobile-shaped dashboard (`DayView` + tab content), no desktop/sidebar layout, no `/dev-dashboard` build tooling. `CROSS_PLATFORM_PLAN.md` describes a planned `DesktopLayout`/`MobileLayout` split driven by `Capacitor.isNativePlatform()` + a `min-width: 1024px` media query — **this split does not exist in code yet**; the static `karma28-platform-mockup.html` is the only artifact showing what it should look like, and it's plain HTML, not wired into the React app.

## 10. Existing mobile readiness

- Layout is mobile-first and effectively mobile-only today (content appears capped at a phone-width column; no responsive desktop breakpoint logic found in `karma28.jsx`).
- `public/manifest.json` exists in both Vite projects (`display: standalone`, theme/background color set) — basic "Add to Home Screen" support.
- **No service worker** → no offline support, would fail a Lighthouse PWA audit.
- **No icon set** in the manifest (no icon array) → install prompts will look broken/generic.
- No Capacitor config (`capacitor.config.*`) anywhere — Android/iOS wrapping (Phase 2/3 of the master instruction's target platform plan) has not been started.

## 11. Two parallel "production" builds — a discrepancy worth flagging

`karma28-vercel/karma28-zip/src/App.jsx` (850 lines) is a **reduced** version of the app — it has the dashboard/habits/communication shell but is missing all four Yoga practice players, the Admin Panel, and the audio engine. `karma28-vercel/k28zip/src/App.jsx` (2,617 lines) is the full version, byte-identical to the root `karma28.jsx`. This looks like a stale/older deployment artifact (`karma28-zip`) sitting alongside the current one (`k28zip`). It should be confirmed with the user whether `karma28-zip` is safe to delete or is intentionally kept as a fallback/demo build before any cleanup happens.

## 12. Naming: Karma28 → Karma33

All code, storage keys (`karma28_v8`, `karma28_audio_v1`, etc.), manifest names, and spec files still say "Karma28." Per the master instruction, Karma28 specs are to be treated as valid Karma33 requirements, and "Karma33" is the official forward-looking product name — but no rename has happened anywhere in code or docs yet. This is a rename/migration task to plan for, not a blocker.
