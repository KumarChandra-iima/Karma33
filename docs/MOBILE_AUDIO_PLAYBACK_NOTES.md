# Mobile PWA Audio Playback — Known Limitations & Mitigations

Date: 2026-06-27  
Branch: `fix/mobile-pwa-recorded-audio-player-state`  
Bug: BUG-006

---

## Summary of Issues Fixed

| Issue | Root Cause | Fix Applied |
|---|---|---|
| My Voice silent on iOS | `audio/webm` unsupported for playback on iOS Safari | `getBestMimeType()`: records as `audio/mp4` on iOS |
| Play button stays as "Play" after tapping | No playback state tracked; Audio element was local var | `useRecordedAudioPlayer` context with Pause/Resume/Stop UI |
| Overlapping audio on repeated taps | Each tap creates a new Audio object with no deduplication | Central player stops previous audio before starting new |
| Other cue play buttons not disabled | Each `CueRecorderRow` had independent state | Shared `activeCueId` in context disables all other rows |

---

## MIME Type Strategy

### Problem
`audio/webm` (previously hardcoded) is **not supported** for playback on iOS Safari (any version). iOS Safari's `HTMLAudioElement` can only play `audio/mp4` (AAC codec).

iOS Safari added **MediaRecorder support in iOS 16.4** (March 2023). It records in `audio/mp4` by default. Before iOS 16.4, recording is not possible.

### Fix: `getBestMimeType()` in `src/hooks/useRecordedAudioPlayer.jsx`

Priority order for MediaRecorder MIME type selection:
1. `audio/mp4` — iOS Safari 16.4+, Chrome Android, most mobile browsers
2. `audio/webm;codecs=opus` — Chrome/Firefox desktop, Chrome Android
3. `audio/webm` — Chrome/Firefox desktop
4. `audio/ogg;codecs=opus` — Firefox desktop
5. `` (empty) — browser default (MediaRecorder chooses)

The blob created in `useMicRecorder.stop()` uses the same MIME type as the MediaRecorder so that the stored blob plays back correctly on the recording device.

**Important:** Recordings made before this fix (stored as `audio/webm` blobs) may still fail on iOS. Users should re-record after updating.

---

## User Gesture Policy

### Problem
Mobile browsers (iOS Safari, Chrome iOS, Chrome Android) enforce a **user-gesture policy** for audio playback:
- `HTMLAudioElement.play()` must be called in the **same synchronous call stack** as a user click/touch event
- Any `async/await` between the gesture and `play()` breaks the gesture token
- The browser throws `NotAllowedError`, which was previously swallowed silently

### Fix: Pre-cached blob in `audioBlobRef`

`CueRecorderRow` pre-loads the recorded blob into `audioBlobRef` (a React `useRef`) via a background `useEffect`. The `handlePlayMine()` click handler reads from the ref synchronously and calls `player.play()` which calls `audio.play()` in the same tick.

### Sequence Playback (Yoga Flow)

When the user starts a Surya Namaskar session with "My Voice" selected, `announceMantra()` calls `playCue()` which:
1. Awaits `idbGet()` to fetch the blob (async — breaks gesture token)
2. Calls `playBlob()` which calls `audio.play()`

This async gap means mobile browsers MAY block sequence playback.

#### Mitigation 1: Audio unlock on "Begin Practice"
The "Begin Practice" button click calls `unlockAudioForMobile()` before starting the sequence. This plays a minimal silent WAV (44-byte valid WAV, 0 audio samples) from the user gesture. On many browsers/versions, this registers the origin as "audio-permitted" for the session, allowing subsequent programmatic `audio.play()` calls.

**Reliability:** Works on Chrome Android. Behavior on iOS Safari is version-dependent and not guaranteed (Apple has tightened policies in iOS 17+).

#### Mitigation 2: Automatic fallback to AI voice
`playBlob()` now accepts an `onFail` callback. `playCue()` passes `speakAwait(fallbackText)` as the fallback. If `audio.play()` is blocked, the TTS fallback fires automatically and the sequence continues with AI voice. The user hears the mantra either way.

---

## Manual Mobile QA Checklist

> Automated Playwright tests run on desktop Chromium. Mobile behavior must be verified manually.

### Setup
- [ ] Install PWA on iPhone/Android (add to home screen from Safari/Chrome)
- [ ] Open Karma33 PWA
- [ ] Navigate to Admin → Yoga & Dhyan → Surya Namaskar → Record the 12 mantras

### Recording
- [ ] Tap 🎙️ Record on mantra 1
- [ ] Speak "Om Mitraya Namaha" into the mic
- [ ] Tap ⏹ Stop
- [ ] Confirm badge shows "RECORDED"

### Manual Preview
- [ ] Tap **▶ Play mine**
- [ ] Confirm **⏸ Pause** and **⏹ Stop** buttons appear immediately
- [ ] Confirm your voice plays through the speaker
- [ ] Tap **⏸ Pause** — confirm audio pauses
- [ ] Tap **▶ Resume** — confirm audio resumes
- [ ] Tap **⏹ Stop** — confirm audio stops, button returns to **▶ Play mine**

### Duplicate playback prevention
- [ ] Tap **▶ Play mine** rapidly (3+ times) — confirm audio only plays ONCE
- [ ] Confirm other mantra Play buttons are disabled (greyed out) while one plays

### Play AI
- [ ] While mantra 1 is NOT playing, tap **🤖 Play AI** — confirm AI voice plays
- [ ] While another row is playing, tap **🤖 Play AI** on a different row — confirm it is disabled

### Surya sequence playback with My Voice
- [ ] In Admin → Surya Namaskar settings, select "🎙️ My Voice"
- [ ] Tap **🙏 Begin Practice**
- [ ] Confirm: on round 1, your recorded voice plays the mantra (or AI fallback plays automatically if recording fails)
- [ ] Confirm: practice sequence continues after the mantra

### Edge cases
- [ ] Delete a recording (✕ Remove), then tap **▶ Play mine** — confirm it doesn't appear (button removed)
- [ ] Record a new take — confirm **▶ Play mine** reappears with new recording
- [ ] If audio doesn't play after tap: check phone is not on silent/vibrate mode. Try toggling Ringer switch (iOS). PWA audio requires ringer to be ON on iOS.

---

## Known Unresolved Limitations

### iOS Silent Mode
PWA audio is muted when iPhone Ringer Switch is in silent mode. This is an iOS system policy and cannot be overridden by the web app. Instruct users to:
- Turn off silent mode before starting a session
- Increase media volume (separate from ringer volume)

### Pre-iOS 16.4: No recording
`MediaRecorder` was not available on iOS Safari before iOS 16.4 (March 2023). Users on older iOS versions cannot record custom voice cues. The "🎙️ Record" button will silently fail (`getUserMedia` rejects). Recommendation: show a browser compatibility warning if `MediaRecorder` is undefined.

### Sequence playback gesture token (iOS 17+)
As of iOS 17, Apple tightened the gesture-token policy. Even with the `unlockAudioForMobile()` trick, sequence playback of recorded audio in round 2+ (triggered from `useEffect`, not a gesture) may still fail. The automatic TTS fallback ensures the user always hears the mantra. Full resolution would require a dedicated "Tap to hear next mantra" button inside the sequence player, which is outside the scope of this fix.

### Cross-device recordings
Recordings are stored in IndexedDB on the recording device. They are not synced to other devices. A recording made on Android Chrome (`audio/webm`) will not play if the same IDB database is somehow accessed from iOS (different device, different browser).

---

## Files Changed in This Fix

| File | Change |
|---|---|
| `src/hooks/useRecordedAudioPlayer.jsx` | NEW: `getBestMimeType`, `RecordedAudioPlayerProvider`, `useRecordedAudioPlayer` hook |
| `src/App.jsx` | `useMicRecorder`: MIME detection; `playBlob`: fallback support; `playCue`: auto-TTS fallback; `CueRecorderRow`: Pause/Resume/Stop UI + mutual exclusion; `unlockAudioForMobile`; `Karma28` wrapped in provider |
| `src/test/mobileAudioPlayer.test.jsx` | NEW: 17 tests covering MIME, UI states, mutual exclusion, fallback, URL lifecycle |
