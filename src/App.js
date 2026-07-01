import { useState, useEffect, useRef, useCallback } from "react";

const SB_URL = "https://qmgjtnvvymoicboyidmg.supabase.co/rest/v1/signals";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZ2p0bnZ2eW1vaWNib3lpZG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NzEzMjksImV4cCI6MjA5ODQ0NzMyOX0.phMAaQN8GeC3BAP8n7zzdyvU07Tz0Nj7CoTFEPsADFI";
const POLL_MS   = 15000;
const RECENT_MS = 15 * 60 * 1000;

const BOTS = [
  { id: "boom500",  name: "Boom 500" },
  { id: "crash500", name: "Crash 500" },
  { id: "crash600", name: "Crash 600" },
  { id: "boom1000", name: "Boom 1000" },
  { id: "v10",      name: "Volatility 10 Pro" },
];

function seedRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function makeSpikePath(seed, boom) {
  const rnd = seedRandom(seed); const pts = []; const n = 24; let y = 20;
  for (let i = 0; i < n; i++) {
    if (i === Math.floor(n * 0.62)) { y = boom ? 3 : 37; }
    else { y += (rnd() - 0.5) * 5; y = Math.max(4, Math.min(36, y)); y += (20 - y) * 0.12; }
    pts.push(`${(i / (n - 1)) * 100},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}
function accentOf(dir) { return dir === "BUY" ? "#84CC16" : "#E5484D"; }
function timeAgo(ts, now) {
  const s = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 1000));
  if (s < 60) return `hace ${s}s`;
  return `hace ${Math.floor(s / 60)}m`;
}
function formatTime(ms) {
  return new Date(ms).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function fetchSignals() {
  const url = `${SB_URL}?select=*&order=created_at.desc&limit=30&apikey=${SB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const since = Date.now() - RECENT_MS;
  return data.filter(s => new Date(s.created_at).getTime() > since);
}

function SignalCard({ sig, now, isNew }) {
  const isBuy  = sig.direction === "BUY";
  const accent = accentOf(sig.direction);
  const spike  = makeSpikePath((sig.id || 1) * 7 + 3, isBuy);
  return (
    <div style={{
      position:"relative", display:"flex", gap:"16px", borderRadius:"6px",
      padding:"16px", backgroundColor:"#141A22", border:"1px solid #232B36",
      animation: isNew ? "slideIn 0.5s ease-out" : "none",
    }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"3px",
                    borderRadius:"6px 0 0 6px", backgroundColor:accent }} />
      <div style={{ width:"56px", flexShrink:0, display:"flex", alignItems:"center" }}>
        <svg viewBox="0 0 100 40" style={{ width:"100%", height:"40px" }} preserveAspectRatio="none">
          <polyline points={spike} fill="none" stroke={accent} strokeWidth="1.6"
            strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px" }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600,
                         fontSize:"15px", color:"#EDEFF2", overflow:"hidden",
                         textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {sig.bot}
          </span>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600,
                         fontSize:"13px", color:accent, letterSpacing:"0.05em", flexShrink:0 }}>
            {isBuy ? "COMPRA ▲" : "VENTA ▼"}
          </span>
        </div>
        <div style={{ display:"flex", gap:"20px", marginTop:"8px",
                      fontFamily:"'JetBrains Mono',monospace", fontSize:"13px", color:"#C7CCD3" }}>
          <span><span style={{ color:"#7C8798" }}>entrada </span>{Number(sig.entry).toFixed(2)}</span>
          <span><span style={{ color:"#7C8798" }}>SL </span>{Number(sig.sl).toFixed(2)}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"8px" }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:"12px", color:"#7C8798" }}>
            {sig.note || "—"}
          </span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px",
                         color:"#4A5563", flexShrink:0, marginLeft:"12px" }}>
            {timeAgo(sig.created_at, now)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [signals,     setSignals]     = useState([]);
  const [newestId,    setNewestId]    = useState(null);
  const [filter,      setFilter]      = useState("ALL");
  const [now,         setNow]         = useState(Date.now());
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const prevIds = useRef(new Set());

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await fetchSignals();
      setSignals(data);
      setError(null);
      setLastRefresh(Date.now());
      const newOnes = data.filter(s => !prevIds.current.has(s.id));
      if (newOnes.length > 0 && prevIds.current.size > 0) {
        setNewestId(newOnes[0].id);
        setTimeout(() => setNewestId(null), 800);
      }
      prevIds.current = new Set(data.map(s => s.id));
    } catch (e) {
      setError("No se pudo conectar: " + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => load(), POLL_MS); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const filtered  = signals.filter(s => filter === "ALL" ? true : s.bot === BOTS.find(b => b.id === filter)?.name);
  const buyCount  = signals.filter(s => s.direction === "BUY").length;
  const sellCount = signals.filter(s => s.direction === "SELL").length;
  const liveColor = error ? "#E5484D" : "#84CC16";

  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#0A0D12", fontFamily:"'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap')
