/* RAP SHEET v1.3 — engine + P2P lobbies. On-device for single-phone; PeerJS for multi. */
(() => {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const SET="rapsheet.settings",SEEN="rapsheet.seen",FLAG="rapsheet.flagged",CUSTOM="rapsheet.customcards",
        DOCKET="rapsheet.lastdocket",LASTF="rapsheet.lastfilters",AGE="rapsheet.ageok",COACH="rapsheet.coached";
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
  const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
  const settings=Object.assign({haptics:true,wake:true,sound:false},load(SET,{}));
  const seen=load(SEEN,{});
  const BLOCK=/\b(n[i1]gg|f[a4]gg|r[e3]t[a4]rd|k[i1]ke|sp[i1]c|ch[i1]nk|tr[a4]nn|k[i1]ll\s*your)\w*/i;
  const WILD={chill:2,classic:3,unhinged:5};
  const VIBES_BASE=["Sports","College","Couples","Movies","Work crew","Gym","Gamers","Book club"];
  const VIBES_MORE=["Music","Food","Travel","Tech","Anime","Reality TV","Cars","Crypto","Parenting","Roommates","High school","Hometown","Exes","Money","Festivals","Hookups","Astrology","True crime","Streaming","Group chat","Frat life","Family","Politics","Fashion","Fitness","Coworkers"];
  const OFFLIMITS=[["exes","Exes"],["body","Looks / body"],["money","Money"]];
  const ICE={iceServers:[
    {urls:"stun:stun.l.google.com:19302"},
    {urls:"turn:openrelay.metered.ca:80",username:"openrelayproject",credential:"openrelayproject"},
    {urls:"turn:openrelay.metered.ca:443",username:"openrelayproject",credential:"openrelayproject"},
    {urls:"turn:openrelay.metered.ca:443?transport=tcp",username:"openrelayproject",credential:"openrelayproject"}
  ]};
  const I={skip:'<svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zM16 5h3v14h-3z"/></svg>',undo:'<svg viewBox="0 0 24 24"><path d="M12 5V2L7 7l5 5V8a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9z"/></svg>',flag:'<svg viewBox="0 0 24 24"><path d="M6 3v18H4V3zM7 4h11l-2 4 2 4H7z"/></svg>',end:'<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',pause:'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',add:'<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',gear:'<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2-1.2.3-2.3-2.2-.8-1-2.1-2.3.5L12 2.5 10.2 4l-2.3-.5-1 2.1-2.2.8.3 2.3L3 12l2 1.2-.3 2.3 2.2.8 1 2.1 2.3-.5L12 21.5 13.8 20l2.3.5 1-2.1 2.2-.8-.3-2.3z"/></svg>',share:'<svg viewBox="0 0 24 24"><path d="M16 5l-1.4 1.4L16.2 8H9a6 6 0 0 0 0 12h2v-2H9a4 4 0 0 1 0-8h7.2l-1.6 1.6L16 13l4-4z"/></svg>',check:'<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>'};

  let st=null,wakeLock=null,audioCtx=null;
  const net={role:null,peer:null,conns:[],hostConn:null,code:null,myIdx:0,lobby:[],settings:null,lastNonce:0};

  function show(id){$$(".screen").forEach(s=>s.classList.remove("active"));$("#"+id).classList.add("active");id==="game"?requestWake():releaseWake();}
  function buzz(ms){if(settings.haptics&&navigator.vibrate)navigator.vibrate(ms);}
  function blip(f=440,d=.06){if(!settings.sound)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="triangle";o.frequency.value=f;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(.18,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.start();o.stop(audioCtx.currentTime+d);}catch{}}
  async function requestWake(){if(settings.wake&&"wakeLock"in navigator){try{wakeLock=await navigator.wakeLock.request("screen");}catch{}}try{await screen.orientation.lock("portrait");}catch{}}
  function releaseWake(){try{wakeLock&&wakeLock.release();wakeLock=null;}catch{}}
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&$("#game").classList.contains("active"))requestWake();});

  const felony=c=>c.spice>=4&&c.type!=="power";
  const isPower=c=>c.type==="power";
  const isBook=c=>!isPower(c)&&c.book!==false&&c.type!=="group";
  const customCards=()=>load(CUSTOM,[]);
  const isMP=()=>!!(st&&st.net);
  const isHost=()=>isMP()&&st.net.role==="host";
  const isClient=()=>isMP()&&st.net.role==="client";

  // ---------- deck ----------
  function buildPool(f){
    const ceil=f.baba?5:WILD[f.wildness];
    const flagged=new Set(load(FLAG,[]));
    const exclude=(f.exclude||[]).map(s=>s.toLowerCase());
    const all=window.CARDS.concat(f.includeCustom!==false?customCards():[]);
    const ok=(c,relax)=>{
      if(flagged.has(c.id))return false;
      if(isPower(c))return f.mode!=="multi";              // held tokens are single-phone only
      if(c.baba&&!f.baba)return false;
      if(c.spice>(relax.ceil??ceil))return false;
      if((c.minPlayers||2)>f.players)return false;
      if(!relax.dropTopics){
        if(c.topics&&c.topics.some(t=>exclude.includes(t)))return false;
        if(exclude.some(w=>w.length>2&&c.text.toLowerCase().includes(w)))return false;
      }
      if(!f.vibes.length&&c.usesKeyword&&!relax.allowKw)return false;
      return true;
    };
    let pool=all.filter(c=>ok(c,{}));
    const rl=[{allowKw:true},{allowKw:true,dropTopics:true},{allowKw:true,dropTopics:true,ceil:5}];
    for(let i=0;pool.filter(c=>!isPower(c)).length<24&&i<rl.length;i++)pool=all.filter(c=>ok(c,rl[i]));
    return pool.length?pool:all.slice();
  }
  function vibeWeight(c,f){
    if(!f.vibes.length)return 1;
    const top=f.vibes.slice(0,3).map(v=>v.toLowerCase()),rest=f.vibes.slice(3).map(v=>v.toLowerCase());
    const hit=arr=>arr.some(v=>(c.themes&&c.themes.some(t=>v.includes(t)||t.includes(v)))||c.usesKeyword);
    if(hit(top))return 3;if(hit(rest))return 1.4;return 1;
  }
  function pickCard(){
    const powers=st.pool.filter(c=>isPower(c)&&!st.used.has(c.id));
    if(powers.length&&st.played>4&&Math.random()<0.03){const p=powers[Math.floor(Math.random()*powers.length)];st.used.add(p.id);return p;}
    const f=st.filters,ceil=f.baba?5:WILD[f.wildness];
    const prog=Math.min(1,st.played/22),target=f.baba?5:1+(ceil-1)*prog;
    let cand=st.pool.filter(c=>!st.used.has(c.id)&&!isPower(c));
    if(!cand.length){st.used.forEach(id=>{if(!st.pool.find(c=>c.id===id&&isPower(c)))st.used.delete(id);});st.exhausted=true;cand=st.pool.filter(c=>!isPower(c));}
    const now=Date.now();
    const w=cand.map(c=>{const close=1/(1+Math.abs(c.spice-target));const last=seen[c.id]||0,rec=Math.min(1,(now-last)/(1000*60*60*36));let m=vibeWeight(c,f);if(f.baba&&c.baba)m*=6;return close*(0.25+0.75*rec)*m;});
    let r=Math.random()*w.reduce((a,b)=>a+b,0),pick=cand[0];
    for(let i=0;i<cand.length;i++){r-=w[i];if(r<=0){pick=cand[i];break;}}
    st.used.add(pick.id);seen[pick.id]=now;store(SEEN,seen);return pick;
  }

  // ---------- tokens / text ----------
  function names(){return st.players.map(p=>p.name);}
  function pickVibe(){const v=st.filters.vibes;if(!v.length)return"the usual suspect";return v[Math.floor(Math.random()*Math.min(3,v.length))];}
  function randNames(n){const pool=names().slice();const out=[];for(let i=0;i<n&&pool.length;i++)out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);return out;}
  function fillTokens(t){
    if(isMP()){ // distributed: relative targets -> real names
      const need=(t.match(/\{left\}|\{right\}|\{across\}|\{holder\}/g)||[]).length;
      const ns=randNames(Math.max(need,1));let k=0;
      return t.replace(/\{left\}|\{right\}|\{across\}|\{holder\}/g,()=>ns[k++%ns.length]||"someone").replace(/\{keyword\}/g,pickVibe());
    }
    return t.replace(/\{left\}/g,"the person on your left").replace(/\{right\}/g,"the person on your right").replace(/\{across\}/g,"the person across from you").replace(/\{holder\}/g,"whoever's holding this phone").replace(/\{keyword\}/g,pickVibe());
  }
  function targetText(c){if(isMP())return"→ tap who's booked";if(/\{left\}/.test(c.text))return"→ on your left";if(/\{right\}/.test(c.text))return"→ on your right";if(/\{across\}/.test(c.text))return"→ across from you";if(/\{holder\}/.test(c.text))return"→ the phone holder";if(c.type==="group")return"→ everyone";return"→ the room decides";}
  function setCurrent(card){st.current=card;st.resolvedText=fillTokens(card.text);st.targetText=isPower(card)?"→ your call":targetText(card);}

  // ---------- render ----------
  function fitText(el){el.style.fontSize="40px";let s=40;while(el.scrollHeight>el.clientHeight+2&&s>18){s-=2;el.style.fontSize=s+"px";}}
  function renderCard(){
    const c=st.current,card=$("#rapcard"),fel=felony(c),pow=isPower(c);
    card.classList.toggle("felony",fel);card.classList.toggle("power",pow);card.classList.toggle("facedown",!st.flipped);
    const canAct=!isClient()||true;
    $("#tapHint").textContent=!st.flipped?"tap to flip the charge":(isBook(c)||pow||c.choice?"read it aloud · then send it below":"read it aloud · tap card to continue");
    if(!st.flipped){renderPriors();maybeBroadcast();return;}
    $("#cardStamp").innerHTML=(pow?"COURT ORDER":fel?"FELONY":c.spice>=3?"MISDEMEANOR":"PETTY OFFENSE")+` <span class="pips">${"●".repeat(Math.min(c.spice||1,5))}</span>`;
    $("#caseNo").textContent=String(1000+st.played*7%8999).padStart(5,"0");
    const charge=$("#chargeText");charge.textContent=st.resolvedText;
    $("#targetLine").textContent=st.targetText;
    $("#stakesStamp").textContent=pow?"POWER":fel?"+2 PTS":"+1 PT";
    const dr=$("#drinkRow");if(st.filters.drinking&&!pow){dr.classList.remove("hidden");dr.textContent=fel?"🍺 Two big sips — or finish it.":"🍺 That's a sip.";}else dr.classList.add("hidden");
    requestAnimationFrame(()=>fitText(charge));
    renderBookRow();renderPriors();maybeBroadcast();
  }
  function renderBookRow(){
    const c=st.current,row=$("#bookRow"),chips=$("#bookChips");chips.innerHTML="";
    const cs=$("#confirmSend");if(cs)cs.classList.remove("on");
    const lab=t=>$("#bookRow .book-label").textContent=t;
    if(isPower(c)){row.classList.remove("hidden");lab(c.power==="pardon"?"Hand the PARDON token to…":"Hand the DEFLECT token to…");st.players.forEach((p,i)=>chips.append(nameChip(p,i,()=>selectTarget(i,()=>grantToken(i,c.power)))));return;}
    if(c.choice){row.classList.remove("hidden");lab("Double or nothing?");const safe=wideBtn("Let it ride",()=>advance());const dbl=wideBtn("⚡ Double — book +2",()=>{lab("Book +2 onto who?");chips.innerHTML="";st.players.forEach((p,i)=>chips.append(nameChip(p,i,()=>selectTarget(i,()=>commitBook(i,2)))));});chips.append(safe,dbl);return;}
    if(isBook(c)){row.classList.remove("hidden");lab(c.type==="thisorthat"?"Who lost the vote?":c.type==="dare"?"Who chickened out? (or tap card if they did it)":"Who's getting booked?");st.players.forEach((p,i)=>chips.append(nameChip(p,i,()=>selectTarget(i,()=>commitBook(i,fel(c)?2:1)))));return;}
    row.classList.add("hidden");
    function fel(x){return felony(x);}
  }
  function nameChip(p,i,fn){const b=document.createElement("button");b.className="namechip";b.innerHTML=`<span>${esc(p.name)}</span>`;b.dataset.i=i;b.onclick=e=>{e.stopPropagation();fn();};return b;}
  function wideBtn(label,fn){const b=document.createElement("button");b.className="namechip wide";b.textContent=label;b.onclick=e=>{e.stopPropagation();fn();};return b;}
  function selectTarget(i,confirmFn){
    $$("#bookChips .namechip").forEach(b=>b.classList.toggle("selected",+b.dataset.i===i));
    let cb=$("#confirmSend");if(!cb){cb=document.createElement("button");cb.id="confirmSend";cb.className="confirm-send";$("#bookRow").appendChild(cb);}
    const tgt=st.players[i];
    cb.innerHTML=`${I.check}<span>Send charge to ${esc(tgt.name)}</span>`;cb.classList.add("on");
    cb.onclick=e=>{e.stopPropagation();cb.classList.remove("on");buzz(14);confirmFn();};
    // deflect option (single-phone only)
    let df=$("#deflectBtn");if(df)df.remove();
    if(!isMP()&&tgt.tokens&&tgt.tokens.deflect>0){
      df=document.createElement("button");df.id="deflectBtn";df.className="confirm-send deflect on";
      df.innerHTML=`🛡 ${esc(tgt.name)} burns a DEFLECT → pick new victim`;
      df.onclick=e=>{e.stopPropagation();tgt.tokens.deflect--;cb.classList.remove("on");df.remove();buzz([15,25]);
        $("#bookRow .book-label").textContent="Deflected! Who takes it instead?";const chips=$("#bookChips");chips.innerHTML="";
        st.players.forEach((p,j)=>{if(j!==i)chips.append(nameChip(p,j,()=>selectTarget(j,()=>commitBook(j,1))));});};
      $("#bookRow").appendChild(df);
    }
  }
  function renderPriors(){
    const strip=$("#priorsStrip");strip.innerHTML="";
    st.players.forEach((p,i)=>{
      const el=document.createElement("div");el.className="prior-pip"+(isMP()&&i===st.net.myIdx?" me":"");
      const strikes=p.strikes?`<span class="strk">${"✦".repeat(p.strikes)}</span>`:"";
      const tk=p.tokens?`${"🔑".repeat(p.tokens.pardon||0)}${"🛡".repeat(p.tokens.deflect||0)}`:"";
      el.innerHTML=`<b>${esc(p.name)}</b><span class="dots">${"●".repeat(p.points)}</span>${strikes}${tk?`<span class="tok">${tk}</span>`:""}`;
      if(!isMP()&&p.tokens&&p.tokens.pardon>0)el.querySelector(".tok").onclick=ev=>{ev.stopPropagation();spendPardon(i);};
      strip.appendChild(el);
    });
  }
  const esc=s=>String(s).replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));

  // ---------- actions (entry points route to host when client) ----------
  function tapCard(){
    const c=st.current;
    if(!st.flipped){ if(isClient())return mpDo("flip"); st.flipped=true;buzz(10);blip(c&&felony(c)?180:520,.06);renderCard();return; }
    if(isPower(c)||c.choice||isBook(c))return;
    if(isClient())return mpDo("next");
    advance();
  }
  function advance(){buzz(8);nextCard();}
  const snapState=()=>st.players.map(p=>({points:p.points,strikes:p.strikes,total:p.total,tokens:p.tokens?{...p.tokens}:undefined}));
  function nextCard(snap){
    st.history.push(snap||{card:st.current,booked:null,snapshot:snapState()});if(st.history.length>1)st.history.shift();
    if(st.exhausted){st.exhausted=false;return showExhausted();}
    st.played++;st.flipped=false;setCurrent(pickCard());renderCard();
  }
  function commitBook(i,n){ if(isClient())return mpDo("book",{i,n}); assignPoints(i,n); }
  function assignPoints(i,n){
    const c=st.current,snap={card:c,booked:i,snapshot:snapState()};
    const p=st.players[i];p.points+=n;p.total+=n;
    if(!st.highlight||c.spice>=(st.highlight.spice||0))st.highlight=c;
    st.charged={idx:i,nonce:Date.now(),text:st.resolvedText};
    buzz(n>=2?[25,40,25]:18);
    if(p.points>=st.filters.pps){p.points-=st.filters.pps;p.strikes++;st._afterLock=()=>nextCard(snap);if(isHost())mpSendCharged();broadcast();return strikeScreen(p.name,p.strikes);}
    if(isHost())mpSendCharged();
    nextCard(snap);
  }
  function grantToken(i,kind){const snap={card:st.current,booked:i,snapshot:snapState()};const p=st.players[i];p.tokens=p.tokens||{pardon:0,deflect:0};p.tokens[kind]++;toast(`${p.name} pockets a ${kind==="pardon"?"🔑 Pardon":"🛡 Deflect"} token.`);buzz([18,28]);nextCard(snap);}
  function spendPardon(i){const p=st.players[i];if(!p.tokens||p.tokens.pardon<1)return;p.tokens.pardon--;if(p.points>0)p.points--;else if(p.strikes>0)p.strikes--;toast(`${p.name} burns a Pardon — record eased.`);buzz([15,20]);renderPriors();}
  function strikeScreen(name,n){$("#lockupWho").textContent=name;$("#lockupSub").textContent=st.filters.drinking?`Strike ${n}. Finish your drink — the record grows.`:`Strike ${n}. Take the crown of shame for a round.`;show("lockup");}
  function undo(){if(isMP())return;const h=st.history[st.history.length-1];if(!h)return;buzz(8);if(h.snapshot)st.players.forEach((p,i)=>{p.points=h.snapshot[i].points;p.strikes=h.snapshot[i].strikes;p.total=h.snapshot[i].total;if(h.snapshot[i].tokens)p.tokens=h.snapshot[i].tokens;});setCurrent(h.card);st.flipped=true;st.played=Math.max(0,st.played-1);st.history.pop();st.used.delete(h.card.id);renderCard();}
  function skip(){if(isClient())return mpDo("skip");buzz(6);st.history.push({card:st.current,booked:null,snapshot:snapState()});st.flipped=false;st.played++;setCurrent(pickCard());renderCard();}
  function flagCard(){if(isMP())return;const f=new Set(load(FLAG,[]));f.add(st.current.id);store(FLAG,[...f]);buzz(10);toast("Charge flagged — gone for good.");st.pool=st.pool.filter(c=>c.id!==st.current.id);st.flipped=false;setCurrent(pickCard());renderCard();}
  function addPlayer(){if(isMP())return toast("In a lobby, players join with the code.");if(st.players.length>=16)return toast("16 max — precinct's full.");const n=prompt("New suspect's name:","Player "+(st.players.length+1));if(n===null)return;st.players.push(mkPlayer((n||"Player "+(st.players.length+1)).slice(0,14)));buzz(8);renderPriors();renderBookRow();}
  const mkPlayer=name=>({name,points:0,strikes:0,total:0,tokens:{pardon:0,deflect:0}});

  function showExhausted(){releaseWake();if(isHost())broadcast({over:"exhausted"});show("exhausted");}

  // ---------- recap ----------
  function ranked(){return st.players.map(p=>({name:p.name,total:p.total,strikes:p.strikes})).sort((a,b)=>b.strikes-a.strikes||b.total-a.total);}
  function winner(){return st.players.slice().sort((a,b)=>a.strikes-b.strikes||a.total-b.total)[0];}
  async function drawPoster(){
    try{await document.fonts.ready;}catch{}
    const cv=$("#poster"),x=cv.getContext("2d"),W=cv.width,H=cv.height,R=ranked(),top=R[0]||{name:"—",strikes:0,total:0},win=winner()||{name:"—"};
    x.fillStyle="#0E0B1A";x.fillRect(0,0,W,H);x.fillStyle="#F4ECD8";round(x,40,40,W-80,H-80,28);x.fill();
    x.fillStyle="#1A1714";x.textAlign="center";x.font="900 60px Anton, Impact, sans-serif";x.fillText("WANTED",W/2,140);
    x.font="20px 'Special Elite', monospace";x.fillText("— RAP SHEET · TONIGHT'S DOCKET —",W/2,176);
    x.strokeStyle="#1A1714";x.lineWidth=6;x.strokeRect(W/2-130,206,260,200);
    x.fillStyle="#D7263D";x.font="900 64px Anton, Impact, sans-serif";x.fillText((top.name||"—").toUpperCase().slice(0,12),W/2,320);
    x.fillStyle="#1A1714";x.font="22px 'Special Elite', monospace";x.fillText("MOST WANTED",W/2,372);
    x.font="20px 'Special Elite', monospace";x.fillText(`${top.strikes} strikes · ${top.total} charges`,W/2,460);
    x.textAlign="left";x.font="19px 'Special Elite', monospace";let y=520;x.fillText("THE RECORD:",90,y);y+=32;
    R.slice(0,7).forEach(p=>{x.fillText(p.name.slice(0,16),110,y);const t=`${p.strikes}✦ ${p.total}●`;x.fillText(t,W-110-x.measureText(t).width,y);y+=28;});
    x.textAlign="center";x.fillStyle="#2DE2E6";x.font="22px 'Special Elite', monospace";x.fillText(`🏆 CLEANEST RECORD: ${win.name||"—"}`,W/2,H-118);
    if(st.highlight){x.fillStyle="#7a2d8f";x.font="700 14px 'Inter',sans-serif";x.fillText("CHARGE OF THE NIGHT",W/2,H-86);x.fillStyle="#1A1714";x.font="14px 'Inter',sans-serif";x.fillText("“"+fillTokens(st.highlight.text).slice(0,54)+"”",W/2,H-66);}
    x.fillStyle="#FF2D78";x.font="700 18px 'Inter',sans-serif";x.fillText("RAP SHEET",W/2,H-40);
  }
  function round(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
  function showRecap(){if(isClient())return mpDo("end");releaseWake();const top=ranked()[0];if(top)store(DOCKET,{date:Date.now(),name:top.name,strikes:top.strikes,total:top.total});if(isHost())broadcast({over:"recap"});drawPoster();show("recap");}
  async function sharePoster(){await drawPoster();$("#poster").toBlob(async blob=>{const file=new File([blob],"rap-sheet.png",{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"RAP SHEET",text:"Tonight's docket 🚔"});return;}catch{}}const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rap-sheet.png";a.click();},"image/png");}

  // ===================== NETWORKING (PeerJS) =====================
  const CODECHARS="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const genCode=()=>Array.from({length:4},()=>CODECHARS[Math.floor(Math.random()*CODECHARS.length)]).join("");
  const peerId=code=>"rapsheet-v1-"+code;

  function lobbyStatus(msg,bad){const el=$("#lobbyStatus");if(el){el.textContent=msg;el.classList.toggle("bad",!!bad);}}

  function hostLobby(stg){
    if(!window.Peer)return toast("Connection library failed to load — check signal.");
    net.role="host";net.settings=stg;net.lobby=[{id:"host",name:stg.hostName||"Host"}];net.conns=[];
    const code=genCode();net.code=code;
    showLobbyRoom(true);lobbyStatus("Opening lobby…");
    try{net.peer&&net.peer.destroy();}catch{}
    net.peer=new Peer(peerId(code),{config:ICE});
    net.peer.on("open",()=>{lobbyStatus("Lobby open. Share the code.");renderLobby();});
    net.peer.on("error",e=>{ if((e&&e.type)==="unavailable-id"){return hostLobby(stg);} lobbyStatus("Connection error: "+(e&&e.type||e),true); });
    net.peer.on("connection",conn=>{
      conn.on("open",()=>{});
      conn.on("data",d=>onHostData(conn,d));
      conn.on("close",()=>{net.conns=net.conns.filter(c=>c!==conn);net.lobby=net.lobby.filter(p=>p.id!==conn.peer);renderLobby();broadcastLobby();});
      net.conns.push(conn);
    });
  }
  function onHostData(conn,d){
    if(d.t==="hello"){
      if(!net.lobby.find(p=>p.id===conn.peer))net.lobby.push({id:conn.peer,name:(d.name||"Player").slice(0,14)});
      const idx=net.lobby.findIndex(p=>p.id===conn.peer);
      conn.send({t:"welcome",idx,code:net.code});
      renderLobby();broadcastLobby();
      if(st&&$("#game").classList.contains("active")){conn.send({t:"state",s:serialize()});} // late join sees game
    } else if(d.t==="do"){ onClientDo(d.a,d.p); }
  }
  function broadcastLobby(){net.conns.forEach(c=>{try{c.send({t:"lobby",players:net.lobby});}catch{}});}
  function onClientDo(a,p){
    if(!isHost())return;
    if(a==="flip"){if(!st.flipped){st.flipped=true;renderCard();}}
    else if(a==="next"){advance();}
    else if(a==="book"){assignPoints(p.i,p.n||1);}
    else if(a==="skip"){skip();}
    else if(a==="end"){showRecap();}
  }
  function serialize(){
    const c=st.current;
    return {players:st.players.map(p=>({name:p.name,points:p.points,strikes:p.strikes,total:p.total})),
      text:st.resolvedText,type:c.type,spice:c.spice||1,power:c.power||null,choice:!!c.choice,
      target:st.targetText,flipped:st.flipped,pps:st.filters.pps,drinking:st.filters.drinking,played:st.played,
      charged:st.charged||null};
  }
  function maybeBroadcast(){if(isHost())broadcast();}
  function broadcast(extra){const msg=Object.assign({t:"state",s:serialize()},extra||{});net.conns.forEach(c=>{try{c.send(msg);}catch{}});}
  function mpSendCharged(){/* charged is inside serialized state via nonce */}

  function joinLobby(code,name){
    if(!window.Peer)return toast("Connection library failed to load — check signal.");
    net.role="client";net.myName=name;net.code=code;
    showLobbyRoom(false);lobbyStatus("Connecting…");
    try{net.peer&&net.peer.destroy();}catch{}
    net.peer=new Peer({config:ICE});
    net.peer.on("open",()=>{
      const conn=net.peer.connect(peerId(code),{reliable:true});net.hostConn=conn;
      conn.on("open",()=>{lobbyStatus("Connected — waiting for host…");conn.send({t:"hello",name});});
      conn.on("data",d=>onClientData(d));
      conn.on("close",()=>lobbyStatus("Lost connection to host.",true));
      conn.on("error",e=>lobbyStatus("Error: "+(e&&e.type||e),true));
    });
    net.peer.on("error",e=>lobbyStatus( (e&&e.type)==="peer-unavailable" ? "No lobby with that code." : "Connection error.",true));
    setTimeout(()=>{ if(net.role==="client"&&!net.gotWelcome) lobbyStatus("Still connecting… some networks are slow. Hang tight.",false); },6000);
  }
  function onClientData(d){
    if(d.t==="welcome"){net.gotWelcome=true;net.myIdx=d.idx;net.code=d.code;lobbyStatus("In the lobby. Waiting for host to start…");}
    else if(d.t==="lobby"){net.lobby=d.players;renderLobby();}
    else if(d.t==="state"){ applyState(d); }
  }
  function applyState(d){
    const s=d.s;
    if(!st){st={net:{role:"client",myIdx:net.myIdx},filters:{},history:[]};}
    st.net={role:"client",myIdx:net.myIdx};
    st.players=s.players.map(p=>({name:p.name,points:p.points,strikes:p.strikes,total:p.total,tokens:{pardon:0,deflect:0}}));
    st.current={type:s.type,spice:s.spice,power:s.power,choice:s.choice,text:s.text};
    st.resolvedText=s.text;st.targetText=s.target;st.flipped=s.flipped;st.filters.pps=s.pps;st.filters.drinking=s.drinking;st.played=s.played;
    if(d.over==="recap"){return showRecap();}
    if(d.over==="exhausted"){return show("exhausted");}
    if(!$("#game").classList.contains("active"))show("game");
    renderCard();
    if(s.charged&&s.charged.idx===net.myIdx&&s.charged.nonce!==net.lastNonce){net.lastNonce=s.charged.nonce;flashCharged(s.charged.text);}
  }
  function flashCharged(text){const f=$("#chargedFlash");$("#chargedText").textContent=text||"You've been charged.";f.classList.remove("hidden");buzz([40,60,40]);f.onclick=()=>f.classList.add("hidden");setTimeout(()=>f.classList.add("hidden"),3500);}

  function renderLobby(){
    const list=$("#lobbyPlayers");if(list){list.innerHTML="";(net.lobby||[]).forEach((p,i)=>{const el=document.createElement("div");el.className="lobby-player";el.innerHTML=`<span class="lp-dot"></span><span>${esc(p.name)}</span>${i===0?'<span class="lp-host">HOST</span>':''}`;list.appendChild(el);});}
    $("#lobbyCount")&&($("#lobbyCount").textContent=(net.lobby||[]).length);
  }
  function showLobbyRoom(host){
    $("#lobbyCode").textContent=net.code;
    const url=location.origin+location.pathname+"?join="+net.code;
    $("#lobbyLink").textContent=url;
    $("#lobbyStart").classList.toggle("hidden",!host);
    $("#lobbyWait").classList.toggle("hidden",host);
    renderLobby();show("lobbyRoom");
  }
  function startHostGame(){
    const stg=net.settings;const f=Object.assign({},stg,{mode:"multi",players:net.lobby.length,names:net.lobby.map(p=>p.name)});
    f.pps=f.pps||3;f.vibes=f.vibes||[];
    const pool=buildPool(f);
    st={mode:"multi",net:{role:"host",myIdx:0},filters:f,pool,used:new Set(),exhausted:false,highlight:null,flipped:false,
        players:net.lobby.map(p=>mkPlayer(p.name)),played:1,history:[],current:null,charged:null};
    setCurrent(pickCard());show("game");renderCard();broadcast();
  }

  // ---------- start (single phone) ----------
  function startGame(f){
    f.pps=f.pps||3;f.vibes=f.vibes||[];if(!f.names)f.names=defaultNames(f.players);
    store(LASTF,{wildness:f.wildness,vibes:f.vibes,baba:f.baba,drinking:f.drinking,exclude:f.exclude,pps:f.pps,players:f.players,includeCustom:f.includeCustom});
    const pool=buildPool(f);
    st={mode:"onephone",net:null,filters:f,pool,used:new Set(),exhausted:false,highlight:null,flipped:false,
        players:f.names.map(mkPlayer),played:1,history:[],current:null,charged:null};
    setCurrent(pickCard());show("game");
    if(!load(COACH,false))return showCoaching();
    renderCard();
  }
  const defaultNames=n=>Array.from({length:n},(_,i)=>"Player "+(i+1));
  function quickFilters(){const l=load(LASTF,null);return l?Object.assign({mode:"onephone"},l):{mode:"onephone",players:6,wildness:"classic",vibes:[],baba:false,drinking:false,exclude:[],pps:3};}
  function showCoaching(){const o=$("#coach");o.classList.remove("hidden");o.onclick=e=>{e.stopPropagation();o.classList.add("hidden");store(COACH,true);renderCard();};}
  let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),2200);}

  // ===================== WIRING =====================
  function wire(){
    setInlineIcons();
    const params=new URLSearchParams(location.search);
    const joinCode=params.get("join");
    setTimeout(()=>{if(!load(AGE,false))return show("agegate");joinCode?openJoin(joinCode):enterHome();},1100);
    $("#ageYes").onclick=()=>{store(AGE,true);joinCode?openJoin(joinCode):enterHome();};
    $("#ageNo").onclick=()=>{$("#agegate").innerHTML='<div class="lockup-inner"><h2 class="lockup-title" style="color:var(--stamp-high)">COME BACK AT 18</h2><p class="lockup-sub">Adults only. Case dismissed.</p></div>';};

    $("#btnQuick").onclick=()=>startGame(quickFilters());
    $("#btnStart").onclick=()=>{buildSetup();show("setup");};
    $("#btnJoin").onclick=()=>openJoin("");
    $("#btnGear").onclick=()=>{renderSettings();show("settings");};
    $$("[data-go]").forEach(b=>b.onclick=()=>b.dataset.go==="home"?goHome():show(b.dataset.go));

    $("#cardStage").addEventListener("click",e=>{if(e.target.closest("#bookRow"))return;tapCard();});
    $("#btnSkip").onclick=e=>{e.stopPropagation();skip();};
    $("#btnUndo").onclick=e=>{e.stopPropagation();undo();};
    $("#btnFlag").onclick=e=>{e.stopPropagation();flagCard();};
    $("#btnEnd").onclick=e=>{e.stopPropagation();if(isClient()){return;}if(confirm("End the night and see tonight's docket?"))showRecap();};
    $("#btnAddP").onclick=e=>{e.stopPropagation();addPlayer();};
    $("#btnPause").onclick=e=>{e.stopPropagation();if(confirm("Leave the game?"))goHome();};
    $("#btnGearGame").onclick=e=>{e.stopPropagation();renderSettings();show("settings");};

    $("#btnLockContinue").onclick=()=>{show("game");const f=st._afterLock;st._afterLock=null;f?f():renderCard();};
    $("#btnReshuffle").onclick=()=>{st.played++;st.flipped=false;setCurrent(pickCard());show("game");renderCard();};
    $("#btnExhaustEnd").onclick=()=>showRecap();
    $("#btnShare").onclick=sharePoster;
    $("#btnAgain").onclick=()=>{if(isMP())startHostGame();else startGame(st.filters);};
    $("#btnRecapHome").onclick=goHome;

    $("#babaBack").onclick=()=>{$("#babaWarn").classList.add("hidden");st._pendingBaba=false;refreshDealLabel();};
    $("#babaGo").onclick=()=>{$("#babaWarn").classList.add("hidden");st._pendingBaba=true;$("#babaChip").classList.add("on");refreshDealLabel();};

    // join / lobby
    $("#joinGo").onclick=()=>{const code=$("#joinCode").value.trim().toUpperCase();const name=$("#joinName").value.trim().slice(0,14)||"Player";if(code.length<3)return toast("Enter the lobby code.");joinLobby(code,name);};
    $("#lobbyStart").onclick=()=>{if((net.lobby||[]).length<2)return toast("Wait for at least one more phone.");startHostGame();};
    $("#lobbyCopy").onclick=()=>{const url=location.origin+location.pathname+"?join="+net.code;(navigator.share?navigator.share({text:"Join my RAP SHEET game 🚔 code "+net.code+" → "+url}):navigator.clipboard?.writeText(url).then(()=>toast("Link copied — drop it in the group chat.")));};
    $("#chargedFlash").onclick=()=>$("#chargedFlash").classList.add("hidden");
  }
  function goHome(){ try{net.peer&&net.peer.destroy();}catch{} net.peer=null;net.conns=[];net.role=null;net.gotWelcome=false; if(st)st.net=null; enterHome(); }
  function openJoin(code){buildJoin(code);show("joinScreen");}
  function buildJoin(code){$("#joinCode").value=(code||"").toUpperCase();$("#joinName").value="";}

  function setInlineIcons(){const map={btnSkip:"skip",btnUndo:"undo",btnFlag:"flag",btnEnd:"end",btnPause:"pause",btnAddP:"add",btnGearGame:"gear",btnGear:"gear",btnShare:"share"};for(const[id,ic]of Object.entries(map)){const el=$("#"+id);if(!el)continue;const label=el.dataset.label||"";el.innerHTML=I[ic]+(label?`<span>${label}</span>`:"");}}

  function enterHome(){
    const ret=!!load(LASTF,null)||!!load(DOCKET,null);
    $("#homeTag").textContent=ret?"Back again, repeat offender.":"your friends commit crimes. the game keeps a record.";
    const d=load(DOCKET,null),mw=$("#memory");
    if(d){mw.classList.remove("hidden");mw.textContent=`Last time, ${d.name} was Most Wanted (${d.strikes} strikes). The court remembers.`;}else mw.classList.add("hidden");
    show("home");
  }

  // ---------- settings ----------
  function renderSettings(){bindToggle("#hapticToggle","haptics");bindToggle("#wakeToggle","wake");bindToggle("#soundToggle","sound");renderCustomList();$("#addCardBtn").onclick=addCustomCard;}
  function bindToggle(sel,key){const el=$(sel);el.classList.toggle("on",!!settings[key]);el.onclick=()=>{settings[key]=!settings[key];el.classList.toggle("on",settings[key]);store(SET,settings);buzz(8);};}
  function addCustomCard(){const ta=$("#customText"),txt=ta.value.trim();if(!txt)return toast("Type a charge first.");if(txt.length>140)return toast("Under 140 characters.");if(BLOCK.test(txt))return toast("Keep it out of the felony-felony zone.");const list=customCards();list.push({id:9000+list.length+Math.floor(Math.random()*900),type:$("#customType").value,spice:+$("#customSpice").value,text:txt,custom:true});store(CUSTOM,list);ta.value="";renderCustomList();buzz(10);toast("Charge filed — it sticks with you.");}
  function renderCustomList(){const box=$("#customList"),list=customCards();box.innerHTML="";if(!list.length){box.innerHTML='<p class="hint">No custom charges yet. Write one — it stays saved and shuffles into every game.</p>';return;}list.forEach((c,idx)=>{const row=document.createElement("div");row.className="custom-row";row.innerHTML=`<span>${esc(c.text)}</span>`;const del=document.createElement("button");del.className="custom-del";del.textContent="✕";del.onclick=()=>{const l=customCards();l.splice(idx,1);store(CUSTOM,l);renderCustomList();};row.appendChild(del);box.appendChild(row);});}

  // ---------- setup ----------
  function buildSetup(){
    $$("#deviceMode button").forEach(b=>b.onclick=()=>{$$("#deviceMode button").forEach(x=>x.classList.remove("on"));b.classList.add("on");$("#multiNote").classList.toggle("hidden",b.dataset.val!=="multi");$("#nameBlock").classList.toggle("hidden",b.dataset.val==="multi");refreshDealLabel();});
    window._lastN=window._lastN||4;renderNameList();
    $("#fewer").onclick=()=>{window._lastN=Math.max(3,window._lastN-1);renderNameList();};
    $("#more").onclick=()=>{window._lastN=Math.min(16,window._lastN+1);renderNameList();};
    $$("#wildness button").forEach(b=>b.onclick=()=>{$$("#wildness button").forEach(x=>x.classList.remove("on"));b.classList.add("on");$("#wildHint").textContent={chill:"nothing nuclear. sober-safe.",classic:"light profanity, the good stuff.",unhinged:"no holds barred. 18+ energy."}[b.dataset.val];});
    st={...(st||{}),_pendingBaba:false};renderVibes();
    const ol=$("#offlimits");ol.innerHTML="";OFFLIMITS.forEach(([v,l])=>{const b=document.createElement("button");b.textContent=l;b.dataset.val=v;b.onclick=()=>b.classList.toggle("on");ol.appendChild(b);});
    $("#addOff").onclick=()=>{const v=$("#offInput").value.trim().toLowerCase().slice(0,20);if(!v)return;const b=document.createElement("button");b.textContent=v;b.dataset.val=v;b.classList.add("on");b.onclick=()=>b.remove();ol.appendChild(b);$("#offInput").value="";};
    window._pps=window._pps||3;$("#ppsVal").textContent=window._pps;
    $("#ppsDown").onclick=()=>{window._pps=Math.max(1,window._pps-1);$("#ppsVal").textContent=window._pps;};
    $("#ppsUp").onclick=()=>{window._pps=Math.min(10,window._pps+1);$("#ppsVal").textContent=window._pps;};
    toggleEl("#drinkToggle");$("#customInclude").classList.toggle("on",customCards().length>0);$("#customInclude").onclick=()=>$("#customInclude").classList.toggle("on");
    $("#customCount").textContent=customCards().length?`(${customCards().length} saved)`:"(none yet)";
    refreshDealLabel();$("#btnDeal").onclick=deal;
  }
  function toggleEl(sel){const t=$(sel);t.classList.remove("on");t.onclick=()=>t.classList.toggle("on");}
  function renderNameList(){$("#playerNum").textContent=window._lastN;const box=$("#nameList");box.innerHTML="";for(let i=0;i<window._lastN;i++){const inp=document.createElement("input");inp.className="name-input";inp.maxLength=14;inp.placeholder="Player "+(i+1);inp.value=(window._names&&window._names[i])||"";box.appendChild(inp);}$("#bigNote").classList.toggle("hidden",window._lastN<=8);}
  function renderVibes(){
    const base=$("#vibeChips");base.innerHTML="";
    $("#babaChip").classList.toggle("on",!!st._pendingBaba);
    $("#babaChip").onclick=()=>{if(st._pendingBaba){st._pendingBaba=false;$("#babaChip").classList.remove("on");refreshDealLabel();}else{$("#babaWarn").classList.remove("hidden");}};
    const mk=v=>{const b=document.createElement("button");b.textContent=v;b.onclick=()=>{b.classList.toggle("on");refreshDealLabel();};return b;};
    VIBES_BASE.forEach(v=>base.appendChild(mk(v)));
    const more=$("#vibeMore");more.innerHTML="";VIBES_MORE.forEach(v=>more.appendChild(mk(v)));
    $("#moreVibesBtn").onclick=()=>{more.classList.toggle("hidden");$("#moreVibesBtn").textContent=more.classList.contains("hidden")?"+ more vibe packs":"– fewer";};
  }
  function selectedVibes(){return $$("#vibeChips button.on, #vibeMore button.on").map(b=>b.textContent.toLowerCase());}
  function refreshDealLabel(){
    const multi=($("#deviceMode button.on")||{dataset:{}}).dataset.val==="multi";
    $("#btnDeal").textContent=multi?"CREATE LOBBY":"DEAL THE DECK";
    const n=selectedVibes().length+(st&&st._pendingBaba?1:0);
    $("#vibeHint").textContent=st&&st._pendingBaba?"⚠ BABA armed — top 3 vibes weighted heavy, rest light.":(n>3?"top 3 weighted heavy · rest sprinkled lightly":"pick as many as you want — top 3 hit hardest");
  }
  function gatherSettings(){
    const names=$$("#nameList .name-input").map((inp,i)=>(inp.value.trim()||"Player "+(i+1)).slice(0,14));window._names=names;
    return {players:names.length,names,wildness:($("#wildness button.on")||{dataset:{}}).dataset.val||"classic",
      vibes:selectedVibes(),baba:!!(st&&st._pendingBaba),drinking:$("#drinkToggle").classList.contains("on"),
      exclude:$$("#offlimits button.on").map(b=>b.dataset.val),pps:window._pps||3,
      includeCustom:$("#customInclude").classList.contains("on")};
  }
  function deal(){
    const multi=($("#deviceMode button.on")||{dataset:{}}).dataset.val==="multi";
    const s=gatherSettings();
    if(multi){ s.hostName=prompt("Your name (you're the host):","Player 1")||"Host"; s.hostName=s.hostName.slice(0,14); hostLobby(s); }
    else startGame(Object.assign({mode:"onephone"},s));
  }

  document.addEventListener("DOMContentLoaded",wire);
})();
