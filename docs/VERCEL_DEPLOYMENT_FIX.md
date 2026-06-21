# Vercel Deployment Fix — Production 404 NOT_FOUND

Date: 2026-06-21
Branch: `feature/phase-5-app-scaffold-vercel-fix`

## Symptom

Vercel project was connected and a deployment existed, but the production URL returned `404 NOT_FOUND`.

## Root cause

Confirmed, not assumed: the repository root had **no Vite application scaffold at all**. Verified missing before this fix:

| File/dir | Status before fix |
|---|---|
| `package.json` | missing |
| `index.html` | missing |
| `src/main.jsx` | missing |
| `src/App.jsx` | missing |
| `vite.config.js` | missing |
| `public/` | missing |
| `dist/` (build output) | missing — `npm run build` had no `package.json`/`build` script to run |

A working, complete implementation existed, but only inside `karma28-vercel/k28zip/` (a nested Vite project) and as a loose `karma28.jsx` file at the repo root — neither of which Vercel builds from when "Root Directory" is the repo root and no project-level override is configured. With Vercel's default Vite framework detection finding no `package.json` at the root, the build either produced nothing or produced output Vercel could not route to `/`, hence `404 NOT_FOUND` rather than a build-failure error. This matches the hypothesis in the task brief and is the confirmed cause — not a Vercel platform problem.

## Fix applied

Created a proper Vite React scaffold at the repository root, reusing the existing, working `karma28.jsx` implementation rather than rewriting it:

- `package.json` — name `karma33`, scripts `dev`/`build`/`preview` (react 18.2, vite 5, `@vitejs/plugin-react` 4.2 — same dependency versions already proven working in `karma28-vercel/k28zip/`).
- `vite.config.js` — standard `@vitejs/plugin-react` config.
- `index.html` — entry HTML, title updated to "Karma33 — 28-Day Transformation", links `/manifest.json`.
- `src/main.jsx` — standard React 18 `createRoot` entry point.
- `src/App.jsx` — copy of the existing `karma28.jsx` (full implementation: all 4 Yoga practices, Admin panel, Kommunicate, IdealWeight, calendar, streaks) with **visible product naming updated from "Karma28" to "Karma33"** (welcome screen, onboarding header, app header, AI-coach system prompt). Internal identifiers (e.g. the `Karma28` function name) and storage keys (`karma28_v8`, etc.) were left unchanged — those are an explicit open item for a separate migration decision, not part of this fix, and changing them silently would risk losing users' existing local data without a deliberate migration path.
- `public/manifest.json` — name/short_name updated to "Karma33".
- `.gitignore` — added (did not exist before); excludes `node_modules/`, `dist/`, `.DS_Store`, `.vercel`. Also untracked the `.DS_Store` files that were previously committed at the repo root and under `karma28-vercel/`.

The root `karma28.jsx` and the `karma28-vercel/` Vite projects were **not modified or removed** — they remain as source/reference per the instruction, and their disposition (keep/delete/merge) is still the open decision flagged in `docs/CODE_REUSE_ANALYSIS.md`.

## Local verification

```
npm install   # 62 packages, no errors (2 known vite/esbuild advisories, pre-existing upstream, not introduced by this change)
npm run build # ✓ 30 modules transformed, dist/ produced in 342ms
npm run preview --port 4173
curl http://localhost:4173/                       → HTTP 200, <title>Karma33 — 28-Day Transformation</title>
curl http://localhost:4173/manifest.json           → HTTP 200
curl http://localhost:4173/assets/index-*.js        → HTTP 200
```

`dist/` after build contains `index.html`, `manifest.json`, and `assets/index-*.js` — a normal, completable Vite static-site output that Vercel's Vite preset can serve.

## Required Vercel project settings (dashboard — outside this repo, not verifiable from this environment)

No Vercel CLI is installed/authenticated in this environment, so the dashboard settings below could not be confirmed or changed directly and should be checked manually:

- Framework Preset: **Vite**
- Root Directory: **(repo root)** — must NOT be set to `karma28-vercel/k28zip` or any subfolder
- Build Command: `npm run build`
- Output Directory: `dist`
- Production Branch: `main`

## Known non-blocking issues found during this fix (logged, not fixed here — out of scope)

- Kommunicate's "Analyze with AI Coach" button calls `fetch("https://api.anthropic.com/v1/messages", ...)` directly from the browser with no API key and no auth header. This will always fail (CORS + unauthenticated) and silently falls into a "Analysis unavailable" catch handler — confirmed no secret is exposed, but the feature is non-functional. Tracked in `dev-control/BUG_REGISTER.md`. Real fix requires a server-side proxy (Stream C / Backend work), consistent with `docs/FEATURE_MATRIX.md` §3.
- Two duplicate Vite projects still exist under `karma28-vercel/` (`karma28-zip` reduced build, `k28zip` full build) — unrelated to this 404 fix since Vercel builds from root, but still flagged for cleanup decision.

## Outcome

Build and preview verified green locally. Per the task instructions, **merge to `main` is withheld until the Vercel preview deployment for this branch is confirmed working** — see `dev-control/MASTER_STATUS.md` for current status and the open action item to confirm the preview URL.
