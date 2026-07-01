import { useState, useEffect } from "react";

const SB_URL = "https://qmgjtnvvymoicboyidmg.supabase.co/rest/v1/signals";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtZ2p0bnZ2eW1vaWNib3lpZG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NzEzMjksImV4cCI6MjA5ODQ0NzMyOX0.phMAaQN8GeC3BAP8n7zzdyvU07Tz0Nj7CoTFEPsADFI";

export default function App() {
  const [status, setStatus] = useState("probando...");

  useEffect(() => {
    fetch(`${SB_URL}?select=*&limit=5`, {
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
      }
    })
    .then(r => r.json())
    .then(d => setStatus(JSON.stringify(d)))
    .catch(e => setStatus("ERROR: " + e.message));
  }, []);

  return <div style={{color:"white",padding:"20px",backgroundColor:"#0A0D12",minHeight:"100vh"}}>{status}</div>;
}
