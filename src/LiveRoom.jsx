// src/LiveRoom.jsx
// Multi-user live camera chat room, built on LiveKit.
//
// Install dependencies:
//   npm install @livekit/components-react @livekit/components-styles livekit-client

import { useState, useCallback } from 'react';
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
};          name: displayName.trim(),
          isHost,
        }),
      });

      if (!res.ok) throw new Error('Failed to get access token');
      const data = await res.json();
      setConnectionDetails(data);
    } catch (err) {
      console.error(err);
      setError('Could not join the room. Try again.');
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
