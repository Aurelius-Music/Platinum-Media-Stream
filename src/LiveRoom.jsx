// src/LiveRoom.jsx
// Multi-user live camera chat room, built on LiveKit.
// Now includes: shareable invite link, native share sheet, QR code, and Supabase member login.
import HostMediaPanel from "./HostMediaPanel";
import Login from "./Login";
import { supabase } from "./supabaseClient";
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
  const [showHelp, setShowHelp] = useState(false);
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // Track Supabase login state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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
      const res = await fetch('/api/get-room-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomName.trim(),
          accessToken: session?.access_token || null,
          displayName: displayName.trim(),
          isHost,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get access token');

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
  }, [roomName, displayName, isHost, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLogin(false);
  };

  // --- Pre-join screen ---
  if (!connectionDetails) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <img src="/logo.png" alt="Platinum Media Stream" style={styles.logo} />
          <h2 style={styles.title}>Join a Live Room</h2>

          <div style={styles.authRow}>
            {session ? (
              <>
                <span style={styles.authStatus}>Logged in as {session.user.email}</span>
                <button style={styles.secondaryButton} onClick={handleLogout}>Log out</button>
              </>
            ) : showLogin ? (
              <Login onAuthed={(s) => { setSession(s); setShowLogin(false); }} />
            ) : (
              <button style={styles.secondaryButton} onClick={() => setShowLogin(true)}>
                Log in (for private rooms)
              </button>
            )}
          </div>

          <button style={styles.helpButton} onClick={() => setShowHelp((v) => !v)}>
            {showHelp ? 'Hide instructions ▲' : '❓ How to use this app'}
          </button>

          {showHelp && (
            <div style={styles.helpBox}>
              <p style={styles.helpLine}><strong>1. Room name</strong> — pick any name. Everyone using the same name joins the same room together.</p>
              <p style={styles.helpLine}><strong>2. Your name</strong> — what others will see you as.</p>
              <p style={styles.helpLine}><strong>3. Join as host</strong> — check this if you're starting/running the room. Hosts can go live to YouTube/Facebook.</p>
              <p style={styles.helpLine}><strong>4. Join Room</strong> — taps you in and turns on your camera.</p>
              <p style={styles.helpLine}><strong>5. Share invite / QR code</strong> — once you type a room name, use these to invite others — they'll open straight into your room.</p>
              <p style={styles.helpLine}><strong>6. Go Live</strong> — once inside as host, tap the red button at the top to start broadcasting to YouTube/Facebook. Tap it again to stop.</p>
            </div>
          )}

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
      video={false}
      audio={false}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={() => setConnectionDetails(null)}
      onError={(err) => {
        console.error('LiveKit connection error:', err);
        setError(`Connection failed: ${err.message}`);
        setConnectionDetails(null);
      }}
    >
      {isHost && <BroadcastControls roomName={roomName.trim()} />}
      <VideoConference chatMessageFormatter={formatChatMessageLinks} />
      <HostMediaPanel />
    </LiveKitRoom>
  );
}

function BroadcastControls({ roomName }) {
  const [egressId, setEgressId] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const goLive = async () => {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch('/api/start-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start broadcast');
      setEgressId(data.egressId);
      setStatus('🔴 Live');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const stopLive = async () => {
    if (!egressId) return;
    setBusy(true);
    try {
      await fetch('/api/stop-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ egressId }),
      });
      setEgressId(null);
      setStatus('Stopped');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.broadcastBar}>
      {!egressId ? (
        <button style={styles.goLiveButton} onClick={goLive} disabled={busy}>
          {busy ? 'Starting...' : '🔴 Go Live'}
        </button>
      ) : (
        <button style={styles.stopLiveButton} onClick={stopLive} disabled={busy}>
          {busy ? 'Stopping...' : '⏹ Stop Broadcast'}
        </button>
      )}
      {status && <span style={styles.broadcastStatus}>{status}</span>}
    </div>
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
  logo: { width: '100%', maxWidth: '260px', margin: '0 auto 8px', display: 'block' },
  authRow: { display: 'flex', flexDirection: 'column', gap: '8px' },
  authStatus: { color: '#9b8cff', fontSize: '12px' },
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
  broadcastBar: {
    position: 'fixed',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#1a1a1a',
    padding: '8px 14px',
    borderRadius: '999px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
  },
  goLiveButton: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: 'none',
    background: '#e53935',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  },
  stopLiveButton: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: 'none',
    background: '#444',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  },
  broadcastStatus: { color: '#ccc', fontSize: '12px' },
  helpButton: {
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#9b8cff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  helpBox: {
    background: '#0f0f0f',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  helpLine: { color: '#ccc', fontSize: '12px', margin: 0, lineHeight: 1.4 },
};
