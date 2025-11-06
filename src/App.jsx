import React, { useEffect, useMemo, useRef, useState } from "react";

// MatchUp — Web App (local-first) with public RSVP link (?mode=rsvp)
export default function App() {
  // URL mode
  const [urlMode, setUrlMode] = useState(() => new URLSearchParams(window.location.search).get("mode") || "");
  useEffect(() => {
    const handler = () => setUrlMode(new URLSearchParams(window.location.search).get("mode") || "");
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Utils
  const toLocalInputValue = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const parseLocalDateTime = (str) => {
    if (!str) return new Date();
    const [d, t] = String(str).split("T");
    if (!d || !t) return new Date(str);
    const [y, m, day] = d.split("-").map(Number);
    const [hh, mm] = t.split(":").map(Number);
    return new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, 0, 0);
  };
  const uidRef = useRef(() => {
    const prev = localStorage.getItem("mu_uid");
    if (prev) return prev;
    const id = `u_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("mu_uid", id);
    return id;
  });
  const uid = uidRef.current();

  // Event state
  const [title, setTitle] = useState("Sobota 5v5");
  const [kickoffISO, setKickoffISO] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(17, 0, 0, 0); return toLocalInputValue(d);
  });
  const [capacity, setCapacity] = useState(10);
  const [benchCapacity, setBenchCapacity] = useState(6);
  const [cutoffHours, setCutoffHours] = useState(6);
  const [creatorId, setCreatorId] = useState(null);
  const [creatorName, setCreatorName] = useState("Ty");
  const isAdmin = useMemo(() => creatorId === uid || creatorId === null, [creatorId, uid]);

  // Participants
  const [meName, setMeName] = useState(localStorage.getItem("mu_name") || "Ty");
  useEffect(() => { localStorage.setItem("mu_name", meName); }, [meName]);

  const [attendees, setAttendees] = useState([]);
  const [bench, setBench] = useState([]);
  const [maybe, setMaybe] = useState([]);
  const [out, setOut] = useState([]);

  // Persist
  useEffect(() => {
    const save = { title, kickoffISO, capacity, benchCapacity, cutoffHours, creatorId, creatorName, attendees, bench, maybe, out };
    localStorage.setItem("mu_event", JSON.stringify(save));
  }, [title, kickoffISO, capacity, benchCapacity, cutoffHours, creatorId, creatorName, attendees, bench, maybe, out]);
  useEffect(() => {
    const raw = localStorage.getItem("mu_event"); if (!raw) return; try {
      const s = JSON.parse(raw);
      setTitle(s.title || title); setKickoffISO(s.kickoffISO || kickoffISO);
      setCapacity(s.capacity || capacity); setBenchCapacity(s.benchCapacity || benchCapacity);
      setCutoffHours(s.cutoffHours ?? cutoffHours); setCreatorId(s.creatorId ?? creatorId); setCreatorName(s.creatorName || creatorName);
      setAttendees(s.attendees || []); setBench(s.bench || []); setMaybe(s.maybe || []); setOut(s.out || []);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teams
  const palette = ["#3B82F6", "#EF4444", "#F59E0B"];
  const [teamCount, setTeamCount] = useState(2);
  const [teamColors, setTeamColors] = useState([palette[0], palette[1]]);
  const [teamMembers, setTeamMembers] = useState([[], []]);
  function ensureTeamsSize(count) {
    setTeamMembers(prev => Array.from({ length: count }, (_, i) => (prev[i] || []).filter(p => attendees.find(a => a.id === p.id))));
    setTeamColors(prev => Array.from({ length: count }, (_, i) => prev[i] || palette[i % palette.length]));
    setTeamCount(count);
  }
  const inTeam = (id) => teamMembers.findIndex(team => team.some(p => p.id === id));
  const assignToTeam = (idx, p) => setTeamMembers(prev => { const copy = Array.from({ length: Math.max(prev.length, idx + 1) }, (_, i) => prev[i] ? prev[i].filter(x => x.id !== p.id) : []); copy[idx] = [...(copy[idx] || []), p]; return copy; });
  const removeFromAllTeams = (id) => setTeamMembers(prev => prev.map(team => team.filter(p => p.id !== id)));
  const autoFillTeams = () => {
    const unassigned = attendees.filter(p => inTeam(p.id) === -1);
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    setTeamMembers(prev => { const copy = Array.from({ length: teamCount }, (_, i) => [...(prev[i] || [])]); let idx = 0; for (const p of shuffled) { copy[idx].push(p); idx = (idx + 1) % teamCount; } return copy; });
  };

  // Chat
  const [msgs, setMsgs] = useState([{ sender: "bot", text: "MatchUp Web — gotowe. Ustaw mecz i zaproś graczy!" }]);
  const bot = (t) => setMsgs(m => [...m, { sender: "bot", text: t }]);
  const you = (t) => setMsgs(m => [...m, { sender: "you", text: t }]);

  const fmt = (dtStr) => parseLocalDateTime(dtStr).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
  const removeEverywhere = (id) => { setAttendees(a => a.filter(p => p.id !== id)); setBench(b => b.filter(p => p.id !== id)); setMaybe(c => c.filter(p => p.id !== id)); setOut(o => o.filter(p => p.id !== id)); };
  const rosterSummary = () => { const label = (p) => `${p.name}${p.channel && p.channel !== "web" ? ` (${p.channel})` : ""}`; const s = (arr) => arr.length ? arr.map(p => ` • ${label(p)}`).join("\n") : " • —"; const sb = (arr) => arr.length ? arr.map((p, i) => ` ${i + 1}. ${label(p)}`).join("\n") : " • —"; bot(`🏷️ ${title}\n⏱️ ${fmt(kickoffISO)}\n\n✅ Grają (${attendees.length}/${capacity})\n${s(attendees)}\n\n🪑 Rezerwa (${bench.length}/${benchCapacity})\n${sb(bench)}\n\n🤔 Może (${maybe.length})\n${s(maybe)}\n\n❌ Nie (${out.length})\n\nLimit rezygnacji: ${cutoffHours} h.`); };

  const currentMe = useMemo(() => ({ id: uid, name: meName, channel: "web", ts: Date.now() }), [uid, meName]);
  const announce = () => { if (!creatorId) setCreatorId(uid); if (!creatorName) setCreatorName(meName || "Ty"); bot(`🏷️ ${title}\n⏱️ ${fmt(kickoffISO)}\nMiejsca: ${capacity}, Rezerwa: ${benchCapacity}\n👑 Organizator: ${meName || "Ty"}`); bot("Grasz?"); };
  const yes = (actor = currentMe) => { you("✅ Tak"); removeEverywhere(actor.id); setAttendees(prev => { if (prev.length < capacity) return [...prev, actor]; let benchPos = null; setBench(b => { if (b.length < benchCapacity && !b.find(p => p.id === actor.id)) { benchPos = b.length + 1; return [...b, actor]; } return b; }); if (benchPos === null) bot("Sorry, lista i rezerwa są pełne."); else bot(`Lista pełna. Jesteś na rezerwie (#${benchPos}).`); return prev; }); };
  const maybeAct = (actor = currentMe) => { you("🤔 Może"); removeEverywhere(actor.id); setMaybe(m => [...m, actor]); };
  const no = (actor = currentMe) => { you("❌ Nie"); let wasIn = false; setAttendees(prev => { if (prev.find(p => p.id === actor.id)) wasIn = true; return prev.filter(p => p.id !== actor.id); }); removeEverywhere(actor.id); setOut(o => [...o, actor]); const hrs = (parseLocalDateTime(kickoffISO).getTime() - Date.now()) / 36e5; if (wasIn) { if (hrs >= cutoffHours) { setBench(prev => { if (prev.length > 0) { const [promoted, ...rest] = prev; setAttendees(a => [...a, promoted]); bot(`📣 ${promoted.name} awansował z rezerwy do GRAJĄ!`); return rest; } bot("Rezerwa pusta."); return prev; }); } else { bot(`Za późno — bez autoawansu (limit ${cutoffHours} h).`); } } else { bot("Oznaczono jako NIE."); } };
  const resignFrom = (kind, player) => { const isSelf = player.id === uid; if (!isSelf && !isAdmin) { bot("Nie możesz wypisać innej osoby."); return; } removeEverywhere(player.id); if (kind === "IN") { setOut(o => [...o, player]); const hrs = (parseLocalDateTime(kickoffISO).getTime() - Date.now()) / 36e5; if (hrs >= cutoffHours) { setBench(prev => { if (prev.length > 0) { const [promoted, ...rest] = prev; setAttendees(a => [...a, promoted]); bot(`📣 ${promoted.name} awansował z rezerwy do GRAJĄ!`); return rest; } return prev; }); } else { bot(`Za późno — bez autoawansu (limit ${cutoffHours} h).`); } } else { bot(isSelf ? "Wypisano z rezerwy." : "Usunięto z rezerwy."); } setListModal(s => ({ ...s, open: false })); };

  // Manual add
  const [manualName, setManualName] = useState("");
  const addManual = () => { const name = manualName.trim(); if (!name) { bot("Podaj imię i nazwisko."); return; } const exists = [...attendees, ...bench, ...maybe, ...out].some(p => p.name.toLowerCase() === name.toLowerCase()); if (exists) { bot("Ta osoba już jest na liście."); return; } const p = { id: `m_${Math.random().toString(36).slice(2, 10)}`, name, channel: "manual", ts: Date.now() }; if (attendees.length < capacity) { setAttendees(a => [...a, p]); bot(`Dodano do GRAJĄ: ${name} (manual)`); } else if (bench.length < benchCapacity) { setBench(b => [...b, p]); bot(`Dodano na REZERWĘ: ${name} (manual)`); } else { bot("Brak miejsc oraz rezerwy."); } setManualName(""); };

  // Public RSVP page
  if (urlMode === "rsvp") {
    return <PublicRSVP title={title} kickoffISO={kickoffISO} capacity={capacity} benchCapacity={benchCapacity} attendees={attendees} bench={bench} maybe={maybe} out={out} onSubmit={(decision, name) => {
      const actor = { id: `g_${Math.random().toString(36).slice(2, 10)}`, name: name.trim(), channel: "web", ts: Date.now() };
      if (!actor.name) return;
      setAttendees(a => a.filter(p => p.name.toLowerCase() !== actor.name.toLowerCase()));
      setBench(b => b.filter(p => p.name.toLowerCase() !== actor.name.toLowerCase()));
      setMaybe(c => c.filter(p => p.name.toLowerCase() !== actor.name.toLowerCase()));
      setOut(o => o.filter(p => p.name.toLowerCase() !== actor.name.toLowerCase()));
      if (decision === "yes") {
        setAttendees(prev => { if (prev.length < capacity) return [...prev, actor]; setBench(b => { if (b.length < benchCapacity) return [...b, actor]; return b; }); return prev; });
      } else if (decision === "maybe") {
        setMaybe(prev => [...prev, actor]);
      } else {
        setOut(prev => [...prev, actor]);
      }
      alert("Dziękujemy! Zapisano odpowiedź.");
      const url = new URL(window.location.href); url.searchParams.delete("mode"); window.history.pushState({}, "", url.toString()); setUrlMode("");
    }} />;
  }

  // Normal organizer view
  return (
    <div className="w-full min-h-[80vh] grid md:grid-cols-[340px_1fr] gap-4 p-4">
      <div className="rounded-2xl border p-4 bg-white/80 backdrop-blur">
        <h2 className="text-xl font-semibold mb-1">MatchUp — Web App</h2>
        <p className="text-xs text-gray-500 mb-3">Organizator (twórca) ma uprawnienia admina. Ten sam flow co w bocie.</p>

        <label className="block text-sm mb-1">Twoje imię</label>
        <input className="w-full border rounded-xl px-3 py-2 mb-3" value={meName} onChange={e=>setMeName(e.target.value)} />

        <label className="block text-sm mb-1">Tytuł</label>
        <input className="w-full border rounded-xl px-3 py-2 mb-3" value={title} onChange={e=>setTitle(e.target.value)} />

        <label className="block text-sm mb-1">Początek (czas lokalny)</label>
        <input type="datetime-local" className="w-full border rounded-xl px-3 py-2 mb-3" value={kickoffISO} onChange={e=>setKickoffISO(e.target.value)} />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm mb-1">Miejsca</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2" value={capacity} min={1} onChange={e=>setCapacity(parseInt(e.target.value||"0"))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Rezerwa</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2" value={benchCapacity} min={0} onChange={e=>setBenchCapacity(parseInt(e.target.value||"0"))} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm">Limit rezygnacji (h przed startem)</label>
          <input type="number" min={0} className="w-24 border rounded-xl px-3 py-2" value={cutoffHours} onChange={e=>setCutoffHours(parseInt(e.target.value||"0"))} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={announce} className="px-3 py-2 rounded-xl bg-black text-white">Ogłoś mecz</button>
          <button onClick={()=>{
            const names = ["Alex","Bo","Cam","Drew","Eli","Finn","Gio","Hadi","Ivan","Jax","Kyla","Liam","Maya","Nia","Omar","Pia","Quin","Rio","Sol","Tess"]; const players = names.map((n,i)=>({id:`p${i}`,name:n,channel:"web"}));
            setAttendees(players.slice(0, capacity)); setBench(players.slice(capacity, capacity+benchCapacity)); bot("Wypełniono listę demo.");
          }} className="px-3 py-2 rounded-xl border">Wypełnij listę demo</button>
          <button onClick={()=>{ setAttendees([]); setBench([]); setMaybe([]); setOut([]); setTeamMembers(Array.from({length:teamCount},()=>[])); setCreatorId(null); bot("Mecz wyczyszczony."); }} className="px-3 py-2 rounded-xl border">Resetuj</button>
          <button onClick={()=>{ ensureTeamsSize(teamCount); }} className="px-3 py-2 rounded-xl border">🔧 Składy</button>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className="w-full border rounded-xl px-3 py-2" placeholder="Dodaj osobę (bez FB): Imię i nazwisko" value={manualName} onChange={e=>setManualName(e.target.value)} />
            <button onClick={addManual} className="px-3 py-2 rounded-xl border">Dodaj</button>
          </div>
          <ShareLink />
        </div>
      </div>

      <div className="rounded-2xl border bg-gray-50 p-4 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {msgs.map((m,i)=> <Bubble key={i} sender={m.sender}>{m.text}</Bubble>)}
        </div>
        <div className="mt-3 border-t pt-3 flex flex-wrap gap-2">
          <button onClick={()=>yes()} className="px-3 py-2 rounded-xl border">✅ Tak</button>
          <button onClick={()=>no()} className="px-3 py-2 rounded-xl border">❌ Nie</button>
          <button onClick={()=>maybeAct()} className="px-3 py-2 rounded-xl border">🤔 Może</button>
          <button onClick={rosterSummary} className="px-3 py-2 rounded-xl border">📋 Lista</button>
          <button onClick={()=>{ you("/rezygnuję"); no(); }} className="ml-auto px-3 py-2 rounded-xl bg-black text-white">Rezygnuję</button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
          <Stat card onOpen={()=>{}} title="GRAJĄ" value={`${attendees.length}/${capacity}`} />
          <Stat card onOpen={()=>{}} title="REZERWA" value={`${bench.length}/${benchCapacity}`} />
          <Stat card onOpen={()=>{}} title="MOŻE" value={`${maybe.length}`} />
          <Stat card onOpen={()=>{}} title="NIE" value={`${out.length}`} />
        </div>

        <div className="mt-4 rounded-2xl border p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-semibold">🎽 Składy</div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Liczba drużyn:</span>
              <select className="border rounded-lg px-2 py-1" value={teamCount} onChange={e=>ensureTeamsSize(parseInt(e.target.value||"2"))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
              <button onClick={autoFillTeams} className="px-2 py-1 rounded-lg border">Auto-uzupełnij</button>
              <button onClick={()=>setTeamMembers(Array.from({length:teamCount},()=>[]))} className="px-2 py-1 rounded-lg border">Wyczyść</button>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3">
              <div className="font-semibold mb-1">Niezapisani ({attendees.filter(p=>inTeam(p.id)===-1).length})</div>
              <div className="flex flex-wrap gap-2">
                {attendees.filter(p=>inTeam(p.id)===-1).map(p=> (
                  <div key={p.id} className="border rounded-lg px-2 py-1 text-sm flex items-center gap-2">
                    <span>{p.name}</span>
                    {Array.from({length:teamCount},(_,i)=>(
                      <button key={i} className="text-xs border rounded px-1" onClick={()=>assignToTeam(i,p)}>T{i+1}</button>
                    ))}
                  </div>
                ))}
                {attendees.filter(p=>inTeam(p.id)===-1).length===0 && <div className="text-sm text-gray-500">— brak —</div>}
              </div>
            </div>
            {Array.from({length:teamCount}, (_,i)=> (
              <div key={i} className="rounded-xl border-2 p-3" style={{borderColor: teamColors[i] || "#000"}}>
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: teamColors[i] || "#000"}} />
                  Drużyna {i+1} ({(teamMembers[i]||[]).length})
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {["#3B82F6","#EF4444","#F59E0B"].map(c => (
                    <button key={c} className="w-5 h-5 rounded-full border" style={{backgroundColor:c}} onClick={()=>setTeamColors(prev=>{const copy=[...prev]; copy[i]=c; return copy;})} />
                  ))}
                </div>
                <ul className="space-y-1">
                  {(teamMembers[i]||[]).map(p=> (
                    <li key={p.id} className="flex items-center justify-between border rounded-lg px-2 py-1">
                      <span>{p.name}</span>
                      <button className="text-xs border rounded px-2" onClick={()=>removeFromAllTeams(p.id)}>Usuń</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header(){
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-black/80 text-white grid place-items-center">MU</div>
      <div>
        <div className="font-semibold">MatchUp — Web</div>
        <div className="text-xs text-gray-500">Podgląd działania aplikacji</div>
      </div>
    </div>
  );
}

function Bubble({ sender, children }){
  const isUser = sender === "you";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`${isUser ? "bg-black text-white" : "bg-white"} max-w-[75%] whitespace-pre-wrap border rounded-2xl px-3 py-2`}>{children}</div>
    </div>
  );
}

function Stat({ title, value, onOpen, card }){
  return (
    <button onClick={onOpen} className={`rounded-xl ${card?"bg-white":""} p-2 border text-left w-full cursor-pointer hover:shadow-sm focus:outline-none focus:ring`}>
      <div className="font-semibold">{title}</div>
      <div>{value}</div>
    </button>
  );
}

function ShareLink(){
  const [copied, setCopied] = useState(false);
  const makeUrl = () => {
    const u = new URL(window.location.href);
    u.searchParams.set("mode", "rsvp");
    return u.toString();
  };
  const copy = async () => {
    const link = makeUrl();
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false), 1500); }
    catch { alert(link); }
  };
  return (
    <div className="rounded-xl border p-3">
      <div className="font-semibold mb-1">Udostępnij link RSVP</div>
      <div className="text-xs text-gray-500 mb-2">Wyślij ten link osobom bez Messengera. Otworzy się prosty formularz: imię + Tak/Nie/Może.</div>
      <div className="flex gap-2">
        <input readOnly className="flex-1 border rounded-xl px-3 py-2" value={makeUrl()} />
        <button onClick={copy} className="px-3 py-2 rounded-xl border">{copied?"Skopiowano!":"Kopiuj"}</button>
      </div>
    </div>
  );
}

function PublicRSVP({ title, kickoffISO, capacity, benchCapacity, attendees, bench, maybe, out, onSubmit }){
  const [name, setName] = useState("");
  const fmt = (dtStr) => new Date(dtStr).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="min-h-[80vh] grid place-items-center p-4 bg-gray-50">
      <div className="w-full max-w-[520px] rounded-2xl border bg-white p-4">
        <div className="mb-3">
          <div className="text-xs text-gray-500">MatchUp — RSVP</div>
          <div className="text-xl font-semibold">{title}</div>
          <div className="text-sm text-gray-600">{fmt(kickoffISO)}</div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
          <div className="rounded-xl bg-gray-50 p-2 border"><div className="font-semibold">GRAJĄ</div><div>{attendees.length}/{capacity}</div></div>
          <div className="rounded-xl bg-gray-50 p-2 border"><div className="font-semibold">REZERWA</div><div>{bench.length}/{benchCapacity}</div></div>
          <div className="rounded-xl bg-gray-50 p-2 border"><div className="font-semibold">MOŻE</div><div>{maybe.length}</div></div>
          <div className="rounded-xl bg-gray-50 p-2 border"><div className="font-semibold">NIE</div><div>{out.length}</div></div>
        </div>
        <label className="block text-sm mb-1">Twoje imię i nazwisko</label>
        <input className="w-full border rounded-xl px-3 py-2 mb-3" value={name} onChange={e=>setName(e.target.value)} placeholder="np. Jan Kowalski" />
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>onSubmit("yes", name)} className="px-3 py-2 rounded-xl border">✅ Tak</button>
          <button onClick={()=>onSubmit("no", name)} className="px-3 py-2 rounded-xl border">❌ Nie</button>
          <button onClick={()=>onSubmit("maybe", name)} className="px-3 py-2 rounded-xl border">🤔 Może</button>
        </div>
        <div className="text-xs text-gray-500 mt-3">Po wysłaniu formularza wrócisz do widoku organizatora.</div>
      </div>
    </div>
  );
}
