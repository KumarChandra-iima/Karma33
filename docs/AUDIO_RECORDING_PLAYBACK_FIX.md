# Audio Recording Playback Fix — Surya Namaskar "My Voice"

Date: 2026-06-27  
Branch: `fix/surya-my-voice-playback`  
Bug: BUG-005

---

## Summary

Surya Namaskar "My Voice" recordings appeared saved (RECORDED badge shown) but tapping **▶ Play mine** produced no audio. **🤖 Play AI** worked correctly throughout.

---

## Root Cause

The `previewRecorded` handler in `CueRecorderRow` was declared `async` and performed an `await idbGet(cueId)` before calling `audio.play()`:

```js
// BROKEN — async gap between click and play()
async function previewRecorded(){
  const blob = await idbGet(cueId);   // ← breaks user-gesture token
  if (blob) playBlob(blob);
}
```

Mobile browsers (Safari, Chrome on iOS, Chrome Android) enforce a **user-gesture policy**: `HTMLAudioElement.play()` must be called **in the same synchronous call-stack tick** as the click event. Any `await` between the click and `play()` hands control back to the event loop, the gesture token expires, and the browser silently blocks playback (throws `NotAllowedError`, caught and swallowed by `.catch(finish)` in `playBlob`).

**Play AI worked** because `previewAI` is fully synchronous:
```js
function previewAI(){ speak(fallbackText, 0.85); }  // no await — works
```

---

## Fix

**File: `src/App.jsx` — `CueRecorderRow`**

Added `audioBlobRef = useRef(null)` to pre-cache the blob from IndexedDB as a background side-effect (no user gesture required). A `useEffect` loads the blob into the ref whenever `hasRec` becomes true.

`previewRecorded` is now fully synchronous — it reads from the pre-cached ref and calls `URL.createObjectURL` and `audio.play()` in the same tick as the click:

```js
// FIXED — synchronous, preserves mobile gesture token
function previewRecorded(){
  setPlayErr(false);
  const blob = audioBlobRef.current;       // ← pre-loaded, no await
  if (!blob) { setPlayErr(true); return; }
  const url = URL.createObjectURL(blob);   // synchronous
  const audio = new Audio(url);
  audio.play().catch(() => { finish(); setPlayErr(true); }); // in same tick
}
```

A visible error message is now shown when playback fails:
> *"Recorded audio could not be played. Please re-record or check browser audio permission."*

---

## Why the recording was saving correctly

The save path (`useMicRecorder.stop`) is triggered by the `MediaRecorder.onstop` event — a different flow that doesn't need a user-gesture token for audio output. IndexedDB writes were always succeeding. The issue was exclusively in the playback path.

---

## Why IDB_NAME stayed `karma28_audio_v1`

The IndexedDB database name was not migrated to `karma33_*`. This is intentional: existing user recordings (made during testing with the earlier build) are still in `karma28_audio_v1`. Migrating the key would delete all existing recordings. The IDB name will stay as-is until a safe migration strategy is decided.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.jsx` | `CueRecorderRow`: add `audioBlobRef`, pre-load effect, synchronous `previewRecorded`, `playErr` state + error banner, `data-testid` attributes |
| `src/test/suryaVoicePlayback.test.jsx` | New: 8 tests covering synchrony contract, blob null guard, Play AI path, URL revocation, clearRec, cue ID consistency |

---

## QA Evidence

| Check | Result |
|---|---|
| 51/51 automated tests (vitest) | ✅ Pass |
| `npm run build` | ✅ Green (34 modules, 384ms) |
| Onboarding flow (Playwright) | ✅ `allPassed: true`, 4/4 steps |
| Root cause confirmed by Ollama/qwen2.5-coder | ✅ Async gesture-token break |
