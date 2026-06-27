# Karma33 — QA Execution Register

Last updated: 2026-06-27

## QA pass: Vercel deployment scaffold fix (branch `feature/phase-5-app-scaffold-vercel-fix`)

| Check | Method | Result | Evidence |
|---|---|---|---|
| Root scaffold files present | `ls`/manual check of `package.json`, `index.html`, `src/main.jsx`, `src/App.jsx`, `vite.config.js`, `public/` | ✅ Pass | All present after fix; all confirmed missing before fix |
| `npm install` succeeds | `npm install` from repo root | ✅ Pass | 62 packages installed, 0 errors (2 pre-existing upstream vite/esbuild advisories, not introduced by this change) |
| `npm run build` succeeds | `npm run build` | ✅ Pass | `vite build` completed in 342ms, 30 modules transformed, no errors |
| `dist/` output is valid | Inspect `dist/index.html`, `dist/assets/*.js`, `dist/manifest.json` | ✅ Pass | All three present; `dist/index.html` references the built JS bundle and shows title "Karma33 — 28-Day Transformation" |
| `npm run preview` serves the app | `npm run preview --port 4173` + `curl` | ✅ Pass | `curl http://localhost:4173/` → HTTP 200; `/manifest.json` → HTTP 200; `/assets/index-*.js` → HTTP 200 |
| Visible product naming is Karma33 | `grep` for "Karma28" in `src/App.jsx`, manual review of onboarding/header/title strings | ✅ Pass | Only remaining "Karma28" in `src/App.jsx` is the internal `function Karma28()` identifier (not user-visible); all displayed strings (page title, manifest name, onboarding welcome, app header, AI-coach prompt) read "Karma33" |
| Original source files untouched | `git diff` / `diff` against `karma28.jsx` and `karma28-vercel/` | ✅ Pass | Root `karma28.jsx` and both `karma28-vercel/` Vite projects unmodified — new scaffold is additive |

## Not yet executed (deferred, requires user/Vercel dashboard access)

| Check | Why deferred | Owner |
|---|---|---|
| Vercel preview deployment loads without 404 | No Vercel CLI installed/authenticated in this environment; requires the project's connected GitHub integration to build the pushed branch, or dashboard access | User, after branch push |
| Vercel dashboard build settings (Framework=Vite, Build Command, Output Directory=dist, Production Branch=main) | Same — dashboard-only settings not reachable from this environment | User |
| Production URL no longer 404s post-merge | Requires merge to `main` and a live production redeploy, gated on the above | User + Claude Code, after preview confirmation |

## Sign-off

QA for the **local build/scaffold** portion of this fix is green. Per `ClaudMasterInstruction.md` ("never mark QA passed without execution proof"), overall sign-off for the *deployment* fix is **not yet given** — withheld until the deferred checks above are executed. See `qa/QA_SIGNOFF.md` (not yet created — full QA framework is a separate Phase 5.5 deliverable, this register covers only this fix's scope).

---

## QA pass: Teens workout music control (branch `feature/teens-workout-music-player`)

### BUG-003 — Teens → Moves "Play pump-up song 🎵" had no playback control

| Check | Method | Result | Evidence |
|---|---|---|---|
| Music prompt detection — step with "Play pump-up song" triggers control | `hasMusicIntent()` unit test (vitest) | ✅ Pass | 37/37 tests green |
| Music prompt detection — 🎵 emoji triggers control | `hasMusicIntent()` unit test | ✅ Pass | 37/37 |
| Music prompt detection — "Music + movement" triggers control | `hasMusicIntent()` unit test | ✅ Pass | 37/37 |
| No control renders for non-music steps | `stepsHaveMusicIntent([])` + pure step arrays | ✅ Pass | 37/37 |
| Play button renders initially | `WorkoutMusicControl` render test | ✅ Pass | 37/37 |
| No autoplay — Stop disabled, no PLAYING indicator on load | Component render test | ✅ Pass | 37/37 |
| Play → button changes to Pause | `fireEvent.click` on play btn | ✅ Pass | 37/37 |
| PLAYING indicator appears after tap | Component interaction test | ✅ Pass | 37/37 |
| Pause → button shows Resume | Double-click play/pause sequence test | ✅ Pass | 37/37 |
| Stop → resets to initial state, Stop btn disabled | Stop button interaction test | ✅ Pass | 37/37 |
| Volume slider renders and responds | Range input test | ✅ Pass | 37/37 |
| onStop callback fires when Stop clicked | Callback prop test | ✅ Pass | 37/37 |
| `npm run build` succeeds with new components | `vite build` | ✅ Pass | 34 modules, 381ms, no errors |
| Onboarding flow still passes | `validate-onboarding-flow.cjs http://localhost:4173` | ✅ Pass | `allPassed: true`, 4/4 steps, video recorded |

### Sign-off

QA for `feature/teens-workout-music-player` is **fully green**. All 37 automated tests executed and pass. Build clean. Onboarding regression confirmed passing.

---

## QA pass: Surya Namaskar My Voice playback fix (branch `fix/surya-my-voice-playback`)

### BUG-005 — My Voice recordings appear saved but Play Mine produces no audio

| Check | Method | Result | Evidence |
|---|---|---|---|
| Root cause confirmed: async await breaks gesture token before audio.play() | Ollama/qwen2.5-coder analysis + code review | ✅ Confirmed | `async function previewRecorded(){ await idbGet... }` — gesture expires before play() |
| Synchronous previewRecorded: URL.createObjectURL called in same tick as click | Unit test (synchrony contract) | ✅ Pass | 51/51 |
| audio.play() called synchronously | Unit test | ✅ Pass | 51/51 |
| Null blob shows error, Audio not constructed | Unit test | ✅ Pass | 51/51 |
| Play AI path: speak() called synchronously | Unit test | ✅ Pass | 51/51 |
| URL.revokeObjectURL called after onended fires | Unit test | ✅ Pass | 51/51 |
| clearRec resets blob ref — subsequent play shows error | Unit test | ✅ Pass | 51/51 |
| Cue ID consistency: surya_mantra_0..11 save/fetch match | Unit test | ✅ Pass | 51/51 |
| IDB_NAME unchanged (karma28_audio_v1) — existing recordings preserved | Unit test assertion | ✅ Pass | 51/51 |
| `npm run build` | `vite build` | ✅ Pass | 34 modules, 384ms |
| Onboarding flow regression | `validate-onboarding-flow.cjs http://localhost:4173` | ✅ Pass | `allPassed: true`, 4/4 steps |

### Sign-off

QA for `fix/surya-my-voice-playback` is **fully green**. 51/51 tests. Build clean. Onboarding regression passing. Root cause documented in `docs/AUDIO_RECORDING_PLAYBACK_FIX.md`.

---

## QA pass: Mobile PWA recorded audio player state (branch `fix/mobile-pwa-recorded-audio-player-state`)

### BUG-006 — My Voice fails on mobile PWA; no Pause/Stop UI; duplicate overlapping playback

| Check | Method | Result | Evidence |
|---|---|---|---|
| `getBestMimeType()` returns `audio/mp4` when supported | Unit test | ✅ Pass | 68/68 |
| `getBestMimeType()` falls through to `audio/webm;codecs=opus` | Unit test | ✅ Pass | 68/68 |
| `getBestMimeType()` returns empty string when nothing supported | Unit test | ✅ Pass | 68/68 |
| Initial status is idle, Play button visible | Component test | ✅ Pass | 68/68 |
| After Play tap: Pause + Stop appear, Play disappears | Component test | ✅ Pass | 68/68 |
| After Pause tap: Resume + Stop appear | Component test | ✅ Pass | 68/68 |
| After Stop tap: Play button returns | Component test | ✅ Pass | 68/68 |
| audio.onended fires → status returns to idle | Component test | ✅ Pass | 68/68 |
| Double-tap Play impossible (Play button gone when playing) | Component test | ✅ Pass | 68/68 |
| While cue-a plays, cue-b Play button is disabled | Mutual exclusion test | ✅ Pass | 68/68 |
| After cue-a ends, cue-b button re-enabled | Mutual exclusion test | ✅ Pass | 68/68 |
| Null blob calls onFallback, status stays idle | Fallback test | ✅ Pass | 68/68 |
| Empty blob (size=0) calls onFallback | Fallback test | ✅ Pass | 68/68 |
| play() rejection calls onFallback, status=error | Error test | ✅ Pass | 68/68 |
| URL.revokeObjectURL called after onended | URL lifecycle test | ✅ Pass | 68/68 |
| `npm run build` | `vite build` | ✅ Pass | 35 modules, 358ms |
| Onboarding flow regression | `validate-onboarding-flow.cjs` | ✅ Pass | `allPassed: true`, 4/4 steps |

### Manual Mobile QA Required

Automated tests run on desktop jsdom. The following must be verified manually on a real iOS/Android device:
- [ ] Record a Surya mantra on iOS Safari (iOS 16.4+)
- [ ] Tap Play mine — confirm voice plays and button shows Pause + Stop
- [ ] Tap Pause — confirm audio pauses
- [ ] Tap Resume — confirm audio resumes
- [ ] Tap Stop — confirm button returns to Play mine
- [ ] Rapid tap Play mine — confirm no overlapping audio
- [ ] Begin Practice with My Voice — confirm mantra plays (or TTS fallback fires)

See `docs/MOBILE_AUDIO_PLAYBACK_NOTES.md` for full checklist.

### Sign-off

Desktop automated QA for `fix/mobile-pwa-recorded-audio-player-state` is **fully green**. 68/68 tests. Build clean. Onboarding regression passing. Manual mobile QA required before declaring full mobile resolution.
