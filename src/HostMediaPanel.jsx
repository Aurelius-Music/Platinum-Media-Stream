"use client";

import { useState } from "react";
import { useMediaControls } from "@/MediaControls";

/**
 * HostMediaPanel
 * --------------
 * The visible buttons/UI for background switching + music playback.
 * Renders as an overlay bar you can drop into your existing camera/host screen.
 *
 * Usage in your host page component:
 *   import HostMediaPanel from "@/HostMediaPanel";
 *   ...
 *   <HostMediaPanel onTracksReady={(video, audio) => {
 *     // publish these to your LiveKit room instead of raw camera/mic
 *     room.localParticipant.publishTrack(video);
 *     room.localParticipant.publishTrack(audio);
 *   }} />
 */
export default function HostMediaPanel({ onTracksReady, backgroundImageUrl }) {
  const { videoTrack, audioTrack, bgMode, setBgMode, music } = useMediaControls({
    backgroundImageUrl,
  });
  const [trackUrl, setTrackUrl] = useState("");

  // Once both processed tracks exist, hand them up to the parent to publish
  if (videoTrack && audioTrack && onTracksReady) {
    onTracksReady(videoTrack, audioTrack);
  }

  const handleLoadTrack = () => {
    if (!trackUrl) return;
    music.loadTrack(trackUrl);
  };

  return (
    <div style={panelStyle}>
      {/* Background controls */}
      <div style={rowStyle}>
        <span style={labelStyle}>Background</span>
        <button style={btn(bgMode === "none")} onClick={() => setBgMode("none")}>
          None
        </button>
        <button style={btn(bgMode === "blur")} onClick={() => setBgMode("blur")}>
          Blur
        </button>
        <button style={btn(bgMode === "image")} onClick={() => setBgMode("image")}>
          Image
        </button>
      </div>

      {/* Music controls */}
      <div style={rowStyle}>
        <span style={labelStyle}>Music</span>
        <input
          type="text"
          placeholder="Track URL from storage"
          value={trackUrl}
          onChange={(e) => setTrackUrl(e.target.value)}
          style={inputStyle}
        />
        <button style={btn(false)} onClick={handleLoadTrack}>
          Load
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
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
    background: active ? "#e11d48" : "#333",
    color: "#fff",
    fontSize: 12,
  };
}
