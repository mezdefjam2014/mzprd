/* MZPRD Video Studio: turns a beat or sample pack (cover + preview or your own full file) into a 16:9 or 9:16 video.
   Loaded on demand by the back office. Everything renders in the browser: a canvas is drawn live and recorded together
   with the audio (MediaRecorder), so the video takes as long to render as the audio plays. Keep this tab visible while rendering. */
(function(){
const SITE='https://mzprd.com';
const PRESETS={clean:{grain:false,vig:true},grunge:{grain:true,vig:true},film:{grain:true,vig:true},animated:{grain:false,vig:true},minimal:{grain:false,vig:false},
 noir:{grain:true,vig:true,font:'Impact',color:'#f2f2f2',vis:'waveform',visColor:'#bdbdbd',glow:false},
 golden:{grain:true,vig:true,font:'Impact',color:'#fff3e2',vis:'waveform',visColor:'#f0c48a',glow:false},
 midnight:{grain:true,vig:true,font:'Impact',color:'#eaf4ff',vis:'waveform',visColor:'#8fc4ff',glow:false},
 vinyl:{grain:true,vig:true,font:'Impact',color:'#ffffff',vis:'none',visColor:'#e0242f',glow:false},
 archive:{grain:true,vig:true,font:'Impact',color:'#efe9df',vis:'none',visColor:'#efe9df',glow:false},
 smoke:{grain:true,vig:true,font:'Impact',color:'#f3ece4',vis:'waveform',visColor:'#c9302c',glow:false},
 stage:{grain:true,vig:true,font:'Impact',color:'#ffffff',vis:'bars',visColor:'#d8d8d8',glow:false},
 crate:{grain:true,vig:true,vis:'none'},ipod:{grain:true,vig:true,vis:'none'},sleeve:{grain:true,vig:true,vis:'none'},stack:{grain:true,vig:true,vis:'none'},shatter:{grain:true,vig:true,vis:'none'},mpc:{grain:true,vig:true,vis:'none'},speakers:{grain:true,vig:true,vis:'none'},'price tag':{grain:true,vig:true,vis:'none'},'giant record':{grain:true,vig:true,vis:'none'},spin:{grain:true,vig:true,vis:'none'},'red split':{grain:false,vig:false,vis:'none'},logo:{grain:true,vig:true,vis:'none'},daw:{grain:true,vig:true,vis:'none'}};
const FONTS={'Impact':'Impact, Haettenschweiler, sans-serif','Montserrat':'Montserrat, sans-serif','Press Start':"'Press Start 2P', monospace",'Serif':'Georgia, serif','Brush':"'Brush Script MT', cursive"};
const VIS=['waveform','bars','circle','none'],ANIM=['zoom','pan','none'];
const S={items:[],kind:'beats',item:null,cover:null,bd:null,fmt:'16:9',layout:'fit',preset:'clean',anim:'zoom',grain:false,vig:true,
 end:true,vis:'waveform',visColor:'#e8b94a',visH:80,sync:true,glow:false,font:'Impact',size:100,color:'#e8b94a',stroke:3,maxLen:'',
 buf:null,src:'preview',srcLabel:'',
 tx:{intro:{on:true,text:'NEW BEAT',start:0},tag:{on:true,text:'PROD. BY MEZTHEPROD',start:0},title:{on:true,text:'',start:1},info:{on:true,text:'',start:2}}};
let A=null,run=null,noise=null,scrub=0,mounted=false,OFF=null,lastBass=0;
const R={busy:false};
const $s=s=>document.querySelector('#studio '+s);
const e2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dims=()=>S.fmt==='16:9'?[1920,1080]:[1080,1920];
const SHORT_DEF=90,SHORT_MAX=90;
const len=()=>{const d=S.buf?S.buf.duration:30,m=parseFloat(S.maxLen),p=S.fmt==='9:16';return Math.max(1,Math.min(d,m>0?m:(p?SHORT_DEF:Infinity),p?SHORT_MAX:Infinity))};

function css(){
 if(document.getElementById('studioCss'))return;
 const st=document.createElement('style');st.id='studioCss';
 st.textContent=`#studio{display:none}#studio.on{display:block}
#studio .sg{display:grid;grid-template-columns:minmax(250px,300px) minmax(0,1fr) minmax(250px,300px);gap:18px;align-items:start}
@media(max-width:1100px){#studio .sg{grid-template-columns:1fr}}
#studio .pn{background:#0c0c0f;border:1px solid #2a2a2e;padding:14px}
#studio h4{font:700 11px Montserrat;letter-spacing:.3em;color:var(--gold);margin:0 0 10px}
#studio h4:not(:first-child){margin-top:18px}
#studio label{display:block;font:600 10px Montserrat;letter-spacing:.22em;color:#8e8e94;margin:10px 0 5px}
#studio select,#studio input[type=text],#studio input[type=number],#studio textarea{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:9px;font:500 13px Montserrat}
#studio textarea{min-height:70px;resize:vertical}
#studio input[type=file]{width:100%;color:#a9a9ae;font:500 11px Montserrat}
#studio input[type=range]{width:100%;accent-color:var(--red)}
#studio .row{display:flex;gap:8px;align-items:center}#studio .row>*{flex:1}
#studio .chk{display:flex;gap:8px;align-items:center;letter-spacing:.12em;margin:8px 0}
#studio .chk input{flex:none;width:auto}
#studio .seg{display:flex;gap:6px;margin-bottom:6px}
#studio .seg button,#studio .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.2em;padding:10px 8px;flex:1}
#studio .seg button.on{background:var(--red);border-color:var(--red)}
#studio .btn:hover,#studio .seg button:hover{border-color:#fff}
#studio .go{display:block;width:100%;background:var(--red);border:0;color:#fff;font:700 13px Montserrat;letter-spacing:.3em;padding:15px;margin-top:12px}
#studio .go:disabled{opacity:.45}
#studio .il{max-height:300px;overflow:auto;border:1px solid #2a2a2e}
#studio .it{display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px solid #1d1d21;cursor:pointer}
#studio .it.on{background:#2a0e11;outline:1.5px solid var(--red)}
#studio .it img,#studio .it i{width:44px;height:44px;object-fit:cover;background:#1b1b20;flex:none}
#studio .it b{display:block;font:700 12px Montserrat;color:#fff;letter-spacing:.08em}#studio .it span{font:500 10px Montserrat;color:#8e8e94}
#studio canvas{width:100%;display:block;background:#000;border:1px solid #2a2a2e;max-height:70vh;object-fit:contain}
#studio .cvw{display:flex;justify-content:center;background:#000}
#studio .cvw canvas{width:auto;max-width:100%}
#studio .trow{display:grid;grid-template-columns:22px 70px 1fr 54px;gap:8px;align-items:center;margin:6px 0}
#studio .trow span{font:600 10px Montserrat;letter-spacing:.14em;color:#c9c9ce}
#studio .trow input[type=text],#studio .trow input[type=number]{padding:7px}
#studio .msg{font:500 12px Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}
#studio .bar{height:6px;background:#1b1b20;margin-top:8px}#studio .bar b{display:block;height:100%;width:0;background:var(--red)}
#studio .yt textarea{min-height:60px}
#studio canvas#sWave{width:100%;height:56px;max-height:none;min-width:0;cursor:pointer;touch-action:none;background:#050506}
#studio.busy .pn:not(.yt) input,#studio.busy .pn:not(.yt) select,#studio.busy .pn:not(.yt) textarea,#studio.busy .pn:not(.yt) button,#studio.busy .pn:not(.yt) .it{pointer-events:none;opacity:.5}
#studio .ygl{display:grid;gap:10px;margin-top:12px}
#studio .ygc{display:grid;grid-template-columns:240px 1fr;gap:14px;border:1px solid #1f1f23;background:#0d0d0f;padding:10px;transition:border-color .15s}
#studio .ygc:hover,#studio .ygc.on{border-color:#e0242f}
#studio .ygt{cursor:zoom-in;aspect-ratio:16/9;background:#000;overflow:hidden}.ygl.v9 .ygc{grid-template-columns:140px 1fr!important}.ygl.v9 .ygt{aspect-ratio:9/16!important;width:140px!important;height:auto!important}.ygl.v9 .ygt canvas{width:100%!important;height:100%!important;object-fit:cover}.yglbx.v9{width:min(420px,80vw)}#studio .ygt canvas{width:100%!important;height:100%!important;max-height:none;border:0;display:block}
#studio .ygb{min-width:0;display:flex;flex-direction:column;gap:5px}#studio .ygb b{font:600 15px/1.35 Inter,sans-serif;color:#fff;letter-spacing:0}#studio .ygb small{font:500 11px Inter,sans-serif;color:#8a8a92}
#studio .ygh{display:flex;align-items:center;gap:10px}#studio .ygsc{font:400 26px/1 Anton,sans-serif}
#studio .ygs{background:none;border:1px solid #333;color:#aaa;font-size:15px;padding:2px 8px;cursor:pointer}#studio .ygs.on{color:#e0242f;border-color:#e0242f}
#studio .ygx{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}#studio .ygx .btn{flex:none;padding:8px 10px;font-size:10px}
#studio .ygo{grid-column:1/-1;border-top:1px solid #1f1f23;padding-top:8px}#studio .ygo textarea{font:500 12px/1.5 ui-monospace,monospace}

.yglb{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:24px;animation:yglbIn .18s ease-out}
@keyframes yglbIn{from{opacity:0}to{opacity:1}}
.yglbx{position:relative;width:min(1280px,94vw);display:flex;flex-direction:column;gap:12px}
.yglbx canvas{width:100%;height:auto;display:block;box-shadow:0 30px 80px rgba(0,0,0,.8);border:1px solid #2a2a2e}
.yglbx b{font:600 16px Inter,sans-serif;color:#fff}
.yglbr{display:flex;gap:8px}.yglbr .btn{background:#111113;border:1px solid #333;color:#fff;font:800 11px Inter,sans-serif;letter-spacing:.14em;padding:11px 14px;cursor:pointer}.yglbr .btn:hover{border-color:#fff}
.yglbc{position:absolute;top:-14px;right:-14px;width:40px;height:40px;border-radius:50%;background:#e0242f;border:0;color:#fff;font:700 24px/1 Inter,sans-serif;cursor:pointer;z-index:2}
@media(max-width:700px){#studio .ygc{grid-template-columns:1fr}}
#studio .cnt{font:500 10px Montserrat;color:#6c6c73;letter-spacing:.1em;margin-top:4px}
#studio #thGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
#studio .thc{background:#050506;border:1px solid #2a2a2e;padding:5px}
#studio .thc canvas{width:100%;height:auto;max-height:none;border:0;cursor:zoom-in}
#studio .thc b{display:block;font:700 9px Montserrat;letter-spacing:.14em;color:#c9c9ce;margin:4px 0}
#studio .thc .two2 button{padding:7px 2px;font-size:9px;letter-spacing:.08em}
#thLb{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out}
#thLb canvas{max-width:92vw;max-height:92vh;box-shadow:0 0 60px #000}
#mixBtn,#thOpen{display:block;width:100%;margin-top:14px;background:#14141a;border:1.5px solid rgba(224,36,47,.7);color:#fff;font:700 12px Montserrat;letter-spacing:.3em;padding:14px;animation:thGlow 3.2s ease-in-out infinite}
@keyframes thGlow{0%,100%{box-shadow:0 0 0 rgba(224,36,47,0)}50%{box-shadow:0 0 14px rgba(224,36,47,.28)}}
#mixBtn:hover,#thOpen:hover{border-color:#e0242f;background:#1b1b22}
#insBtn{display:block;width:100%;margin-top:14px;background:#fff;color:#0b0b0d;font:900 12px Montserrat;letter-spacing:.3em;padding:14px;border:1.5px solid #fff;cursor:pointer}#insBtn:hover{background:#e9e9ee;border-color:#e9e9ee}
#mixBtn{background:#fff;color:#0b0b0d;font-weight:900;border-color:#fff;animation:none}#mixBtn:hover{background:#e9e9ee;border-color:#e9e9ee;color:#0b0b0d}
#thModal{display:none;position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.82);align-items:center;justify-content:center;padding:18px}
#thModal.on{display:flex}
#thModal .thbox{position:relative;width:min(980px,100%);max-height:92vh;overflow:auto;background:#0c0c0f;border:1.5px solid var(--red);box-shadow:0 0 50px rgba(224,36,47,.35);padding:20px}
#thModal .thx{position:absolute;top:8px;right:10px;width:40px;height:40px;background:transparent;border:1.5px solid #4a4a50;color:#fff;font:400 26px/1 Montserrat;padding:0}
#thModal .thx:hover{border-color:var(--red);color:var(--red)}
#thModal h4{font:700 12px Montserrat;letter-spacing:.3em;color:var(--gold);margin:0 0 12px}
#thModal #thGrid{grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:700px){#thModal #thGrid{grid-template-columns:1fr 1fr}}
#studio .two2{display:grid;grid-template-columns:1fr 1fr;gap:8px}`;
 document.head.appendChild(st);
}

function html(){
 return `<div class="sg">
 <div>
  <div class="pn"><h4>1. SELECT ITEM</h4>
   <div class="seg"><button data-k="beats" class="on">BEATS</button><button data-k="packs">PACKS</button><button data-k="samples">SAMPLES</button></div>
   <div class="il" id="sl"></div>
   <h4>2. COVER ART</h4>
   <input type="file" id="sCov" accept="image/*"><div class="msg" id="sCovM"></div>
   <h4>3. AUDIO</h4>
   <label class="chk"><input type="radio" name="sSrc" value="preview" checked> USE PREVIEW (with tags)</label>
   <label class="chk"><input type="radio" name="sSrc" value="file"> USE MY FULL BEAT FILE</label>
   <input type="file" id="sAud" accept="audio/*"><div class="msg" id="sAudM"></div>
   <label id="sMaxL">MAX LENGTH IN SECONDS (empty = whole audio)</label><input type="number" id="sMax" min="5" step="1" placeholder="auto">
  </div>
 </div>
 <div>
  <div class="pn">
   <div class="seg"><button data-f="16:9" class="on">16:9 YOUTUBE</button><button data-f="9:16">9:16 SHORTS</button></div>
   <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font:700 10px Montserrat;letter-spacing:.14em;color:#d8d8dc;cursor:pointer"><input type="checkbox" id="sBoth"> RENDER BOTH AT ONCE (16:9 + 9:16)</label>
   <div class="cvw"><canvas id="sCv"></canvas></div>
   <div class="row" style="margin-top:10px"><button class="btn" id="sPlay">PLAY PREVIEW</button><canvas id="sWave"></canvas><span id="sTime" style="flex:none;font:600 11px Montserrat;color:#c9c9ce;min-width:84px;text-align:right">0:00 / 0:00</span></div>
   <h4>TEXT (shows from the second you set)</h4>
   <div id="sTx"></div>
  </div>
  <div class="pn yt" style="margin-top:18px"><h4>YOUTUBE TEXT (copy and paste)</h4>
   <div class="two2"><div><label>SOUNDS LIKE (artist, optional)</label><input type="text" id="yA" placeholder="e.g. a mid-size artist"></div><div><label>MOOD</label><input type="text" id="yM" placeholder="Dark, Hard, Sad..."></div></div>
   <button class="btn" id="yAll" style="margin-top:10px">NEW VARIATION (TITLE + DESCRIPTION + TAGS)</button>
   <label>TITLE <span id="yTi" style="color:#6c6c73"></span></label><input type="text" id="yT"><div class="cnt" id="yTc"></div>
   <div class="two2" style="margin-top:6px"><button class="btn" data-c="yT">COPY TITLE</button><button class="btn" data-n="t">NEXT TITLE</button></div>
   <label>DESCRIPTION <span id="yDi" style="color:#6c6c73"></span></label><textarea id="yD"></textarea><div class="cnt" id="yDc"></div><div class="cnt" id="yLink"></div>
   <div class="two2" style="margin-top:6px"><button class="btn" data-c="yD">COPY DESCRIPTION</button><button class="btn" data-n="d">NEXT DESCRIPTION</button></div>
   <label>TAGS <span id="yGi" style="color:#6c6c73"></span></label><textarea id="yG"></textarea><div class="cnt" id="yGc"></div>
   <div class="two2" style="margin-top:6px"><button class="btn" data-c="yG">COPY TAGS</button><button class="btn" data-n="g">NEXT TAGS</button></div>
  </div>
  <div class="pn yt" id="ygP" style="margin-top:18px"><h4>YT STUDIO: PACKAGES + THUMBNAILS</h4><div id="ygN"></div></div>
 </div>
 <div>
  <div class="pn"><h4>PRESET STYLE</h4>
   <div class="seg" id="sPre" style="flex-wrap:wrap">${Object.keys(PRESETS).map(k=>`<button data-p="${k}"${k==='clean'?' class="on"':''}>${k.toUpperCase()}</button>`).join('')}</div>
   <h4>LAYOUT AND BACKGROUND</h4>
   <label>COVER LAYOUT</label><select id="sLay"><option value="fit">Cover in the middle, blurred backdrop</option><option value="fill">Cover fills the whole frame</option></select>
   <label>COVER MOTION</label><select id="sAnim">${ANIM.map(a=>`<option>${a}</option>`).join('')}</select>
   <label class="chk"><input type="checkbox" id="sGrain"> FILM GRAIN</label>
   <label class="chk"><input type="checkbox" id="sVig" checked> VIGNETTE</label>
   <h4>TEXT STYLE</h4>
   <label>FONT</label><select id="sFont">${Object.keys(FONTS).map(f=>`<option>${f}</option>`).join('')}</select>
   <div class="row"><div><label>COLOR</label><input type="color" id="sCol" value="#e8b94a" style="width:100%;height:36px;background:none;border:1px solid #34343a"></div><div><label>STROKE</label><input type="range" id="sStr" min="0" max="10" value="3"></div></div>
   <label>SIZE</label><input type="range" id="sSize" min="50" max="160" value="100">
   <h4>AUDIO VISUALIZER</h4>
   <select id="sVis">${VIS.map(v=>`<option>${v}</option>`).join('')}</select>
   <div class="row"><div><label>COLOR</label><input type="color" id="sVc" value="#e8b94a" style="width:100%;height:36px;background:none;border:1px solid #34343a"></div><div><label>HEIGHT</label><input type="range" id="sVh" min="20" max="200" value="80"></div></div>
   <label class="chk"><input type="checkbox" id="sSync" checked> COVER PULSES TO THE BEAT</label>
   <label class="chk"><input type="checkbox" id="sGlow"> GLOW EFFECT</label>
   <h4>END CARD</h4>
   <label class="chk"><input type="checkbox" id="sEnd" checked> END CARD</label><label class="chk"><input type="checkbox" id="sTag" checked> VOICE TAG EVERY 13 SEC (PACKS + SAMPLES)</label><select id="sEndT"><option value="sell">Sell the beat (price, link, instant download)</option><option value="sub">8-bit subscribe card</option></select>
  </div>
  <button class="go" id="sRender">RENDER VIDEO</button>
  <div class="bar"><b id="sProg"></b></div><div class="msg" id="sMsg">Keep this tab open and visible while it renders. A 3 minute beat takes about 3 minutes.</div>
  <a id="sDl" class="btn" style="display:none;text-align:center;margin-top:8px;text-decoration:none">DOWNLOAD VIDEO</a>
  <a id="sDl2" class="btn" style="display:none;text-align:center;margin-top:8px;text-decoration:none">DOWNLOAD 9:16 VIDEO</a>
  <button id="insBtn" type="button">&#9986; INSIDE THE SAMPLE</button>
  <button id="mixBtn" type="button">&#9835; MIX VIDEO (10-15 MIN)</button>
  <button id="thOpen" type="button">&#9733; THUMBNAILS</button>
 </div></div>`;
}

/* ---------- drawing ---------- */
function mkNoise(){
 const n=document.createElement('canvas');n.width=n.height=256;const c=n.getContext('2d'),d=c.createImageData(256,256);
 for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
 c.putImageData(d,0,0);return n;
}
function coverRect(iw,ih,x,y,w,h){const s=Math.max(w/iw,h/ih),dw=iw*s,dh=ih*s;return[x+(w-dw)/2,y+(h-dh)/2,dw,dh]}
function makeBackdrop(W,H){
 if(!S.cover)return null;
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const[a,b,w,h]=coverRect(S.cover.naturalWidth,S.cover.naturalHeight,-60,-60,W+120,H+120);
 x.filter='blur(36px) brightness(.55)';x.drawImage(S.cover,a,b,w,h);return c;
}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}}
function offData(t){
 const buf=S.buf,sr=buf.sampleRate,c0=buf.getChannelData(0),c1=buf.numberOfChannels>1?buf.getChannelData(1):c0,N=2048,c=Math.floor(t*sr),re=new Float64Array(N),im=new Float64Array(N),td=new Uint8Array(1024),fd=new Uint8Array(512);
 for(let i=0;i<N;i++){const j=c+i-N,v=(j>=0&&j<c0.length)?(c0[j]+c1[j])/2:0;re[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));if(i>=N-1024)td[i-(N-1024)]=Math.max(0,Math.min(255,Math.round(128+v*128)))}
 fft(re,im);const pv=OFF.prev;
 for(let i=0;i<512;i++){const m=Math.sqrt(re[i]*re[i]+im[i]*im[i])/N*2;pv[i]=pv[i]*.7+m*.3;fd[i]=Math.max(0,Math.min(255,Math.round((20*Math.log10(Math.max(pv[i],1e-9))+100)/70*255)))}
 let s=0;for(let i=0;i<8;i++)s+=fd[i];lastBass=s/8/255;return{td,fd,bass:lastBass};
}
function audioData(t){
 if(OFF)return offData(t);
 const out={td:new Uint8Array(1024),fd:new Uint8Array(512),bass:0};
 if(A&&A.playing){A.an.getByteTimeDomainData(out.td);A.an.getByteFrequencyData(out.fd)}
 else{for(let i=0;i<1024;i++)out.td[i]=128+Math.sin(i/26+t*3)*34*Math.sin(i/190+t)+Math.sin(i/7+t*5)*8;
  for(let i=0;i<512;i++)out.fd[i]=Math.max(8,(1-i/512)*190*(.55+.45*Math.sin(i/9+t*4)));}
 let s=0;for(let i=0;i<8;i++)s+=out.fd[i];out.bass=s/8/255;lastBass=out.bass;return out;
}
function fitText(c,txt,maxW,px,font){c.font=`${px}px ${font}`;const w=c.measureText(txt).width;return w>maxW?px*maxW/w:px}
function drawText(c,key,t,W,H,y,px,align,x){
 const it=S.tx[key];if(!it.on||!it.text||t<it.start)return;
 let a=Math.min(1,(t-it.start)/.45);if(key==='intro'){const e=it.start+3.2;if(t>e)a*=Math.max(0,1-(t-e)/.5);if(a<=0)return}
 const font=FONTS[S.font]||FONTS.Impact,small=key==='tag'||key==='info';
 let p=px*S.size/100;p=fitText(c,it.text.toUpperCase(),W*(small?.6:.9),p,font);
 c.save();c.globalAlpha=a;c.font=`${p}px ${font}`;c.textAlign=align||'center';c.textBaseline='middle';
 const yy=y+(1-a)*H*.012;
 if(S.glow){c.shadowColor=S.color;c.shadowBlur=p*.5}else{c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=p*.18;c.shadowOffsetY=p*.05}
 c.lineJoin='round';
 if(S.stroke>0&&!small){c.lineWidth=S.stroke*p/40;c.strokeStyle='#000';c.strokeText(it.text.toUpperCase(),x==null?W/2:x,yy)}
 c.fillStyle=small&&key==='tag'?'#e6e6ea':S.color;c.fillText(it.text.toUpperCase(),x==null?W/2:x,yy);c.restore();
}
function drawVis(c,d,W,H,base,cx,cy,r){
 if(S.vis==='none')return;
 const k=H/1080,ph=S.visH*k*(S.fmt==='16:9'?1:1.2),col=S.visColor;
 c.save();c.strokeStyle=col;c.fillStyle=col;c.lineCap='round';c.lineJoin='round';
 if(S.glow){c.shadowColor=col;c.shadowBlur=18*k}
 if(S.vis==='waveform'){
  c.lineWidth=4*k;c.beginPath();const n=d.td.length,x0=W*.06,x1=W*.94;
  for(let i=0;i<n;i+=3){const x=x0+(x1-x0)*i/n,v=(d.td[i]-128)/128;const y=base+v*ph;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();
 }else if(S.vis==='bars'){
  const n=64,x0=W*.06,w=(W*.88)/n;
  for(let i=0;i<n;i++){const v=d.fd[Math.floor(Math.pow(i/n,1.6)*300)]/255,h=Math.max(3*k,v*ph*1.6);c.fillRect(x0+i*w+w*.15,base-h/2,w*.7,h)}
 }else if(S.vis==='circle'){
  const n=96;c.lineWidth=5*k;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2,v=d.fd[Math.floor(Math.pow(i%48/48,1.5)*260)]/255,l=4*k+v*ph*.9;
   c.beginPath();c.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);c.lineTo(cx+Math.cos(a)*(r+l),cy+Math.sin(a)*(r+l));c.stroke()}
 }
 c.restore();
}
/* 9:16 Shorts are cut at 1:30: when the audio is longer, the last 3.5 s say to watch the full video */
const cutV=dur=>S.fmt==='9:16'&&S.buf&&S.buf.duration>dur+.5;
function frame(cv,t,dur){frame0(cv,t,dur);if(cutV(dur)&&t>dur-3.5)watchCard(cv,Math.min(1,(t-(dur-3.5))/.5),t)}
function watchCard(cv,a,t){const c=cv.getContext('2d'),W=cv.width,H=cv.height,u=W/720,f=FONTS[S.font]||'Impact',acc='#e0242f',e=1-Math.pow(1-Math.max(0,a),3);
 const fit=(s,mw,px)=>{c.font=px+'px '+f;const w=c.measureText(s).width;return w>mw?px*mw/w:px},tx=(s,x,y,px,col)=>{c.font=px+'px '+f;c.fillStyle=col;c.textAlign='center';c.fillText(s,x,y)};
 c.save();c.globalAlpha=e*.85;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=e;
 tx('WANT THE REST?',W/2,H*.36,fit('WANT THE REST?',W*.8,54*u),'rgba(255,255,255,.75)');
 c.save();c.translate(W/2,H*.46);c.scale(1.25-.25*e,1.25-.25*e);c.shadowColor=acc;c.shadowBlur=40*u;tx('WATCH THE',0,0,fit('WATCH THE',W*.86,110*u),'#fff');tx('FULL VIDEO',0,110*u,fit('FULL VIDEO',W*.9,130*u),acc);c.restore();
 const bw=W*.78,bh=78*u,bx=(W-bw)/2,by=H*.62,lb='ON MY CHANNEL  •  LINK IN BIO';c.fillStyle='#fff';c.fillRect(bx,by,bw,bh);tx(lb,W/2,by+bh*.64,fit(lb,bw*.88,32*u),'#0b0b0d');
 const bob=Math.sin(t*6)*10*u;c.fillStyle=acc;c.beginPath();c.moveTo(W/2-34*u,H*.76+bob);c.lineTo(W/2+34*u,H*.76+bob);c.lineTo(W/2,H*.8+bob);c.closePath();c.fill();c.restore()}
function frame0(cv,t,dur){
 const W=cv.width,H=cv.height,c=cv.getContext('2d'),land=W>H,p=dur?Math.min(1,t/dur):0,d=audioData(t);
 c.fillStyle='#050506';c.fillRect(0,0,W,H);
 const pulse=S.sync?1+d.bass*.035:1,zoom=S.anim==='zoom'?1+.1*p:1,pan=S.anim==='pan'?(p-.5)*W*.05:0;
 let cx=W/2,cy=land?H*.46:H*.4,cs=land?H*.6:W*.78;
 if(S.cover){
  if(S.layout==='fill'){
   const[a,b,w,h]=coverRect(S.cover.naturalWidth,S.cover.naturalHeight,0,0,W,H);
   c.save();c.translate(W/2+pan,H/2);c.scale(zoom*pulse,zoom*pulse);c.drawImage(S.cover,a-W/2,b-H/2,w,h);c.restore();
   c.fillStyle='rgba(0,0,0,.28)';c.fillRect(0,0,W,H);
  }else{
   if(!S.bd||S.bd.width!==W||S.bd.height!==H)S.bd=makeBackdrop(W,H);
   c.save();c.translate(W/2+pan*.5,H/2);c.scale(1+(zoom-1)*.6,1+(zoom-1)*.6);c.drawImage(S.bd,-W/2,-H/2);c.restore();
   const z=(S.anim==='zoom'?1+.04*p:1)*pulse,s=cs*z;
   if(SCN[S.preset]){scnLoad();scFrame(c,W,H,t,d,dur)}else{if(S.preset==='vinyl')vinylDisc(c,cx,cy,s,t,d);
   c.save();c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=60*H/1080;c.shadowOffsetY=18*H/1080;
   const iw=S.cover.naturalWidth,ih=S.cover.naturalHeight,sc=Math.max(s/iw,s/ih),sw=s/sc,sh=s/sc;
   c.beginPath();c.rect(cx-s/2,cy-s/2,s,s);c.fillStyle='#000';c.fill();c.shadowColor='transparent';c.clip();
   c.drawImage(S.cover,(iw-sw)/2,(ih-sh)/2,sw,sh,cx-s/2,cy-s/2,s,s);c.restore();}
  }
 }
 effects(c,W,H,t,d);
 if(S.vig){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.72)');c.fillStyle=g;c.fillRect(0,0,W,H)}
 if(S.grain){if(!noise)noise=mkNoise();c.save();c.globalAlpha=S.preset==='grunge'?.2:.1;c.globalCompositeOperation='overlay';
  const ox=Math.floor(Math.random()*256),oy=Math.floor(Math.random()*256),pt=c.createPattern(noise,'repeat');c.translate(-ox,-oy);c.fillStyle=pt;c.fillRect(0,0,W+256,H+256);c.restore()}
 const k=land?H:W;
 if(SCN[S.preset]&&S.cover){}else if(land){
  drawVis(c,d,W,H,H*.955,cx,cy,cs/2*1.04);
  drawText(c,'intro',t,W,H,H*.075,H*.06);drawText(c,'title',t,W,H,H*.835,H*.095);if(!SCN[S.preset])drawText(c,'info',t,W,H,H*.905,H*.034);
  drawText(c,'tag',t,W,H,H*.07,H*.026,'right',W*.97);
 }else{
  drawVis(c,d,W,H,H*.93,cx,cy,cs/2*1.04);
  drawText(c,'intro',t,W,H,H*.085,W*.06);drawText(c,'title',t,W,H,H*.74,W*.115);drawText(c,'info',t,W,H,H*.8,W*.04);
  drawText(c,'tag',t,W,H,H*.045,W*.032,'right',W*.96);
 }
 if(SCN[S.preset]&&S.cover){scText(c,W,H,t);scBar(c,W,H,t,dur)}
 if(S.preset==='film'){c.fillStyle='#000';const b=H*(land?.085:.05);c.fillRect(0,0,W,b);c.fillRect(0,H-b,W,b)}
 const ecd=Math.min(6,dur*.5),eo=cutV(dur)?3.5:0;if(S.end&&dur&&t>dur-eo-ecd)endCard(c,W,H,Math.min(ecd,t-(dur-eo-ecd)),ecd);
}
let ec=null,heroImg=null;
function sellCard(c,W,H,tt,ecd){
 const land=W>H,k=land?H/1080:W/1080,it=S.item||{},isSmp=S.kind==='samples'||it._k==='samples',isPack=S.kind==='packs'||it._k==='packs'||isSmp,ease=x=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3),fi=ease(tt/.6);
 const F="Anton, Impact, 'Arial Narrow Bold', sans-serif",B="Inter, 'Helvetica Neue', Arial, sans-serif";
 c.save();c.globalAlpha=fi;c.fillStyle='#070708';c.fillRect(0,0,W,H);
 const g=c.createRadialGradient(W*.3,H*.5,0,W*.3,H*.5,W*.6);g.addColorStop(0,'rgba(224,36,47,.16)');g.addColorStop(1,'rgba(224,36,47,0)');c.fillStyle=g;c.fillRect(0,0,W,H);
 const cs=land?H*.56:W*.62,cx=land?W*.28:W/2,cy=land?H*.5:H*.3,push=1+.03*(tt/ecd),ci=ease((tt-.1)/.8);
 if(S.cover&&S.cover.naturalWidth){const s=cs*push,iw=S.cover.naturalWidth,ih=S.cover.naturalHeight,m=Math.min(iw,ih);c.save();c.globalAlpha=fi*ci;c.translate(cx,cy+(1-ci)*30*k);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=70*k;c.shadowOffsetY=24*k;c.fillStyle='#000';c.fillRect(-s/2,-s/2,s,s);c.shadowColor='transparent';c.drawImage(S.cover,(iw-m)/2,(ih-m)/2,m,m,-s/2,-s/2,s,s);c.restore()}
 const tx=land?W*.53:W*.08,mw=land?W*.4:W*.84;let y=land?H*.27:H*.6;
 const line=(d,fn)=>{const a=ease((tt-d)/.5);if(a<=0)return;c.save();c.globalAlpha=fi*a;c.translate((1-a)*40*k,0);fn();c.restore()};
 c.textBaseline='top';c.textAlign='left';
 line(.35,()=>{c.fillStyle='#e0242f';c.fillRect(tx,y,6*k,26*k);c.font=`800 ${22*k}px ${B}`;c.fillStyle='#e0242f';c.fillText(isSmp?'GET THIS SAMPLE':isPack?'GET THIS PACK':'LICENSE THIS BEAT',tx+18*k,y+2*k)});y+=50*k;
 const title=String(it.title||'').toUpperCase();let ts=110*k;c.font=`${ts}px ${F}`;while(c.measureText(title).width>mw&&ts>40*k){ts-=4*k;c.font=`${ts}px ${F}`}
 line(.5,()=>{c.font=`${ts}px ${F}`;c.fillStyle='#fff';c.fillText(title,tx,y)});y+=ts*1.08;
 const price=Number(it.price);if(price>0){line(.7,()=>{c.font=`${30*k}px ${F}`;c.fillStyle='#9a9aa2';c.fillText(isPack?'':'LEASES FROM',tx,y+12*k);const w=isPack?0:c.measureText('LEASES FROM ').width;c.font=`${64*k}px ${F}`;c.fillStyle='#fff';c.fillText('$'+price.toFixed(price%1?2:0),tx+w,y)});y+=86*k}
 line(.85,()=>{c.font=`700 ${24*k}px ${B}`;c.fillStyle='#c9c9cf';c.fillText(isSmp?'ROYALTY-FREE  ·  CRATE DIG ON MZPRD.COM':isPack?'ROYALTY-FREE  ·  INSTANT DOWNLOAD':'INSTANT DOWNLOAD  ·  FULL QUALITY FILES',tx,y)});y+=64*k;
 line(1.05,()=>{const bw=Math.min(mw,560*k),bh=92*k,pul=.5+.5*Math.sin(tt*4);c.fillStyle='#e0242f';c.fillRect(tx,y,bw,bh);c.strokeStyle='rgba(224,36,47,'+(.5*pul)+')';c.lineWidth=3*k;c.strokeRect(tx-8*k*pul,y-8*k*pul,bw+16*k*pul,bh+16*k*pul);
  c.font=`${46*k}px ${F}`;c.fillStyle='#fff';c.textBaseline='middle';c.fillText('MZPRD.COM',tx+28*k,y+bh/2+2*k);c.textAlign='right';c.font=`800 ${18*k}px ${B}`;c.fillText('LINK IN DESCRIPTION ↓',tx+bw-24*k,y+bh/2+2*k)});y+=130*k;
 line(1.3,()=>{c.textBaseline='top';c.textAlign='left';c.font=`700 ${20*k}px ${B}`;c.fillStyle='#6f6f76';c.fillText('SUBSCRIBE FOR NEW BEATS EVERY WEEK',tx,y)});
 c.restore()}
function endCard(c,W,H,tt,ecd){
 if(S.endType!=='sub')return sellCard(c,W,H,tt,ecd);
 if(!heroImg){heroImg=new Image();heroImg.src=new URL('hero.jpg',document.baseURI).href}
 if(!heroImg.complete||!heroImg.naturalWidth)return;
 const land=W>H,lw=land?480:270,lh=land?270:480;
 if(!ec||ec.width!==lw||ec.height!==lh){ec=document.createElement('canvas');ec.width=lw;ec.height=lh}
 const x=ec.getContext('2d');x.imageSmoothingEnabled=false;x.globalCompositeOperation='source-over';x.globalAlpha=1;
 const bpm=(S.item&&+S.item.bpm)||92,beat=60/bpm,ph=(tt/beat)%1,k=Math.floor(tt/beat),hit=ph<.22?1:0;
 x.fillStyle='#07040c';x.fillRect(0,0,lw,lh);
 for(let i=0;i<46;i++){const sx=(i*73)%lw,sy=(i*41)%lh;if(((i+k)%5)===0)continue;x.fillStyle=i%3?'#3a2a55':'#e8b94a';x.fillRect(sx,sy,1,1)}
 const cw=land?280:270,kk=cw/740,ch=Math.round(468*kk),cx=land?14:0,cy=land?Math.round(lh/2-ch/2)+6:44,SX=470,sub=(sx,sy,sw,sh,dx,dy)=>x.drawImage(heroImg,sx,sy,sw,sh,cx+(sx-SX)*kk+dx,cy+sy*kk+dy,sw*kk,sh*kk);
 x.drawImage(heroImg,SX,0,740,468,cx,cy+hit,cw,ch);
 sub(690,0,330,250,(k%2?1:-1)*hit,hit*2);
 sub(700,320,200,120,0,k%2?hit*2:0);sub(1010,300,130,130,0,k%2?0:hit*2);
 x.globalCompositeOperation='lighter';
 for(let j=0;j<3;j++){const cell=(k*7+j*5)%8,col=cell%4,row=cell>>2;x.fillStyle='rgba(255,190,110,'+(.8*(1-ph))+')';
  x.fillRect(Math.round(cx+(745+col*60-SX)*kk),Math.round(cy+(382+row*26)*kk),Math.max(2,Math.round(52*kk)),Math.max(1,Math.round(20*kk)))}
 x.globalCompositeOperation='source-over';
 for(let i=0;i<16;i++){const h=3+Math.round((hit*5+3)*(.5+.5*Math.sin(tt*6+i*1.3))+(i%4===k%4?4:0));x.fillStyle=i%2?'#e0242f':'#e8b94a';x.fillRect(lw/2-48+i*6,lh-4-h,4,h)}
 const px=land?385:135,y0=land?60:226,bw=land?160:210,bh=land?30:38,fs=land?11:13,by=y0+(land?50:60),gold='#e8b94a',red='#e0242f';
 const txt=(s,y,size,col,sh)=>{x.font=size+"px 'Press Start 2P'";x.textAlign='center';x.textBaseline='middle';if(sh){x.fillStyle=sh;x.fillText(s,px+1,y+1)}x.fillStyle=col;x.fillText(s,px,y)};
 txt('MZPRD',y0,land?14:18,k%2?'#fff':gold,'#7a1218');
 const cl=tt>2.2&&tt<2.45;
 x.fillStyle='#000';x.fillRect(px-bw/2-2,by-bh/2-2,bw+4,bh+4);x.fillStyle=cl?'#a5141c':red;x.fillRect(px-bw/2,by-bh/2,bw,bh);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(px-bw/2,by-bh/2,bw,2);
 x.fillStyle='#fff';const ax=px-bw/2+10,ay=by;for(let i=0;i<5;i++)x.fillRect(ax+i,ay-5+i,1,10-2*i);
 x.font=fs+"px 'Press Start 2P'";x.textAlign='left';x.fillStyle='#fff';x.fillText('SUBSCRIBE',px-bw/2+22,by+1);
 txt('NEW BEATS WEEKLY',y0+(land?100:122),land?7:8,'#d9d9dc');
 const bx=px-(land?44:50),bY=y0+(land?128:158)+(hit?-1:0);
 x.fillStyle=gold;x.fillRect(bx,bY-4,5,2);x.fillRect(bx-1,bY-2,7,4);x.fillRect(bx-2,bY+2,9,2);x.fillRect(bx+1,bY+4,3,1);
 x.font=(land?7:8)+"px 'Press Start 2P'";x.textAlign='left';x.fillStyle='#d9d9dc';x.fillText('HIT THE BELL',bx+12,bY+1);
 const m=Math.min(1,tt/1.6),mx=px+bw/2+34-(bw/2+20)*m,my=by+bh+40-(bh+40)*m+Math.sin(tt*5)*(m<1?2:0);
 x.fillStyle='#000';for(let i=0;i<8;i++)x.fillRect(Math.round(mx),Math.round(my)+i,1+Math.min(i,5),1);
 x.fillStyle='#fff';for(let i=0;i<6;i++)x.fillRect(Math.round(mx)+1,Math.round(my)+1+i,Math.max(0,Math.min(i,4)),1);
 for(let y=0;y<lh;y+=2){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,y,lw,1)}
 c.save();c.globalAlpha=Math.min(1,tt/.4);c.imageSmoothingEnabled=false;c.drawImage(ec,0,0,W,H);c.restore();
}
let vinylTex=null;
function vinylTexture(D){
 if(vinylTex&&vinylTex.width===D&&vinylTex._cov===S.cover)return vinylTex;
 const cv=document.createElement('canvas');cv.width=cv.height=D;cv._cov=S.cover;const x=cv.getContext('2d'),R=D/2;x.translate(R,R);
 const base=x.createRadialGradient(0,0,R*.3,0,0,R);base.addColorStop(0,'#141416');base.addColorStop(1,'#09090a');x.fillStyle=base;x.beginPath();x.arc(0,0,R,0,6.283);x.fill();
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const gaps=[.52,.63,.74,.85];
 for(let r=R*.355;r<R*.975;r+=Math.max(.6,D/1400)){const f=r/R;if(gaps.some(g=>Math.abs(f-g)<.006))continue;x.strokeStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+(.03+rnd()*.06).toFixed(3)+')';x.lineWidth=Math.max(.5,D/2200);x.beginPath();x.arc(0,0,r,0,6.283);x.stroke()}
 gaps.forEach(g=>{x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=D*.004;x.beginPath();x.arc(0,0,R*g,0,6.283);x.stroke();x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=D*.0015;x.beginPath();x.arc(0,0,R*g+D*.002,0,6.283);x.stroke()});
 x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=D*.006;x.beginPath();x.arc(0,0,R*.985,0,6.283);x.stroke();
 x.fillStyle='#050505';x.beginPath();x.arc(0,0,R*.345,0,6.283);x.fill();
 const L=R*.33;x.save();x.beginPath();x.arc(0,0,L,0,6.283);x.clip();
 if(S.cover&&S.cover.naturalWidth){const iw=S.cover.naturalWidth,ih=S.cover.naturalHeight,m=Math.min(iw,ih);x.drawImage(S.cover,(iw-m)/2,(ih-m)/2,m,m,-L,-L,L*2,L*2);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(-L,-L,L*2,L*2)}
 else{x.fillStyle='#e0242f';x.fillRect(-L,-L,L*2,L*2)}
 const lg=x.createRadialGradient(0,0,L*.7,0,0,L);lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(0,0,0,.35)');x.fillStyle=lg;x.fillRect(-L,-L,L*2,L*2);x.restore();
 x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=D*.003;x.beginPath();x.arc(0,0,L,0,6.283);x.stroke();
 x.fillStyle='#d9d9dc';x.beginPath();x.arc(0,0,R*.03,0,6.283);x.fill();x.fillStyle='#000';x.beginPath();x.arc(0,0,R*.018,0,6.283);x.fill();
 return vinylTex=cv}

/* SCENE PRESETS: animated scenes built from the thumbnail photo cut-outs (mpc/pk2, mpc/pk3). Same art box as the cover,
   so the text/visualizer zones never change. Every scene: intro ease in the first ~1.4s, then a slow loop + bass pulse. */
const SCI={},SCF={crate:'pk3/crate.webp',ipod:'pk3/ipod.webp',sleeve:'pk3/sleeve.webp',stack:'pk3/stack.webp',broken:'pk3/broken.webp',shard0:'pk3/shard0.webp',shard1:'pk3/shard1.webp',shard2:'pk3/shard2.webp',shard3:'pk3/shard3.webp',shard4:'pk3/shard4.webp',shard5:'pk3/shard5.webp',shard6:'pk3/shard6.webp',shard7:'pk3/shard7.webp',price:'pk3/price.webp',mpc:'pk2/mpc.webp',logo:'pk2/logo.png',rec:'../crate-record.webp',dawblur:'pk2/dawblur.jpg',speaker:'pk2/speaker.webp'};let scnP=null;
function scnLoad(){scnP=scnP||Promise.all(Object.entries(SCF).map(([n,f])=>new Promise(r=>{const i=new Image();i.onload=()=>{SCI[n]=i;r()};i.onerror=r;i.src=new URL('mpc/'+f+'?v=1',document.baseURI).href})))}
const scE=x=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3),scB=x=>{x=Math.min(1,Math.max(0,x));const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
function scShot(c,img,x,y,w,rot,a){if(!img)return;const h=img.height*w/img.width;c.save();c.globalAlpha*=a==null?1:a;c.translate(x,y);if(rot)c.rotate(rot);c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=w*.08;c.shadowOffsetY=w*.03;c.drawImage(img,-w/2,-h/2,w,h);c.restore()}
function scCover(c,x,y,sz,rot,a,clipFn){const cv=S.cover;if(!cv)return;const iw=cv.naturalWidth,ih=cv.naturalHeight,m=Math.min(iw,ih);c.save();c.globalAlpha*=a==null?1:a;c.translate(x,y);if(rot)c.rotate(rot);c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=sz*.1;c.shadowOffsetY=sz*.035;c.fillStyle='#000';c.fillRect(-sz/2,-sz/2,sz,sz);c.shadowColor='transparent';c.drawImage(cv,(iw-m)/2,(ih-m)/2,m,m,-sz/2,-sz/2,sz,sz);c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=Math.max(1,sz*.004);c.strokeRect(-sz/2,-sz/2,sz,sz);c.restore()}
function scSpin(c,x,y,R,t,a){const D=Math.min(2048,Math.round(R*2)),tex=vinylTexture(D);c.save();c.globalAlpha*=a==null?1:a;c.translate(x,y);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=R*.14;c.beginPath();c.arc(0,0,R,0,6.283);c.fillStyle='#000';c.fill();c.shadowColor='transparent';c.rotate(t*3.49);if(SCI.rec)c.drawImage(SCI.rec,-R,-R,R*2,R*2);else c.drawImage(tex,-R,-R,R*2,R*2);
 const cv=S.cover;if(cv){const m=Math.min(cv.naturalWidth,cv.naturalHeight),lr=R*.36;c.beginPath();c.arc(0,0,lr,0,6.283);c.clip();c.drawImage(cv,(cv.naturalWidth-m)/2,(cv.naturalHeight-m)/2,m,m,-lr,-lr,lr*2,lr*2)}c.restore();c.fillStyle='#0b0b0d';c.beginPath();c.arc(x,y,R*.025,0,6.283);c.fill()}
function scGlow(c,x,y,r,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(224,36,47,'+a+')');g.addColorStop(1,'rgba(224,36,47,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
/* player bar for the scene presets: red header with the title, the whole track's waveform, played part bright */
let scPk=null,scPkB=null;
function scPeaks(n){const b=S.buf;if(!b)return null;if(scPkB===b&&scPk&&scPk.length===n)return scPk;const ch=b.getChannelData(0),step=Math.floor(ch.length/n),out=new Float32Array(n);let mx=0;for(let i=0;i<n;i++){let m=0;for(let j=i*step,e=j+step;j<e;j+=8){const v=Math.abs(ch[j]);if(v>m)m=v}out[i]=m;if(m>mx)mx=m}for(let i=0;i<n;i++)out[i]/=mx||1;scPk=out;scPkB=b;return out}
function scLay(W,H){const land=W>H,m=SCM[S.preset]||{},R=m.right&&land;return{land,R,red:!!m.red,tx:land?(R?W*.56:W*.055):W/2,tw:land?W*.36:W*.86,cx:land?(R?W*.27:W*.71):W/2,cy:land?H*.47:H*.29,s:land?H*.68:W*.74}}
function scBar(c,W,H,t,dur){const L=scLay(W,H),land=L.land,k=land?H/1080:W/1080,bw=land?L.tw:W*.86,bh=land?H*.095:H*.062,x=land?L.tx:(W-bw)/2,y=land?H*.795:H*.835,hh=bh*.34,n=Math.round(bw/(3*k)),pr=dur?Math.min(1,t/dur):0,e=io((t-1)/.8);if(e<=0)return;
 const pk=scPeaks(n),dark=L.red;c.save();c.globalAlpha=e;c.fillStyle=dark?'rgba(11,11,13,.92)':'rgba(8,8,10,.82)';c.fillRect(x,y,bw,bh);c.fillStyle=dark?'#0b0b0d':'#e0242f';c.fillRect(x,y,bw,hh);c.strokeStyle=dark?'#0b0b0d':'#e0242f';c.lineWidth=3*k;c.strokeRect(x,y,bw,bh);
 c.fillStyle='#fff';c.textBaseline='middle';c.textAlign='left';c.font=`800 ${hh*.6}px Inter, Arial, sans-serif`;c.fillText('\u25B6  '+String((S.item&&S.item.title)||'').toUpperCase(),x+hh*.45,y+hh*.54);
 const wy=y+hh+(bh-hh)/2,wa=(bh-hh)*.4,px=x+bw*pr;for(let i=0;i<n;i++){const v=pk?pk[i]:.35+.55*Math.abs(Math.sin(i*.37)*Math.sin(i*.071+1)),xx=x+6*k+i*(bw-12*k)/n,a=Math.max(1*k,v*wa);c.fillStyle=xx<=px?'#fff':'rgba(255,255,255,.35)';c.fillRect(xx,wy-a,Math.max(1,2*k),a*2)}
 c.fillStyle=dark?'#fff':'#e0242f';c.fillRect(px-1.5*k,y+hh,3*k,bh-hh);c.restore()}
/* thumbnail-style text: kicker, big title (lines rise out of a mask), red tag wipes in, footer; same layout as the thumbnails */
function scLabel(){const it=S.item||{},kd=it._k||S.kind;return kd==='samples'?'SINGLE SAMPLE':kd==='beats'?'TYPE BEAT':'SAMPLE PACK'}
function scText(c,W,H,t){const L=scLay(W,H),land=L.land,k=land?W/1280:W/1080,F="Anton, Impact, 'Arial Narrow Bold', sans-serif",B="Inter, 'Helvetica Neue', Arial, sans-serif",fg=L.red?'#0b0b0d':'#fff',acc=L.red?'#0b0b0d':'#e0242f',al=land?'left':'center',x0=L.tx,
 name=String((S.item&&S.item.title)||'').toUpperCase(),ws=name.split(/\s+/);let fs=(land?150:170)*k,lines;const wrap=()=>{c.font=fs+'px '+F;lines=[];let cur='';for(const w of ws){const s2=cur?cur+' '+w:w;if(c.measureText(s2).width>L.tw&&cur){lines.push(cur);cur=w}else cur=s2}if(cur)lines.push(cur)};
 const y0=land?H*.25:H*.565,avail=(land?H*.795:H*.835)-y0-34*k-50*k-30*k;
 wrap();while((lines.length>(land?3:2)||Math.max(...lines.map(l=>c.measureText(l).width))>L.tw||lines.length*fs*.92+fs*.08>avail)&&fs>40*k){fs-=3*k;wrap()}
c.save();c.textAlign=al;c.textBaseline='alphabetic';
 const ek=io((t-.2)/.9);c.globalAlpha=ek;c.fillStyle=acc;c.font='800 '+Math.round(24*k)+'px '+B;c.letterSpacing=Math.round((8+10*(1-ek))*k)+'px';c.fillText('NEW '+scLabel(),x0,y0);c.letterSpacing='0px';c.globalAlpha=1;
 let y=y0+fs*.98;lines.forEach((l,i)=>{const e=xo((t-.35-i*.12)/1.1);if(e<=0){y+=fs*.92;return}c.save();c.beginPath();c.rect(0,y-fs*.95,W,fs*1.02);c.clip();c.font=fs+'px '+F;c.fillStyle=fg;if(!L.red){c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=18*k}c.fillText(l,x0,y+(1-e)*fs);c.restore();y+=fs*.92});
 y=y-fs*.92+34*k;const lab=scLabel();c.font='800 '+Math.round(26*k)+'px '+B;c.letterSpacing=Math.round(6*k)+'px';const tw=c.measureText(lab).width+44*k,th=50*k,te=xo((t-.9)/.9),bx=land?x0:x0-tw/2;
 if(te>0){c.fillStyle=L.red?'#0b0b0d':'#e0242f';c.fillRect(bx,y,tw*te,th);c.save();c.beginPath();c.rect(bx,y,tw*te,th);c.clip();c.fillStyle='#fff';c.textAlign='center';c.fillText(lab,bx+tw/2,y+th*.67);c.restore()}c.letterSpacing='0px';
 const fe=io((t-1.3)/.8);if(fe>0){c.globalAlpha=fe;c.textAlign=al;c.fillStyle=L.red?'rgba(11,11,13,.8)':'rgba(255,255,255,.7)';c.font='700 '+Math.round(20*k)+'px '+B;c.letterSpacing=Math.round(6*k)+'px';c.fillText('MZPRD.COM  \u00B7  ROYALTY-FREE',x0,H*.955);c.letterSpacing='0px'}c.restore()}
/* background + art box + readable text side, like the thumbnails */
function scFrame(c,W,H,t,d,dur){const L=scLay(W,H),land=L.land,b=d.bass||0;c.fillStyle='#08080a';c.fillRect(0,0,W,H);if(S.bd){c.save();c.globalAlpha=.55;c.drawImage(S.bd,0,0);c.restore()}
 if(L.red){c.fillStyle='#e0242f';land?c.fillRect(0,0,W*.5,H):c.fillRect(0,H*.5,W,H*.5)}
 SCN[S.preset](c,L.cx,L.cy,L.s,t,d,L);
 if(!L.red){c.save();if(land){const g=L.R?c.createLinearGradient(W,0,W*.45,0):c.createLinearGradient(0,0,W*.55,0);g.addColorStop(0,'rgba(6,6,8,.92)');g.addColorStop(1,'rgba(6,6,8,0)');c.fillStyle=g}else{const g=c.createLinearGradient(0,H*.48,0,H);g.addColorStop(0,'rgba(6,6,8,0)');g.addColorStop(.3,'rgba(6,6,8,.88)');g.addColorStop(1,'rgba(6,6,8,.97)');c.fillStyle=g}c.fillRect(0,0,W,H);c.restore()}}
/* audio peaks by time, so on-screen waveforms line up with what you hear */
let scTP=null,scTPB=null;function scPeaksT(){const b=S.buf;if(!b)return null;if(scTPB===b)return scTP;const r=100,ch=b.getChannelData(0),n=Math.ceil(b.duration*r),step=Math.floor(b.sampleRate/r),o=new Float32Array(n);let mx=0;for(let i=0;i<n;i++){let m=0;for(let j=i*step,e=Math.min(ch.length,j+step);j<e;j+=4){const v=Math.abs(ch[j]);if(v>m)m=v}o[i]=m;if(m>mx)mx=m}for(let i=0;i<n;i++)o[i]/=mx||1;scTP=o;scTPB=b;return o}
function scPeakAt(tt){const P=scPeaksT();if(!P){return .3+.6*Math.abs(Math.sin(tt*7.1)*Math.sin(tt*1.3+.4))}const i=Math.floor(tt*100);return P[Math.max(0,Math.min(P.length-1,i))]||0}
const SCM={'giant record':{right:1},'red split':{red:1}};
const SHM=[[241,393,406,273],[136,1,341,266],[5,146,314,275],[387,138,267,227],[1,414,277,190],[187,504,116,103],[372,345,122,46],[494,30,67,57]];
const MPCPAD=[83,348,277,282];
/* cinematic motion: expo ease-out entrances (no bounces), one slow camera push for the whole scene, depth via
   parallax + growing shadows, a light sweep across the cover, and only subtle (1-2%) reaction to the kick. */
const xo=x=>{x=Math.min(1,Math.max(0,x));return x>=1?1:1-Math.pow(2,-10*x)},io=x=>{x=Math.min(1,Math.max(0,x));return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
function scCam(c,cx,cy,t,fn){const z=1+Math.min(t,30)*.0022,r=Math.sin(t*.21)*.004,dx=Math.sin(t*.17)*6,dy=Math.cos(t*.13)*4;c.save();c.translate(cx+dx,cy+dy);c.rotate(r);c.scale(z,z);c.translate(-cx,-cy);fn();c.restore()}
function scSheen(c,x,y,sz,rot,t,a){const ph=((t+1.5)%7)/1.6;if(ph>1)return;c.save();c.translate(x,y);if(rot)c.rotate(rot);c.beginPath();c.rect(-sz/2,-sz/2,sz,sz);c.clip();const g=c.createLinearGradient(-sz,-sz*.3,sz,sz*.3),o=-.3+ph*1.6;
 const cl=v=>Math.min(1,Math.max(0,v));g.addColorStop(cl(o-.12),'rgba(255,255,255,0)');g.addColorStop(cl(o),'rgba(255,255,255,'+(.16*(a==null?1:a))+')');g.addColorStop(cl(o+.12),'rgba(255,255,255,0)');c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(-sz/2,-sz/2,sz,sz);c.restore()}
function scHero(c,x,y,sz,rot,t,a){scCover(c,x,y,sz,rot,a);scSheen(c,x,y,sz,rot,t,a)}
function scFloor(c,cx,y,w,a){const g=c.createRadialGradient(cx,y,0,cx,y,w*.6);g.addColorStop(0,'rgba(0,0,0,'+(.55*a)+')');g.addColorStop(1,'rgba(0,0,0,0)');c.save();c.translate(cx,y);c.scale(1,.18);c.translate(-cx,-y);c.fillStyle=g;c.fillRect(cx-w,y-w,w*2,w*2);c.restore()}
const SCN={
 /* CRATE: crate glides up, then the cover is pulled up out of it and hangs in front */
 crate(c,cx,cy,s,t,d){const I=SCI.crate,b=d.bass||0,e=xo(t/1.6),e2=io((t-.7)/1.6);scGlow(c,cx,cy,s*1.1,.26+b*.12);scCam(c,cx,cy,t,()=>{
  const cw=s*.95;if(!I){scHero(c,cx,cy,s*.8,0,t,1);return}const ch=I.height*cw/I.width,base=cy+s*.52,top=base-ch+(1-e)*s*.35;scFloor(c,cx,base,cw,e);scShot(c,I,cx,top+ch/2,cw,0,e);
  const sz=s*.66*(1+b*.012),fl=Math.sin(t*.9)*s*.008;scHero(c,cx+s*.02,top+ch*.18-e2*s*.04+fl+(1-e2)*s*.25,sz,-.02+Math.sin(t*.5)*.006,t,e2)})},
 /* IPOD: iPod rises, screen wakes with the cover, live waveform on screen */
 ipod(c,cx,cy,s,t,d){const I=SCI.ipod,b=d.bass||0,e=xo(t/1.6);scGlow(c,cx,cy,s,.24+b*.15);scCam(c,cx,cy,t,()=>{if(!I){scHero(c,cx,cy,s*.8,0,t,1);return}
  const h=s*.97,w=I.width*h/I.height,x=cx,y=cy+(1-e)*s*.3,ox=x-w/2,oy=y-h/2,on=io((t-.9)/.9);scFloor(c,cx,y+h/2,w*1.4,e);
  c.save();c.globalAlpha=e;c.fillStyle='#000';c.fillRect(ox+w*.06,oy+h*.04,w*.88,h*.39);c.restore();
  if(S.cover){const cv=S.cover,sw=w*.86,sh=h*.38,sc=Math.max(sw/cv.naturalWidth,sh/cv.naturalHeight);c.save();c.globalAlpha=e*on;c.beginPath();c.rect(ox+w*.07,oy+h*.045,sw,sh);c.clip();const z=1.04+.03*Math.sin(t*.35);c.translate(ox+w/2,oy+h*.235);c.scale(z,z);c.drawImage(cv,-cv.naturalWidth*sc/2,-cv.naturalHeight*sc/2,cv.naturalWidth*sc,cv.naturalHeight*sc);c.restore()}
  scShot(c,I,x,y,w,0,e);
  if(d.td&&on>0){const bx=ox+w*.12,bw=w*.76,by=oy+h*.4;c.save();c.globalAlpha=e*on;c.fillStyle='rgba(0,0,0,.55)';c.fillRect(ox+w*.07,by-h*.045,w*.86,h*.07);c.strokeStyle='#fff';c.lineWidth=Math.max(1,w*.006);c.beginPath();for(let i=0;i<64;i++){const v=(d.td[i*16]-128)/128,px=bx+bw*i/63,py=by-h*.012+v*h*.02;i?c.lineTo(px,py):c.moveTo(px,py)}c.stroke();
   const pr=S.buf&&S.buf.duration?Math.min(1,t/S.buf.duration):(t%30)/30;c.fillStyle='rgba(255,255,255,.3)';c.fillRect(bx,by+h*.012,bw,h*.006);c.fillStyle='#e0242f';c.fillRect(bx,by+h*.012,bw*pr,h*.006);c.restore()}
  c.save();c.globalAlpha=e*on*(.1+b*.25);c.globalCompositeOperation='screen';scGlow(c,x,oy+h*.735,w*.2,.9);c.restore()})},
 /* SLEEVE: sleeve settles, the record eases out and spins, the cover glides in front */
 sleeve(c,cx,cy,s,t,d){const I=SCI.sleeve,b=d.bass||0,e=xo(t/1.8),e3=xo((t-.6)/1.6);scGlow(c,cx,cy,s*1.1,.24+b*.12);scCam(c,cx,cy,t,()=>{
  const sw=s*1.05;scFloor(c,cx,cy+s*.52,s*1.4,e);if(I)scShot(c,I,cx+s*.3+(1-e)*s*.25,cy-s*.02,sw,Math.sin(t*.4)*.004,e);
  scHero(c,cx-s*.26-(1-e3)*s*.15,cy+s*.02,s*.84*(1+b*.01),-.025,t,e3)})},
 /* STACK: the cover descends softly onto the stack */
 stack(c,cx,cy,s,t,d){const I=SCI.stack,b=d.bass||0,e=xo(t/1.5),dr=xo((t-.5)/1.8);scGlow(c,cx,cy,s,.24+b*.12);scCam(c,cx,cy,t,()=>{
  if(I){const w=s*.95,h=I.height*w/I.width;scFloor(c,cx,cy+s*.5,w*1.2,e);scShot(c,I,cx,cy+s*.5-h/2+(1-e)*s*.2,w,0,e)}
  const sz=s*.7*(1+b*.01);scHero(c,cx,cy-s*.16-(1-dr)*s*.35+Math.sin(t*.8)*s*.006,sz,.04*dr+Math.sin(t*.45)*.006,t,dr)})},
 /* SHATTER: the broken record drifts and turns behind a big cover */
 /* SHATTER: the real shards fly in from apart, lock into a cracked record and float, a hair apart; the kick pushes them out a touch */
 shatter(c,cx,cy,s,t,d){const b=d.bass||0,e2=xo((t-1.1)/1.6);scGlow(c,cx,cy,s*1.1,.26+b*.15);scCam(c,cx,cy,t,()=>{
  const RW=655,RH=667,sc=s*.98/RW,rx=cx+s*.26,ry=cy;scFloor(c,rx,cy+s*.55,s*1.2,xo(t/1.5));
  SHM.forEach((m,i)=>{const I=SCI['shard'+i];if(!I)return;const hx=(m[0]+m[2]/2-RW/2)*sc,hy=(m[1]+m[3]/2-RH/2)*sc,dl=Math.hypot(hx,hy)||1,ux=hx/dl,uy=hy/dl,k=xo((t-i*.07)/2.2),
   gap=s*(.012+b*.018)+Math.sin(t*.7+i*1.9)*s*.004,fly=(1-k)*s*(.9+(i%3)*.25),px=rx+hx+ux*(gap+fly),py=ry+hy+uy*(gap+fly),rot=(1-k)*((i%2?1:-1)*.9)+Math.sin(t*.5+i)*.012;
   c.save();c.globalAlpha=Math.min(1,k*1.4);c.translate(px,py);c.rotate(rot);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=s*.04;c.shadowOffsetY=s*.015;c.drawImage(I,-m[2]*sc/2,-m[3]*sc/2,m[2]*sc,m[3]*sc);c.restore()});
  scHero(c,cx-s*.18,cy+(1-e2)*s*.1,s*.82*(1+b*.012),-.03,t,e2)})},

 mpc(c,cx,cy,s,t,d){const I=SCI.mpc,b=d.bass||0,e=xo(t/1.6),e2=io((t-.4)/1.8);scGlow(c,cx,cy,s,.26+b*.12);scCam(c,cx,cy,t,()=>{
  scSpin(c,cx+s*.3*e2,cy-s*.08,s*.42,t,e2);if(!I){scHero(c,cx,cy,s*.8,0,t,1);return}const w=s*1.02,h=I.height*w/I.width,x=cx+s*.02,y=cy+(1-e)*s*.3,ox=x-w/2,oy=y-h/2,sc=w/649;
  scFloor(c,x,y+h/2,w*1.3,e);scShot(c,I,x,y,w,0,e);
  if(S.cover){const cv=S.cover,sx=ox+20*sc,sy=oy+70*sc,sw=406*sc,sh=222*sc,r=Math.max(sw/cv.naturalWidth,sh/cv.naturalHeight);c.save();c.globalAlpha=e*io((t-.9)/.8);c.beginPath();c.rect(sx,sy,sw,sh);c.clip();c.drawImage(cv,sx+sw/2-cv.naturalWidth*r/2,sy+sh/2-cv.naturalHeight*r/2,cv.naturalWidth*r,cv.naturalHeight*r);c.restore()}
  if(d.fd){const px=ox+MPCPAD[0]*sc,py=oy+MPCPAD[1]*sc,pw=MPCPAD[2]*sc,ph=MPCPAD[3]*sc,cw=pw/4,chh=ph/4;c.save();c.globalCompositeOperation='screen';for(let r=0;r<4;r++)for(let q=0;q<4;q++){const n=r*4+q,v=d.fd[4+n*6]/255,on=Math.max(0,v-.55)/.45;if(on<=0)continue;c.globalAlpha=e*on*.85;c.fillStyle='#ff3040';c.shadowColor='#ff3040';c.shadowBlur=cw*.5;c.fillRect(px+q*cw+cw*.1,py+r*chh+chh*.08,cw*.8,chh*.72)}c.restore()}})},
 /* SPEAKERS: monitors slide in from the sides, cones breathe with the kick, big cover centre */
 speakers(c,cx,cy,s,t,d){const I=SCI.speaker,b=d.bass||0,e=xo(t/1.7),e2=xo((t-.4)/1.6);scGlow(c,cx,cy,s*1.1,.26+b*.15);scCam(c,cx,cy,t,()=>{
  if(I){const h=s*.66*(1+b*.012),w=I.width*h/I.height,dx=Math.min(s*.56,c.canvas.width-cx-w*.55,cx-w*.55)+(1-e)*s*.25;scShot(c,I,cx-dx,cy+s*.12,w,0,e);c.save();c.translate(cx+dx,0);c.scale(-1,1);scShot(c,I,0,cy+s*.12,w,0,e);c.restore()}
  scHero(c,cx,cy+(1-e2)*s*.1,s*.8*(1+b*.012),0,t,e2)})},
 /* PRICE TAG: big cover settles, the tag eases onto the corner */
 'price tag'(c,cx,cy,s,t,d){const I=SCI.price,b=d.bass||0,e=xo(t/1.6),p=xo((t-1.2)/1.2);scGlow(c,cx,cy,s,.24+b*.12);scCam(c,cx,cy,t,()=>{
  const sz=s*.9*(1+b*.01);scFloor(c,cx,cy+sz/2,sz*1.2,e);scHero(c,cx,cy+(1-e)*s*.12,sz,.02,t,e);
  if(I&&p>0){c.save();c.globalAlpha=p;c.translate(cx+sz*.33+(1-p)*s*.15,cy+sz*.38+(1-p)*s*.05);c.rotate(-.12+(1-p)*.12);scShot(c,I,0,0,s*.46,0,1);c.restore()}})},
 /* GIANT RECORD: a huge record spins with the cover as its label, text on the right */
 'giant record'(c,cx,cy,s,t,d,L){const b=d.bass||0,e=xo(t/1.8),land=L.land,R=land?s*.86:s*.72;scGlow(c,cx,cy,R*1.2,.24+b*.1);scCam(c,cx,cy,t,()=>{scSpin(c,cx-(1-e)*R*.5,cy,R*(1+b*.006),t*.6,e)})},
 /* SPIN: record on the right, the cover is its label */
 spin(c,cx,cy,s,t,d){const b=d.bass||0,e=xo(t/1.6);scGlow(c,cx,cy,s,.24+b*.1);scCam(c,cx,cy,t,()=>{scFloor(c,cx,cy+s*.52,s*1.2,e);scSpin(c,cx+(1-e)*s*.4,cy,s*.64*(1+b*.006),t*.6,e)})},
 /* RED SPLIT: the cover fills the other half and slowly pushes in */
 'red split'(c,cx,cy,s,t,d,L){const cv=S.cover;if(!cv)return;const W=c.canvas.width,H=c.canvas.height,land=L.land,x=land?W*.5:0,y=0,w=land?W*.5:W,h=land?H:H*.5,z=1.02+Math.min(t,30)*.003,e=io(t/1.2),m=Math.min(cv.naturalWidth,cv.naturalHeight),sz=Math.max(w,h)*z;
  c.save();c.beginPath();c.rect(x+(1-e)*w,y,w,h);c.clip();c.drawImage(cv,(cv.naturalWidth-m)/2,(cv.naturalHeight-m)/2,m,m,x+w/2-sz/2,y+h/2-sz/2,sz,sz);c.restore();scSheen(c,x+w/2,y+h/2,Math.max(w,h),0,t,.6)},
 /* LOGO: the MZPRD logo settles above the cover */
 logo(c,cx,cy,s,t,d,L){const I=SCI.logo,b=d.bass||0,e=xo(t/1.6),e2=xo((t-.5)/1.6);scGlow(c,cx,cy,s,.26+b*.12);scCam(c,cx,cy,t,()=>{if(I){const w=s*1.05,h=I.height*w/I.width;c.save();c.globalAlpha=e;c.drawImage(I,cx-w/2,cy-s*.36-h/2-(1-e)*s*.1,w,h);c.restore()}
  scHero(c,cx,cy+s*.2+(1-e2)*s*.12,s*.6*(1+b*.01),0,t,e2)})},
 /* DAW: playlist clips whose waveforms are the real audio; the playhead runs through them in time with the track */
 daw(c,cx,cy,s,t,d,L){const W=c.canvas.width,H=c.canvas.height,land=L.land,I=SCI.dawblur,e=xo(t/1.4);if(I){const sc=Math.max(W/I.width,H/I.height)*1.05;c.save();c.globalAlpha=.5;c.drawImage(I,W/2-I.width*sc/2,H/2-I.height*sc/2,I.width*sc,I.height*sc);c.restore()}
  const nm=String((S.item&&S.item.title)||'LOOP').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,''),COL=[['#2f8fa8','#8ff0ff'],['#a8323f','#ffb0b8'],['#2f8fa8','#8ff0ff'],['#a8323f','#ffb0b8']],seg=4,cw=land?s*.9:s*1.05,ch=s*.24;
  scHero(c,cx-cw*.42,cy-s*.28,s*.42,-.02,t,e);
  for(let i=0;i<4;i++){const ei=xo((t-.4-i*.15)/1.2);if(ei<=0)continue;const x=cx-cw*.45+(i%2)*cw*.12+(1-ei)*s*.3,y=cy-s*.05+i*ch*.62,t0=Math.floor(t/(seg*4))*seg*4+i*seg,[bg,fg]=COL[i];
   c.save();c.globalAlpha=ei;c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=s*.04;c.fillStyle='rgba(20,22,30,.92)';c.fillRect(x,y,cw,ch);c.shadowColor='transparent';c.fillStyle=bg;c.fillRect(x,y,cw,ch*.24);c.strokeStyle='#7a3cff';c.lineWidth=Math.max(2,s*.006);c.strokeRect(x,y,cw,ch);
   c.fillStyle='#fff';c.font=`700 ${ch*.15}px Inter, Arial, sans-serif`;c.textBaseline='middle';c.textAlign='left';c.fillText('\u21A0 '+nm+'_Loop_0'+(i+1),x+ch*.08,y+ch*.125);
   const wy=y+ch*.62,wa=ch*.3,N=Math.round(cw/(s*.006)),act=t>=t0&&t<t0+seg;for(let j=0;j<N;j++){const tt=t0+seg*j/N,v=scPeakAt(tt),xx=x+cw*j/N,a=Math.max(1,v*wa),past=tt<=t;c.fillStyle=act&&past?'#fff':fg;c.globalAlpha=ei*(act?1:.75);c.fillRect(xx,wy-a,Math.max(1,cw/N*.7),a*2)}
   if(act){c.globalAlpha=ei;c.fillStyle='#fff';c.fillRect(x+cw*(t-t0)/seg-1,y+ch*.24,2.5,ch*.76)}c.restore()}}
};
function vinylDisc(c,cx,cy,s,t,d){
 const e=Math.min(1,t/1.4),ease=1-Math.pow(1-e,3),R=s*.48,x=cx+s*.5*ease,D=Math.min(2048,Math.round(R*2)),tex=vinylTexture(D);
 c.save();c.translate(x,cy);c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=s*.07;c.shadowOffsetY=s*.02;c.beginPath();c.arc(0,0,R,0,6.283);c.fillStyle='#000';c.fill();c.shadowColor='transparent';
 c.save();c.rotate(t*3.49);c.drawImage(tex,-R,-R,R*2,R*2);c.restore();
 if(c.createConicGradient){c.save();c.beginPath();c.arc(0,0,R*.975,0,6.283);c.arc(0,0,R*.35,0,6.283,true);c.clip();c.globalCompositeOperation='screen';
  const g=c.createConicGradient(-.6,0,0);[[0,0],[.05,.20],[.1,.03],[.18,0],[.5,0],[.55,.16],[.6,.03],[.68,0],[1,0]].forEach(([o,a])=>g.addColorStop(o,'rgba(235,235,245,'+a+')'));c.fillStyle=g;c.fillRect(-R,-R,R*2,R*2);
  const rg=c.createRadialGradient(-R*.35,-R*.4,0,-R*.35,-R*.4,R*.9);rg.addColorStop(0,'rgba(255,255,255,.06)');rg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=rg;c.fillRect(-R,-R,R*2,R*2);c.restore()}
 c.restore()}
function effects(c,W,H,t,d){
 const pr=S.preset,k=H/1080,b=(d&&d.bass)||0;
 const grade=(op,col)=>{c.save();c.globalCompositeOperation=op;c.fillStyle=col;c.fillRect(0,0,W,H);c.restore()};
 const R=(i)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
 const halo=(x,y,r,col,a)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+col+','+a+')');g.addColorStop(1,'rgba('+col+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)};
 const breathe=1+b*.12;
 if(pr==='noir'){grade('saturation','#808080');grade('soft-light','rgba(40,40,40,.5)');
  c.save();c.globalCompositeOperation='multiply';const P=H*.22,off=(t*4)%P;c.translate(W*.15,0);c.rotate(-.22);for(let i=-4;i<10;i++){const y=i*P+off,g=c.createLinearGradient(0,y,0,y+P*.6);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,.2)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(-W*.3,y,W*1.6,P*.6)}c.restore();
  c.save();c.globalCompositeOperation='screen';halo(W*.72,H*.18,W*.5,'255,255,255',(.06*breathe).toFixed(3));c.restore();return}
 if(pr==='golden'){grade('soft-light','rgba(255,170,90,.55)');grade('multiply','rgba(255,226,190,.9)');
  c.save();c.globalCompositeOperation='screen';const lx=W*(.85+.06*Math.sin(t*.13));halo(lx,H*.1,W*.7,'255,150,70',(.22*breathe).toFixed(3));halo(W*.05,H*.95,W*.4,'255,90,40',(.07).toFixed(3));
  for(let i=0;i<70;i++){const sp=.004+R(i)*.01,x=((R(i+9)+t*sp+Math.sin(t*.3+i)*.01)%1)*W,y=((R(i+3)+t*sp*.6)%1)*H,z=R(i+5),rr=(1+z*3.5)*k,a=(.15+z*.35)*(.5+.5*Math.sin(t*.8+i));c.fillStyle='rgba(255,226,180,'+a.toFixed(3)+')';c.beginPath();c.arc(x,y,rr,0,6.283);c.fill()}c.restore();return}
 if(pr==='midnight'){grade('soft-light','rgba(20,70,140,.6)');grade('multiply','rgba(170,200,240,.92)');
  c.save();c.globalCompositeOperation='screen';for(let i=0;i<14;i++){const z=R(i+1),x=((R(i+2)+t*.006*(1+z))%1.2-.1)*W,y=H*(.15+.7*R(i+4))+Math.sin(t*.4+i)*12*k,r=(30+z*90)*k;halo(x,y,r,i%3?'120,170,255':'255,255,255',(.05+.06*z).toFixed(3))}
  const cy=H*.46,a=.35*breathe,lw=W*(.42+b*.1);const g=c.createLinearGradient(W/2-lw,0,W/2+lw,0);g.addColorStop(0,'rgba(120,180,255,0)');g.addColorStop(.5,'rgba(190,225,255,'+a.toFixed(3)+')');g.addColorStop(1,'rgba(120,180,255,0)');c.fillStyle=g;c.fillRect(W/2-lw,cy-1.2*k,lw*2,2.4*k);
  const g2=c.createLinearGradient(W/2-lw,0,W/2+lw,0);g2.addColorStop(0,'rgba(90,150,255,0)');g2.addColorStop(.5,'rgba(90,150,255,'+(a*.25).toFixed(3)+')');g2.addColorStop(1,'rgba(90,150,255,0)');c.fillStyle=g2;c.fillRect(W/2-lw,cy-14*k,lw*2,28*k);c.restore();return}
 if(pr==='vinyl'){grade('soft-light','rgba(255,160,100,.35)');c.save();c.globalCompositeOperation='screen';halo(W*.2,H*.2,W*.6,'255,120,80',(.08*breathe).toFixed(3));c.restore();return}
 if(pr==='archive'){const wx=(R(Math.floor(t*24))-.5)*2*k,wy=(R(Math.floor(t*24)+50)-.5)*3*k;if(wx||wy)c.drawImage(c.canvas,wx,wy);
  grade('saturation','rgba(128,128,128,.55)');grade('soft-light','rgba(120,100,70,.5)');
  const fl=(R(Math.floor(t*24)+99)-.5)*.06;c.fillStyle=fl>0?'rgba(255,250,240,'+fl.toFixed(3)+')':'rgba(0,0,0,'+(-fl).toFixed(3)+')';c.fillRect(0,0,W,H);
  const fr=Math.floor(t*24);c.fillStyle='rgba(10,8,6,.55)';for(let i=0;i<3;i++){if(R(fr*3+i)<.55)continue;const x=R(fr+i*7)*W,y=R(fr+i*13)*H,r=(1+R(fr+i)*2.5)*k;c.beginPath();c.arc(x,y,r,0,6.283);c.fill()}
  if(R(fr+777)>.93){c.strokeStyle='rgba(10,8,6,.4)';c.lineWidth=1.2*k;c.beginPath();const x=R(fr+5)*W,y=R(fr+6)*H;c.moveTo(x,y);c.bezierCurveTo(x+30*k,y+10*k,x+10*k,y+50*k,x+40*k,y+70*k);c.stroke()}
  const lb=(H-W/2.39)/2;if(lb>0){c.fillStyle='#000';c.fillRect(0,0,W,lb);c.fillRect(0,H-lb,W,lb)}return}
 if(pr==='smoke'){grade('soft-light','rgba(60,40,40,.5)');c.save();c.globalCompositeOperation='screen';halo(W/2,H*.46,H*.62,'200,40,36',(.16*breathe).toFixed(3));
  for(let i=0;i<7;i++){const z=R(i+20),x=((R(i)+t*.004*(1+z))%1.4-.2)*W,y=H*(.3+.5*R(i+30))+Math.sin(t*.07+i)*H*.04,r=W*(.22+.12*z);halo(x,y,r,'170,165,170',(.05+.03*z).toFixed(3))}
  for(let i=0;i<10;i++){const sp=.02+R(i+60)*.03,yy=H*(1.05-((t*sp+R(i+70))%1.1)),xx=W*(.3+.4*R(i+80))+Math.sin(t*.6+i)*25*k,al=Math.min(1,(H-yy)/(H*.3))*(yy/H)*.7;c.fillStyle='rgba(255,140,80,'+al.toFixed(3)+')';c.beginPath();c.arc(xx,yy,1.4*k,0,6.283);c.fill()}c.restore();return}
 if(pr==='stage'){grade('soft-light','rgba(30,30,40,.6)');c.save();c.globalCompositeOperation='screen';const sx=W/2+Math.sin(t*.11)*W*.05,a=.16*breathe;
  const g=c.createLinearGradient(sx,0,W/2,H);g.addColorStop(0,'rgba(255,248,235,'+a.toFixed(3)+')');g.addColorStop(1,'rgba(255,248,235,0)');c.fillStyle=g;c.beginPath();c.moveTo(sx-W*.03,-10);c.lineTo(sx+W*.03,-10);c.lineTo(W/2+W*.32,H);c.lineTo(W/2-W*.32,H);c.closePath();c.fill();
  for(let i=0;i<40;i++){const z=R(i+40),x=W/2+(R(i+41)-.5)*W*.5*((R(i+42)+t*.01)%1),y=((R(i+43)+t*.006*(1+z))%1)*H,al=.25*z*(1-Math.abs(x-W/2)/(W*.3));if(al>0){c.fillStyle='rgba(255,250,240,'+al.toFixed(3)+')';c.fillRect(x,y,1.5*k,1.5*k)}}
  halo(W/2,H*.95,W*.5,'255,255,255',(.05*breathe).toFixed(3));c.restore();return}
 if(pr==='grunge'){c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(150,120,90,.45)';c.fillRect(0,0,W,H);c.restore();
  c.fillStyle='rgba(255,255,255,.07)';for(let i=0;i<4;i++)c.fillRect(Math.random()*W,0,1.5,H)}
 else if(pr==='film'){c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(255,214,160,.35)';c.fillRect(0,0,W,H);c.restore();
  c.fillStyle='rgba(255,255,255,'+(Math.random()*.05)+')';c.fillRect(0,0,W,H);
  if(Math.random()<.12){c.fillStyle='rgba(255,255,255,.22)';c.fillRect(Math.random()*W,0,1.5,H)}}
 else if(pr==='animated'){c.save();c.globalCompositeOperation='screen';const x=(.5+.5*Math.sin(t*.5))*W,g=c.createRadialGradient(x,H*.3,0,x,H*.3,W*.45);
  g.addColorStop(0,'rgba(255,170,60,.28)');g.addColorStop(1,'rgba(255,170,60,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()}
 else if(pr==='minimal'){c.fillStyle='rgba(0,0,0,.22)';c.fillRect(0,0,W,H)}
}

/* ---------- audio + playback ---------- */
function audioCtx(){
 if(A)return A;
 const ctx=new (window.AudioContext||window.webkitAudioContext)(),an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=.7;
 const out=ctx.createGain(),rec=ctx.createMediaStreamDestination();an.connect(out);out.connect(ctx.destination);an.connect(rec);
 A={ctx,an,out,rec,playing:false,src:null,t0:0};return A;
}
async function decode(arr){const a=audioCtx();return await a.ctx.decodeAudioData(arr)}
/* preview links expire (signed, 6 h): on any failure get a fresh link and try once more */
async function fetchPrev(path){const go=()=>fetch(pub(path)).then(r=>{if(!r.ok)throw new Error('audio '+r.status);return r.arrayBuffer()});try{return await go()}catch(e){if(!window.MZPrime||String(path).indexOf('r2:')!==0)throw e;await MZPrime([path],true);return await go()}}
async function loadPreview(){if(S.item&&window.MZPrime)try{await MZPrime([S.item.preview_path])}catch(e){}
 const it=S.item;S.buf=null;msg('');setAudM('');
 if(!it||!it.preview_path){setAudM('This item has no preview audio. Pick "my full beat file" and choose a file.');redraw();return}
 try{setAudM('Loading preview...');S.buf=await decode(await fetchPrev(it.preview_path));S.srcLabel='preview';setAudM('Preview loaded ('+fmt(S.buf.duration)+').')}
 catch(e){setAudM('Could not load the preview audio.')}
 syncUi();redraw();
}
async function loadFile(f){
 if(!f)return;setAudM('Reading file...');
 try{S.buf=await decode(await f.arrayBuffer());S.srcLabel=f.name;setAudM(f.name+' ('+fmt(S.buf.duration)+')')}
 catch(e){setAudM('Could not read that audio file.');S.buf=null}
 syncUi();redraw();
}
function fmt(s){s=Math.max(0,s||0);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function startPlay(toSpeakers,from){
 stopPlay();if(!S.buf)return null;const a=audioCtx();a.ctx.resume();a.out.gain.value=toSpeakers?1:0;
 const s=a.ctx.createBufferSource();s.buffer=S.buf;s.connect(a.an);const off=from||0;s.start(0,off,Math.max(0.1,len()-off));
 a.src=s;a.t0=a.ctx.currentTime-off;a.playing=true;return s;
}
function stopPlay(){if(A&&A.src){try{A.src.onended=null;A.src.stop()}catch(e){}A.src=null}if(A)A.playing=false;if(run&&run.raf){cancelAnimationFrame(run.raf)}run=null;setPlayBtn()}
function playFrom(f){const s=startPlay(true,f*len());if(!s)return;run={done:()=>{stopPlay();scrub=0;redraw()}};s.onended=()=>{};setPlayBtn();loop(false)}
function setPlayBtn(){const b=$s('#sPlay');if(b)b.textContent=(A&&A.playing&&!(run&&run.rec))?'STOP PREVIEW':'PLAY PREVIEW'}
function loop(rec){
 const cv=$s('#sCv');if(!cv)return;const a=A,dur=len();
 const tick=()=>{if(!run)return;const t=a.ctx.currentTime-a.t0;
  frame(cv,Math.min(t,dur),dur);setTime(t,dur);drawWave(Math.min(1,t/dur),lastBass);
  if(rec)$s('#sProg').style.width=Math.min(100,t/dur*100)+'%';
  if(t>=dur){run.done&&run.done();return}
  run.raf=requestAnimationFrame(tick)};
 run.raf=requestAnimationFrame(tick);
}
function setTime(t,d){const el=$s('#sTime');if(el)el.textContent=fmt(t)+' / '+fmt(d)}
function redraw(){const cv=$s('#sCv');if(!cv)return;const[w,h]=dims();if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;S.bd=null}
 if(A&&A.playing)return;const d=len(),t=scrub*d;frame(cv,t,d);setTime(t,d);drawWave(scrub,0)}
function peaks(){
 const d=len(),key=(S.buf?S.buf.length:0)+':'+d;if(S.pk&&S.pk.key===key)return S.pk;
 const n=360,out=new Float32Array(n);
 if(S.buf){const ch=S.buf.getChannelData(0),sr=S.buf.sampleRate,tot=Math.min(ch.length,Math.floor(d*sr)),step=Math.max(1,Math.floor(tot/n)),sk=Math.max(1,(step/64)|0);
  let mx=1e-6;for(let i=0;i<n;i++){let m=0;const a=i*step,e=Math.min(ch.length,a+step);for(let j=a;j<e;j+=sk){const v=Math.abs(ch[j]);if(v>m)m=v}out[i]=m;if(m>mx)mx=m}
  for(let i=0;i<n;i++)out[i]=Math.max(.04,out[i]/mx)}else out.fill(.06);
 out.key=key;S.pk=out;return out;
}
function drawWave(frac,bass){
 const c=$s('#sWave');if(!c)return;const dpr=devicePixelRatio||1,W=Math.round(c.clientWidth*dpr),H=Math.round(c.clientHeight*dpr);if(!W||!H)return;
 if(c.width!==W||c.height!==H){c.width=W;c.height=H}
 const x=c.getContext('2d'),p=peaks(),n=p.length,bw=W/n,mid=H/2,ph=frac*n;x.clearRect(0,0,W,H);
 for(let i=0;i<n;i++){const near=Math.max(0,1-Math.abs(i-ph)/8),h=Math.max(2*dpr,p[i]*H*.88*(1+near*(bass||0)*.8));x.fillStyle=i<ph?'#e0242f':'#3a3a42';x.fillRect(i*bw+bw*.14,mid-h/2,bw*.72,h)}
 x.fillStyle='#fff';x.fillRect(Math.max(0,Math.round(frac*W)-dpr),0,2*dpr,H);
}
function msg(m){const el=$s('#sMsg');if(el)el.textContent=m}
function setAudM(m){const el=$s('#sAudM');if(el)el.textContent=m}

/* ---------- render ---------- */
const mcx=new MessageChannel(),ysq=[];mcx.port1.onmessage=()=>{const f=ysq.shift();if(f)f()};
const yieldNow=()=>new Promise(r=>{ysq.push(r);mcx.port2.postMessage(0)});
function badge(p){const b=document.querySelector('.bh [data-t=video]');if(b)b.textContent=p==null?'VIDEO STUDIO':'VIDEO STUDIO '+p+'%'}
/* while a render runs, links open in a new tab so leaving the page never stops it */
if(!window.__mzNav){window.__mzNav=1;window.__mzR=0;document.addEventListener('click',e=>{if(!(window.__mzR>0))return;const a=e.target.closest&&e.target.closest('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank'||a.href.startsWith('blob:')||a.getAttribute('href').startsWith('#'))return;e.preventDefault();e.stopPropagation();window.open(a.href,'_blank');try{toast('RENDER STILL RUNNING HERE, OPENED IN A NEW TAB')}catch(x){}},true)}
const beforeUnload=e=>{if(R.busy){e.preventDefault();e.returnValue=''}};
function loadMuxer(){return window.Mp4Muxer?Promise.resolve():new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('mp4-muxer.js',document.baseURI).href;sc.onload=ok;sc.onerror=()=>no(new Error('muxer'));document.head.appendChild(sc)})}
async function render(){
 if(R.busy)return;if(!S.buf){msg('Add audio first (preview or your own file).');return}
 stopPlay();
 const fastOK=window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext,both=$s('#sBoth')&&$s('#sBoth').checked;
 $s('#sDl2').style.display='none';
 /* both ratios: 16:9 first, then 9:16 (each keeps its own length rules), one download button each */
 if(both&&fastOK){const f0=S.fmt;try{S.fmt='16:9';await renderFast({tag:'16:9 ',dl:$s('#sDl')});S.fmt='9:16';await renderFast({tag:'9:16 ',dl:$s('#sDl2')});
   msg('Both videos are ready. Click each DOWNLOAD button.');try{toast('BOTH VIDEOS READY')}catch(e){}}
  catch(e){console.warn('both render failed',e);OFF=null;R.busy=false;badge();$s('#sRender').disabled=false;document.getElementById('studio').classList.remove('busy');msg('Render failed ('+((e&&e.message)||e)+'). Try one ratio at a time.')}
  finally{S.fmt=f0;redraw()}return}
 if(both&&!fastOK)msg('This browser can only render one ratio at a time. Rendering '+S.fmt+'.');
 if(fastOK){
  try{await renderFast();return}catch(e){console.warn('fast render failed',e);OFF=null;R.busy=false;badge();$s('#sRender').disabled=false;document.getElementById('studio').classList.remove('busy');msg('Fast render is not available here ('+((e&&e.message)||e)+'). Using real-time render.')}
 }
 return renderRT();
}
async function renderFast(o){
 o=o||{};await loadMuxer();
 const[w,h]=dims(),fps=30,dur=len(),N=Math.ceil(dur*fps),btn=$s('#sRender'),dl=o.dl||$s('#sDl'),root=document.getElementById('studio'),tag=o.tag||'';
 const pickV=async()=>{for(const c of [{codec:'avc1.640028',mux:'avc'},{codec:'avc1.4d0028',mux:'avc'},{codec:'avc1.42E028',mux:'avc'},{codec:'vp09.00.40.08',mux:'vp9'}]){const cfg={codec:c.codec,width:w,height:h,bitrate:8e6,framerate:fps};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
 const pickA=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:48000,numberOfChannels:2,bitrate:192000});if(r&&r.supported)return c}catch(e){}}return null};
 const vc=await pickV(),ac=await pickA();if(!vc||!ac)throw new Error('no codec');
 R.busy=true;root.classList.add('busy');btn.disabled=true;dl.style.display='none';badge(0);addEventListener('beforeunload',beforeUnload);window.__mzR=(window.__mzR||0)+1;
 $s('#sProg').style.width='0';msg('Preparing...');
 await document.fonts.load('40px '+(FONTS[S.font]||'Impact')).catch(()=>{});await document.fonts.load("12px 'Press Start 2P'").catch(()=>{});
 if(!heroImg){heroImg=new Image();heroImg.src=new URL('hero.jpg',document.baseURI).href}try{await heroImg.decode()}catch(e){}
 const oc=new OfflineAudioContext(2,Math.ceil(dur*48000),48000),src=oc.createBufferSource(),og=oc.createGain();src.buffer=S.buf;src.connect(og);og.connect(oc.destination);
 /* anti-rip voice tag: packs + samples only, low, every 13 s */
 if(!($s('#sTag')&&!$s('#sTag').checked)&&S.kind!=='beats'){try{const tb=await oc.decodeAudioData(await (await fetch(new URL('sfx/inside/tag.mp3?v=1',document.baseURI).href)).arrayBuffer());let pk=0;for(let c=0;c<tb.numberOfChannels;c++){const d=tb.getChannelData(c);for(let i=0;i<d.length;i+=2)pk=Math.max(pk,Math.abs(d[i]))}for(let t=1.2;t<dur-1.5;t+=13){const n=oc.createBufferSource(),g=oc.createGain();n.buffer=tb;g.gain.value=.16/(pk||1);n.connect(g);g.connect(oc.destination);n.start(t)}}catch(e){console.warn('tag',e)}}if(S.fmt==='9:16'&&S.buf.duration>dur+.5){og.gain.setValueAtTime(1,Math.max(0,dur-1.5));og.gain.linearRampToValueAtTime(0,dur)}src.start(0);const rb=await oc.startRendering();
 const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:w,height:h},audio:{codec:ac.mux,numberOfChannels:2,sampleRate:48000},fastStart:'in-memory'});
 let err=null;
 const venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);
 const aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:ac.codec,sampleRate:48000,numberOfChannels:2,bitrate:192000});
 const t0=performance.now();
 try{
  const L=rb.getChannelData(0),Rr=rb.getChannelData(1),CH=4800;
  for(let o=0,k=0;o<L.length;o+=CH,k++){const n=Math.min(CH,L.length-o),buf=new Float32Array(n*2);buf.set(L.subarray(o,o+n),0);buf.set(Rr.subarray(o,o+n),n);
   const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(o/48000*1e6),data:buf});aenc.encode(ad);ad.close();if(k%25===0)await yieldNow()}
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;S.bd=null;OFF={prev:new Float32Array(512)};
  for(let i=0;i<N;i++){
   if(err)throw err;
   frame(cv,Math.min(i/fps,dur),dur);
   const vf=new VideoFrame(cv,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});venc.encode(vf,{keyFrame:i%90===0});vf.close();
   while(venc.encodeQueueSize>8){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),yieldNow()]);if(err)throw err}
   if(i%4===0){const p=Math.round(i/N*100);$s('#sProg').style.width=p+'%';badge(p);msg(tag+'Rendering '+p+'% ... you can switch tabs, it keeps going.');await yieldNow()}
  }
  OFF=null;await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();
 }finally{OFF=null;try{venc.close()}catch(e){}try{aenc.close()}catch(e){}removeEventListener('beforeunload',beforeUnload);window.__mzR=Math.max(0,(window.__mzR||1)-1)}
 const blob=new Blob([target.buffer],{type:'video/mp4'}),url=URL.createObjectURL(blob);
 dl.href=url;dl.download=((S.item&&(S.item.slug||String(S.item.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')))||'video')+'-'+(S.fmt==='16:9'?'16x9':'9x16')+'.mp4';dl.textContent='DOWNLOAD '+S.fmt+' VIDEO';dl.style.display='block';
 R.busy=false;root.classList.remove('busy');btn.disabled=false;badge();$s('#sProg').style.width='100%';
 msg(tag+'Done in '+Math.round((performance.now()-t0)/1000)+'s. '+(blob.size/1048576).toFixed(1)+' MB MP4. Click DOWNLOAD VIDEO.');
 try{toast('VIDEO READY: '+dl.download)}catch(e){}
 redraw();
}
async function renderRT(){
 if(!S.buf){msg('Add audio first (preview or your own file).');return}
 if(!window.MediaRecorder){msg('This browser cannot record video. Use Chrome or Edge.');return}
 stopPlay();const cv=$s('#sCv'),btn=$s('#sRender'),dl=$s('#sDl');dl.style.display='none';
 const[w,h]=dims();cv.width=w;cv.height=h;S.bd=null;
 await document.fonts.load('40px '+(FONTS[S.font]||'Impact')).catch(()=>{});await document.fonts.load("12px 'Press Start 2P'").catch(()=>{});
 const a=audioCtx();await a.ctx.resume();
 const types=['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
 const mime=types.find(t=>MediaRecorder.isTypeSupported(t))||'';
 const ext=mime.startsWith('video/mp4')?'mp4':'webm';
 const vs=cv.captureStream(30),ms=new MediaStream([...vs.getVideoTracks(),...a.rec.stream.getAudioTracks()]);
 const chunks=[],rc=new MediaRecorder(ms,{mimeType:mime||undefined,videoBitsPerSecond:9e6,audioBitsPerSecond:192e3});
 rc.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
 btn.disabled=true;msg('Rendering... keep this tab open.');$s('#sProg').style.width='0';
 rc.onstop=()=>{
  const blob=new Blob(chunks,{type:mime||'video/webm'}),url=URL.createObjectURL(blob);
  dl.href=url;dl.download=((S.item&&(S.item.slug||String(S.item.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')))||'video')+'-'+(S.fmt==='16:9'?'16x9':'9x16')+'.'+ext;dl.style.display='block';
  btn.disabled=false;msg('Done. '+(blob.size/1048576).toFixed(1)+' MB '+ext.toUpperCase()+'. Click DOWNLOAD VIDEO.');$s('#sProg').style.width='100%';
  stopPlay();redraw();
 };
 const done=()=>{setTimeout(()=>{if(rc.state!=='inactive')rc.stop()},350)};
 rc.start(500);
 const s=startPlay(false,0);if(!s){rc.stop();btn.disabled=false;return}
 run={rec:true,done};setPlayBtn();loop(true);
}

/* ---------- UI ---------- */
/* a crate-style cover for a single sample: the worn sleeve with its name printed on it, the red-label record sliding out */
let SMPIMG=null;const smpImgs=()=>SMPIMG||(SMPIMG=Promise.all(['crate-sleeve.jpg','crate-record.webp?v=1'].map(n=>new Promise(ok=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>ok(im);im.onerror=()=>ok(null);im.src=BASEPATH+n}))));
/* single samples use the real blank sleeve (crate-sleeve.jpg) as their cover, untouched */
async function sampleCover(it){const [sl]=await smpImgs(),N=1024,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle='#0a0a0b';x.fillRect(0,0,N,N);
 if(sl){const m=Math.min(sl.width,sl.height);x.drawImage(sl,(sl.width-m)/2,(sl.height-m)/2,m,m,0,0,N,N)}
 return c.toDataURL('image/jpeg',.92)}
function setItem(it){
 S.item=it;S.cover=null;S.bd=null;S.buf=null;
 const isB=S.kind==='beats',isS=S.kind==='samples',info=[];if(isS&&it.kind)info.push(it.kind);if(it.bpm)info.push(it.bpm+' BPM');if(it.musical_key)info.push(it.musical_key);
 S.tx.title.text=it.title||'';S.tx.info.text=info.length?info.join('  |  '):(isB?'':isS?'SINGLE SAMPLE':'SAMPLE PACK');S.tx.intro.text=isB?'NEW BEAT':isS?'NEW SAMPLE':'NEW SAMPLE PACK';
 buildTx();ytText(true);if(isS)sampleCover(it).then(u=>{if(S.item===it)loadCover(u)});else loadCover(it.cover_path?pub(it.cover_path):(S.kind==='beats'?stockCover(it.title,1024):''));
 if(S.src==='preview')loadPreview();else{S.buf=null;redraw()}
 document.querySelectorAll('#studio .it').forEach(e=>e.classList.toggle('on',e.dataset.id===String(it.id)));
}
function loadCover(url){
 const m=$s('#sCovM');if(!url){S.cover=null;if(m)m.textContent='No cover on this item. Choose an image.';redraw();return}
 const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{S.cover=im;S.bd=null;if(m)m.textContent='';redraw()};
 im.onerror=()=>{S.cover=null;if(m)m.textContent='Could not load the cover. Choose an image from your computer.';redraw()};im.src=url;
}
function buildTx(){
 const L={intro:'INTRO',tag:'PRODUCER TAG',title:'TITLE',info:'INFO'};
 $s('#sTx').innerHTML=Object.keys(L).map(k=>{const o=S.tx[k];return `<div class="trow"><input type="checkbox" data-k="${k}" data-f="on"${o.on?' checked':''}><span>${L[k]}</span><input type="text" data-k="${k}" data-f="text" value="${e2(o.text)}"><input type="number" data-k="${k}" data-f="start" min="0" step="0.5" value="${o.start}"></div>`}).join('');
 $s('#sTx').oninput=e=>{const t=e.target,k=t.dataset.k;if(!k)return;const f=t.dataset.f;S.tx[k][f]=f==='on'?t.checked:f==='start'?(parseFloat(t.value)||0):t.value;if(f==='text'&&k==='title'){ytText();thSync()}redraw()};
}
const YEAR=new Date().getFullYear(),yi={t:0,d:0,g:0};
function ytCtx(){
 const it=S.item,isB=S.kind==='beats',tags=(it.tags||'').split(/[\/,]/).map(x=>x.trim()).filter(Boolean),
  art=(($s('#yA')||{}).value||'').trim(),mood=(($s('#yM')||{}).value||'').trim()||tags[1]||'Hard',genre=tags[0]||'Hip Hop',
  bpm=it.bpm?it.bpm+' BPM':'',key=it.musical_key||'',info=[bpm,key].filter(Boolean).join(' '),
  A=art?art+' Type Beat':mood+' '+genre+' Type Beat';
 return{it,isB,tags,art,mood,genre,bpm,key,info,A,T:it.title||'',url:S.kind==='samples'?SITE+'/crate-dig/':SITE+'/'+(isB?'beat':'pack')+'/'+(it.slug||String(it.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||it.id)+'/',Y:YEAR,gtag:genre.toLowerCase().replace(/[^a-z0-9]/g,'')};
}
function cut(str,n){str=str.replace(/\s+/g,' ').replace(/\s+\|\s+\|/g,' |').replace(/\(\s*\)/g,'').trim();if(str.length<=n)return str;const c=str.slice(0,n),i=c.lastIndexOf(' ');return(i>n*.6?c.slice(0,i):c).replace(/[|\-,(\s]+$/,'')}
const TITLES_B=[
 x=>'[FREE] '+x.T+' | Hard Type Beat'+(x.info?' | '+x.info:'')+' | Prod. MZPRD',
 x=>'[FREE] '+x.A+' '+x.Y+' - "'+x.T+'" | '+x.genre+' Instrumental',
 x=>'"'+x.T+'" - '+x.mood+' '+x.A+(x.bpm?' ('+x.bpm+')':'')+' | Prod. MZPRD',
 x=>x.A+' '+x.Y+' "'+x.T+'" (Prod. MZPRD)',
 x=>x.mood+' '+x.genre+' Beat "'+x.T+'" | '+x.A+(x.info?' | '+x.info:''),
 x=>'FREE '+x.A+' - "'+x.T+'" | Rap Instrumental '+x.Y,
 x=>'"'+x.T+'" | '+x.A+' | '+x.genre+' Beat '+x.Y+' ('+(x.info||'Prod. MZPRD')+')',
 x=>x.T+' | '+x.mood+' '+x.genre+' Instrumental '+x.Y+' | '+x.A
];
const TITLES_P=[
 x=>x.T+' | Sample Pack'+(x.info?' | '+x.info:'')+' | Prod. MZPRD',
 x=>'"'+x.T+'" Sample Pack - Vinyl Samples & Producer Loops '+x.Y,
 x=>'[PREVIEW] '+x.T+' | '+x.genre+' Sample Pack | Prod. MZPRD',
 x=>x.mood+' Vinyl Sample Pack "'+x.T+'" (Loops + Chops) '+x.Y,
 x=>x.T+' - Producer Sample Pack | Chops, Loops & Textures',
 x=>'Sample Pack "'+x.T+'" | '+x.genre+' Vinyl Samples for Producers '+x.Y
];
const DESCS_B=[
 x=>'Buy this beat and download it instantly: '+x.url+'\n\n'+x.T+(x.info?' - '+x.info:'')+'\nProduced by MZPRD (Meztheprod)\n\nMore beats and sample packs: '+SITE+'\n\n#typebeat #rapbeat #mzprd',
 x=>x.A+' '+x.Y+' - "'+x.T+'"\n\nBuy this beat and download it instantly: '+x.url+'\n\n'+(x.info?'BPM / Key: '+x.info+'\n':'')+'Mood: '+x.mood+'\n\nSubscribe for new beats every week and turn on the bell.\n\nProduced by MZPRD (Meztheprod)\n'+SITE+'\n\n#typebeat #'+x.gtag+'beat #mzprd',
 x=>'"'+x.T+'" - '+x.mood+' '+x.genre+' instrumental\n\nBuy / download: '+x.url+'\n\nDETAILS\nBeat: '+x.T+(x.bpm?'\nBPM: '+x.bpm.replace(' BPM',''):'')+(x.key?'\nKey: '+x.key:'')+'\nMood: '+x.mood+'\nProd. by MZPRD\n\nAll beats: '+SITE+'\n\n#typebeat #instrumental #mzprd',
 x=>'Rappers and singers: hear it, then record over it. '+x.A+' '+x.Y+' "'+x.T+'".\n\nGet the beat: '+x.url+'\n\nWant to try it first? Open the site, play the preview and use the recording booth over the beat.\nSend me your finished song, I check every message.\n\nProd. by MZPRD (Meztheprod)\n'+SITE+'\n\n#typebeat #rapbeat #mzprd',
 x=>x.T+' is a '+x.mood.toLowerCase()+' '+x.genre.toLowerCase()+' instrumental'+(x.info?' ('+x.info+')':'')+' made for rappers, singers and content creators looking for '+x.A.toLowerCase()+' '+x.Y+'.\n\nBuy it and download it instantly: '+x.url+'\n\nMore '+x.genre.toLowerCase()+' beats, instrumentals and sample packs by MZPRD (Meztheprod): '+SITE+'\n\n#'+x.gtag+'beat #typebeat #mzprd'
];
const DESCS_P=[
 x=>'Get this sample pack: '+x.url+'\n\n'+x.T+(x.info?' - '+x.info:'')+'\nProduced by MZPRD (Meztheprod)\n\nMore beats and sample packs: '+SITE+'\n\n#samplepack #producer #mzprd',
 x=>x.T+' - '+x.mood+' sample pack for producers\n\nGet it and download instantly: '+x.url+'\n\nVinyl samples, loops and chops ready to flip into your next beat.\nSubscribe for new packs and beats every week.\n\nProd. by MZPRD (Meztheprod)\n'+SITE+'\n\n#samplepack #vinylsamples #mzprd',
 x=>'Sample pack preview: "'+x.T+'"\n\nDETAILS\nPack: '+x.T+'\nStyle: '+x.mood+' '+x.genre+'\nFormat: loops and samples, download straight after payment\n\nBuy it here: '+x.url+'\nAll packs: '+SITE+'\n\n#samplepack #producerloops #mzprd'
];
const TAGS_B=[
 x=>[...x.tags,x.T,'MZPRD','Meztheprod','type beat','rap beat','hip hop instrumental'],
 x=>[x.A,'type beat',x.genre+' type beat',x.mood+' type beat','free type beat','rap instrumental','instrumental',x.T,'prod mzprd',x.Y+' type beat'],
 x=>['buy beats','beats for sale','rap beats for sale','hip hop beats for sale',x.genre+' beats for sale','rap instrumental',x.T,'MZPRD','Meztheprod'],
 x=>[x.genre+' beat',x.genre+' instrumental',x.mood+' beat',x.genre+' beat '+x.Y,'trap beat','boom bap beat','rap beat','dark beat','hard beat',x.T,'MZPRD'],
 x=>[x.art?x.art+' type beat '+x.Y:x.mood+' type beat '+x.Y,x.A+' free',x.mood+' '+x.genre+' beat','beat for rappers','instrumental for rap','rap beat with hook',x.T,'MZPRD']
];
const TAGS_P=[
 x=>[x.T,'MZPRD','Meztheprod','sample pack','vinyl samples','producer loops'],
 x=>['sample pack','vinyl samples','producer loops','sample pack for producers','loops and chops','beat making','free samples preview',x.T,'MZPRD'],
 x=>[x.genre+' samples',x.mood+' samples','vinyl sample pack','sample pack '+x.Y,'producer sounds','sample flip','how to flip samples',x.T,'MZPRD']
];
TITLES_B.push(
 x=>'\uD83D\uDD25 '+x.A+' '+x.Y+' - "'+x.T+'" \uD83D\uDD25 | '+x.genre+' Beat',
 x=>x.T+' ('+x.A+') '+x.Y+' | Prod. MZPRD',
 x=>'[FREE] '+x.mood+' '+x.A+' - "'+x.T+'" | Free Rap Instrumental',
 x=>'"'+x.T+'" '+x.genre+' Type Beat '+x.Y+' | '+x.mood+' Rap Instrumental ('+(x.bpm||'Prod. MZPRD')+')',
 x=>x.A+' "'+x.T+'" | Buy It And Download Instantly | Prod. MZPRD',
 x=>'['+(x.info||'NEW BEAT')+'] '+x.A+' '+x.Y+' - "'+x.T+'"');
DESCS_B.push(
 x=>x.A+' '+x.Y+' - "'+x.T+'"\n\nBuy it here: '+x.url+'\n\n0:00 '+x.T+(x.info?' ('+x.info+')':'')+'\n\nFollow for new beats every week.\nProd. by MZPRD (Meztheprod)\n'+SITE+'\n\n#typebeat #'+x.gtag+'beat #mzprd',
 x=>'Looking for a '+x.mood.toLowerCase()+' '+x.genre.toLowerCase()+' beat? This one is ready.\n\n'+x.T+(x.info?' | '+x.info:'')+'\nGet it and download instantly: '+x.url+'\n\nHear more and buy from the full catalog: '+SITE+'\n\nProd. by MZPRD (Meztheprod)\n\n#typebeat #rapinstrumental #mzprd',
 x=>x.url+'\n^ Buy / download "'+x.T+'" here\n\n'+x.A+' '+x.Y+(x.info?' | '+x.info:'')+' | '+x.mood+'\nProd. by MZPRD\n\n#typebeat #'+x.gtag+'beat #mzprd',
 x=>'Use this beat for your next song. '+x.A+' '+x.Y+' "'+x.T+'".\n\nBuy it: '+x.url+'\n\nIf you record on it, send it to me and credit "Prod. MZPRD" so I can hear it.\nMore beats: '+SITE+'\n\n#typebeat #rapbeat #mzprd');
TAGS_B.push(
 x=>[x.mood+' '+x.genre+' beat',x.mood+' type beat',x.A,x.A+' '+x.Y,'rap instrumental '+x.Y,x.T,'MZPRD'],
 x=>['instrumental','rap instrumental','hip hop instrumental','beat','rap beat','free beat','type beat '+x.Y,x.T,'MZPRD','Meztheprod'],
 x=>['buy rap beats online','buy type beats','beats for artists','instrumentals for rappers',x.genre+' beats for sale','download beats',x.T,'MZPRD']);
TITLES_P.push(
 x=>'"'+x.T+'" | Vinyl Sample Pack For Producers ('+x.Y+')',
 x=>x.mood+' Sample Pack - '+x.T+' | Loops, Chops & Vinyl Samples',
 x=>'[SAMPLE PACK] '+x.T+' - '+x.genre+' Loops for Beatmakers '+x.Y,
 x=>'Flip These Samples: "'+x.T+'" Sample Pack | Prod. MZPRD');
DESCS_P.push(
 x=>x.T+' - sample pack for beatmakers\n\nGet it: '+x.url+'\n\nUse the loops and chops in your next beat.\nProd. by MZPRD (Meztheprod)\n'+SITE+'\n\n#samplepack #beatmaker #mzprd',
 x=>'Flip these samples. '+x.T+' ('+x.mood+' '+x.genre+')\n\nDownload it here: '+x.url+'\nAll packs and beats: '+SITE+'\n\n#samplepack #vinylsamples #producer',
 x=>x.url+'\n^ Buy "'+x.T+'" here\n\n'+x.mood+' '+x.genre+' sample pack for producers.\nProd. by MZPRD\n\n#samplepack #producerloops #mzprd');
TAGS_P.push(
 x=>['sample pack for beatmakers','beat making samples','loops for producers','chops','vinyl chops',x.T,'MZPRD'],
 x=>['free sample pack preview','vinyl sample pack','dusty samples','boom bap samples',x.genre+' sample pack',x.T,'MZPRD'],
 x=>['buy sample packs','sample packs for sale','producer sounds','drum and sample pack',x.T,'MZPRD','Meztheprod']);
function fitTags(a){const seen=new Set(),out=[];let len=0;for(const t of a.map(x=>String(x||'').trim()).filter(Boolean)){const k=t.toLowerCase();if(seen.has(k))continue;if(len+t.length+(out.length?2:0)>500)break;seen.add(k);out.push(t);len+=t.length+(out.length>1?2:0)}return out.join(', ')}
/* single samples reuse the pack wording, said for one sample */
const smpWords=t=>String(t||'').replace(/sample\s*packs?/gi,m=>/^S/.test(m)?'Sample':'sample').replace(/sample\s*kits?/gi,m=>/^S/.test(m)?'Sample':'sample').replace(/\b(this|the|a) pack\b/gi,'$1 sample').replace(/\bpacks\b/g,'samples').replace(/\bpack\b/g,'sample').replace(/\bPack\b/g,'Sample').replace(/\/pack\//g,'/crate-dig/').replace(/type beat/gi,'sample').replace(/beats and sample/g,'beats and samples');
function ytText(reset){try{ygKeep()}catch(e){}
 const it=S.item;if(!it||!$s('#yT'))return;if(reset===true){yi.t=yi.d=yi.g=0}
 const x=ytCtx(),T=x.isB?TITLES_B:TITLES_P,D=x.isB?DESCS_B:DESCS_P,G=x.isB?TAGS_B:TAGS_P;
 yi.t%=T.length;yi.d%=D.length;yi.g%=G.length;
 const sm=S.kind==='samples'?smpWords:(t=>t);$s('#yT').value=cut(sm(T[yi.t](x)),100);$s('#yD').value=sm(D[yi.d](x)).slice(0,5000);$s('#yG').value=fitTags((g=>Array.isArray(g)?g.map(sm):sm(g))(G[yi.g](x)));
 $s('#yTi').textContent='('+(yi.t+1)+'/'+T.length+')';$s('#yDi').textContent='('+(yi.d+1)+'/'+D.length+')';$s('#yGi').textContent='('+(yi.g+1)+'/'+G.length+')';
 ytCount();const lk=$s('#yLink');if(lk)lk.innerHTML='Link used in the description: <a href="'+e2(x.url)+'" target="_blank" rel="noopener" style="color:#e8b94a">'+e2(x.url)+'</a>';
}
function ytCount(){const t=$s('#yT').value.length,d=$s('#yD').value.length,g=$s('#yG').value.length;
 $s('#yTc').textContent=t+' / 100 characters'+(t>100?' (too long)':'');$s('#yDc').textContent=d+' / 5000 characters';$s('#yGc').textContent=g+' / 500 characters'+(g>500?' (too long)':'')}
function ytNext(k){yi[k]++;ytText()}
const ygKeep=()=>{const it=S.item;if(it!==ygKeep.it){ygKeep.it=it;YG.list=[];YG.open=-1;if($s('#ygN'))ygRender()}};
/* YT STUDIO: the MPC package generator (titles, thumbnail words, description, tags, pinned comment, scored) with a matching thumbnail for every package, made by this studio's thumbnail engine */
const YG_MPC=['mpc','challenge','series'],YG_BAD=/mpc|pad performance|1988|sp-?1200|drum machine|no computer|hardware|on a machine/i;
const YG={n:25,angle:'',seed:1,sort:'score',fav:[],open:-1,list:[]};let ygP=null;
const ygLoad=()=>ygP=ygP||Promise.all([thLoad(),...['mpcyt.js?v=14','mpcgen.js?v=5','mpcpack.js?v=5'].map(f=>new Promise((ok,no)=>{const n=f.split('?')[0];if(document.querySelector('script[data-yg="'+n+'"]'))return ok();const sc=document.createElement('script');sc.src=new URL(f,document.baseURI).href;sc.dataset.yg=n;sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)}))]);
function ygInfo(){const it=S.item;if(!it)return null;const pk=S.kind!=='beats',sl=it.slug||String(it.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 const SS={dur:S.buf?S.buf.duration:120,bpm:+it.bpm||0,key:it.musical_key||'',title:it.title,vibe:''};
 return{beat:it,S:SS,title:it.title,bpm:+it.bpm||0,key:it.musical_key||'',mins:Math.max(1,Math.round(SS.dur/60)),link:SITE+'/'+(pk?'pack':'beat')+'/'+sl+'/',seedBase:String(it.id).length*17+String(it.title).length}}
function ygST(){return{artist:(($s('#yA')||{}).value||'').trim(),yt:{mode:'',v:0,when:''},gen:YG}}
function ygThumb(p,i,w,h){const n=window.MZThumbs.count||12,v=S.kind==='packs'?(i+YG.seed):(i*5+YG.seed*3)%n,X=Object.assign(thCtx(v),{w:window.MZThumbs.words(p.thumb||S.item.title),seed:YG.seed*101+i*17});return window.MZThumbs.make(v,w,h,X)}
const ygCopy=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(e){return false}};
const ygAll=p=>p.title+'\n\nTHUMBNAIL TEXT: '+p.thumb+'\n\nDESCRIPTION\n'+p.desc+'\n\nTAGS\n'+p.tags+'\n\nPINNED COMMENT\n'+p.pin+(p.shorts?'\n\nSHORTS\n'+p.shorts.title+'\n'+p.shorts.desc:'');
function ygRender(){const el=$s('#ygN');if(!el)return;const G=window.MZMpcGen,pk=S.kind!=='beats';
 if(!G){el.innerHTML='<div class="msg">Loading…</div>';ygLoad().then(ygRender,()=>{el.innerHTML='<div class="msg">Could not load the package tools.</div>'});return}
 const opts=Object.entries(G.ANGLES).filter(([k])=>pk||!YG_MPC.includes(k)).map(([k,v])=>`<option value="${k}"${YG.angle===k?' selected':''}>${v.n} only</option>`).join('');
 const view=YG.list.map((p,i)=>[p,i]).filter(([p])=>YG.sort!=='fav'||YG.fav.includes(p.title)).sort((a,b)=>YG.sort==='order'?a[1]-b[1]:b[0].score-a[0].score);
 el.innerHTML=`<div class="msg" style="margin-top:0">Full YouTube packages for <b style="color:#fff">${esc(S.item?S.item.title:'(pick an item)')}</b>, each with its own thumbnail, title, description (link first), tags and pinned comment. Scored, best first. Star your favourites, then test 3 with Test &amp; Compare in YouTube Studio.</div>
 <div class="row"><div><label>HOW MANY</label><select id="ygC">${[10,25,50].map(n=>`<option${YG.n===n?' selected':''}>${n}</option>`).join('')}</select></div><div><label>STYLE</label><select id="ygA"><option value="">All styles mixed</option>${opts}</select></div><div><label>SHOW</label><select id="ygS"><option value="score"${YG.sort==='score'?' selected':''}>Best score first</option><option value="order"${YG.sort==='order'?' selected':''}>Mixed order</option><option value="fav"${YG.sort==='fav'?' selected':''}>My picks (${YG.fav.length})</option></select></div></div>
 <div class="row" style="margin-top:10px"><button class="go" id="ygGo" style="margin:0">GENERATE</button><button class="btn" id="ygMore">NEW BATCH</button></div>
 <div id="ygL" class="ygl${S.fmt==='9:16'?' v9':''}">${view.map(([p,i])=>`<div class="ygc${YG.open===i?' on':''}" data-i="${i}"><div class="ygt" data-th="${i}"></div><div class="ygb"><div class="ygh"><button class="ygs${YG.fav.includes(p.title)?' on':''}" data-fav="${i}" title="Keep">${YG.fav.includes(p.title)?'&#9733;':'&#9734;'}</button><span class="ygsc" style="color:${p.score>=85?'#3ad17a':p.score>=70?'#e8c35a':'#ff8a5c'}">${p.score}</span><small>${esc(p.angleName)}</small></div><b>${esc(p.title)}</b><small>${p.title.length} chars · thumbnail: ${esc(p.thumb)}</small>
  <div class="ygx"><button class="btn" data-ct="${i}">COPY TITLE</button>${S.fmt==='9:16'?`<button class="btn" data-dl9="${i}">THUMBNAIL 9:16</button><button class="btn" data-dl="${i}">THUMBNAIL 16:9</button>`:`<button class="btn" data-dl="${i}">THUMBNAIL 16:9</button><button class="btn" data-dl9="${i}">THUMBNAIL 9:16</button>`}<button class="btn" data-op="${i}">${YG.open===i?'CLOSE':'FULL PACKAGE'}</button></div></div>
  ${YG.open===i?`<div class="ygo"><div class="msg">${esc(p.why)}</div><label>DESCRIPTION</label><textarea rows="9">${esc(p.desc)}</textarea><label>TAGS</label><textarea rows="2">${esc(p.tags)}</textarea><label>PINNED COMMENT</label><textarea rows="2">${esc(p.pin||'')}</textarea><div class="row" style="margin-top:8px"><button class="btn" data-cd="${i}">COPY DESCRIPTION</button><button class="btn" data-cg="${i}">COPY TAGS</button><button class="btn" data-ca="${i}">COPY EVERYTHING</button></div></div>`:''}</div>`).join('')||(YG.list.length?'<div class="msg">No picks yet. Tap a star.</div>':'')}</div>
 <div class="row" style="margin-top:10px"><button class="btn" id="ygTxt">DOWNLOAD ALL AS .TXT</button></div><div class="msg" id="ygM"></div>`;
 const say=t=>{$s('#ygM').textContent=t};
 const run=more=>{const inf=ygInfo();if(!inf){say('Pick a beat or pack first (step 01).');return}YG.seed=more?YG.seed+1:YG.seed;const ST=ygST();
  const only=YG.angle?[YG.angle]:(pk?null:Object.keys(G.ANGLES).filter(k=>!YG_MPC.includes(k)));let L=(pk&&window.MZMpcPack?MZMpcPack.generate(ST,inf,YG.n*3,YG.seed,only,G):G.generate(ST,inf,YG.n*3,YG.seed,only,window.MZMpcYT))||[];
  const clean=t=>String(t||'').split('\n').filter(l=>!YG_BAD.test(l)).join('\n');L=L.filter(p=>!YG_BAD.test(p.title+' '+p.thumb)).map(p=>Object.assign(p,{desc:clean(p.desc),pin:clean(p.pin),tags:String(p.tags||'').split(',').filter(t=>!YG_BAD.test(t)).join(',')}));if(S.kind==='samples')L=L.map(p=>Object.assign(p,{title:smpWords(p.title),thumb:smpWords(p.thumb),desc:smpWords(p.desc),tags:Array.isArray(p.tags)?p.tags.map(smpWords):smpWords(p.tags),pin:smpWords(p.pin)}));YG.list=L.slice(0,YG.n);YG.open=-1;ygRender();$s('#ygM').textContent=YG.list.length+' packages. Best score '+(YG.list.length?Math.max(...YG.list.map(p=>p.score)):0)+'.'};
 $s('#ygGo').onclick=()=>run(false);$s('#ygMore').onclick=()=>run(true);
 $s('#ygC').onchange=e=>{YG.n=+e.target.value};$s('#ygA').onchange=e=>{YG.angle=e.target.value};$s('#ygS').onchange=e=>{YG.sort=e.target.value;ygRender()};
 el.onclick=async e=>{const th=e.target.closest('[data-th]');if(th){const i=+th.dataset.th,cv=S.fmt==='9:16'?ygThumb(YG.list[i],i,1080,1920):ygThumb(YG.list[i],i,1280,720),lb=document.createElement('div');lb.className='yglb';if(S.fmt==='9:16')setTimeout(()=>{const bx=lb.querySelector('.yglbx');if(bx)bx.classList.add('v9')},0);lb.innerHTML='<div class="yglbx"><button class="yglbc" title="Close">×</button><b></b><div class="yglbr"><button class="btn" data-lbdl>DOWNLOAD 16:9</button><button class="btn" data-lbdl9>DOWNLOAD 9:16</button><button class="btn" data-lbct>COPY TITLE</button></div></div>';lb.querySelector('b').textContent=YG.list[i].title;lb.querySelector('.yglbx').insertBefore(cv,lb.querySelector('b'));document.body.appendChild(lb);const close=()=>{lb.remove();removeEventListener('keydown',kd)},kd=ev=>{if(ev.key==='Escape')close()};addEventListener('keydown',kd);lb.onclick=async ev=>{if(ev.target===lb||ev.target.closest('.yglbc'))return close();if(ev.target.closest('[data-lbct]'))return ygCopy(YG.list[i].title);if(ev.target.closest('[data-lbdl]')){if(cv.ready)await cv.ready;cv.toBlob(bl=>{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=(S.item.title||'thumb')+' - thumbnail '+(i+1)+'.png';a.click()})}
  if(ev.target.closest('[data-lbdl9]')){const c9=ygThumb(YG.list[i],i,1080,1920);if(c9.ready)await c9.ready;c9.toBlob(bl=>{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=(S.item.title||'thumb')+' - thumbnail '+(i+1)+' (9x16).png';a.click()})}};return}const b=e.target.closest('button');if(!b)return;const d=b.dataset,P=k=>YG.list[+d[k]];
  if(d.fav){const t=P('fav').title,x=YG.fav.indexOf(t);x>=0?YG.fav.splice(x,1):YG.fav.push(t);ygRender()}
  else if(d.op){YG.open=YG.open===+d.op?-1:+d.op;ygRender()}
  else if(d.ct)say(await ygCopy(P('ct').title)?'Title copied.':'Copy failed.');
  else if(d.cd)say(await ygCopy(P('cd').desc)?'Description copied.':'Copy failed.');
  else if(d.cg)say(await ygCopy(P('cg').tags)?'Tags copied.':'Copy failed.');
  else if(d.ca)say(await ygCopy(ygAll(P('ca')))?'Whole package copied.':'Copy failed.');
  else if(d.dl9){const cv=ygThumb(P('dl9'),+d.dl9,1080,1920);if(cv.ready)await cv.ready;cv.toBlob(bl=>{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=(S.item.title||'thumb')+' - thumbnail '+(+d.dl9+1)+' (9x16).png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)});say('Thumbnail saved (1080x1920, 9:16).')}
  else if(d.dl){const cv=ygThumb(P('dl'),+d.dl,1280,720);if(cv.ready)await cv.ready;cv.toBlob(bl=>{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=(S.item.title||'thumb')+' - thumbnail '+(+d.dl+1)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)});say('Thumbnail saved (1280x720).')}};
 $s('#ygTxt').onclick=()=>{if(!YG.list.length){say('Generate first.');return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([YG.list.map((p,i)=>'=== PACKAGE '+(i+1)+' (score '+p.score+', '+p.angleName+') ===\n'+ygAll(p)).join('\n\n')],{type:'text/plain'}));a.download=(S.item?S.item.title:'beat')+' - YouTube packages.txt';a.click()};
 const slots=[...el.querySelectorAll('[data-th]')];let k=0;const step=()=>{const t0=performance.now();while(k<slots.length&&performance.now()-t0<24){const sl=slots[k++],i=+sl.dataset.th;try{const cv=S.fmt==='9:16'?ygThumb(YG.list[i],i,270,480):ygThumb(YG.list[i],i,480,270);sl.appendChild(cv)}catch(e){}}if(k<slots.length)requestAnimationFrame(step)};requestAnimationFrame(step)}
const TH={seed:0,pf:'16:9',ord:null,page:0,sel:[],rr:{}},TH_N=6,THMODAL=`<div id="thModal" aria-hidden="true"><div class="thbox" role="dialog" aria-label="Thumbnails">
 <button class="thx" id="thClose" aria-label="Close">&times;</button>
 <h4>THUMBNAILS <span id="thCount" style="font:500 10px Montserrat;letter-spacing:.06em;color:#8e8e94"></span></h4>
 <div class="two2"><button class="btn" id="thGo">MAKE 6 THUMBNAILS</button><button class="btn" id="thMore">NEW SET</button></div>
 <div class="seg" style="margin-top:8px"><button data-th="16:9" class="on">PREVIEW 16:9</button><button data-th="9:16">PREVIEW 9:16</button></div>
 <div id="thGrid"></div><div class="msg" id="thMsg">14 looks (16:9) and 8 (9:16), 6 at a time. The type line follows SOUNDS LIKE (artist). Every card downloads in 16:9 (1280x720) and 9:16 (1080x1920).</div>
 <button class="btn" id="thAll" style="display:none;margin-top:8px">DOWNLOAD THIS SET (12 FILES)</button>
</div></div>`;
function thLoad(){return window.MZThumbs?window.MZThumbs.load():new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('thumbs.js?v=27',document.baseURI).href;sc.onload=()=>window.MZThumbs.load().then(ok,no);sc.onerror=()=>no(new Error('thumbs.js'));document.head.appendChild(sc)})}
/* the type line (ARTIST TYPE BEAT) comes from the same SOUNDS LIKE / MOOD boxes the YouTube text uses */
function thCtx(i){const it=S.item||{},Y=S.item?ytCtx():{};return{title:it.title||'',w:window.MZThumbs.words(S.tx.title.text||it.title),cover:S.cover,bpm:it.bpm,key:it.musical_key,kind:S.kind==='samples'?'packs':S.kind,label:S.kind==='samples'?'SINGLE SAMPLE':'',seed:TH.seed+(TH.rr[i]||0)*13,art:Y.art||'',mood:Y.mood||'',genre:Y.genre||''}}
const thSize=f=>f==='16:9'?[1280,720]:[1080,1920];
function thOpen(){const m=$s('#thModal');m.classList.add('on');m.setAttribute('aria-hidden','false');document.addEventListener('keydown',thKey);thMake(false)}
function thShut(){const m=$s('#thModal');if(m){m.classList.remove('on');m.setAttribute('aria-hidden','true')}document.removeEventListener('keydown',thKey)}
function thKey(e){if(e.key!=='Escape')return;const lb=document.getElementById('thLb');if(lb){lb.remove();return}thShut()}
let thBusy=0,thDeb=null;
function thSync(){const m=$s('#thModal');if(!m||!m.classList.contains('on')||!$s('#thGrid').children.length)return;clearTimeout(thDeb);thDeb=setTimeout(()=>thMake(false),250)}
function thDrawCard(i,card){
 const pv=TH.pf==='16:9'?[640,360]:[360,640],T=window.MZThumbs,old=card.querySelector('canvas'),cv=T.make(i,pv[0],pv[1],thCtx(i));cv.onclick=()=>thBig(i);if(old)old.replaceWith(cv);else card.prepend(cv)}
async function thMake(next){
 const m=$s('#thMsg');if(!S.item){m.textContent='Pick a beat or pack first.';return}
 try{await thLoad()}catch(e){m.textContent='Could not load the thumbnail maker.';return}
 const T=window.MZThumbs,id=++thBusy;
 if(next===true||!TH.sel.length){
  if(next===true){TH.seed+=7;TH.rr={}}
  if(!TH.ord){TH.ord=T.order(TH.seed);TH.page=0}else if(next===true){TH.page++;if(TH.page*TH_N>=TH.ord.length){TH.ord=T.order(TH.seed);TH.page=0}}
  TH.sel=TH.ord.slice(TH.page*TH_N,TH.page*TH_N+TH_N);if(TH.sel.length<TH_N)TH.sel=TH.sel.concat(TH.ord.filter(x=>!TH.sel.includes(x)).slice(0,TH_N-TH.sel.length))}
 m.textContent='Making thumbnails...';const g=$s('#thGrid');g.innerHTML='';
 for(const i of TH.sel){
  if(id!==thBusy)return;
  const card=document.createElement('div');card.className='thc';
  const lab=document.createElement('b');lab.textContent=T.names[i]+(T.withChar[i]?' (PRODUCER)':' (TYPE ONLY)');
  const bt=document.createElement('div');bt.className='two2';bt.innerHTML='<button class="btn" data-d="16:9">16:9 JPG</button><button class="btn" data-d="9:16">9:16 JPG</button>';
  const rr=document.createElement('button');rr.className='btn';rr.textContent='NEW LOOK OF THIS STYLE';rr.style.marginTop='6px';rr.style.width='100%';
  bt.querySelectorAll('button').forEach(b=>b.onclick=()=>thDl(i,b.dataset.d));rr.onclick=()=>{TH.rr[i]=(TH.rr[i]||0)+1;thDrawCard(i,card)};
  card.append(lab,bt,rr);g.appendChild(card);thDrawCard(i,card);
  await new Promise(r=>setTimeout(r,0))}
 if(id!==thBusy)return;
 $s('#thAll').style.display='block';const Y=ytCtx();$s('#thCount').textContent='set '+(TH.page+1)+' of '+Math.ceil(TH.ord.length/TH_N);
 m.textContent='Type line: '+T.typeLine({kind:S.kind,art:Y.art,mood:Y.mood,genre:Y.genre})+'. Change SOUNDS LIKE (artist) and it updates here. Click a thumbnail to see it big. NEW SET deals 6 more of the 40 looks.';
}
function thBig(i){
 const [w,h]=thSize(TH.pf),cv=window.MZThumbs.make(i,w,h,thCtx(i)),lb=document.createElement('div');lb.id='thLb';lb.appendChild(cv);lb.onclick=()=>lb.remove();document.body.appendChild(lb);
}
function thDl(i,f){
 return new Promise(res=>{try{const [w,h]=thSize(f),cv=window.MZThumbs.make(i,w,h,thCtx(i));
  Promise.resolve(cv.ready).then(()=>cv.toBlob(b=>{if(!b){$s('#thMsg').textContent='Could not export (the cover blocks it). Re-add the cover image from your computer.';return res()}
   const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=((S.item&&S.item.slug)||'thumb')+'-'+String(window.MZThumbs.names[i]).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+(f==='16:9'?'16x9':'9x16')+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);res()},'image/jpeg',.92))}catch(e){$s('#thMsg').textContent='Could not export: '+e.message;res()}});
}
async function thAll(){for(const i of TH.sel){await thDl(i,'16:9');await new Promise(r=>setTimeout(r,350));await thDl(i,'9:16');await new Promise(r=>setTimeout(r,350))}}
function renderList(){
 const l=$s('#sl'),rows=S.items.filter(i=>i._k===S.kind);
 l.innerHTML=rows.length?rows.map(r=>`<div class="it" data-id="${e2(r.id)}">${r._k==='samples'?`<img src="${e2(BASEPATH+'crate-sleeve.jpg')}" alt="">`:r.cover_path?`<img src="${e2((window.thumbUrl&&thumbUrl(r.cover_path))||pub(r.cover_path))}" alt="" loading="lazy" decoding="async">`:(r._k==='beats'?`<img src="${e2(stockCover(r.title,96))}" alt="">`:'<i></i>')}<div><b>${e2(r.title)}</b><span>${[r.bpm&&r.bpm+' BPM',r.musical_key,r.preview_path?'':'NO PREVIEW'].filter(Boolean).join(' / ')||'&nbsp;'}</span></div></div>`).join(''):'<div class="msg" style="padding:12px">Nothing here yet.</div>';
 l.querySelectorAll('.it').forEach(e=>e.onclick=()=>{stopPlay();setItem(rows.find(r=>String(r.id)===e.dataset.id))});
}
function syncUi(){const p=S.fmt==='9:16',mx=$s('#sMax');if(!mx)return;
 mx.max=p?SHORT_MAX:'';mx.placeholder=p?SHORT_DEF+' (max '+SHORT_MAX+')':(S.buf?'auto ('+Math.round(S.buf.duration)+'s)':'auto');
 $s('#sMaxL').textContent=p?'LENGTH IN SECONDS (SHORTS: 60 DEFAULT, 120 MAX)':'MAX LENGTH IN SECONDS (empty = whole audio)'}
async function loadItems(){
 const [b,p,sm]=await Promise.all([sb.from('beats').select('*').order('created_at',{ascending:false}),sb.from('packs').select('*').order('created_at',{ascending:false}),sb.from('samples').select('*').order('created_at',{ascending:false})]);
 S.items=[...(b.data||[]).map(x=>({...x,_k:'beats'})),...(p.data||[]).map(x=>({...x,_k:'packs'})),...((sm&&sm.data)||[]).map(x=>({...x,_k:'samples'}))];
}
function wire(){
 const q=s=>$s(s);
 document.querySelectorAll('#studio .seg [data-k]').forEach(b=>b.onclick=()=>{S.kind=b.dataset.k;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));renderList()});
 document.querySelectorAll('#studio [data-f]').forEach(b=>{if(b.tagName==='BUTTON')b.onclick=()=>{S.fmt=b.dataset.f;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));try{if(YG.list&&YG.list.length)ygRender()}catch(e){}S.bd=null;stopPlay();syncUi();redraw()}});
 q('#sPre').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.preset=b.dataset.p;if(SCN[S.preset]){scnLoad();scnP.then(()=>redraw())}const d=PRESETS[S.preset];S.grain=d.grain;S.vig=d.vig;q('#sGrain').checked=d.grain;q('#sVig').checked=d.vig;
  [['font','#sFont'],['color','#sCol'],['vis','#sVis'],['visColor','#sVc']].forEach(([k,id])=>{if(d[k]!=null){S[k]=d[k];q(id).value=d[k]}});if(d.glow!=null){S.glow=d.glow;q('#sGlow').checked=d.glow}
  q('#sPre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));redraw()};
 const bind=(id,key,fn)=>{const el=q(id);el.oninput=el.onchange=()=>{S[key]=fn?fn(el):el.value;if(key==='layout')S.bd=null;redraw()}};
 bind('#sLay','layout');bind('#sAnim','anim');bind('#sGrain','grain',e=>e.checked);bind('#sVig','vig',e=>e.checked);
 bind('#sFont','font');bind('#sCol','color');bind('#sStr','stroke',e=>+e.value);bind('#sSize','size',e=>+e.value);
 bind('#sVis','vis');bind('#sVc','visColor');bind('#sVh','visH',e=>+e.value);bind('#sSync','sync',e=>e.checked);bind('#sGlow','glow',e=>e.checked);bind('#sEnd','end',e=>e.checked);bind('#sEndT','endType');
 q('#sMax').oninput=()=>{S.maxLen=q('#sMax').value;redraw()};
 q('#sCov').onchange=e=>{const f=e.target.files[0];if(f)loadCover(URL.createObjectURL(f))};
 document.querySelectorAll('#studio [name=sSrc]').forEach(r=>r.onchange=()=>{S.src=r.value;stopPlay();if(S.src==='preview')loadPreview();else{S.buf=null;setAudM('Choose your audio file below.');if(q('#sAud').files[0])loadFile(q('#sAud').files[0]);else redraw()}});
 q('#sAud').onchange=e=>{const f=e.target.files[0];if(f){document.querySelector('#studio [name=sSrc][value=file]').checked=true;S.src='file';loadFile(f)}};
 const wv=q('#sWave');let drag=false,was=false;
 const seek=e=>{const r=wv.getBoundingClientRect();scrub=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));redraw();drawWave(scrub,0)};
 wv.onpointerdown=e=>{if(run&&run.rec)return;drag=true;was=!!(A&&A.playing);if(was)stopPlay();wv.setPointerCapture(e.pointerId);seek(e)};
 wv.onpointermove=e=>{if(drag)seek(e)};
 wv.onpointerup=wv.onpointercancel=()=>{if(!drag)return;drag=false;if(was)playFrom(scrub)};
 q('#thOpen').onclick=thOpen;const mixGo=async()=>{if(!window.mixOpen)await new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('mix.js?v=59',document.baseURI).href;sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)});await window.mixOpen()};
 q("#mixBtn").onclick=async()=>{try{await mixGo()}catch(e){toast('MIX MAKER FAILED TO LOAD')}};
 /* straight to Inside the Sample: single samples + that format */
 q('#insBtn').onclick=async()=>{try{await mixGo();for(let i=0;i<40&&!document.querySelector('#mxKind');i++)await new Promise(r=>setTimeout(r,100));const k=[...document.querySelectorAll('#mxKind button')].find(b=>/SINGLE/.test(b.textContent));if(k&&!k.classList.contains('on'))k.click();for(let i=0;i<30;i++){const f=document.querySelector('#mxFmt button[data-f=inside]');if(f&&f.offsetParent){f.click();break}await new Promise(r=>setTimeout(r,100))}}catch(e){toast('MIX MAKER FAILED TO LOAD')}};q('#thClose').onclick=thShut;q('#thModal').onclick=e=>{if(e.target.id==='thModal')thShut()};
 q('#thGo').onclick=()=>thMake(true);q('#thMore').onclick=()=>thMake(true);q('#thAll').onclick=thAll;
 document.querySelectorAll('#studio [data-th]').forEach(b=>b.onclick=()=>{TH.pf=b.dataset.th;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));if(window.MZThumbs&&q('#thGrid').children.length)thMake(false)});
 q('#yAll').onclick=()=>{yi.t++;yi.d++;yi.g++;ytText()};
 document.querySelectorAll('#studio [data-n]').forEach(b=>b.onclick=()=>ytNext(b.dataset.n));
 ['#yA','#yM'].forEach(id=>q(id).oninput=()=>{ytText();thSync()});
 ['#yT','#yD','#yG'].forEach(id=>q(id).oninput=ytCount);
 q('#sPlay').onclick=()=>{
  if(run&&run.rec)return;
  if(A&&A.playing){stopPlay();redraw();return}
  if(!S.buf){msg('Add audio first.');return}
  playFrom(scrub)};
 q('#sRender').onclick=render;
 document.querySelectorAll('#studio [data-c]').forEach(b=>b.onclick=async()=>{const el=q('#'+b.dataset.c);el.select();try{await navigator.clipboard.writeText(el.value);toast('COPIED')}catch(e){document.execCommand('copy');toast('COPIED')}});
}
window.studioOpen=async function(){
 css();const root=document.getElementById('studio');root.classList.add('on');
 if(!mounted){root.innerHTML=html()+THMODAL;mounted=true;wire();buildTx();redraw();root.querySelector('#sl').innerHTML='<div class="msg" style="padding:12px">Loading...</div>';
  try{await loadItems()}catch(e){root.querySelector('#sl').innerHTML='<div class="msg" style="padding:12px">Could not load items.</div>';return}
  renderList();const first=S.items.find(i=>i._k===S.kind);if(first)setItem(first)}
};
window.MZEndCard=function(c,W,H,tt,ecd){return endCard(c,W,H,tt,ecd)};
window.studioClose=function(){thShut();if(window.mixClose)mixClose();if(!(run&&run.rec))stopPlay();const r=document.getElementById('studio');if(r)r.classList.remove('on')};
})();
