/* MZPRD Show engine: a pixel-art concert (stage, lights, crowd, the producer tapping the beat) that plays live in the browser
   from a tiny script, or renders to a video file. Reactive: the producer taps on the real drum hits found in each beat,
   the crowd follows the loudness of the music (settles when a beat fades, erupts when the next one lands).
   Shared by the SHOW page, the back office Show Maker preview, and the video renderer. */
(function(){
'use strict';
const W=1092,H=790;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const fmt=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};

/* ---------- script ---------- */
const PRESETS={
 intro:{n:'INTRO',hue:[215,265],int:.45,fog:.55,flash:0,laser:0,cam:'push'},
 build:{n:'BUILD',hue:[270,325],int:.72,fog:.6,flash:.25,laser:.35,cam:'cut'},
 drop:{n:'DROP',hue:[8,40],int:1,fog:.85,flash:1,laser:1,cam:'cut2'},
 breakdown:{n:'BREAKDOWN',hue:[175,215],int:.32,fog:.7,flash:0,laser:0,cam:'dj'},
 finale:{n:'FINALE',hue:[110,48],int:1,fog:.75,flash:.7,laser:.85,cam:'wide'}
};
const THEMES={city:'CITY NIGHT',neon:'NEON NIGHT',ice:'ICE',ember:'EMBER'};
function defaultScript(len){
 len=len||300;const k=len/300,sg=(n,a,b)=>({name:PRESETS[n].n,preset:n,start:Math.round(a*k),end:Math.round(b*k)});
 return{v:2,len,theme:'city',title:'Weekly Show',tracks:[],dir:{on:true,amount:1,off:{}},
  segments:[sg('intro',0,30),sg('build',30,90),sg('drop',90,180),sg('breakdown',180,240),sg('finale',240,300)],
  fx:{lights:true,fog:true,lasers:true,flash:true,fireworks:true,intensity:.85,cuts:'dynamic',crowd:'high',crowdSound:true},
  milestones:[{at:250,fx:'lights',label:'LIGHTS UP'},{at:500,fx:'lasers',label:'LASERS'},{at:1000,fx:'fireworks',label:'FIREWORKS'},{at:2000,fx:'special',label:'SPECIAL EFFECT'}]};
}
function segAt(s,t){const L=s.segments;for(let i=0;i<L.length;i++)if(t>=L[i].start&&t<L[i].end)return{seg:L[i],i,p:(t-L[i].start)/Math.max(1,L[i].end-L[i].start)};const l=L[L.length-1];return{seg:l,i:L.length-1,p:1}}
function trackAt(s,t){for(let i=0;i<s.tracks.length;i++){const k=s.tracks[i];if(t>=k.start&&t<k.end)return i}return -1}

/* ---------- FFT + beat analysis (finds the real kick / snare / hat hits in a beat) ---------- */
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}}
async function analyze(buf){
 const ch=buf.getChannelData(0),sr=buf.sampleRate,N=1024,hop=512,F=Math.max(0,Math.floor((ch.length-N)/hop));
 const re=new Float64Array(N),im=new Float64Array(N),win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
 const b=[[Math.ceil(30*N/sr),Math.floor(150*N/sr)],[Math.ceil(150*N/sr),Math.floor(2500*N/sr)],[Math.ceil(2500*N/sr),Math.floor(9000*N/sr)]];
 const fl=[new Float32Array(F),new Float32Array(F),new Float32Array(F)],prev=[0,0,0],lo=new Float32Array(F);
 for(let f=0;f<F;f++){
  const o=f*hop;for(let i=0;i<N;i++){re[i]=ch[o+i]*win[i];im[i]=0}fft(re,im);
  for(let q=0;q<3;q++){let s=0;for(let k=b[q][0];k<=b[q][1];k++)s+=Math.sqrt(re[k]*re[k]+im[k]*im[k]);fl[q][f]=Math.max(0,s-prev[q]);prev[q]=s;if(q===0)lo[f]=s}
  if(f%250===0)await new Promise(r=>setTimeout(r,0));
 }
 const gap=[.13,.1,.075],kind=['kick','snare','hat'],hits=[],fps=sr/hop;
 for(let q=0;q<3;q++){
  const a=fl[q],W2=Math.round(fps*1.2);let last=-1;
  for(let f=2;f<F-2;f++){
   if(!(a[f]>a[f-1]&&a[f]>=a[f+1]))continue;
   let m=0,s=0,n=0;for(let k=Math.max(0,f-W2);k<Math.min(F,f+W2);k++){m+=a[k];n++}m/=n;for(let k=Math.max(0,f-W2);k<Math.min(F,f+W2);k++)s+=(a[k]-m)*(a[k]-m);s=Math.sqrt(s/n);
   const th=m+(q===0?1.0:q===1?1.1:1.3)*s;if(a[f]<th||a[f]<1e-6)continue;
   const t=(f*hop+N/2)/sr;if(last>=0&&t-last<gap[q])continue;last=t;
   hits.push({t,type:kind[q],s:clamp((a[f]-th)/(s*3+1e-6)+.45,.35,1)});
  }
 }
 hits.sort((x,y)=>x.t-y.t);
 /* bpm from kick spacing */
 const ks=hits.filter(h=>h.type==='kick').map(h=>h.t),iv=[];for(let i=1;i<ks.length;i++){const d=ks[i]-ks[i-1];if(d>.25&&d<1.6)iv.push(d)}
 iv.sort((x,y)=>x-y);let bpm=0;if(iv.length){let d=iv[Math.floor(iv.length/2)];bpm=60/d;while(bpm<70)bpm*=2;while(bpm>180)bpm/=2}
 return{hits,bpm:Math.round(bpm),dur:buf.duration};
}
/* hits of every track laid onto the show timeline (loops included) */
function hitTimeline(script,data){
 const out=[],XF=1;
 script.tracks.forEach((tr,i)=>{const d=data[i];if(!d||!d.hits.length)return;const D=d.dur,step=Math.max(2,D-XF);
  for(let L=0;tr.start+L*step<tr.end;L++){const base=tr.start+L*step;for(const h of d.hits){const t=base+h.t;if(t>=tr.end-.05)break;if(L>0&&h.t<0)continue;out.push({t,type:h.type,s:h.s,track:i})}}});
 out.sort((a,b)=>a.t-b.t);return out;
}

/* ---------- audio: one scheduler for live playback AND offline video rendering ---------- */
function curve(n,f){const a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=f(i);return a}
function freqAt(s,T){const q=segAt(s,T),p=q.seg.preset,e=q.seg;
 if(p==='intro')return 700*Math.pow(16000/700,clamp((T-e.start)/Math.max(1,e.end-e.start-.5),0,1));
 if(p==='breakdown'){const a=clamp((T-e.start)/.5,0,1),b=clamp((T-(e.end-.5))/.5,0,1);return Math.exp(lerp(Math.log(18000),Math.log(900),a)*(1-b)+Math.log(18000)*b)}
 return 18000}
function gainAt(s,T){const q=segAt(s,T),p=q.seg.preset;if(p==='intro')return .8;if(p==='build')return lerp(.85,1,q.p);if(p==='breakdown')return .72;return 1}
let _noise=null;
function noiseBuf(ctx){if(_noise&&_noise.sampleRate===ctx.sampleRate)return _noise;const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;_noise=b;return b}
/* schedules the show audio from time `from` to `until` (seconds of show time). t0 = ctx time that matches `from`.
   returns {stop()}. bufs[i] is the decoded AudioBuffer of script.tracks[i]. */
/* real crowd recordings (CC0, bigsoundbank.com): cheers, applause and the closing roar. Loaded once, shared by live play and video render */
let _sfx=null,_sfxP=null;
function loadSfx(){if(_sfxP)return _sfxP;const dc=new OfflineAudioContext(2,1,48000),base=u=>new URL(u,document.baseURI).href,
 ld=u=>fetch(base('sfx/'+u+'.mp3?v=2')).then(r=>r.arrayBuffer()).then(b=>dc.decodeAudioData(b)).catch(()=>null);
 _sfxP=Promise.all(['crowd-cheer1','crowd-cheer2','crowd-roar','crowd-applause'].map(ld)).then(([c1,c2,roar,app])=>{_sfx={cheers:[c1,c2].filter(Boolean),roar,app};return _sfx});return _sfxP}
function schedule(ctx,dest,script,bufs,from,until,o){
 o=o||{};const t0=o.t0||0,srcs=[],C=T=>t0+(T-from);
 const bus=ctx.createGain(),lp=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor();lp.type='lowpass';lp.Q.value=.7;
 comp.threshold.value=-10;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.2;
 const dip=ctx.createGain(),FX=window.MZShowFX;bus.connect(lp);lp.connect(dip);dip.connect(comp);comp.connect(dest);
 if(FX)FX.audioDips(script).forEach(d=>{if(d.b<=from||d.a>=until)return;const a=Math.max(d.a,from),T1=C(a);dip.gain.setValueAtTime(1,Math.max(0,T1));dip.gain.linearRampToValueAtTime(.02,T1+.05);dip.gain.setValueAtTime(.02,Math.max(0,C(d.b)-.03));dip.gain.setValueAtTime(1,C(d.b))});
 const dur=until-from,STEP=.25,n=Math.max(2,Math.ceil(dur/STEP)+1);
 try{lp.frequency.setValueCurveAtTime(curve(n,i=>freqAt(script,from+i*STEP)),t0,Math.max(.01,(n-1)*STEP));bus.gain.setValueCurveAtTime(curve(n,i=>gainAt(script,from+i*STEP)),t0,Math.max(.01,(n-1)*STEP))}catch(e){lp.frequency.value=18000}
 /* the show ends with a long fade */
 const endFade=script.len-4;if(until>endFade){const m=ctx.createGain();bus.disconnect();bus.connect(m);m.connect(lp);m.gain.setValueAtTime(1,C(Math.max(from,endFade)));m.gain.linearRampToValueAtTime(0,C(script.len))}
 const XF=1;
 script.tracks.forEach((tr,i)=>{
  const buf=bufs[i];if(!buf||tr.end<=from||tr.start>=until)return;
  const tg=ctx.createGain();tg.connect(bus);
  const a0=Math.max(from,tr.start),a1=Math.min(until,tr.end),fi=tr.fadeIn==null?1.5:tr.fadeIn,fo=tr.fadeOut==null?4:tr.fadeOut,m=Math.max(2,Math.ceil((a1-a0)/.1)+1);
  try{tg.gain.setValueCurveAtTime(curve(m,k=>{const T=a0+k*.1;return clamp((T-tr.start)/Math.max(.05,fi),0,1)*clamp((tr.end-T)/Math.max(.05,fo),0,1)}),C(a0),Math.max(.01,(m-1)*.1))}catch(e){}
  const D=buf.duration,step=Math.max(2,D-XF);
  let L=Math.max(0,Math.floor((a0-tr.start)/step));
  for(;tr.start+L*step<a1;L++){
   const cs=tr.start+L*step,ce=Math.min(cs+D,tr.end),s=Math.max(cs,a0),e=Math.min(ce,a1);if(e<=s)continue;
   const src=ctx.createBufferSource();src.buffer=buf;const cg=ctx.createGain();src.connect(cg);cg.connect(tg);
   const hasNext=cs+step<tr.end&&ce>=cs+D-.01;
   if(L>0&&s<=cs+XF){cg.gain.setValueAtTime(0,C(Math.max(s,cs)));cg.gain.linearRampToValueAtTime(1,C(cs+XF))}
   if(hasNext&&e>cs+D-XF){cg.gain.setValueAtTime(1,C(Math.max(s,cs+D-XF)));cg.gain.linearRampToValueAtTime(0,C(cs+D))}
   src.start(Math.max(0,C(s)),s-cs,e-s);srcs.push(src);
  }
 });
 /* impacts and risers on the segments */
 const segsFx=script.segments.slice();if(FX&&FX.coldEnd(script)>0)segsFx.push({preset:'drop',start:FX.coldEnd(script),end:FX.coldEnd(script)});
 segsFx.forEach(sg=>{
  if(sg.preset==='drop'&&sg.start>=from&&sg.start<until){
   const T=C(sg.start),o1=ctx.createOscillator(),g=ctx.createGain();o1.type='sine';o1.frequency.setValueAtTime(75,T);o1.frequency.exponentialRampToValueAtTime(28,T+.9);g.gain.setValueAtTime(.0001,T);g.gain.exponentialRampToValueAtTime(.85,T+.02);g.gain.exponentialRampToValueAtTime(.0001,T+1.1);o1.connect(g);g.connect(comp);o1.start(T);o1.stop(T+1.2);srcs.push(o1);
   const nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);const ng=ctx.createGain(),nf=ctx.createBiquadFilter();nf.type='lowpass';nf.frequency.value=3000;ng.gain.setValueAtTime(.5,T);ng.gain.exponentialRampToValueAtTime(.0001,T+.7);nz.connect(nf);nf.connect(ng);ng.connect(comp);nz.start(T,0,.8);srcs.push(nz)}
  if(sg.preset==='build'){const rs=Math.max(sg.start,sg.end-8);if(rs>=from&&rs<until){const T=C(rs),nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);nz.loop=true;const bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.Q.value=1.2;bp.frequency.setValueAtTime(300,T);bp.frequency.exponentialRampToValueAtTime(9000,C(sg.end));g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(.2,C(sg.end));g.gain.linearRampToValueAtTime(0,C(sg.end)+.05);nz.connect(bp);bp.connect(g);g.connect(comp);nz.start(T);nz.stop(C(sg.end)+.1);srcs.push(nz)}}
 });
 /* the crowd: a cheer when a beat starts, applause when it fades, a roar at the end */
 if(script.fx.crowdSound!==false){
  const cbus=ctx.createGain();cbus.gain.value=.45;cbus.connect(dest);
  const rec=(buf,T0,len,peak,fin,off)=>{if(!buf||T0+len<=from||T0>=until)return true;const s0=Math.max(T0,from),o0=(off||0)+(s0-T0);if(o0>=buf.duration)return true;const src=ctx.createBufferSource();src.buffer=buf;const g=ctx.createGain(),T=C(s0),e=C(Math.min(T0+len,T0+buf.duration-(off||0)));
   src.playbackRate.value=.94+Math.random()*.12;g.gain.setValueAtTime(s0>T0?peak:.0001,T);if(s0<=T0)g.gain.linearRampToValueAtTime(peak,T+fin);g.gain.setValueAtTime(peak,Math.max(T+fin,e-Math.min(1.5,len*.4)));g.gain.linearRampToValueAtTime(.0001,e);
   src.connect(g);g.connect(cbus);src.start(T,o0);src.stop(e+.05);srcs.push(src);return true};
  const cheer=(T0,len,peak)=>{if(_sfx&&_sfx.cheers.length){const b=_sfx.cheers[Math.floor(Math.random()*_sfx.cheers.length)];return rec(b,T0,Math.min(len+1.5,b.duration),peak*1.5,.15)}if(T0<from-len||T0>=until)return;const T=Math.max(C(T0),C(from)),nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);nz.loop=true;const bp=ctx.createBiquadFilter(),bp2=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.frequency.value=1100;bp.Q.value=.8;bp2.type='bandpass';bp2.frequency.value=2300;bp2.Q.value=.6;
   g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(peak,T+Math.min(.5,len*.2));g.gain.exponentialRampToValueAtTime(.0001,T+len);nz.connect(bp);bp.connect(bp2);bp2.connect(g);g.connect(cbus);nz.start(T,Math.random());nz.stop(T+len+.1);srcs.push(nz)};
  const clap=(T0,T1,dens)=>{if(_sfx&&_sfx.app){const b=_sfx.app;for(let t=T0;t<T1;t+=b.duration-1)rec(b,t,Math.min(b.duration,T1-t+1),.7,.4);return}const cnt=Math.floor((T1-T0)*dens);for(let k=0;k<cnt;k++){const T=T0+Math.random()*(T1-T0);if(T<from||T>=until)continue;const e=Math.sin(Math.PI*(T-T0)/(T1-T0)),nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);const bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.frequency.value=1500+Math.random()*2500;bp.Q.value=1.4;const gg=.05+.28*e*Math.random();g.gain.setValueAtTime(gg,C(T));g.gain.exponentialRampToValueAtTime(.0001,C(T)+.045);nz.connect(bp);bp.connect(g);g.connect(cbus);nz.start(C(T),Math.random()*1.5,.06);srcs.push(nz)}};
  script.tracks.forEach((tr,i)=>{cheer(tr.start,2.4,.55);const nx=script.tracks[i+1],ge=nx?nx.start:Math.min(script.len,tr.end+3);if(ge-tr.end>=1.2)clap(tr.end-1.2,ge-.2,26)});
  script.segments.forEach(sg=>{if(sg.preset==='drop')cheer(sg.start,2.2,.5)});
  if(_sfx&&_sfx.roar)rec(_sfx.roar,script.len-7,7,1,.6);else cheer(script.len-5,4.5,.7);
 }
 return{stop(){srcs.forEach(s=>{try{s.stop()}catch(e){}});try{bus.disconnect();comp.disconnect()}catch(e){}}};
}

/* ---------- the stage (animated on top of the stage artwork) ---------- */
const PHONES=[[180,594,30],[99,600,38],[45,595,24],[1031,598,16],[1080,596,12],[603,605,24],[975,606,27],[435,611,21],[969,603,8],[155,608,9],[203,606,8],[391,613,20],[172,610,6],[982,609,8],[951,615,9],[238,620,12],[288,619,13],[697,621,17],[1034,625,10],[523,630,13],[152,629,8],[202,630,8],[769,628,15],[485,644,20],[669,638,8],[617,642,7],[655,639,7],[666,646,7],[662,660,5],[421,667,15],[31,668,16]];
const FIX=[[298,78],[378,78],[438,84],[535,86],[653,86],[712,78],[796,78],[1028,112],[52,306]];
const VARIANT={city:'',neon:'hue-rotate(38deg) saturate(1.25)',ice:'hue-rotate(150deg) saturate(1.1) brightness(1.06)',ember:'hue-rotate(-32deg) saturate(1.3) sepia(.18)'};
function makeStage(canvas,seed){
 const c=canvas.getContext('2d');canvas.width=W;canvas.height=H;
 const R=mulberry(seed||((Math.random()*1e9)|0)),S={script:defaultScript(300),theme:'city',hits:[],plate:null},plates={};
 const st={t:0,cam:{z:1,x:0,y:0},energy:.1,cheer:0,nod:0,bounce:0,flash:0,shake:0,hands:[0,0],pads:new Float32Array(12),hearts:0,
  hue:230,fireworks:[],confetti:[],lastHit:-1,hitIdx:0,lastCutBar:-1,lastDrop:-1,fogP:[],endT:-1,lastStartTrack:-2};
 st.fx=(window.MZShowFX&&MZShowFX.create)?MZShowFX.create(st):null;
 /* a fresh random front-row crowd every time */
 const front=[];for(let i=0;i<13;i++)front.push({x:(i+.5)*W/13+(R()-.5)*60,s:1.9+R()*1.1,ph:R()*6.28,sp:.8+R()*.6,look:Math.floor(R()*4),arm:R(),y:H-6+R()*28});
 const phones=PHONES.map(p=>({x:p[0],y:p[1],r:Math.max(6,p[2]*.6),ph:R()*6.28,sp:3+R()*5,on:R()<.85}));
 for(let i=0;i<22;i++)st.fogP.push({x:R()*W,y:420+R()*190,r:90+R()*150,vx:(R()-.5)*14,a:.05+R()*.07});
 function plateFor(theme){
  if(!S.plate)return null;if(plates[theme])return plates[theme];
  const o=document.createElement('canvas');o.width=W;o.height=H;const g=o.getContext('2d');g.filter=VARIANT[theme]||'';g.drawImage(S.plate,0,0,W,H);return plates[theme]=o;
 }
 function crownPath(g,cx,cy,sz){const p=[[-1,.45],[-.92,-.35],[-.4,.15],[0,-.7],[.4,.15],[.92,-.35],[1,.45]];g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(cx+x*sz,cy+y*sz):g.moveTo(cx+x*sz,cy+y*sz));g.closePath()}
 const vig=document.createElement('canvas');vig.width=W;vig.height=H;{const g=vig.getContext('2d'),gr=g.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.98);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(0,0,W,H)}
 const bloom=document.createElement('canvas');bloom.width=W/4;bloom.height=H/4;const bctx=bloom.getContext('2d');bctx.filter='blur(2px) brightness(1.25)';
 let noiseC=null;
 const burst=(x,y,hue,n)=>{for(let i=0;i<n;i++){const a=R()*6.283,sp=60+R()*170;st.fireworks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:1,h:hue+(R()-.5)*30})}};
 const flags=()=>{const m=S.script.milestones||[],f={};m.forEach(k=>{if(st.hearts>=k.at)f[k.fx]=true});return f};
 /* camera framings (artwork coordinates, offsets from the centre) */
 const FR={wide:{z:1,x:0,y:0},dj:{z:1.7,x:30,y:60},left:{z:1.4,x:-190,y:-70},right:{z:1.4,x:200,y:-70},crowd:{z:1.3,x:0,y:190},screen:{z:1.45,x:25,y:-140}};
 const SEQ={dynamic:['wide','dj','left','crowd','right','screen','dj','wide'],slow:['wide','dj','screen','wide'],static:['wide']};
 function pickCam(t,seg,bpm){
  const beatLen=60/Math.max(60,bpm||92),bar=Math.floor(t/(beatLen*4)),mode=S.script.fx.cuts||'dynamic';
  const per=mode==='slow'?8:(seg.preset==='drop'||seg.preset==='finale')&&mode==='dynamic'?2:4;
  if(mode==='static')return{k:'wide',drift:true};
  if(seg.preset==='breakdown')return{k:'dj',drift:true};
  if(seg.preset==='intro')return{k:'wide',push:true};
  const seq=SEQ[mode]||SEQ.dynamic;return{k:seq[Math.floor(bar/per)%seq.length],drift:true,bar:Math.floor(bar/per)};
 }
 const PADS=[];for(let r=0;r<3;r++)for(let k=0;k<4;k++)PADS.push([544+k*25,473+r*6]);
 st.draw=function(T,dt,au,ctl){
  ctl=ctl||{};dt=clamp(dt||.016,.001,.1);st.t=T;const sc=S.script,fx=sc.fx,Dm=ctl.mode||'live',D=(st.fx&&st.fx.active(Dm))?st.fx:null,Treal=T;if(D)T=D.warp(T);
  const q=segAt(sc,Math.max(0,T)),P=(D&&D.coldOn(Treal,Dm))?PRESETS.drop:(PRESETS[q.seg.preset]||PRESETS.drop);
  const mode=ctl.mode||'live',tr=trackAt(sc,T),trk=tr>=0?sc.tracks[tr]:null,bpm=(trk&&trk.bpm)||92,beatLen=60/bpm;
  const fg=flags(),bass=au.bass||0,loud=au.loud||0;
  /* hits: the producer taps on the real drum hits, the crowd pulses */
  const H2=S.hits;let i0=st.hitIdx;if(i0>=H2.length||(i0>0&&H2[i0-1].t>T+.05)){let lo=0,hi=H2.length;while(lo<hi){const m=(lo+hi)>>1;if(H2[m].t<T-.2)lo=m+1;else hi=m}i0=lo}
  while(i0<H2.length&&H2[i0].t<T-.2)i0++;
  let lh=0,rh=0,k=i0;
  while(k<H2.length&&H2[k].t<T+.14){const h=H2[k],d=T-h.t;let a=0;if(d<-.09)a=0;else if(d<0){const p=(d+.09)/.09;a=p*p}else if(d<.14)a=1-d/.14;
   const right=h.type==='snare'||(h.type==='hat'&&(k&1));if(right)rh=Math.max(rh,a*h.s);else lh=Math.max(lh,a*h.s);
   if(h.t>st.lastHit&&h.t<=T&&mode==='live'){st.lastHit=h.t;const pad=h.type==='kick'?(k%2?0:3):h.type==='snare'?(5+(k%2)):(8+(k%4));st.pads[pad%12]=Math.max(st.pads[pad%12],h.s);
    if(h.type==='kick'){st.nod=Math.max(st.nod,h.s);st.bounce=Math.max(st.bounce,h.s);st.shake=Math.max(st.shake,h.s*(q.seg.preset==='drop'?1.5:.5))}
    if(h.type==='snare'){st.flash=Math.max(st.flash,.3*h.s*P.flash);st.cheer=Math.max(st.cheer,.1*h.s)}}
   k++}
  st.hitIdx=i0;st.hands[0]=lerp(st.hands[0],lh,.6);st.hands[1]=lerp(st.hands[1],rh,.6);
  for(let p=0;p<12;p++)st.pads[p]*=Math.pow(.0009,dt);
  st.nod*=Math.pow(.003,dt);st.bounce*=Math.pow(.004,dt);st.shake*=Math.pow(.02,dt);st.flash*=Math.pow(.01,dt);st.cheer*=Math.pow(.25,dt);
  /* crowd energy follows the music: settles when a beat fades, erupts when the next one lands */
  const playing=mode==='live'&&trk,cm={low:.75,medium:1,high:1.2}[fx.crowd]||1,tgt=playing?clamp((.1+loud*2+P.int*.18)*cm,0,1):(mode==='end'?.6:.05);
  st.energy+=(tgt-st.energy)*(1-Math.exp(-dt*(tgt>st.energy?2.4:.7)));
  if(trk&&T>=trk.start&&T-trk.start<.3&&st.lastStartTrack!==tr){st.lastStartTrack=tr;st.cheer=1;burst(W*(.25+R()*.5),H*.22,R()*360,26)}
  if(q.seg.preset==='drop'&&q.seg.start!==st.lastDrop&&T>=q.seg.start&&T-q.seg.start<.3){st.lastDrop=q.seg.start;st.flash=1;st.cheer=1;st.shake=2.2}
  if(mode==='end'){st.endT=st.endT<0?0:st.endT+dt}else st.endT=-1;
  /* palette + intensity */
  const hh=lerp(P.hue[0],P.hue[1],(Math.sin(T*.35)+1)/2);st.hue+=(hh-st.hue)*.05;const hue=st.hue;
  const int=clamp(P.int*(fx.intensity==null?.85:fx.intensity)*(fg.lights?1.25:1)*(mode==='wait'?.5:1)*(.34+loud*1.35),0,1.35);
  const ex=D?D.frame(Treal,T,dt,q,P,mode,bpm,int,hue,au,st.energy,PADS):null;
  /* camera */
  const cp=pickCam(Math.max(0,T),q.seg,bpm);let tz=FR[cp.k].z,tx=FR[cp.k].x,ty=FR[cp.k].y;
  if(cp.push){tz=1+q.p*.16;tx=0;ty=q.p*20}
  if(cp.drift){tx+=Math.sin(T*.3)*14;ty+=Math.cos(T*.23)*7}
  if(fg.special&&mode==='live'&&st.bounce>.5)tz*=1.03;
  const kk=1-Math.exp(-dt*((cp.bar!=null&&cp.bar!==st.lastCutBar)?9:2.6));st.lastCutBar=cp.bar;
  st.cam.z=lerp(st.cam.z,tz,kk);st.cam.x=lerp(st.cam.x,tx,kk);st.cam.y=lerp(st.cam.y,ty,kk);
  const dr=D?D.cam(Treal,dt,q,mode):null;let cz=st.cam.z*(dr?dr.z:1),ccx=st.cam.x+(dr?dr.x:0),ccy=st.cam.y+(dr?dr.y:0);
  if(dr&&dr.ab){const w=dr.ab.w;cz=lerp(cz,dr.ab.z,w);ccx=lerp(ccx,dr.ab.x,w);ccy=lerp(ccy,dr.ab.y,w)}
  if(dr){dr.z=cz;dr.hy=ccy}
  const lim=Math.max(0,W/2*(1-1/cz)),limy=Math.max(0,H/2*(1-1/cz)),pl=plateFor(S.theme);
  c.save();c.fillStyle='#04030a';c.fillRect(0,0,W,H);
  const sh=st.shake*5;c.translate(W/2+(Math.random()-.5)*sh,H/2+(Math.random()-.5)*sh);if(dr&&dr.rot)c.rotate(dr.rot);if(dr&&dr.flip)c.scale(-1,1);c.scale(cz,cz);c.translate(-W/2-clamp(ccx,-lim,lim),-H/2-clamp(ccy,-limy,limy));
  if(pl)c.drawImage(pl,0,0);
  else{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#14102a');g.addColorStop(1,'#050409');c.fillStyle=g;c.fillRect(0,0,W,H)}
  /* the venue dims in quiet moments and comes up with the music */
  const dim=clamp(.62-int*.55,0,.6);if(dim>.02){c.fillStyle=`rgba(4,3,14,${dim})`;c.fillRect(0,0,W,590);c.fillStyle=`rgba(4,3,14,${dim*.5})`;c.fillRect(0,590,W,H-590)}
  /* LED screen: crown glow, spectrum, countdown / thanks text */
  {const sx=392,sy=138,sw=360,sh2=256;c.save();c.beginPath();c.rect(sx,sy,sw,sh2);c.clip();
   if(mode==='wait'||mode==='end'){c.fillStyle='rgba(6,5,20,.88)';c.fillRect(sx,sy,sw,sh2);c.textAlign='center';c.fillStyle='#fff';c.font='15px "Press Start 2P",monospace';
    c.fillText(mode==='end'?'SEE YOU NEXT WEEK':(ctl.head||'SHOW STARTS IN'),sx+sw/2,sy+110);if(mode==='wait'){c.font='34px "Press Start 2P",monospace';c.fillStyle='#ffd34a';c.shadowColor='#ffb020';c.shadowBlur=14;c.fillText(ctl.text||'--:--',sx+sw/2,sy+170);c.shadowBlur=0}}
   else{c.globalCompositeOperation='lighter';const gr=c.createRadialGradient(sx+sw/2,sy+120,10,sx+sw/2,sy+120,190);gr.addColorStop(0,`hsla(${hue+10},90%,70%,${.25+bass*.4+st.bounce*.25})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(sx,sy,sw,sh2);
    if(fg.special&&mode==='live'){c.fillStyle=`hsla(${(T*90)%360},100%,60%,.16)`;c.fillRect(sx,sy,sw,sh2)}
    const bn=36,bw2=sw/bn;for(let b2=0;b2<bn;b2++){const v=au.fd?au.fd[Math.floor(Math.pow(b2/bn,1.6)*260)]/255:bass*(.4+.6*Math.sin(b2+T*5)**2);c.fillStyle=`hsla(${hue+b2*4},100%,${55+v*18}%,${.35+v*.5})`;c.fillRect(sx+b2*bw2+1,sy+sh2-4-v*58,bw2-2,v*58+3)}}
   if(D&&mode==='live')D.led(c,ex,sx,sy,sw,sh2);
   c.restore()}
  /* moving beams from the rig, brighter with the music */
  if(int>.05&&fx.lights!==false){c.save();c.globalCompositeOperation='lighter';
   FIX.forEach(([x0,y0],i)=>{if(!fg.lights&&i%3===2)return;const sw2=Math.sin(T*(.45+i*.06)+i*1.9)*(.3+(q.seg.preset==='drop'?.18:0))+(i%2?.14:-.14),ang=Math.PI/2+sw2+(i===8?-.9:i===7?.35:0),len=H*.95,x1=x0+Math.cos(ang)*len,y1=y0+Math.sin(ang)*len,half=16+int*13+bass*14,hue2=hue+(i%2?P.hue[1]-P.hue[0]:0)*.5+i*6,px=-Math.sin(ang),py=Math.cos(ang);
    const gr=c.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,`hsla(${hue2},100%,72%,${.2*int+bass*.12})`);gr.addColorStop(1,`hsla(${hue2},100%,50%,0)`);
    c.fillStyle=gr;c.beginPath();c.moveTo(x0-4,y0);c.lineTo(x0+4,y0);c.lineTo(x1+px*half,y1+py*half);c.lineTo(x1-px*half,y1-py*half);c.closePath();c.fill();
    const g2=c.createRadialGradient(x0,y0,0,x0,y0,26);g2.addColorStop(0,`hsla(${hue2},100%,82%,${.7*int})`);g2.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g2;c.fillRect(x0-26,y0-26,52,52)});
   c.restore()}
  if(D&&fx.lights!==false)D.beams(c,ex);
  /* lasers: unlocked by hearts, strongest on drops */
  const laserA=P.laser*clamp((st.energy-.22)*2.6,0,1);
  if(fx.lasers!==false&&fg.lasers&&mode==='live'&&laserA>.05){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<12;i++){const a=-Math.PI/2+(i-5.5)*.17+Math.sin(T*.9+i)*.3,hue3=i%3===0?0:i%3===1?125:190,ox=W/2+(i-5.5)*34;c.strokeStyle=`hsla(${hue3},100%,60%,${.55*laserA})`;c.lineWidth=1.6;c.beginPath();c.moveTo(ox,540);c.lineTo(ox+Math.cos(a)*900,540+Math.sin(a)*900);c.stroke();c.strokeStyle=`hsla(${hue3},100%,60%,${.12*laserA})`;c.lineWidth=7;c.stroke()}c.restore()}
  if(D&&mode==='live'){D.tunnel(c,ex);D.floor(c,ex)}
  /* smoke drifting along the stage */
  if(fx.fog!==false){c.save();c.globalCompositeOperation='lighter';st.fogP.forEach(f=>{f.x+=f.vx*dt;if(f.x<-f.r)f.x=W+f.r;if(f.x>W+f.r)f.x=-f.r;const a=f.a*P.fog*(.35+int*.7),gr=c.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);gr.addColorStop(0,`hsla(${hue+f.x*.04},80%,62%,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(f.x-f.r,f.y-f.r,f.r*2,f.r*2)});c.restore()}
  /* the producer: body bounce, head nod, hands tapping the pads, pad lights (all on the beat) */
  if(pl){
   c.drawImage(pl,478,386,198,96,478,386-st.bounce*2.2,198,96);
   c.drawImage(pl,546,324,96,70,546,324+st.nod*2.6,96,70);
   c.drawImage(pl,524,458,64,36,524,458+st.hands[0]*3,64,36);c.drawImage(pl,596,458,64,36,596,458+st.hands[1]*3,64,36);
   c.save();c.globalCompositeOperation='lighter';for(let p=0;p<12;p++){const a=st.pads[p];if(a<.04)continue;const [hx,hy]=PADS[p],gr=c.createRadialGradient(hx,hy,0,hx,hy,26);gr.addColorStop(0,`hsla(${(p*47+hue)%360},100%,70%,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(hx-26,hy-26,52,52)}c.restore()}
  /* crowd bobs up and down in a wave that follows the energy */
  const E=st.energy;
  if(pl){const cy0=578,bump=(st.bounce*3+st.cheer*7)*(.4+E);for(let x=0;x<W;x+=14){const ph=x*.017+T*(2+E*2.2),up=Math.max(0,Math.sin(ph))*(E*6+1)+bump*(.5+.5*Math.sin(x*.05+T*3));c.drawImage(pl,x,cy0,14,H-cy0,x,cy0-up,14,H-cy0)}}
  /* phone lights twinkle in the crowd (fewer, softer once the crowd calms) */
  if(fx.flash!==false){c.save();c.globalCompositeOperation='lighter';phones.forEach(p=>{if(!p.on)return;const a=(.22+.28*(.5+.5*Math.sin(T*p.sp+p.ph)))*(.5+(1-E)*.5+(q.seg.preset==='breakdown'?.5:0)),gr=c.createRadialGradient(p.x,p.y-Math.max(0,Math.sin(T*(2+E*2.2)+p.x*.017))*(E*6+1),0,p.x,p.y,p.r*2.2);gr.addColorStop(0,`rgba(190,225,255,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(p.x-p.r*2.2,p.y-p.r*2.2-8,p.r*4.4,p.r*4.4+8)});c.restore()}
  /* a fresh random front row of fans every time, hands up when the crowd is hyped */
  front.forEach(p=>{const s=p.s*7,x=p.x+Math.sin(T*1.1*p.sp+p.ph)*E*5,bob=Math.sin(T*3.2*p.sp+p.ph)*(1+E*3.5)+st.cheer*6*E,y=p.y-bob;
   c.fillStyle='#050309';c.fillRect(x-s*1.1,y-s*1.5,s*2.2,s*3);c.beginPath();c.arc(x,y-s*1.9,s*.78,0,6.3);c.fill();
   if(p.look===1)c.fillRect(x-s*.9,y-s*2.8,s*1.8,s*.5);else if(p.look===2)c.fillRect(x+s*.4,y-s*2.5,s*.7,s*1.2);
   if(p.arm<clamp(E*1.2+st.cheer*.6,0,1)){const w1=Math.sin(T*5*p.sp+p.ph)*s*.5,h2=s*(2.4+E*1.4+st.cheer*1.2);c.strokeStyle='#050309';c.lineWidth=s*.45;c.beginPath();c.moveTo(x-s*.9,y-s);c.lineTo(x-s*1.3+w1,y-s-h2);c.moveTo(x+s*.9,y-s);c.lineTo(x+s*1.3-w1,y-s-h2*.9);c.stroke()}});
  if(D&&mode==='live'){D.silh(c,pl,ex);D.worldLate(c,ex)}
  /* strobe flash on drops */
  if(st.flash>.02&&fx.flash!==false){c.fillStyle=`rgba(255,255,255,${Math.min(.5,st.flash*.45)})`;c.fillRect(0,0,W,H)}
  /* fireworks and confetti (unlocked by hearts, plus the finale) */
  const fwOn=fx.fireworks!==false&&(fg.fireworks||q.seg.preset==='finale')&&mode!=='wait';if(fwOn&&R()<dt*(q.seg.preset==='finale'?1.6:.6)*(fg.fireworks?1:.5))burst(W*(.12+R()*.76),H*(.06+R()*.2),R()*360,40);
  if(fg.special&&mode==='live'&&R()<dt*30)st.confetti.push({x:R()*W,y:-6,vy:70+R()*100,vx:(R()-.5)*34,c:Math.floor(R()*360)});
  c.save();c.globalCompositeOperation='lighter';st.fireworks=st.fireworks.filter(p=>p.l>0);st.fireworks.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.vx*=.985;p.l-=dt*.55;c.fillStyle=`hsla(${p.h},100%,65%,${Math.max(0,p.l)})`;c.fillRect(p.x,p.y,3,3)});c.restore();
  st.confetti=st.confetti.filter(p=>p.y<H+8);st.confetti.forEach(p=>{p.y+=p.vy*dt;p.x+=p.vx*dt+Math.sin(p.y*.05)*.4;c.fillStyle=`hsl(${p.c},90%,60%)`;c.fillRect(p.x,p.y,4,3)});
  c.restore();
  if(D)D.post(c,canvas,ex,dr);
  /* post: bloom, vignette, grain */
  bctx.clearRect(0,0,W/4,H/4);bctx.drawImage(canvas,0,0,W/4,H/4);c.save();c.globalCompositeOperation='screen';c.globalAlpha=.34+int*.2;c.drawImage(bloom,0,0,W,H);c.restore();
  c.drawImage(vig,0,0);
  if(!noiseC){noiseC=document.createElement('canvas');noiseC.width=noiseC.height=128;const g=noiseC.getContext('2d'),d=g.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}g.putImageData(d,0,0)}
  c.save();c.globalCompositeOperation='overlay';c.globalAlpha=.06;c.translate(-Math.random()*128,-Math.random()*128);c.fillStyle=c.createPattern(noiseC,'repeat');c.fillRect(0,0,W+128,H+128);c.restore();
  /* the banner at the end of the show */
  if(mode==='end'&&st.endT>=0){const e=st.endT,x=lerp(-W*1.2,0,1-Math.pow(1-clamp(e/1.1,0,1),3)),yb=H*.43;c.save();c.translate(x,0);c.fillStyle='rgba(8,6,16,.9)';c.fillRect(0,yb-48,W,96);c.fillStyle='#ffd34a';c.fillRect(0,yb-48,W,4);c.fillRect(0,yb+44,W,4);
   c.font='46px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#000';c.fillText('THANKS FOR WATCHING!',W/2+4,yb+4);const gr2=c.createLinearGradient(0,yb-26,0,yb+26);gr2.addColorStop(0,'#fff6c8');gr2.addColorStop(.5,'#ffd34a');gr2.addColorStop(1,'#d99a12');c.fillStyle=gr2;c.shadowColor='#ffb020';c.shadowBlur=18;c.fillText('THANKS FOR WATCHING!',W/2,yb);c.restore()}
  if(D){D.film(c,ex);D.over(c,canvas,ex)}
 };
 st.setScript=(s,hits)=>{S.script=s;S.hits=hits||[];S.theme=VARIANT[s.theme]!==undefined?s.theme:'city';st.hitIdx=0;st.lastHit=-1;st.lastStartTrack=-2;if(st.fx)st.fx.setScript(s,S.hits)};
 st.setTheme=t=>{S.theme=VARIANT[t]!==undefined?t:'city'};st.setHits=h=>{S.hits=h;st.hitIdx=0;st.lastHit=-1;if(st.fx)st.fx.setScript(S.script,h)};st.setPlate=i=>{S.plate=i;for(const k in plates)delete plates[k]};
 st.setHearts=n=>{st.hearts=n};st.reset=()=>{if(st.fx)st.fx.reset();st.hitIdx=0;st.lastHit=-1;st.fireworks=[];st.confetti=[];st.endT=-1;st.lastStartTrack=-2;st.lastDrop=-1};
 st.canvas=canvas;st.burst=burst;st.script=()=>S.script;st.themeThumb=name=>plateFor(name);
 return st;
}

/* ---------- helpers for loading ---------- */
function loadPlate(){return new Promise(r=>{const i=new Image();i.src=new URL('show-stage.webp?v=2',document.baseURI).href;i.onload=()=>r(i);i.onerror=()=>r(null)})}
async function loadFonts(){await Promise.all(['28px Anton','13px "Press Start 2P"'].map(f=>document.fonts.load(f).catch(()=>{})))}
async function loadTracks(script,ctx){
 const bufs=[],data=[];await loadSfx();
 for(const tr of script.tracks){
  try{const r=await fetch(tr.audio);if(!r.ok)throw 0;const b=await ctx.decodeAudioData(await r.arrayBuffer());bufs.push(b);data.push(await analyze(b))}catch(e){bufs.push(null);data.push(null)}
 }
 return{bufs,data};
}
function dataFromBuffer(L,sr,t,prev){
 const N=2048,c=Math.floor(t*sr),re=new Float64Array(N),im=new Float64Array(N),fd=new Uint8Array(512);let rms=0;
 for(let i=0;i<N;i++){const j=c+i-N,v=(j>=0&&j<L.length)?L[j]:0;re[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));rms+=v*v}
 fft(re,im);for(let i=0;i<512;i++){const m=Math.sqrt(re[i]*re[i]+im[i]*im[i])/N*2;prev[i]=prev[i]*.7+m*.3;fd[i]=clamp(Math.round((20*Math.log10(Math.max(prev[i],1e-9))+100)/70*255),0,255)}
 const avg=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=fd[i];return s/(b-a)/255};
 return{fd,bass:avg(1,8),mid:avg(8,60),high:avg(60,200),loud:clamp(Math.sqrt(rms/N)*3,0,1)};
}

window.MZShow={loadSfx,W,H,PRESETS,THEMES,defaultScript,segAt,trackAt,analyze,hitTimeline,schedule,makeStage,loadPlate,loadFonts,loadTracks,dataFromBuffer,fmt,mulberry};
})();
