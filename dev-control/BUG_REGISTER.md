# Karma33 — Bug Register

Last updated: 2026-06-27 (updated same day)

| ID | Title | Status | Severity | Found in | Evidence | Notes |
|---|---|---|---|---|---|---|
| BUG-001 | Production Vercel URL returns 404 NOT_FOUND | ✅ Closed | Critical | `karma28.jsx` / repo root (missing Vite scaffold) | Fixed on `feature/phase-5-app-scaffold-vercel-fix`, merged to `main` (`503845b`). Independently re-verified post-merge via `dev-control/scripts/verify-deployment.sh`: `https://karma33.vercel.app/` → HTTP 200, Ollama vision verdict PASS | Closed with evidence per `ClaudMasterInstruction.md` mandatory rules — see `docs/VERCEL_DEPLOYMENT_FIX.md` |
| BUG-002 | "Analyze with AI Coach" (Kommunicate) always fails | 🟡 Open | Low (non-blocking, feature degrades gracefully) | `src/App.jsx` (~line 2176, `analyze()` in the Kommunicate audio/feedback component) | Client-side `fetch("https://api.anthropic.com/v1/messages", ...)` has no API key/auth header; will always fail CORS/auth and falls into the existing catch handler showing "Analysis unavailable. Keep practicing!" | No secret exposure confirmed (no key present in the code). Real fix needs a server-side proxy endpoint — tracked for Stream C (Backend) per `docs/FEATURE_MATRIX.md` §3. Not fixed as part of the Vercel scaffold fix (out of scope). |
| BUG-003 | Teens → Moves workout shows "Play pump-up song 🎵" with no music playback control | ✅ Closed | Medium | `src/App.jsx` `ExCard` component + `TE.T1` workout data | Fixed on `feature/teens-workout-music-player`: added `WorkoutMusicControl` component (`src/components/audio/WorkoutMusicControl.jsx`) and `useWorkoutBeat` hook (`src/hooks/useWorkoutBeat.js`). Music control appears when any step contains music intent (🎵, "pump-up song", "Music + movement"). 37/37 tests pass; build green; onboarding validation `allPassed: true`. |
| BUG-004 | Sudarshan Kriya "During Kriya: Music" setting shows label but plays no audio | ✅ Closed | Medium | `src/App.jsx` `SudarshanKriyaPlayer` (line ~982), `DEFAULT_PRACTICE_CONFIG.kriya.duringKriyaAudio` | Fixed on `feature/kriya-music-player`: wired `useWorkoutBeat(60)` into `SudarshanKriyaPlayer`; Play/Pause/Stop controls appear on kriya-intro screen; compact music badge shown during all 9 breathing steps. Music stops on savasana/done/unmount. 43/43 tests pass; build green; onboarding `allPassed: true`. |

## Evidence requirement

Per `ClaudMasterInstruction.md` mandatory rules ("never close bugs without evidence"), BUG-001 stays open until:
1. Feature branch pushed and Vercel preview deployment confirmed reachable (no 404).
2. Production URL re-checked after merge to `main` and confirmed no longer 404ing.
