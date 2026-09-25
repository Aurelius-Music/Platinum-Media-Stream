"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { useMediaControls } from "./MediaControls";
import { Track } from "livekit-client";

const SFX_BASE = "https://kqvrjlnpxrlgxnmbdixd.supabase.co/storage/v1/object/public/sfx/";

const SFX_LIST = [
  { label: "💨 Woosh", file: "mixkit-air-woosh-1489 (1).wav" },
  { label: "⏰ Tick Tock", file: "mixkit-tick-tock-clock-timer-1045.wav" },
  { label: "🤖 Hum", file: "mixkit-technological-futuristic-hum-2133.wav" },
  { label: "😢 Sad Trombone", file: "mixkit-sad-game-over-trombone-471.wav" },
  { label: "👊 Punch", file: "mixkit-martial-arts-fast-punch-2047.wav" },
  { label: "🐦 Birds", file: "mixkit-little-birds-singing-in-the-trees-17.wav" },
];

export default function HostMediaPanel({ backgroundImageUrl }) {
  const room = useRoomContext();
  const { videoTrack, audioTrack, bgMode, setBgMode, setBackgroundImage, music, sfx, debugError } =
    useMediaControls({ backgroundImageUrl });
  const [trackUrl, setTrackUrl] = useState("");
  const videoPublishedRef = useRef(false);
  const audioPublishedRef = useRef(false);

  useEffect(() => {
    if (!room || !videoTrack || videoPublishedRef.current) return;
    videoPublishedRef.current = true;
    room.localParticipant
      .publishTrack(videoTrack, { source: Track.Source.Camera })
      .catch((err) => console.error("Failed to publish video track:", err));
  }, [room, videoTrack]);

  useEffect(() => {
    if (!room || !audioTrack || audioPublishedRef.current) return;
    audioPublishedRef.current = true;
    room.localParticipant
      .publishTrack(audioTrack, { source: Track.Source.Microphone })
      .catch((err) => console.error("Failed to publish audio track:", err));
  }, [room, audioTrack]);

  const handleLoadTrack = () => {
    if (!trackUrl) return;
    music.loadTrack(trackUrl);
  };

  const handleLocalMusicFile = (e) => {
    const file = e.target.files?.[0];
    if (file) music.loadTrack(file);
  };

  const handleLocalImageFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImage(file);
      setBgMode("image");
    }
  };

  return (
    <div style={panelStyle}>
      {debugError && (
        <div style={debugStyle}>⚠ {debugError}</div>
      )}

      <div style={rowStyle}>
        <span style={labelStyle}>Background</span>
        <button style={btn(bgMode === "none")} onClick={() => setBgMode("none")}>
          None
        </button>
        <button style={btn(bgMode === "blur")} onClick={() => setBgMode("blur")}>
          Blur
        </button>
        <label style={{ ...btn(bgMode === "image"), cursor: "pointer" }}>
          Image
          <input
            type="file"
            accept="image/*"
            onChange={handleLocalImageFile}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Music</span>
        <label style={{ ...btn(false), cursor: "pointer" }}>
          Choose file
          <input
            type="file"
            accept="audio/*"
            onChange={handleLocalMusicFile}
            style={{ display: "none" }}
          />
        </label>
        <input
          type="text"
          placeholder="or paste track URL"
          value={trackUrl}
          onChange={(e) => setTrackUrl(e.target.value)}
          style={inputStyle}
        />
        <button style={btn(false)} onClick={handleLoadTrack}>
          Load URL
        </button>
        <button style={btn(false)} onClick={music.isPlaying ? music.pause : music.play}>
          {music.isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={music.volume}
          onChange={(e) => music.setVolume(parseFloat(e.target.value))}
        />
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>SFX</span>
        {SFX_LIST.map((s) => (
          <button
            key={s.file}
            style={btn(false)}
            onClick={() => sfx.play(SFX_BASE + encodeURIComponent(s.file))}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const panelStyle = {
  position: "absolute",
  bottom: 80,
  left: 0,
  right: 0,
  background: "rgba(0,0,0,0.6)",
  padding: "10px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  zIndex: 20,
};

const debugStyle = {
  background: "rgba(255,0,0,0.15)",
  border: "1px solid #ff6b6b",
  color: "#ff6b6b",
  fontSize: 11,
  padding: "6px 8px",
  borderRadius: 6,
  wordBreak: "break-word",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const labelStyle = {
  color: "#fff",
  fontSize: 12,
  width: 80,
};

const inputStyle = {
  flex: 1,
  minWidth: 120,
  padding: "4px 8px",
  borderRadius: 6,
  border: "none",
};

function btn(active) {
  return {
    p
