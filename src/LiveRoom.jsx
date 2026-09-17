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

const PLATFORM_PRESETS = {
  facebook: {
    label: 'Facebook',
    defaultUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    supported: true,
    note: "Get your stream key from Facebook Live Producer.",
  },
  twitch: {
    label: 'Twitch',
    defaultUrl: 'rtmp://live.twitch.tv/app/',
    supported: true,
    note: 'Get your stream key from Twitch Creator Dashboard → Settings → Stream.',
  },
  kick: {
    label: 'Kick',
    defaultUrl: 'rtmps://fa723fc1b171.global-contribute.live-video.net:443/app',
    supported: true,
    note: 'Get your stream key from Kick → Creator Dashboard → Settings → Stream Key. If this URL stops working, check your Kick dashboard for the current one.',
  },
  tiktok: {
    label: 'TikTok',
    defaultUrl: '',
    supported: true,
    note: 'Requires 1,000+ followers. Get both the URL and key from TikTok Live Studio — they expire after ~2 hours.',
  },
  instagram: {
    label: 'Instagram',
    defaultUrl: '',
    supported: false,
    note: "Instagram doesn't offer self-serve RTMP for regular accounts — only approved Meta Live API partners. Not available here yet.",
  },
  snapchat: {
    label: 'Snapchat',
    defaultUrl: '',
    supported: false,
    note: "Snapchat doesn't support external RTMP encoders for creators — Snapchat Live is camera-app only.",
  },
  custom: {
    label: 'Custom RTMP',
    defaultUrl: '',
    supported: true,
    note: 'Paste any RTMP/RTMPS server URL and stream key.',
  },
};

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

  co
