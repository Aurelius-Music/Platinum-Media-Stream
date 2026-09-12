// src/EgressTemplate.jsx
// This page is NOT for regular visitors — LiveKit's broadcast service loads
// this invisibly in the background and captures what it renders. That capture
// IS the video feed sent to YouTube/Facebook/etc, so anything shown here
// (including the logo overlay) appears in the broadcast.
//
// Install dependency: npm install @livekit/egress-sdk

import { useEffect, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import EgressHelper from '@livekit/egress-sdk';

export default function EgressTemplate() {
  const containerRef = useRef(null);

  useEffect(() => {
    const room = new Room({ adaptiveStream: true });
    EgressHelper.setRoom(room, { autoEnd: true });

    function attachTrack(track) {
      if (track.kind !== Track.Kind.Video) return;
      const el = track.attach();
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.objectFit = 'cover';
      containerRef.current?.appendChild(el);
    }

    async function start() {
      await room.connect(EgressHelper.getLiveKitURL(), EgressHelper.getAccessToken());

      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track) attachTrack(pub.track);
        });
      });

      room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));

      // Tell the egress recorder the view is ready — this actually starts the broadcast.
      EgressHelper.startRecording();
    }

    start();

    return () => {
      room.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '1280px',
        height: '720px',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          width: '100%',
          height: '100%',
        }}
      />

      {/* This logo is baked into the actual broadcast — viewers on YouTube/Facebook see it */}
      <img
        src="/logo.png"
        alt="Platinum Media Stream"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          width: '160px',
          opacity: 0.95,
        }}
      />
    </div>
  );
}
