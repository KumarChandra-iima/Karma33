import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";
import {
  getBestMimeType,
  RecordedAudioPlayerProvider,
  useRecordedAudioPlayer,
} from "../hooks/useRecordedAudioPlayer.jsx";

// ── Global stubs ──────────────────────────────────────────────────────────────

let _mockAudio;

function makeMockAudio() {
  _mockAudio = {
    src: "",
    playbackRate: 1,
    onended: null,
    onerror: null,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  };
  return _mockAudio;
}

beforeEach(() => {
  makeMockAudio();
  global.Audio = function Audio() { return _mockAudio; };
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
  global.speechSynthesis = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => []) };
  global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance() { return {}; };
  global.MediaRecorder = { isTypeSupported: vi.fn(() => false) };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.MediaRecorder;
});

// ── getBestMimeType ───────────────────────────────────────────────────────────

describe("getBestMimeType", () => {
  it("returns empty string when MediaRecorder is undefined", () => {
    delete global.MediaRecorder;
    expect(getBestMimeType()).toBe("");
  });

  it("returns audio/mp4 when it is the first supported type", () => {
    global.MediaRecorder = {
      isTypeSupported: vi.fn((t) => t === "audio/mp4"),
    };
    expect(getBestMimeType()).toBe("audio/mp4");
  });

  it("falls through to audio/webm;codecs=opus when mp4 not supported", () => {
    global.MediaRecorder = {
      isTypeSupported: vi.fn((t) => t === "audio/webm;codecs=opus"),
    };
    expect(getBestMimeType()).toBe("audio/webm;codecs=opus");
  });

  it("returns empty string when no candidate is supported", () => {
    global.MediaRecorder = { isTypeSupported: vi.fn(() => false) };
    expect(getBestMimeType()).toBe("");
  });
});

// ── useRecordedAudioPlayer context ────────────────────────────────────────────

function TestConsumer({ cueId }) {
  const player = useRecordedAudioPlayer();
  const isActive = player.activeCueId === cueId;
  const isPlaying = isActive && player.status === "playing";
  const isPaused = isActive && player.status === "paused";
  const hasError = player.errorCueId === cueId;
  const mockBlob = new Blob(["audio"], { type: "audio/mp4" });

  return (
    <div>
      <div data-testid="status">{player.status}</div>
      <div data-testid="active-cue">{player.activeCueId ?? "none"}</div>
      {!isPlaying && !isPaused && (
        <button data-testid="play-btn" onClick={() => player.play(cueId, mockBlob)}>Play</button>
      )}
      {isPlaying && (
        <>
          <button data-testid="pause-btn" onClick={() => player.pause()}>Pause</button>
          <button data-testid="stop-btn" onClick={() => player.stop()}>Stop</button>
        </>
      )}
      {isPaused && (
        <>
          <button data-testid="resume-btn" onClick={() => player.resume()}>Resume</button>
          <button data-testid="stop-btn" onClick={() => player.stop()}>Stop</button>
        </>
      )}
      {hasError && <div data-testid="error-msg">Playback error</div>}
    </div>
  );
}

function TestConsumerTwo({ cueId }) {
  const player = useRecordedAudioPlayer();
  const isActive = player.activeCueId === cueId;
  const otherActive = player.activeCueId !== null && !isActive;
  const mockBlob = new Blob(["audio2"], { type: "audio/mp4" });
  return (
    <button
      data-testid={`play-btn-${cueId}`}
      disabled={otherActive}
      onClick={() => player.play(cueId, mockBlob)}
    >
      Play {cueId}
    </button>
  );
}

describe("RecordedAudioPlayerProvider — play/pause/resume/stop UI states", () => {
  function setup(cueId = "test-cue") {
    return render(
      <RecordedAudioPlayerProvider>
        <TestConsumer cueId={cueId} />
      </RecordedAudioPlayerProvider>
    );
  }

  it("initial status is idle", () => {
    setup();
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("Play shows Play button initially, not Pause/Stop", () => {
    setup();
    expect(screen.getByTestId("play-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("pause-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stop-btn")).not.toBeInTheDocument();
  });

  it("after Play tap: status = playing, Pause + Stop appear", async () => {
    setup();
    fireEvent.click(screen.getByTestId("play-btn"));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("playing"));
    expect(screen.getByTestId("pause-btn")).toBeInTheDocument();
    expect(screen.getByTestId("stop-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("play-btn")).not.toBeInTheDocument();
  });

  it("after Pause tap: status = paused, Resume + Stop appear", async () => {
    setup();
    fireEvent.click(screen.getByTestId("play-btn"));
    await waitFor(() => expect(screen.getByTestId("pause-btn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("pause-btn"));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("paused"));
    expect(screen.getByTestId("resume-btn")).toBeInTheDocument();
    expect(screen.getByTestId("stop-btn")).toBeInTheDocument();
  });

  it("after Stop tap: returns to Play", async () => {
    setup();
    fireEvent.click(screen.getByTestId("play-btn"));
    await waitFor(() => expect(screen.getByTestId("stop-btn")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("stop-btn"));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("idle"));
    expect(screen.getByTestId("play-btn")).toBeInTheDocument();
  });

  it("after audio.onended fires: status returns to idle (Play button reappears)", async () => {
    setup();
    fireEvent.click(screen.getByTestId("play-btn"));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("playing"));
    act(() => { _mockAudio.onended && _mockAudio.onended(); });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("idle"));
    expect(screen.getByTestId("play-btn")).toBeInTheDocument();
  });

  it("double-tap Play does not create second audio instance (no-op if playing)", async () => {
    setup();
    const playBtn = screen.getByTestId("play-btn");
    fireEvent.click(playBtn);
    await waitFor(() => expect(screen.queryByTestId("play-btn")).not.toBeInTheDocument());
    // play-btn is gone now (showing Pause/Stop) — can't double-tap
    expect(_mockAudio.play).toHaveBeenCalledOnce();
  });
});

describe("mutual exclusion: while one cue plays, other play buttons are disabled", () => {
  it("second cue's play button is disabled while first is playing", async () => {
    render(
      <RecordedAudioPlayerProvider>
        <TestConsumerTwo cueId="cue-a" />
        <TestConsumerTwo cueId="cue-b" />
      </RecordedAudioPlayerProvider>
    );
    // Start playing cue-a
    fireEvent.click(screen.getByTestId("play-btn-cue-a"));
    await waitFor(() => {
      expect(screen.getByTestId("play-btn-cue-b")).toBeDisabled();
    });
  });

  it("second cue's button becomes enabled after first stops", async () => {
    render(
      <RecordedAudioPlayerProvider>
        <TestConsumerTwo cueId="cue-a" />
        <TestConsumerTwo cueId="cue-b" />
      </RecordedAudioPlayerProvider>
    );
    fireEvent.click(screen.getByTestId("play-btn-cue-a"));
    await waitFor(() => expect(screen.getByTestId("play-btn-cue-b")).toBeDisabled());
    act(() => { _mockAudio.onended && _mockAudio.onended(); });
    await waitFor(() => expect(screen.getByTestId("play-btn-cue-b")).not.toBeDisabled());
  });
});

describe("null/empty blob: falls back to onFallback without throwing", () => {
  it("null blob calls onFallback and stays idle", async () => {
    const fallback = vi.fn();
    function NullBlobTest() {
      const player = useRecordedAudioPlayer();
      return (
        <div>
          <div data-testid="status">{player.status}</div>
          <button onClick={() => player.play("x", null, { onFallback: fallback })}>Play</button>
        </div>
      );
    }
    render(<RecordedAudioPlayerProvider><NullBlobTest /></RecordedAudioPlayerProvider>);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fallback).toHaveBeenCalledOnce());
    expect(screen.getByTestId("status").textContent).toBe("idle");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("empty blob (size=0) calls onFallback", async () => {
    const fallback = vi.fn();
    function EmptyBlobTest() {
      const player = useRecordedAudioPlayer();
      const emptyBlob = new Blob([], { type: "audio/mp4" });
      return (
        <button onClick={() => player.play("x", emptyBlob, { onFallback: fallback })}>Play</button>
      );
    }
    render(<RecordedAudioPlayerProvider><EmptyBlobTest /></RecordedAudioPlayerProvider>);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fallback).toHaveBeenCalledOnce());
  });
});

describe("play() error: onFallback called and status is error", () => {
  it("when audio.play() rejects, onFallback fires and status = error", async () => {
    makeMockAudio();
    _mockAudio.play = vi.fn(() => Promise.reject(new Error("NotAllowedError")));
    global.Audio = function Audio() { return _mockAudio; };

    const fallback = vi.fn();
    function ErrorTest() {
      const player = useRecordedAudioPlayer();
      const mockBlob = new Blob(["x"], { type: "audio/mp4" });
      return (
        <div>
          <div data-testid="status">{player.status}</div>
          <button onClick={() => player.play("e", mockBlob, { onFallback: fallback })}>Play</button>
        </div>
      );
    }
    render(<RecordedAudioPlayerProvider><ErrorTest /></RecordedAudioPlayerProvider>);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fallback).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"));
  });
});

describe("URL lifecycle: revokeObjectURL called after audio ends", () => {
  it("revokeObjectURL is called when onended fires", async () => {
    function Test() {
      const player = useRecordedAudioPlayer();
      return <button onClick={() => player.play("x", new Blob(["a"], { type: "audio/mp4" }))}>Play</button>;
    }
    render(<RecordedAudioPlayerProvider><Test /></RecordedAudioPlayerProvider>);
    fireEvent.click(screen.getByRole("button"));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    act(() => { _mockAudio.onended && _mockAudio.onended(); });
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledOnce());
  });
});
