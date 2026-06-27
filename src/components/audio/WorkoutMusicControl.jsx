import { useWorkoutBeat } from "../../hooks/useWorkoutBeat";

/**
 * WorkoutMusicControl — reusable beat player for any workout card.
 *
 * Props:
 *   accentColor  — theme accent hex (e.g. "#00C87A" for Teens Moves)
 *   th           — theme object (for bg/border/text colours)
 *   bpm          — beats per minute (default 128)
 *   onStop       — optional callback when user hits Stop (e.g. to notify parent)
 *
 * Designed for Teens → Moves workouts; Adult IdealWeight can reuse by
 * passing its own accentColor and th.
 */
export function WorkoutMusicControl({ accentColor = "#00C87A", th, bpm = 128, onStop }) {
  const { playState, volume, setVolume, play, pause, resume, stop } = useWorkoutBeat(bpm);

  const accent = accentColor;
  const cardBg = th?.card || "rgba(255,255,255,0.07)";
  const cardBorder = th?.cardBorder || "rgba(255,255,255,0.15)";
  const t2 = th?.t2 || "rgba(255,255,255,0.7)";
  const t3 = th?.t3 || "rgba(255,255,255,0.4)";
  const divider = th?.divider || "rgba(255,255,255,0.08)";

  function handleStop() {
    stop();
    if (onStop) onStop();
  }

  function handlePlayPause() {
    if (playState === "stopped") { play(); return; }
    if (playState === "playing") { pause(); return; }
    resume();
  }

  const isPlaying = playState === "playing";
  const isStopped = playState === "stopped";

  const btnBase = {
    border: "none",
    borderRadius: 9,
    padding: "8px 14px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    transition: "opacity 0.15s",
  };

  return (
    <div
      data-testid="workout-music-control"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: "12px 14px",
        marginTop: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 15 }}>🎵</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: 0.5 }}>
          Workout Music
        </span>
        {isPlaying && (
          <span
            data-testid="playing-indicator"
            style={{
              marginLeft: "auto",
              fontSize: 9,
              fontWeight: 700,
              color: accent,
              background: accent + "22",
              border: `1px solid ${accent}55`,
              borderRadius: 6,
              padding: "2px 7px",
            }}
          >
            ● PLAYING
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 7, borderTop: `1px solid ${divider}`, paddingTop: 10 }}>
        <button
          data-testid="music-play-pause-btn"
          onClick={handlePlayPause}
          style={{
            ...btnBase,
            flex: 2,
            background: isPlaying ? accent + "33" : `linear-gradient(135deg,${accent},${accent}cc)`,
            color: isPlaying ? accent : "#fff",
            border: isPlaying ? `1px solid ${accent}66` : "none",
          }}
        >
          {isStopped ? "▶ Play Workout Music" : isPlaying ? "⏸ Pause" : "▶ Resume"}
        </button>
        <button
          data-testid="music-stop-btn"
          onClick={handleStop}
          disabled={isStopped}
          style={{
            ...btnBase,
            flex: 1,
            background: isStopped ? "rgba(255,255,255,0.04)" : "rgba(255,80,80,0.18)",
            color: isStopped ? t3 : "#FF6B6B",
            border: `1px solid ${isStopped ? "rgba(255,255,255,0.08)" : "rgba(255,80,80,0.30)"}`,
            opacity: isStopped ? 0.5 : 1,
          }}
        >
          ■ Stop
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: t3, minWidth: 20 }}>🔈</span>
        <input
          data-testid="music-volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{
            flex: 1,
            accentColor: accent,
            height: 4,
            cursor: "pointer",
          }}
        />
        <span style={{ fontSize: 10, color: t2, minWidth: 28, textAlign: "right", fontWeight: 700 }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
