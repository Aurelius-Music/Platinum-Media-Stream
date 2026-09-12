// api/stop-broadcast.js
import { EgressClient } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { egressId } = req.body || {};
  if (!egressId) return res.status(400).json({ error: 'egressId is required' });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  try {
    const egressHost = livekitUrl.replace('wss://', 'https://');
    const egressClient = new EgressClient(egressHost, apiKey, apiSecret);
    await egressClient.stopEgress(egressId);
    return res.status(200).json({ stopped: true });
  } catch (err) {
    console.error('Failed to stop broadcast:', err);
    return res.status(500).json({ error: err.message });
  }
}

