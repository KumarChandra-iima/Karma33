import { useState, useEffect, useRef, useCallback } from "react";

// Detects music intent in a workout step string.
export function hasMusicIntent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("🎵") ||
    lower.includes("pump-up song") ||
    lower.includes("play music") ||
    lower.includes("music + movement") ||
    lower.includes("play workout music")
  );
}

// Returns true if any step in the steps array has music intent.
export function stepsHaveMusicIntent(steps) {
  if (!Array.isArray(steps)) return false;
  return steps.some((s) => hasMusicIntent(s));
}

// Schedules a single percussive "kick + tick" beat at the given AudioContext time.
function scheduleBeat(ctx, gainNode, time) {
  // Kick: low-freq sine that pitches down quickly
  const kick = ctx.createOscillator();
  const kickGain = ctx.createGain();
  kick.type = "sine";
  kick.frequency.setValueAtTime(160, time);
  kick.frequency.exponentialRampToValueAtTime(40, time + 0.12);
  kickGain.gain.setValueAtTime(1.0, time);
  kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  kick.connect(kickGain);
  kickGain.connect(gainNode);
  kick.start(time);
  kick.stop(time + 0.20);

  // Hi-hat: short filtered noise burst
  const bufSize = ctx.sampleRate * 0.05;
  const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hiFilter = ctx.createBiquadFilter();
  hiFilter.type = "highpass";
  hiFilter.frequency.value = 6000;
  const hiGain = ctx.createGain();
  hiGain.gain.setValueAtTime(0.35, time);
  hiGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  noise.connect(hiFilter);
  hiFilter.connect(hiGain);
  hiGain.connect(gainNode);
  noise.start(time);
  noise.stop(time + 0.05);
}

export function useWorkoutBeat(bpm = 128) {
  const [playState, setPlayState] = useState("stopped"); // "stopped" | "playing" | "paused"
  const [volume, setVolume] = useState(0.6);

  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const schedulerRef = useRef(null);
  const nextBeatRef = useRef(0);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  }, []);

  const startScheduler = useCallback(() => {
    if (!ctxRef.current || !gainRef.current) return;
    const ctx = ctxRef.current;
    const interval = 60 / bpm;
    const lookahead = 0.1; // schedule 100ms ahead

    function schedule() {
      const now = ctx.currentTime;
      while (nextBeatRef.current < now + lookahead) {
        scheduleBeat(ctx, gainRef.current, nextBeatRef.current);
        nextBeatRef.current += interval;
      }
    }

    // Kick off immediately
    nextBeatRef.current = ctx.currentTime;
    schedule();
    schedulerRef.current = setInterval(schedule, 50);
  }, [bpm]);

  const initAudio = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = volumeRef.current;
      gainRef.current.connect(ctxRef.current.destination);
    }
    // Resume suspended context (mobile browsers suspend on create)
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
  }, []);

  const play = useCallback(() => {
    try {
      initAudio();
      startScheduler();
      setPlayState("playing");
    } catch (e) {}
  }, [initAudio, startScheduler]);

  const pause = useCallback(() => {
    stopScheduler();
    if (ctxRef.current) ctxRef.current.suspend().catch(() => {});
    setPlayState("paused");
  }, [stopScheduler]);

  const resume = useCallback(() => {
    try {
      if (ctxRef.current) ctxRef.current.resume().catch(() => {});
      startScheduler();
      setPlayState("playing");
    } catch (e) {}
  }, [startScheduler]);

  const stop = useCallback(() => {
    stopScheduler();
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
      gainRef.current = null;
    }
    setPlayState("stopped");
  }, [stopScheduler]);

  // Auto-stop on unmount and on visibility change (tab switch)
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) stop();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { playState, volume, setVolume, play, pause, resume, stop };
}
