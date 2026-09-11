// api/livekit-token.js
// Vercel serverless function — mints short-lived LiveKit room access tokens.
//
// Required environment variables (set these in Vercel Project Settings > Environment Variables,
// NEVER commit them to your repo):
//   LIVEKIT_API_KEY      = APIehBPzbNDBKtC
//   LIVEKIT_API_SECRET    = <your secret, from the LiveKit Cloud dashboard>
//   LIVEKIT_URL           = wss://platinum-media-stream-84l61w45.livekit.cloud
//
// Install dependency: npm install livekit-server-sdk

import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { room, identity, name, isHost } = req.body || {};

  if (!room || !identity) {
    return res.status(400).json({ error: 'room and identity are required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Server is missing LiveKit credentials' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity,
      // Token is valid for 6 hours — short-lived by design.
      ttl: '6h',
    });

    // Grants: every participant can join/publish/subscribe.
    // Hosts additionally get room admin permissions (can mute/remove others).
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: !!isHost,
      // Any participant can create the room if it doesn't exist yet —
      // this prevents a silent connection hang when a non-host is first to join.
      roomCreate: true,
    });

    const token = await at.toJwt();
    return res.status(200).json({ token, url: process.env.LIVEKIT_URL });
  } catch (err) {
    console.error('Token generation failed:', err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}
