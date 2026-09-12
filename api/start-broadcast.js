// api/start-broadcast.js
// Starts pushing a room's video (rendered via /egress, including the logo
// overlay) out to YouTube/Facebook/etc as an RTMP stream.
//
// Requires these env vars in Vercel (in addition to the existing LIVEKIT_* ones):
//   YOUTUBE_RTMP_URL   = rtmp://a.rtmp.youtube.com/live2/<your-youtube-stream-key>
//   FACEBOOK_RTMP_URL  = rtmps://live-api-s.facebook.com:443/rtmp/<your-facebook-stream-key>
// Add only the ones you have — this skips any that aren't set.

import { EgressClient, StreamOutput, StreamProtocol } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { room } = req.body || {};
  if (!room) return res.status(400).json({ error: 'room is required' });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return res.status(500).json({ error: 'Server is missing LiveKit credentials' });
  }

  const rtmpUrls = [];
  if (process.env.YOUTUBE_RTMP_URL) rtmpUrls.push(process.env.YOUTUBE_RTMP_URL);
  if (process.env.FACEBOOK_RTMP_URL) rtmpUrls.push(process.env.FACEBOOK_RTMP_URL);

  if (rtmpUrls.length === 0) {
    return res.status(400).json({
      error: 'No RTMP destinations configured. Add YOUTUBE_RTMP_URL and/or FACEBOOK_RTMP_URL in Vercel.',
    });
  }

  try {
    // EgressClient expects an https:// host, not the wss:// one used for room connections.
    const egressHost = livekitUrl.replace('wss://', 'https://');
    const egressClient = new EgressClient(egressHost, apiKey, apiSecret);

    const streamOutput = new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: rtmpUrls,
    });

    const baseUrl = `https://${req.headers.host}/egress`;

    const info = await egressClient.startRoomCompositeEgress(
      room,
      { stream: streamOutput },
      { customBaseUrl: baseUrl }
    );

    return res.status(200).json({ egressId: info.egressId });
  } catch (err) {
    console.error('Failed to start broadcast:', err);
    return res.status(500).json({ error: err.message });
  }
}

