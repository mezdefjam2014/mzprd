/* MZPRD Video Studio: turns a beat or sample pack (cover + preview or your own full file) into a 16:9 or 9:16 video.
   Loaded on demand by the back office. Everything renders in the browser: a canvas is drawn live and recorded together
   with the audio (MediaRecorder), so the video takes as long to render as the audio plays. Keep this tab visible while rendering. */
(function(){
const SITE='https://mzprd.com';
const PRESETS={clean:{grain:false,vig:true},grunge:{grain:true,vig:true},film:{grain:true,vig:true},animated:{grain:false,vig:true},minimal:{grain:false,vig:false}};
const FONTS={'Impact':'Impact, Haettenschweiler, sans-serif','Montserrat':'Montserrat, sans-serif','Press Start':"'Press Start 2P', monospace",'Serif':'Georgia, serif','Brush':"'Brush Script MT', cursive"};
const VIS=['waveform','bars','circle','none'],ANIM=['zoom','pan','none'];
const S={items:[],kind:'beats',item:null,cover:null,bd:null,fmt:'16:9',layout:'fit',preset:'clean',anim:'zoom',grain:false,vig:true,
 vis:'waveform',visColor:'#e8b94a',visH:80,sync:true,glow:false,font:'Impact',size:100,color:'#e8b94a',stroke:3,maxLen:'',
 buf:null,src:'preview',srcLabel:'',
 tx:{intro:{on:true,text:'NEW BEAT',start:0},tag:{on:true,text:'PROD. BY MEZTHEPROD',start:0},title:{on:true,text:'',start:1},info:{on:true,text:'',start:2}}};
let A=null,run=null,noise=null,scrub=0,mounted=false;
const $s=s=>document.querySelector('#studio '+s);
const e2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dims=()=>S.fmt==='16:9'?[1920,1080]:[1080,1920];
const len=()=>{const d=S.buf?S.buf.duration:30,m=parseFloat(S.maxLen);return m>0?Math.min(d,m):d};

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
#studio .yt textarea{min-height:60px}`;
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
   <label>MAX LENGTH IN SECONDS (empty = whole audio)</label><input type="number" id="sMax" min="5" step="1" placeholder="auto">
  </div>
 </div>
 <div>
  <div class="pn">
   <div class="seg"><button data-f="16:9" class="on">16:9 YOUTUBE</button><button data-f="9:16">9:16 SHORTS</button></div>
   <div class="cvw"><canvas id="sCv"></canvas></div>
   <div class="row" style="margin-top:10px"><button class="btn" id="sPlay">PLAY PREVIEW</button><input type="range" id="sScrub" min="0" max="100" value="0" step="0.1"><span id="sTime" style="flex:none;font:600 11px Montserrat;color:#c9c9ce;min-width:84px;text-align:right">0:00 / 0:00</span></div>
   <h4>TEXT (shows from the second you set)</h4>
   <div id="sTx"></div>
  </div>
  <div class="pn yt" style="margin-top:18px"><h4>YOUTUBE TEXT (copy and paste)</h4>
   <label>TITLE</label><input type="text" id="yT"><button class="btn" data-c="yT" style="margin-top:6px">COPY TITLE</button>
   <label>DESCRIPTION</label><textarea id="yD"></textarea><button class="btn" data-c="yD" style="margin-top:6px">COPY DESCRIPTION</button>
   <label>TAGS</label><textarea id="yG"></textarea><button class="btn" data-c="yG" style="margin-top:6px">COPY TAGS</button>
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
  </div>
  <button class="go" id="sRender">RENDER VIDEO</button>
  <div class="bar"><b id="sProg"></b></div><div class="msg" id="sMsg">Keep this tab open and visible while it renders. A 3 minute beat takes about 3 minutes.</div>
  <a id="sDl" class="btn" style="display:none;text-align:center;margin-top:8px;text-decoration:none">DOWNLOAD VIDEO</a>
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
function audioData(t){
 const out={td:new Uint8Array(1024),fd:new Uint8Array(512),bass:0};
 if(A&&A.playing){A.an.getByteTimeDomainData(out.td);A.an.getByteFrequencyData(out.fd)}
 else{for(let i=0;i<1024;i++)out.td[i]=128+Math.sin(i/26+t*3)*34*Math.sin(i/190+t)+Math.sin(i/7+t*5)*8;
  for(let i=0;i<512;i++)out.fd[i]=Math.max(8,(1-i/512)*190*(.55+.45*Math.sin(i/9+t*4)));}
 let s=0;for(let i=0;i<8;i++)s+=out.fd[i];out.bass=s/8/255;return out;
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
function setPlayBtn(){const b=$s('#sPlay');if(b)b.textContent=(A&&A.playing&&!(run&&run.rec))?'STOP PREVIEW':'PLAY PREVIEW'}
function loop(rec){
 const cv=$s('#sCv');if(!cv)return;const a=A,dur=len();
 const tick=()=>{if(!run)return;const t=a.ctx.currentTime-a.t0;
  frame(cv,Math.min(t,dur),dur);setTime(t,dur);
  if(rec)$s('#sProg').style.width=Math.min(100,t/dur*100)+'%';
  if(t>=dur){run.done&&run.done();return}
  run.raf=requestAnimationFrame(tick)};
 run.raf=requestAnimationFrame(tick);
}
function setTime(t,d){const el=$s('#sTime');if(el)el.textContent=fmt(t)+' / '+fmt(d)}
function redraw(){const cv=$s('#sCv');if(!cv)return;const[w,h]=dims();if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;S.bd=null}
 if(A&&A.playing)return;const d=len(),t=scrub*d;frame(cv,t,d);setTime(t,d)}
function msg(m){const el=$s('#sMsg');if(el)el.textContent=m}
function setAudM(m){const el=$s('#sAudM');if(el)el.textContent=m}

/* ---------- render ---------- */
async function render(){
 if(!S.buf){msg('Add audio first (preview or your own file).');return}
 if(!window.MediaRecorder){msg('This browser cannot record video. Use Chrome or Edge.');return}
 stopPlay();const cv=$s('#sCv'),btn=$s('#sRender'),dl=$s('#sDl');dl.style.display='none';
 const[w,h]=dims();cv.width=w;cv.height=h;S.bd=null;
 await document.fonts.load('40px '+(FONTS[S.font]||'Impact')).catch(()=>{});
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
 buildTx();ytText();loadCover(it.cover_path?pub(it.cover_path):'');
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
 $s('#sTx').oninput=e=>{const t=e.target,k=t.dataset.k;if(!k)return;const f=t.dataset.f;S.tx[k][f]=f==='on'?t.checked:f==='start'?(parseFloat(t.value)||0):t.value;if(f==='text')ytText();redraw()};
}
function ytText(){
 const it=S.item;if(!it||!$s('#yT'))return;const isB=S.kind==='beats',info=[it.bpm&&it.bpm+' BPM',it.musical_key].filter(Boolean).join(' ');
 const url=SITE+'/'+(isB?'beat':'pack')+'/'+(it.slug||'')+'/';
 const tags=(it.tags||'').split(/[\/,]/).map(s=>s.trim()).filter(Boolean);
 $s('#yT').value=(isB?'[FREE] ':'')+(it.title||'')+(isB?' | Hard Type Beat':' | Sample Pack')+(info?' | '+info:'')+' | Prod. MZPRD';
 $s('#yD').value=(isB?'Buy this beat and download it instantly: ':'Get this sample pack: ')+url+'\n\n'+(it.title||'')+(info?' - '+info:'')+'\nProduced by MZPRD (Meztheprod)\n\nMore beats and sample packs: '+SITE+'\n\n#'+(isB?'typebeat #rapbeat':'samplepack #producer')+' #mzprd';
 $s('#yG').value=[...tags,it.title,'MZPRD','Meztheprod',isB?'type beat':'sample pack',isB?'rap beat':'vinyl samples',isB?'hip hop instrumental':'producer loops'].filter(Boolean).join(', ');
}
function renderList(){
 const l=$s('#sl'),rows=S.items.filter(i=>i._k===S.kind);
 l.innerHTML=rows.length?rows.map(r=>`<div class="it" data-id="${e2(r.id)}">${r.cover_path?`<img src="${e2(pub(r.cover_path))}" alt="">`:'<i></i>'}<div><b>${e2(r.title)}</b><span>${[r.bpm&&r.bpm+' BPM',r.musical_key,r.preview_path?'':'NO PREVIEW'].filter(Boolean).join(' / ')||'&nbsp;'}</span></div></div>`).join(''):'<div class="msg" style="padding:12px">Nothing here yet.</div>';
 l.querySelectorAll('.it').forEach(e=>e.onclick=()=>{stopPlay();setItem(rows.find(r=>String(r.id)===e.dataset.id))});
}
function syncUi(){const m=len();$s('#sMax').placeholder=S.buf?'auto ('+Math.round(S.buf.duration)+'s)':'auto'}
async function loadItems(){
 const [b,p]=await Promise.all([sb.from('beats').select('*').order('created_at',{ascending:false}),sb.from('packs').select('*').order('created_at',{ascending:false})]);
 S.items=[...(b.data||[]).map(x=>({...x,_k:'beats'})),...(p.data||[]).map(x=>({...x,_k:'packs'}))];
}
function wire(){
 const q=s=>$s(s);
 document.querySelectorAll('#studio .seg [data-k]').forEach(b=>b.onclick=()=>{S.kind=b.dataset.k;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));renderList()});
 document.querySelectorAll('#studio [data-f]').forEach(b=>{if(b.tagName==='BUTTON')b.onclick=()=>{S.fmt=b.dataset.f;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));S.bd=null;stopPlay();redraw()}});
 q('#sPre').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.preset=b.dataset.p;const d=PRESETS[S.preset];S.grain=d.grain;S.vig=d.vig;q('#sGrain').checked=d.grain;q('#sVig').checked=d.vig;
  q('#sPre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));redraw()};
 const bind=(id,key,fn)=>{const el=q(id);el.oninput=el.onchange=()=>{S[key]=fn?fn(el):el.value;if(key==='layout')S.bd=null;redraw()}};
 bind('#sLay','layout');bind('#sAnim','anim');bind('#sGrain','grain',e=>e.checked);bind('#sVig','vig',e=>e.checked);
 bind('#sFont','font');bind('#sCol','color');bind('#sStr','stroke',e=>+e.value);bind('#sSize','size',e=>+e.value);
 bind('#sVis','vis');bind('#sVc','visColor');bind('#sVh','visH',e=>+e.value);bind('#sSync','sync',e=>e.checked);bind('#sGlow','glow',e=>e.checked);
 q('#sMax').oninput=()=>{S.maxLen=q('#sMax').value;redraw()};
 q('#sCov').onchange=e=>{const f=e.target.files[0];if(f)loadCover(URL.createObjectURL(f))};
 document.querySelectorAll('#studio [name=sSrc]').forEach(r=>r.onchange=()=>{S.src=r.value;stopPlay();if(S.src==='preview')loadPreview();else{S.buf=null;setAudM('Choose your audio file below.');if(q('#sAud').files[0])loadFile(q('#sAud').files[0]);else redraw()}});
 q('#sAud').onchange=e=>{const f=e.target.files[0];if(f){document.querySelector('#studio [name=sSrc][value=file]').checked=true;S.src='file';loadFile(f)}};
 q('#sScrub').oninput=()=>{scrub=q('#sScrub').value/100;if(A&&A.playing&&!(run&&run.rec))stopPlay();redraw()};
 q('#sPlay').onclick=()=>{
  if(run&&run.rec)return;
  if(A&&A.playing){stopPlay();redraw();return}
  if(!S.buf){msg('Add audio first.');return}
  const from=scrub*len();const s=startPlay(true,from);if(!s)return;run={done:()=>{stopPlay();scrub=0;q('#sScrub').value=0;redraw()}};s.onended=()=>{};setPlayBtn();loop(false)};
 q('#sRender').onclick=render;
 document.querySelectorAll('#studio [data-c]').forEach(b=>b.onclick=async()=>{const el=q('#'+b.dataset.c);el.select();try{await navigator.clipboard.writeText(el.value);window.toast('COPIED')}catch(e){document.execCommand('copy');window.toast('COPIED')}});
}
window.studioOpen=async function(){
 css();const root=document.getElementById('studio');root.classList.add('on');
 if(!mounted){root.innerHTML=html();mounted=true;wire();buildTx();redraw();root.querySelector('#sl').innerHTML='<div class="msg" style="padding:12px">Loading...</div>';
  try{await loadItems()}catch(e){root.querySelector('#sl').innerHTML='<div class="msg" style="padding:12px">Could not load items.</div>';return}
  renderList();const first=S.items.find(i=>i._k===S.kind);if(first)setItem(first)}
};
window.studioClose=function(){stopPlay();const r=document.getElementById('studio');if(r)r.classList.remove('on')};
})();
