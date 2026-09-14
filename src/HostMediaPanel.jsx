"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
useEffect(() => {
  if (!room || !videoTrack || !audioTrack || publishedRef.current) return;
  publishedRef.current = true;
  room.localParticipant.publishTrack(videoTrack, { source: Track.Source.Camera });
  room.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone });
}, [room, videoTrack, audioTrack]);
useEffect(() => {
  if (!room || !videoTrack || !audioTrack || publishedRef.current) return;
  publishedRef.current = true;
  room.localParticipant.publishTrack(videoTrack, { source: Track.Source.Camera });
  room.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone });
}, [room, videoTrack, audioTrack]);
/**
 * HostMediaPanel
 * --------------
 * The visible buttons/UI for background switching + music playback.
 *
 * IMPORTANT: this must be rendered INSIDE <LiveKitRoom>...</LiveKitRoom>,
 * as a sibling of <VideoConference />. It reads the active room via
 * useRoomContext() — no need to pass a room variable in as a prop.
 *
 * Usage in LiveRoom.jsx, right before the closing </LiveKitRoom> tag:
 *   import HostMediaPanel from "./HostMediaPanel";
 *   ...
 *   <VideoConference chatMessageFormatter={...} />
 *   <HostMediaPanel />
 * </LiveKitRoom>
 */
export default function HostMediaPanel({ backgroundImageUrl }) {
  const room = useRoomContext();
  const { videoTrack, audioTrack, bgMode, setBgMode, setBackgroundImage, music } =
    useMediaControls({ backgroundImageUrl });
  const [trackUrl, setTrackUrl] = useState("");
  const publishedRef = useRef(false);

  // Publish the processed tracks once, replacing the default camera/mic
  useEffect(() => {
    if (!room || !videoTrack || !audioTrack || publishedRef.current) return;
    publishedRef.current = true;
    room.localParticipant.publishTrack(videoTrack);
    room.localParticipant.publishTrack(audioTrack);
  }, [room, videoTrack, audioTrack]);

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
      {/* Background controls */}
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

      {/* Music controls */}
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
