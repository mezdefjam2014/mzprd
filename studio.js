/* MZPRD Video Studio: turns a beat or sample pack (cover + preview or your own full file) into a 16:9 or 9:16 video.
   Loaded on demand by the back office. Everything renders in the browser: a canvas is drawn live and recorded together
   with the audio (MediaRecorder), so the video takes as long to render as the audio plays. Keep this tab visible while rendering. */
(function(){
const SITE='https://mzprd.com';
const PRESETS={clean:{grain:false,vig:true},grunge:{grain:true,vig:true},film:{grain:true,vig:true},animated:{grain:false,vig:true},minimal:{grain:false,vig:false}};
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
const SHORT_DEF=60,SHORT_MAX=120;
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
   <div class="seg"><button data-k="beats" class="on">BEATS</button><button data-k="packs">PACKS</button></div>
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
   <label class="chk"><input type="checkbox" id="sEnd" checked> 8-BIT SUBSCRIBE CARD AT THE END</label>
  </div>
  <button class="go" id="sRender">RENDER VIDEO</button>
  <div class="bar"><b id="sProg"></b></div><div class="msg" id="sMsg">Keep this tab open and visible while it renders. A 3 minute beat takes about 3 minutes.</div>
  <a id="sDl" class="btn" style="display:none;text-align:center;margin-top:8px;text-decoration:none">DOWNLOAD VIDEO</a>
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
function frame(cv,t,dur){
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
   c.save();c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=60*H/1080;c.shadowOffsetY=18*H/1080;
   const iw=S.cover.naturalWidth,ih=S.cover.naturalHeight,sc=Math.max(s/iw,s/ih),sw=s/sc,sh=s/sc;
   c.beginPath();c.rect(cx-s/2,cy-s/2,s,s);c.fillStyle='#000';c.fill();c.shadowColor='transparent';c.clip();
   c.drawImage(S.cover,(iw-sw)/2,(ih-sh)/2,sw,sh,cx-s/2,cy-s/2,s,s);c.restore();
  }
 }
 effects(c,W,H,t);
 if(S.vig){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.72)');c.fillStyle=g;c.fillRect(0,0,W,H)}
 if(S.grain){if(!noise)noise=mkNoise();c.save();c.globalAlpha=S.preset==='grunge'?.2:.1;c.globalCompositeOperation='overlay';
  const ox=Math.floor(Math.random()*256),oy=Math.floor(Math.random()*256),pt=c.createPattern(noise,'repeat');c.translate(-ox,-oy);c.fillStyle=pt;c.fillRect(0,0,W+256,H+256);c.restore()}
 const k=land?H:W;
 if(land){
  drawVis(c,d,W,H,H*.955,cx,cy,cs/2*1.04);
  drawText(c,'intro',t,W,H,H*.075,H*.06);drawText(c,'title',t,W,H,H*.835,H*.095);drawText(c,'info',t,W,H,H*.905,H*.034);
  drawText(c,'tag',t,W,H,H*.07,H*.026,'right',W*.97);
 }else{
  drawVis(c,d,W,H,H*.93,cx,cy,cs/2*1.04);
  drawText(c,'intro',t,W,H,H*.085,W*.06);drawText(c,'title',t,W,H,H*.74,W*.115);drawText(c,'info',t,W,H,H*.8,W*.04);
  drawText(c,'tag',t,W,H,H*.045,W*.032,'right',W*.96);
 }
 if(S.preset==='film'){c.fillStyle='#000';const b=H*(land?.085:.05);c.fillRect(0,0,W,b);c.fillRect(0,H-b,W,b)}
 const ecd=Math.min(6,dur*.5);if(S.end&&dur&&t>dur-ecd)endCard(c,W,H,t-(dur-ecd),ecd);
}
let ec=null,heroImg=null;
function endCard(c,W,H,tt,ecd){
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
function effects(c,W,H,t){
 const pr=S.preset;
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
async function loadPreview(){
 const it=S.item;S.buf=null;msg('');setAudM('');
 if(!it||!it.preview_path){setAudM('This item has no preview audio. Pick "my full beat file" and choose a file.');redraw();return}
 try{setAudM('Loading preview...');const r=await fetch(pub(it.preview_path));if(!r.ok)throw 0;S.buf=await decode(await r.arrayBuffer());S.srcLabel='preview';setAudM('Preview loaded ('+fmt(S.buf.duration)+').')}
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
const beforeUnload=e=>{if(R.busy){e.preventDefault();e.returnValue=''}};
function loadMuxer(){return window.Mp4Muxer?Promise.resolve():new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('mp4-muxer.js',document.baseURI).href;sc.onload=ok;sc.onerror=()=>no(new Error('muxer'));document.head.appendChild(sc)})}
async function render(){
 if(R.busy)return;if(!S.buf){msg('Add audio first (preview or your own file).');return}
 stopPlay();
 if(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext){
  try{await renderFast();return}catch(e){console.warn('fast render failed',e);OFF=null;R.busy=false;badge();$s('#sRender').disabled=false;document.getElementById('studio').classList.remove('busy');msg('Fast render is not available here ('+((e&&e.message)||e)+'). Using real-time render.')}
 }
 return renderRT();
}
async function renderFast(){
 await loadMuxer();
 const[w,h]=dims(),fps=30,dur=len(),N=Math.ceil(dur*fps),btn=$s('#sRender'),dl=$s('#sDl'),root=document.getElementById('studio');
 const pickV=async()=>{for(const c of [{codec:'avc1.640028',mux:'avc'},{codec:'avc1.4d0028',mux:'avc'},{codec:'avc1.42E028',mux:'avc'},{codec:'vp09.00.40.08',mux:'vp9'}]){const cfg={codec:c.codec,width:w,height:h,bitrate:8e6,framerate:fps};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
 const pickA=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:48000,numberOfChannels:2,bitrate:192000});if(r&&r.supported)return c}catch(e){}}return null};
 const vc=await pickV(),ac=await pickA();if(!vc||!ac)throw new Error('no codec');
 R.busy=true;root.classList.add('busy');btn.disabled=true;dl.style.display='none';badge(0);addEventListener('beforeunload',beforeUnload);
 $s('#sProg').style.width='0';msg('Preparing...');
 await document.fonts.load('40px '+(FONTS[S.font]||'Impact')).catch(()=>{});await document.fonts.load("12px 'Press Start 2P'").catch(()=>{});
 if(!heroImg){heroImg=new Image();heroImg.src=new URL('hero.jpg',document.baseURI).href}try{await heroImg.decode()}catch(e){}
 const oc=new OfflineAudioContext(2,Math.ceil(dur*48000),48000),src=oc.createBufferSource();src.buffer=S.buf;src.connect(oc.destination);src.start(0);const rb=await oc.startRendering();
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
   while(venc.encodeQueueSize>8){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
   if(i%4===0){const p=Math.round(i/N*100);$s('#sProg').style.width=p+'%';badge(p);msg('Rendering '+p+'% ... you can switch tabs, it keeps going.');await yieldNow()}
  }
  OFF=null;await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();
 }finally{OFF=null;try{venc.close()}catch(e){}try{aenc.close()}catch(e){}removeEventListener('beforeunload',beforeUnload)}
 const blob=new Blob([target.buffer],{type:'video/mp4'}),url=URL.createObjectURL(blob);
 dl.href=url;dl.download=((S.item&&S.item.slug)||'video')+'-'+(S.fmt==='16:9'?'16x9':'9x16')+'.mp4';dl.style.display='block';
 R.busy=false;root.classList.remove('busy');btn.disabled=false;badge();$s('#sProg').style.width='100%';
 msg('Done in '+Math.round((performance.now()-t0)/1000)+'s. '+(blob.size/1048576).toFixed(1)+' MB MP4. Click DOWNLOAD VIDEO.');
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
  dl.href=url;dl.download=((S.item&&S.item.slug)||'video')+'-'+(S.fmt==='16:9'?'16x9':'9x16')+'.'+ext;dl.style.display='block';
  btn.disabled=false;msg('Done. '+(blob.size/1048576).toFixed(1)+' MB '+ext.toUpperCase()+'. Click DOWNLOAD VIDEO.');$s('#sProg').style.width='100%';
  stopPlay();redraw();
 };
 const done=()=>{setTimeout(()=>{if(rc.state!=='inactive')rc.stop()},350)};
 rc.start(500);
 const s=startPlay(false,0);if(!s){rc.stop();btn.disabled=false;return}
 run={rec:true,done};setPlayBtn();loop(true);
}

/* ---------- UI ---------- */
function setItem(it){
 S.item=it;S.cover=null;S.bd=null;S.buf=null;
 const isB=S.kind==='beats',info=[];if(it.bpm)info.push(it.bpm+' BPM');if(it.musical_key)info.push(it.musical_key);
 S.tx.title.text=it.title||'';S.tx.info.text=info.length?info.join('  |  '):(isB?'':'SAMPLE PACK');S.tx.intro.text=isB?'NEW BEAT':'NEW SAMPLE PACK';
 buildTx();ytText(true);loadCover(it.cover_path?pub(it.cover_path):'');
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
 $s('#sTx').oninput=e=>{const t=e.target,k=t.dataset.k;if(!k)return;const f=t.dataset.f;S.tx[k][f]=f==='on'?t.checked:f==='start'?(parseFloat(t.value)||0):t.value;if(f==='text'&&k==='title')ytText();redraw()};
}
const YEAR=new Date().getFullYear(),yi={t:0,d:0,g:0};
function ytCtx(){
 const it=S.item,isB=S.kind==='beats',tags=(it.tags||'').split(/[\/,]/).map(x=>x.trim()).filter(Boolean),
  art=(($s('#yA')||{}).value||'').trim(),mood=(($s('#yM')||{}).value||'').trim()||tags[1]||'Hard',genre=tags[0]||'Hip Hop',
  bpm=it.bpm?it.bpm+' BPM':'',key=it.musical_key||'',info=[bpm,key].filter(Boolean).join(' '),
  A=art?art+' Type Beat':mood+' '+genre+' Type Beat';
 return{it,isB,tags,art,mood,genre,bpm,key,info,A,T:it.title||'',url:SITE+'/'+(isB?'beat':'pack')+'/'+(it.slug||String(it.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||it.id)+'/',Y:YEAR,gtag:genre.toLowerCase().replace(/[^a-z0-9]/g,'')};
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
function ytText(reset){
 const it=S.item;if(!it||!$s('#yT'))return;if(reset===true){yi.t=yi.d=yi.g=0}
 const x=ytCtx(),T=x.isB?TITLES_B:TITLES_P,D=x.isB?DESCS_B:DESCS_P,G=x.isB?TAGS_B:TAGS_P;
 yi.t%=T.length;yi.d%=D.length;yi.g%=G.length;
 $s('#yT').value=cut(T[yi.t](x),100);$s('#yD').value=D[yi.d](x).slice(0,5000);$s('#yG').value=fitTags(G[yi.g](x));
 $s('#yTi').textContent='('+(yi.t+1)+'/'+T.length+')';$s('#yDi').textContent='('+(yi.d+1)+'/'+D.length+')';$s('#yGi').textContent='('+(yi.g+1)+'/'+G.length+')';
 ytCount();const lk=$s('#yLink');if(lk)lk.innerHTML='Link used in the description: <a href="'+e2(x.url)+'" target="_blank" rel="noopener" style="color:#e8b94a">'+e2(x.url)+'</a>';
}
function ytCount(){const t=$s('#yT').value.length,d=$s('#yD').value.length,g=$s('#yG').value.length;
 $s('#yTc').textContent=t+' / 100 characters'+(t>100?' (too long)':'');$s('#yDc').textContent=d+' / 5000 characters';$s('#yGc').textContent=g+' / 500 characters'+(g>500?' (too long)':'')}
function ytNext(k){yi[k]++;ytText()}
const TH={seed:0,pf:'16:9'},THMODAL=`<div id="thModal" aria-hidden="true"><div class="thbox" role="dialog" aria-label="Thumbnails">
 <button class="thx" id="thClose" aria-label="Close">&times;</button>
 <h4>THUMBNAILS</h4>
 <div class="two2"><button class="btn" id="thGo">MAKE 5 THUMBNAILS</button><button class="btn" id="thMore">NEW SET</button></div>
 <div class="seg" style="margin-top:8px"><button data-th="16:9" class="on">PREVIEW 16:9</button><button data-th="9:16">PREVIEW 9:16</button></div>
 <div id="thGrid"></div><div class="msg" id="thMsg">Made from the cover, title and BPM. 3 have the producer, 2 do not. Every card downloads in 16:9 (1280x720) and 9:16 (1080x1920).</div>
 <button class="btn" id="thAll" style="display:none;margin-top:8px">DOWNLOAD ALL (10 FILES)</button>
</div></div>`;
function thLoad(){return window.MZThumbs?window.MZThumbs.load():new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('thumbs.js?v=6',document.baseURI).href;sc.onload=()=>window.MZThumbs.load().then(ok,no);sc.onerror=()=>no(new Error('thumbs.js'));document.head.appendChild(sc)})}
function thCtx(){const it=S.item||{};return{title:it.title||'',w:window.MZThumbs.words(S.tx.title.text||it.title),cover:S.cover,bpm:it.bpm,key:it.musical_key,kind:S.kind,seed:TH.seed}}
const thSize=f=>f==='16:9'?[1280,720]:[1080,1920];
function thOpen(){const m=$s('#thModal');m.classList.add('on');m.setAttribute('aria-hidden','false');document.addEventListener('keydown',thKey);if(!$s('#thGrid').children.length)thMake(false)}
function thShut(){const m=$s('#thModal');if(m){m.classList.remove('on');m.setAttribute('aria-hidden','true')}document.removeEventListener('keydown',thKey)}
function thKey(e){if(e.key!=='Escape')return;const lb=document.getElementById('thLb');if(lb){lb.remove();return}thShut()}
async function thMake(bump){
 const m=$s('#thMsg');if(!S.item){m.textContent='Pick a beat or pack first.';return}
 m.textContent='Making thumbnails...';
 try{await thLoad()}catch(e){m.textContent='Could not load the thumbnail maker.';return}
 if(bump)TH.seed+=7;
 const g=$s('#thGrid'),X=thCtx(),pv=TH.pf==='16:9'?[640,360]:[360,640];g.innerHTML='';
 for(let i=0;i<window.MZThumbs.count;i++){
  const card=document.createElement('div');card.className='thc';
  const cv=window.MZThumbs.make(i,pv[0],pv[1],X);cv.onclick=()=>thBig(i);
  const lab=document.createElement('b');lab.textContent=(i+1)+'. '+window.MZThumbs.names[i]+(window.MZThumbs.withChar[i]?' (PRODUCER)':' (NO PRODUCER)');
  const bt=document.createElement('div');bt.className='two2';bt.innerHTML='<button class="btn" data-d="16:9">16:9 JPG</button><button class="btn" data-d="9:16">9:16 JPG</button>';
  bt.querySelectorAll('button').forEach(b=>b.onclick=()=>thDl(i,b.dataset.d));
  card.append(cv,lab,bt);g.appendChild(card)}
 $s('#thAll').style.display='block';m.textContent='Click a thumbnail to see it big. Tap NEW SET for 5 more looks.';
}
function thBig(i){
 const [w,h]=thSize(TH.pf),cv=window.MZThumbs.make(i,w,h,thCtx()),lb=document.createElement('div');lb.id='thLb';lb.appendChild(cv);lb.onclick=()=>lb.remove();document.body.appendChild(lb);
}
function thDl(i,f){
 return new Promise(res=>{try{const [w,h]=thSize(f),cv=window.MZThumbs.make(i,w,h,thCtx());
  cv.toBlob(b=>{if(!b){$s('#thMsg').textContent='Could not export (the cover blocks it). Re-add the cover image from your computer.';return res()}
   const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=((S.item&&S.item.slug)||'thumb')+'-thumb'+(i+1)+'-'+(f==='16:9'?'16x9':'9x16')+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);res()},'image/jpeg',.92)}catch(e){$s('#thMsg').textContent='Could not export: '+e.message;res()}});
}
async function thAll(){for(let i=0;i<window.MZThumbs.count;i++){await thDl(i,'16:9');await new Promise(r=>setTimeout(r,350));await thDl(i,'9:16');await new Promise(r=>setTimeout(r,350))}}
function renderList(){
 const l=$s('#sl'),rows=S.items.filter(i=>i._k===S.kind);
 l.innerHTML=rows.length?rows.map(r=>`<div class="it" data-id="${e2(r.id)}">${r.cover_path?`<img src="${e2(pub(r.cover_path))}" alt="">`:'<i></i>'}<div><b>${e2(r.title)}</b><span>${[r.bpm&&r.bpm+' BPM',r.musical_key,r.preview_path?'':'NO PREVIEW'].filter(Boolean).join(' / ')||'&nbsp;'}</span></div></div>`).join(''):'<div class="msg" style="padding:12px">Nothing here yet.</div>';
 l.querySelectorAll('.it').forEach(e=>e.onclick=()=>{stopPlay();setItem(rows.find(r=>String(r.id)===e.dataset.id))});
}
function syncUi(){const p=S.fmt==='9:16',mx=$s('#sMax');if(!mx)return;
 mx.max=p?SHORT_MAX:'';mx.placeholder=p?SHORT_DEF+' (max '+SHORT_MAX+')':(S.buf?'auto ('+Math.round(S.buf.duration)+'s)':'auto');
 $s('#sMaxL').textContent=p?'LENGTH IN SECONDS (SHORTS: 60 DEFAULT, 120 MAX)':'MAX LENGTH IN SECONDS (empty = whole audio)'}
async function loadItems(){
 const [b,p]=await Promise.all([sb.from('beats').select('*').order('created_at',{ascending:false}),sb.from('packs').select('*').order('created_at',{ascending:false})]);
 S.items=[...(b.data||[]).map(x=>({...x,_k:'beats'})),...(p.data||[]).map(x=>({...x,_k:'packs'}))];
}
function wire(){
 const q=s=>$s(s);
 document.querySelectorAll('#studio .seg [data-k]').forEach(b=>b.onclick=()=>{S.kind=b.dataset.k;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));renderList()});
 document.querySelectorAll('#studio [data-f]').forEach(b=>{if(b.tagName==='BUTTON')b.onclick=()=>{S.fmt=b.dataset.f;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));S.bd=null;stopPlay();syncUi();redraw()}});
 q('#sPre').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.preset=b.dataset.p;const d=PRESETS[S.preset];S.grain=d.grain;S.vig=d.vig;q('#sGrain').checked=d.grain;q('#sVig').checked=d.vig;
  q('#sPre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));redraw()};
 const bind=(id,key,fn)=>{const el=q(id);el.oninput=el.onchange=()=>{S[key]=fn?fn(el):el.value;if(key==='layout')S.bd=null;redraw()}};
 bind('#sLay','layout');bind('#sAnim','anim');bind('#sGrain','grain',e=>e.checked);bind('#sVig','vig',e=>e.checked);
 bind('#sFont','font');bind('#sCol','color');bind('#sStr','stroke',e=>+e.value);bind('#sSize','size',e=>+e.value);
 bind('#sVis','vis');bind('#sVc','visColor');bind('#sVh','visH',e=>+e.value);bind('#sSync','sync',e=>e.checked);bind('#sGlow','glow',e=>e.checked);bind('#sEnd','end',e=>e.checked);
 q('#sMax').oninput=()=>{S.maxLen=q('#sMax').value;redraw()};
 q('#sCov').onchange=e=>{const f=e.target.files[0];if(f)loadCover(URL.createObjectURL(f))};
 document.querySelectorAll('#studio [name=sSrc]').forEach(r=>r.onchange=()=>{S.src=r.value;stopPlay();if(S.src==='preview')loadPreview();else{S.buf=null;setAudM('Choose your audio file below.');if(q('#sAud').files[0])loadFile(q('#sAud').files[0]);else redraw()}});
 q('#sAud').onchange=e=>{const f=e.target.files[0];if(f){document.querySelector('#studio [name=sSrc][value=file]').checked=true;S.src='file';loadFile(f)}};
 const wv=q('#sWave');let drag=false,was=false;
 const seek=e=>{const r=wv.getBoundingClientRect();scrub=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));redraw();drawWave(scrub,0)};
 wv.onpointerdown=e=>{if(run&&run.rec)return;drag=true;was=!!(A&&A.playing);if(was)stopPlay();wv.setPointerCapture(e.pointerId);seek(e)};
 wv.onpointermove=e=>{if(drag)seek(e)};
 wv.onpointerup=wv.onpointercancel=()=>{if(!drag)return;drag=false;if(was)playFrom(scrub)};
 q('#thOpen').onclick=thOpen;q("#mixBtn").onclick=async()=>{try{if(!window.mixOpen)await new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('mix.js?v=2',document.baseURI).href;sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)});await window.mixOpen()}catch(e){toast('MIX MAKER FAILED TO LOAD')}};q('#thClose').onclick=thShut;q('#thModal').onclick=e=>{if(e.target.id==='thModal')thShut()};
 q('#thGo').onclick=()=>thMake(false);q('#thMore').onclick=()=>thMake(true);q('#thAll').onclick=thAll;
 document.querySelectorAll('#studio [data-th]').forEach(b=>b.onclick=()=>{TH.pf=b.dataset.th;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));if(window.MZThumbs&&q('#thGrid').children.length)thMake(false)});
 q('#yAll').onclick=()=>{yi.t++;yi.d++;yi.g++;ytText()};
 document.querySelectorAll('#studio [data-n]').forEach(b=>b.onclick=()=>ytNext(b.dataset.n));
 ['#yA','#yM'].forEach(id=>q(id).oninput=()=>ytText());
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
