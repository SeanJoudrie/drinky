/* RAP SHEET v1.1 — engine. Pure on-device. No backend, no build step. */
(() => {
  "use strict";
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // ---- persistence ----
  const SAVE="rapsheet.save", SET="rapsheet.settings", SEEN="rapsheet.seen",
        FLAG="rapsheet.flagged", CUSTOM="rapsheet.customcards", DOCKET="rapsheet.lastdocket",
        LASTF="rapsheet.lastfilters", AGE="rapsheet.ageok", COACH="rapsheet.coached";
  const load = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const store = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const settings = Object.assign({ haptics:true, wake:true, sound:false }, load(SET,{}));
  const seen = load(SEEN, {});

  const BLOCK = /\b(n[i1]gg|f[a4]gg|r[e3]t[a4]rd|k[i1]ke|sp[i1]c|ch[i1]nk|tr[a4]nn|c[ou]nt|rap(e|ist)|kill\s*your|sl[u]t)\w*/i;
  const WILD = { chill:2, classic:3, unhinged:5 };
  const VIBES = ["Sports","College","Couples","Movies","Work crew","Gym","Gamers","Book club"];
  const OFFLIMITS = [["exes","Exes"],["body","Looks / body"],["money","Money"]];
  const SCANNER = ["dispatch, we got a 10-15 in progress…","all units, suspects are loose…","booking in progress, stand by…","be advised: this group has priors…"];

  let st = null, wakeLock = null, audioCtx = null;

  // ---------- screens ----------
  function show(id){
    $$(".screen").forEach(s => s.classList.remove("active"));
    $("#"+id).classList.add("active");
    if (id === "game") requestWake(); else releaseWake();
  }

  // ---------- haptics / sound / wake ----------
  function buzz(ms){ if (settings.haptics && navigator.vibrate) navigator.vibrate(ms); }
  function blip(freq=440, dur=0.06){
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type="triangle"; o.frequency.value=freq; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.18, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
      o.start(); o.stop(audioCtx.currentTime+dur);
    } catch {}
  }
  async function requestWake(){
    if (!settings.wake || !("wakeLock" in navigator)) return;
    try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
    try { await screen.orientation.lock("portrait"); } catch {}   // best-effort (ITEM #8)
  }
  function releaseWake(){ try { wakeLock && wakeLock.release(); wakeLock=null; } catch {} }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState==="visible" && $("#game").classList.contains("active")) requestWake();
  });

  // ---------- deck building ----------
  const felony = c => c.spice >= 4;
  const isBook = c => c.book !== false && c.type !== "group";
  const customCards = () => load(CUSTOM, []);

  function baseUniverse(){ return window.CARDS.concat(customCards()); }

  function buildPool(f){
    const ceil = WILD[f.wildness];
    const flagged = new Set(load(FLAG, []));
    const exclude = new Set(f.exclude || []);
    const all = baseUniverse();

    const passes = (c, relax) => {
      if (flagged.has(c.id)) return false;
      if (c.spice > (relax.ceil ?? ceil)) return false;
      if ((c.minPlayers || 2) > f.players) return false;
      if (!relax.dropTopics && c.topics && c.topics.some(t => exclude.has(t))) return false;
      if (!f.keyword && c.usesKeyword && !relax.allowKw) return false;
      return true;
    };

    let pool = all.filter(c => passes(c, {}));
    // Empty-deck floor (ITEM: Pre-Build #4) — relax in priority order until >= 30.
    const relaxOrder = [{allowKw:true}, {allowKw:true, dropTopics:true}, {allowKw:true, dropTopics:true, ceil:Math.min(5,ceil+1)}, {allowKw:true, dropTopics:true, ceil:5}];
    for (let i=0; pool.length < 30 && i < relaxOrder.length; i++) pool = all.filter(c => passes(c, relaxOrder[i]));
    return pool.length ? pool : all.slice(); // absolute fallback
  }

  // weighted draw: pacing arc + theme boost + cross-session decay
  function pickCard(){
    const ceil = WILD[st.filters.wildness];
    const progress = Math.min(1, st.played / 22);
    const target = 1 + (ceil-1)*progress;
    let cand = st.pool.filter(c => !st.used.has(c.id));
    if (!cand.length){ st.used.clear(); st.exhausted = true; cand = st.pool.slice(); }
    const now = Date.now(), kw = (st.filters.keyword||"").toLowerCase();
    const w = cand.map(c => {
      const close = 1/(1+Math.abs(c.spice-target));
      const last = seen[c.id]||0;
      const recency = Math.min(1, (now-last)/(1000*60*60*36));
      let theme = 1;
      if (kw && c.themes && c.themes.some(t => kw.includes(t) || t.includes(kw))) theme = 2.6; // ITEM #3
      if (kw && c.usesKeyword) theme = Math.max(theme, 2.2);
      return close * (0.25 + 0.75*recency) * theme;
    });
    let r = Math.random()*w.reduce((a,b)=>a+b,0), pick = cand[0];
    for (let i=0;i<cand.length;i++){ r-=w[i]; if (r<=0){ pick=cand[i]; break; } }
    st.used.add(pick.id); seen[pick.id]=now; store(SEEN, seen);
    return pick;
  }

  // ---------- tokens ----------
  function fillTokens(t){
    const kw = st.filters.keyword || "the usual suspect";
    return t.replace(/\{left\}/g,"the person on your left")
            .replace(/\{right\}/g,"the person on your right")
            .replace(/\{across\}/g,"the person across from you")
            .replace(/\{holder\}/g,"whoever's holding this phone")
            .replace(/\{keyword\}/g, kw);
  }
  function targetLine(c){
    if (/\{left\}/.test(c.text))   return "→ person on your left";
    if (/\{right\}/.test(c.text))  return "→ person on your right";
    if (/\{across\}/.test(c.text)) return "→ person across from you";
    if (/\{holder\}/.test(c.text)) return "→ the phone holder";
    if (c.type==="group")          return "→ everyone";
    return "→ the room decides";
  }

  // ---------- render ----------
  function fitText(el){
    el.style.fontSize="40px"; let s=40;
    while (el.scrollHeight > el.clientHeight+2 && s>18){ s-=2; el.style.fontSize=s+"px"; }
  }
  function renderCard(){
    const c = st.current, card = $("#rapcard"), charge = $("#chargeText");
    const fel = felony(c);
    card.classList.toggle("felony", fel);
    $("#cardStamp").innerHTML = (fel ? "FELONY" : c.spice>=3 ? "MISDEMEANOR" : "PETTY OFFENSE")
      + ` <span class="pips">${"●".repeat(c.spice)}</span>`;   // ITEM #9 colorblind pip count
    $("#caseNo").textContent = String(1000 + st.played*7 % 8999).padStart(5,"0");
    charge.textContent = fillTokens(c.text);
    $("#targetLine").textContent = targetLine(c);
    $("#stakesStamp").textContent = fel ? "+2 — FELONY" : "+1 PRIOR";

    // drink rule row (ITEM #1) — only when Drinking ON
    const dr = $("#drinkRow");
    if (st.filters.drinking){ dr.classList.remove("hidden"); dr.textContent = c.drinkRule || (fel ? window.DRINK.felony : window.DRINK.prior); }
    else dr.classList.add("hidden");

    card.classList.remove("dealing"); void card.offsetWidth; card.classList.add("dealing");
    requestAnimationFrame(() => fitText(charge));
    buzz(fel ? (c.spice>=5 ? [30,50,30] : 25) : 8);  // ITEM #27 reveal haptic
    blip(fel ? 180 : 520, fel ? 0.12 : 0.05);

    renderBookRow();
    renderPriors();
    persist();
  }

  function renderBookRow(){
    const c = st.current, row = $("#bookRow");
    if (c.choice){                                   // ITEM #13 per-turn agency
      row.classList.remove("hidden");
      $("#bookRow .book-label").textContent = "Double or nothing?";
      const chips = $("#bookChips"); chips.innerHTML = "";
      const safe = btn("▶ Let it ride", () => advance());
      const dbl  = btn("⚡ Double — book someone +2", () => showChips(true));
      safe.classList.add("wide"); dbl.classList.add("wide");
      chips.append(safe, dbl);
      return;
    }
    if (isBook(c)){ showChips(false); }
    else row.classList.add("hidden");
  }
  function showChips(doubled){
    const c = st.current, row = $("#bookRow");
    row.classList.remove("hidden");
    $("#bookRow .book-label").textContent =
      c.type==="thisorthat" ? "Who lost the vote?" :
      c.type==="dare"       ? "Who chickened out? (tap, or tap the card if they did it)" :
                              "Who got booked? (tap them)";
    const chips = $("#bookChips"); chips.innerHTML = "";
    st.players.forEach((p,i) => chips.append(btn("P"+(i+1), e => { e&&e.stopPropagation(); assignPrior(i, doubled); })));
  }
  function btn(label, fn){ const b=document.createElement("button"); b.textContent=label; b.onclick=fn; return b; }

  function renderPriors(){
    const strip = $("#priorsStrip"); strip.innerHTML="";
    st.players.forEach((p,i) => {
      const el=document.createElement("div"); el.className="prior-pip";
      el.innerHTML=`<b>P${i+1}</b><span class="dots">${"●".repeat(p.priors)}</span>`;
      strip.appendChild(el);
    });
  }

  // ---------- actions ----------
  function nextCard(snap){
    st.history.push(snap || { card:st.current, booked:null, priorsSnapshot:st.players.map(p=>p.priors) });
    if (st.history.length>1) st.history.shift();   // single-level undo
    if (st.exhausted){ st.exhausted=false; return showExhausted(); }  // ITEM #26
    st.played++; st.current = pickCard(); renderCard();
  }
  function advance(){ buzz(8); nextCard(); }

  function assignPrior(i, doubled){
    const c = st.current;
    let add = felony(c) ? 2 : 1; if (doubled) add = 2;
    const snap = { card:c, booked:i, priorsSnapshot:st.players.map(p=>p.priors), add };
    const p = st.players[i];
    p.priors+=add; p.total+=add;
    if (!st.highlight || c.spice >= st.highlight.spice) st.highlight = c;   // ITEM #17 charge of the night
    buzz(add>=2 ? [25,40,25] : 18);
    if (p.priors>=3){
      buzz([40,60,40,60,80]); p.convictions++; p.priors=0;
      $("#lockupWho").textContent = "Player "+(i+1);
      $("#lockupSub").textContent = st.filters.drinking
        ? "Three priors. Finish your drink — you're going away."
        : "Three priors. Take the crown of shame for one round.";
      st._afterLock = () => nextCard(snap);
      return show("lockup");
    }
    nextCard(snap);
  }

  function undo(){
    const h = st.history[st.history.length-1]; if (!h) return; buzz(8);
    if (h.priorsSnapshot) st.players.forEach((p,i)=>p.priors=h.priorsSnapshot[i]);
    if (h.booked!=null){ const a=h.add||1; st.players[h.booked].total=Math.max(0,st.players[h.booked].total-a); }
    st.current=h.card; st.played=Math.max(0,st.played-1); st.history.pop(); st.used.delete(h.card.id);
    renderCard();
  }
  function skip(){ buzz(6); st.history.push({card:st.current,booked:null,priorsSnapshot:st.players.map(p=>p.priors)}); st.current=pickCard(); renderCard(); }
  function flagCard(){
    const f=new Set(load(FLAG,[])); f.add(st.current.id); store(FLAG,[...f]); buzz(10);
    toast("Charge flagged — you won't see it again.");
    st.pool = st.pool.filter(c=>c.id!==st.current.id); st.current=pickCard(); renderCard();
  }
  function addPlayer(){
    if (st.players.length>=13) return;
    st.players.push({priors:0,total:0,convictions:0}); buzz(8); renderPriors(); renderBookRow();
    toast("Player "+st.players.length+" booked into the system.");
  }

  // ---------- deck exhausted ----------
  function showExhausted(){ releaseWake(); show("exhausted"); }

  // ---------- recap / wanted poster ----------
  function rankedPlayers(){
    return st.players.map((p,i)=>({n:i+1,total:p.total,conv:p.convictions}))
                     .sort((a,b)=> b.total-a.total || b.conv-a.conv);
  }
  async function drawPoster(){
    try { await document.fonts.ready; } catch {}   // ITEM #16 font embedding gate
    const cv=$("#poster"), x=cv.getContext("2d"), W=cv.width, H=cv.height;
    const ranked=rankedPlayers(), top=ranked[0];
    x.fillStyle="#0E0B1A"; x.fillRect(0,0,W,H);
    x.fillStyle="#F4ECD8"; round(x,40,40,W-80,H-80,28); x.fill();
    x.fillStyle="#1A1714"; x.textAlign="center";
    x.font="900 64px Anton, Impact, sans-serif"; x.fillText("WANTED", W/2, 150);
    x.font="20px 'Special Elite', monospace"; x.fillText("— RAP SHEET · TONIGHT'S DOCKET —", W/2, 188);
    x.strokeStyle="#1A1714"; x.lineWidth=6; x.strokeRect(W/2-140, 220, 280, 280);
    x.fillStyle="#D7263D"; x.font="900 150px Anton, Impact, sans-serif"; x.fillText("P"+top.n, W/2, 430);
    x.fillStyle="#1A1714"; x.font="26px 'Special Elite', monospace"; x.fillText("MOST WANTED", W/2, 545);
    x.font="900 40px Anton, Impact, sans-serif"; x.fillText(`PLAYER ${top.n}`, W/2, 595);
    x.font="22px 'Special Elite', monospace"; x.fillText(`${top.total} charges · ${top.conv} conviction${top.conv===1?"":"s"}`, W/2, 632);
    x.textAlign="left"; x.font="20px 'Special Elite', monospace";
    let y=694; x.fillText("THE RECORD:", 90, y); y+=34;
    ranked.slice(0,5).forEach(p=>{
      x.fillText(`Player ${p.n}`, 110, y);
      const dots="●".repeat(Math.min(p.total,12))||"clean";
      x.fillText(dots, W-110 - x.measureText(dots).width, y); y+=30;
    });
    if (st.highlight){
      x.textAlign="center"; x.fillStyle="#7a2d8f"; x.font="italic 16px 'Inter',sans-serif";
      const line = "“"+fillTokens(st.highlight.text).slice(0,52)+(st.highlight.text.length>52?"…":"")+"”";
      x.fillText("CHARGE OF THE NIGHT", W/2, H-118);
      x.fillStyle="#1A1714"; x.font="15px 'Inter',sans-serif"; x.fillText(line, W/2, H-94);
    }
    x.textAlign="center"; x.fillStyle="#FF2D78"; x.font="700 18px 'Inter', sans-serif"; x.fillText("RAP SHEET", W/2, H-58);
  }
  function round(x,a,b,w,h,r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }

  function showRecap(){
    releaseWake();
    const top = rankedPlayers()[0];
    store(DOCKET, { date:Date.now(), seat:top.n, total:top.total });   // ITEM #12 one-byte memory
    localStorage.removeItem(SAVE);
    drawPoster();
    $("#btnQuick").classList.remove("hidden");
    show("recap");
  }
  async function sharePoster(){
    await drawPoster();
    $("#poster").toBlob(async blob => {
      const file = new File([blob],"rap-sheet.png",{type:"image/png"});
      if (navigator.canShare && navigator.canShare({files:[file]})){
        try { await navigator.share({files:[file], title:"RAP SHEET", text:"Tonight's docket 🚔"}); return; } catch {}
      }
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="rap-sheet.png"; a.click();
    },"image/png");
  }

  // ---------- persistence ----------
  function persist(){
    if (!st) return;
    store(SAVE, { t:Date.now(), players:st.players, filters:st.filters, played:st.played,
                  currentId:st.current.id, used:[...st.used], highlightId:st.highlight?st.highlight.id:null });
  }
  function resumable(){ const s=load(SAVE,null); return (s && Date.now()-s.t <= 6*60*60*1000) ? s : null; }
  // Quick Play smart defaults: reuse last setup, else sane defaults — zero taps to first card.
  function quickFilters(){ return load(LASTF, null) || { players:6, wildness:"classic", keyword:"", drinking:false, exclude:[] }; }

  // ---------- start / resume ----------
  function startGame(f){
    store(LASTF, f);
    const pool = buildPool(f);
    st = { filters:f, pool, used:new Set(), exhausted:false, highlight:null,
           players:Array.from({length:f.players},()=>({priors:0,total:0,convictions:0})),
           played:1, history:[], current:null };
    st.current = pickCard();
    show("game");
    if (!load(COACH,false)) return showCoaching();
    renderCard();
  }
  function resumeGame(s){
    const pool = buildPool(s.filters);
    st = { filters:s.filters, pool, used:new Set(s.used||[]), exhausted:false,
           highlight: s.highlightId ? window.CARDS.find(c=>c.id===s.highlightId) : null,
           players:s.players, played:s.played, history:[],
           current: window.CARDS.find(c=>c.id===s.currentId) || pool[0] };
    show("game"); renderCard();
  }

  // ---------- coaching ----------
  function showCoaching(){
    const o=$("#coach"); o.classList.remove("hidden");
    o.onclick=()=>{ o.classList.add("hidden"); store(COACH,true); renderCard(); };
  }

  // ---------- toast ----------
  let toastT;
  function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("on"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("on"),2200); }

  // ---------- charge of the day ----------
  function chargeOfDay(){
    const d=new Date(), seed=d.getFullYear()*1000+(d.getMonth()*31+d.getDate());
    const pool=window.CARDS.filter(c=>!c.usesKeyword && c.spice<=3);
    return pool[seed % pool.length];
  }

  // ===================== UI WIRING =====================
  function wire(){
    // splash scanner line
    $("#scannerLine").textContent = SCANNER[Math.floor(Math.random()*SCANNER.length)];

    setTimeout(() => {
      if (!load(AGE,false)) return show("agegate");   // ITEM #6 age gate
      enterHome();
    }, 1100);

    // age gate
    $("#ageYes").onclick = () => { store(AGE,true); enterHome(); };
    $("#ageNo").onclick  = () => { $("#agegate").innerHTML='<div class="lockup-inner"><h2 class="lockup-title" style="color:var(--stamp-high)">COME BACK AT 18</h2><p class="lockup-sub">This one\'s adults only. Case dismissed.</p></div>'; };

    // home
    $("#btnStart").onclick = () => { buildSetup(); show("setup"); };
    $("#btnGear").onclick   = () => { renderSettings(); show("settings"); };
    $("#btnResume").onclick = () => { const s=resumable(); if (s) resumeGame(s); };
    $("#btnQuick").onclick   = () => startGame(quickFilters());   // v1.1 §1/§3.1 — zero-setup hero
    $("#cod").onclick = () => shareCOD();
    $$("[data-go]").forEach(b => b.onclick = () => b.dataset.go==="home" ? enterHome() : show(b.dataset.go));

    // game
    $("#cardStage").addEventListener("click", e => { if (e.target.closest("#bookRow")) return; advance(); });
    $("#btnSkip").onclick = e=>{ e.stopPropagation(); skip(); };
    $("#btnUndo").onclick = e=>{ e.stopPropagation(); undo(); };
    $("#btnFlag").onclick = e=>{ e.stopPropagation(); flagCard(); };
    $("#btnEnd").onclick  = e=>{ e.stopPropagation(); if (confirm("End the night and see tonight's docket?")) showRecap(); };
    $("#btnAddP").onclick = e=>{ e.stopPropagation(); addPlayer(); };
    $("#btnPause").onclick= e=>{ e.stopPropagation(); if (confirm("Pause & head home? (your case is saved)")) enterHome(); };
    $("#btnGearGame").onclick = e=>{ e.stopPropagation(); renderSettings(); show("settings"); };

    // lockup
    $("#btnLockContinue").onclick = () => { show("game"); const f=st._afterLock; st._afterLock=null; f?f():renderCard(); };

    // exhausted
    $("#btnReshuffle").onclick = () => { st.played++; st.current=pickCard(); show("game"); renderCard(); };
    $("#btnExhaustEnd").onclick = () => showRecap();

    // recap
    $("#btnShare").onclick = sharePoster;
    $("#btnAgain").onclick = () => startGame(st.filters);
    $("#btnRecapHome").onclick = enterHome;
  }

  function enterHome(){
    const returning = !!(load(SAVE,null) || load(LASTF,null) || load(DOCKET,null));
    $("#homeTag").textContent = returning ? "Back again, repeat offender." : "your friends commit crimes. the game keeps a record.";
    $("#btnResume").classList.toggle("hidden", !resumable());
    // one-byte memory banner (ITEM #12)
    const d=load(DOCKET,null), mw=$("#memory");
    if (d){ mw.classList.remove("hidden"); mw.textContent = `Last time, Player ${d.seat} was Most Wanted (${d.total} charges). The court is watching.`; }
    else mw.classList.add("hidden");
    // charge of the day (ITEM #20)
    $("#codText").textContent = fillCOD(chargeOfDay().text);
    show("home");
  }
  function fillCOD(t){ return t.replace(/\{[^}]+\}/g,"someone"); }
  function shareCOD(){
    const text = "🚔 RAP SHEET — Charge of the Day:\n\n" + fillCOD(chargeOfDay().text);
    if (navigator.share){ navigator.share({text}).catch(()=>{}); }
    else { navigator.clipboard?.writeText(text); toast("Copied — paste it in the group chat."); }
  }

  // ---------- settings ----------
  function renderSettings(){
    bindToggle("#hapticToggle","haptics");
    bindToggle("#wakeToggle","wake");
    bindToggle("#soundToggle","sound");
    renderCustomList();
    $("#addCardBtn").onclick = addCustomCard;
  }
  function bindToggle(sel,key){
    const el=$(sel); el.classList.toggle("on",!!settings[key]); el.setAttribute("aria-checked",!!settings[key]);
    el.onclick=()=>{ settings[key]=!settings[key]; el.classList.toggle("on",settings[key]); el.setAttribute("aria-checked",settings[key]); store(SET,settings); buzz(8); };
  }
  function addCustomCard(){
    const ta=$("#customText"), txt=ta.value.trim();
    if (!txt) return toast("Type a charge first.");
    if (txt.length>140) return toast("Keep it under 140 characters.");
    if (BLOCK.test(txt)) return toast("Nope. Keep it clean-ish.");
    const list=customCards();
    const id = 9000 + list.length;
    list.push({ id, type:$("#customType").value, spice:+$("#customSpice").value, text:txt, custom:true });
    store(CUSTOM, list); ta.value=""; renderCustomList(); buzz(10); toast("Charge filed. It's in the deck.");
  }
  function renderCustomList(){
    const box=$("#customList"), list=customCards(); box.innerHTML="";
    if (!list.length){ box.innerHTML='<p class="hint">No custom charges yet. Write one above — it shuffles into your games.</p>'; return; }
    list.forEach((c,idx)=>{
      const row=document.createElement("div"); row.className="custom-row";
      row.innerHTML=`<span>${c.text}</span>`;
      const del=btn("✕", ()=>{ const l=customCards(); l.splice(idx,1); store(CUSTOM,l); renderCustomList(); });
      del.className="custom-del"; row.appendChild(del); box.appendChild(row);
    });
  }

  // ---------- setup ----------
  function buildSetup(){
    const cr=$("#playerCount"); cr.innerHTML="";          // min 3 (ITEM #25)
    for (let n=3;n<=13;n++){
      const b=btn(n, ()=>{ $$("#playerCount button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); window._lastN=n; updateBigNote(); });
      if (n===(window._lastN||4)) b.classList.add("on");
      cr.appendChild(b);
    }
    const vc=$("#vibeChips"); vc.innerHTML="";
    VIBES.forEach(v=>{ const b=btn(v, ()=>{ $("#keyword").value=v.toLowerCase(); $$("#vibeChips button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); }); vc.appendChild(b); });
    $("#keyword").value="";
    // off-limits chips (ITEM #11)
    const ol=$("#offlimits"); ol.innerHTML="";
    OFFLIMITS.forEach(([val,label])=>{ const b=btn(label, ()=>b.classList.toggle("on")); b.dataset.val=val; ol.appendChild(b); });
    $$("#wildness button").forEach(b=> b.onclick=()=>{ $$("#wildness button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); $("#wildHint").textContent={chill:"nothing nuclear. fully sober-safe.",classic:"light profanity, the good stuff.",unhinged:"no holds barred. 18+ energy."}[b.dataset.val]; });
    const dt=$("#drinkToggle"); dt.classList.remove("on"); dt.setAttribute("aria-checked","false");
    dt.onclick=()=>{ const on=!dt.classList.contains("on"); dt.classList.toggle("on",on); dt.setAttribute("aria-checked",on); };
    updateBigNote();
    $("#btnDeal").onclick=()=>{
      let kw=$("#keyword").value.trim().slice(0,20); if (kw && BLOCK.test(kw)) kw="";
      const exclude=$$("#offlimits button.on").map(b=>b.dataset.val);
      startGame({ players:window._lastN||4,
                  wildness:($("#wildness button.on")||{dataset:{}}).dataset.val||"classic",
                  keyword:kw, drinking:$("#drinkToggle").classList.contains("on"), exclude });
    };
  }
  function updateBigNote(){ $("#bigNote").classList.toggle("hidden", (window._lastN||4) <= 8); }  // ITEM #19

  document.addEventListener("DOMContentLoaded", wire);
})();
