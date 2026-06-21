# Karma28 — Product Requirements Document

*A complete, tool-agnostic specification of the Karma28 app, written so it
can be handed to any AI assistant, designer, or developer and understood
without prior context.*

---

## 1. What Karma28 is

Karma28 is a 28-day personal transformation app built around three parallel
daily practices: **Yoga & Dhyan** (spiritual/breathwork practice), **Ideal
Weight** (fitness/exercise), and **Kommunicate** (communication skills,
AI-coached). It targets adults practicing the Art of Living tradition
(Sri Sri Ravi Shankar's teachings), with a parallel **teen-oriented persona**
covering the same three pillars in age-appropriate language ("Morning
Power," "Boss Moves," "Real Talk").

The founder is an Art of Living practitioner with a disciplined personal
routine (wake ~3:30–4 AM, yoga before 6 AM, one meal at noon, fast after
6 PM) — the app is built to support and gamify that exact lifestyle for
others, not a generic wellness app.

**Business model:** free beta launch, then a paid subscription. Users can
subscribe to one pillar, any two, or all three. Target pricing ₹99–249/month
depending on bundle, with Kommunicate priced slightly higher because it uses
a paid AI API for coaching feedback.

---

## 2. Platforms

One responsive web app, deployed three ways:

1. **Website** — full responsive site. On wide viewports (desktop), it uses
   a sidebar + multi-column dashboard layout that takes advantage of screen
   space. On narrow viewports, it automatically falls back to the same
   layout used by the mobile apps.
2. **Android app** and **3. iOS app** — both wrap the *same* codebase (via
   Capacitor or equivalent), so they render an identical UI to each other.
   There is no separate native redesign for either platform — visual and
   interaction parity between Android and iOS is a hard requirement, not a
   nice-to-have.

Tech stack used in the working build so far: React (single-file component
architecture), Vite, deployed to Vercel. Local persistence currently via
`localStorage` (app state) and `IndexedDB` (recorded audio blobs, which can
be large). Planned backend: Supabase (Postgres + Auth) for multi-device sync
and subscription-gated feature access.

---

## 3. Core structure

- **28-day cycle**, Day 1–28, calculated from a user-chosen start date
  (defaults to "tomorrow" at setup).
- **Two-week phase split**: Week 1–2 = "Foundation," Week 3–4 = "Intensity"
  (exercise difficulty increases at the midpoint).
- **Three tabs**, always visible: Yoga & Dhyan, IdealWeight, Kommunicate.
  Each has its own independent completion tracking, streak counter, and
  28-day calendar.
- **Two personas**: Adult (full feature set) and Teens (beta — simplified
  language, shorter sessions, same underlying structure). Persona and a
  Dark/Vivid visual mode are switchable at any time from the header.
- **Visual identity**: each tab has a signature gradient and accent color —
  Yoga (saffron-orange → magenta/purple, sun-and-spirituality themed),
  Weight (red → amber, energetic), Kommunicate (blue → cyan, calm/clear).
  "Vivid" mode shows full gradient backgrounds; "Dark" mode is a near-black
  theme with the same accent colors used sparingly. This is intentional
  branding tied to the Surya (sun) motif running through the Yoga practices
  — not meant to be replaced with a generic neutral palette.
- **Daily wellness rules** (separate from the three main practices, shown
  every day regardless of tab): morning water (3L before 6 AM), yoga before
  6 AM, one meal at noon (11:30 AM–1 PM), no food after 6 PM. These are
  simple checkable habits with their own reminder notifications.
- **Setup wizard** (first run only): collects name, wake-up time
  (recommended 3:30–4:00 AM), and yoga session duration (30/45/60/75/90
  min) — the app then calculates a "start yoga by" reminder time working
  backward from 6 AM.
- **Reminders**: scheduled local notifications/spoken alerts at wake time,
  calculated yoga-start time, 11:11 AM (meal planning), and 6:00 PM (fasting
  window begins).
- **28-day calendar**: real calendar dates (not just "Day N"), grouped by
  month, each day showing a small colored dot per tab indicating completion,
  with missed-day tracking and quick navigation to any day.
- **Voice quick-log**: a "Tap & Talk" button using on-device speech
  recognition lets the user say things like "yoga done" or "had my meal" and
  the app parses intent and asks for confirmation before logging — for
  marking progress hands-free, especially useful right after a sweaty
  workout or right after waking up.

---

## 4. Yoga & Dhyan — full specification

This is the most detailed and most important module. It must be **fully
audio-guided** — a practitioner mid-yoga should never need to read text off
the screen; every instruction is spoken aloud (either AI voice or the
user's own pre-recorded voice), with visual elements (a circular "breath
ring" timer) as secondary reinforcement, not the primary instruction
channel.

There are four distinct practices, each independently launchable, plus a
"do all four together" combined mode.

### 4.1 Surya Namaskar (Sun Salutation)

- **One full round = 24 poses**, not 12 — this is a deliberate correction
  from a common simplification. The 24 poses are two passes of the same
  12-pose cycle (Pranamasana → Hasta Uttanasana → Hasta Padasana → Ashwa
  Sanchalanasana → Dandasana → Ashtanga Namaskara → Bhujangasana → Adho
  Mukha Svanasana → Ashwa Sanchalanasana → Hasta Padasana → Hasta
  Uttanasana → Pranamasana): the first 12 lead with the right leg in the
  lunge poses (positions 4 and 9 of that cycle), the second 12 lead with the
  left leg — together balancing both sides in one "round."
- The user picks how many rounds to do before starting (1 up to 12+).
- **Each round opens with a spoken Sanskrit mantra** — one of the 12
  traditional names of Surya, cycling through the list in order and
  repeating from the start once all 12 have been used in a session:

  1. Mitraya (Friend of all) — 2. Ravaye (The shining one) — 3. Suryaya
  (Dispeller of darkness) — 4. Bhanave (One who illumines) — 5. Khagaya (One
  who moves in the sky) — 6. Pushne (The nourisher) — 7. Hiranyagarbhaya
  (Golden cosmic womb) — 8. Marichaye (Lord of the dawn rays) — 9. Adityaya
  (Son of Aditi) — 10. Savitre (Lord of creation) — 11. Arkaya (Fit to be
  praised) — 12. Bhaskaraya (Bringer of light).

- Each mantra, and the pose-by-pose narration, can be either AI-spoken or
  the user's own pre-recorded voice (recordable inline, not buried in a
  settings-only screen).
- Per-pose hold duration is configurable (default ~4 seconds, adjustable).

### 4.2 Sudarshan Kriya (Art of Living's signature breathwork)

A long, multi-stage practice, in this exact order:

1. **3-Stage Pranayama** — each stage is a repeated breath cycle of
   **Inhale 4s → Hold 4s → Exhale 6s → Hold 2s**, with a spoken hand-position
   cue per stage (Stage 1: thumbs on hip bones; Stage 2: thumbs under
   armpits; Stage 3: elbows up, hands on the back). Stage 1 = 8 rounds,
   Stage 2 = 8 rounds, Stage 3 = 6 rounds, with a handful of normal
   relaxed breaths as a transition between stages (default 5).
2. **Bhastrika (bellows breath)** — 3 rounds of 20 rapid forceful breaths
   each, counted aloud/visually, with normal-breath rest between rounds.
   The pace of "rapid" should be adjustable, ideally via simple presets
   (e.g. Slow/Medium/Fast/Super Fast) rather than forcing the user to think
   in milliseconds, with a preview of how long that choice will take.
3. **Locks & breath hold** — after Bhastrika, the user applies bandhas
   (locks) and holds the breath for as long as is comfortable — this step is
   *not* timed/forced, it's user-released — followed by a short configurable
   rest break (1–3 minutes).
4. **Sit in a meditation posture** (Sukhasan / Ardha-Padmasan / Padmasan,
   user's choice, default Sukhasan).
5. **Om chant ×3** (configurable count), spoken or pre-recorded.
6. **Main Kriya** — the actual Sudarshan Kriya breathing pattern: three
   rounds of **20 slow + 40 medium + 40 fast breaths** each. Total session
   duration is user-selectable (10/15/20/25 minutes), and the app paces the
   slow/medium/fast breathing speed automatically so the fixed 20/40/40×3
   breath structure fits whichever duration is chosen, while keeping slow
   breaths meaningfully slower than medium, and medium slower than fast.
   During this phase, the user can choose silence or soft background music.
7. **Savasana** (lying down, integration) to close.

### 4.3 Padmasana Dhyan (lotus meditation, asana-based)

- A sequence of ~15 reference postures/movements (neck rolls, shoulder
  rotations, cat pose, butterfly pose, boat pose, etc., ending in seated
  Padmasana) — this list should be editable, not hardcoded permanently.
- **Three interchangeable guide sources**, user's choice at the start of
  each session:
  1. An **embedded reference video** (currently a specific YouTube link)
     played inside the app itself — not downloaded, just embedded, with the
     title and a direct link shown for attribution/copyright cleanliness.
     Playback speed should be adjustable (1×/1.5×/1.75×/2×).
  2. The **user's own recorded narration** of each posture.
  3. **AI-generated narration** of each posture.
- Number of rounds is user-configurable.

### 4.4 Sanyam Dhyan (evening closing practice)

In order:
1. **Bhogar Pranayam** — breath pattern **Inhale 2s → Hold 4s → Exhale 1s →
   Hold 4s**, repeated for a configurable number of rounds (default 8).
2. **Pratyahar** — a spoken visualization cue: imagining the rising sun at
   the base of the root chakra, and visualizing Lord Ganpati seated at the
   base of the spine. (No mantra is spoken at this step — practitioners are
   assumed to already know it from prior training; the app should never
   try to supply or guess at it.)
3. **Sahaj Samadhi Dhyan** — silent timed meditation, duration configurable
   (10/15/20/25/30 minutes).
4. **Bell rounds** — a series of spaced bell tones (synthesized, no audio
   file needed), with configurable bell count (e.g. up to 30+) and
   configurable spacing between bells (15 seconds up to 2 minutes). No
   mantra is spoken here either — same reasoning as above.
5. **Lie down** instruction.
6. **Closing mantra** (recordable or AI), played once lying down.

### 4.5 Audio & voice architecture (applies across all four practices)

- Every spoken instruction is a discrete, individually identifiable "cue."
- For each cue, in priority order: if the user has recorded their own
  voice for it, play that; otherwise fall back to AI text-to-speech.
- Users can record (and re-record) any individual cue at any time —
  ideally both from a central settings/admin area *and* inline, right at
  the point in a session setup screen where that audio choice is being
  made, so recording never requires hunting through a separate menu first.
- **AI voice quality is a known weak point** ("robotic") — the app should
  make recording the user's own voice the easy, encouraged path rather than
  a buried secondary option.
- A **global voice-character control**: once the user has recorded cues,
  let them adjust playback pitch/speed (presets like Deeper / Natural /
  Higher / "Baby" voice, plus a fine slider) applied uniformly to all
  recorded playback — so one recording session can be reshaped without
  re-recording. This does not require true independent pitch-shifting (DSP
  complexity not justified here) — a simple combined playback-rate change is
  an acceptable, clearly-labeled approximation.
- True voice cloning (AI narration that sounds like a specific person) is
  explicitly **out of scope** for the current build — it would require a
  paid third-party voice-cloning API, which is a separate future decision,
  not something to attempt with on-device speech synthesis.

### 4.6 Admin / configuration requirements

- Every number above (round counts, breath-pattern timings, durations,
  bell counts/spacing, default audio source per practice) must be centrally
  configurable from one place — not hardcoded — so the founder can retune
  the app's behavior without a code change.
- This configuration should be documented in a single, human-readable
  reference (numbers, ranges, defaults, what each setting affects) that
  stays in sync with whatever drives the actual app behavior, so future
  change requests can reference it directly instead of re-deriving the
  whole spec from scratch each time.
- **A "test/admin mode"** toggle: when enabled, every timed step in every
  practice gets a visible "skip" control so the full flow of any practice
  can be run through in seconds for testing, without sitting through real
  minutes-long timers. This must default to off.

### 4.7 Combined practice mode

In addition to launching each of the four Yoga practices individually
(which remains the default/primary path), there must be a **single combined
flow**: one upfront screen to choose the key settings for all four
practices at once (rounds, durations, audio source, etc.) with a live total
time estimate, after which the app runs Surya Namaskar → Sudarshan Kriya →
Padmasana Dhyan → Sanyam Dhyan back-to-back without stopping at each
practice's individual setup screen, and marks all four complete at the end.

---

## 5. IdealWeight (exercise) — current state

- A daily exercise schedule generated programmatically across the 28 days,
  with rest days, and difficulty increasing after the Week 1–2 → Week 3–4
  phase boundary.
- Each exercise has a name, duration/rep count, step-by-step instructions,
  and a short coaching tip.
- This module is comparatively simple today (data + instructions, no audio
  engine yet) — it has not had the same audio-guided treatment as Yoga, and
  could be a candidate for similar treatment later if desired.

## 6. Kommunicate (communication skills) — current state

- A daily communication challenge/topic (28 distinct topics across the
  cycle), each naming a specific communication technique (e.g. "FORD
  Method," "Yes-And," "Story Spine") with an explanation and a practice
  prompt.
- The user records themselves practicing out loud, then **submits a short
  written self-summary of what they said**, which is sent to an AI model
  for coaching feedback: numeric scores (content/structure/delivery/
  technique), strengths, areas to improve, and one concrete suggestion for
  the next day.
- A "Connections" feature: a simple personal CRM of VIP and casual contacts,
  with a daily tap-to-mark-as-connected-today interaction, to encourage
  actually using the communication skills with real people, not just
  practicing in isolation.

---

## 7. Cross-platform design requirements (see also the dedicated UI plan)

- One shared component library and design-token system (colors, spacing,
  type scale) used by every platform — no separate visual language per
  platform.
- **Android and iOS must be visually and behaviorally identical** to each
  other. This is achieved by shipping the same web codebase inside a native
  wrapper for both, not by maintaining two native UIs in parallel.
- **The website must adapt to its context**: a desktop browser gets a
  layout that uses the available width (sidebar navigation, multi-column
  dashboard, persistent stats panel) rather than a stretched phone layout; a
  mobile browser on the same site gets the same layout used by the native
  apps. The decision is based on both viewport width and whether the code
  is running inside the native app shell.
- Components are not redesigned between desktop and mobile — they are
  rearranged. A practice card, a calendar cell, a streak counter looks the
  same wherever it appears; only the grid/layout around it changes.

---

## 8. Explicitly out of scope / deferred decisions

- True AI voice cloning of the founder's voice (cost/complexity — separate
  future decision, likely a paid third-party API).
- Multi-device cloud sync of recorded audio (currently device-local via
  IndexedDB; a Supabase-backed sync layer is a planned but not yet built
  enhancement).
- Fully native (non-shared-codebase) iOS/Android development — only being
  considered if a specific platform capability requires it later.
- Final subscription/billing integration (Razorpay/Stripe) — pricing tiers
  and bundle structure are decided in principle (single app, feature-flagged
  by subscription tier read from auth) but payment wiring is not yet built.

---

*This document reflects the state of requirements as of the current
development cycle. When requirements change, this file should be updated
alongside any corresponding configuration/spec files so they don't drift
out of sync.*
