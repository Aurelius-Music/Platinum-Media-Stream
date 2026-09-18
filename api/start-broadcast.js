// api/start-broadcast.js
// Starts pushing a room's video (rendered via /egress, including the logo
// overlay) out to YouTube/Facebook/etc as an RTMP stream.
//
// Two ways a destination gets added:
//   1. Env vars (optional, always-on destinations for this deployment):
//        YOUTUBE_RTMP_URL   = rtmp://a.rtmp.youtube.com/live2/<your-youtube-stream-key>
//        FACEBOOK_RTMP_URL  = rtmps://live-api-s.facebook.com:443/rtmp/<your-facebook-stream-key>
//   2. Per-request, from the host's own "Stream settings" form in the app:
//        { rtmpUrl, streamKey } — joined into one full URL and added to the
//        list of destinations for that specific broadcast.
// At least one destination (env var OR request body) must be present.

import { EgressClient, StreamOutput, StreamProtocol } from 'livekit-server-sdk';

// Joins a server URL and a stream key into one full RTMP(S) URL,
// without producing a double slash or losing a required trailing one.
function buildFullRtmpUrl(rtmpUrl, streamKey) {
  const trimmedUrl = rtmpUrl.trim();
  const trimmedKey = streamKey.trim();

  // If the user already pasted the full URL (key included), don't double it up.
  if (trimmedUrl.includes(trimmedKey)) return trimmedUrl;

  const needsSlash = !trimmedUrl.endsWith('/');
  return needsSlash ? `${trimmedUrl}/${trimmedKey}` : `${trimmedUrl}${trimmedKey}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { room, rtmpUrl, streamKey, platform } = req.body || {};
  if (!room) return res.status(400).json({ error: 'room is required' });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return res.status(500).json({ error: 'Server is missing LiveKit credentials' });
  }

  const rtmpUrls = [];

  // Always-on destinations for this deployment, if configured.
  if (process.env.YOUTUBE_RTMP_URL) rtmpUrls.push(process.env.YOUTUBE_RTMP_URL);
  if (process.env.FACEBOOK_RTMP_URL) rtmpUrls.push(process.env.FACEBOOK_RTMP_URL);

  // Per-broadcast destination the host entered in the app.
  if (rtmpUrl && streamKey) {
    try {
      rtmpUrls.push(buildFullRtmpUrl(rtmpUrl, streamKey));
    } catch (err) {
      return res.status(400).json({ error: 'Invalid stream URL or key.' });
    }
  }

  if (rtmpUrls.length === 0) {
    return res.status(400).json({
      error:
        'No RTMP destination provided. Enter a stream URL and key in Stream settings, or configure YOUTUBE_RTMP_URL / FACEBOOK_RTMP_URL in Vercel.',
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

    console.log(
      `Started broadcast for room "${room}"${platform ? ` to ${platform}` : ''} — egressId: ${info.egressId}`
    );

    return res.status(200).json({ egressId: info.egressId });
  } catch (err) {
    console.error('Failed to start broadcast:', err);
    return res.status(500).json({ error: err.message });
  }
}
