/* MZPRD Slots: pixel-art slot machine mini game (window.slotsOpen) and its back office panel (window.slotsAdmin).
   The server (edge function "slots") decides every spin; this file only draws it. */
(function(){
const NAMES=['DRUM PAD','KEYS','SAX','GUITAR','MIC','VINYL','HEADPHONES','CROWN'];
const OUT='#1b0f2b';
/* ---------- 32x32 shaded pixel icons ---------- */
const ICON={};
function mk(fn){
 const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');
 const R=(a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};
 const P=(a,b,col)=>{x.fillStyle=col;x.fillRect(a,b,1,1)};
 const D=(cx,cy,r,col)=>{x.fillStyle=col;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)if(i*i+j*j<=r*r+r*.5)x.fillRect(cx+i,cy+j,1,1)};
 const T=(pts,r,cols)=>{const st=f=>{for(let s=0;s<pts.length-1;s++){const[x0,y0]=pts[s],[x1,y1]=pts[s+1],n=(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*2)||1;for(let k=0;k<=n;k++)f(Math.round(x0+(x1-x0)*k/n),Math.round(y0+(y1-y0)*k/n))}};
  st((a,b)=>D(a,b,r+1,cols[0]));st((a,b)=>D(a,b,r,cols[1]));st((a,b)=>D(a-1,b-1,Math.max(1,r-1),cols[2]));if(cols[3])st((a,b)=>D(a-1,b-1,Math.max(0,r-3),cols[3]))};
 const poly=(pts,col)=>{x.fillStyle=col;const ys=pts.map(p=>p[1]),y0=Math.min(...ys),y1=Math.max(...ys);for(let y=y0;y<=y1;y++){const xs=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]))}xs.sort((p,q)=>p-q);for(let k=0;k+1<xs.length;k+=2)x.fillRect(Math.round(xs[k]),y,Math.round(xs[k+1])-Math.round(xs[k]),1)}};
 fn({R,P,D,T,poly});return c;
}
const PAD={r:['#ff3b4a','#ff9aa2'],o:['#ff9a1f','#ffc97a'],y:['#ffd34a','#fff2ad'],c:['#35e0ff','#b9f5ff'],p:['#b05cff','#dcb0ff']};
const drawers=[
 /* 0 drum pad */({R,P,D})=>{
  R(3,6,26,22,OUT);R(4,7,24,20,'#4b4d62');R(4,7,24,2,'#80839c');R(4,25,24,2,'#2b2c3a');R(4,9,1,16,'#62647c');
  R(7,9,10,4,OUT);R(8,10,8,2,'#2fd0ee');R(8,10,8,1,'#b9f5ff');D(23,11,2,OUT);D(23,11,1,'#d2d2de');P(22,10,'#fff');
  const g='rocy prcy oyrc'.replace(/ /g,'');for(let i=0;i<12;i++){const col=PAD[g[i]],x=6+(i%4)*6,y=15+Math.floor(i/4)*4;R(x,y,5,3,col[0]);R(x,y,5,1,col[1]);R(x,y+2,5,1,'rgba(0,0,0,.25)')}},
 /* 1 keys */({R,P})=>{
  R(2,5,28,5,OUT);R(3,6,26,3,'#6b6d82');R(3,6,26,1,'#9b9db3');P(6,7,'#35e0ff');P(7,7,'#35e0ff');P(24,7,'#ff3b4a');
  R(2,9,28,19,OUT);R(3,10,26,17,'#f6f2e8');for(let i=1;i<7;i++)R(3+Math.round(i*26/7),10,1,17,'#c9c3b2');R(3,10,26,2,'#ffffff');R(3,25,26,2,'#cfc9b8');
  [6,10,17,21,25].forEach(k=>{R(k,10,3,10,OUT);R(k+1,10,1,9,'#4a4a60');R(k,19,3,1,'#2a2a3c')})},
 /* 2 sax */({R,P,D,T})=>{
  T([[23,4],[20,6]],1,[OUT,'#5a3a10','#8a5a1c','#c98f3b']);
  T([[19,7],[16,12],[14,18],[13,23]],3,[OUT,'#a8670a','#ffcf3d','#fff3b0']);
  T([[13,23],[11,26],[8,26]],3,[OUT,'#a8670a','#ffcf3d','#fff3b0']);
  D(6,20,5,OUT);D(6,20,4,'#c98f1b');D(6,20,3,'#ffdf6a');D(6,20,2,'#6a4308');D(5,19,1,'#a8670a');
  [[16,12],[15,15],[14,18],[13,21]].forEach(([a,b])=>{D(a+3,b,1,OUT);P(a+3,b,'#fff3b0')})},
 /* 3 guitar */({R,P,D,T})=>{
  T([[17,13],[27,3]],1,[OUT,'#4a2a10','#7a4a20','#a8703a']);R(26,1,5,5,OUT);R(27,2,3,3,'#3a2210');P(27,2,'#8a8a99');P(29,2,'#8a8a99');
  D(14,17,5,OUT);D(10,23,7,OUT);D(14,17,4,'#9a4f18');D(10,23,6,'#9a4f18');D(14,17,3,'#c4772e');D(10,23,5,'#c4772e');D(8,21,2,'#e0a060');
  D(11,21,2,OUT);D(11,21,1,'#05030a');R(8,26,6,1,OUT);R(9,25,4,1,'#3a2210');
  for(let i=0;i<6;i++)P(18+i,12-i,'#d9d9e4');R(9,18,4,1,'#6b3410')},
 /* 4 mic */({R,P,D})=>{
  D(16,10,8,OUT);D(16,10,7,'#5d5f72');for(let j=-6;j<=6;j++)for(let i=-6;i<=6;i++)if(i*i+j*j<=40&&(i+j)%2===0)P(16+i,10+j,'#9fa2b8');D(13,7,2,'#d6d8e6');P(12,6,'#fff');
  R(9,15,14,3,OUT);R(10,16,12,1,'#e0242f');R(10,17,12,1,'#8a1219');
  R(12,18,8,12,OUT);R(13,18,6,11,'#2c2c3a');R(13,18,2,11,'#4b4b60');R(13,22,6,1,OUT);P(17,20,'#35e0ff')},
 /* 5 vinyl */({R,P,D})=>{
  D(16,16,15,OUT);D(16,16,14,'#15151d');
  for(let j=-14;j<=14;j++)for(let i=-14;i<=14;i++){const d=Math.sqrt(i*i+j*j);if(d>14||d<5)continue;const a=Math.atan2(j,i);const ring=(Math.round(d)%3===0);if(ring)P(16+i,16+j,'#262634');if(d>6&&d<13&&a>-1.2&&a<-0.5)P(16+i,16+j,ring?'#4a4a60':'#34344a')}
  D(16,16,5,'#e0242f');D(16,16,5,'#e0242f');D(16,16,4,'#ff5a66');D(16,16,2,OUT);P(16,16,'#fff');R(13,13,3,1,'#ffb3b8')},
 /* 6 headphones */({R,P,D,T})=>{
  T([[6,19],[5,12],[9,6],[16,4],[23,6],[27,12],[26,19]],2,[OUT,'#6b6d82','#aeb1c8','#e6e8f5']);
  R(2,16,8,13,OUT);R(3,17,6,11,'#e0242f');R(3,17,2,11,'#ff7a84');R(3,26,6,2,'#8a1219');R(5,19,3,6,'#2a0d12');
  R(22,16,8,13,OUT);R(23,17,6,11,'#e0242f');R(23,17,2,11,'#ff7a84');R(23,26,6,2,'#8a1219');R(25,19,3,6,'#2a0d12')},
 /* 7 crown */({R,P,D,poly})=>{
  poly([[3,26],[4,9],[10,16],[16,5],[22,16],[28,9],[29,26]],OUT);
  poly([[5,25],[5,13],[10,19],[16,9],[22,19],[27,13],[27,25]],'#ffcf3d');
  poly([[16,9],[22,19],[27,13],[27,25],[16,25]],'#e3a52a');R(5,13,2,12,'#fff3b0');R(5,22,22,3,'#c98f1b');R(5,22,22,1,'#fff3b0');
  R(4,25,24,3,OUT);R(5,26,22,1,'#ffdf6a');
  D(16,17,2,OUT);D(16,17,1,'#ff3b4a');P(16,16,'#ffb3b8');D(10,21,1,'#35e0ff');D(22,21,1,'#3be08a');P(10,20,'#fff');P(22,20,'#fff');
  [[4,8],[16,4],[28,8]].forEach(([a,b])=>{D(a,b,1,'#fff7d1');P(a,b,'#fff')})}
];
const icon=i=>ICON[i]||(ICON[i]=mk(drawers[i]));

/* ---------- sound ---------- */
let AC=null,muted=false;
function beep(f,d,t,type,v){if(muted)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.value=f;g.gain.value=v||.05;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(t||0)+d);o.connect(g);g.connect(AC.destination);o.start(AC.currentTime+(t||0));o.stop(AC.currentTime+(t||0)+d)}catch(e){}}
const sfx={tick:()=>beep(160,.05,0,'square',.035),stop:()=>{beep(300,.06,0,'square',.06);beep(200,.1,.04,'triangle',.06)},
 win:()=>[523,659,784,1047,784,1047,1319].forEach((f,i)=>beep(f,.14,i*.1,'square',.055)),
 jack:()=>[523,659,784,1047,1319,1047,1319,1568,1319,1568,2093,2637].forEach((f,i)=>beep(f,.13,i*.085,'square',.055)),
 lose:()=>[330,277,220,165].forEach((f,i)=>beep(f,.16,i*.13,'triangle',.07)),near:()=>[392,392,330].forEach((f,i)=>beep(f,.12,i*.12,'square',.05)),lever:()=>{beep(120,.18,0,'sawtooth',.05);beep(90,.12,.12,'square',.05)}};

/* ---------- server ---------- */
const FN=()=>SB_URL+'/functions/v1/slots';
async function call(body){
 let tok=SB_KEY;if(body.test){try{const {data:{session}}=await sb.auth.getSession();if(session)tok=session.access_token}catch(e){}}
 const r=await fetch(FN(),{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+tok},body:JSON.stringify({...body,browser:window.mzBid()})});
 const j=await r.json().catch(()=>({error:'Network problem. Try again.'}));j._status=r.status;return j;
}
const testOn=()=>{try{return localStorage.getItem('mzprd_slot_test')==='1'}catch(e){return false}};

/* ---------- the machine ---------- */
let box=null,S={status:null,busy:false,reels:[0,1,2],raf:0,coupon:null,scale:3};
const $s=q=>box.querySelector(q);
function css(){
 if(document.getElementById('slCss'))return;
 if(!document.querySelector('link[data-sl]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;600;700&family=Silkscreen:wght@400;700&display=swap';l.dataset.sl='1';document.head.appendChild(l)}
 const st=document.createElement('style');st.id='slCss';
 st.textContent=`#slotModal{display:none;position:fixed;inset:0;z-index:95;background:radial-gradient(ellipse at 50% 30%,rgba(60,20,80,.55),rgba(0,0,0,.9));align-items:center;justify-content:center;padding:12px;font-family:'Pixelify Sans','Trebuchet MS',sans-serif}
#slotModal.on{display:flex}
#slotModal .m{position:relative;width:min(460px,100%);max-height:97vh;overflow:auto;padding:6px 4px 10px}
#slotModal .x{position:absolute;top:2px;right:2px;z-index:5;width:38px;height:38px;border-radius:10px;background:linear-gradient(#3a2a52,#241636);border:2px solid #0d0716;box-shadow:inset 0 2px 0 rgba(255,255,255,.18);color:#ffd34a;font:700 20px 'Pixelify Sans';cursor:pointer;padding:0;line-height:1}
#slotModal .x:hover{color:#fff}
#slotModal .cab{position:relative;background:linear-gradient(180deg,#43305f 0%,#2a1b40 55%,#1c1030 100%);border:4px solid #0d0716;border-radius:22px;box-shadow:inset 0 0 0 3px #62498a,inset 0 10px 0 rgba(255,255,255,.07),0 8px 0 #0d0716,0 0 50px rgba(224,36,47,.4);padding:12px 14px 14px}
#slotModal .marq{position:relative;background:linear-gradient(#f0303b,#a31220);border:3px solid #0d0716;border-radius:12px;padding:8px 8px 6px;text-align:center;box-shadow:inset 0 3px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.25)}
#slotModal .marq h2{margin:0;font:700 22px/1.2 'Silkscreen','Pixelify Sans',monospace;letter-spacing:3px;color:#fff3b0;text-shadow:0 0 14px #ffd34a,2px 2px 0 #7a1218}
#slotModal .marq small{display:block;font:500 11px 'Pixelify Sans';letter-spacing:3px;color:#ffd9dc;margin-top:2px}
#slotModal .bulbs{display:flex;justify-content:space-between;padding:0 2px;margin:5px 0 0}
#slotModal .bulbs i{width:9px;height:9px;border-radius:50%;background:#ffe27a;box-shadow:0 0 8px #ffd34a;animation:slBulb 1s steps(2,end) infinite;animation-delay:calc(var(--i)*-.09s)}
@keyframes slBulb{0%{opacity:1}50%{opacity:.25;box-shadow:none}100%{opacity:1}}
#slotModal .win{position:relative;margin:12px 24px 0;background:#0a0612;border:4px solid #0d0716;border-radius:12px;box-shadow:0 0 0 3px #62498a,inset 0 0 0 2px #000;padding:8px}
#slotModal .reels{display:flex;gap:6px;justify-content:center;position:relative}
#slotModal canvas.r{display:block;image-rendering:pixelated;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6)}
#slotModal .glass{position:absolute;inset:8px;pointer-events:none;border-radius:6px;background:linear-gradient(115deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,0) 32%,rgba(255,255,255,.05) 58%,rgba(255,255,255,0) 100%),linear-gradient(180deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 78%,rgba(0,0,0,.5) 100%);z-index:3}
#slotModal .pl{position:absolute;left:0;right:0;top:50%;height:3px;margin-top:-1px;background:linear-gradient(90deg,transparent,rgba(255,60,70,.95) 12%,rgba(255,60,70,.95) 88%,transparent);box-shadow:0 0 8px #ff3b4a;z-index:4;pointer-events:none}
#slotModal .arw{position:absolute;top:50%;margin-top:-9px;width:0;height:0;border:9px solid transparent;z-index:4}
#slotModal .arw.l{left:-17px;border-left-color:#ffd34a;border-right:0}
#slotModal .arw.r{right:-17px;border-right-color:#ffd34a;border-left:0}
#slotModal .lever{position:absolute;right:-30px;top:26%;width:16px;height:90px;z-index:2;cursor:pointer}
#slotModal .lever b{position:absolute;left:5px;top:18px;width:6px;height:64px;background:linear-gradient(90deg,#8d8aa5,#e8e6f5 50%,#6f6c88);border:1px solid #0d0716;border-radius:3px;transform-origin:50% 90%;transition:transform .18s ease-in}
#slotModal .lever b:before{content:"";position:absolute;left:-6px;top:-18px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff9aa2,#e0242f 55%,#7a1218);border:2px solid #0d0716}
#slotModal .lever.pull b{transform:scaleY(-.55) translateY(8px)}
#slotModal .info{display:flex;justify-content:space-between;align-items:center;font:600 13px 'Pixelify Sans';letter-spacing:2px;color:#9fe3ff;margin:12px 6px 8px}
#slotModal .info button{background:none;border:0;color:#9fe3ff;font:600 12px 'Pixelify Sans';letter-spacing:2px;cursor:pointer}
#slotModal .spin{display:block;width:100%;background:linear-gradient(#ff4b57,#d51f2c 55%,#a8141f);border:3px solid #0d0716;border-radius:14px;box-shadow:inset 0 3px 0 rgba(255,255,255,.45),0 6px 0 #5e0d15;color:#fff;font:700 24px 'Pixelify Sans';letter-spacing:5px;padding:12px;cursor:pointer;text-shadow:0 2px 0 #7a1218}
#slotModal .spin:active{transform:translateY(5px);box-shadow:inset 0 3px 0 rgba(255,255,255,.4),0 1px 0 #5e0d15}
#slotModal .spin:disabled{background:linear-gradient(#6c5a82,#4a3a5e);box-shadow:inset 0 3px 0 rgba(255,255,255,.2),0 6px 0 #2a2038;color:#b9aad0;text-shadow:none;cursor:default}
#slotModal .tray{height:12px;margin:12px 18px 0;background:linear-gradient(#08040f,#1d1230);border:2px solid #0d0716;border-radius:0 0 12px 12px;box-shadow:inset 0 4px 6px rgba(0,0,0,.7)}
#slotModal .msg{font:600 15px/1.45 'Pixelify Sans';color:#fff;text-align:center;margin:14px 6px 2px;min-height:24px;text-shadow:0 2px 0 rgba(0,0,0,.6)}
#slotModal .cp{margin:12px 6px 0;position:relative;background:#f7f0dc;color:#2a1b10;padding:14px 16px;border-radius:6px;text-align:center;box-shadow:0 0 0 3px #0d0716,0 6px 0 3px #0d0716;background-image:radial-gradient(circle at 0 50%,#150a24 9px,transparent 10px),radial-gradient(circle at 100% 50%,#150a24 9px,transparent 10px)}
#slotModal .cp small{display:block;font:600 12px 'Pixelify Sans';letter-spacing:2px;color:#7a5a30}
#slotModal .cp b{display:block;font:700 24px 'Silkscreen','Courier New',monospace;letter-spacing:2px;color:#b3121e;margin:4px 0;word-break:break-all}
#slotModal .row{display:flex;gap:8px;margin-top:10px}
#slotModal .row button,#slotModal .tools button{flex:1;background:linear-gradient(#3a2a52,#241636);border:2px solid #0d0716;border-radius:9px;box-shadow:inset 0 2px 0 rgba(255,255,255,.2);color:#ffd34a;font:600 13px 'Pixelify Sans';letter-spacing:1px;padding:9px 6px;cursor:pointer}
#slotModal .row button:hover,#slotModal .tools button:hover{color:#fff;background:linear-gradient(#4b3a66,#2f1f46)}
#slotModal .cp .row button{background:linear-gradient(#fff6c8,#ffd34a);color:#4a2a08;border-color:#4a2a08;box-shadow:inset 0 2px 0 rgba(255,255,255,.7)}
#slotModal .pays{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:14px}
#slotModal .pays figure{margin:0;text-align:center}
#slotModal .pays canvas{width:34px;height:34px;image-rendering:pixelated;background:linear-gradient(#e6dfcb,#fbf7ea,#e6dfcb);border:2px solid #0d0716;border-radius:5px;display:block}
#slotModal .pays figcaption{font:500 8px 'Pixelify Sans';color:#9d8cb8;letter-spacing:1px;margin-top:2px}
#slotModal .cap{font:500 11px 'Pixelify Sans';color:#b59fd6;text-align:center;margin-top:6px;letter-spacing:1px}
#slotModal .fine{font:500 10px/1.6 'Pixelify Sans';color:#8b79a8;margin:12px 8px 0;text-align:center}
#slotModal .tools{margin:12px 6px 0;border-top:2px dashed #35e0ff;padding-top:10px}
#slotModal .tools h5{font:600 11px 'Pixelify Sans';color:#35e0ff;margin:0 0 8px;letter-spacing:1px}
#slotModal .tools .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#slotModal .winfx .cab{animation:slGlow .5s ease-in-out 6 alternate}
@keyframes slGlow{from{box-shadow:inset 0 0 0 3px #62498a,inset 0 10px 0 rgba(255,255,255,.07),0 8px 0 #0d0716,0 0 50px rgba(224,36,47,.4)}to{box-shadow:inset 0 0 0 3px #ffd34a,inset 0 10px 0 rgba(255,255,255,.1),0 8px 0 #0d0716,0 0 90px rgba(255,211,74,.9)}}
#slotModal canvas.cf{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:9}
@media(max-width:480px){#slotModal .marq h2{font-size:18px}#slotModal .win{margin:12px 12px 0}#slotModal .lever{display:none}}`;
 document.head.appendChild(st);
}
function build(){
 css();box=document.createElement('div');box.id='slotModal';box.setAttribute('aria-hidden','true');
 S.scale=(innerHeight<820||innerWidth<520)?2:3;
 box.innerHTML=`<div class="m" role="dialog" aria-label="Play slots"><button class="x" id="slX" aria-label="Close">&times;</button>
 <div class="cab"><div class="marq"><h2>MZPRD SLOTS</h2><small>MATCH 3 TO WIN A BEAT DISCOUNT</small><div class="bulbs">${Array.from({length:15},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div></div>
 <div class="win"><div class="reels" id="slReels">${[0,1,2].map(i=>`<canvas class="r" id="r${i}" width="32" height="96" style="width:${32*S.scale}px;height:${96*S.scale}px"></canvas>`).join('')}</div><div class="glass"></div><div class="pl"></div><span class="arw l"></span><span class="arw r"></span><div class="lever" id="slLever"><b></b></div></div>
 <div class="info"><span id="slLeft">SPINS LEFT: -</span><button id="slMute">SOUND: ON</button></div>
 <button class="spin" id="slSpin">SPIN</button><div class="tray"></div></div>
 <div class="msg" id="slMsg">Line up 3 of the same to win a discount code.</div><div id="slCp"></div>
 <div class="pays" id="slPays"></div><div class="cap">3 MATCH = WIN &nbsp;/&nbsp; 3 CROWNS = JACKPOT</div>
 <div class="tools" id="slTools" style="display:none"></div>
 <div class="fine">Free promo game, no purchase needed. One win per browser, then a break before the next. Codes are single use, expire, and work on one beat.</div></div>`;
 document.body.appendChild(box);
 $s('#slX').onclick=shut;box.onclick=e=>{if(e.target===box)shut()};
 $s('#slSpin').onclick=()=>spin();$s('#slLever').onclick=()=>{if(!S.busy&&!$s('#slSpin').disabled)spin()};
 $s('#slMute').onclick=()=>{muted=!muted;$s('#slMute').textContent='SOUND: '+(muted?'OFF':'ON')};
 for(let i=0;i<8;i++){const f=document.createElement('figure'),c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').drawImage(icon(i),0,0);f.appendChild(c);const cap=document.createElement('figcaption');cap.textContent=NAMES[i];f.appendChild(cap);$s('#slPays').appendChild(f)}
 drawAll();
}
function shut(){box.classList.remove('on');box.setAttribute('aria-hidden','true');document.removeEventListener('keydown',key);cancelAnimationFrame(S.raf)}
function key(e){if(e.key==='Escape')shut()}
/* reel: 3 visible rows of 32px; strip array index 2 is the centre row at rest */
function drawReel(i,off,syms,blur){
 const cv=$s('#r'+i),x=cv.getContext('2d');x.imageSmoothingEnabled=false;
 const g=x.createLinearGradient(0,0,0,96);g.addColorStop(0,'#cfc6b0');g.addColorStop(.28,'#f7f2e3');g.addColorStop(.5,'#fffdf4');g.addColorStop(.72,'#f7f2e3');g.addColorStop(1,'#cfc6b0');x.fillStyle=g;x.fillRect(0,0,32,96);
 for(let k=0;k<4;k++){const s=syms[k];if(s==null)continue;const y=(k-1)*32+off;
  if(blur){x.globalAlpha=.28;x.drawImage(icon(s),0,y-5);x.drawImage(icon(s),0,y+5);x.globalAlpha=.55}
  x.drawImage(icon(s),0,y);x.globalAlpha=1}
 x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,0,1,96);x.fillRect(31,0,1,96);
}
function drawAll(){for(let i=0;i<3;i++){const s=S.reels[i];drawReel(i,0,[(s+6)%8,(s+7)%8,s,(s+1)%8],false)}}
function setLeft(n){$s('#slLeft').textContent='SPINS LEFT: '+(n==null?'-':n)}
function msg(t){$s('#slMsg').innerHTML=t}
function confetti(){
 const m=box.querySelector('.cab'),cv=document.createElement('canvas');cv.className='cf';m.appendChild(cv);const r=m.getBoundingClientRect();cv.width=r.width;cv.height=r.height;const x=cv.getContext('2d');
 const cols=['#ffd34a','#ff3b4a','#35e0ff','#3be08a','#ffffff','#b05cff'],ps=Array.from({length:90},()=>({x:r.width/2+(Math.random()-.5)*60,y:r.height*.45,vx:(Math.random()-.5)*9,vy:-Math.random()*10-3,s:3+Math.floor(Math.random()*3)*1,c:cols[Math.floor(Math.random()*cols.length)]}));
 const t0=performance.now();const f=now=>{x.clearRect(0,0,cv.width,cv.height);ps.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;x.fillStyle=p.c;x.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s)});if(now-t0<2600)requestAnimationFrame(f);else cv.remove()};requestAnimationFrame(f);
}
function couponPanel(c){
 if(!c){$s('#slCp').innerHTML='';return}
 S.coupon=c;const left=()=>{const ms=new Date(c.expires_at).getTime()-Date.now();if(ms<=0)return 'EXPIRED';const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h+'H '+String(m).padStart(2,'0')+'M LEFT'};
 $s('#slCp').innerHTML=`<div class="cp"><small>YOUR DISCOUNT CODE ${c.kind==='jackpot'?'(JACKPOT)':''}</small><b>${c.code}</b><small>${c.pct}% OFF ONE BEAT &nbsp;/&nbsp; <span id="slExp">${left()}</span> &nbsp;/&nbsp; SINGLE USE</small>
  <div class="row"><button id="slCopy">COPY CODE</button><button id="slUse">USE IT IN MY CART</button></div></div>`;
 $s('#slCopy').onclick=async()=>{try{await navigator.clipboard.writeText(c.code);toast('CODE COPIED')}catch(e){toast(c.code)}};
 $s('#slUse').onclick=async()=>{await window.applyCoupon(c.code);shut();document.getElementById('cartBtn').click()};
 clearInterval(S.exp);S.exp=setInterval(()=>{const e=$s('#slExp');if(e)e.textContent=left()},30000);
}
async function refresh(){
 const st=await call({action:'status',test:testOn()});S.status=st;
 if(st.error){msg('THE SLOTS ARE OFFLINE RIGHT NOW.');$s('#slSpin').disabled=true;return}
 setLeft(st.test?'TEST':st.spinsLeft);
 if(st.active){couponPanel(st.active);msg('You already have a code. Use it before it expires!');$s('#slSpin').disabled=true}
 else if(st.nextWinAt){msg('Nice win last time! Next chance: '+new Date(st.nextWinAt).toLocaleDateString());$s('#slSpin').disabled=true}
 else if(!st.test&&st.spinsLeft<=0){msg('Out of spins for today. Come back tomorrow!');$s('#slSpin').disabled=true}
 else{$s('#slSpin').disabled=false;msg('Line up 3 of the same to win a discount code. 3 crowns is the jackpot.')}
 tools(st);
}
function tools(st){
 const t=$s('#slTools');if(!(st.admin&&testOn())){t.style.display='none';return}
 t.style.display='block';t.innerHTML=`<h5>ADMIN TEST MODE: spins are not counted, coupons are marked TEST</h5><div class="g"><button data-f="win">FORCE WIN</button><button data-f="jackpot">FORCE JACKPOT</button><button data-f="lose">FORCE LOSS</button><button data-f="">RANDOM SPIN</button></div><div class="row"><button id="slReset">RESET THIS BROWSER (CLEAR LIMITS AND CODES)</button></div>`;
 t.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>spin(b.dataset.f||''));
 t.querySelector('#slReset').onclick=async()=>{await call({action:'reset',test:true});couponPanel(null);window.clearCoupon&&window.clearCoupon();await refresh();toast('SLOTS RESET FOR THIS BROWSER')};
}
const pick=()=>Math.floor(Math.random()*8);
async function spin(force){
 if(S.busy)return;S.busy=true;const btn=$s('#slSpin');btn.disabled=true;couponPanel(null);box.classList.remove('winfx');msg('Spinning...');
 const lv=$s('#slLever');lv.classList.add('pull');setTimeout(()=>lv.classList.remove('pull'),260);sfx.lever();
 try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume&&AC.resume()}catch(e){}
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
    s.off+=s.phase==='spin'?22:(s.phase==='insert'?15:10);
    if(s.off>=32){s.off-=32;
     if(s.phase==='spin')s.syms.unshift(pick());
     else if(s.phase==='insert'){s.syms.unshift(result.reels[i]);s.phase='s1'}
     else if(s.phase==='s1'){s.syms.unshift(pick());s.phase='s2'}
     else{s.syms.unshift(pick());s.off=0;s.done=true;sfx.stop()}
     s.syms.length=4}
    drawReel(i,s.off,s.syms,s.phase==='spin'||s.phase==='insert');
   });
   if(now-lastTick>100&&!allDone){sfx.tick();lastTick=now}
   if(allDone||el>9000)return res();S.raf=requestAnimationFrame(frame)};
  S.raf=requestAnimationFrame(frame);
 });
 await resP;
 S.busy=false;
 if(!result||result.error){
  const e=result&&result.error;drawAll();
  if(e==='no-spins'){msg('Out of spins for today. Come back tomorrow!');setLeft(0)}
  else if(e==='cooldown'){msg('Next chance: '+new Date(result.nextWinAt).toLocaleDateString())}
  else if(e==='has-coupon'){couponPanel(result.active);msg('You already have a code!')}
  else if(e==='slow-down'){msg('Easy there, spin again in a second.');btn.disabled=false}
  else if(e==='closed'){msg('The slots are closed right now.')}
  else{msg('Something went wrong. Try again.');btn.disabled=false}
  return;
 }
 S.reels=result.reels.slice();setLeft(result.spinsLeft>=99?'TEST':result.spinsLeft);
 if(result.coupon){
  box.classList.add('winfx');confetti();(result.outcome==='jackpot'?sfx.jack:sfx.win)();
  msg(result.outcome==='jackpot'?'JACKPOT! Three crowns! You won '+result.coupon.pct+'% off!':'YOU WIN! '+result.coupon.pct+'% off one beat!');couponPanel(result.coupon);
  btn.disabled=true;if(testOn())btn.disabled=false;
  window.setCoupon&&window.setCoupon(result.coupon);
 }else{
  const r=result.reels,near=r[0]===r[1]||r[1]===r[2]||r[0]===r[2];near?sfx.near():sfx.lose();
  msg(near?'So close! Two match. Spin again!':['Not this time. Spin again!','Almost! Try one more.','The reels are warming up...'][Math.floor(Math.random()*3)]);
  btn.disabled=(result.spinsLeft<=0&&result.spinsLeft<99);
  if(result.spinsLeft<=0)msg('Last spin used. Come back tomorrow!');
 }
}
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
