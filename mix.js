/* MZPRD Mix Video maker (pop-out window opened from the Video Studio).
   Pick beats in order, choose a style, get premade thumbnails and YouTube text with chapters, and render one long 16:9 video
   (target 10-15 minutes) from the public previews. Rendering is offline and fast (WebCodecs + mp4-muxer), not real time. */
(function(){
const SITE='https://mzprd.com',YEAR=new Date().getFullYear(),SR=48000,FPS=24,W=1280,H=720;
const ST={
 clean:{n:'CLEAN',acc:'#e8b94a',tint:'rgba(0,0,0,.5)',font:'Anton',grain:.08,vis:'bars'},
 neon:{n:'NEON',acc:'#35e0ff',acc2:'#ff3df2',tint:'rgba(25,0,70,.55)',font:'Anton',grain:.05,vis:'wave',grid:1,bloom:.5},
 lofi:{n:'LO-FI TAPE',acc:'#ffb067',tint:'rgba(70,35,10,.5)',font:"'Bebas Neue'",grain:.24,vis:'bars',warm:1,stamp:1},
 bit:{n:'8-BIT',acc:'#ffd34a',tint:'rgba(10,0,28,.62)',font:"'Press Start 2P'",grain:0,vis:'chunk',scan:1,pix:1},
 min:{n:'MINIMAL',acc:'#ffffff',tint:'rgba(0,0,0,.72)',font:'Oswald',grain:.05,vis:'line',center:1}
};
const M={beats:[],sel:[],dur:{},cov:{},style:'clean',fade:1.5,repeat:false,char:true,outro:true,title:'Hard Rap Beats Mix',seed:0,yt:0,busy:false,pf:null};
let box=null,ac=null,noise=null,hero=null,bdc={};
const $m=s=>box.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const slugOf=b=>b.slug||String(b.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||b.id;
const ctxA=()=>ac||(ac=new (window.AudioContext||window.webkitAudioContext)());

/* ---------- playlist ---------- */
function playlist(){
 let L=M.sel.map(id=>M.beats.find(b=>String(b.id)===String(id))).filter(Boolean);
 if(M.repeat&&L.length){const base=L.slice(),dur=b=>M.dur[b.id]||180;let t=L.reduce((s,b)=>s+dur(b),0),i=0;while(t<600&&L.length<60){const b=base[i++%base.length];L.push(b);t+=dur(b)}}
 return L;
}
function layout(){let t=0;return playlist().map(b=>{const d=M.dur[b.id]||0,o={b,start:t,dur:d};t+=d;return o})}
const total=()=>layout().reduce((s,o)=>s+o.dur,0);

/* ---------- drawing ---------- */
function fitPx(c,str,font,maxW,maxPx){c.font='100px '+font;const w=c.measureText(str).width||1;return Math.min(maxPx,100*maxW/w)}
function coverFit(c,img,x,y,w,h){const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function blurBd(id){
 if(bdc[id])return bdc[id];const im=M.cov[id];if(!im||!im.naturalWidth)return null;
 const s=document.createElement('canvas');s.width=320;s.height=180;const x=s.getContext('2d');x.filter='blur(6px) saturate(1.3)';coverFit(x,im,-12,-12,344,204);bdc[id]=s;return s;
}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}}
const prevFd=new Float32Array(512);
function dataAt(L,t){
 const N=2048,c=Math.floor(t*SR),re=new Float64Array(N),im=new Float64Array(N),td=new Uint8Array(1024),fd=new Uint8Array(512);
 for(let i=0;i<N;i++){const j=c+i-N,v=(j>=0&&j<L.length)?L[j]:0;re[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));if(i>=N-1024)td[i-(N-1024)]=Math.max(0,Math.min(255,Math.round(128+v*128)))}
 fft(re,im);
 for(let i=0;i<512;i++){const m=Math.sqrt(re[i]*re[i]+im[i]*im[i])/N*2;prevFd[i]=prevFd[i]*.7+m*.3;fd[i]=Math.max(0,Math.min(255,Math.round((20*Math.log10(Math.max(prevFd[i],1e-9))+100)/70*255)))}
 let s=0;for(let i=0;i<8;i++)s+=fd[i];return{td,fd,bass:s/8/255};
}
function fakeData(t){const td=new Uint8Array(1024),fd=new Uint8Array(512);for(let i=0;i<1024;i++)td[i]=128+Math.sin(i/26+t*3)*34*Math.sin(i/190+t)+Math.sin(i/7+t*5)*8;for(let i=0;i<512;i++)fd[i]=Math.max(8,(1-i/512)*190*(.55+.45*Math.sin(i/9+t*4)));let s=0;for(let i=0;i<8;i++)s+=fd[i];return{td,fd,bass:s/8/255}}
function drawVis(c,st,d,x0,x1,base,ph){
 c.save();c.strokeStyle=c.fillStyle=st.acc;c.lineCap='round';c.lineJoin='round';
 if(st.vis==='wave'||st.vis==='line'){c.lineWidth=st.vis==='line'?2:4;if(st.vis==='wave'){c.shadowColor=st.acc;c.shadowBlur=14}c.beginPath();for(let i=0;i<1024;i+=3){const x=x0+(x1-x0)*i/1024,y=base+(d.td[i]-128)/128*ph;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 else{const n=st.vis==='chunk'?32:72,w=(x1-x0)/n;for(let i=0;i<n;i++){let h=d.fd[Math.floor(Math.pow(i/n,1.6)*300)]/255*ph*1.7+3;if(st.vis==='chunk')h=Math.round(h/12)*12+6;c.fillRect(x0+i*w+w*.15,base-h/2,w*(st.vis==='chunk'?.78:.68),h)}}
 c.restore();
}
function charDraw(c,x,y,w,t,bass){
 if(!hero||!hero.naturalWidth)return;const SRC={x:520,y:0,w:620,h:468},h=w*SRC.h/SRC.w,o=document.createElement('canvas');o.width=SRC.w;o.height=SRC.h;const g=o.getContext('2d');
 g.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);g.globalCompositeOperation='destination-in';const rg=g.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.26,SRC.w*.52,SRC.h*.55,SRC.h*.76);rg.addColorStop(0,'#000');rg.addColorStop(.7,'#000');rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,SRC.w,SRC.h);
 c.drawImage(o,x,y+bass*H*.012,w,h);
}
function mixFrame(c,st,L,k,tl,tg,tot,d,opts){
 const u=H/720,cur=L[k],id=cur.b.id,pulse=1+d.bass*.025;
 c.fillStyle='#050507';c.fillRect(0,0,W,H);
 const bd=blurBd(id);if(bd){c.drawImage(bd,0,0,W,H);const f=M.fade;if(k>0&&tl<f){const pb=blurBd(L[k-1].b.id);if(pb){c.globalAlpha=1-tl/f;c.drawImage(pb,0,0,W,H);c.globalAlpha=1}}}
 c.fillStyle=st.tint;c.fillRect(0,0,W,H);
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,.7)');c.fillStyle=g;c.fillRect(0,0,W,H);
 if(st.grid){c.save();c.strokeStyle=st.acc2;c.globalAlpha=.35;c.lineWidth=1.5;const hy=H*.72;for(let i=-14;i<=14;i++){c.beginPath();c.moveTo(W/2+i*40,hy);c.lineTo(W/2+i*190,H);c.stroke()}for(let q=1;q<8;q++){const y=hy+(H-hy)*Math.pow(q/8,1.8);c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}c.restore()}
 const font=st.font,center=st.center,cs=center?H*.5:H*.56,cx=center?(W-cs)/2:W*.06,cy=center?H*.14:H*.2;
 const im=M.cov[id];
 c.save();c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=36*u;c.shadowOffsetY=12*u;c.fillStyle='#000';c.translate(cx+cs/2,cy+cs/2);c.scale(pulse,pulse);c.fillRect(-cs/2,-cs/2,cs,cs);c.shadowColor='transparent';
 if(im&&im.naturalWidth){if(st.pix){const px=document.createElement('canvas');px.width=px.height=56;px.getContext('2d').drawImage(im,0,0,56,56);c.imageSmoothingEnabled=false;c.drawImage(px,-cs/2,-cs/2,cs,cs);c.imageSmoothingEnabled=true}else{c.beginPath();c.rect(-cs/2,-cs/2,cs,cs);c.clip();coverFit(c,im,-cs/2,-cs/2,cs,cs)}}
 c.restore();c.lineWidth=2*u;c.strokeStyle=st.acc;c.globalAlpha=.9;c.strokeRect(cx-8*u,cy-8*u,cs+16*u,cs+16*u);c.globalAlpha=1;
 const tx=center?W/2:W*.52,tw=center?W*.8:W*.42,al=center?'center':'left';
 c.textBaseline='top';c.textAlign=al;
 /* header: mix title */
 let px=fitPx(c,M.title.toUpperCase(),font,center?W*.7:W*.46,center?44*u:40*u);c.font=px+'px '+font;c.fillStyle='rgba(255,255,255,.92)';c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=10;c.fillText(M.title.toUpperCase(),center?W/2:W*.06,H*.055);c.shadowColor='transparent';
 c.font='600 '+16*u+'px Oswald';if('letterSpacing' in c)c.letterSpacing='5px';c.fillStyle=st.acc;c.textAlign=center?'center':'left';c.fillText('MZPRD  •  '+L.length+' BEATS',center?W/2:W*.06,H*.055+px*1.15);
 /* now playing */
 c.textAlign=al;const ny=center?cy+cs+H*.04:H*.2;
 c.font='600 '+15*u+'px Oswald';c.fillStyle=st.acc;c.fillText('NOW PLAYING  '+String(k+1).padStart(2,'0')+' / '+String(L.length).padStart(2,'0'),tx,ny);
 if('letterSpacing' in c)c.letterSpacing='0px';
 const tt=cur.b.title.toUpperCase();px=fitPx(c,tt,font,tw,center?50*u:58*u);c.font=px+'px '+font;c.fillStyle='#fff';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=14;c.fillText(tt,tx,ny+22*u);c.shadowColor='transparent';
 const meta=[cur.b.bpm&&cur.b.bpm+' BPM',cur.b.musical_key].filter(Boolean).join('   •   ');
 if(meta){c.font='600 '+17*u+'px Oswald';if('letterSpacing' in c)c.letterSpacing='3px';c.fillStyle='#ffd34a';c.fillText(meta,tx,ny+22*u+px*1.1);if('letterSpacing' in c)c.letterSpacing='0px'}
 /* tracklist */
 if(!center){const R=6,rh=H*.07,ly=H*.46,start=Math.max(0,Math.min(k-2,L.length-R));
  for(let r=0;r<R&&start+r<L.length;r++){const i=start+r,y=ly+r*rh,on=i===k;
   c.fillStyle=on?'rgba(255,255,255,.08)':'rgba(255,255,255,0)';c.fillRect(W*.52,y,W*.42,rh-4*u);if(on){c.fillStyle=st.acc;c.fillRect(W*.52,y,4*u,rh-4*u)}
   c.font=(on?'700 ':'500 ')+19*u+'px Oswald';c.textAlign='left';c.fillStyle=on?'#fff':'rgba(255,255,255,.55)';c.fillText(String(i+1).padStart(2,'0')+'   '+L[i].b.title.toUpperCase(),W*.535,y+rh*.2);
   c.textAlign='right';c.font='500 '+16*u+'px Oswald';c.fillText(fmt(L[i].dur),W*.935,y+rh*.24)}}
 /* visualizer + progress */
 drawVis(c,st,d,W*.06,W*.94,H*.9,H*.05*(st.vis==='line'?1.6:1));
 c.fillStyle='rgba(255,255,255,.18)';c.fillRect(W*.06,H*.965,W*.88,3*u);c.fillStyle=st.acc;c.fillRect(W*.06,H*.965,W*.88*Math.min(1,tg/tot),3*u);
 c.font='500 '+14*u+'px Oswald';c.textAlign='left';c.fillStyle='rgba(255,255,255,.7)';c.fillText(fmt(tg),W*.06,H*.935);c.textAlign='right';c.fillText(fmt(tot),W*.94,H*.935);
 if(M.char&&!center)charDraw(c,W*.77,H*.015,W*.2,tg,d.bass);
 if(st.stamp){c.font='600 '+16*u+'px Oswald';c.textAlign='right';c.fillStyle='#ff4040';c.fillText('● REC  '+fmt(tg),W*.96,H*.935-0)}
 /* finishing */
 if(st.scan){c.fillStyle='rgba(0,0,0,.22)';for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1.5)}
 const vg=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H);
 if(st.grain){if(!noise){noise=document.createElement('canvas');noise.width=noise.height=192;const nx=noise.getContext('2d'),dd=nx.createImageData(192,192);for(let i=0;i<dd.data.length;i+=4){const v=Math.random()*255;dd.data[i]=dd.data[i+1]=dd.data[i+2]=v;dd.data[i+3]=255}nx.putImageData(dd,0,0)}
  c.save();c.globalCompositeOperation='overlay';c.globalAlpha=st.grain;c.translate(-Math.random()*192,-Math.random()*192);c.fillStyle=c.createPattern(noise,'repeat');c.fillRect(0,0,W+192,H+192);c.restore()}
 if(opts&&opts.outro&&window.MZEndCard){const ecd=6,e=tg-(tot-ecd);if(e>=0&&k===L.length-1)window.MZEndCard(c,W,H,e,ecd)}
}

/* ---------- audio ---------- */
async function fetchBuf(b){const r=await fetch(pub(b.preview_path));if(!r.ok)throw new Error('audio');return await ctxA().decodeAudioData(await r.arrayBuffer())}
async function track48(b){
 const src=await fetchBuf(b),n=Math.ceil(src.duration*SR),oc=new OfflineAudioContext(2,n,SR),s=oc.createBufferSource();s.buffer=src;s.connect(oc.destination);s.start(0);
 const rb=await oc.startRendering();return{L:rb.getChannelData(0),R:rb.getChannelData(1),dur:src.duration};
}
async function loadCover(b){
 if(M.cov[b.id])return;
 await new Promise(r=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{M.cov[b.id]=im;r()};im.onerror=r;im.src=b.cover_path?pub(b.cover_path):stockCover(b.title,1024)});
}
async function probe(b){
 if(M.dur[b.id]!=null)return;M.dur[b.id]=0;
 try{const s=await fetchBuf(b);M.dur[b.id]=s.duration}catch(e){M.dur[b.id]=0}
 await loadCover(b);ui();
}

/* ---------- ui ---------- */
function css(){
 if(document.getElementById('mxCss'))return;const s=document.createElement('style');s.id='mxCss';
 s.textContent=`#mixModal{display:none;position:fixed;inset:0;z-index:85;background:rgba(0,0,0,.84);align-items:center;justify-content:center;padding:16px}
#mixModal.on{display:flex}
#mixModal .mb{position:relative;width:min(1180px,100%);max-height:94vh;overflow:auto;background:#0c0c0f;border:1.5px solid var(--red);box-shadow:0 0 50px rgba(224,36,47,.3);padding:20px}
#mixModal .mx{position:absolute;top:8px;right:10px;width:40px;height:40px;background:transparent;border:1.5px solid #4a4a50;color:#fff;font:400 26px/1 Montserrat;padding:0}
#mixModal .mx:hover{border-color:var(--red);color:var(--red)}
#mixModal h3{font:700 13px Montserrat;letter-spacing:.3em;color:var(--gold);margin:0 0 12px}
#mixModal h4{font:700 11px Montserrat;letter-spacing:.28em;color:var(--gold);margin:16px 0 8px}
#mixModal h4:first-child{margin-top:0}
#mixModal .mg{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr) minmax(250px,320px);gap:16px;align-items:start}
@media(max-width:1000px){#mixModal .mg{grid-template-columns:1fr}}
#mixModal .pn{background:#08080a;border:1px solid #2a2a2e;padding:12px}
#mixModal label{display:block;font:600 10px Montserrat;letter-spacing:.2em;color:#8e8e94;margin:10px 0 5px}
#mixModal input[type=text],#mixModal input[type=number],#mixModal textarea,#mixModal select{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 13px Montserrat}
#mixModal textarea{min-height:80px;resize:vertical}
#mixModal .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.16em;padding:10px 6px}
#mixModal .btn:hover{border-color:#fff}#mixModal .btn.on{background:var(--red);border-color:var(--red)}
#mixModal .go{display:block;width:100%;background:var(--red);border:0;color:#fff;font:700 13px Montserrat;letter-spacing:.3em;padding:15px;margin-top:12px}
#mixModal .go:disabled{opacity:.45}
#mixModal .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#mixModal .row{display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #1d1d21;font:600 11px Montserrat;color:#d9d9dc}
#mixModal .row img,#mixModal .row i{width:34px;height:34px;object-fit:cover;background:#1b1b20;flex:none}
#mixModal .row b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mixModal .row button{background:transparent;border:1px solid #4a4a50;color:#fff;font:700 11px Montserrat;padding:4px 8px}
#mixModal .lst{max-height:210px;overflow:auto;border:1px solid #2a2a2e}
#mixModal canvas#mxPv{width:100%;height:auto;display:block;border:1px solid #2a2a2e;background:#000}
#mixModal .st{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0}
#mixModal .st button{padding:9px 2px;font-size:9px;letter-spacing:.08em}
#mixModal .chk{display:flex;gap:8px;align-items:center;letter-spacing:.08em;margin:7px 0}#mixModal .chk input{width:auto}
#mixModal .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}
#mixModal .bar{height:6px;background:#1b1b20;margin-top:8px}#mixModal .bar b{display:block;height:100%;width:0;background:var(--red)}
#mixModal #mxTh{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#mixModal .thc{background:#050506;border:1px solid #2a2a2e;padding:4px}#mixModal .thc canvas{width:100%;height:auto;display:block;cursor:zoom-in}
#mixModal .thc b{display:block;font:700 8px Montserrat;letter-spacing:.12em;color:#c9c9ce;margin:3px 0}
#mixModal .thc .two button{padding:6px 2px;font-size:8px}`;
 document.head.appendChild(s);
}
function build(){
 css();box=document.createElement('div');box.id='mixModal';box.setAttribute('aria-hidden','true');
 box.innerHTML=`<div class="mb" role="dialog" aria-label="Mix video"><button class="mx" id="mxX" aria-label="Close">&times;</button>
 <h3>MIX VIDEO (10 TO 15 MINUTES)</h3>
 <div class="mg">
  <div><div class="pn"><h4>1. PICK YOUR BEATS</h4><div class="lst" id="mxAll"></div>
   <h4>YOUR MIX (IN ORDER)</h4><div class="lst" id="mxSel"></div><div class="msg" id="mxTot"></div></div></div>
  <div><div class="pn"><h4>2. STYLE</h4><div class="st" id="mxSt"></div>
   <canvas id="mxPv" width="640" height="360"></canvas>
   <label>MIX TITLE</label><input type="text" id="mxTitle">
   <div class="two"><div><label>FADE BETWEEN BEATS (SEC)</label><input type="number" id="mxFade" min="0" max="4" step="0.5"></div><div><label>&nbsp;</label><button class="btn" id="mxPrev">REFRESH PREVIEW</button></div></div>
   <label class="chk"><input type="checkbox" id="mxRep"> REPEAT THE LIST TO REACH 10 MINUTES</label>
   <label class="chk"><input type="checkbox" id="mxChar" checked> SHOW THE PRODUCER</label>
   <label class="chk"><input type="checkbox" id="mxOut" checked> 8-BIT SUBSCRIBE CARD AT THE END</label>
   <button class="go" id="mxRender">RENDER MIX VIDEO</button><div class="bar"><b id="mxProg"></b></div><div class="msg" id="mxMsg">Renders offline (faster than real time). A 15 minute mix is a large file, close other heavy tabs first.</div>
   <a id="mxDl" class="btn" style="display:none;text-align:center;margin-top:8px;text-decoration:none">DOWNLOAD MIX VIDEO</a></div></div>
  <div><div class="pn"><h4>3. PREMADE THUMBNAILS</h4><div class="two"><button class="btn" id="mxThGo">MAKE 5</button><button class="btn" id="mxThNew">NEW SET</button></div><div id="mxTh" style="margin-top:6px"></div>
   <h4>4. YOUTUBE TEXT</h4><label>TITLE <span id="mxTi" style="color:#6c6c73"></span></label><input type="text" id="mxYt"><div class="two" style="margin-top:6px"><button class="btn" id="mxYc">COPY</button><button class="btn" id="mxYn">NEXT TITLE</button></div>
   <label>DESCRIPTION WITH CHAPTERS AND LINKS</label><textarea id="mxYd" style="min-height:150px"></textarea><button class="btn" id="mxYdc" style="width:100%;margin-top:6px">COPY DESCRIPTION</button>
   <label>TAGS</label><textarea id="mxYg"></textarea><button class="btn" id="mxYgc" style="width:100%;margin-top:6px">COPY TAGS</button></div></div>
 </div></div>`;
 document.body.appendChild(box);
 $m('#mxX').onclick=shut;box.onclick=e=>{if(e.target===box)shut()};
 $m('#mxSt').innerHTML=Object.keys(ST).map(k=>`<button class="btn${k===M.style?' on':''}" data-s="${k}">${ST[k].n}</button>`).join('');
 $m('#mxSt').onclick=e=>{const b=e.target.closest('button');if(!b)return;M.style=b.dataset.s;$m('#mxSt').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));preview()};
 $m('#mxTitle').value=M.title;$m('#mxFade').value=M.fade;
 $m('#mxTitle').oninput=e=>{M.title=e.target.value||'Beat Mix';preview();yt()};
 $m('#mxFade').oninput=e=>{M.fade=Math.max(0,Math.min(4,parseFloat(e.target.value)||0))};
 $m('#mxRep').onchange=e=>{M.repeat=e.target.checked;ui()};$m('#mxChar').onchange=e=>{M.char=e.target.checked;preview()};$m('#mxOut').onchange=e=>{M.outro=e.target.checked};
 $m('#mxPrev').onclick=preview;$m('#mxRender').onclick=render;
 $m('#mxThGo').onclick=()=>thumbs(false);$m('#mxThNew').onclick=()=>thumbs(true);
 $m('#mxYn').onclick=()=>{M.yt++;yt()};
 const cp=async(id,btn)=>{try{await navigator.clipboard.writeText($m(id).value);toast('COPIED')}catch(e){$m(id).select();document.execCommand('copy')}};
 $m('#mxYc').onclick=()=>cp('#mxYt');$m('#mxYdc').onclick=()=>cp('#mxYd');$m('#mxYgc').onclick=()=>cp('#mxYg');
}
function shut(){box.classList.remove('on');box.setAttribute('aria-hidden','true');document.removeEventListener('keydown',key)}
function key(e){if(e.key!=='Escape')return;const lb=document.getElementById('thLb');if(lb){lb.remove();return}shut()}
function ui(){
 const all=$m('#mxAll'),sel=$m('#mxSel');
 all.innerHTML=M.beats.length?M.beats.map(b=>{const on=M.sel.includes(String(b.id));return`<div class="row" data-id="${esc(b.id)}">${b.cover_path?`<img src="${esc(pub(b.cover_path))}" alt="">`:`<img src="${esc(stockCover(b.title,96))}" alt="">`}<b>${esc(b.title)}${b.preview_path?'':' (no preview)'}</b><button data-a="${on?'rm':'add'}"${b.preview_path?'':' disabled'}>${on?'✓':'+'}</button></div>`}).join(''):'<div class="msg" style="padding:10px">No beats yet.</div>';
 all.querySelectorAll('button').forEach(bt=>bt.onclick=()=>{const id=bt.parentNode.dataset.id;if(bt.dataset.a==='add'){M.sel.push(id);const b=M.beats.find(x=>String(x.id)===id);probe(b)}else M.sel=M.sel.filter(x=>x!==id);ui();preview();thumbsAuto();yt()});
 sel.innerHTML=M.sel.length?M.sel.map((id,i)=>{const b=M.beats.find(x=>String(x.id)===id);return`<div class="row" data-i="${i}"><span style="width:18px;color:#8e8e94">${i+1}</span><b>${esc(b.title)}</b><span style="color:#8e8e94">${M.dur[b.id]?fmt(M.dur[b.id]):'...'}</span><button data-m="-1">↑</button><button data-m="1">↓</button><button data-m="x">×</button></div>`}).join(''):'<div class="msg" style="padding:10px">Tap + to add beats.</div>';
 sel.querySelectorAll('button').forEach(bt=>bt.onclick=()=>{const i=+bt.parentNode.dataset.i,m=bt.dataset.m;if(m==='x')M.sel.splice(i,1);else{const j=i+ +m;if(j<0||j>=M.sel.length)return;[M.sel[i],M.sel[j]]=[M.sel[j],M.sel[i]]}ui();preview();yt()});
 const t=total(),n=playlist().length;
 const tl=$m('#mxTot');tl.textContent=n?n+' track'+(n>1?'s':'')+' / '+fmt(t)+(t<600?'  (under 10 min: add beats or tick REPEAT)':t>900?'  (over 15 min)':'  (good length)'):'';
 tl.style.color=n&&t>=600&&t<=900?'#6fd08c':'#a9a9ae';
}
function preview(){
 if(!box)return;const L=layout(),cv=$m('#mxPv'),c=cv.getContext('2d');
 if(!L.length){c.fillStyle='#000';c.fillRect(0,0,640,360);c.fillStyle='#8e8e94';c.font='14px Montserrat';c.textAlign='center';c.fillText('Pick beats to preview the style',320,180);return}
 const k=Math.min(1,L.length-1),big=document.createElement('canvas');big.width=W;big.height=H;
 const Ld=L.map(o=>({...o,dur:o.dur||180}));mixFrame(big.getContext('2d'),ST[M.style],Ld,k,12,Ld[0].dur+12,Math.max(600,total()),fakeData(1.2),{outro:false});
 c.drawImage(big,0,0,640,360);
}
/* ---------- thumbnails + text ---------- */
async function thLoad(){if(!window.MZThumbs){await new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('thumbs.js?v=6',document.baseURI).href;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}await window.MZThumbs.load();hero=hero||(await new Promise(r=>{const i=new Image();i.src=new URL('hero.jpg',document.baseURI).href;i.onload=()=>r(i);i.onerror=()=>r(null)}))}
function thCtx(){const L=playlist(),first=L[0]||M.beats[0],t=total();return{title:M.title,w:MZThumbs.words(M.title),cover:first&&M.cov[first.id],kind:'beats',tagText:'BEAT MIX',infoText:L.length+(L.length>1?' BEATS':' BEAT')+'   •   '+Math.max(1,Math.round(t/60))+' MIN',seed:M.seed}}
let thT=0;function thumbsAuto(){if($m('#mxTh').children.length){clearTimeout(thT);thT=setTimeout(()=>thumbs(false),500)}}
async function thumbs(bump){
 await thLoad();if(bump)M.seed+=7;const g=$m('#mxTh'),X=thCtx();g.innerHTML='';
 for(let i=0;i<MZThumbs.count;i++){const card=document.createElement('div');card.className='thc';const cv=MZThumbs.make(i,640,360,X);cv.onclick=()=>{const lb=document.createElement('div');lb.id='thLb';lb.style.cssText='position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';const big=MZThumbs.make(i,1280,720,thCtx());big.style.cssText='max-width:92vw;max-height:92vh';lb.appendChild(big);lb.onclick=()=>lb.remove();document.body.appendChild(lb)};
  const lab=document.createElement('b');lab.textContent=(i+1)+'. '+MZThumbs.names[i];const bt=document.createElement('div');bt.className='two';bt.innerHTML='<button class="btn">16:9 JPG</button><button class="btn">9:16 JPG</button>';
  bt.querySelectorAll('button').forEach((b,j)=>b.onclick=()=>{const [w,h]=j?[1080,1920]:[1280,720],c2=MZThumbs.make(i,w,h,thCtx());c2.toBlob(bl=>{if(!bl)return;const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='mix-thumb'+(i+1)+(j?'-9x16':'-16x9')+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)},'image/jpeg',.92)});
  card.append(cv,lab,bt);g.appendChild(card)}
}
const TT=[
 n=>'[FREE] Hard Rap Beats Mix '+YEAR+' | '+n+(n>1?' Beats':' Beat')+' | Prod. MZPRD',
 n=>M.title+' ('+n+(n>1?' Beats':' Beat')+') | Rap Instrumentals Mix '+YEAR,
 n=>'1 Hour? No. '+Math.round(total()/60)+' Minutes Of Heat | '+M.title+' | Prod. MZPRD',
 n=>M.title+' - Type Beat Mix | '+n+(n>1?' Rap Instrumentals':' Rap Instrumental')+' | MZPRD',
 n=>'Best Rap Beats '+YEAR+' | '+M.title+' | Hip Hop Instrumental Mix'
];
function yt(){
 if(!box)return;const L=layout(),n=L.length;if(!n){$m('#mxYt').value='';$m('#mxYd').value='';$m('#mxYg').value='';return}
 $m('#mxYt').value=TT[M.yt%TT.length](n).slice(0,100);$m('#mxTi').textContent='('+(M.yt%TT.length+1)+'/'+TT.length+')';
 const ch=L.map((o,i)=>fmt(o.start)+' '+o.b.title+(o.b.bpm?' ('+o.b.bpm+' BPM'+(o.b.musical_key?' '+o.b.musical_key:'')+')':'')).join('\n');
 const links=[...new Map(L.map(o=>[o.b.id,o.b])).values()].map(b=>b.title+': '+SITE+'/beat/'+slugOf(b)+'/').join('\n');
 $m('#mxYd').value=M.title+' | '+n+(n>1?' beats':' beat')+' by MZPRD (Meztheprod)\n\nTRACKLIST\n'+ch+'\n\nBUY OR DOWNLOAD ANY BEAT\n'+links+'\n\nAll beats and sample packs: '+SITE+'\n\nSubscribe for new beats every week.\n\n#typebeat #rapbeats #beatmix #mzprd';
 const tg=[...new Set(L.flatMap(o=>(o.b.tags||'').split(/[\/,]/).map(x=>x.trim()).filter(Boolean)))];
 const all=['beat mix','rap beats mix','type beat mix','hip hop instrumentals','rap instrumentals','free beats',...tg,'MZPRD','Meztheprod',...L.map(o=>o.b.title)];let out=[],len=0;for(const t of [...new Set(all)]){if(len+t.length+2>500)break;out.push(t);len+=t.length+2}
 $m('#mxYg').value=out.join(', ');
}
/* ---------- render ---------- */
const mcx=new MessageChannel(),ysq=[];mcx.port1.onmessage=()=>{const f=ysq.shift();if(f)f()};const yieldNow=()=>new Promise(r=>{ysq.push(r);mcx.port2.postMessage(0)});
function loadMuxer(){return window.Mp4Muxer?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('mp4-muxer.js',document.baseURI).href;s.onload=ok;s.onerror=()=>no(new Error('muxer'));document.head.appendChild(s)})}
function badge(p){const b=document.querySelector('.bh [data-t=video]');if(b)b.textContent=p==null?'VIDEO STUDIO':'VIDEO STUDIO '+p+'%'}
const beforeUnload=e=>{if(M.busy){e.preventDefault();e.returnValue=''}};
async function render(){
 if(M.busy)return;const msg=t=>$m('#mxMsg').textContent=t,btn=$m('#mxRender'),dl=$m('#mxDl');
 if(!playlist().length){msg('Pick at least one beat first.');return}
 if(!(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext)){msg('This browser cannot render long videos. Use Chrome or Edge.');return}
 M.busy=true;btn.disabled=true;dl.style.display='none';badge(0);addEventListener('beforeunload',beforeUnload);
 let err=null,venc,aenc;
 try{
  await loadMuxer();await thLoad();await Promise.all(M.sel.map(id=>{const b=M.beats.find(x=>String(x.id)===id);return loadCover(b)}));
  await document.fonts.load("40px "+ST[M.style].font).catch(()=>{});
  const st=ST[M.style],list=playlist();
  if(M.outro&&window.MZEndCard){try{const tc=document.createElement('canvas');tc.width=W;tc.height=H;window.MZEndCard(tc.getContext('2d'),W,H,0,6)}catch(e){}await new Promise(r=>setTimeout(r,700))}
  const pick=async()=>{for(const c of [{codec:'avc1.4d001f',mux:'avc'},{codec:'avc1.42E01f',mux:'avc'},{codec:'vp09.00.31.08',mux:'vp9'}]){const cfg={codec:c.codec,width:W,height:H,bitrate:3e6,framerate:FPS};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
  const pa=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:SR,numberOfChannels:2,bitrate:160000});if(r&&r.supported)return c}catch(e){}}return null};
  const vc=await pick(),acf=await pa();if(!vc||!acf)throw new Error('no codec available');
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:W,height:H},audio:{codec:acf.mux,numberOfChannels:2,sampleRate:SR},fastStart:'in-memory'});
  venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);
  aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:acf.codec,sampleRate:SR,numberOfChannels:2,bitrate:160000});
  /* real durations first (cheap: already probed), then render track by track */
  const tot=list.reduce((s,b)=>s+(M.dur[b.id]||180),0);let gUs=0,done=0;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  const Lyt=[];let acc=0;for(const b of list){const d=M.dur[b.id]||180;Lyt.push({b,start:acc,dur:d});acc+=d}
  const t0=performance.now();
  for(let k=0;k<list.length;k++){
   msg('Preparing track '+(k+1)+' of '+list.length+'...');
   const tr=await track48(list[k]),nf=Math.floor(tr.dur*FPS),n=Math.floor(nf/FPS*SR),fade=Math.floor(M.fade*SR);Lyt[k].dur=nf/FPS;
   for(let i=0;i<n;i++){let g=1;if(fade){if(i<fade)g=i/fade;else if(n-i<fade)g=(n-i)/fade}tr.L[i]*=g;tr.R[i]*=g}
   const CH=4800;for(let o=0;o<n;o+=CH){const m=Math.min(CH,n-o),b=new Float32Array(m*2);b.set(tr.L.subarray(o,o+m),0);b.set(tr.R.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:SR,numberOfFrames:m,numberOfChannels:2,timestamp:gUs+Math.round(o/SR*1e6),data:b});aenc.encode(ad);ad.close();if((o/CH)%30===0)await yieldNow()}
   const mono=new Float32Array(n);for(let i=0;i<n;i++)mono[i]=(tr.L[i]+tr.R[i])*.5;
   prevFd.fill(0);let lastStart=Lyt.slice(0,k).reduce((s,o)=>s+o.dur,0);
   for(let f=0;f<nf;f++){
    if(err)throw err;const tl=f/FPS,tg=lastStart+tl;
    mixFrame(c,st,Lyt.map((o,i)=>i<=k?o:{...o}),k,tl,tg,tot,dataAt(mono,tl),{outro:M.outro});
    const vf=new VideoFrame(cv,{timestamp:gUs+Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:(done+f)%120===0});vf.close();
    while(venc.encodeQueueSize>8){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
    if(f%6===0){const p=Math.min(99,Math.round((done+f)/Math.max(1,tot*FPS)*100));$m('#mxProg').style.width=p+'%';badge(p);msg('Rendering track '+(k+1)+' of '+list.length+' ('+p+'%). You can close this window or switch tabs, it keeps going.');await yieldNow()}
   }
   gUs+=Math.round(nf*1e6/FPS);done+=nf;
  }
  await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();
  const blob=new Blob([target.buffer],{type:'video/mp4'});dl.href=URL.createObjectURL(blob);dl.download='mzprd-beat-mix.mp4';dl.style.display='block';$m('#mxProg').style.width='100%';
  msg('Done in '+Math.round((performance.now()-t0)/1000)+'s. '+(blob.size/1048576).toFixed(0)+' MB MP4, '+fmt(done/FPS)+' long. Click DOWNLOAD MIX VIDEO.');try{toast('MIX VIDEO READY')}catch(e){}
 }catch(e){console.warn(e);msg('Render failed: '+((e&&e.message)||e))}
 finally{try{venc&&venc.close()}catch(e){}try{aenc&&aenc.close()}catch(e){}M.busy=false;btn.disabled=false;badge();removeEventListener('beforeunload',beforeUnload)}
}
window.mixOpen=async function(){
 if(!box){if(!M.beats.length){try{const r=await sb.from('beats').select('*').order('created_at',{ascending:false});M.beats=r.data||[]}catch(e){}}
  try{await thLoad()}catch(e){}build();M.beats.forEach(b=>loadCover(b))}
 box.classList.add('on');box.setAttribute('aria-hidden','false');document.addEventListener('keydown',key);ui();setTimeout(()=>{preview();yt()},300);
};
window.mixClose=function(){if(box)shut()};
})();
