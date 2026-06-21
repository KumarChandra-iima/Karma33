# Karma28 — Yoga Practice Engine: Admin Specification

This is the canonical reference for every configurable parameter across the
four Yoga & Dhyan practices. Two ways to use it:

1. **In the app** — tap the ⚙️ gear icon (top right, next to Adult/Teens) to
   open **Practice Settings**. Every number below is editable there, with
   changes saved instantly to your device.
2. **With Claude** — paste a line from this doc (or just describe the change
   in plain language) in a future conversation and ask for an update. Claude
   reads this file as the source of truth for what each number means and
   where it lives in the code (`DEFAULT_PRACTICE_CONFIG` in `App.jsx`).

All settings live in one JS object, `DEFAULT_PRACTICE_CONFIG`, and persist to
the browser's `localStorage` under the key `karma28_practice_config_v1`. Any
recorded audio (your voice, re-recordable any time) is stored separately in
`IndexedDB` under `karma28_audio_v1` — it never leaves the device.

---

## 0. General (Admin → ⚙️ General)

| Setting | Default | What it does |
|---|---|---|
| **Test Mode** | Off | Adds a "⏭ Skip" button to every timer (pranayama rounds, rest countdowns, Bhastrika, bells, asana holds) so a full practice can be run through in seconds while testing. Toggle off again before real use. |
| **Voice Character** | Natural (1.0×) | A single playback-rate multiplier applied to **every recorded cue** across all 4 practices — Deeper (0.82×) / Natural (1.0×) / Higher (1.18×) / Baby (1.4×), or any value via the slider. Does not affect AI voice, which has its own pacing per cue. |

**Do All 4 Together:** from the Yoga tab, the top card "🌅 Do All 4 Together"
opens a combined setup screen with the headline choices for all four
practices (Surya rounds, Kriya duration, Padmasana guide + speed, Sanyam
samadhi duration + bell count) on one page, with a live total-time estimate.
Tapping "Begin All 4 Practices" runs Surya → Kriya → Padmasana → Sanyam back
to back, skipping each one's individual setup screen, and marks all four
complete for the day at the end. The four practices remain available
individually below that card, exactly as before, for anyone who'd rather do
one at a time.

---

## 1. Surya Namaskar ☀️


| Setting | Default | Range | Where |
|---|---|---|---|
| Rounds | 6 | 1–24 | Chosen fresh each session, or set a new default in Admin |
| Seconds per pose | 4s | 2–15s | Admin |
| Mantra audio | AI Voice | AI / My Voice | Admin |

**Structure:** one full round = **24 poses**, not 12. Poses 1–12 lead with the
right leg (steps 4 & 9 are the right-leg lunges); poses 13–24 repeat the same
12-pose sequence leading with the left leg. This balances both sides per
round.

**Mantra cycling:** each round opens with one of the **12 traditional names
of Surya**, chanted in Sanskrit, before the poses begin. Round 1 = name 1,
round 2 = name 2, etc. After round 12 the list repeats from name 1.

| # | Name | Sanskrit | Meaning |
|---|---|---|---|
| 1 | Mitraya | ॐ मित्राय नमः | Friend of all |
| 2 | Ravaye | ॐ रवये नमः | The shining one |
| 3 | Suryaya | ॐ सूर्याय नमः | Dispeller of darkness |
| 4 | Bhanave | ॐ भानवे नमः | One who illumines |
| 5 | Khagaya | ॐ खगाय नमः | One who moves in the sky |
| 6 | Pushne | ॐ पूष्णे नमः | The nourisher |
| 7 | Hiranyagarbhaya | ॐ हिरण्यगर्भाय नमः | Golden cosmic womb |
| 8 | Marichaye | ॐ मरीचये नमः | Lord of the dawn rays |
| 9 | Adityaya | ॐ आदित्याय नमः | Son of Aditi |
| 10 | Savitre | ॐ सवित्रे नमः | Lord of creation |
| 11 | Arkaya | ॐ अर्काय नमः | Fit to be praised |
| 12 | Bhaskaraya | ॐ भास्कराय नमः | Bringer of light |

Each of the 12 mantra cues is individually recordable in Admin → Surya
Namaskar.

---

## 2. Sudarshan Kriya 🌀

### 3-Stage Pranayama
| Setting | Default | Range |
|---|---|---|
| Stage 1 rounds | 8 | 1–20 |
| Stage 2 rounds | 8 | 1–20 |
| Stage 3 rounds | 6 | 1–20 |
| Breath pattern (all 3 stages) | Inhale 4s → Hold 4s → Exhale 6s → Hold 2s | each 0–16s |
| Rest breaths between stages | 5 | 0–15 |

Hand positions are fixed per stage and spoken aloud: Stage 1 = thumbs on hip
bones, Stage 2 = thumbs under armpits, Stage 3 = elbows up, hands on the back.

### Bhastrika
| Setting | Default | Range |
|---|---|---|
| Rounds | 3 | 1–6 |
| Breaths per round | 20 | 5–40 |
| Rest breaths between rounds | 10 | 0–20 |

**Pump speed** is chosen at the start of the Bhastrika section itself (not in
Admin) via four radio-button presets — Slow (1400ms/breath), Medium (950ms),
Fast (600ms), Super Fast (380ms) — with a live "≈X seconds total" preview
before you start, so you can see the impact before committing.

### Lock, Sit & Om
| Setting | Default | Range |
|---|---|---|
| Break after lock-hold | 1 min | 1–3 min |
| Sitting position | Sukhasan | Sukhasan / Ardha-Padmasan / Padmasan |
| Om chants | 3 | 1–9 |
| Om audio | AI Voice | AI / My Voice |

The lock-hold itself is **not timed** — you hold as long as feels
comfortable, then tap Release.

### Main Kriya (the 20 / 40 / 40 cycle)
| Setting | Default | Range |
|---|---|---|
| Total duration | 15 min | 10 / 15 / 20 / 25 min |
| Structure | 3 rounds of 20 slow + 40 medium + 40 fast breaths | counts editable |
| During-Kriya audio | Silence | Silence / Music |

The app paces the slow/medium/fast breathing automatically so the full 3×
(20+40+40) = 300-breath structure fits whichever total duration you pick,
while keeping slow breaths slower than medium, and medium slower than fast.

---

## 3. Padmasana Dhyan 🪷

| Setting | Default | Range |
|---|---|---|
| Rounds | 1 | 1–5 |
| Guide source | YouTube | YouTube / My Voice / AI Voice |
| Playback speed (YouTube mode) | 1× | 1× / 1.5× / 1.75× / 2× |
| Reference video | `https://youtu.be/PhEEzpP7VmQ` | editable in Admin |

The video plays **embedded inside the app** (title + link shown, nothing
downloaded — respects YouTube's terms). In "My Voice" or "AI Voice" mode, the
app instead steps through the asana list below, narrating each one and
auto-advancing.

**Asana reference list** (15 entries, fully editable — add, remove, or
reorder in Admin): Neck Roll, Shoulder Rotation, Peacock Pose, Swing, Half
Moon Stretch, Breath of Joy, Cat Pose, Butterfly Pose, Cradle Pose,
Wind-Relieving Pose, Boat Pose, Serpent Posture, Locust Posture, Mountain
Posture, Padmasana Settle. Each has its own recordable narration cue.

---

## 4. Sanyam Dhyan 🌙

### Bhogar Pranayam
| Setting | Default | Range |
|---|---|---|
| Rounds | 8 | 1–20 |
| Breath pattern | Inhale 2s → Hold 4s → Exhale 1s → Hold 4s | each 0–10s |

### Pratyahar
Fixed spoken visualization cue (not user-editable, as the imagery is
specific): *"Imagine the rising sun at the base of the root chakra. Visualize
Lord Ganpati seated at the base of the spine."* No mantra is spoken here —
practitioners already know it from the course.

### Sahaj Samadhi Dhyan
| Setting | Default | Range |
|---|---|---|
| Duration | 20 min | 10 / 15 / 20 / 25 / 30 min |

Silent meditation — the app shows a quiet countdown only.

### Bell Rounds
| Setting | Default | Range |
|---|---|---|
| Bell count | 14 | 1–40 |
| Spacing between bells | 30s | 15s–120s, in 15s steps |

Bells are a synthesized tone (no audio file needed) — no mantra is spoken,
matching the course where practitioners chant silently to themselves.

### Closing
After the bells, the user is instructed to lie down. Once lying down, the
closing mantra cue plays (recordable, default AI says "Om Shanti" ×3).

---

## How recording works

Every recordable cue (Surya's 12 mantras, Kriya's Om chants, each Padmasana
asana, Sanyam's closing mantra) has its own **Record / Play mine / Play AI /
Remove** row in Admin. If no recording exists, the AI voice (on-device speech
synthesis) is used automatically — nothing is ever silent by default.
Recordings are stored locally per device and are not yet synced across
devices (a future Supabase-backed version could add cloud sync — see the
main app roadmap conversation for that architecture).

## Updating this spec

When you ask Claude to change a number (e.g. "make Stage 3 of the Kriya 8
rounds instead of 6", or "add a 16th asana to Padmasana called X"), Claude
edits `DEFAULT_PRACTICE_CONFIG` in `App.jsx` and this document together, so
they never drift out of sync.
