/* RAP SHEET v1 — engine. Pure on-device. No backend, no build step. */
(() => {
  "use strict";
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // ---- persistence ----
  const SAVE = "rapsheet.save", SET = "rapsheet.settings", SEEN = "rapsheet.seen";
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const settings = Object.assign({ haptics:true, wake:true }, load(SET, {}));
  const seen = load(SEEN, {});               // cardId -> timestamp (cross-session anti-repeat)

  // crude keyword blocklist so {keyword} substitution can't be weaponised
  const BLOCK = /\b(n[i1]gg|f[a4]gg|r[e3]t[a4]rd|k[i1]ke|sp[i1]c|ch[i1]nk|tr[a4]nn|c[ou]nt|rap(e|ist)|kill\s*your|sl[u]t)\w*/i;

  const WILD = { chill:2, classic:3, unhinged:5 };
  const VIBES = ["Sports","College","Couples","Movies","Work crew","Gym","Gamers","Book club"];

  let st = null;            // active game state
  let wakeLock = null;

  // ---------- screens ----------
  function show(id){
    $$(".screen").forEach(s => s.classList.remove("active"));
    $("#"+id).classList.add("active");
    if (id === "game") requestWake(); else releaseWake();
  }

  // ---------- haptics / wake ----------
  function buzz(ms){ if (settings.haptics && navigator.vibrate) navigator.vibrate(ms); }
  async function requestWake(){
    if (!settings.wake || !("wakeLock" in navigator)) return;
    try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  }
  function releaseWake(){ try { wakeLock && wakeLock.release(); wakeLock = null; } catch {} }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && $("#game").classList.contains("active")) requestWake();
  });

  // ---------- deck building ----------
  function felony(c){ return c.spice >= 4; }
  function isBook(c){ return c.book !== false && c.type !== "group"; }

  function buildPool(filters){
    const ceil = WILD[filters.wildness];
    const kw = filters.keyword;
    let pool = window.CARDS.filter(c => c.spice <= ceil);
    if (!kw) pool = pool.filter(c => !c.usesKeyword);     // no vibe => drop token cards (decision #13)

    // Empty-deck floor (decision #4): guarantee >= 30 by relaxing filters in priority order.
    if (pool.length < 30){
      // 1) re-allow keyword cards even w/o a keyword (fill token with a neutral word)
      pool = window.CARDS.filter(c => c.spice <= ceil);
      if (pool.length < 30){
        // 2) raise the spice ceiling until we clear the floor
        let c2 = ceil;
        while (pool.length < 30 && c2 < 5){ c2++; pool = window.CARDS.filter(c => c.spice <= c2); }
      }
    }
    return pool;
  }

  // weighted draw: pacing arc (spice ramps with progress) + cross-session decay
  function pickCard(){
    const ceil = WILD[st.filters.wildness];
    const progress = Math.min(1, st.played / 22);              // warm-up -> escalate over ~22 cards
    const target = 1 + (ceil - 1) * progress;
    let cand = st.pool.filter(c => !st.used.has(c.id));
    if (!cand.length){ st.used.clear(); cand = st.pool.slice(); }   // exhausted -> reshuffle
    const now = Date.now();
    const weights = cand.map(c => {
      const closeness = 1 / (1 + Math.abs(c.spice - target));
      const last = seen[c.id] || 0;
      const recency = Math.min(1, (now - last) / (1000*60*60*36)); // older than ~36h => full weight
      return closeness * (0.25 + 0.75 * recency);
    });
    let r = Math.random() * weights.reduce((a,b)=>a+b,0), pick = cand[0];
    for (let i=0;i<cand.length;i++){ r -= weights[i]; if (r<=0){ pick = cand[i]; break; } }
    st.used.add(pick.id); seen[pick.id] = now; store(SEEN, seen);
    return pick;
  }

  // ---------- token substitution ----------
  function fillTokens(text){
    const kw = st.filters.keyword || "the usual suspect";
    return text
      .replace(/\{left\}/g,   "the person on your left")
      .replace(/\{right\}/g,  "the person on your right")
      .replace(/\{across\}/g, "the person across from you")
      .replace(/\{holder\}/g, "whoever's holding this phone")
      .replace(/\{keyword\}/g, kw);
  }
  function targetLine(c){
    if (/\{left\}/.test(c.text))   return "→ person on your left";
    if (/\{right\}/.test(c.text))  return "→ person on your right";
    if (/\{across\}/.test(c.text)) return "→ person across from you";
    if (/\{holder\}/.test(c.text)) return "→ the phone holder";
    if (c.type === "group")        return "→ everyone";
    return "→ the room decides";
  }

  // ---------- render a card ----------
  function fitText(el){
    el.style.fontSize = "40px";
    let size = 40;
    while ((el.scrollHeight > el.clientHeight + 2) && size > 18){ size -= 2; el.style.fontSize = size+"px"; }
  }
  function renderCard(){
    const c = st.current;
    const card = $("#rapcard"), charge = $("#chargeText");
    card.classList.toggle("felony", felony(c));
    $("#cardStamp").textContent = felony(c) ? "FELONY" : (c.spice >= 3 ? "MISDEMEANOR" : "PETTY OFFENSE");
    $("#caseNo").textContent = String(1000 + st.played*7 % 8999).padStart(5,"0");
    charge.textContent = fillTokens(c.text);
    $("#targetLine").textContent = targetLine(c);
    $("#stakesStamp").textContent = felony(c) ? "+2 — FELONY" : "+1 PRIOR";
    card.classList.remove("dealing"); void card.offsetWidth; card.classList.add("dealing");
    requestAnimationFrame(() => fitText(charge));

    // booking chips
    const row = $("#bookRow");
    if (isBook(c)){
      row.classList.remove("hidden");
      $("#bookRow .book-label").textContent =
        c.type === "thisorthat" ? "Who lost the vote?" :
        c.type === "dare"       ? "Who chickened out? (tap, or tap the card if they did it)" :
                                  "Who got booked? (tap them)";
      const chips = $("#bookChips"); chips.innerHTML = "";
      st.players.forEach((p, i) => {
        const b = document.createElement("button");
        b.textContent = "P" + (i+1);
        b.onclick = (e) => { e.stopPropagation(); assignPrior(i); };
        chips.appendChild(b);
      });
    } else {
      row.classList.add("hidden");
    }
    renderPriors();
    persist();
  }

  function renderPriors(){
    const strip = $("#priorsStrip"); strip.innerHTML = "";
    st.players.forEach((p, i) => {
      const el = document.createElement("div"); el.className = "prior-pip";
      el.innerHTML = `<b>P${i+1}</b><span class="dots">${"●".repeat(p.priors)}</span>`;
      strip.appendChild(el);
    });
  }

  // ---------- actions ----------
  function nextCard(prevForUndo){
    st.history.push(prevForUndo || { card: st.current, booked: null, priorsSnapshot: st.players.map(p=>p.priors) });
    if (st.history.length > 1) st.history.shift();   // single-level undo (decision #7)
    st.played++;
    st.current = pickCard();
    renderCard();
  }

  function advance(){ buzz(8); nextCard(); }

  function assignPrior(i){
    const c = st.current;
    const add = felony(c) ? 2 : 1;
    // record for undo
    const snap = { card: c, booked: i, priorsSnapshot: st.players.map(p=>p.priors), add };
    const p = st.players[i];
    p.priors += add; p.total += add;
    buzz(felony(c) ? [25,40,25] : 18);
    if (p.priors >= 3){
      // lock-up
      buzz([40,60,40,60,80]);
      st.pendingLockup = i; p.convictions++; p.priors = 0;
      $("#lockupWho").textContent = "Player " + (i+1);
      $("#lockupSub").textContent = st.filters.drinking
        ? "Three priors. Finish your drink — you're going away."
        : "Three priors. Take the crown of shame for one round.";
      show("lockup");
      // queue the next card so Continue resumes cleanly
      st._afterLock = () => nextCard(snap);
      return;
    }
    nextCard(snap);
  }

  function undo(){
    const h = st.history[st.history.length - 1];
    if (!h) return;
    buzz(8);
    // revert priors
    if (h.priorsSnapshot) st.players.forEach((p, i) => p.priors = h.priorsSnapshot[i]);
    if (h.booked != null){ const add = h.add || 1; st.players[h.booked].total = Math.max(0, st.players[h.booked].total - add); }
    st.current = h.card; st.played = Math.max(0, st.played - 1);
    st.history.pop();
    st.used.delete(h.card.id);
    renderCard();
  }

  function skip(){ buzz(6); st.history.push({ card: st.current, booked:null, priorsSnapshot: st.players.map(p=>p.priors) }); st.current = pickCard(); renderCard(); }

  // ---------- recap / wanted poster ----------
  function drawPoster(){
    const cv = $("#poster"), x = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    // ranked by total bookings
    const ranked = st.players.map((p,i)=>({n:i+1, total:p.total, conv:p.convictions}))
                             .sort((a,b)=> b.total - a.total || b.conv - a.conv);
    const top = ranked[0];

    x.fillStyle = "#0E0B1A"; x.fillRect(0,0,W,H);
    // paper
    x.fillStyle = "#F4ECD8"; round(x,40,40,W-80,H-80,28); x.fill();
    x.fillStyle = "#1A1714";
    x.textAlign = "center";
    x.font = "900 64px Anton, Impact, sans-serif";
    x.fillText("WANTED", W/2, 150);
    x.font = "20px 'Special Elite', monospace";
    x.fillText("— RAP SHEET · TONIGHT'S DOCKET —", W/2, 188);

    // mugshot frame
    x.strokeStyle = "#1A1714"; x.lineWidth = 6; x.strokeRect(W/2-140, 220, 280, 280);
    x.fillStyle = "#D7263D"; x.font = "900 150px Anton, Impact, sans-serif";
    x.fillText("P"+top.n, W/2, 430);
    x.fillStyle = "#1A1714"; x.font = "26px 'Special Elite', monospace";
    x.fillText("MOST WANTED", W/2, 545);
    x.font = "900 40px Anton, Impact, sans-serif";
    x.fillText(`PLAYER ${top.n}`, W/2, 595);
    x.font = "22px 'Special Elite', monospace";
    x.fillText(`${top.total} charges · ${top.conv} conviction${top.conv===1?"":"s"}`, W/2, 632);

    // rap sheet list
    x.textAlign = "left"; x.font = "20px 'Special Elite', monospace";
    let y = 700;
    x.fillText("THE RECORD:", 90, y); y += 36;
    ranked.slice(0,6).forEach(p => {
      x.fillText(`Player ${p.n}`, 110, y);
      x.fillText("●".repeat(Math.min(p.total,12)) || "clean", W-110 - x.measureText("●".repeat(Math.min(p.total,12))||"clean").width, y);
      y += 32;
    });
    x.textAlign = "center"; x.fillStyle = "#FF2D78"; x.font = "18px 'Inter', sans-serif";
    x.fillText("play RAP SHEET", W/2, H-70);
  }
  function round(x,a,b,w,h,r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }

  function showRecap(){ releaseWake(); drawPoster(); localStorage.removeItem(SAVE); $("#btnQuick").classList.remove("hidden"); show("recap"); }

  async function sharePoster(){
    const cv = $("#poster");
    cv.toBlob(async (blob) => {
      const file = new File([blob], "rap-sheet.png", { type:"image/png" });
      if (navigator.canShare && navigator.canShare({ files:[file] })){
        try { await navigator.share({ files:[file], title:"RAP SHEET", text:"Tonight's docket 🚔" }); return; } catch {}
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "rap-sheet.png"; a.click();
    }, "image/png");
  }

  // ---------- persistence of in-progress game ----------
  function persist(){
    if (!st) return;
    store(SAVE, {
      t: Date.now(),
      players: st.players, filters: st.filters,
      played: st.played, currentId: st.current.id, used: [...st.used]
    });
  }
  function resumable(){
    const s = load(SAVE, null);
    if (!s) return null;
    if (Date.now() - s.t > 6*60*60*1000) return null;   // expire after 6h (decision #8)
    return s;
  }

  // ---------- start a game ----------
  function startGame(filters){
    const pool = buildPool(filters);
    st = {
      filters, pool, used: new Set(),
      players: Array.from({length: filters.players}, () => ({ priors:0, total:0, convictions:0 })),
      played: 0, history: [], current: null, pendingLockup: null
    };
    st.current = pickCard(); st.played = 1;
    show("game"); renderCard();
  }
  function resumeGame(s){
    const pool = buildPool(s.filters);
    st = {
      filters: s.filters, pool, used: new Set(s.used || []),
      players: s.players, played: s.played, history: [],
      current: window.CARDS.find(c => c.id === s.currentId) || pickFrom(pool),
      pendingLockup: null
    };
    show("game"); renderCard();
  }
  const pickFrom = (pool) => pool[Math.floor(Math.random()*pool.length)];

  // ===================== UI WIRING =====================
  function wire(){
    // splash -> home
    setTimeout(() => {
      show("home");
      if (resumable()) $("#btnResume").classList.remove("hidden");
      if (load(SAVE, null) || lastFilters()) $("#btnQuick").classList.remove("hidden");
    }, 1100);

    // home buttons
    $("#btnStart").onclick = () => { buildSetup(); show("setup"); };
    $("#btnGear").onclick   = () => show("settings");
    $("#btnResume").onclick = () => { const s = resumable(); if (s) resumeGame(s); };
    $("#btnQuick").onclick   = () => { const f = lastFilters(); if (f) startGame(f); };
    $$("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));

    // game taps — card body advances; dead zones are the bars/controls (decision #6)
    $("#cardStage").addEventListener("click", advance);
    $("#btnSkip").onclick = (e)=>{ e.stopPropagation(); skip(); };
    $("#btnUndo").onclick = (e)=>{ e.stopPropagation(); undo(); };
    $("#btnEnd").onclick  = (e)=>{ e.stopPropagation(); if (confirm("End the night and see tonight's docket?")) showRecap(); };
    $("#btnPause").onclick = (e)=>{ e.stopPropagation(); if (confirm("Pause & head home? (your case is saved)")) show("home"); };
    $("#btnGearGame").onclick = (e)=>{ e.stopPropagation(); show("settings"); };

    // lockup
    $("#btnLockContinue").onclick = () => { show("game"); const f = st._afterLock; st._afterLock = null; f ? f() : renderCard(); };

    // recap
    $("#btnShare").onclick = sharePoster;
    $("#btnAgain").onclick = () => startGame(st.filters);
    $("#btnRecapHome").onclick = () => show("home");

    // settings toggles
    bindToggle("#hapticToggle", "haptics");
    bindToggle("#wakeToggle", "wake");
  }

  function bindToggle(sel, key){
    const el = $(sel); el.classList.toggle("on", !!settings[key]); el.setAttribute("aria-checked", !!settings[key]);
    el.onclick = () => { settings[key] = !settings[key]; el.classList.toggle("on", settings[key]); el.setAttribute("aria-checked", settings[key]); store(SET, settings); buzz(8); };
  }

  function lastFilters(){ const s = load(SAVE, null); return s ? s.filters : load("rapsheet.lastfilters", null); }

  // ---- setup screen ----
  function buildSetup(){
    // player count
    const cr = $("#playerCount"); cr.innerHTML = "";
    for (let n=2; n<=13; n++){
      const b = document.createElement("button"); b.textContent = n;
      if (n === (window._lastN || 4)) b.classList.add("on");
      b.onclick = () => { $$("#playerCount button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); window._lastN = n; };
      cr.appendChild(b);
    }
    // vibe chips
    const vc = $("#vibeChips"); vc.innerHTML = "";
    VIBES.forEach(v => {
      const b = document.createElement("button"); b.textContent = v;
      b.onclick = () => { $("#keyword").value = v.toLowerCase(); $$("#vibeChips button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); };
      vc.appendChild(b);
    });
    $("#keyword").value = "";
    // wildness segmented
    $$("#wildness button").forEach(b => b.onclick = () => {
      $$("#wildness button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
      $("#wildHint").textContent = { chill:"nothing nuclear. fully sober-safe.", classic:"light profanity, the good stuff.", unhinged:"no holds barred. 18+ energy." }[b.dataset.val];
    });
    // drink toggle
    const dt = $("#drinkToggle"); dt.classList.remove("on"); dt.setAttribute("aria-checked","false");
    dt.onclick = () => { const on = !dt.classList.contains("on"); dt.classList.toggle("on", on); dt.setAttribute("aria-checked", on); };

    // deal
    $("#btnDeal").onclick = () => {
      const players = window._lastN || 4;
      let kw = $("#keyword").value.trim().slice(0,20);
      if (kw && BLOCK.test(kw)) { kw = ""; }              // keyword safety (decision #5)
      const filters = {
        players,
        wildness: ($("#wildness button.on")||{}).dataset?.val || "classic",
        keyword: kw,
        drinking: $("#drinkToggle").classList.contains("on")
      };
      store("rapsheet.lastfilters", filters);
      startGame(filters);
    };
  }

  // boot
  document.addEventListener("DOMContentLoaded", wire);
})();
