import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

/**
 * Returns the best MIME type for MediaRecorder on the current browser.
 * Priority: audio/mp4 (iOS Safari 16.4+, Chrome Android), then webm/opus
 * (Chrome/Firefox desktop/Android), then plain webm, then browser default.
 * The recorded blob type MUST match the MediaRecorder mimeType so playback
 * succeeds on the same device that recorded it.
 */
export function getBestMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    try { if (MediaRecorder.isTypeSupported(type)) return type; } catch (e) {}
  }
  return "";
}

export const RecordedAudioPlayerContext = createContext(null);

/**
 * Provides centralized recorded-audio playback state for all CueRecorderRow
 * instances in the tree. Only one cue can play at a time. Exposes play /
 * pause / resume / stop and tracks activeCueId + status so every row can
 * derive its own disabled / play / pause / resume / stop state.
 */
export function RecordedAudioPlayerProvider({ children }) {
  const [activeCueId, setActiveCueId] = useState(null);
  // "idle" | "playing" | "paused" | "error"
  const [status, setStatus] = useState("idle");
  const [errorCueId, setErrorCueId] = useState(null);

  const audioRef = useRef(null);
  const urlRef = useRef(null);

  const _cleanup = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      try { a.pause(); } catch (e) {}
      audioRef.current = null;
    }
    if (urlRef.current) {
      try { URL.revokeObjectURL(urlRef.current); } catch (e) {}
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    _cleanup();
    setActiveCueId(null);
    setStatus("idle");
  }, [_cleanup]);

  /**
   * play(cueId, blob, opts)
   *
   * MUST be called synchronously inside a click handler. `blob` must already
   * be in memory (pre-cached by the caller, no await before this call).
   *
   * opts.rate        — playback rate (default 1.0)
   * opts.onFallback  — called when blob is null, empty, or playback throws/rejects
   */
  const play = useCallback((cueId, blob, opts = {}) => {
    _cleanup();
    setErrorCueId(null);

    if (!blob || blob.size === 0) {
      setActiveCueId(null);
      setStatus("idle");
      if (opts.onFallback) opts.onFallback();
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      if (opts.rate) audio.playbackRate = opts.rate;

      urlRef.current = url;
      audioRef.current = audio;

      setActiveCueId(cueId);
      setStatus("playing");

      audio.onended = () => {
        _cleanup();
        setActiveCueId(null);
        setStatus("idle");
      };

      audio.onerror = () => {
        _cleanup();
        setActiveCueId(null);
        setStatus("error");
        setErrorCueId(cueId);
        if (opts.onFallback) opts.onFallback();
      };

      audio.play().catch(() => {
        _cleanup();
        setActiveCueId(null);
        setStatus("error");
        setErrorCueId(cueId);
        if (opts.onFallback) opts.onFallback();
      });
    } catch (e) {
      _cleanup();
      setActiveCueId(null);
      setStatus("error");
      setErrorCueId(cueId);
      if (opts.onFallback) opts.onFallback();
    }
  }, [_cleanup]);

  const pause = useCallback(() => {
    if (audioRef.current && status === "playing") {
      try { audioRef.current.pause(); } catch (e) {}
      setStatus("paused");
    }
  }, [status]);

  const resume = useCallback(() => {
    if (audioRef.current && status === "paused") {
      audioRef.current.play().catch(() => {
        _cleanup();
        setActiveCueId(null);
        setStatus("error");
      });
      setStatus("playing");
    }
  }, [status, _cleanup]);

  useEffect(() => () => _cleanup(), [_cleanup]);

  return (
    <RecordedAudioPlayerContext.Provider
      value={{ activeCueId, status, errorCueId, play, pause, resume, stop }}
    >
      {children}
    </RecordedAudioPlayerContext.Provider>
  );
}

export function useRecordedAudioPlayer() {
  const ctx = useContext(RecordedAudioPlayerContext);
  if (!ctx) throw new Error("useRecordedAudioPlayer must be inside RecordedAudioPlayerProvider");
  return ctx;
}
