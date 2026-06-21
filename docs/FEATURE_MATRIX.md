# Feature Matrix — Karma33

Date: 2026-06-21
Source requirements: `KARMA28_REQUIREMENTS.md`, `CROSS_PLATFORM_PLAN.md`, `ADMIN_SPEC.md`, `karma28-platform-mockup.html` (all treated as Karma33 requirements per `ClaudMasterInstruction.md`).

Legend: Existing/Partial/Missing are mutually exclusive status flags. Reusable/Refactor/Rebuild are classification flags for Phase 4 (one or more may apply at sub-feature level — see `CODE_REUSE_ANALYSIS.md` for the full rationale). Priority is for the upcoming phase plan, not a measure of spec importance.

## 1. Yoga & Dhyan

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Surya Namaskar (24-pose, 12-mantra cycling) | ✅ | | | ✅ | | | High |
| Sudarshan Kriya (3-stage pranayama → Bhastrika → locks → Om → main Kriya → Savasana) | ✅ | | | ✅ | | | High |
| Padmasana Dhyan (YouTube / My Voice / AI Voice guide sources) | ✅ | | | ✅ | | | High |
| Sanyam Dhyan (Bhogar → Pratyahar → Samadhi → Bells → closing mantra) | ✅ | | | ✅ | | | High |
| Combined "Do All 4 Together" sequencing | ✅ | | | ✅ | | | Med |
| Per-cue recording (record/play mine/play AI/remove) | ✅ | | | ✅ | | | High |
| Global voice-character (pitch/rate) control | ✅ | | | ✅ | | | Low |
| Test/Admin skip-mode | ✅ | | | ✅ | | | Med |
| Centralized `DEFAULT_PRACTICE_CONFIG` | ✅ | | | ✅ | | | High |

## 2. IdealWeight

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| 28-day generated exercise schedule w/ rest days | ✅ | | | ✅ | | | Med |
| Foundation (wk1-2) → Intensity (wk3-4) difficulty step | ✅ | | | ✅ | | | Med |
| Exercise card: name, duration/reps, instructions, tip | ✅ | | | ✅ | | | Med |
| Audio-guided treatment (parity with Yoga module) | | | ❌ | | | ✅ | Low |

## 3. Kommunicate

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| 28-day topic curriculum (adult + teen) | ✅ | | | ✅ | | | Med |
| Self-recording of practice | ✅ | | | ✅ | | | Med |
| Written self-summary capture | ✅ | | | ✅ | | | Med |
| AI coaching feedback (real API call, scoring, suggestions) | | ➖ | | | ✅ | | High |
| Connections / CRM panel | ✅ | | | ✅ | | | Low |

Note on AI coaching: the UI captures a written summary and is structurally ready to send it somewhere, but no network call or API integration exists in `karma28.jsx` today — this is a backend integration gap, not a UI gap, hence Partial + Refactor rather than Missing + Rebuild.

## 4. Subscription

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Free Beta tier | | | ❌ | | | ✅ | Med |
| Per-module subscription (Yoga / IdealWeight / Kommunicate) | | | ❌ | | | ✅ | Med |
| "Any Two Modules" bundle | | | ❌ | | | ✅ | Low |
| Full Karma33 bundle | | | ❌ | | | ✅ | Low |
| Razorpay / Stripe / App Store / Play Store billing | | | ❌ | | | ✅ | Low (explicitly deferred in spec) |

Nothing subscription-related exists in code today — no feature flags, no entitlement checks, no auth-derived tier. This entire area is greenfield and depends on Backend (Supabase Auth) landing first.

## 5. Dashboard

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Mobile dashboard (today card, streaks, 28-day calendar) | ✅ | | | ✅ | | | High |
| Desktop layout (sidebar + multi-column + right rail) | | | ❌ | | | ✅ | High |
| Viewport/platform-based layout switch (`isNativeApp \|\| !isWideScreen`) | | | ❌ | | | ✅ | High |
| Shared design-token system (`tokens.js`) | | ➖ | | | ✅ | | High |
| Component "rearrange not redesign" discipline | | ➖ | | | ✅ | | Med |

Design tokens are graded Partial because `buildTheme()`/`tabCfg` objects already contain most of the needed values inline in `karma28.jsx` — they just aren't extracted into a standalone module yet, exactly as `CROSS_PLATFORM_PLAN.md §4` step 2 anticipates.

## 6. Admin

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Practice config admin panel (all 4 Yoga practices) | ✅ | | | ✅ | | | High |
| Cue recording UI per practice | ✅ | | | ✅ | | | High |
| Test mode toggle | ✅ | | | ✅ | | | Med |
| Karma33-level admin (users, subscriptions, content beyond Yoga config) | | | ❌ | | | ✅ | Low |

`ADMIN_SPEC.md` only covers the Yoga practice engine config, which is fully implemented. A broader product-admin surface (users/subscriptions/content) is implied by the master instruction's "Admin" stream but not specified in detail anywhere yet — flag for requirements clarification before Rebuild work starts.

## 7. PWA

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Web app manifest | ✅ | | | ✅ | | | Med |
| Theme/background color, standalone display | ✅ | | | ✅ | | | Low |
| App icons (manifest icon array) | | | ❌ | | | ✅ | Med |
| Service worker / offline support | | | ❌ | | | ✅ | Med |
| Install prompts / screenshots | | | ❌ | | | ✅ | Low |

## 8. Mobile App

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Single shared codebase (no separate native UI) | ✅ (by construction — only one React app exists) | | | ✅ | | | High |
| Capacitor wrapping (Android) | | | ❌ | | | ✅ | Med (Phase 2 target per master instruction) |
| Capacitor wrapping (iOS) | | | ❌ | | | ✅ | Low (Phase 3 target) |
| Native shell polish (status bar, splash, push permission prompts) | | | ❌ | | | ✅ | Low |

## 9. Backend

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Supabase Auth | | | ❌ | | | ✅ | High |
| Supabase Postgres (multi-device sync of app state) | | | ❌ | | | ✅ | High |
| Cloud sync of recorded audio (currently IndexedDB-only) | | | ❌ | | | ✅ | Med |
| Subscription/entitlement read from auth | | | ❌ | | | ✅ | Med |
| AI coaching API call for Kommunicate | | ➖ | | | ✅ | | High |

## 10. QA

| Requirement | Existing | Partial | Missing | Reusable | Refactor | Rebuild | Priority |
|---|---|---|---|---|---|---|---|
| Test plan / test cases | | | ❌ | | | ✅ | High |
| Automated test runner (unit/integration) | | | ❌ | | | ✅ | High |
| Regression suite | | | ❌ | | | ✅ | Med |
| Manual QA execution register + sign-off process | | | ❌ | | | ✅ | High |

See `qa/` deliverables for the actual test plan once Phase 2 approval is given — per the master instruction, QA artifacts are required in parallel with development, not produced here as code yet.

## Cross-cutting items not in the original 10-area list but surfaced by this assessment

- **Karma28 → Karma33 rename**: storage keys, manifest name, doc titles — affects every area above and should be sequenced early (a versioned storage-key bump, e.g. `karma33_v1`, needs a migration decision: fresh start vs. read-old-write-new).
- **Duplicate Vite build (`karma28-zip` vs `k28zip`)**: needs a decision (keep/delete/merge) before Stream A starts touching the Vite project structure — see `CODE_REUSE_ANALYSIS.md`.
