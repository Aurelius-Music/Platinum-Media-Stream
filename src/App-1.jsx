import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://fflmqamgcptaejomtdup.supabase.co";
const SUPABASE_KEY = "sb_publishable_1ot3tW3Pmb7xJ_DkQVsBBA_WUqFrTdq";

const db = {
  async get(table, id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await res.json();
      return rows?.[0]?.data ?? null;
    } catch { return null; }
  },
  async set(table, id, data) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({ id, data })
      });
    } catch {}
  },
  async getAll(table) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      return await res.json();
    } catch { return []; }
  },
  async upsertRow(table, id, data) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({ id, data })
      });
    } catch {}
  },
  async deleteRow(table, id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
    } catch {}
  }
};

// ─── DEFAULTS ────────────────────────────────────────────────────────────────
const DEFAULT_LINKS = [
  { id: "l1", label: "🎧 Stream on Spotify", url: "https://open.spotify.com", active: true, color: "#1DB954" },
  { id: "l2", label: "🍎 Apple Music", url: "https://music.apple.com", active: true, color: "#FC3C44" },
  { id: "l3", label: "▶️ YouTube Channel", url: "https://youtube.com", active: true, color: "#FF0000" },
  { id: "l4", label: "♪ TikTok", url: "https://tiktok.com", active: true, color: "#69C9D0" },
  { id: "l5", label: "📸 Instagram", url: "https://instagram.com", active: true, color: "#E1306C" },
  { id: "l6", label: "📧 Booking / Contact", url: "mailto:booking@aureliusmusic.com", active: true, color: "#FFD700" },
];
const DEFAULT_DROPS = [
  { id: "d1", title: "No Excuses", type: "Single", coverEmoji: "🔥", description: "Hard-hitting debut single.", streamUrl: "", active: true, status: "upcoming" },
];
const DEFAULT_TRACKS = [
  { id: "t1", title: "Off The No Go", artist: "Aurelius Music", duration: 180, coverEmoji: "🔥", genre: "Hip-Hop", url: "https://youtu.be/Lq-Kb9kuJmo", active: true, plays: 0 },
];
const DEFAULT_SETTINGS = {
  artistName: "AURELIUS MUSIC",
  artistBio: "Hard-hitting bars over cinematic production. Hip-Hop / Rap. Independent.",
  releaseName: "NO EXCUSES",
  releaseDate: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 16); })(),
};


const DEFAULT_ADS = [
  { id: "ad1", title: "Advertise Here", subtitle: "Reach Aurelius Music fans worldwide", imageUrl: "", linkUrl: "", bgColor: "#111118", textColor: "#FFD700", active: true, cta: "GET IN TOUCH" },
];
const EMOJIS = ["🔥","💙","👑","🎤","🌙","💯","🙌","⚡","🎧","❤️"];
const COVER_EMOJIS = ["🔥","🎤","👑","💿","🌙","⚡","🎵","🏆","🖤","💎","🚀","🌊","😤","🎯","💥"];
const LINK_COLORS = ["#FFD700","#1DB954","#FC3C44","#FF0000","#69C9D0","#E1306C","#FF5500","#784FFF","#FF3CAC","#00C2FF"];
const DROP_TYPES = ["Single","EP","Album","Mixtape","Freestyle","Collab","Remix"];
const PASS_HASH = "0453dddc018515dfc2a9f9c784e905ca511d8b86f3325ef021ca310d69993a0c";
async function checkPass(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("") === PASS_HASH;
}

function pad(n) { return String(n).padStart(2,"0"); }
function fmtTime(s) { if(!s||isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${pad(Math.floor(s%60))}`; }
function timeAgo(ts) {
  const d = Date.now()-ts;
  if(d<60000) return "just now";
  if(d<3600000) return `${Math.floor(d/60000)}m ago`;
  if(d<86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}
function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

// ─── YOUTUBE EMBED PLAYER ────────────────────────────────────────────────────
function YTPlayer({ track }) {
  if (!track) return null;
  // Extract YouTube ID from any YouTube URL format
  const getYTId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtu\.be\/([^?&\s]+)/,
      /youtube\.com\/watch\?v=([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return url; // assume raw ID was passed
  };
  const id = getYTId(track.url);
  if (!id) return (
    <div style={{background:"#0A0A0C",border:"1px solid #1C1C24",borderRadius:12,padding:20,textAlign:"center"}}>
      <div style={{fontSize:11,color:"#555",lineHeight:1.7}}>No YouTube URL set.<br/><strong style={{color:"#FFD700"}}>Admin → Music → Edit</strong> and paste your YouTube link.</div>
    </div>
  );
  return (
    <div style={{borderRadius:14,overflow:"hidden",border:"1px solid #FFD70022",background:"#000"}}>
      <iframe
        width="100%"
        height="200"
        src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&color=white`}
        title={track.title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{display:"block"}}
      />
    </div>
  );
}

// ─── WAVEFORM (decorative) ────────────────────────────────────────────────────
function Waveform({ playing }) {
  const BARS = 48;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, height:44, padding:"0 2px" }}>
      {Array.from({length:BARS},(_,i) => {
        const h = 10 + Math.sin(i*0.7)*8 + Math.sin(i*0.3)*6;
        return <div key={i} style={{ width:4, borderRadius:2, flexShrink:0, height:`${h}px`, background: "#1C1C24", animation: playing ? `wvb ${0.4+(i%7)*0.07}s ease-in-out infinite alternate` : "none", animationDelay:`${i*0.02}s` }}/>;
      })}
    </div>
  );
}

function Ring({ value, max, label, color }) {
  const r=28, circ=2*Math.PI*r, pct=Math.min(value/max,1);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={70} height={70} style={{transform:"rotate(-90deg)"}}>
        <circle cx={35} cy={35} r={r} fill="none" stroke="#1C1C24" strokeWidth={5}/>
        <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{transition:"stroke-dashoffset .8s ease"}}/>
        <text x={35} y={39} textAnchor="middle" fill="#fff" fontSize={16} fontFamily="Anton,sans-serif" style={{transform:"rotate(90deg)",transformOrigin:"35px 35px"}}>{pad(value)}</text>
      </svg>
      <span style={{fontSize:8,color:"#555",letterSpacing:2}}>{label}</span>
    </div>
  );
}

function Toggle({on,onChange}) {
  return (
    <div onClick={onChange} style={{width:40,height:22,borderRadius:11,background:on?"#FFD700":"#1C1C24",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:on?20:3,width:16,height:16,borderRadius:"50%",background:on?"#000":"#555",transition:"left .2s"}}/>
    </div>
  );
}

function Burst({active}) {
  if(!active) return null;
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999}}>
      {Array.from({length:18},(_,i)=>(
        <div key={i} style={{position:"absolute",left:"50%",top:"40%",width:8,height:8,borderRadius:"50%",background:["#FFD700","#FF6B00","#fff","#FF3CAC"][i%4],animation:`burst${i%6} .9s ease-out forwards`,animationDelay:`${i*0.025}s`}}/>
      ))}
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{minHeight:"100vh",background:"#060608",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:48,animation:"float 1.5s ease-in-out infinite"}}>🎤</div>
      <div style={{fontFamily:"'Anton',sans-serif",fontSize:22,letterSpacing:4,background:"linear-gradient(90deg,#FFD700,#FF6B00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AURELIUS MUSIC</div>
      <div style={{display:"flex",gap:6}}>
        {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#FFD700",animation:`pulse 1s ease-in-out infinite`,animationDelay:`${i*0.2}s`}}/>)}
      </div>
      <div style={{fontSize:9,color:"#444",letterSpacing:3}}>LOADING FROM CLOUD...</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AureliusHub() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("player");
  const [syncing, setSyncing] = useState(false);

  // Data
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [drops, setDrops] = useState(DEFAULT_DROPS);
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState(DEFAULT_ADS);

  // Player
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState({});
  const [copiedTrack, setCopiedTrack] = useState(null);
  const [sharedTrack, setSharedTrack] = useState(null);

  // Fan form
  const [fanName,setFanName]=useState(""); const [fanCity,setFanCity]=useState("");
  const [fanMsg,setFanMsg]=useState(""); const [fanEmoji,setFanEmoji]=useState("🔥");
  const [submitted,setSubmitted]=useState(false); const [burst,setBurst]=useState(false);
  const [msgFilter,setMsgFilter]=useState("all");

  // Inbox
  const [inboxUnlocked,setInboxUnlocked]=useState(false);
  const [passInput,setPassInput]=useState(""); const [passErr,setPassErr]=useState(false);
  const [passLocked,setPassLocked]=useState(false); const [passAttempts,setPassAttempts]=useState(0);
  const [selectedMsg,setSelectedMsg]=useState(null); const [copiedAll,setCopiedAll]=useState(false);

  // AI
  const [aiReply,setAiReply]=useState(""); const [aiLoading,setAiLoading]=useState(false);
  const [copiedReply,setCopiedReply]=useState(false); const [replyTone,setReplyTone]=useState("hype");
  const [hypeMsg,setHypeMsg]=useState(""); const [hypeLoading,setHypeLoading]=useState(false);
  const [copiedHype,setCopiedHype]=useState(false); const [hypeStyle,setHypeStyle]=useState("tiktok");

  // Admin
  const [adminUnlocked,setAdminUnlocked]=useState(false);
  const [adminPass,setAdminPass]=useState(""); const [adminPassErr,setAdminPassErr]=useState(false);
  const [adminLocked,setAdminLocked]=useState(false); const [adminAttempts,setAdminAttempts]=useState(0);
  const [adminSection,setAdminSection]=useState("music");
  const [editingLink,setEditingLink]=useState(null); const [editingDrop,setEditingDrop]=useState(null); const [editingTrack,setEditingTrack]=useState(null);
  const [newLink,setNewLink]=useState({label:"",url:"",color:"#FFD700",active:true});
  const [newDrop,setNewDrop]=useState({title:"",type:"Single",coverEmoji:"🔥",description:"",streamUrl:"",active:true,status:"upcoming"});
  const [newTrack,setNewTrack]=useState({title:"",artist:"Aurelius Music",duration:180,coverEmoji:"🔥",genre:"Hip-Hop",url:"",active:true,plays:0});
  const [showNewLink,setShowNewLink]=useState(false); const [showNewDrop,setShowNewDrop]=useState(false); const [showNewTrack,setShowNewTrack]=useState(false); const [showNewAd,setShowNewAd]=useState(false);
  const [editingAd,setEditingAd]=useState(null);
  const [newAd,setNewAd]=useState({title:"Advertise Here",subtitle:"Reach fans worldwide",imageUrl:"",linkUrl:"",bgColor:"#111118",textColor:"#FFD700",active:true,cta:"LEARN MORE"});
  const [savedFlash,setSavedFlash]=useState("");

  // Countdown
  const [countdown,setCountdown]=useState({d:0,h:0,m:0,s:0});
  const [released,setReleased]=useState(false);

  // ── LOAD ALL DATA FROM SUPABASE ──
  useEffect(()=>{
    const loadAll = async () => {
      setLoading(true);
      try {
        const [linksRows, dropsRows, tracksRows, messagesRows, settingsRows, adsRows] = await Promise.all([
          db.getAll("links"), db.getAll("drops"), db.getAll("tracks"),
          db.getAll("messages"), db.getAll("settings"), db.getAll("ads")
        ]);
        if(linksRows?.length) setLinks(linksRows.map(r=>r.data));
        if(dropsRows?.length) setDrops(dropsRows.map(r=>r.data));
        if(tracksRows?.length) setTracks(tracksRows.map(r=>r.data));
        if(messagesRows?.length) setMessages(messagesRows.map(r=>r.data).sort((a,b)=>b.ts-a.ts));
        if(adsRows?.length) setAds(adsRows.map(r=>r.data));
        const s = settingsRows?.find(r=>r.id==="main")?.data;
        if(s) setSettings(s);
      } catch(e){ console.error(e); }
      setLoading(false);
    };
    loadAll();
  },[]);

  // Countdown tick
  useEffect(()=>{
    const tick=()=>{
      const diff=new Date(settings.releaseDate).getTime()-Date.now();
      if(diff<=0){setCountdown({d:0,h:0,m:0,s:0});setReleased(true);return;}
      setReleased(false);
      setCountdown({d:Math.floor(diff/86400000),h:Math.floor((diff%86400000)/3600000),m:Math.floor((diff%3600000)/60000),s:Math.floor((diff%60000)/1000)});
    };
    tick(); const iv=setInterval(tick,1000); return()=>clearInterval(iv);
  },[settings.releaseDate]);

  // Flash helper
  useEffect(()=>{ console.log("API Key loaded:", import.meta.env.VITE_ANTHROPIC_KEY ? "YES ✅" : "NO ❌"); },[]);
  const flash=(msg="✓ SAVED TO CLOUD")=>{setSavedFlash(msg);setTimeout(()=>setSavedFlash(""),2000);};

  // ── SAVE HELPERS ──
  const saveLinks = async (arr) => { for(const l of arr) await db.upsertRow("links",l.id,l); };
  const saveDrops = async (arr) => { for(const d of arr) await db.upsertRow("drops",d.id,d); };
  const saveTracks = async (arr) => { for(const t of arr) await db.upsertRow("tracks",t.id,t); };
  const saveSettings = async (s) => { await db.upsertRow("settings","main",s); };
  const saveMessage = async (m) => { await db.upsertRow("messages",m.id,m); };
  const deleteMessage = async (id) => { await db.deleteRow("messages",id); };
  const deleteLink = async (id) => { const u=links.filter(l=>l.id!==id); setLinks(u); await db.deleteRow("links",id); flash(); };
  const deleteDrop = async (id) => { const u=drops.filter(d=>d.id!==id); setDrops(u); await db.deleteRow("drops",id); flash(); };
  const deleteTrack = async (id) => { const u=tracks.filter(t=>t.id!==id); setTracks(u); await db.deleteRow("tracks",id); if(currentTrack?.id===id){setCurrentTrack(null);setPlaying(false);} flash(); };

  // ── AD HELPERS ──
  const saveAd=async(a)=>{ const u=ads.map(x=>x.id===a.id?a:x); setAds(u); await db.upsertRow("ads",a.id,a); setEditingAd(null); flash(); };
  const addAd=async()=>{ if(!newAd.title.trim()) return; const na={...newAd,id:uid()}; const u=[...ads,na]; setAds(u); await db.upsertRow("ads",na.id,na); setNewAd({title:"Advertise Here",subtitle:"Reach fans worldwide",imageUrl:"",linkUrl:"",bgColor:"#111118",textColor:"#FFD700",active:true,cta:"LEARN MORE"}); setShowNewAd(false); flash(); };
  const deleteAd=async(id)=>{ const u=ads.filter(a=>a.id!==id); setAds(u); await db.deleteRow("ads",id); flash(); };
  const toggleAd=async(id)=>{ const u=ads.map(a=>a.id===id?{...a,active:!a.active}:a); setAds(u); const a=u.find(x=>x.id===id); await db.upsertRow("ads",id,a); };

  const activeTracks=tracks.filter(t=>t.active);
  const activeLinks=links.filter(l=>l.active);
  const activeDrops=drops.filter(d=>d.active);
  const pinnedCount=messages.filter(m=>m.pinned).length;
  const visibleMsgs=msgFilter==="pinned"?messages.filter(m=>m.pinned):messages;
  const totalPlays=tracks.reduce((a,t)=>a+(t.plays||0),0);

  const playTrack=async(track)=>{
    if(currentTrack?.id===track.id){ setCurrentTrack(null); setTimeout(()=>{ setCurrentTrack(track); setPlaying(true); },50); return; }
    setCurrentTrack(track); setPlaying(true);
    const updated={...track,plays:(track.plays||0)+1};
    const u=tracks.map(t=>t.id===track.id?updated:t); setTracks(u);
    await db.upsertRow("tracks",track.id,updated);
  };

  // ── FAN SUBMIT ──
  const handleFanSubmit=async()=>{
    if(!fanMsg.trim()||!fanName.trim()) return;
    // Rate limiting: max 3 submissions per 10 minutes per browser
    const now = Date.now();
    const key = "am_submissions";
    const recent = JSON.parse(sessionStorage.getItem(key)||"[]").filter(t=>now-t<600000);
    if(recent.length>=3){ alert("Too many messages. Please wait a few minutes."); return; }
    sessionStorage.setItem(key, JSON.stringify([...recent, now]));
    // Sanitize input - strip HTML tags and limit length
    const sanitize = (str) => str.replace(/<[^>]*>/g,"").replace(/[<>"'`]/g,"").trim().slice(0,500);
    const nm={id:uid(),name:sanitize(fanName).slice(0,50),city:sanitize(fanCity).slice(0,50)||"Unknown",message:sanitize(fanMsg),emoji:fanEmoji,ts:Date.now(),pinned:false};
    setMessages(p=>[nm,...p]);
    await saveMessage(nm);
    setSubmitted(true); setBurst(true); setTimeout(()=>setBurst(false),1000);
    setFanName("");setFanCity("");setFanMsg("");setFanEmoji("🔥");
  };
  const togglePin=async(id)=>{
    const updated=messages.map(m=>m.id===id?{...m,pinned:!m.pinned}:m);
    setMessages(updated);
    const msg=updated.find(m=>m.id===id);
    await db.upsertRow("messages",id,msg);
    if(selectedMsg?.id===id) setSelectedMsg(m=>({...m,pinned:!m.pinned}));
  };
  const handleDeleteMsg=async(id)=>{ setMessages(p=>p.filter(m=>m.id!==id)); await deleteMessage(id); setSelectedMsg(null); };

  // ── AI ──
  const generateReply=async(fanMessage,tone)=>{
    setAiLoading(true);setAiReply("");
    const toneMap={
      hype:"hype, energetic and grateful but also CONFIDENT. You know you're built different. Use natural Hip-Hop expressions. Show love but also show swagger.",
      humble:"deeply humble and heartfelt. This fan's message actually touched you. Be vulnerable and real. No swagger here — just genuine gratitude from an artist who remembers where they came from.",
      funny:"funny, witty and charming with natural Hip-Hop humor. Light roast if appropriate. Make them laugh. Keep it real and playful. Show your personality.",
      short:"ultra short, punchy and real. 1-2 sentences MAX. Like a real rapper would text back. No fluff."
    };
    try{
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`You are ${settings.artistName}, an independent Hip-Hop/Rap artist on the rise. You reply to fans personally — never copy-paste, never corporate. Each reply feels handwritten and real. Tone: ${toneMap[tone]}. You're grateful but also confident — you KNOW you're about to blow up. 2-4 sentences max. Sign off naturally as ${settings.artistName}. Make the fan feel seen and special — like they discovered you before everyone else did.`,messages:[{role:"user",content:`Fan: ${fanMessage.name} (${fanMessage.city}): "${fanMessage.message}"\n\nWrite my reply.`}]})});
      const data=await res.json(); setAiReply(data.content?.[0]?.text||"Couldn't generate. Try again.");
    }catch(err){setAiReply("Error: " + (err?.message||"Unknown. Check API key in Vercel settings."));}
    setAiLoading(false);
  };
  const generateHype=(style)=>{
    setHypeLoading(true);setHypeMsg("");
    const name = settings.artistName;
    const release = settings.releaseName;
    const timeStr = released ? "out now" : countdown.d===0 ? "dropping TODAY" : `dropping in ${countdown.d} day${countdown.d!==1?"s":""}`;

    const captions = {
      tiktok: [
        `pov: you just found your next favorite rapper 🔥 ${name} just dropped "${release}" and it's not a game anymore… #hiphop #newartist #fyp #rap #bars`,
        `they told him wait his turn. he didn't. 😤 "${release}" by ${name} is ${timeStr} — go stream it NOW 🎧 #fyp #hiphop #newrap #undiscovered`,
        `i don't say this lightly but this might be the hardest thing i've heard all year 🥶 ${name} - "${release}" ${timeStr} #hiphop #fyp #rap #newmusic`,
        `the ones who find ${name} right now are gonna say they knew before everyone 👀 "${release}" ${timeStr} #fyp #hiphop #bars #newartist`,
      ],
      instagram: [
        `"${release}" is ${timeStr}.

This one wasn't made for the charts. It was made for the ones who feel everything deeply and say nothing. You know who you are.

Stream link in bio. 🖤

#${name.replace(/\s/g,"")} #HipHop #NewMusic #Rap #IndependentArtist #NewRelease #Bars #HipHopMusic #Rapper #Unsigned`,
        `They sleep on the ones who are building in silence. 😤

"${release}" ${timeStr}. No features. No label. Just bars.

Link in bio — go show love. 🎧

#HipHop #Rap #NewArtist #${name.replace(/\s/g,"")} #IndieRap #NewMusic #Bars #Grind #Unsigned #HipHopCommunity`,
        `I made "${release}" for the ones who never gave up even when nobody was watching. 🔥

It's ${timeStr}. Stream it. Share it. Let's go. 🚀

Link in bio.

#NewMusic #HipHop #Rap #${name.replace(/\s/g,"")} #NewRelease #Bars #Rapper #Independent #Grind #MusicIsLife`,
      ],
      twitter: [
        `"${release}" ${timeStr}. I been quiet. Now it's time to talk. 🎤`,
        `not asking for streams. just asking you to listen once. "${release}" ${timeStr}. that's all i need. 🖤`,
        `every rapper says they're different. i'll let "${release}" speak for itself. ${timeStr}.`,
        `built different. "${release}" ${timeStr}. screenshot this tweet. 😤`,
      ],
      sms: [
        `Yo it's ${name}! Just wanted to personally let you know "${release}" is ${timeStr}. You've been rocking with me and I don't take that lightly. Go stream it and tell me what you think 🎧🔥`,
        `Hey! ${name} here. "${release}" is ${timeStr} and I made this one for real ones like you. Stream it, share it, let's make some noise together 🙏🔥`,
        `${name} here — "${release}" is ${timeStr}!! Been working on this for a minute. You're one of the first to hear it. Go stream it and lmk what you think 🎤`,
      ],
    };

    const options = captions[style] || captions.tiktok;
    const picked = options[Math.floor(Math.random() * options.length)]
      .replace(/\[RELEASE\]/g, release)
      .replace(/\[ARTIST\]/g, name);

    setTimeout(() => {
      setHypeMsg(picked);
      setHypeLoading(false);
    }, 800);
  };

  // ── ADMIN SAVE HELPERS ──
  const saveLink=async(l)=>{ const u=links.map(x=>x.id===l.id?l:x); setLinks(u); await db.upsertRow("links",l.id,l); setEditingLink(null); flash(); };
  const addLink=async()=>{ if(!newLink.label.trim()||!newLink.url.trim()) return; const nl={...newLink,id:uid()}; const u=[...links,nl]; setLinks(u); await db.upsertRow("links",nl.id,nl); setNewLink({label:"",url:"",color:"#FFD700",active:true}); setShowNewLink(false); flash(); };
  const toggleLink=async(id)=>{ const u=links.map(l=>l.id===id?{...l,active:!l.active}:l); setLinks(u); const l=u.find(x=>x.id===id); await db.upsertRow("links",id,l); };
  const saveDrop=async(d)=>{ const u=drops.map(x=>x.id===d.id?d:x); setDrops(u); await db.upsertRow("drops",d.id,d); setEditingDrop(null); flash(); };
  const addDrop=async()=>{ if(!newDrop.title.trim()) return; const nd={...newDrop,id:uid()}; const u=[nd,...drops]; setDrops(u); await db.upsertRow("drops",nd.id,nd); setNewDrop({title:"",type:"Single",coverEmoji:"🔥",description:"",streamUrl:"",active:true,status:"upcoming"}); setShowNewDrop(false); flash(); };
  const toggleDrop=async(id)=>{ const u=drops.map(d=>d.id===id?{...d,active:!d.active}:d); setDrops(u); const d=u.find(x=>x.id===id); await db.upsertRow("drops",id,d); };
  const saveTrack=async(t)=>{ const u=tracks.map(x=>x.id===t.id?t:x); setTracks(u); await db.upsertRow("tracks",t.id,t); setEditingTrack(null); flash(); };
  const addTrack=async()=>{ if(!newTrack.title.trim()) return; const nt={...newTrack,id:uid(),plays:0}; const u=[nt,...tracks]; setTracks(u); await db.upsertRow("tracks",nt.id,nt); setNewTrack({title:"",artist:settings.artistName,duration:180,coverEmoji:"🔥",genre:"Hip-Hop",url:"",active:true,plays:0}); setShowNewTrack(false); flash(); };
  const toggleTrackActive=async(id)=>{ const u=tracks.map(t=>t.id===id?{...t,active:!t.active}:t); setTracks(u); const t=u.find(x=>x.id===id); await db.upsertRow("tracks",id,t); };
  const saveSettingsToDb=async(s)=>{ setSettings(s); await saveSettings(s); flash(); };

  const TABS=[{id:"player",label:"🎵 Player"},{id:"countdown",label:"⏳ Drops"},{id:"fan",label:"💬 Fan Wall"},{id:"inbox",label:"🔐 Inbox"},{id:"admin",label:"⚙️ Admin"}];
  const TONES=[{id:"hype",label:"🔥 Hype"},{id:"humble",label:"🙏 Humble"},{id:"funny",label:"😂 Funny"},{id:"short",label:"⚡ Short"}];
  const HYPE_STYLES=[{id:"tiktok",label:"♪ TikTok"},{id:"instagram",label:"📸 IG"},{id:"twitter",label:"✖ X"},{id:"sms",label:"📱 SMS"}];
  const ct=currentTrack;

  if(loading) return <LoadingScreen/>;

  return (
    <div style={{minHeight:"100vh",background:"#060608",color:"#fff",fontFamily:"'DM Mono','Courier New',monospace",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Anton&display=swap');
        *{box-sizing:border-box}
        @keyframes fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 14px #FFD70044}50%{box-shadow:0 0 30px #FFD700BB}}
        @keyframes glowPlay{0%,100%{box-shadow:0 0 20px #FFD70066}50%{box-shadow:0 0 44px #FFD700CC}}
        @keyframes ticker{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes wvb{from{transform:scaleY(.5)}to{transform:scaleY(1.5)}}
        @keyframes disc{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        @keyframes saved{0%{opacity:0;transform:translateX(-50%) scale(.8)}20%{opacity:1;transform:translateX(-50%) scale(1.05)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) scale(1)}}
        @keyframes burst0{to{transform:translate(-70px,-90px) scale(0);opacity:0}}
        @keyframes burst1{to{transform:translate(70px,-90px) scale(0);opacity:0}}
        @keyframes burst2{to{transform:translate(-90px,10px) scale(0);opacity:0}}
        @keyframes burst3{to{transform:translate(90px,10px) scale(0);opacity:0}}
        @keyframes burst4{to{transform:translate(-45px,80px) scale(0);opacity:0}}
        @keyframes burst5{to{transform:translate(45px,80px) scale(0);opacity:0}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#FFD700;border-radius:2px}
        .inp{background:#0A0A0C;border:1px solid #1C1C24;color:#ccc;border-radius:10px;padding:10px 13px;font-family:'DM Mono',monospace;font-size:11px;width:100%;outline:none;transition:border .2s}
        .inp:focus{border-color:#FFD700}
        textarea.inp{resize:none;line-height:1.7;height:76px}
        select.inp{cursor:pointer}
        .gold-btn{background:linear-gradient(135deg,#FFD700,#FF6B00);color:#000;border:none;border-radius:10px;padding:11px 18px;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:2px;cursor:pointer;transition:transform .1s;animation:glow 2.5s ease-in-out infinite}
        .gold-btn:active{transform:scale(.97)}
        .gold-btn:disabled{opacity:.3;cursor:not-allowed;animation:none}
        .ghost{background:none;border:1px solid #1C1C24;color:#666;border-radius:8px;padding:7px 12px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;cursor:pointer;transition:all .2s}
        .ghost:hover,.ghost.on{border-color:#FFD700;color:#FFD700;background:#FFD70010}
        .red-ghost{background:none;border:1px solid #2C1010;color:#633;border-radius:8px;padding:7px 12px;font-family:'DM Mono',monospace;font-size:9px;cursor:pointer;transition:all .2s}
        .red-ghost:hover{border-color:#FF4444;color:#FF4444;background:#1A0505}
        .tab{background:none;border:none;color:#444;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;padding:9px 11px;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
        .tab.on{color:#FFD700;border-bottom-color:#FFD700}
        .card{background:#0C0C10;border:1px solid #1C1C24;border-radius:14px;padding:16px}
        .track-row{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;cursor:pointer;transition:all .2s;border:1px solid transparent}
        .track-row:hover{background:#0C0C10;border-color:#1C1C24}
        .track-row.active{background:#0F0F14;border-color:#FFD70033}
        .fan-card{background:#0C0C10;border:1px solid #1C1C24;border-radius:13px;padding:14px;transition:all .2s;animation:fadein .4s ease}
        .fan-card:hover{border-color:#2C2C38}
        .fan-card.starred{border-color:#FFD70044}
        .admin-tab{background:none;border:1px solid transparent;color:#555;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;padding:7px 11px;border-radius:8px;transition:all .2s}
        .admin-tab.on{background:#FFD70015;color:#FFD700;border-color:#FFD70033}
        .loading-bar{height:3px;background:linear-gradient(90deg,#FFD700,#FF6B00,#FFD700);background-size:400px 100%;animation:shimmer 1.5s infinite linear;border-radius:2px;margin-bottom:12px}
        .link-row{display:flex;align-items:center;gap:10px;background:#0A0A0C;border:1px solid #1C1C24;border-radius:11px;padding:11px 13px;transition:all .2s}
        .link-row:hover{border-color:#2C2C38}
        .saved-toast{position:fixed;top:68px;left:50%;transform:translateX(-50%);background:#FFD700;color:#000;padding:6px 20px;border-radius:20px;font-family:'DM Mono',monospace;font-size:10px;font-weight:500;letter-spacing:2px;animation:saved 2s ease forwards;z-index:1000;pointer-events:none;white-space:nowrap}
        .color-dot{width:22px;height:22px;border-radius:50%;cursor:pointer;transition:transform .15s;flex-shrink:0;border:2px solid transparent}
        .color-dot:hover,.color-dot.on{transform:scale(1.2)}
        .color-dot.on{border-color:#fff}
        .ctrl-btn{background:none;border:none;cursor:pointer;color:#888;transition:all .2s;padding:4px;display:flex;align-items:center;justify-content:center}
        .ctrl-btn:hover{color:#FFD700}
        .ctrl-btn.on{color:#FFD700}
        .play-main{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FF6B00);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;animation:glowPlay 2s ease-in-out infinite;transition:transform .1s;flex-shrink:0}
        .play-main:active{transform:scale(.94)}
        .sync-dot{width:6px;height:6px;border-radius:50%;background:#1DB954;animation:pulse 1.5s ease-in-out infinite}
      `}</style>

      <Burst active={burst}/>
      {savedFlash && <div className="saved-toast">☁️ {savedFlash}</div>}

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,#0C0C12,#060608)",borderBottom:"1px solid #1C1C24",padding:"16px 16px 0"}}>
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:42,height:42,borderRadius:11,background:"linear-gradient(135deg,#FFD700,#FF6B00)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,animation:"float 3s ease-in-out infinite, glow 2.5s ease-in-out infinite",flexShrink:0}}>🎤</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Anton'",fontSize:18,letterSpacing:3,background:"linear-gradient(90deg,#FFD700,#FF6B00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{settings.artistName}</div>
              <div style={{fontSize:8,color:"#444",letterSpacing:2,display:"flex",alignItems:"center",gap:6}}>
                <div className="sync-dot"/>
                <span>LIVE · {activeTracks.length} TRACKS · {totalPlays} PLAYS · {messages.length} FANS</span>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"'Anton'",fontSize:9,color:released?"#1DB954":"#FFD700",letterSpacing:1}}>{released?"🔥 OUT NOW":`⏳ ${countdown.d}D ${pad(countdown.h)}H`}</div>
              <div style={{fontSize:8,color:"#444",letterSpacing:1,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{settings.releaseName}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:1,overflowX:"auto",scrollbarWidth:"none"}}>
            {TABS.map(t=><button key={t.id} className={`tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
          </div>
        </div>
      </div>

      {/* TICKER */}
      <div style={{background:"#FFD700",padding:"4px 0",overflow:"hidden",whiteSpace:"nowrap"}}>
        <span style={{display:"inline-block",animation:"ticker 22s linear infinite",fontSize:8,letterSpacing:2,color:"#000",fontWeight:700}}>
          &nbsp;🎤 {settings.artistName} · {ct?`NOW PLAYING: ${ct.title}`:settings.releaseName} {released?"OUT NOW 🔥":`IN ${countdown.d}D`} &nbsp;·&nbsp; 💬 LEAVE A MESSAGE &nbsp;·&nbsp; ☁️ POWERED BY SUPABASE &nbsp;·&nbsp;
        </span>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"16px 16px 50px"}}>

        {/* ══ PLAYER ══ */}
        {tab==="player" && (
          <div style={{animation:"fadein .3s ease"}}>

            {/* Now Playing */}
            {ct ? (
              <div style={{background:"linear-gradient(135deg,#0C0C14,#0A0A10)",border:"1px solid #FFD70022",borderRadius:20,padding:20,marginBottom:18}}>
                {/* Track info */}
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                  <div style={{width:64,height:64,borderRadius:14,background:"linear-gradient(135deg,#1C1C24,#FFD70022)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,border:"2px solid #FFD70033",animation:playing?"disc 8s linear infinite":"none",flexShrink:0}}>{ct.coverEmoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Anton'",fontSize:18,letterSpacing:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.title}</div>
                    <div style={{fontSize:10,color:"#555",letterSpacing:2}}>{ct.artist} · {ct.genre}</div>
                    <div style={{fontSize:9,color:"#FFD700",marginTop:2}}>{ct.plays||0} plays</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>setLiked(l=>({...l,[ct.id]:!l[ct.id]}))} style={{background:"none",border:`1px solid ${liked[ct.id]?"#FF3CAC":"#1C1C24"}`,color:liked[ct.id]?"#FF3CAC":"#555",borderRadius:8,padding:"6px 10px",fontFamily:"'DM Mono'",fontSize:12,cursor:"pointer"}}>
                      {liked[ct.id]?"❤️":"🤍"}
                    </button>
                    <button onClick={()=>{
                      const shareText=`🎤 Check out "${ct.title}" by ${settings.artistName} 🔥`;
                      const shareUrl=window.location.href;
                      if(navigator.share){navigator.share({title:ct.title,text:shareText,url:shareUrl}).catch(()=>{});}
                      else{navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(()=>{});setSharedTrack(ct.id);setTimeout(()=>setSharedTrack(null),2000);}
                    }} style={{background:"none",border:`1px solid ${sharedTrack===ct.id?"#FFD700":"#1C1C24"}`,color:sharedTrack===ct.id?"#FFD700":"#555",borderRadius:8,padding:"6px 10px",fontFamily:"'DM Mono'",fontSize:12,cursor:"pointer"}}>
                      {sharedTrack===ct.id?"✓ COPIED":"🔗 SHARE"}
                    </button>
                  </div>
                </div>

                {/* YouTube Widget */}
                {ct.url ? (
                  <YTPlayer track={ct}/>
                ) : (
                  <div style={{background:"#0A0A0C",border:"1px solid #1C1C24",borderRadius:12,padding:"20px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"#555",lineHeight:1.7}}>
                      No audio URL set for this track.<br/>
                      Go to <strong style={{color:"#FFD700"}}>Admin → Music → Edit</strong> and paste your SoundCloud link.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{background:"linear-gradient(135deg,#0C0C14,#0A0A10)",border:"1px solid #1C1C24",borderRadius:20,padding:30,marginBottom:18,textAlign:"center"}}>
                <div style={{fontSize:48,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🎧</div>
                <div style={{fontFamily:"'Anton'",fontSize:18,letterSpacing:2,color:"#FFD700",marginBottom:6}}>SELECT A TRACK</div>
                <div style={{fontSize:10,color:"#555"}}>Tap any song below to play it</div>
              </div>
            )}

            {/* Track List */}
            <div style={{fontSize:9,color:"#444",letterSpacing:2,marginBottom:10}}>{activeTracks.length} TRACKS</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {activeTracks.map((track,idx)=>(
                <div key={track.id} className={`track-row${ct?.id===track.id?" active":""}`} onClick={()=>playTrack(track)}>
                  <div style={{width:28,textAlign:"center",fontFamily:"'Anton'",fontSize:13,color:ct?.id===track.id?"#FFD700":"#333",flexShrink:0}}>
                    {ct?.id===track.id ? <span style={{animation:"spin 1s linear infinite",display:"inline-block",color:"#FFD700"}}>◎</span> : idx+1}
                  </div>
                  <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#1C1C24,#141420)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{track.coverEmoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:ct?.id===track.id?"#FFD700":"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</div>
                    <div style={{fontSize:9,color:"#444",letterSpacing:1}}>{track.genre} · {track.plays||0} plays · {track.url?"🔊 SC":"🔇 no audio"}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setLiked(l=>({...l,[track.id]:!l[track.id]}));}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:liked[track.id]?"#FF3CAC":"#333",transition:"color .2s",flexShrink:0}}>{liked[track.id]?"❤️":"🤍"}</button>
                  <button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(window.location.href).catch(()=>{});setCopiedTrack(track.id);setTimeout(()=>setCopiedTrack(null),2000);}} style={{background:"none",border:`1px solid ${copiedTrack===track.id?"#FFD700":"#1C1C24"}`,color:copiedTrack===track.id?"#FFD700":"#444",borderRadius:6,padding:"4px 8px",fontFamily:"'DM Mono'",fontSize:8,cursor:"pointer",letterSpacing:1,transition:"all .2s",flexShrink:0}}>
                    {copiedTrack===track.id?"✓":"🔗"}
                  </button>
                  <button onClick={e=>{
                    e.stopPropagation();
                    const shareText = `🎤 Check out "${track.title}" by ${settings.artistName} 🔥`;
                    const shareUrl = window.location.href;
                    if(navigator.share){
                      navigator.share({title:track.title,text:shareText,url:shareUrl}).catch(()=>{});
                    } else {
                      navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(()=>{});
                      setSharedTrack(track.id);
                      setTimeout(()=>setSharedTrack(null),2000);
                    }
                  }} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:sharedTrack===track.id?"#FFD700":"#333",transition:"color .2s",flexShrink:0}}>
                    {sharedTrack===track.id?"✓":"🔗"}
                  </button>
                </div>
              ))}
              {activeTracks.length===0&&<div style={{textAlign:"center",padding:"28px 0",color:"#333",fontSize:11}}>No tracks yet — add them in Admin ⚙️</div>}
            </div>

            {/* Tip */}
            <div style={{marginTop:14,background:"#0A0A0C",border:"1px solid #1C1C24",borderRadius:10,padding:"10px 14px",fontSize:9,color:"#555",lineHeight:1.8}}>
              💡 <strong style={{color:"#777"}}>How to add your music:</strong> Upload to YouTube → copy the video URL → paste in Admin → Music → Edit → Audio URL → Save ☁️ Every play on your hub = a real YouTube view! 🎬
            </div>
          </div>
        )}

        {/* ══ DROPS ══ */}
        {tab==="countdown" && (
          <div style={{animation:"fadein .3s ease"}}>
            <div style={{background:"linear-gradient(135deg,#0C0C12,#0A0A0E)",border:"1px solid #1C1C24",borderRadius:18,padding:"22px 18px",marginBottom:18,textAlign:"center"}}>
              {released?(
                <div style={{animation:"pop .5s ease"}}>
                  <div style={{fontSize:42,marginBottom:8,animation:"float 2s ease-in-out infinite"}}>🚀</div>
                  <div style={{fontFamily:"'Anton'",fontSize:24,letterSpacing:4,background:"linear-gradient(90deg,#FFD700,#FF6B00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{settings.releaseName}</div>
                  <div style={{fontFamily:"'Anton'",fontSize:17,letterSpacing:3,color:"#FFD700",marginTop:4}}>IS OUT NOW!</div>
                </div>
              ):(
                <>
                  <div style={{fontSize:9,color:"#555",letterSpacing:3,marginBottom:5}}>DROPPING IN</div>
                  <div style={{fontFamily:"'Anton'",fontSize:19,letterSpacing:2,color:"#fff",marginBottom:14}}>{settings.releaseName}</div>
                  <div style={{display:"flex",justifyContent:"center",gap:12}}>
                    <Ring value={countdown.d} max={30} label="DAYS" color="#FFD700"/>
                    <Ring value={countdown.h} max={24} label="HOURS" color="#FF6B00"/>
                    <Ring value={countdown.m} max={60} label="MINS" color="#FF3CAC"/>
                    <Ring value={countdown.s} max={60} label="SECS" color="#784FFF"/>
                  </div>
                </>
              )}
            </div>
            {activeDrops.length>0&&(
              <div className="card" style={{marginBottom:14}}>
                <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:10}}>MUSIC DROPS</div>
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {activeDrops.map(drop=>(
                    <div key={drop.id} style={{display:"flex",gap:11,alignItems:"center",background:"#080810",border:"1px solid #1C1C24",borderRadius:10,padding:"10px 12px"}}>
                      <div style={{width:38,height:38,borderRadius:9,background:"linear-gradient(135deg,#1C1C24,#141420)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{drop.coverEmoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{drop.title}</div>
                        <div style={{fontSize:9,color:"#555"}}>{drop.type} · <span style={{color:drop.status==="out"?"#1DB954":drop.status==="upcoming"?"#FFD700":"#784FFF"}}>{drop.status==="out"?"OUT NOW":drop.status==="upcoming"?"UPCOMING":"COMING SOON"}</span></div>
                      </div>
                      {drop.streamUrl&&<a href={drop.streamUrl} target="_blank" rel="noreferrer" style={{background:"linear-gradient(135deg,#FFD700,#FF6B00)",color:"#000",borderRadius:7,padding:"5px 11px",fontFamily:"'DM Mono'",fontSize:9,fontWeight:500,letterSpacing:1,textDecoration:"none",flexShrink:0}}>STREAM</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card" style={{marginBottom:14}}>
              <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:10}}>LINKS</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {activeLinks.map(l=>(
                  <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#080810",border:"1px solid #1C1C24",borderRadius:9,padding:"10px 13px",textDecoration:"none"}}>
                    <span style={{fontSize:11,color:"#ccc"}}>{l.label}</span>
                    <span style={{fontSize:9,color:l.color}}>→</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="card" style={{borderColor:"#FFD70022"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>🤖</span><div style={{fontSize:10,color:"#FFD700",fontWeight:500,letterSpacing:1}}>AI HYPE CAPTION</div></div>
                <div style={{fontSize:8,color:import.meta.env.VITE_ANTHROPIC_KEY?"#1DB954":"#FF4444",letterSpacing:1}}>{import.meta.env.VITE_ANTHROPIC_KEY?"🟢 API READY":"🔴 NO API KEY"}</div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {HYPE_STYLES.map(s=><button key={s.id} className={`ghost${hypeStyle===s.id?" on":""}`} onClick={()=>setHypeStyle(s.id)}>{s.label}</button>)}
              </div>
              <button className="gold-btn" style={{width:"100%",marginBottom:hypeMsg||hypeLoading?10:0}} disabled={hypeLoading} onClick={()=>generateHype(hypeStyle)}>
                {hypeLoading?"⚡ GENERATING...":"✨ GENERATE HYPE POST"}
              </button>
              {hypeLoading&&<div className="loading-bar"/>}
              {hypeMsg&&!hypeLoading&&(
                <div style={{animation:"fadein .4s ease"}}>
                  <div style={{background:"#080810",border:"1px solid #1C1C24",borderRadius:10,padding:12,fontSize:11,color:"#ccc",lineHeight:1.8,whiteSpace:"pre-wrap",marginBottom:8}}>{hypeMsg}</div>
                  <div style={{display:"flex",gap:7}}>
                    <button className="gold-btn" style={{flex:1,animation:"none"}} onClick={()=>{navigator.clipboard?.writeText(hypeMsg).catch(()=>{});setCopiedHype(true);setTimeout(()=>setCopiedHype(false),1800);}}>
                      {copiedHype?"✓ COPIED!":"📋 COPY"}
                    </button>
                    <button className="ghost" onClick={()=>generateHype(hypeStyle)}>↻</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ FAN WALL ══ */}
        {tab==="fan" && (
          <div style={{animation:"fadein .3s ease"}}>
            {!submitted?(
              <div style={{background:"linear-gradient(135deg,#0C0C12,#0A0A0E)",border:"1px solid #1C1C24",borderRadius:16,padding:16,marginBottom:18}}>
                <div style={{fontFamily:"'Anton'",fontSize:14,letterSpacing:2,color:"#FFD700",marginBottom:2}}>LEAVE A MESSAGE</div>
                <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:12}}>SHOW {settings.artistName} SOME LOVE 🎤</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>NAME *</div><input className="inp" placeholder="Jordan K." value={fanName} onChange={e=>setFanName(e.target.value)}/></div>
                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>CITY</div><input className="inp" placeholder="Atlanta, GA" value={fanCity} onChange={e=>setFanCity(e.target.value)}/></div>
                </div>
                <div style={{marginBottom:10}}><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>MESSAGE *</div><textarea className="inp" placeholder={`Tell ${settings.artistName} how the music hits you...`} value={fanMsg} onChange={e=>setFanMsg(e.target.value)}/></div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>VIBE</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {EMOJIS.map(e=><button key={e} onClick={()=>setFanEmoji(e)} style={{width:32,height:32,borderRadius:8,border:`1px solid ${fanEmoji===e?"#FFD700":"#1C1C24"}`,background:fanEmoji===e?"#FFD70015":"#0A0A0C",cursor:"pointer",fontSize:14,transition:"all .15s"}}>{e}</button>)}
                  </div>
                </div>
                <button className="gold-btn" style={{width:"100%"}} disabled={!fanName.trim()||!fanMsg.trim()} onClick={handleFanSubmit}>🔥 SEND MESSAGE</button>
              </div>
            ):(
              <div style={{background:"linear-gradient(135deg,#FFD70011,#FF6B0011)",border:"1px solid #FFD70044",borderRadius:16,padding:18,marginBottom:18,textAlign:"center",animation:"pop .5s ease"}}>
                <div style={{fontSize:30,marginBottom:6,animation:"float 2s ease-in-out infinite"}}>🎉</div>
                <div style={{fontFamily:"'Anton'",fontSize:15,letterSpacing:2,color:"#FFD700",marginBottom:4}}>SAVED TO CLOUD! ☁️</div>
                <div style={{fontSize:10,color:"#888",lineHeight:1.7,marginBottom:10}}>Your message is live for Aurelius Music to see. 🔥</div>
                <button onClick={()=>setSubmitted(false)} style={{background:"none",border:"1px solid #FFD70044",color:"#FFD700",borderRadius:8,padding:"6px 16px",fontFamily:"'DM Mono'",fontSize:9,letterSpacing:2,cursor:"pointer"}}>+ ANOTHER</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:9,color:"#444",letterSpacing:2}}>MESSAGES ({messages.length})</span>
              {pinnedCount>0&&<div style={{display:"flex",gap:5}}>
                {["all","pinned"].map(f=><button key={f} className={`ghost${msgFilter===f?" on":""}`} style={{padding:"4px 9px"}} onClick={()=>setMsgFilter(f)}>{f==="pinned"?"📌 PINNED":"ALL"}</button>)}
              </div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {visibleMsgs.map(m=>(
                <div key={m.id} className={`fan-card${m.pinned?" starred":""}`}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:9,background:"#1C1C24",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{m.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontSize:11}}>{m.name} <span style={{fontSize:9,color:"#444"}}>{m.city}</span></span>
                        <span style={{fontSize:9,color:"#333"}}>{timeAgo(m.ts)}</span>
                      </div>
                      <div style={{fontSize:11,color:"#aaa",lineHeight:1.7}}>{m.message}</div>
                    </div>
                  </div>
                </div>
              ))}
              {messages.length===0&&<div style={{textAlign:"center",color:"#333",padding:"28px 0",fontSize:11}}>No messages yet — share your link!</div>}
            </div>
          </div>
        )}

        {/* ══ INBOX ══ */}
        {tab==="inbox" && (
          <div style={{animation:"fadein .3s ease"}}>
            {!inboxUnlocked?(
              <div style={{maxWidth:290,margin:"36px auto 0",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🔐</div>
                <div style={{fontFamily:"'Anton'",fontSize:17,letterSpacing:3,color:"#FFD700",marginBottom:2}}>ARTIST ONLY</div>
                <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:16}}>ENTER PASSCODE</div>
                <input className="inp" type="password" placeholder="· · · · · · · ·" value={passInput} style={{textAlign:"center",letterSpacing:4,fontSize:14,borderColor:passErr?"#FF4444":undefined}} onChange={e=>{setPassInput(e.target.value);setPassErr(false);}} onKeyDown={e=>{if(e.key==="Enter"){checkPass(passInput).then(ok=>{if(ok)setInboxUnlocked(true);else setPassErr(true);})}}}/>
                {passErr&&<div style={{fontSize:9,color:"#FF4444",marginTop:5,letterSpacing:1}}>WRONG PASSCODE</div>}
                <button className="gold-btn" style={{width:"100%",marginTop:10}} disabled={passLocked} onClick={()=>{if(passLocked)return;checkPass(passInput).then(ok=>{if(ok){setPassAttempts(0);setInboxUnlocked(true);}else{const a=passAttempts+1;setPassAttempts(a);if(a>=5){setPassLocked(true);setTimeout(()=>{setPassLocked(false);setPassAttempts(0);},300000);}setPassErr(true);}});}}>{passLocked?"🔒 LOCKED 5 MIN":"UNLOCK →"}</button>
                
              </div>
            ):(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:12}}>
                  {[["TOTAL",messages.length,"💬"],["PINNED",pinnedCount,"📌"],["THIS WEEK",messages.filter(m=>Date.now()-m.ts<604800000).length,"🔥"]].map(([l,v,i])=>(
                    <div key={l} className="card" style={{textAlign:"center",padding:"10px 6px"}}>
                      <div>{i}</div><div style={{fontFamily:"'Anton'",fontSize:18,color:"#FFD700"}}>{v}</div>
                      <div style={{fontSize:7,color:"#444",letterSpacing:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:7,marginBottom:12}}>
                  <button className="ghost" onClick={()=>{const t=messages.map(m=>`${m.name} (${m.city}): ${m.message}`).join("\n\n");navigator.clipboard?.writeText(t).catch(()=>{});setCopiedAll(true);setTimeout(()=>setCopiedAll(false),2000);}}>
                    {copiedAll?"✓ COPIED ALL":"📋 COPY ALL"}
                  </button>
                  <button className="ghost" onClick={()=>{setInboxUnlocked(false);setPassInput("");setSelectedMsg(null);setAiReply("");}}>LOCK 🔒</button>
                </div>
                {selectedMsg?(
                  <div style={{animation:"fadein .2s ease"}}>
                    <button onClick={()=>{setSelectedMsg(null);setAiReply("");setCopiedReply(false);}} style={{background:"none",border:"none",color:"#FFD700",fontFamily:"'DM Mono'",fontSize:9,cursor:"pointer",letterSpacing:2,marginBottom:10}}>← BACK</button>
                    <div className="card" style={{borderColor:"#FFD70033",marginBottom:12}}>
                      <div style={{display:"flex",gap:11,marginBottom:10}}>
                        <div style={{width:40,height:40,borderRadius:10,background:"#1C1C24",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{selectedMsg.emoji}</div>
                        <div><div style={{fontFamily:"'Anton'",fontSize:13,letterSpacing:2}}>{selectedMsg.name}</div><div style={{fontSize:9,color:"#555"}}>{selectedMsg.city} · {timeAgo(selectedMsg.ts)}</div></div>
                      </div>
                      <div style={{fontSize:12,color:"#ccc",lineHeight:1.8,borderTop:"1px solid #1C1C24",paddingTop:10,marginBottom:10}}>{selectedMsg.message}</div>
                      <div style={{display:"flex",gap:6}}>
                        <button className={`ghost${selectedMsg.pinned?" on":""}`} onClick={()=>togglePin(selectedMsg.id)}>{selectedMsg.pinned?"📌 UNPIN":"📌 PIN"}</button>
                        <button className="red-ghost" onClick={()=>handleDeleteMsg(selectedMsg.id)}>🗑 DELETE</button>
                      </div>
                    </div>
                    <div className="card" style={{borderColor:"#FFD70022"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><span style={{fontSize:14}}>🤖</span><div style={{fontSize:10,color:"#FFD700",fontWeight:500,letterSpacing:1}}>AI REPLY WRITER</div></div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                        {TONES.map(t=><button key={t.id} className={`ghost${replyTone===t.id?" on":""}`} onClick={()=>setReplyTone(t.id)}>{t.label}</button>)}
                      </div>
                      <button className="gold-btn" style={{width:"100%",marginBottom:aiReply||aiLoading?10:0}} disabled={aiLoading} onClick={()=>generateReply(selectedMsg,replyTone)}>
                        {aiLoading?"✍️ WRITING...":"✨ GENERATE REPLY"}
                      </button>
                      {aiLoading&&<div className="loading-bar"/>}
                      {aiReply&&!aiLoading&&(
                        <div style={{animation:"fadein .4s ease"}}>
                          <div style={{background:"#080810",border:"1px solid #1C1C24",borderRadius:9,padding:12,fontSize:11,color:"#ccc",lineHeight:1.8,marginBottom:8}}>{aiReply}</div>
                          <div style={{display:"flex",gap:7}}>
                            <button className="gold-btn" style={{flex:1,animation:"none"}} onClick={()=>{navigator.clipboard?.writeText(aiReply).catch(()=>{});setCopiedReply(true);setTimeout(()=>setCopiedReply(false),1800);}}>
                              {copiedReply?"✓ COPIED!":"📋 COPY REPLY"}
                            </button>
                            <button className="ghost" onClick={()=>generateReply(selectedMsg,replyTone)}>↻</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {messages.length===0&&<div style={{textAlign:"center",color:"#333",padding:"28px 0",fontSize:11}}>No messages yet.</div>}
                    {messages.map(m=>(
                      <div key={m.id} onClick={()=>{setSelectedMsg(m);setAiReply("");setCopiedReply(false);}} style={{background:"#0C0C10",border:`1px solid ${m.pinned?"#FFD70033":"#1C1C24"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",display:"flex",gap:9,alignItems:"flex-start",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#2C2C38"} onMouseLeave={e=>e.currentTarget.style.borderColor=m.pinned?"#FFD70033":"#1C1C24"}>
                        <div style={{width:28,height:28,borderRadius:7,background:"#1C1C24",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{m.emoji}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10}}>{m.name} <span style={{fontSize:8,color:"#444"}}>{m.city}</span></span><span style={{fontSize:8,color:"#333"}}>{timeAgo(m.ts)}</span></div>
                          <div style={{fontSize:10,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.message}</div>
                        </div>
                        {m.pinned&&<span style={{fontSize:9,color:"#FFD700"}}>📌</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ ADMIN ══ */}
        {tab==="admin" && (
          <div style={{animation:"fadein .3s ease"}}>
            {!adminUnlocked?(
              <div style={{maxWidth:290,margin:"36px auto 0",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>⚙️</div>
                <div style={{fontFamily:"'Anton'",fontSize:17,letterSpacing:3,color:"#FFD700",marginBottom:2}}>ADMIN PANEL</div>
                <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:4}}>ALL CHANGES SAVE TO CLOUD</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:14}}><div className="sync-dot"/><span style={{fontSize:9,color:"#555"}}>Supabase connected</span></div>
                <input className="inp" type="password" placeholder="· · · · · · · ·" value={adminPass} style={{textAlign:"center",letterSpacing:4,fontSize:14,borderColor:adminPassErr?"#FF4444":undefined}} onChange={e=>{setAdminPass(e.target.value);setAdminPassErr(false);}} onKeyDown={e=>{if(e.key==="Enter"){checkPass(adminPass).then(ok=>{if(ok)setAdminUnlocked(true);else setAdminPassErr(true);})}}}/>
                {adminPassErr&&<div style={{fontSize:9,color:"#FF4444",marginTop:5,letterSpacing:1}}>WRONG PASSCODE</div>}
                <button className="gold-btn" style={{width:"100%",marginTop:10}} disabled={adminLocked} onClick={()=>{if(adminLocked)return;checkPass(adminPass).then(ok=>{if(ok){setAdminAttempts(0);setAdminUnlocked(true);}else{const a=adminAttempts+1;setAdminAttempts(a);if(a>=5){setAdminLocked(true);setTimeout(()=>{setAdminLocked(false);setAdminAttempts(0);},300000);}setAdminPassErr(true);}});}}>{adminLocked?"🔒 LOCKED 5 MIN":"ENTER ADMIN →"}</button>
                
              </div>
            ):(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:"'Anton'",fontSize:16,letterSpacing:2,color:"#FFD700"}}>ADMIN PANEL</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><div className="sync-dot"/><span style={{fontSize:8,color:"#555",letterSpacing:1}}>SAVING TO SUPABASE</span></div>
                  </div>
                  <button className="ghost" onClick={()=>{setAdminUnlocked(false);setAdminPass("");setEditingLink(null);setEditingDrop(null);setEditingTrack(null);setShowNewLink(false);setShowNewDrop(false);setShowNewTrack(false);}}>LOCK 🔒</button>
                </div>

                <div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
                  {[["music","🎵 Music"],["links","🔗 Links"],["drops","💿 Drops"],["settings","🎤 Artist"],["release","⏳ Release"],["ads","💰 Ads"]].map(([id,label])=>(
                    <button key={id} className={`admin-tab${adminSection===id?" on":""}`} onClick={()=>setAdminSection(id)}>{label}</button>
                  ))}
                </div>

                {/* MUSIC */}
                {adminSection==="music" && (
                  <div style={{animation:"fadein .25s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:9,color:"#555",letterSpacing:2}}>{tracks.length} TRACKS · {totalPlays} PLAYS</div>
                      <button className="gold-btn" style={{animation:"none",padding:"7px 13px",fontSize:9}} onClick={()=>setShowNewTrack(v=>!v)}>{showNewTrack?"✕ CANCEL":"+ ADD TRACK"}</button>
                    </div>
                    {showNewTrack&&(
                      <div className="card" style={{borderColor:"#FFD70033",marginBottom:12,animation:"fadein .2s ease"}}>
                        <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:10}}>NEW TRACK</div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TITLE *</div><input className="inp" placeholder="Off The No Go" value={newTrack.title} onChange={e=>setNewTrack(p=>({...p,title:e.target.value}))}/></div>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>GENRE</div><input className="inp" placeholder="Hip-Hop" value={newTrack.genre} onChange={e=>setNewTrack(p=>({...p,genre:e.target.value}))}/></div>
                          </div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>AUDIO URL</div><input className="inp" placeholder="https://drive.google.com/uc?export=download&id=..." value={newTrack.url} onChange={e=>setNewTrack(p=>({...p,url:e.target.value}))}/></div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>ARTIST</div><input className="inp" value={newTrack.artist} onChange={e=>setNewTrack(p=>({...p,artist:e.target.value}))}/></div>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DURATION (secs)</div><input className="inp" type="number" placeholder="180" value={newTrack.duration} onChange={e=>setNewTrack(p=>({...p,duration:+e.target.value}))}/></div>
                          </div>
                          <div>
                            <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>COVER EMOJI</div>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              {COVER_EMOJIS.map(e=><button key={e} onClick={()=>setNewTrack(p=>({...p,coverEmoji:e}))} style={{width:32,height:32,borderRadius:7,border:`1px solid ${newTrack.coverEmoji===e?"#FFD700":"#1C1C24"}`,background:newTrack.coverEmoji===e?"#FFD70015":"#0A0A0C",cursor:"pointer",fontSize:14}}>{e}</button>)}
                            </div>
                          </div>
                          <button className="gold-btn" style={{animation:"none"}} disabled={!newTrack.title.trim()} onClick={addTrack}>☁️ ADD & SAVE TO CLOUD</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {tracks.map(track=>(
                        <div key={track.id}>
                          {editingTrack?.id===track.id?(
                            <div className="card" style={{borderColor:"#FFD70033",animation:"fadein .2s ease"}}>
                              <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:10}}>EDITING: {track.title}</div>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TITLE</div><input className="inp" value={editingTrack.title} onChange={e=>setEditingTrack(p=>({...p,title:e.target.value}))}/></div>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>GENRE</div><input className="inp" value={editingTrack.genre} onChange={e=>setEditingTrack(p=>({...p,genre:e.target.value}))}/></div>
                                </div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>AUDIO URL</div><input className="inp" placeholder="https://..." value={editingTrack.url} onChange={e=>setEditingTrack(p=>({...p,url:e.target.value}))}/></div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>ARTIST</div><input className="inp" value={editingTrack.artist} onChange={e=>setEditingTrack(p=>({...p,artist:e.target.value}))}/></div>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DURATION (secs)</div><input className="inp" type="number" value={editingTrack.duration} onChange={e=>setEditingTrack(p=>({...p,duration:+e.target.value}))}/></div>
                                </div>
                                <div>
                                  <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>COVER EMOJI</div>
                                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                    {COVER_EMOJIS.map(e=><button key={e} onClick={()=>setEditingTrack(p=>({...p,coverEmoji:e}))} style={{width:30,height:30,borderRadius:6,border:`1px solid ${editingTrack.coverEmoji===e?"#FFD700":"#1C1C24"}`,background:editingTrack.coverEmoji===e?"#FFD70015":"#0A0A0C",cursor:"pointer",fontSize:13}}>{e}</button>)}
                                  </div>
                                </div>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                  <span style={{fontSize:9,color:"#555",letterSpacing:2}}>SHOW IN PLAYER</span>
                                  <Toggle on={editingTrack.active} onChange={()=>setEditingTrack(p=>({...p,active:!p.active}))}/>
                                </div>
                                <div style={{display:"flex",gap:7}}>
                                  <button className="gold-btn" style={{flex:1,animation:"none"}} onClick={()=>saveTrack(editingTrack)}>☁️ SAVE TO CLOUD</button>
                                  <button className="ghost" onClick={()=>setEditingTrack(null)}>CANCEL</button>
                                </div>
                              </div>
                            </div>
                          ):(
                            <div style={{background:"#0A0A0C",border:`1px solid ${currentTrack?.id===track.id?"#FFD70033":"#1C1C24"}`,borderRadius:11,padding:"11px 13px",display:"flex",gap:10,alignItems:"center"}}>
                              <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#1C1C24,#141420)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{track.coverEmoji}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,color:track.active?"#ccc":"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{track.title}</div>
                                <div style={{fontSize:9,color:"#444"}}>{track.genre} · {fmtTime(track.duration)} · {track.plays||0} plays · {track.url?"🔊":"🔇 demo"}</div>
                              </div>
                              <Toggle on={track.active} onChange={()=>toggleTrackActive(track.id)}/>
                              <button className="ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>setEditingTrack({...track})}>✏️</button>
                              <button className="red-ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>deleteTrack(track.id)}>🗑</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LINKS */}
                {adminSection==="links" && (
                  <div style={{animation:"fadein .25s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:9,color:"#555",letterSpacing:2}}>{links.length} LINKS</div>
                      <button className="gold-btn" style={{animation:"none",padding:"7px 13px",fontSize:9}} onClick={()=>setShowNewLink(v=>!v)}>{showNewLink?"✕ CANCEL":"+ ADD LINK"}</button>
                    </div>
                    {showNewLink&&(
                      <div className="card" style={{borderColor:"#FFD70033",marginBottom:12,animation:"fadein .2s ease"}}>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>LABEL</div><input className="inp" placeholder="🎧 Stream on Spotify" value={newLink.label} onChange={e=>setNewLink(p=>({...p,label:e.target.value}))}/></div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>URL</div><input className="inp" placeholder="https://..." value={newLink.url} onChange={e=>setNewLink(p=>({...p,url:e.target.value}))}/></div>
                          <div>
                            <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>COLOR</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              {LINK_COLORS.map(c=><div key={c} className={`color-dot${newLink.color===c?" on":""}`} style={{background:c}} onClick={()=>setNewLink(p=>({...p,color:c}))}/>)}
                            </div>
                          </div>
                          <button className="gold-btn" style={{animation:"none"}} disabled={!newLink.label.trim()||!newLink.url.trim()} onClick={addLink}>☁️ ADD & SAVE</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {links.map(link=>(
                        <div key={link.id}>
                          {editingLink?.id===link.id?(
                            <div className="card" style={{borderColor:"#FFD70033",animation:"fadein .2s ease"}}>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>LABEL</div><input className="inp" value={editingLink.label} onChange={e=>setEditingLink(p=>({...p,label:e.target.value}))}/></div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>URL</div><input className="inp" value={editingLink.url} onChange={e=>setEditingLink(p=>({...p,url:e.target.value}))}/></div>
                                <div>
                                  <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>COLOR</div>
                                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                    {LINK_COLORS.map(c=><div key={c} className={`color-dot${editingLink.color===c?" on":""}`} style={{background:c}} onClick={()=>setEditingLink(p=>({...p,color:c}))}/>)}
                                  </div>
                                </div>
                                <div style={{display:"flex",gap:7}}>
                                  <button className="gold-btn" style={{flex:1,animation:"none"}} onClick={()=>saveLink(editingLink)}>☁️ SAVE</button>
                                  <button className="ghost" onClick={()=>setEditingLink(null)}>CANCEL</button>
                                </div>
                              </div>
                            </div>
                          ):(
                            <div className="link-row">
                              <div style={{width:11,height:11,borderRadius:"50%",background:link.color,flexShrink:0}}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,color:link.active?"#ccc":"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link.label}</div>
                                <div style={{fontSize:9,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link.url}</div>
                              </div>
                              <Toggle on={link.active} onChange={()=>toggleLink(link.id)}/>
                              <button className="ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>setEditingLink({...link})}>✏️</button>
                              <button className="red-ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>deleteLink(link.id)}>🗑</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DROPS */}
                {adminSection==="drops" && (
                  <div style={{animation:"fadein .25s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:9,color:"#555",letterSpacing:2}}>{drops.length} DROPS</div>
                      <button className="gold-btn" style={{animation:"none",padding:"7px 13px",fontSize:9}} onClick={()=>setShowNewDrop(v=>!v)}>{showNewDrop?"✕ CANCEL":"+ ADD DROP"}</button>
                    </div>
                    {showNewDrop&&(
                      <div className="card" style={{borderColor:"#FFD70033",marginBottom:12,animation:"fadein .2s ease"}}>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TITLE *</div><input className="inp" placeholder="No Excuses" value={newDrop.title} onChange={e=>setNewDrop(p=>({...p,title:e.target.value}))}/></div>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TYPE</div><select className="inp" value={newDrop.type} onChange={e=>setNewDrop(p=>({...p,type:e.target.value}))}>{DROP_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                          </div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>STREAM URL</div><input className="inp" placeholder="https://open.spotify.com/..." value={newDrop.streamUrl} onChange={e=>setNewDrop(p=>({...p,streamUrl:e.target.value}))}/></div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DESCRIPTION</div><textarea className="inp" style={{height:56}} value={newDrop.description} onChange={e=>setNewDrop(p=>({...p,description:e.target.value}))}/></div>
                          <div>
                            <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>COVER EMOJI</div>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                              {COVER_EMOJIS.map(e=><button key={e} onClick={()=>setNewDrop(p=>({...p,coverEmoji:e}))} style={{width:30,height:30,borderRadius:6,border:`1px solid ${newDrop.coverEmoji===e?"#FFD700":"#1C1C24"}`,background:newDrop.coverEmoji===e?"#FFD70015":"#0A0A0C",cursor:"pointer",fontSize:13}}>{e}</button>)}
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>STATUS</div>
                            <div style={{display:"flex",gap:5}}>
                              {[["upcoming","UPCOMING","#FFD700"],["soon","COMING SOON","#784FFF"],["out","OUT NOW","#1DB954"]].map(([v,l,c])=>(
                                <button key={v} onClick={()=>setNewDrop(p=>({...p,status:v}))} style={{flex:1,background:newDrop.status===v?`${c}22`:"none",border:`1px solid ${newDrop.status===v?c:"#1C1C24"}`,color:newDrop.status===v?c:"#555",borderRadius:7,padding:"6px 0",fontFamily:"'DM Mono'",fontSize:8,cursor:"pointer"}}>{l}</button>
                              ))}
                            </div>
                          </div>
                          <button className="gold-btn" style={{animation:"none"}} disabled={!newDrop.title.trim()} onClick={addDrop}>☁️ ADD & SAVE</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {drops.map(drop=>(
                        <div key={drop.id}>
                          {editingDrop?.id===drop.id?(
                            <div className="card" style={{borderColor:"#FFD70033",animation:"fadein .2s ease"}}>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TITLE</div><input className="inp" value={editingDrop.title} onChange={e=>setEditingDrop(p=>({...p,title:e.target.value}))}/></div>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TYPE</div><select className="inp" value={editingDrop.type} onChange={e=>setEditingDrop(p=>({...p,type:e.target.value}))}>{DROP_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                                </div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>STREAM URL</div><input className="inp" value={editingDrop.streamUrl} onChange={e=>setEditingDrop(p=>({...p,streamUrl:e.target.value}))}/></div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DESCRIPTION</div><textarea className="inp" style={{height:56}} value={editingDrop.description} onChange={e=>setEditingDrop(p=>({...p,description:e.target.value}))}/></div>
                                <div>
                                  <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:6}}>STATUS</div>
                                  <div style={{display:"flex",gap:5}}>
                                    {[["upcoming","UPCOMING","#FFD700"],["soon","COMING SOON","#784FFF"],["out","OUT NOW","#1DB954"]].map(([v,l,c])=>(
                                      <button key={v} onClick={()=>setEditingDrop(p=>({...p,status:v}))} style={{flex:1,background:editingDrop.status===v?`${c}22`:"none",border:`1px solid ${editingDrop.status===v?c:"#1C1C24"}`,color:editingDrop.status===v?c:"#555",borderRadius:7,padding:"6px 0",fontFamily:"'DM Mono'",fontSize:8,cursor:"pointer"}}>{l}</button>
                                    ))}
                                  </div>
                                </div>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                  <span style={{fontSize:9,color:"#555",letterSpacing:2}}>SHOW ON HUB</span>
                                  <Toggle on={editingDrop.active} onChange={()=>setEditingDrop(p=>({...p,active:!p.active}))}/>
                                </div>
                                <div style={{display:"flex",gap:7}}>
                                  <button className="gold-btn" style={{flex:1,animation:"none"}} onClick={()=>saveDrop(editingDrop)}>☁️ SAVE</button>
                                  <button className="ghost" onClick={()=>setEditingDrop(null)}>CANCEL</button>
                                </div>
                              </div>
                            </div>
                          ):(
                            <div style={{background:"#0A0A0C",border:"1px solid #1C1C24",borderRadius:11,padding:"11px 13px",display:"flex",gap:10,alignItems:"center"}}>
                              <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#1C1C24,#141420)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{drop.coverEmoji}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,color:drop.active?"#ccc":"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{drop.title}</div>
                                <div style={{fontSize:9,color:"#555"}}>{drop.type} · <span style={{color:drop.status==="out"?"#1DB954":drop.status==="upcoming"?"#FFD700":"#784FFF"}}>{drop.status==="out"?"OUT NOW":drop.status==="upcoming"?"UPCOMING":"COMING SOON"}</span></div>
                              </div>
                              <Toggle on={drop.active} onChange={()=>toggleDrop(drop.id)}/>
                              <button className="ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>setEditingDrop({...drop})}>✏️</button>
                              <button className="red-ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>deleteDrop(drop.id)}>🗑</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ARTIST INFO */}
                {adminSection==="settings" && (
                  <div style={{animation:"fadein .25s ease"}}>
                    <div className="card" style={{borderColor:"#FFD70022"}}>
                      <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:12}}>ARTIST PROFILE</div>
                      <div style={{display:"flex",flexDirection:"column",gap:9}}>
                        <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>ARTIST NAME</div><input className="inp" value={settings.artistName} onChange={e=>setSettings(p=>({...p,artistName:e.target.value}))}/></div>
                        <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>BIO / TAGLINE</div><textarea className="inp" value={settings.artistBio} onChange={e=>setSettings(p=>({...p,artistBio:e.target.value}))}/></div>
                        <button className="gold-btn" style={{animation:"none"}} onClick={()=>saveSettingsToDb(settings)}>☁️ SAVE TO CLOUD</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* RELEASE */}
                {adminSection==="release" && (
                  <div style={{animation:"fadein .25s ease"}}>
                    <div className="card" style={{borderColor:"#FFD70022"}}>
                      <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:12}}>RELEASE COUNTDOWN</div>
                      <div style={{display:"flex",flexDirection:"column",gap:9}}>
                        <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>RELEASE NAME</div><input className="inp" value={settings.releaseName} onChange={e=>setSettings(p=>({...p,releaseName:e.target.value}))}/></div>
                        <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DROP DATE & TIME</div><input className="inp" type="datetime-local" value={settings.releaseDate} onChange={e=>setSettings(p=>({...p,releaseDate:e.target.value}))}/></div>
                        <button className="gold-btn" style={{animation:"none"}} onClick={()=>saveSettingsToDb(settings)}>☁️ SAVE TO CLOUD</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ADS ADMIN ── */}
                {adminSection==="ads" && (
                  <div style={{animation:"fadein .25s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:9,color:"#555",letterSpacing:2}}>{ads.length} ADS</div>
                      <button className="gold-btn" style={{animation:"none",padding:"7px 13px",fontSize:9}} onClick={()=>setShowNewAd(v=>!v)}>{showNewAd?"✕ CANCEL":"+ ADD AD"}</button>
                    </div>
                    <div className="card" style={{borderColor:"#FFD70022",marginBottom:14}}>
                      <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:6}}>💰 HOW TO SELL ADS</div>
                      <div style={{fontSize:10,color:"#666",lineHeight:1.7}}>Charge businesses $50–$200/month to advertise on your hub. Add their banner image, link and CTA button below. Toggle off when the campaign ends.</div>
                    </div>
                    {showNewAd && (
                      <div className="card" style={{borderColor:"#FFD70033",marginBottom:12,animation:"fadein .2s ease"}}>
                        <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:10}}>NEW AD</div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>ADVERTISER NAME</div><input className="inp" placeholder="Nike, Local Business..." value={newAd.title} onChange={e=>setNewAd(p=>({...p,title:e.target.value}))}/></div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TAGLINE</div><input className="inp" placeholder="Just Do It." value={newAd.subtitle} onChange={e=>setNewAd(p=>({...p,subtitle:e.target.value}))}/></div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>BANNER IMAGE URL</div><input className="inp" placeholder="https://... jpg/png link" value={newAd.imageUrl} onChange={e=>setNewAd(p=>({...p,imageUrl:e.target.value}))}/></div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DESTINATION URL</div><input className="inp" placeholder="https://advertiser-website.com" value={newAd.linkUrl} onChange={e=>setNewAd(p=>({...p,linkUrl:e.target.value}))}/></div>
                          <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>CTA BUTTON TEXT</div><input className="inp" placeholder="SHOP NOW / LEARN MORE" value={newAd.cta} onChange={e=>setNewAd(p=>({...p,cta:e.target.value}))}/></div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>BG COLOR</div><input className="inp" type="color" value={newAd.bgColor} onChange={e=>setNewAd(p=>({...p,bgColor:e.target.value}))} style={{height:40,cursor:"pointer",padding:4}}/></div>
                            <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TEXT COLOR</div><input className="inp" type="color" value={newAd.textColor} onChange={e=>setNewAd(p=>({...p,textColor:e.target.value}))} style={{height:40,cursor:"pointer",padding:4}}/></div>
                          </div>
                          <div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>PREVIEW</div>
                          <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #2C2C38",background:newAd.bgColor}}>
                            {newAd.imageUrl&&<div style={{height:70,background:`url(${newAd.imageUrl}) center/cover`}}/>}
                            <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                              <div><div style={{fontFamily:"'Anton',sans-serif",fontSize:14,letterSpacing:2,color:newAd.textColor}}>{newAd.title||"Ad Title"}</div><div style={{fontSize:9,color:newAd.textColor,opacity:.7}}>{newAd.subtitle||"Tagline"}</div></div>
                              <div style={{background:newAd.textColor,color:newAd.bgColor,borderRadius:7,padding:"5px 10px",fontFamily:"'DM Mono',monospace",fontSize:8,fontWeight:500,letterSpacing:1}}>{newAd.cta||"LEARN MORE"}</div>
                            </div>
                          </div>
                          <button className="gold-btn" style={{animation:"none"}} disabled={!newAd.title.trim()} onClick={addAd}>☁️ ADD & SAVE AD</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {ads.length===0&&<div style={{textAlign:"center",color:"#333",padding:"20px 0",fontSize:11}}>No ads yet — add your first advertiser above.</div>}
                      {ads.map(ad=>(
                        <div key={ad.id}>
                          {editingAd?.id===ad.id?(
                            <div className="card" style={{borderColor:"#FFD70033",animation:"fadein .2s ease"}}>
                              <div style={{fontSize:9,color:"#FFD700",letterSpacing:2,marginBottom:10}}>EDITING AD</div>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>ADVERTISER NAME</div><input className="inp" value={editingAd.title} onChange={e=>setEditingAd(p=>({...p,title:e.target.value}))}/></div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TAGLINE</div><input className="inp" value={editingAd.subtitle} onChange={e=>setEditingAd(p=>({...p,subtitle:e.target.value}))}/></div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>BANNER IMAGE URL</div><input className="inp" value={editingAd.imageUrl} onChange={e=>setEditingAd(p=>({...p,imageUrl:e.target.value}))}/></div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>DESTINATION URL</div><input className="inp" value={editingAd.linkUrl} onChange={e=>setEditingAd(p=>({...p,linkUrl:e.target.value}))}/></div>
                                <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>CTA TEXT</div><input className="inp" value={editingAd.cta} onChange={e=>setEditingAd(p=>({...p,cta:e.target.value}))}/></div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>BG COLOR</div><input className="inp" type="color" value={editingAd.bgColor} onChange={e=>setEditingAd(p=>({...p,bgColor:e.target.value}))} style={{height:40,cursor:"pointer",padding:4}}/></div>
                                  <div><div style={{fontSize:8,color:"#555",letterSpacing:2,marginBottom:4}}>TEXT COLOR</div><input className="inp" type="color" value={editingAd.textColor} onChange={e=>setEditingAd(p=>({...p,textColor:e.target.value}))} style={{height:40,cursor:"pointer",padding:4}}/></div>
                                </div>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                  <span style={{fontSize:9,color:"#555",letterSpacing:2}}>ACTIVE</span>
                                  <Toggle on={editingAd.active} onChange={()=>setEditingAd(p=>({...p,active:!p.active}))}/>
                                </div>
                                <div style={{display:"flex",gap:7}}>
                                  <button className="gold-btn" style={{flex:1,animation:"none"}} onClick={()=>saveAd(editingAd)}>☁️ SAVE</button>
                                  <button className="ghost" onClick={()=>setEditingAd(null)}>CANCEL</button>
                                </div>
                              </div>
                            </div>
                          ):(
                            <div style={{background:"#0A0A0C",border:`1px solid ${ad.active?"#FFD70022":"#1C1C24"}`,borderRadius:11,padding:"11px 13px",display:"flex",gap:10,alignItems:"center"}}>
                              <div style={{width:36,height:36,borderRadius:9,background:ad.bgColor||"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📢</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,color:ad.active?"#ccc":"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.title}</div>
                                <div style={{fontSize:9,color:"#555"}}>{ad.active?"🟢 LIVE":"⚫ OFF"} · {ad.linkUrl||"No link"}</div>
                              </div>
                              <Toggle on={ad.active} onChange={()=>toggleAd(ad.id)}/>
                              <button className="ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>setEditingAd({...ad})}>✏️</button>
                              <button className="red-ghost" style={{padding:"5px 9px",flexShrink:0}} onClick={()=>deleteAd(ad.id)}>🗑</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ AD BANNER BOTTOM ══ */}
      {ads.filter(a=>a.active).length > 0 && (
        <div style={{padding:"0 16px 28px",maxWidth:520,margin:"0 auto"}}>
          <div style={{fontSize:8,color:"#2C2C2C",letterSpacing:2,textAlign:"center",marginBottom:8}}>SPONSORED</div>
          {ads.filter(a=>a.active).map(ad=>(
            <a key={ad.id} href={ad.linkUrl||"#"} target="_blank" rel="noreferrer"
              style={{display:"block",textDecoration:"none",borderRadius:14,overflow:"hidden",border:"1px solid #1C1C24",background:ad.bgColor||"#111118",marginBottom:10,transition:"transform .2s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              {ad.imageUrl&&<img src={ad.imageUrl} alt={ad.title} style={{width:"100%",height:130,objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>}
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Anton',sans-serif",fontSize:17,letterSpacing:2,color:ad.textColor||"#FFD700",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.title}</div>
                  {ad.subtitle&&<div style={{fontSize:10,color:ad.textColor||"#FFD700",opacity:.7,marginTop:2}}>{ad.subtitle}</div>}
                </div>
                <div style={{background:ad.textColor||"#FFD700",color:ad.bgColor||"#000",borderRadius:8,padding:"8px 14px",fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:500,letterSpacing:1.5,flexShrink:0,whiteSpace:"nowrap"}}>{ad.cta||"LEARN MORE"}</div>
              </div>
            </a>
          ))}
        </div>
      )}

    </div>
  );
}
