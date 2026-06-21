# Karma33 — Bug Register

Last updated: 2026-06-21

| ID | Title | Status | Severity | Found in | Evidence | Notes |
|---|---|---|---|---|---|---|
| BUG-001 | Production Vercel URL returns 404 NOT_FOUND | ✅ Fixed (pending preview confirmation) | Critical | `karma28.jsx` / repo root (missing Vite scaffold) | Repo root confirmed missing `package.json`, `index.html`, `src/`, `vite.config.js` before fix; `npm run build` now succeeds and `npm run preview` returns HTTP 200 locally on branch `feature/phase-5-app-scaffold-vercel-fix` | Closing only after Vercel preview deployment is confirmed working and merged to `main` per task instructions — see `docs/VERCEL_DEPLOYMENT_FIX.md` |
| BUG-002 | "Analyze with AI Coach" (Kommunicate) always fails | 🟡 Open | Low (non-blocking, feature degrades gracefully) | `src/App.jsx` (~line 2176, `analyze()` in the Kommunicate audio/feedback component) | Client-side `fetch("https://api.anthropic.com/v1/messages", ...)` has no API key/auth header; will always fail CORS/auth and falls into the existing catch handler showing "Analysis unavailable. Keep practicing!" | No secret exposure confirmed (no key present in the code). Real fix needs a server-side proxy endpoint — tracked for Stream C (Backend) per `docs/FEATURE_MATRIX.md` §3. Not fixed as part of the Vercel scaffold fix (out of scope). |

## Evidence requirement

Per `ClaudMasterInstruction.md` mandatory rules ("never close bugs without evidence"), BUG-001 stays open until:
1. Feature branch pushed and Vercel preview deployment confirmed reachable (no 404).
2. Production URL re-checked after merge to `main` and confirmed no longer 404ing.
