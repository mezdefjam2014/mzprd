/* MZPRD Slots: 8-bit slot machine mini game (window.slotsOpen) and its back office panel (window.slotsAdmin).
   The server (edge function "slots") decides every spin; this file only draws it. */
(function(){
const NAMES=['DRUM PAD','KEYS','SAX','GUITAR','MIC','VINYL','HEADPHONES','CROWN'];
/* ---------- pixel icons, 16x16 each, drawn with rectangles ---------- */
const ICON={};
function mk(fn){const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');fn((a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(a,b,w,h)},(cx,cy,r,col)=>{x.fillStyle=col;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)if(i*i+j*j<=r*r+r*.6)x.fillRect(cx+i,cy+j,1,1)});return c}
const drawers=[
 /* 0 drum pad */(R,D)=>{R(1,2,14,12,'#000');R(2,3,12,10,'#3b3b45');const cols=['#e0242f','#ff8a1c','#ffd34a','#35e0ff','#e0242f','#7a5cff','#ffd34a','#e0242f','#ff8a1c'];for(let i=0;i<9;i++)R(3+(i%3)*4,4+Math.floor(i/3)*3,3,2,cols[i]);R(2,3,12,1,'#5b5b68')},
 /* 1 keys */(R,D)=>{R(1,3,14,11,'#000');R(2,4,12,9,'#fff');for(let i=0;i<5;i++)R(4+i*2,4,1,9,'#c9c9d3');[3,5,9,11].forEach(x=>R(x,4,2,5,'#000'));R(2,12,12,1,'#9a9aa5')},
 /* 2 sax */(R,D)=>{R(9,1,3,1,'#000');R(8,2,5,1,'#ffd34a');R(8,3,2,2,'#ffd34a');R(7,5,2,6,'#e8b94a');R(6,11,2,2,'#e8b94a');R(5,12,2,1,'#e8b94a');R(4,11,2,2,'#c98f1b');R(3,10,3,1,'#c98f1b');R(3,9,1,1,'#ffd34a');R(10,3,1,1,'#fff6c8');R(8,6,1,1,'#000');R(8,8,1,1,'#000');R(2,8,3,2,'#ffd34a');R(1,9,1,1,'#000');R(2,7,3,1,'#000')},
 /* 3 guitar */(R,D)=>{D(5,11,4,'#a85a1c');D(7,8,3,'#a85a1c');R(5,10,2,2,'#000');R(8,2,1,8,'#6b3a12');R(7,1,3,2,'#000');R(12,1,1,1,'#ffd34a');R(7,8,1,3,'#c9c9d3');R(9,8,1,3,'#c9c9d3');D(5,11,1,'#000')},
 /* 4 mic */(R,D)=>{D(8,5,4,'#8e8e9a');D(8,5,3,'#c9c9d3');R(6,3,4,1,'#fff');R(5,5,6,1,'#6b6b78');R(5,7,6,1,'#6b6b78');R(7,9,2,5,'#2a2a33');R(6,13,4,2,'#000');R(7,9,2,1,'#e0242f')},
 /* 5 vinyl */(R,D)=>{D(8,8,7,'#000');D(8,8,6,'#15151b');D(8,8,4,'#2b2b35');D(8,8,3,'#e0242f');D(8,8,1,'#000');R(4,4,2,1,'#5b5b68');R(10,11,2,1,'#5b5b68')},
 /* 6 headphones */(R,D)=>{R(4,2,8,1,'#000');R(3,3,2,1,'#000');R(11,3,2,1,'#000');R(2,4,2,6,'#000');R(12,4,2,6,'#000');R(4,3,8,1,'#c9c9d3');R(3,4,1,5,'#c9c9d3');R(12,4,1,5,'#c9c9d3');R(1,8,4,6,'#000');R(11,8,4,6,'#000');R(2,9,2,4,'#e0242f');R(12,9,2,4,'#e0242f')},
 /* 7 crown */(R,D)=>{R(2,4,2,2,'#000');R(7,2,2,2,'#000');R(12,4,2,2,'#000');R(2,6,12,7,'#000');R(3,5,1,1,'#ffd34a');R(8,3,1,1,'#ffd34a');R(13,5,1,1,'#ffd34a');R(3,6,10,6,'#ffd34a');R(3,6,10,1,'#fff6c8');R(3,10,10,2,'#c98f1b');R(5,8,1,1,'#e0242f');R(8,8,1,1,'#35e0ff');R(11,8,1,1,'#e0242f');R(4,5,1,2,'#ffd34a');R(7,3,2,3,'#ffd34a');R(11,5,1,2,'#ffd34a')}
];
const icon=i=>ICON[i]||(ICON[i]=mk(drawers[i]));

/* ---------- sound (8-bit beeps) ---------- */
let AC=null,muted=false;
function beep(f,d,t,type,v){if(muted)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.value=f;g.gain.value=v||.05;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(t||0)+d);o.connect(g);g.connect(AC.destination);o.start(AC.currentTime+(t||0));o.stop(AC.currentTime+(t||0)+d)}catch(e){}}
const sfx={tick:()=>beep(180,.06,0,'square',.05),stop:()=>{beep(330,.07,0,'square',.06);beep(220,.09,.05,'square',.05)},
 win:()=>[523,659,784,1047,784,1047].forEach((f,i)=>beep(f,.14,i*.11,'square',.06)),
 jack:()=>[523,659,784,1047,1319,1047,1319,1568,1319,1568,2093].forEach((f,i)=>beep(f,.13,i*.09,'square',.06)),
 lose:()=>[330,277,220,165].forEach((f,i)=>beep(f,.16,i*.13,'triangle',.07)),near:()=>[392,392,330].forEach((f,i)=>beep(f,.12,i*.12,'square',.05))};

/* ---------- server ---------- */
const FN=()=>SB_URL+'/functions/v1/slots';
async function call(body){
 let tok=SB_KEY;if(body.test){try{const {data:{session}}=await sb.auth.getSession();if(session)tok=session.access_token}catch(e){}}
 const r=await fetch(FN(),{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+tok},body:JSON.stringify({...body,browser:window.mzBid()})});
 const j=await r.json().catch(()=>({error:'Network problem. Try again.'}));j._status=r.status;return j;
}
const testOn=()=>{try{return localStorage.getItem('mzprd_slot_test')==='1'}catch(e){return false}};

/* ---------- the machine ---------- */
let box=null,S={status:null,busy:false,reels:[0,1,2],raf:0,spin:[null,null,null],coupon:null};
const $s=q=>box.querySelector(q);
function css(){
 if(document.getElementById('slCss'))return;const st=document.createElement('style');st.id='slCss';
 st.textContent=`#slotModal{display:none;position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.86);align-items:center;justify-content:center;padding:14px;font-family:'Press Start 2P',monospace}
#slotModal.on{display:flex}
#slotModal .m{position:relative;width:min(520px,100%);max-height:96vh;overflow:auto;background:#150a24;border:4px solid #000;box-shadow:0 0 0 4px #e0242f,0 0 0 8px #000,0 0 40px rgba(224,36,47,.45);padding:18px 16px 16px;image-rendering:pixelated}
#slotModal .x{position:absolute;top:8px;right:8px;width:34px;height:34px;background:#000;border:3px solid #ffd34a;color:#ffd34a;font:400 14px 'Press Start 2P';cursor:pointer;padding:0}
#slotModal h2{font:400 15px 'Press Start 2P';color:#ffd34a;text-align:center;margin:4px 30px 14px;text-shadow:3px 3px 0 #7a1218;letter-spacing:1px}
#slotModal .reels{display:flex;gap:8px;justify-content:center;background:#000;border:4px solid #ffd34a;padding:10px;position:relative}
#slotModal .reels:before{content:"";position:absolute;left:0;right:0;top:50%;height:3px;background:rgba(224,36,47,.8);z-index:2;pointer-events:none}
#slotModal canvas.r{width:96px;height:144px;background:#f3ecd9;border:3px solid #000;image-rendering:pixelated;display:block}
#slotModal .win .reels{animation:slFlash .25s steps(2) 8}
@keyframes slFlash{0%{border-color:#ffd34a}100%{border-color:#e0242f}}
#slotModal .info{display:flex;justify-content:space-between;font-size:8px;color:#9fe3ff;margin:12px 2px 8px;letter-spacing:1px}
#slotModal .spin{display:block;width:100%;background:#e0242f;border:4px solid #000;box-shadow:0 5px 0 #7a1218;color:#fff;font:400 16px 'Press Start 2P';padding:14px;cursor:pointer;letter-spacing:2px}
#slotModal .spin:active{transform:translateY(4px);box-shadow:0 1px 0 #7a1218}
#slotModal .spin:disabled{background:#4a3a58;box-shadow:0 5px 0 #2a2038;cursor:default}
#slotModal .msg{font-size:9px;line-height:1.7;color:#fff;text-align:center;margin:12px 4px 4px;min-height:30px}
#slotModal .cp{margin-top:12px;background:#0a0612;border:3px dashed #ffd34a;padding:12px;text-align:center}
#slotModal .cp b{display:block;font:400 20px 'Press Start 2P';color:#ffd34a;letter-spacing:2px;margin:8px 0;word-break:break-all}
#slotModal .cp small{display:block;font-size:8px;color:#9fe3ff;line-height:1.8}
#slotModal .row{display:flex;gap:8px;margin-top:10px}
#slotModal .row button,#slotModal .tools button{flex:1;background:#000;border:3px solid #ffd34a;color:#ffd34a;font:400 9px 'Press Start 2P';padding:10px 4px;cursor:pointer}
#slotModal .row button:hover,#slotModal .tools button:hover{background:#ffd34a;color:#000}
#slotModal .fine{font-size:7px;line-height:1.9;color:#7e6a95;margin-top:12px;text-align:center}
#slotModal .tools{margin-top:12px;border-top:2px dashed #35e0ff;padding-top:10px}
#slotModal .tools h5{font:400 8px 'Press Start 2P';color:#35e0ff;margin:0 0 8px}
#slotModal .tools .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#slotModal .pays{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:12px}
#slotModal .pays canvas{width:26px;height:26px;image-rendering:pixelated;background:#f3ecd9;border:2px solid #000}`;
 document.head.appendChild(st);
}
function build(){
 css();box=document.createElement('div');box.id='slotModal';box.setAttribute('aria-hidden','true');
 box.innerHTML=`<div class="m" role="dialog" aria-label="Play slots"><button class="x" id="slX" aria-label="Close">X</button>
 <h2>MZPRD SLOTS</h2><div id="slBody">
 <div class="reels"><canvas class="r" id="r0" width="16" height="48"></canvas><canvas class="r" id="r1" width="16" height="48"></canvas><canvas class="r" id="r2" width="16" height="48"></canvas></div>
 <div class="info"><span id="slLeft">SPINS LEFT: -</span><button id="slMute" style="background:none;border:0;color:#9fe3ff;font:400 8px 'Press Start 2P';cursor:pointer">SOUND: ON</button></div>
 <button class="spin" id="slSpin">SPIN</button><div class="msg" id="slMsg">Line up 3 instruments to win a discount code.</div>
 <div id="slCp"></div><div class="pays" id="slPays"></div>
 <div class="tools" id="slTools" style="display:none"></div>
 <div class="fine">FREE PROMO GAME. NO PURCHASE NEEDED. ONE WIN PER BROWSER, THEN A BREAK BEFORE THE NEXT. CODES ARE SINGLE USE, EXPIRE, AND WORK ON ONE BEAT.</div></div></div>`;
 document.body.appendChild(box);
 $s('#slX').onclick=shut;box.onclick=e=>{if(e.target===box)shut()};
 $s('#slSpin').onclick=()=>spin();
 $s('#slMute').onclick=()=>{muted=!muted;$s('#slMute').textContent='SOUND: '+(muted?'OFF':'ON')};
 for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').drawImage(icon(i),0,0);c.title=NAMES[i];$s('#slPays').appendChild(c)}
 drawAll();
}
function shut(){box.classList.remove('on');box.setAttribute('aria-hidden','true');document.removeEventListener('keydown',key);cancelAnimationFrame(S.raf)}
function key(e){if(e.key==='Escape')shut()}
/* reel drawing: a strip of 3 visible symbols (16px each) with a scroll offset */
function drawReel(i,off,sym3){
 const cv=$s('#r'+i),x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#f3ecd9';x.fillRect(0,0,16,48);
 for(let k=0;k<4;k++){const s=sym3[k];if(s==null)continue;x.drawImage(icon(s),0,(k-1)*16+off)}
 x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,16,3);x.fillRect(0,45,16,3);
}
function drawAll(){for(let i=0;i<3;i++){const s=S.reels[i];drawReel(i,0,[(s+6)%8,(s+7)%8,s,(s+1)%8])}}
function setLeft(n){$s('#slLeft').textContent='SPINS LEFT: '+(n==null?'-':n)}
function msg(t){$s('#slMsg').innerHTML=t}
function couponPanel(c){
 if(!c){$s('#slCp').innerHTML='';return}
 S.coupon=c;const left=()=>{const ms=new Date(c.expires_at).getTime()-Date.now();if(ms<=0)return 'EXPIRED';const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h+'H '+String(m).padStart(2,'0')+'M LEFT'};
 $s('#slCp').innerHTML=`<div class="cp"><small>YOUR CODE ${c.kind==='jackpot'?'(JACKPOT)':''}</small><b>${c.code}</b><small>${c.pct}% OFF ONE BEAT<br><span id="slExp">${left()}</span> / SINGLE USE</small>
  <div class="row"><button id="slCopy">COPY</button><button id="slUse">USE IT IN MY CART</button></div></div>`;
 $s('#slCopy').onclick=async()=>{try{await navigator.clipboard.writeText(c.code);toast('CODE COPIED')}catch(e){toast(c.code)}};
 $s('#slUse').onclick=async()=>{await window.applyCoupon(c.code);shut();document.getElementById('cartBtn').click()};
 clearInterval(S.exp);S.exp=setInterval(()=>{const e=$s('#slExp');if(e)e.textContent=left()},30000);
}
async function refresh(){
 const st=await call({action:'status',test:testOn()});S.status=st;
 if(st.error){msg('THE SLOTS ARE OFFLINE RIGHT NOW.');$s('#slSpin').disabled=true;return}
 setLeft(st.test?'TEST':st.spinsLeft);
 if(st.active){couponPanel(st.active);msg('YOU ALREADY HAVE A CODE. USE IT BEFORE IT EXPIRES!');$s('#slSpin').disabled=true}
 else if(st.nextWinAt){msg('NICE WIN LAST TIME! NEXT CHANCE: '+new Date(st.nextWinAt).toLocaleDateString());$s('#slSpin').disabled=true}
 else if(!st.test&&st.spinsLeft<=0){msg('OUT OF SPINS FOR TODAY. COME BACK TOMORROW!');$s('#slSpin').disabled=true}
 else{$s('#slSpin').disabled=false;msg('Line up 3 instruments to win a discount code. 8 symbols, the CROWN is the jackpot.')}
 tools(st);
}
function tools(st){
 const t=$s('#slTools');if(!(st.admin&&testOn())){t.style.display='none';return}
 t.style.display='block';t.innerHTML=`<h5>ADMIN TEST MODE (spins are not counted, coupons are marked TEST)</h5><div class="g"><button data-f="win">FORCE WIN</button><button data-f="jackpot">FORCE JACKPOT</button><button data-f="lose">FORCE LOSS</button><button data-f="">RANDOM SPIN</button></div><div class="row"><button id="slReset">RESET MY BROWSER (CLEAR LIMITS AND CODES)</button></div>`;
 t.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>spin(b.dataset.f||''));
 t.querySelector('#slReset').onclick=async()=>{await call({action:'reset',test:true});couponPanel(null);window.clearCoupon&&window.clearCoupon();await refresh();toast('SLOTS RESET FOR THIS BROWSER')};
}
async function spin(force){
 if(S.busy)return;S.busy=true;const btn=$s('#slSpin');btn.disabled=true;couponPanel(null);box.querySelector('.m').classList.remove('win');msg('SPINNING...');
 try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume&&AC.resume()}catch(e){}
 /* start the reels spinning right away, the server answer decides where they land */
 const strips=[0,1,2].map(()=>({off:0,syms:[pick(),pick(),pick(),pick()],phase:'spin',done:false}));
 const t0=performance.now();let result=null,answered=false,lastTick=0;
 const resP=call({action:'spin',test:testOn(),force:force||undefined}).then(r=>{result=r;answered=true});
 await new Promise(res=>{
  const frame=now=>{
   const el=now-t0;let allDone=true;
   if(answered&&result&&!result.reels)return res();
   strips.forEach((s,i)=>{
    if(s.done)return;allDone=false;
    if(answered&&result&&result.reels&&s.phase==='spin'&&el>=1000+i*450)s.phase='insert';
    s.off+=s.phase==='spin'?10:(s.phase==='insert'?7:5);
    if(s.off>=16){s.off-=16;
     if(s.phase==='spin')s.syms.unshift(pick());
     else if(s.phase==='insert'){s.syms.unshift(result.reels[i]);s.phase='s1'}
     else if(s.phase==='s1'){s.syms.unshift(pick());s.phase='s2'}
     else{s.syms.unshift(pick());s.off=0;s.done=true;sfx.stop()}
     s.syms.length=4}
    drawReel(i,s.off,s.syms);
   });
   if(now-lastTick>110&&!allDone){sfx.tick();lastTick=now}
   if(allDone||el>9000)return res();S.raf=requestAnimationFrame(frame)};
  S.raf=requestAnimationFrame(frame);
 });
 await resP;
 S.busy=false;
 if(!result||result.error){
  const e=result&&result.error;drawAll();
  if(e==='no-spins'){msg('OUT OF SPINS FOR TODAY. COME BACK TOMORROW!');setLeft(0)}
  else if(e==='cooldown'){msg('NEXT CHANCE: '+new Date(result.nextWinAt).toLocaleDateString())}
  else if(e==='has-coupon'){couponPanel(result.active);msg('YOU ALREADY HAVE A CODE!')}
  else if(e==='slow-down'){msg('EASY THERE, SPIN AGAIN IN A SECOND.');btn.disabled=false}
  else if(e==='closed'){msg('THE SLOTS ARE CLOSED RIGHT NOW.')}
  else{msg('SOMETHING WENT WRONG. TRY AGAIN.');btn.disabled=false}
  return;
 }
 S.reels=result.reels.slice();setLeft(result.spinsLeft>=99?'TEST':result.spinsLeft);
 if(result.coupon){
  box.querySelector('.m').classList.add('win');(result.outcome==='jackpot'?sfx.jack:sfx.win)();
  msg(result.outcome==='jackpot'?'JACKPOT!! THE CROWN! YOU WON '+result.coupon.pct+'% OFF!':'YOU WIN! '+result.coupon.pct+'% OFF ONE BEAT!');couponPanel(result.coupon);
  btn.disabled=true;if(result.test||testOn())btn.disabled=false;
  window.setCoupon&&window.setCoupon(result.coupon);
 }else{
  const r=result.reels,near=r[0]===r[1]||r[1]===r[2]||r[0]===r[2];near?sfx.near():sfx.lose();
  msg(near?'SO CLOSE! TWO MATCH. SPIN AGAIN!':['NOT THIS TIME. SPIN AGAIN!','ALMOST! TRY ONE MORE.','THE REELS ARE WARMING UP...'][Math.floor(Math.random()*3)]);
  btn.disabled=(result.spinsLeft<=0&&result.spinsLeft<99);
  if(result.spinsLeft<=0)msg('LAST SPIN USED. COME BACK TOMORROW!');
 }
}
const pick=()=>Math.floor(Math.random()*8);
window.slotsOpen=async function(){
 if(!box)build();box.classList.add('on');box.setAttribute('aria-hidden','false');document.addEventListener('keydown',key);
 S.reels=[pick(),pick(),pick()];drawAll();await refresh();
};

/* ---------- back office panel (Promo tab) ---------- */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.slotsAdmin=async function(bf,bl){
 const {data:s0,error:e0}=await sb.from('slot_settings').select('*').eq('id',1).maybeSingle();
 if(e0||!s0){bf.innerHTML='<h3>SLOTS (8-BIT GAME)</h3><div class="cur">The slots tables are not set up yet. Open the file <b>supabase/slots.sql</b> from the site folder, paste it into Supabase, SQL Editor, and run it once. Then reopen this tab.</div>';bl.innerHTML='';return}
 const n=x=>Math.max(1,Math.round(1/Math.max(.0001,Number(x))));
 bf.innerHTML=`<h3>SLOTS (8-BIT GAME)</h3>
  <label class="chk"><input type="checkbox" id="sl_en" ${s0.enabled?'checked':''}> GAME IS OPEN TO VISITORS (shows PLAY SLOTS on the banner)</label>
  <label class="chk"><input type="checkbox" id="sl_ck" ${s0.checkout_ready?'checked':''}> I UPDATED THE CHECKOUT FUNCTION FOR COUPONS (turn on only after you did)</label>
  <div class="two"><div><label>ONE WIN EVERY ABOUT N SPINS</label><input type="number" id="sl_wc" min="1" step="1" value="${n(s0.win_chance)}"></div><div><label>1 IN N WINS IS A JACKPOT</label><input type="number" id="sl_jc" min="1" step="1" value="${n(s0.jackpot_chance)}"></div></div>
  <div class="two"><div><label>WIN: % OFF ONE BEAT</label><input type="number" id="sl_wp" min="1" max="90" value="${s0.win_pct}"></div><div><label>JACKPOT: % OFF ONE BEAT</label><input type="number" id="sl_jp" min="1" max="90" value="${s0.jackpot_pct}"></div></div>
  <div class="two"><div><label>COUPON LASTS (HOURS)</label><input type="number" id="sl_ch" min="1" value="${s0.coupon_hours}"></div><div><label>SPINS PER BROWSER PER DAY</label><input type="number" id="sl_sp" min="1" value="${s0.spins_per_day}"></div></div>
  <div class="two"><div><label>MAX COUPONS PER DAY (ALL)</label><input type="number" id="sl_cc" min="0" value="${s0.daily_coupon_cap}"></div><div><label>DAYS BEFORE SAME BROWSER CAN WIN AGAIN</label><input type="number" id="sl_cd" min="1" value="${s0.cooldown_days}"></div></div>
  <button class="go" type="button" id="sl_save">SAVE SLOT SETTINGS</button><div id="sl_msg" style="font:600 12px Montserrat;color:var(--gold);margin-top:10px;min-height:16px"></div>
  <h3 style="margin-top:22px">TEST SLOTS (ADMIN)</h3>
  <label class="chk"><input type="checkbox" id="sl_test" ${testOn()?'checked':''}> TURN ON TEST SLOTS ON THIS BROWSER</label>
  <div class="cur">While on, PLAY SLOTS always shows for you, even when the game is closed. Spins do not count against limits, and you get buttons to FORCE A WIN, THE JACKPOT or a LOSS and to reset this browser. Test coupons are marked TEST and also work at checkout so you can try the full flow (use the cheapest beat).</div>`;
 const num=id=>parseFloat(bf.querySelector(id).value);
 bf.querySelector('#sl_save').onclick=async()=>{
  const row={id:1,enabled:bf.querySelector('#sl_en').checked,checkout_ready:bf.querySelector('#sl_ck').checked,win_chance:1/Math.max(1,num('#sl_wc')||8),jackpot_chance:1/Math.max(1,num('#sl_jc')||10),win_pct:Math.min(90,Math.max(1,Math.round(num('#sl_wp')||15))),jackpot_pct:Math.min(90,Math.max(1,Math.round(num('#sl_jp')||30))),coupon_hours:Math.max(1,Math.round(num('#sl_ch')||48)),spins_per_day:Math.max(1,Math.round(num('#sl_sp')||5)),daily_coupon_cap:Math.max(0,Math.round(num('#sl_cc')||0)),cooldown_days:Math.max(1,Math.round(num('#sl_cd')||14)),updated_at:new Date().toISOString()};
  const m=bf.querySelector('#sl_msg');m.textContent='Saving...';const {error}=await sb.from('slot_settings').upsert(row);m.textContent=error?'Error: '+error.message:'Saved.';if(!error&&window.slotsBoot)window.slotsBoot();
 };
 bf.querySelector('#sl_test').onchange=e=>{try{e.target.checked?localStorage.setItem('mzprd_slot_test','1'):localStorage.removeItem('mzprd_slot_test')}catch(x){}if(window.slotsBoot)window.slotsBoot()};
 /* log */
 const [sp,cp]=await Promise.all([sb.from('slot_spins').select('*').order('created_at',{ascending:false}).limit(60),sb.from('coupons').select('*').order('created_at',{ascending:false}).limit(60)]);
 const spins=sp.data||[],cps=cp.data||[],now=Date.now(),day=now-86400000;
 const st=c=>c.used_at?'USED':new Date(c.expires_at).getTime()<now?'EXPIRED':c.reserved_order?'IN CHECKOUT':'UNUSED';
 const wins=spins.filter(x=>x.outcome!=='lose'&&!x.is_test).length,real=spins.filter(x=>!x.is_test);
 const byB={};cps.filter(c=>!c.is_test).forEach(c=>{(byB[c.browser_id]=byB[c.browser_id]||[]).push(c)});
 const tbl=(rows,cols)=>rows.length?'<table class="dtab"><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</table>':'<div class="cur">Nothing yet.</div>';
 bl.innerHTML=`<div class="dcard"><h4>SLOTS AT A GLANCE</h4>${tbl([[real.filter(x=>new Date(x.created_at).getTime()>day).length,wins,cps.filter(c=>!c.is_test&&st(c)==='USED').length,cps.filter(c=>!c.is_test&&st(c)==='UNUSED').length,new Set(real.map(x=>x.browser_id)).size]],['SPINS (24H)','WINS (LAST 60)','CODES USED','CODES UNUSED','BROWSERS PLAYED'])}</div>
 <div class="dcard"><h4>WINNING BROWSERS</h4>${tbl(Object.entries(byB).map(([b,l])=>[esc(b.slice(0,8)),l.length,esc(l.map(c=>c.code+' ('+st(c)+')').join(', ')),new Date(l[0].created_at).toLocaleString()]),['BROWSER','WINS','CODES','LAST WIN'])}</div>
 <div class="dcard"><h4>COUPONS</h4>${tbl(cps.map(c=>[esc(c.code)+(c.is_test?' <span style="color:#35e0ff">TEST</span>':''),c.pct+'% '+esc(c.kind),st(c),esc(c.browser_id.slice(0,8)),new Date(c.expires_at).toLocaleString(),st(c)==='UNUSED'?'<button class="bo-btn rv" data-c="'+esc(c.code)+'" style="padding:4px 8px;font-size:9px">REVOKE</button>':'']),['CODE','PRIZE','STATUS','BROWSER','EXPIRES',''])}</div>
 <div class="dcard"><h4>RECENT SPINS</h4>${tbl(spins.slice(0,30).map(x=>[new Date(x.created_at).toLocaleString(),esc(x.browser_id.slice(0,8)),esc((x.reels||[]).map(i=>NAMES[i]).join(' / ')),esc(x.outcome.toUpperCase())+(x.is_test?' <span style="color:#35e0ff">TEST</span>':'')]),['TIME','BROWSER','REELS','RESULT'])}</div>`;
 bl.querySelectorAll('.rv').forEach(b=>b.onclick=async()=>{await sb.from('coupons').update({expires_at:new Date().toISOString()}).eq('code',b.dataset.c);toast('COUPON REVOKED');window.slotsAdmin(bf,bl)});
};
})();
