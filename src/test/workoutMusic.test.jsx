import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { hasMusicIntent, stepsHaveMusicIntent } from "../hooks/useWorkoutBeat.js";
import { WorkoutMusicControl } from "../components/audio/WorkoutMusicControl.jsx";

// ── Mock Web Audio API (jsdom does not implement it) ─────────────────────────
function makeMockAudioContext() {
  const gainNode = {
    gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const bufferSource = {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const oscillator = {
    type: "sine",
    frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };
  const biquadFilter = { type: "highpass", frequency: { value: 0 }, connect: vi.fn() };
  return {
    state: "running",
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain: vi.fn(() => gainNode),
    createOscillator: vi.fn(() => oscillator),
    createBuffer: vi.fn(() => ({ getChannelData: vi.fn(() => new Float32Array(2205)) })),
    createBufferSource: vi.fn(() => bufferSource),
    createBiquadFilter: vi.fn(() => biquadFilter),
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
}

// Use a plain function constructor so `new AudioContext()` returns mockCtx.
// vi.fn() wrapped constructors are not reliably called with `new` in jsdom.
let _mockCtx;
beforeEach(() => {
  _mockCtx = makeMockAudioContext();
  // eslint-disable-next-line no-new-func
  global.AudioContext = function AudioContext() { return _mockCtx; };
  global.webkitAudioContext = global.AudioContext;
});

afterEach(() => {
  delete global.AudioContext;
  delete global.webkitAudioContext;
  vi.restoreAllMocks();
});

// ── hasMusicIntent (pure function) ───────────────────────────────────────────
describe("hasMusicIntent", () => {
  it("returns true for step with 🎵 emoji", () => {
    expect(hasMusicIntent("Play pump-up song 🎵")).toBe(true);
  });

  it("returns true for step with 'pump-up song'", () => {
    expect(hasMusicIntent("Play pump-up song")).toBe(true);
  });

  it("returns true for 'Music + movement'", () => {
    expect(hasMusicIntent("Music + movement = 3× effort")).toBe(true);
  });

  it("returns true for 'play music'", () => {
    expect(hasMusicIntent("play music now")).toBe(true);
  });

  it("returns false for a regular workout step", () => {
    expect(hasMusicIntent("Burpees × 8")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasMusicIntent("")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(hasMusicIntent(null)).toBe(false);
    expect(hasMusicIntent(undefined)).toBe(false);
  });
});

// ── stepsHaveMusicIntent (pure function) ─────────────────────────────────────
describe("stepsHaveMusicIntent", () => {
  it("returns true when any step contains music intent", () => {
    const steps = ["Play pump-up song 🎵", "Jump on spot × 20", "High knees × 30 sec"];
    expect(stepsHaveMusicIntent(steps)).toBe(true);
  });

  it("returns false when no step contains music intent", () => {
    const steps = ["Burpees × 8", "Rest 20s", "Mountain climbers × 30s"];
    expect(stepsHaveMusicIntent(steps)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(stepsHaveMusicIntent([])).toBe(false);
  });

  it("returns false for non-array input", () => {
    expect(stepsHaveMusicIntent(null)).toBe(false);
  });
});

// ── WorkoutMusicControl component ────────────────────────────────────────────
describe("WorkoutMusicControl", () => {
  const th = {
    card: "rgba(255,255,255,0.07)",
    cardBorder: "rgba(255,255,255,0.15)",
    t2: "rgba(255,255,255,0.7)",
    t3: "rgba(255,255,255,0.4)",
    divider: "rgba(255,255,255,0.08)",
  };

  it("renders Play Workout Music button initially", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    expect(screen.getByTestId("music-play-pause-btn")).toBeInTheDocument();
    expect(screen.getByTestId("music-play-pause-btn").textContent).toContain("Play Workout Music");
  });

  it("renders Stop button in disabled state initially (no autoplay)", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    const stopBtn = screen.getByTestId("music-stop-btn");
    expect(stopBtn).toBeDisabled();
  });

  it("does not show PLAYING indicator before user taps Play", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    expect(screen.queryByTestId("playing-indicator")).not.toBeInTheDocument();
  });

  it("Play button changes to Pause after click", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    const btn = screen.getByTestId("music-play-pause-btn");
    fireEvent.click(btn);
    expect(btn.textContent).toContain("Pause");
  });

  it("PLAYING indicator appears after Play is tapped", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    fireEvent.click(screen.getByTestId("music-play-pause-btn"));
    expect(screen.getByTestId("playing-indicator")).toBeInTheDocument();
  });

  it("Pause → button shows Resume, Stop becomes enabled", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    const playPauseBtn = screen.getByTestId("music-play-pause-btn");
    fireEvent.click(playPauseBtn); // play
    fireEvent.click(playPauseBtn); // pause
    expect(playPauseBtn.textContent).toContain("Resume");
    expect(screen.getByTestId("music-stop-btn")).not.toBeDisabled();
  });

  it("Stop resets state: Play button returns, Stop becomes disabled", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    const playPauseBtn = screen.getByTestId("music-play-pause-btn");
    fireEvent.click(playPauseBtn); // play
    fireEvent.click(screen.getByTestId("music-stop-btn")); // stop
    expect(playPauseBtn.textContent).toContain("Play Workout Music");
    expect(screen.getByTestId("music-stop-btn")).toBeDisabled();
  });

  it("renders volume slider", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    expect(screen.getByTestId("music-volume-slider")).toBeInTheDocument();
  });

  it("volume slider responds to changes", () => {
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} />);
    const slider = screen.getByTestId("music-volume-slider");
    fireEvent.change(slider, { target: { value: "0.3" } });
    expect(slider.value).toBe("0.3");
  });

  it("calls onStop callback when Stop is clicked", () => {
    const onStop = vi.fn();
    render(<WorkoutMusicControl accentColor="#00C87A" th={th} bpm={128} onStop={onStop} />);
    fireEvent.click(screen.getByTestId("music-play-pause-btn")); // play first
    fireEvent.click(screen.getByTestId("music-stop-btn"));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
