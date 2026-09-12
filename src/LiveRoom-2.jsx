// src/LiveRoom.jsx
// Multi-user live camera chat room, built on LiveKit.
// Now includes: shareable invite link (auto-fills room name), native share sheet, and QR code.
//
// Install dependencies:
//   npm install @livekit/components-react @livekit/components-styles livekit-client

import { useState, useCallback, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
} from '@livekit/components-react';
import '@livekit/components-styles';

export default function LiveRoom() {
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-fill room name from a shared link, e.g. yoursite.app/?room=myroom
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedRoom = params.get('room');
    if (sharedRoom) setRoomName(sharedRoom);
  }, []);

  const inviteUrl = roomName.trim()
    ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomName.trim())}`
    : '';

  const qrCodeUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`
    : '';

  const shareInvite = useCallback(async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my live room',
          text: `Join my live room "${roomName.trim()}"`,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled the share sheet — not an error worth showing.
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl, roomName]);

  const joinRoom = useCallback(async () => {
    if (!roomName.trim() || !displayName.trim()) {
      setError('Enter a room name and your display name.');
      return;
    }
    setError('');

    try {
      const identity = `${displayName}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomName.trim(),
          identity,
          name: displayName.trim(),
          isHost,
        }),
      });

      if (!res.ok) throw new Error('Failed to get access token');
      const data = await res.json();

      if (!data.token || !data.url) {
        throw new Error(
          `Server response missing data — token: ${data.token ? 'present' : 'MISSING'}, url: ${data.url || 'MISSING'}`
        );
      }

      setConnectionDetails(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not join the room. Try again.');
    }
  }, [roomName, displayName, isHost]);

  // --- Pre-join screen ---
  if (!connectionDetails) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h2 style={styles.title}>Join a Live Room</h2>
          <input
            style={styles.input}
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isHost}
              onChange={(e) => setIsHost(e.target.checked)}
            />
            Join as host (moderator controls)
          </label>

          {roomName.trim() && (
            <div style={styles.inviteRow}>
              <button style={styles.secondaryButton} onClick={shareInvite}>
                {copied ? 'Link copied!' : '🔗 Share invite'}
              </button>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowInvite((v) => !v)}
              >
                {showInvite ? 'Hide QR code' : '📱 Show QR code'}
              </button>
            </div>
          )}

          {showInvite && qrCodeUrl && (
            <div style={styles.qrBox}>
              <img src={qrCodeUrl} alt="QR code to join room" style={styles.qrImage} />
              <p style={styles.qrHint}>Scan to join "{roomName.trim()}"</p>
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} onClick={joinRoom}>
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // --- Connected room view ---
  return (
    <LiveKitRoom
      serverUrl={connectionDetails.url}
      token={connectionDetails.token}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={() => setConnectionDetails(null)}
      onError={(err) => {
        console.error('LiveKit connection error:', err);
        setError(`Connection failed: ${err.message}`);
        setConnectionDetails(null);
      }}
    >
      <VideoConference chatMessageFormatter={formatChatMessageLinks} />
    </LiveKitRoom>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f0f0f',
  },
  card: {
    background: '#1a1a1a',
    padding: '32px',
    borderRadius: '12px',
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: { color: '#fff', margin: 0, marginBottom: '8px' },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#0f0f0f',
    color: '#fff',
    fontSize: '14px',
  },
  checkboxRow: { color: '#ccc', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' },
  inviteRow: { display: 'flex', gap: '8px' },
  secondaryButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #444',
    background: '#232323',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  qrBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#0f0f0f',
    borderRadius: '8px',
    padding: '16px',
    gap: '8px',
  },
  qrImage: { borderRadius: '8px', background: '#fff', padding: '8px' },
  qrHint: { color: '#999', fontSize: '12px', margin: 0 },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#6c5ce7',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#ff6b6b', fontSize: '13px', margin: 0 },
};
