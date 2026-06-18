/* RAP SHEET v1.2 — engine. Pure on-device. No backend, no build step. */
(() => {
  "use strict";
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

  const SET="rapsheet.settings", SEEN="rapsheet.seen", FLAG="rapsheet.flagged",
        CUSTOM="rapsheet.customcards", DOCKET="rapsheet.lastdocket", LASTF="rapsheet.lastfilters",
        AGE="rapsheet.ageok", COACH="rapsheet.coached";
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
  const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

  const settings = Object.assign({haptics:true,wake:true,sound:false}, load(SET,{}));
  const seen = load(SEEN,{});
  const BLOCK=/\b(n[i1]gg|f[a4]gg|r[e3]t[a4]rd|k[i1]ke|sp[i1]c|ch[i1]nk|tr[a4]nn|k[i1]ll\s*your)\w*/i;
  const WILD={chill:2,classic:3,unhinged:5};
  const VIBES_BASE=["Sports","College","Couples","Movies","Work crew","Gym","Gamers","Book club"];
  const VIBES_MORE=["Music","Food","Travel","Tech","Anime","Reality TV","Cars","Crypto","Parenting","Roommates","High school","Hometown","Exes","Money","Festivals","Hookups","Astrology","True crime","Streaming","Group chat","Frat life","Family","Politics","Fashion","Fitness","Coworkers"];
  const OFFLIMITS=[["exes","Exes"],["body","Looks / body"],["money","Money"]];

  // ---- inline SVG icon set (replaces emoji) ----
  const I = {
    skip:'<svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zM16 5h3v14h-3z"/></svg>',
    undo:'<svg viewBox="0 0 24 24"><path d="M12 5V2L7 7l5 5V8a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9z"/></svg>',
    flag:'<svg viewBox="0 0 24 24"><path d="M6 3v18H4V3zM7 4h11l-2 4 2 4H7z"/></svg>',
    end:'<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
    add:'<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    gear:'<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2-1.2.3-2.3-2.2-.8-1-2.1-2.3.5L12 2.5 10.2 4l-2.3-.5-1 2.1-2.2.8.3 2.3L3 12l2 1.2-.3 2.3 2.2.8 1 2.1 2.3-.5L12 21.5 13.8 20l2.3.5 1-2.1 2.2-.8-.3-2.3z"/></svg>',
    share:'<svg viewBox="0 0 24 24"><path d="M16 5l-1.4 1.4L16.2 8H9a6 6 0 0 0 0 12h2v-2H9a4 4 0 0 1 0-8h7.2l-1.6 1.6L16 13l4-4z"/></svg>',
    back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    badge:'<svg viewBox="0 0 24 24"><path d="M12 2l3 3 4-1-1 4 3 3-3 3 1 4-4-1-3 3-3-3-4 1 1-4-3-3 3-3-1-4 4 1z"/></svg>'
  };

  let st=null, wakeLock=null, audioCtx=null;

  function show(id){ $$(".screen").forEach(s=>s.classList.remove("active")); $("#"+id).classList.add("active"); id==="game"?requestWake():releaseWake(); }
  function buzz(ms){ if(settings.haptics&&navigator.vibrate) navigator.vibrate(ms); }
  function blip(f=440,d=.06){ if(!settings.sound)return; try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="triangle";o.frequency.value=f;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(.18,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.start();o.stop(audioCtx.currentTime+d);}catch{} }
  async function requestWake(){ if(settings.wake&&"wakeLock"in navigator){try{wakeLock=await navigator.wakeLock.request("screen");}catch{}} try{await screen.orientation.lock("portrait");}catch{} }
  function releaseWake(){ try{wakeLock&&wakeLock.release();wakeLock=null;}catch{} }
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&$("#game").classList.contains("active")) requestWake(); });

  // ---------- deck ----------
  const felony=c=>c.spice>=4 && c.type!=="power";
  const isPower=c=>c.type==="power";
  const isBook=c=>!isPower(c)&&c.book!==false&&c.type!=="group";
  const customCards=()=>load(CUSTOM,[]);
  const universe=()=> window.CARDS.concat(st&&st.filters.includeCustom!==false?customCards():[]);

  function buildPool(f){
    const ceil=f.baba?5:WILD[f.wildness];
    const flagged=new Set(load(FLAG,[]));
    const exclude=(f.exclude||[]).map(s=>s.toLowerCase());
    const all=window.CARDS.concat(f.includeCustom!==false?customCards():[]);
    const ok=(c,relax)=>{
      if(flagged.has(c.id))return false;
      if(isPower(c))return true;                       // power cards always allowed
      if(c.baba && !f.baba)return false;               // baba cards only in baba mode
      if(c.spice>(relax.ceil??ceil))return false;
      if((c.minPlayers||2)>f.players)return false;
      if(!relax.dropTopics){
        if(c.topics&&c.topics.some(t=>exclude.includes(t)))return false;
        if(exclude.some(w=>w.length>2 && c.text.toLowerCase().includes(w)))return false; // custom off-limits by word
      }
      if(!f.vibes.length && c.usesKeyword && !relax.allowKw)return false;
      return true;
    };
    let pool=all.filter(c=>ok(c,{}));
    const relaxes=[{allowKw:true},{allowKw:true,dropTopics:true},{allowKw:true,dropTopics:true,ceil:5}];
    for(let i=0;pool.filter(c=>!isPower(c)).length<24 && i<relaxes.length;i++) pool=all.filter(c=>ok(c,relaxes[i]));
    return pool.length?pool:all.slice();
  }

  function vibeWeight(c,f){
    if(!f.vibes.length) return 1;
    const top=f.vibes.slice(0,3).map(v=>v.toLowerCase()), rest=f.vibes.slice(3).map(v=>v.toLowerCase());
    const hit=arr=>arr.some(v=> (c.themes&&c.themes.some(t=>v.includes(t)||t.includes(v))) || (c.usesKeyword));
    if(hit(top)) return 3; if(hit(rest)) return 1.4; return 1;
  }
  function pickCard(){
    // occasional power card
    const powers=st.pool.filter(c=>isPower(c)&&!st.used.has(c.id));
    if(powers.length && st.played>3 && Math.random()<0.09){ const p=powers[Math.floor(Math.random()*powers.length)]; st.used.add(p.id); return p; }
    const f=st.filters, ceil=f.baba?5:WILD[f.wildness];
    const progress=Math.min(1,st.played/22), target=f.baba?5:1+(ceil-1)*progress;
    let cand=st.pool.filter(c=>!st.used.has(c.id)&&!isPower(c));
    if(!cand.length){ st.used.forEach(id=>{ if(!st.pool.find(c=>c.id===id&&isPower(c))) st.used.delete(id); }); st.exhausted=true; cand=st.pool.filter(c=>!isPower(c)); }
    const now=Date.now();
    const w=cand.map(c=>{
      const close=1/(1+Math.abs(c.spice-target));
      const last=seen[c.id]||0, rec=Math.min(1,(now-last)/(1000*60*60*36));
      let m=vibeWeight(c,f);
      if(f.baba&&c.baba) m*=6;                          // baba dominates in baba mode
      return close*(0.25+0.75*rec)*m;
    });
    let r=Math.random()*w.reduce((a,b)=>a+b,0), pick=cand[0];
    for(let i=0;i<cand.length;i++){ r-=w[i]; if(r<=0){pick=cand[i];break;} }
    st.used.add(pick.id); seen[pick.id]=now; store(SEEN,seen);
    return pick;
  }

  // ---------- tokens ----------
  function pickVibe(){ const v=st.filters.vibes; if(!v.length)return "the usual suspect"; return v[Math.floor(Math.random()*Math.min(3,v.length))]; }
  function fillTokens(t){ return t.replace(/\{left\}/g,"the person on your left").replace(/\{right\}/g,"the person on your right").replace(/\{across\}/g,"the person across from you").replace(/\{holder\}/g,"whoever's holding this phone").replace(/\{keyword\}/g,pickVibe()); }
  function targetLine(c){ if(/\{left\}/.test(c.text))return"on your left"; if(/\{right\}/.test(c.text))return"on your right"; if(/\{across\}/.test(c.text))return"across from you"; if(/\{holder\}/.test(c.text))return"the phone holder"; if(c.type==="group")return"everyone"; return"the room decides"; }

  // ---------- render ----------
  function fitText(el){ el.style.fontSize="40px"; let s=40; while(el.scrollHeight>el.clientHeight+2&&s>18){s-=2;el.style.fontSize=s+"px";} }
  function renderCard(){
    const c=st.current, card=$("#rapcard"), fel=felony(c), pow=isPower(c);
    card.classList.toggle("felony",fel);
    card.classList.toggle("power",pow);
    card.classList.toggle("facedown",!st.flipped);
    $("#tapHint").textContent = !st.flipped ? "tap to flip the charge" : (isBook(c)||pow||c.choice ? "read it aloud · then send it below" : "read it aloud · tap card to continue");

    if(!st.flipped){ renderPriors(); persist(); return; }

    $("#cardStamp").innerHTML = (pow?"COURT ORDER":fel?"FELONY":c.spice>=3?"MISDEMEANOR":"PETTY OFFENSE")+` <span class="pips">${"●".repeat(Math.min(c.spice,5))}</span>`;
    $("#caseNo").textContent=String(1000+st.played*7%8999).padStart(5,"0");
    const charge=$("#chargeText"); charge.textContent=fillTokens(c.text);
    $("#targetLine").textContent = pow?"→ your call":"→ "+targetLine(c);
    $("#stakesStamp").textContent = pow?"POWER":fel?"+2 PTS":"+1 PT";
    const dr=$("#drinkRow");
    if(st.filters.drinking&&!pow){ dr.classList.remove("hidden"); dr.textContent=fel?"🍺 Two big sips — or finish it.":"🍺 That's a sip."; } else dr.classList.add("hidden");
    requestAnimationFrame(()=>fitText(charge));
    renderBookRow(); renderPriors(); persist();
  }

  function renderBookRow(){
    const c=st.current, row=$("#bookRow"), chips=$("#bookChips");
    chips.innerHTML=""; st._sel=null;
    const setLabel=t=>$("#bookRow .book-label").textContent=t;
    if(isPower(c)){
      row.classList.remove("hidden");
      setLabel(c.power==="pardon"?"Pardon who? (clear their record)":"Deflect onto who? (they eat a point)");
      st.players.forEach((p,i)=>chips.append(nameChip(p,i,()=>selectTarget(i,()=>applyPower(i,c.power)))));
      return;
    }
    if(c.choice){
      row.classList.remove("hidden"); setLabel("Double or nothing?");
      const safe=wideBtn("Let it ride",()=>advance());
      const dbl=wideBtn("⚡ Double — book +2",()=>{ setLabel("Book +2 onto who?"); chips.innerHTML=""; st.players.forEach((p,i)=>chips.append(nameChip(p,i,()=>selectTarget(i,()=>assignPoints(i,2))))); });
      chips.append(safe,dbl); return;
    }
    if(isBook(c)){
      row.classList.remove("hidden");
      setLabel(c.type==="thisorthat"?"Who lost the vote?":c.type==="dare"?"Who chickened out? (or tap card if they did it)":"Who's getting booked?");
      st.players.forEach((p,i)=>chips.append(nameChip(p,i,()=>selectTarget(i,()=>assignPoints(i,felony(c)?2:1)))));
      return;
    }
    row.classList.add("hidden");
  }
  function nameChip(p,i,fn){ const b=document.createElement("button"); b.className="namechip"; b.innerHTML=`<span>${esc(p.name)}</span>`; b.onclick=e=>{e.stopPropagation();fn();}; b.dataset.i=i; return b; }
  function wideBtn(label,fn){ const b=document.createElement("button"); b.className="namechip wide"; b.textContent=label; b.onclick=e=>{e.stopPropagation();fn();}; return b; }
  function selectTarget(i,confirmFn){
    // tap-to-select then quick confirm
    $$("#bookChips .namechip").forEach(b=>b.classList.toggle("selected",+b.dataset.i===i));
    let cb=$("#confirmSend");
    if(!cb){ cb=document.createElement("button"); cb.id="confirmSend"; cb.className="confirm-send"; $("#bookRow").appendChild(cb); }
    cb.innerHTML=`${I.check}<span>Send charge to ${esc(st.players[i].name)}</span>`;
    cb.classList.add("on");
    cb.onclick=e=>{ e.stopPropagation(); cb.classList.remove("on"); buzz(14); confirmFn(); };
  }

  function renderPriors(){
    const strip=$("#priorsStrip"); strip.innerHTML="";
    st.players.forEach(p=>{
      const el=document.createElement("div"); el.className="prior-pip";
      const strikes=p.strikes?`<span class="strk">${"✦".repeat(p.strikes)}</span>`:"";
      el.innerHTML=`<b>${esc(p.name)}</b><span class="dots">${"●".repeat(p.points)}</span>${strikes}`;
      strip.appendChild(el);
    });
  }
  const esc=s=>String(s).replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));

  // ---------- flip / advance ----------
  function tapCard(){
    const c=st.current;
    if(!st.flipped){ st.flipped=true; buzz(10); blip(c&&felony(c)?180:520,.06); renderCard(); return; }
    if(isPower(c)||c.choice||isBook(c)) return;        // must resolve via chips
    advance();
  }
  function nextCard(snap){
    st.history.push(snap||{card:st.current,booked:null,snapshot:snapState()});
    if(st.history.length>1)st.history.shift();
    const cs=$("#confirmSend"); if(cs)cs.classList.remove("on");
    if(st.exhausted){ st.exhausted=false; return showExhausted(); }
    st.played++; st.flipped=false; st.current=pickCard(); renderCard();
  }
  function advance(){ buzz(8); nextCard(); }
  const snapState=()=>st.players.map(p=>({points:p.points,strikes:p.strikes,total:p.total}));

  function assignPoints(i,n){
    const c=st.current, snap={card:c,booked:i,snapshot:snapState()};
    const p=st.players[i]; p.points+=n; p.total+=n;
    if(!st.highlight||c.spice>=st.highlight.spice) st.highlight=c;
    buzz(n>=2?[25,40,25]:18);
    if(p.points>=st.filters.pps){ p.points-=st.filters.pps; p.strikes++; st._afterLock=()=>nextCard(snap); return strikeScreen(p.name,p.strikes); }
    nextCard(snap);
  }
  function applyPower(i,kind){
    const snap={card:st.current,booked:i,snapshot:snapState(),power:kind};
    const p=st.players[i];
    if(kind==="pardon"){ if(p.points>0)p.points=0; else if(p.strikes>0)p.strikes--; toast(`${p.name} walks free.`); buzz([20,30]); nextCard(snap); }
    else { p.points+=1; p.total+=1; toast(`Point deflected onto ${p.name}.`); buzz(18); if(p.points>=st.filters.pps){p.points-=st.filters.pps;p.strikes++;st._afterLock=()=>nextCard(snap);return strikeScreen(p.name,p.strikes);} nextCard(snap); }
  }
  function strikeScreen(name,n){
    $("#lockupWho").textContent=name;
    $("#lockupSub").textContent=st.filters.drinking?`Strike ${n}. Finish your drink — the record grows.`:`Strike ${n}. Take the crown of shame for a round.`;
    show("lockup");
  }

  function undo(){
    const h=st.history[st.history.length-1]; if(!h)return; buzz(8);
    if(h.snapshot)st.players.forEach((p,i)=>{p.points=h.snapshot[i].points;p.strikes=h.snapshot[i].strikes;p.total=h.snapshot[i].total;});
    st.current=h.card; st.flipped=true; st.played=Math.max(0,st.played-1); st.history.pop(); st.used.delete(h.card.id);
    renderCard();
  }
  function skip(){ buzz(6); st.history.push({card:st.current,booked:null,snapshot:snapState()}); st.flipped=false; st.current=pickCard(); st.played++; renderCard(); }
  function flagCard(){ const f=new Set(load(FLAG,[]));f.add(st.current.id);store(FLAG,[...f]);buzz(10);toast("Charge flagged — gone for good.");st.pool=st.pool.filter(c=>c.id!==st.current.id);st.flipped=false;st.current=pickCard();renderCard(); }
  function addPlayer(){ if(st.players.length>=16)return toast("16 is the max, precinct's full."); const n=prompt("New suspect's name:","Player "+(st.players.length+1)); if(n===null)return; st.players.push({name:(n||"Player "+(st.players.length+1)).slice(0,14),points:0,strikes:0,total:0}); buzz(8); renderPriors(); renderBookRow(); }

  function showExhausted(){ releaseWake(); show("exhausted"); }

  // ---------- recap ----------
  function ranked(){ return st.players.map((p,idx)=>({name:p.name,total:p.total,strikes:p.strikes,points:p.points})).sort((a,b)=> b.strikes-a.strikes || b.total-a.total); }
  function winner(){ return st.players.slice().sort((a,b)=> a.strikes-b.strikes || a.total-b.total)[0]; }
  async function drawPoster(){
    try{await document.fonts.ready;}catch{}
    const cv=$("#poster"),x=cv.getContext("2d"),W=cv.width,H=cv.height,R=ranked(),top=R[0],win=winner();
    x.fillStyle="#0E0B1A";x.fillRect(0,0,W,H);
    x.fillStyle="#F4ECD8";round(x,40,40,W-80,H-80,28);x.fill();
    x.fillStyle="#1A1714";x.textAlign="center";
    x.font="900 60px Anton, Impact, sans-serif";x.fillText("WANTED",W/2,140);
    x.font="20px 'Special Elite', monospace";x.fillText("— RAP SHEET · TONIGHT'S DOCKET —",W/2,176);
    x.strokeStyle="#1A1714";x.lineWidth=6;x.strokeRect(W/2-130,206,260,200);
    x.fillStyle="#D7263D";x.font="900 64px Anton, Impact, sans-serif";
    x.fillText((top.name||"—").toUpperCase().slice(0,12),W/2,320);
    x.fillStyle="#1A1714";x.font="22px 'Special Elite', monospace";x.fillText("MOST WANTED",W/2,372);
    x.font="20px 'Special Elite', monospace";x.fillText(`${top.strikes} strikes · ${top.total} charges`,W/2,460);
    x.textAlign="left";x.font="19px 'Special Elite', monospace";let y=520;x.fillText("THE RECORD:",90,y);y+=32;
    R.slice(0,7).forEach(p=>{ x.fillText(p.name.slice(0,16),110,y); const t=`${p.strikes}✦ ${p.total}●`; x.fillText(t,W-110-x.measureText(t).width,y); y+=28; });
    x.textAlign="center";x.fillStyle="#2DE2E6";x.font="22px 'Special Elite', monospace";x.fillText(`🏆 CLEANEST RECORD: ${(win.name||"—")}`,W/2,H-118);
    if(st.highlight){ x.fillStyle="#7a2d8f";x.font="700 14px 'Inter',sans-serif";x.fillText("CHARGE OF THE NIGHT",W/2,H-86); x.fillStyle="#1A1714";x.font="14px 'Inter',sans-serif"; x.fillText("“"+fillTokens(st.highlight.text).slice(0,54)+"”",W/2,H-66); }
    x.fillStyle="#FF2D78";x.font="700 18px 'Inter',sans-serif";x.fillText("RAP SHEET",W/2,H-40);
  }
  function round(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
  function showRecap(){ releaseWake(); const top=ranked()[0]; store(DOCKET,{date:Date.now(),name:top.name,strikes:top.strikes,total:top.total}); drawPoster(); show("recap"); }
  async function sharePoster(){ await drawPoster(); $("#poster").toBlob(async blob=>{ const file=new File([blob],"rap-sheet.png",{type:"image/png"}); if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"RAP SHEET",text:"Tonight's docket 🚔"});return;}catch{}} const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rap-sheet.png";a.click(); },"image/png"); }

  function persist(){ /* session-only by design — no game state stored */ }

  // ---------- start ----------
  function startGame(f){
    f.pps=f.pps||3; f.vibes=f.vibes||[]; if(!f.names)f.names=defaultNames(f.players);
    store(LASTF,{wildness:f.wildness,vibes:f.vibes,baba:f.baba,drinking:f.drinking,exclude:f.exclude,pps:f.pps,players:f.players,includeCustom:f.includeCustom});
    const pool=buildPool(f);
    st={ mode:f.mode||"onephone", filters:f, pool, used:new Set(), exhausted:false, highlight:null, flipped:false,
         players:f.names.map(n=>({name:n,points:0,strikes:0,total:0})), played:1, history:[], current:null };
    st.current=pickCard(); show("game");
    if(!load(COACH,false)) return showCoaching();
    renderCard();
  }
  const defaultNames=n=>Array.from({length:n},(_,i)=>"Player "+(i+1));
  function quickFilters(){ const l=load(LASTF,null); return l?Object.assign({mode:"onephone"},l):{mode:"onephone",players:6,wildness:"classic",vibes:[],baba:false,drinking:false,exclude:[],pps:3}; }

  function showCoaching(){ const o=$("#coach"); o.classList.remove("hidden"); o.onclick=e=>{e.stopPropagation();o.classList.add("hidden");store(COACH,true);renderCard();}; }
  let toastT; function toast(m){ const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),2000); }

  // ===================== WIRING =====================
  function wire(){
    setInlineIcons();
    setTimeout(()=>{ if(!load(AGE,false)) return show("agegate"); enterHome(); },1100);
    $("#ageYes").onclick=()=>{store(AGE,true);enterHome();};
    $("#ageNo").onclick=()=>{ $("#agegate").innerHTML='<div class="lockup-inner"><h2 class="lockup-title" style="color:var(--stamp-high)">COME BACK AT 18</h2><p class="lockup-sub">Adults only. Case dismissed.</p></div>'; };

    $("#btnQuick").onclick=()=>startGame(quickFilters());
    $("#btnStart").onclick=()=>{buildSetup();show("setup");};
    $("#btnGear").onclick=()=>{renderSettings();show("settings");};
    $("#btnResume")&&($("#btnResume").style.display="none");
    $$("[data-go]").forEach(b=>b.onclick=()=> b.dataset.go==="home"?enterHome():show(b.dataset.go));

    $("#cardStage").addEventListener("click",e=>{ if(e.target.closest("#bookRow"))return; tapCard(); });
    $("#btnSkip").onclick=e=>{e.stopPropagation();skip();};
    $("#btnUndo").onclick=e=>{e.stopPropagation();undo();};
    $("#btnFlag").onclick=e=>{e.stopPropagation();flagCard();};
    $("#btnEnd").onclick=e=>{e.stopPropagation();if(confirm("End the night and see tonight's docket?"))showRecap();};
    $("#btnAddP").onclick=e=>{e.stopPropagation();addPlayer();};
    $("#btnPause").onclick=e=>{e.stopPropagation();if(confirm("Pause & head home?"))enterHome();};
    $("#btnGearGame").onclick=e=>{e.stopPropagation();renderSettings();show("settings");};

    $("#btnLockContinue").onclick=()=>{show("game");const f=st._afterLock;st._afterLock=null;f?f():renderCard();};
    $("#btnReshuffle").onclick=()=>{st.played++;st.flipped=false;st.current=pickCard();show("game");renderCard();};
    $("#btnExhaustEnd").onclick=()=>showRecap();
    $("#btnShare").onclick=sharePoster;
    $("#btnAgain").onclick=()=>startGame(st.filters);
    $("#btnRecapHome").onclick=enterHome;

    // baba warning
    $("#babaBack").onclick=()=>{ $("#babaWarn").classList.add("hidden"); st._pendingBaba=false; refreshDealLabel(); };
    $("#babaGo").onclick=()=>{ $("#babaWarn").classList.add("hidden"); st._pendingBaba=true; $("#babaChip").classList.add("on"); refreshDealLabel(); };
  }

  function setInlineIcons(){
    const map={btnSkip:"skip",btnUndo:"undo",btnFlag:"flag",btnEnd:"end",btnPause:"pause",btnAddP:"add",btnGearGame:"gear",btnGear:"gear",btnShare:"share"};
    for(const[id,ic]of Object.entries(map)){ const el=$("#"+id); if(!el)continue; const label=el.dataset.label||el.textContent.replace(/^[^\w]*/,"").trim(); el.innerHTML=I[ic]+(label?`<span>${label}</span>`:""); }
  }

  function enterHome(){
    const ret=!!load(LASTF,null)||!!load(DOCKET,null);
    $("#homeTag").textContent=ret?"Back again, repeat offender.":"your friends commit crimes. the game keeps a record.";
    const d=load(DOCKET,null),mw=$("#memory");
    if(d){mw.classList.remove("hidden");mw.textContent=`Last time, ${d.name} was Most Wanted (${d.strikes} strikes). The court remembers.`;}else mw.classList.add("hidden");
    show("home");
  }

  // ---------- settings ----------
  function renderSettings(){ bindToggle("#hapticToggle","haptics");bindToggle("#wakeToggle","wake");bindToggle("#soundToggle","sound"); renderCustomList(); $("#addCardBtn").onclick=addCustomCard; }
  function bindToggle(sel,key){ const el=$(sel);el.classList.toggle("on",!!settings[key]);el.onclick=()=>{settings[key]=!settings[key];el.classList.toggle("on",settings[key]);store(SET,settings);buzz(8);}; }
  function addCustomCard(){ const ta=$("#customText"),txt=ta.value.trim(); if(!txt)return toast("Type a charge first."); if(txt.length>140)return toast("Under 140 characters."); if(BLOCK.test(txt))return toast("Keep it out of the felony-felony zone."); const list=customCards(); list.push({id:9000+list.length+Math.floor(Math.random()*900),type:$("#customType").value,spice:+$("#customSpice").value,text:txt,custom:true}); store(CUSTOM,list);ta.value="";renderCustomList();buzz(10);toast("Charge filed — it sticks with you."); }
  function renderCustomList(){ const box=$("#customList"),list=customCards();box.innerHTML=""; if(!list.length){box.innerHTML='<p class="hint">No custom charges yet. Write one — it stays saved and shuffles into every game.</p>';return;} list.forEach((c,idx)=>{const row=document.createElement("div");row.className="custom-row";row.innerHTML=`<span>${esc(c.text)}</span>`;const del=document.createElement("button");del.className="custom-del";del.textContent="✕";del.onclick=()=>{const l=customCards();l.splice(idx,1);store(CUSTOM,l);renderCustomList();};row.appendChild(del);box.appendChild(row);}); }

  // ---------- setup ----------
  function buildSetup(){
    // device mode
    $$("#deviceMode button").forEach(b=>b.onclick=()=>{ $$("#deviceMode button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); $("#multiNote").classList.toggle("hidden",b.dataset.val!=="multi"); });
    // players + names
    window._lastN=window._lastN||4; renderNameList();
    $("#fewer").onclick=()=>{ window._lastN=Math.max(3,window._lastN-1); renderNameList(); };
    $("#more").onclick=()=>{ window._lastN=Math.min(16,window._lastN+1); renderNameList(); };
    // wildness
    $$("#wildness button").forEach(b=>b.onclick=()=>{ $$("#wildness button").forEach(x=>x.classList.remove("on"));b.classList.add("on");$("#wildHint").textContent={chill:"nothing nuclear. sober-safe.",classic:"light profanity, the good stuff.",unhinged:"no holds barred. 18+ energy."}[b.dataset.val]; });
    // vibes
    st={...(st||{}),_pendingBaba:false}; renderVibes();
    // off-limits (presets + custom)
    const ol=$("#offlimits");ol.innerHTML=""; OFFLIMITS.forEach(([v,l])=>{const b=document.createElement("button");b.textContent=l;b.dataset.val=v;b.onclick=()=>b.classList.toggle("on");ol.appendChild(b);});
    $("#addOff").onclick=()=>{ const v=$("#offInput").value.trim().toLowerCase().slice(0,20); if(!v)return; const b=document.createElement("button");b.textContent=v;b.dataset.val=v;b.classList.add("on");b.onclick=()=>b.parentElement.removeChild(b);ol.appendChild(b);$("#offInput").value=""; };
    // pps stepper
    window._pps=window._pps||3; $("#ppsVal").textContent=window._pps;
    $("#ppsDown").onclick=()=>{window._pps=Math.max(1,window._pps-1);$("#ppsVal").textContent=window._pps;};
    $("#ppsUp").onclick=()=>{window._pps=Math.min(10,window._pps+1);$("#ppsVal").textContent=window._pps;};
    // drinking + custom-cards include
    toggle("#drinkToggle"); $("#customInclude").classList.toggle("on",customCards().length>0); $("#customInclude").onclick=()=>$("#customInclude").classList.toggle("on");
    $("#customCount").textContent=customCards().length?`(${customCards().length} saved)`:"(none yet)";
    refreshDealLabel();
    $("#btnDeal").onclick=deal;
  }
  function toggle(sel){ const t=$(sel);t.classList.remove("on");t.onclick=()=>t.classList.toggle("on"); }
  function renderNameList(){
    $("#playerNum").textContent=window._lastN;
    const box=$("#nameList");box.innerHTML="";
    for(let i=0;i<window._lastN;i++){ const inp=document.createElement("input");inp.className="name-input";inp.maxLength=14;inp.placeholder="Player "+(i+1);inp.value=window._names&&window._names[i]||"";inp.dataset.i=i;box.appendChild(inp); }
    $("#bigNote").classList.toggle("hidden",window._lastN<=8);
  }
  function renderVibes(){
    const base=$("#vibeChips");base.innerHTML="";
    $("#babaChip").classList.toggle("on",!!st._pendingBaba);
    $("#babaChip").onclick=()=>{ if(st._pendingBaba){st._pendingBaba=false;$("#babaChip").classList.remove("on");refreshDealLabel();} else { $("#babaWarn").classList.remove("hidden"); } };
    const mk=(v)=>{const b=document.createElement("button");b.textContent=v;b.onclick=()=>{b.classList.toggle("on");refreshDealLabel();};return b;};
    VIBES_BASE.forEach(v=>base.appendChild(mk(v)));
    const more=$("#vibeMore");more.innerHTML="";
    VIBES_MORE.forEach(v=>more.appendChild(mk(v)));
    $("#moreVibesBtn").onclick=()=>{ more.classList.toggle("hidden"); $("#moreVibesBtn").textContent=more.classList.contains("hidden")?"+ more vibe packs":"– fewer"; };
  }
  function selectedVibes(){ const sel=$$("#vibeChips button.on, #vibeMore button.on").map(b=>b.textContent.toLowerCase()); return sel; }
  function refreshDealLabel(){ const n=selectedVibes().length+(st&&st._pendingBaba?1:0); $("#vibeHint").textContent = st&&st._pendingBaba?"⚠ BABA armed — top 3 vibes weighted heavy, the rest light.":(n>3?"top 3 weighted heavy · the rest sprinkled lightly":"pick as many as you want — top 3 hit hardest"); }
  function deal(){
    const names=$$("#nameList .name-input").map((inp,i)=>(inp.value.trim()||"Player "+(i+1)).slice(0,14));
    window._names=names;
    let vibes=selectedVibes();
    const exclude=$$("#offlimits button.on").map(b=>b.dataset.val);
    const mode=($("#deviceMode button.on")||{dataset:{}}).dataset.val||"onephone";
    if(mode==="multi") toast("Online rooms aren't live yet — playing on this phone.");
    startGame({ mode:"onephone",
      players:names.length, names,
      wildness:($("#wildness button.on")||{dataset:{}}).dataset.val||"classic",
      vibes, baba:!!(st&&st._pendingBaba),
      drinking:$("#drinkToggle").classList.contains("on"),
      exclude, pps:window._pps||3,
      includeCustom:$("#customInclude").classList.contains("on") });
  }

  document.addEventListener("DOMContentLoaded",wire);
})();
