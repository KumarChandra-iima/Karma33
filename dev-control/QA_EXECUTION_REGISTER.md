# Karma33 — QA Execution Register

Last updated: 2026-06-21

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
