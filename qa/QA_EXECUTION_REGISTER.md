# Karma33 — QA Execution Register

Last updated: 2026-06-21

This is the product-wide QA execution log (distinct from `dev-control/QA_EXECUTION_REGISTER.md`, which tracks QA scoped specifically to the Vercel deployment fix incident).

## Automated runs

| Date | Suite | Result | Evidence |
|---|---|---|---|
| 2026-06-21 | `npm test` (Vitest, `src/tokens.test.js`) | ✅ 7/7 passed | Run on `feature/qa-scaffold-vitest` after merging storage-migration + PWA branches; re-run after merge conflict resolution, still 7/7 |
| 2026-06-21 | `npm run build` | ✅ Pass | 31 modules, `dist/sw.js` + `manifest.webmanifest` + icons all generated |
| 2026-06-21 | Deployment verification (`dev-control/scripts/verify-deployment.sh`) | ✅ PASS | Run against local preview after tokens extraction, again after PWA changes, and against production `https://karma33.vercel.app/` — all returned HTTP 200 + Ollama vision verdict PASS |

## Manual runs

None yet. All `qa/TEST_CASES.md` manual cases remain status 📋 (not yet executed) — they require either a real browser/device session or component-test scaffolding not yet built (blocked on monolith decomposition).

## Evidence policy

Per `ClaudMasterInstruction.md` ("never mark QA passed without execution proof"), nothing in `qa/QA_SIGNOFF.md` is marked passed until a corresponding row exists here with concrete evidence (command output, screenshot, or test report) — a checklist item alone is not sufficient.
