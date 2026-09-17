"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { useMediaControls } from "./MediaControls";
import { Track } from "livekit-client";

/**
 * HostMediaPanel
 * --------------
 * The visible buttons/UI for background switching + music playback.
 *
 * IMPORTANT: this must be rendered INSIDE <LiveKitRoom>...</LiveKitRoom>,
 * as a sibling of <VideoConference />. It reads the active room via
 * useRoomContext() — no need to pass a room variable in as a prop.
 */
export default function HostMediaPanel({ backgroundImageUrl }) {
  const room = useRoomContext();
  const { videoTrack, audioTrack, bgMode, setBgMode, setBackgroundImage, music, debugError } =
    useMediaControls({ backgroundImageUrl });
  const [trackUrl, setTrackUrl] = useState("");
  const videoPublishedRef = useRef(false);
  const audioPublishedRef = useRef(false);

  // Publish video as soon as it's ready — doesn't wait on audio
  useEffect(() => {
    if (!room || !videoTrack || videoPublishedRef.current) return;
    videoPublishedRef.current = true;
    room.localParticipant
      .publishTrack(videoTrack, { source: Track.Source.Camera })
      .catch((err) => console.error("Failed to publish video track:", err));
  }, [room, videoTrack]);

  // Publish audio separately, whenever it's ready
  useEffect(() => {
    if (!room || !audioTrack || audioPublishedRef.current) return;
    audioPublishedRef.current = true;
    room.localParticipant
      .publishTrack(audioTrack, { source: Track.Source.Microphone })
      .catch((err) => console.error("Failed to publ
