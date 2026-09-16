import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { roomName, accessToken, displayName } = req.body;
  if (!roomName) return res.status(400).json({ error: "roomName required" });

  let user = null;
  if (accessToken) {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!error) user = data.user;
  }

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("room_name", roomName)
    .single();

  if (room?.is_private) {
    if (!user) return res.status(401).json({ error: "Login required for this room" });
    const { data: access } = await supabaseAdmin
      .from("room_access")
      .select("*")
      .eq("room_id", room.id)
      .eq("member_id", user.id)
      .single();
    if (!access) return res.status(403).json({ error: "Not a member of this room" });
  }

  const identity = user?.id || `guest-${Math.random().toString(36).slice(2, 10)}`;
  const name = displayName || "Guest";

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity, name }
  );
  at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });

  res.json({
    token: await at.toJwt(),
    url: process.env.LIVEKIT_URL,
    e2eeKey: room?.is_private ? room.e2ee_key : null,
  });
}
