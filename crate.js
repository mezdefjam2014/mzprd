/* MZPRD CRATE DIG: single samples, crate-digging style. A wooden crate of records; they play in the site's bottom player.
   Scroll / drag / swipe / arrow keys flip through the crate; tap the front record to put it on the deck.
   DESIGN STAGE: until single samples can be uploaded, the crate is filled with stand-in records made from the packs
   (window.MZCrateItems can replace them later: [{id,title,cover,audio,bpm,key,kind,price}]). Loaded only on /crate-dig/. */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G=(f,d)=>{try{return f()}catch(e){return d}};
const KEYS=['C min','D min','E min','F min','G min','A min','Bb maj','Eb maj','F# min','C# min'],KINDS=['Soul chop','Drum break','Vocal loop','Keys loop','Horn stab','Guitar loop'];
let host=null,items=[],cur=0,deck=-1;

/* new random order on every load; never the same sample, or two from the same source, back to back */
function shuffle(list){const a=list.slice(),key=x=>x.grp||x.audio||x.id;
 for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}
 for(let pass=0;pass<4;pass++)for(let i=1;i<a.length;i++)if(key(a[i])===key(a[i-1])){const j=a.findIndex((x,k)=>k>i&&key(x)!==key(a[i-1])&&(k+1>=a.length||key(a[k+1])!==key(a[i]))&&key(a[k-1])!==key(a[i]));if(j>0)[a[i],a[j]]=[a[j],a[i]]}
 return a}
function demo(){const ps=G(()=>packs,[]).filter(p=>p.preview_path);const out=[];
 ps.forEach((p,i)=>{for(let k=0;k<2;k++){const n=i*2+k;out.push({id:p.id+'-'+k,grp:p.id,title:(k?'Dusty ':'')+String(p.title).replace(/sample pack/i,'').trim()+(k?' Chop':' Loop'),cover:G(()=>coverUrl(p,600),''),audio:G(()=>pub(p.preview_path),''),
  bpm:[84,88,90,92,94,96,98][n%7],key:KEYS[n%KEYS.length],kind:KINDS[n%KINDS.length],price:[2.99,3.99,4.99][n%3],demo:true})}});return out}

/* ---------- sound: tiny synthesized record flip ---------- */
let ac=null;function flipSnd(){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const t=ac.currentTime,n=ac.createBufferSource(),b=ac.createBuffer(1,ac.sampleRate*.06,ac.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);n.buffer=b;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=1400;f.Q.value=.8;const g=ac.createGain();g.gain.value=.12;n.connect(f).connect(g).connect(ac.destination);n.start(t)}catch(e){}}

/* ---------- markup ---------- */
function shell(){host.innerHTML=`<div class="cr">
 <div class="cr-hd"><span class="cr-k">SINGLE SAMPLES</span><h1>Crate Dig</h1><p>Single samples, one record at a time. Flip through the crate, tap a record to hear it, and grab the ones you want.</p></div>
 <div class="cr-pl" id="crPl"><div class="cr-pl-t"><b id="crPlT">Pick a record</b><span id="crPlS">Tap the front record in the crate</span></div>
  <div class="cr-pl-c"><button class="cr-pl-b" id="crPlPrev" aria-label="Previous record">&lt;</button><button class="cr-pl-pp" id="crPlPP" aria-label="Play or pause"><i></i></button><button class="cr-pl-b" id="crPlNext" aria-label="Next record">&gt;&gt;</button></div>
  <div class="cr-pl-w" id="crPlW"></div><input class="cr-pl-v" id="crPlV" type="range" min="0" max="1" step=".01" aria-label="Volume"></div>
 <div class="cr-dig"><div class="cr-dig-hd"><b>THE CRATE</b><span id="crCount"></span><span class="cr-hint">Scroll, swipe or use the arrows to flip &middot; tap the front record to play it</span><button class="cr-shuf" id="crShuf" type="button" aria-label="Shuffle the crate"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c2.2 0 3.6 1 4.8 2.9l2.4 4.2c1.2 1.9 2.6 2.9 4.8 2.9H21M17 14l4 3-4 3M3 17h3.5c1.4 0 2.5-.4 3.4-1.2M14.1 8.2c.9-.8 2-1.2 3.4-1.2H21M17 4l4 3-4 3"/></svg><span>SHUFFLE</span></button></div>
  <div class="crate" id="crCrate" tabindex="0" aria-label="Record crate">
   <div class="crate-box"><img class="cb-back" src="crate-back.png?v=1" alt="" draggable="false"><div class="crate-recs" id="crRecs"></div><img class="cb-front" src="crate-front.png?v=1" alt="" draggable="false"><div class="cr-info" id="crInfo"></div></div>
   <button class="crate-nav prev" id="crPrev" aria-label="Previous record">&#8249;</button><button class="crate-nav next" id="crNext" aria-label="Next record">&#8250;</button>
  </div>
  </div>
</div>`}
function sleeves(){const R=host.querySelector('#crRecs');R.innerHTML=items.map((x,i)=>`<div class="sl" data-i="${i}"><div class="sl-in"><div class="sl-print"><span class="sl-no">MZ-${String(i+1).padStart(3,'0')}</span><div class="sl-row"><b>${esc(x.title)}</b>${x.demo?'':`<button class="sl-lk${G(()=>liked.has('s:'+x.id),false)?' on':''}" data-lk="${esc(x.id)}" aria-label="Save ${esc(x.title)}"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.2 1.7-2 3.2-3.2 5.3-3.2 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg></button>`}</div><span class="sl-sub">${esc(x.kind)} &middot; ${x.bpm} BPM &middot; ${esc(x.key)}</span></div><div class="sl-wear"></div></div><div class="sl-vinyl"></div></div>`).join('');
 R.querySelectorAll('.sl-lk').forEach(h=>h.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();G(()=>toggleLike('s:'+h.dataset.lk),0);syncHearts()}));
 R.querySelectorAll('.sl').forEach(s=>s.addEventListener('click',()=>{const i=+s.dataset.i;if(i!==cur){go(i);return}load(i)}));host.querySelector('#crCount').textContent=items.length+' RECORDS'}

/* ---------- crate flipping ---------- */
function layout(){const S=host.querySelectorAll('.sl');S.forEach((s,i)=>{const d=i-cur;let tf,op=1,z=100-Math.abs(d),f='';
  if(d<0){tf=`translate3d(0,${18+Math.min(-d,4)*6}%,${60-d*4}px) rotateX(-74deg)`;op=d<-4?0:1;z=200+d;f='brightness(.6)'}
  else if(d===0){tf='translate3d(0,2%,40px) rotateX(-3deg)';z=150}
  else{tf=`translate3d(0,${-d*6.5}%,${-d*34}px) rotateX(-9deg)`;op=d>8?0:1;f=`brightness(${Math.max(.3,.82-d*.08)})`}
  s.style.transform=tf;s.style.opacity=op;s.style.zIndex=z;s.style.filter=f;s.classList.toggle('front',d===0);s.style.pointerEvents=(d>=0&&d<=9)?'auto':'none'});
 const x=items[cur];host.querySelector('#crInfo').innerHTML=x?`<b>${esc(x.title)}</b><div class="cr-acts"><em>$${x.price.toFixed(2)}</em><button class="cr-buy" id="crBuy">ADD TO CART</button></div>`:'';
 if(x){const B=host.querySelector('#crBuy'),k='s:'+x.id,inC=()=>G(()=>cart.has(k),false);B.textContent=inC()?'IN CART':'ADD TO CART';B.classList.toggle('in',inC());
  B.onclick=()=>{if(x.demo){G(()=>toast('PREVIEW RECORD: NOT FOR SALE'),0);return}G(()=>toggleCart(k,B),0);B.textContent=inC()?'IN CART':'ADD TO CART';B.classList.toggle('in',inC())}}}
/* SHUFFLE: records lift out in a wave, reshuffle in the air, drop back in from back to front */
let shuffling=false;
async function shuffleCrate(){if(shuffling||!host||items.length<2)return;shuffling=true;const btn=host.querySelector('#crShuf');btn.classList.add('on');
 const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,box=host.querySelector('.crate-box');
 const vis=[...host.querySelectorAll('.sl')].filter(s=>{const d=+s.dataset.i-cur;return d>=0&&d<=8});
 const rnd=(a,b)=>a+Math.random()*(b-a),wait=ms=>new Promise(r=>setTimeout(r,ms));
 if(!RM){/* lift-off: front record first, a wave toward the back, fanning out and spinning up */
  host.querySelector('.crate').classList.add('shuffling');
  vis.forEach((s,k)=>{const el=s,base=s.style.transform||'',dir=k%2?1:-1;setTimeout(flipSnd,k*45);
   el.animate([{transform:base,opacity:1},{transform:`${base} translate(${dir*rnd(18,46)}%,-${rnd(70,110)}%) rotate(${dir*rnd(8,22)}deg) scale(.92)`,opacity:.95,offset:.7},{transform:`${base} translate(${dir*rnd(30,60)}%,-${rnd(120,150)}%) rotate(${dir*rnd(18,34)}deg) scale(.85)`,opacity:0}],{duration:560,delay:k*45,easing:'cubic-bezier(.3,.6,.2,1)',fill:'forwards'})});
  await wait(560+vis.length*45)}
 const keep=items[deck];items=shuffle(items);cur=0;if(keep){deck=items.indexOf(keep)}sleeves();layout();paint&&paint();
 if(!RM){const now=[...host.querySelectorAll('.sl')].filter(s=>{const d=+s.dataset.i-cur;return d>=0&&d<=8}).reverse();
  now.forEach((s,k)=>{const el=s,base=s.style.transform||'',dir=k%2?1:-1;setTimeout(flipSnd,k*55);
   el.animate([{transform:`${base} translate(${dir*rnd(10,30)}%,-${rnd(130,160)}%) rotate(${dir*rnd(10,24)}deg) scale(.9)`,opacity:0},{transform:`${base} translate(0,6%) rotate(0deg) scale(1)`,opacity:1,offset:.78},{transform:base,opacity:1}],{duration:520,delay:k*55,easing:'cubic-bezier(.2,.8,.25,1)',fill:'backwards'})});
  setTimeout(()=>{if(box)box.animate([{transform:'translateX(-50%) translateY(0)'},{transform:'translateX(-50%) translateY(5px)'},{transform:'translateX(-50%) translateY(0)'}],{duration:260,easing:'ease-out'})},now.length*55+380);
  await wait(now.length*55+560)}
 host.querySelector('.crate').classList.remove('shuffling');btn.classList.remove('on');shuffling=false}
function go(n){const v=Math.max(0,Math.min(items.length-1,n));if(v===cur)return;cur=v;layout();flipSnd()}
let wheelT=0,acc=0;function wheel(e){e.preventDefault();acc+=e.deltaY||e.deltaX;const now=performance.now();if(Math.abs(acc)>40&&now-wheelT>110){go(cur+(acc>0?1:-1));acc=0;wheelT=now}}
function drag(el){let y0=null,x0=0,moved=0;el.addEventListener('pointerdown',e=>{y0=e.clientY;x0=e.clientX;moved=0});
 el.addEventListener('pointermove',e=>{if(y0==null)return;const dy=e.clientY-y0,dx=e.clientX-x0,d=Math.abs(dy)>Math.abs(dx)?dy:dx;if(Math.abs(d)>46){go(cur+(d<0?1:-1));y0=e.clientY;x0=e.clientX;moved=1}});
 const end=()=>{y0=null};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('pointerleave',end);
 el.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=0}},true)}

/* ---------- the deck ---------- */
/* records play through the site's own bottom player (waveform, name strip, scrubbing) */
const MA=()=>document.getElementById('au');
const isOn=i=>{const A=MA();return deck===i&&A&&!A.paused&&A.src===(items[i]||{}).audio};
function load(i){const x=items[i];if(!x||!x.audio)return;const A=MA();if(!A)return;
 if(deck===i&&A.src===x.audio){A.paused?A.play().catch(()=>{}):A.pause();return}
 deck=i;G(()=>{curPack=-1},0);
 A.src=x.audio;A.play().catch(()=>{});
 const name=()=>{const bt=document.getElementById('bt'),bm=document.getElementById('bm');if(bt)bt.textContent=x.title;if(bm)bm.textContent=x.kind+' / $'+x.price.toFixed(2);
  const pc=document.querySelector('#bar .st-pcov');if(pc)pc.innerHTML='<img src="crate-sleeve.jpg" alt="" style="width:100%;height:100%;object-fit:cover">'};
 name();setTimeout(name,80);setTimeout(name,400);paint()}
function plSync(){if(!host)return;const x=items[deck],A=MA(),on=deck>=0&&A&&!A.paused&&x&&A.src===x.audio;
 host.querySelector('#crPlT').textContent=x?x.title:'Pick a record';host.querySelector('#crPlS').textContent=x?x.kind+' / $'+x.price.toFixed(2):'Tap the front record in the crate';
 host.querySelector('#crPl').classList.toggle('on',!!on);if(clipC)clipC.refresh()}
let clipC=null;
function syncHearts(){if(!host)return;host.querySelectorAll('.sl-lk').forEach(h=>h.classList.toggle('on',G(()=>liked.has('s:'+h.dataset.lk),false)))}
window.MZCrateHearts=syncHearts;
function paint(){if(!host)return;host.querySelectorAll('.sl').forEach(s=>s.classList.toggle('playing',isOn(+s.dataset.i)));plSync();const b=host.querySelector('#crPlay');if(b)b.classList.toggle('on',isOn(cur))}
{const A=MA();if(A)['play','pause','ended','emptied'].forEach(ev=>A.addEventListener(ev,paint))}
window.MZCratePlaying=()=>{const x=items[deck],A=MA();return !!(x&&A&&A.src===x.audio)};
window.MZCrateStop=()=>{document.body.classList.remove('on-crate')};

async function fetchSamples(){try{const {data,error}=await sb.from('samples').select('*').eq('published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});if(error||!data)return[];
 if(window.MZPrime)await MZPrime(data.map(r=>r.preview_path));
 return data.filter(r=>r.preview_path).map(r=>({id:r.id,grp:r.id,title:r.title,cover:'',audio:G(()=>pub(r.preview_path),''),bpm:r.bpm||'',key:r.musical_key||'',kind:r.kind||'Sample',price:Number(r.price)||0,free:!!r.free_download}))}catch(e){return[]}}
window.MZCrate=async function(el){if(host===el&&el.querySelector('.cr')){layout();document.body.classList.add('on-crate');plSync();return}host=el;{const real=await fetchSamples();window.MZCrateItems=real;items=shuffle(real.length?real:demo())}cur=0;deck=-1;shell();sleeves();layout();
 const W=host.querySelector('#crPlW');if(window.MZClip)clipC=MZClip(W,{url:()=>{const x=items[deck];return x?x.audio:''},name:()=>{const x=items[deck];return x?x.title:'MZPRD CRATE'},current:()=>{const x=items[deck],A=MA();return !!(x&&A&&A.src===x.audio)},start:()=>load(deck>=0?deck:cur)});
 const step=d=>{const n=Math.max(0,Math.min(items.length-1,(deck>=0?deck:cur)+d));go(n);load(n)};
 host.querySelector('#crPlPrev').onclick=()=>step(-1);host.querySelector('#crPlNext').onclick=()=>step(1);
 host.querySelector('#crPlPP').onclick=()=>{const A=MA();if(deck<0){load(cur);return}if(A.paused)A.play().catch(()=>{});else A.pause()};
 {const V=host.querySelector('#crPlV'),A=MA(),mv=document.getElementById('vol');V.value=A?A.volume:.8;V.oninput=()=>{if(A)A.volume=+V.value;if(mv){mv.value=V.value}}}
 document.body.classList.add('on-crate');plSync();
 const C=host.querySelector('#crCrate');C.addEventListener('wheel',wheel,{passive:false});drag(C);
 C.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();go(cur+1)}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(cur-1)}if(e.key==='Enter')load(cur)});
 host.querySelector('#crShuf').onclick=shuffleCrate;
 host.querySelector('#crPrev').onclick=e=>{e.stopPropagation();go(cur-1)};host.querySelector('#crNext').onclick=e=>{e.stopPropagation();go(cur+1)};};

const css=document.createElement('style');css.textContent=`
.cr{max-width:1180px;margin:0 auto;padding:30px 20px 70px;color:#e6e6ea;font-family:Inter,sans-serif}
.cr-k{display:block;font:800 10px Inter,sans-serif;letter-spacing:.24em;color:#e0242f;margin-bottom:8px}
.cr-hd h1{font:400 clamp(44px,6vw,76px)/.92 Anton,sans-serif;color:#fff;margin:0;text-transform:uppercase}.cr-hd p{max-width:560px;margin:14px 0 0;color:#a2a2a8;font-size:15px;line-height:1.6}
/* crate */
.crate.shuffling{overflow:visible}.crate.shuffling .sl{transition:none!important}
.cr-shuf{display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid #e0242f;color:#fff;font:800 10px Inter,sans-serif;letter-spacing:.2em;padding:9px 14px 9px 11px;border-radius:999px;cursor:pointer;transition:background .2s,box-shadow .2s;margin-left:14px}
.cr-shuf svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .5s}
.cr-shuf:hover{background:#e0242f;box-shadow:0 0 24px rgba(224,36,47,.45)}.cr-shuf.on{background:#e0242f;pointer-events:none}.cr-shuf.on svg{animation:shufSpin .7s linear infinite}@keyframes shufSpin{to{transform:rotate(360deg)}}
@media(max-width:820px){.cr-shuf{margin-left:auto}}
body.on-crate #bar{display:none!important}body.on-crate #mCart{bottom:16px!important}
.cr-pl{display:flex;align-items:center;gap:18px;background:#0b0b0d;border:1px solid #1d1d20;border-radius:16px;padding:12px 18px;margin:0 0 26px;box-shadow:0 18px 40px rgba(0,0,0,.45)}
.cr-pl-t{width:190px;flex:none;min-width:0}.cr-pl-t b{display:block;font:800 15px Inter,sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cr-pl-t span{display:block;margin-top:4px;font:500 12px Inter,sans-serif;color:#8a8a90;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-pl-c{display:flex;align-items:center;gap:12px;flex:none}
.cr-pl-b{width:38px;height:38px;border-radius:50%;border:1px solid #2e2e33;background:#141417;color:#fff;font:700 11px Inter;cursor:pointer}.cr-pl-b:hover{border-color:#e0242f}
.cr-pl-pp{width:50px;height:50px;border-radius:50%;border:0;background:#fff;cursor:pointer;display:grid;place-items:center}.cr-pl-pp i{width:0;height:0;border-left:13px solid #111;border-top:8px solid transparent;border-bottom:8px solid transparent;margin-left:4px}
.cr-pl.on .cr-pl-pp i{border:0;width:13px;height:15px;margin:0;background:linear-gradient(90deg,#111 0 4px,transparent 4px 9px,#111 9px 13px)}
.cr-pl-w{flex:1;min-width:0;height:54px}.cr-pl-v{width:110px;flex:none;accent-color:#fff}
@media(max-width:820px){.cr-pl{flex-wrap:wrap;gap:10px 12px;padding:10px 12px}.cr-pl-t{flex:1;width:auto}.cr-pl-w{order:9;flex:1 1 100%;height:44px}.cr-pl-v{display:none}}
.cr-hd{margin-bottom:26px}
.cr-info .cr-acts{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:10px}.cr-info .cr-acts em{margin:0}
.cr-play{width:56px;height:56px;border-radius:50%;border:0;background:#fff;cursor:pointer;display:grid;place-items:center;box-shadow:0 10px 26px rgba(0,0,0,.5)}
.cr-play i{width:0;height:0;border-left:15px solid #000;border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:5px}.cr-play.on i{border:0;width:15px;height:17px;margin:0;background:linear-gradient(90deg,#000 0 5px,transparent 5px 10px,#000 10px 15px)}
.cr-buy{background:#e0242f;color:#fff;border:0;font:800 11px Inter;letter-spacing:.18em;padding:16px 22px;cursor:pointer}.cr-buy:hover{background:#fff;color:#000}.cr-buy.in{background:#fff;color:#000}
.cr-note{font-size:12px;color:#6c6c72;margin:14px 0 0}
.sl.playing .sl-in{box-shadow:0 0 0 2px #e0242f,0 20px 50px rgba(0,0,0,.7),0 0 50px rgba(224,36,47,.45)!important}
.cr-dig-hd{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;border-bottom:1px solid #1d1d20;padding-bottom:12px;margin-bottom:8px}.cr-dig-hd b{font:400 30px Anton,sans-serif;color:#fff;letter-spacing:.03em}.cr-dig-hd span{font:800 10px Inter;letter-spacing:.2em;color:#7c7c82}.cr-hint{margin-left:auto}
.crate{position:relative;height:clamp(620px,66vw,760px);outline:none;touch-action:none;user-select:none;overflow:hidden;cursor:grab}
.crate:active{cursor:grabbing}


.sl{position:absolute;inset:0;transform-origin:50% 100%;transition:transform .55s cubic-bezier(.22,.8,.2,1),opacity .4s,filter .4s;will-change:transform;cursor:pointer}
.sl-in{position:absolute;inset:0;background:url(crate-sleeve.jpg) center/cover,radial-gradient(circle at 50% 50%,#050505 0 18%,#0b0b0c 19% 22%,#070707 23% 60%,rgba(200,200,205,.10) 61% 63%,#080808 64%),#0a0a0b;overflow:hidden;border-radius:2px;box-shadow:0 1px 0 rgba(255,255,255,.12) inset,0 -10px 30px rgba(0,0,0,.6)}.sl-in img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.sl-wear{position:absolute;inset:0;background:radial-gradient(circle at 70% 20%,rgba(255,255,255,.1),transparent 40%),linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.25));pointer-events:none}
.sl-print{position:absolute;left:8%;right:8%;top:7%;display:flex;flex-direction:column;gap:4px;color:#ece6da;text-shadow:0 1px 0 rgba(0,0,0,.6);opacity:.95;z-index:2}.sl-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.sl-row b{flex:1;min-width:0}
.sl-lk{flex:none;width:34px;height:34px;margin:-4px -4px 0 0;border:0;background:none;cursor:pointer;display:grid;place-items:center;pointer-events:auto;mix-blend-mode:normal;opacity:1}.sl-lk svg{width:22px;height:22px;fill:none;stroke:#ece6da;stroke-width:1.8;transition:transform .2s,fill .2s,stroke .2s;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))}.sl-lk:hover svg{transform:scale(1.12)}.sl-lk.on svg{fill:#e0242f;stroke:#e0242f}.sl-lk.on svg{animation:slPop .35s ease}@keyframes slPop{50%{transform:scale(1.3)}}
.sl-print b{font:400 clamp(16px,2.1vw,24px)/1 Anton,sans-serif;letter-spacing:.06em;text-transform:uppercase}.sl-no{font:700 10px 'Courier New',monospace;letter-spacing:.2em;color:#c9c2b4}.sl-sub{font:700 9px 'Courier New',monospace;letter-spacing:.14em;color:#a8a296;text-transform:uppercase}
.sl-tag{display:none;position:absolute;left:10px;top:10px;font:800 9px Inter;letter-spacing:.16em;color:#fff;background:rgba(0,0,0,.6);padding:5px 7px;text-transform:uppercase;opacity:0;transition:opacity .3s}
.sl.front .sl-tag{opacity:1}.sl-vinyl{position:absolute;top:4%;left:6%;width:88%;aspect-ratio:1;border-radius:50%;background:url(crate-record.webp?v=1) center/contain no-repeat;z-index:-1;transition:transform .55s cubic-bezier(.22,.8,.2,1);filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}
.sl-vinyl{--ty:0%;transform:translateY(var(--ty))}.sl.front .sl-vinyl{--ty:-26%}
.sl.playing .sl-vinyl{--ty:-26%;animation:vSpin 1.8s linear infinite}.sl.front.playing .sl-vinyl{--ty:-40%}
@keyframes vSpin{from{transform:translateY(var(--ty)) rotate(0deg)}to{transform:translateY(var(--ty)) rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.sl.playing .sl-vinyl{animation:none}}.sl.front .sl-in{box-shadow:0 0 0 1px rgba(224,36,47,.55),0 20px 50px rgba(0,0,0,.7),0 0 40px rgba(224,36,47,.2)}


/* the crate: pine slats like a real produce crate, graded for a dark room with warm light and a red bounce */








.crate:after{content:'';position:absolute;left:50%;bottom:-6%;width:min(700px,100%);height:16%;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(0,0,0,.75),transparent 70%);z-index:1;pointer-events:none}
.crate-box{position:absolute;left:50%;bottom:3%;width:min(820px,98%);aspect-ratio:520/244;transform:translateX(-50%)}
.cb-back,.cb-front{position:absolute;left:0;width:100%;pointer-events:none;user-select:none;filter:drop-shadow(0 30px 34px rgba(0,0,0,.75))}
.cb-back{bottom:0;height:100%;z-index:1}.cb-front{bottom:0;height:84.8%;z-index:3}
.crate-recs{position:absolute;left:50%;bottom:15%;width:56%;aspect-ratio:1;transform:translateX(-50%);z-index:2;perspective:1100px;perspective-origin:50% 0%}
.crate-box:before{content:'';position:absolute;left:8%;right:8%;top:-60%;bottom:20%;background:radial-gradient(ellipse at 50% 60%,rgba(255,200,140,.10),transparent 65%);z-index:0;pointer-events:none}
.crate-nav{position:absolute;top:34%;z-index:500;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(14,14,16,.7);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;font:400 28px/1 Inter,sans-serif;cursor:pointer}.crate-nav:hover{background:#e0242f;border-color:#e0242f}.crate-nav.prev{left:4%}.crate-nav.next{right:4%}
.cr-info{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);z-index:4;text-align:center;min-width:min(380px,74%);padding:14px 22px 16px;background:rgba(10,10,12,.86);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08);border-top:2px solid #e0242f;border-radius:4px;box-shadow:0 14px 34px rgba(0,0,0,.6)}.cr-info b{display:block;font:400 26px Anton,sans-serif;color:#fff;letter-spacing:.03em;text-transform:uppercase}.cr-info span{display:block;margin-top:6px;font:700 11px Inter;letter-spacing:.16em;color:#9a9aa0;text-transform:uppercase}.cr-info em{display:block;margin-top:6px;font:400 22px Anton,sans-serif;color:#e0242f;font-style:normal}
@media(max-width:820px){.cr-hint{display:none}.crate{height:calc(86vw + 120px)}.crate-box{width:112%;bottom:2%}.crate-recs{width:62%;bottom:14%}.crate-nav{top:22%;width:40px;height:40px;font-size:24px}.crate-nav.prev{left:0}.crate-nav.next{right:0}.cr{padding:22px 16px 60px}
.cr-info{top:auto;bottom:6%;transform:translateX(-50%);min-width:0;width:84%;padding:9px 12px 11px}.cr-info b{font-size:17px!important;line-height:1.05}.cr-info .cr-acts{gap:10px;margin-top:7px}.cr-info em{font-size:18px!important}.cr-info .cr-buy{padding:10px 12px;font-size:10px;letter-spacing:.14em}}
@media(prefers-reduced-motion:reduce){.sl{transition:none}}`;
document.head.appendChild(css);
})();
