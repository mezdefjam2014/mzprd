/* MZPRD Show engine: a pixel-art concert (stage, lights, crowd, the producer tapping the beat) that plays live in the browser
   from a tiny script, or renders to a video file. Reactive: the producer taps on the real drum hits found in each beat,
   the crowd follows the loudness of the music (settles when a beat fades, erupts when the next one lands).
   Shared by the SHOW page, the back office Show Maker preview, and the video renderer. */
(function(){
'use strict';
const W=1280,H=720;
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
 return{v:2,len,theme:'city',title:'Weekly Show',tracks:[],
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
function schedule(ctx,dest,script,bufs,from,until,o){
 o=o||{};const t0=o.t0||0,srcs=[],C=T=>t0+(T-from);
 const bus=ctx.createGain(),lp=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor();lp.type='lowpass';lp.Q.value=.7;
 comp.threshold.value=-10;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.2;
 bus.connect(lp);lp.connect(comp);comp.connect(dest);
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
 script.segments.forEach(sg=>{
  if(sg.preset==='drop'&&sg.start>=from&&sg.start<until){
   const T=C(sg.start),o1=ctx.createOscillator(),g=ctx.createGain();o1.type='sine';o1.frequency.setValueAtTime(75,T);o1.frequency.exponentialRampToValueAtTime(28,T+.9);g.gain.setValueAtTime(.0001,T);g.gain.exponentialRampToValueAtTime(.85,T+.02);g.gain.exponentialRampToValueAtTime(.0001,T+1.1);o1.connect(g);g.connect(comp);o1.start(T);o1.stop(T+1.2);srcs.push(o1);
   const nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);const ng=ctx.createGain(),nf=ctx.createBiquadFilter();nf.type='lowpass';nf.frequency.value=3000;ng.gain.setValueAtTime(.5,T);ng.gain.exponentialRampToValueAtTime(.0001,T+.7);nz.connect(nf);nf.connect(ng);ng.connect(comp);nz.start(T,0,.8);srcs.push(nz)}
  if(sg.preset==='build'){const rs=Math.max(sg.start,sg.end-8);if(rs>=from&&rs<until){const T=C(rs),nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);nz.loop=true;const bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.Q.value=1.2;bp.frequency.setValueAtTime(300,T);bp.frequency.exponentialRampToValueAtTime(9000,C(sg.end));g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(.2,C(sg.end));g.gain.linearRampToValueAtTime(0,C(sg.end)+.05);nz.connect(bp);bp.connect(g);g.connect(comp);nz.start(T);nz.stop(C(sg.end)+.1);srcs.push(nz)}}
 });
 /* the crowd: a cheer when a beat starts, applause when it fades, a roar at the end */
 if(script.fx.crowdSound!==false){
  const cbus=ctx.createGain();cbus.gain.value=.22;cbus.connect(dest);
  const cheer=(T0,len,peak)=>{if(T0<from-len||T0>=until)return;const T=Math.max(C(T0),C(from)),nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);nz.loop=true;const bp=ctx.createBiquadFilter(),bp2=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.frequency.value=1100;bp.Q.value=.8;bp2.type='bandpass';bp2.frequency.value=2300;bp2.Q.value=.6;
   g.gain.setValueAtTime(.0001,T);g.gain.linearRampToValueAtTime(peak,T+Math.min(.5,len*.2));g.gain.exponentialRampToValueAtTime(.0001,T+len);nz.connect(bp);bp.connect(bp2);bp2.connect(g);g.connect(cbus);nz.start(T,Math.random());nz.stop(T+len+.1);srcs.push(nz)};
  const clap=(T0,T1,dens)=>{const cnt=Math.floor((T1-T0)*dens);for(let k=0;k<cnt;k++){const T=T0+Math.random()*(T1-T0);if(T<from||T>=until)continue;const e=Math.sin(Math.PI*(T-T0)/(T1-T0)),nz=ctx.createBufferSource();nz.buffer=noiseBuf(ctx);const bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.frequency.value=1500+Math.random()*2500;bp.Q.value=1.4;const gg=.05+.28*e*Math.random();g.gain.setValueAtTime(gg,C(T));g.gain.exponentialRampToValueAtTime(.0001,C(T)+.045);nz.connect(bp);bp.connect(g);g.connect(cbus);nz.start(C(T),Math.random()*1.5,.06);srcs.push(nz)}};
  script.tracks.forEach((tr,i)=>{cheer(tr.start,2.4,.55);const nx=script.tracks[i+1],ge=nx?nx.start:Math.min(script.len,tr.end+3);if(ge-tr.end>=1.2)clap(tr.end-1.2,ge-.2,26)});
  script.segments.forEach(sg=>{if(sg.preset==='drop')cheer(sg.start,2.2,.5)});
  cheer(script.len-5,4.5,.7);
 }
 return{stop(){srcs.forEach(s=>{try{s.stop()}catch(e){}});try{bus.disconnect();comp.disconnect()}catch(e){}}};
}

/* ---------- the stage (animated on top of the stage artwork) ---------- */
const VARIANT={city:'',neon:'hue-rotate(38deg) saturate(1.25)',ice:'hue-rotate(150deg) saturate(1.1) brightness(1.06)',ember:'hue-rotate(-32deg) saturate(1.3) sepia(.18)'};
function makeStage(canvas,seed){
 const c=canvas.getContext('2d');canvas.width=W;canvas.height=H;
 const R=mulberry(seed||((Math.random()*1e9)|0)),S={script:defaultScript(300),theme:'city',hits:[],plate:null},plates={};
 const st={t:0,cam:{z:1,x:0,y:0},energy:.1,cheer:0,nod:0,bounce:0,flash:0,shake:0,hands:[0,0],pads:new Float32Array(12),hearts:0,
  hue:230,fireworks:[],confetti:[],lastHit:-1,hitIdx:0,lastCutBar:-1,lastDrop:-1,fogP:[],endT:-1,lastStartTrack:-2};
 /* a fresh random front-row crowd every time */
 for(let i=0;i<20;i++){const back=i<7;st.fogP.push({back,x:R()*(W+400)-200,y:back?405+R()*55:478+R()*52,s:back?1+R()*.6:1.1+R()*.8,vx:(R()<.5?-1:1)*(5+R()*12),a:back?.4+R()*.2:.5+R()*.25,k:(R()*4)|0,ph:R()*6.28})}
 const L={},C={},seedP=R()*6.28;st.colUp=new Float32Array(200);
 /* ---- the show scene: your empty stage plate + the separate pieces from the layer sheet ---- */
 const PS=W/1672,SCR={x:438,y:136,w:433,h:287},BODY={x:482,y:179,s:1.2},TBL={x:404,y:429,s:1.2},SPK={x:52,b:612,s:.95},MON={x:994,b:612,s:.95},CRW={x:-19,y:485,s:.871};
 const FIX=[[80,90,320],[345,85,285],[450,95,30],[568,95,212],[1070,95,212],[1192,95,30],[1338,85,285],[1600,90,205]].map(([x,y,h])=>[x*PS,y*PS,h]);
 const LAS=[[330*PS,662*PS,-1],[1370*PS,662*PS,1]];
 function layersFor(theme){
  if(!S.plate)return null;if(L[theme])return L[theme];
  const f=VARIANT[theme]||'',mk=im=>{const o=document.createElement('canvas');o.width=im.naturalWidth;o.height=im.naturalHeight;const g=o.getContext('2d');g.filter=f;g.drawImage(im,0,0);return o},P=S.plate;
  return L[theme]={atlas:mk(P.atlas),stage:mk(P.stage),lights:mk(P.lights)};
 }
 const pc=(g,A,k,x,y,sc)=>{const r=S.plate.meta.r[k];g.drawImage(A,r[0],r[1],r[2],r[3],x,y,r[2]*sc,r[3]*sc)};
 const sz=k=>S.plate.meta.r[k];
 function stageBase(g,Ly,cy,glow){g.drawImage(Ly.stage,0,0,W,H);const m=S.plate.meta,r=m.r.crown;if(!r)return;const x=m.crown[0]*PS,y=m.crown[1]*PS+(cy||0);g.drawImage(Ly.atlas,r[0],r[1],r[2],r[3],x,y,r[2]*PS,r[3]*PS);
  if(glow>.02){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(.6,glow);g.drawImage(Ly.atlas,r[0],r[1],r[2],r[3],x,y,r[2]*PS,r[3]*PS);g.restore()}}
 function speakers(g,A,pump){
  pump=pump||0;{const r=sz('speakers'),sc=SPK.s*(1+pump*.05);pc(g,A,'speakers',SPK.x+r[2]*(SPK.s-sc)/2,SPK.b-r[3]*sc,sc)}
  {const r=sz('monitors'),sc=MON.s*(1+pump*.05);pc(g,A,'monitors',MON.x+r[2]*(MON.s-sc)/2,MON.b-r[3]*sc,sc)}
 }
 /* MPC pads (4 x 3 visible) in the producer piece's own pixels */
  function producer(g,A,po){
  po=po||{bounce:0,nod:0,hands:[0,0],pads:null,hue:230,t:0};
  pc(g,A,'table',TBL.x,TBL.y,TBL.s);
  const bs=BODY.s,dy=po.bounce*2.4;
  pc(g,A,'torso',BODY.x,BODY.y+dy,bs);
  {const px=BODY.x+150*bs,py=BODY.y+dy+86*bs,r=sz('head');g.save();g.translate(px,py+po.nod*2.2);g.rotate(po.nod*.06+Math.sin(po.t*1.3)*.012);g.drawImage(A,r[0],r[1],r[2],r[3],-150*bs,-86*bs,r[2]*bs,r[3]*bs);g.restore()}
  pc(g,A,'mpc',BODY.x,BODY.y,bs);
  if(po.pads){const pd=S.plate.meta.pads;g.save();pd.forEach(([px,py],p)=>{const a=po.pads[p%12];if(a<.04)return;const r=sz('pad'+p),x=BODY.x+px*bs,y=BODY.y+py*bs;g.globalAlpha=Math.min(1,a*1.15);g.drawImage(A,r[0],r[1],r[2],r[3],x,y,r[2]*bs,r[3]*bs);g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(.7,a*.6);g.drawImage(A,r[0],r[1],r[2],r[3],x-1,y-1,r[2]*bs+2,r[3]*bs+2);g.globalCompositeOperation='source-over'});g.restore()}
  pc(g,A,'hl',BODY.x,BODY.y+dy*.6+po.hands[0]*3.2,bs);pc(g,A,'hr',BODY.x,BODY.y+dy*.6+po.hands[1]*3.2,bs);
 }
 function crowdStatic(g,A){const r=sz('crowd');g.drawImage(A,r[0],r[1],r[2],r[3],CRW.x,CRW.y,r[2]*CRW.s,r[3]*CRW.s)}
 function compFor(theme){
  if(C[theme])return C[theme];const Ly=layersFor(theme);if(!Ly)return null;const o=document.createElement('canvas');o.width=W;o.height=H;const g=o.getContext('2d');
  stageBase(g,Ly);speakers(g,Ly.atlas);producer(g,Ly.atlas);crowdStatic(g,Ly.atlas);return C[theme]=o;
 }
 function crownPath(g,cx,cy,sz){const p=[[-1,.45],[-.92,-.35],[-.4,.15],[0,-.7],[.4,.15],[.92,-.35],[1,.45]];g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(cx+x*sz,cy+y*sz):g.moveTo(cx+x*sz,cy+y*sz));g.closePath()}
 const vig=document.createElement('canvas');vig.width=W;vig.height=H;{const g=vig.getContext('2d'),gr=g.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.98);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(0,0,W,H)}
 const bloom=document.createElement('canvas');bloom.width=W/4;bloom.height=H/4;const bctx=bloom.getContext('2d');bctx.filter='blur(2px) brightness(1.25)';
 let noiseC=null;
 const burst=(x,y,hue,n)=>{for(let i=0;i<n;i++){const a=R()*6.283,sp=60+R()*170;st.fireworks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:1,h:hue+(R()-.5)*30})}};
 const flags=()=>{const m=S.script.milestones||[],f={};m.forEach(k=>{if(st.hearts>=k.at)f[k.fx]=true});return f};
 /* camera framings (artwork coordinates, offsets from the centre) */
 const FR={wide:{z:1,x:0,y:0},dj:{z:1.9,x:0,y:-46},left:{z:1.5,x:-300,y:30},right:{z:1.5,x:300,y:30},crowd:{z:1.35,x:0,y:170},screen:{z:1.6,x:15,y:-80}};
 const SEQ={dynamic:['wide','dj','left','crowd','right','screen','dj','wide'],slow:['wide','dj','screen','wide'],static:['wide']};
 function pickCam(t,seg,bpm,cutsOv){
  const beatLen=60/Math.max(60,bpm||92),bar=Math.floor(t/(beatLen*4)),mode=cutsOv||S.script.fx.cuts||'dynamic';
  const per=mode==='slow'?8:(seg.preset==='drop'||seg.preset==='finale')&&mode==='dynamic'?2:4;
  if(mode==='static')return{k:'wide',drift:true};
  if(seg.preset==='breakdown')return{k:'dj',drift:true};
  if(seg.preset==='intro')return{k:'wide',push:true};
  const seq=SEQ[mode]||SEQ.dynamic;return{k:seq[Math.floor(bar/per)%seq.length],drift:true,bar:Math.floor(bar/per)};
 }
 const PADS=[];for(let r=0;r<3;r++)for(let k=0;k<4;k++)PADS.push([544+k*25,473+r*6]);
 st.draw=function(T,dt,au,ctl){
  ctl=ctl||{};dt=clamp(dt||.016,.001,.1);st.t=T;const sc=S.script,fx=sc.fx,q=segAt(sc,Math.max(0,T)),P=PRESETS[q.seg.preset]||PRESETS.drop;
  const mode=ctl.mode||'live',tr=trackAt(sc,T),trk=tr>=0?sc.tracks[tr]:null,bpm=(trk&&trk.bpm)||92,beatLen=60/bpm;
  const fg=flags(),bass=au.bass||0,loud=au.loud||0;
  {const look0=(trk&&trk.look&&VARIANT[trk.look]!==undefined)?trk.look:(st.look||S.theme);
   if(st.look==null){st.look=look0;st.prevLook=look0;st.lookT=1}else if(look0!==st.look){st.prevLook=st.look;st.look=look0;st.lookT=0}
   st.lookT=Math.min(1,st.lookT+dt/1.4)}
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
  const int=clamp(P.int*(fx.intensity==null?.85:fx.intensity)*((trk&&trk.int)||1)*(fg.lights?1.25:1)*(mode==='wait'?.5:1)*(.34+loud*1.35),0,1.35);
  /* camera */
  const cp=pickCam(Math.max(0,T),q.seg,bpm,trk&&trk.cuts);let tz=FR[cp.k].z,tx=FR[cp.k].x,ty=FR[cp.k].y;
  if(cp.push){tz=1+q.p*.16;tx=0;ty=q.p*20}
  if(cp.drift){tx+=Math.sin(T*.3)*14;ty+=Math.cos(T*.23)*7}
  if(fg.special&&mode==='live'&&st.bounce>.5)tz*=1.03;
  const kk=1-Math.exp(-dt*((cp.bar!=null&&cp.bar!==st.lastCutBar)?9:2.6));st.lastCutBar=cp.bar;
  st.cam.z=lerp(st.cam.z,tz,kk);st.cam.x=lerp(st.cam.x,tx,kk);st.cam.y=lerp(st.cam.y,ty,kk);
  const lim=Math.max(0,W/2*(1-1/st.cam.z)),limy=Math.max(0,H/2*(1-1/st.cam.z)),Ly=layersFor(st.look),A=Ly&&Ly.atlas,MT=S.plate&&S.plate.meta;
  c.save();c.fillStyle='#04030a';c.fillRect(0,0,W,H);
  const sh=st.shake*5;c.translate(W/2+(Math.random()-.5)*sh,H/2+(Math.random()-.5)*sh);c.scale(st.cam.z,st.cam.z);c.translate(-W/2-clamp(st.cam.x,-lim,lim),-H/2-clamp(st.cam.y,-limy,limy));
  const pump=fx.speakers!==false?clamp(bass*.5+st.bounce*.7+st.cheer*.2,0,1):0;
  /* 1. the stage plate (cross-fades between per-beat looks) */
  const crY=mode==='live'?Math.sin(T*1.15)*5-st.bounce*4:Math.sin(T*.8)*3,crG=mode==='live'?bass*.25+st.bounce*.3:0;
  if(Ly){const pv=st.lookT<1&&st.prevLook!==st.look?layersFor(st.prevLook):null;if(pv){stageBase(c,pv,crY,crG);c.globalAlpha=st.lookT;stageBase(c,Ly,crY,crG);c.globalAlpha=1}else stageBase(c,Ly,crY,crG)}
  else{c.fillStyle='#0b0716';c.fillRect(0,0,W,H)}
  /* 2. the venue dims in quiet moments; the plate's own lights come back up with the music */
  const dim=clamp(.6-int*.5,0,.58);if(dim>.02){c.fillStyle=`rgba(5,3,14,${dim})`;c.fillRect(0,0,W,H)}
  if(Ly){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=clamp(int*.42+bass*.22+st.flash*.3,0,.85);c.drawImage(Ly.lights,0,0,W,H);c.restore()}
  /* 3. LED screen: crown pulse, spectrum, countdown / thanks text */
  {const sx=SCR.x,sy=SCR.y,sw=SCR.w,sh2=SCR.h;c.save();c.beginPath();c.rect(sx,sy,sw,sh2);c.clip();
   if(mode==='wait'||mode==='end'){c.fillStyle='rgba(6,5,20,.86)';c.fillRect(sx,sy,sw,sh2);c.textAlign='center';c.fillStyle='#fff';c.font='14px "Press Start 2P",monospace';
    c.fillText(mode==='end'?'SEE YOU NEXT WEEK':(ctl.head||'SHOW STARTS IN'),sx+sw/2,sy+sh2*.3);if(mode==='wait'){c.font='30px "Press Start 2P",monospace';c.fillStyle='#ffd34a';c.shadowColor='#ffb020';c.shadowBlur=14;c.fillText(ctl.text||'--:--',sx+sw/2,sy+sh2*.48);c.shadowBlur=0}}
   else{c.globalCompositeOperation='lighter';const gr=c.createRadialGradient(sx+sw/2,sy+sh2*.42,10,sx+sw/2,sy+sh2*.42,sw*.55);gr.addColorStop(0,`hsla(${hue+10},90%,68%,${.1+bass*.3+st.bounce*.2})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(sx,sy,sw,sh2);
    if(fg.special&&mode==='live'){c.fillStyle=`hsla(${(T*90)%360},100%,60%,.14)`;c.fillRect(sx,sy,sw,sh2)}
    const bn=40,bw2=sw/bn;for(let b2=0;b2<bn;b2++){const v=au.fd?au.fd[Math.floor(Math.pow(b2/bn,1.6)*260)]/255:bass*(.4+.6*Math.sin(b2+T*5)**2);c.fillStyle=`hsla(${hue+b2*4},100%,${55+v*18}%,${.25+v*.5})`;c.fillRect(sx+b2*bw2+1,sy+sh2-4-v*46,bw2-2,v*46+3)}}
   c.restore()}
  /* 4. fixture flares + soft moving beams (more of them on drops) */
  if(int>.05&&fx.lights!==false){c.save();c.globalCompositeOperation='lighter';
   FIX.forEach(([x0,y0,h0],i)=>{const hue2=h0+(hue-230)*.2,on=fg.lights||i%3!==2;
    const fl=c.createRadialGradient(x0,y0,0,x0,y0,34+bass*16);fl.addColorStop(0,`hsla(${hue2},100%,86%,${clamp(.25*int+st.bounce*.35,0,.85)})`);fl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=fl;c.fillRect(x0-50,y0-50,100,100);
    if(!on)return;const sw2=Math.sin(T*(.45+i*.06)+i*1.9)*(.22+(q.seg.preset==='drop'?.16:0))+(x0<W/2?-.2:.2),ang=Math.PI/2+sw2,len=H*.8,x1=x0+Math.cos(ang)*len,y1=y0+Math.sin(ang)*len,half=10+int*8+bass*8,px=-Math.sin(ang),py=Math.cos(ang);
    const gr=c.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,`hsla(${hue2},100%,72%,${.1*int+bass*.06})`);gr.addColorStop(.7,`hsla(${hue2},100%,60%,${.03*int})`);gr.addColorStop(1,`hsla(${hue2},100%,50%,0)`);
    c.fillStyle=gr;c.beginPath();c.moveTo(x0-3,y0);c.lineTo(x0+3,y0);c.lineTo(x1+px*half,y1+py*half);c.lineTo(x1-px*half,y1-py*half);c.closePath();c.fill()});
   c.restore()}
  /* 5. lasers from the two emitters on the stage floor: unlocked by hearts, strongest on drops */
  const laserA=P.laser*clamp((st.energy-.22)*2.6,0,1);
  if(fx.lasers!==false&&fg.lasers&&mode==='live'&&laserA>.05){c.save();c.globalCompositeOperation='lighter';LAS.forEach(([ox,oy,sd],k2)=>{for(let i=0;i<6;i++){const a=-Math.PI/2+sd*(.25+i*.15)+Math.sin(T*.9+i+k2)*.14,hue3=[320,200,280][i%3];c.strokeStyle=`hsla(${hue3},100%,62%,${.55*laserA})`;c.lineWidth=1.6;c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+Math.cos(a)*1100,oy+Math.sin(a)*1100);c.stroke();c.strokeStyle=`hsla(${hue3},100%,60%,${.1*laserA})`;c.lineWidth=7;c.stroke()}});c.restore()}
  /* smoke sprites: a back bank behind the producer and a front bank between the stage and the crowd */
  const smoke=back=>{if(fx.fog===false||!A)return;c.save();c.globalCompositeOperation='screen';st.fogP.forEach(f=>{if(f.back!==back)return;if(back===true||back===false){}
    const r=MT.r['smoke'+f.k],w2=r[2]*f.s*1.3,h2=r[3]*f.s;f.x+=f.vx*dt;if(f.x<-w2-200)f.x=W+200;if(f.x>W+200)f.x=-w2-200;
    c.globalAlpha=clamp(f.a*P.fog*(.5+int*.55+bass*.2)*(.85+.15*Math.sin(T*.7+f.ph)),0,.9);c.drawImage(A,r[0],r[1],r[2],r[3],f.x,f.y-h2/2+Math.sin(T*.4+f.ph)*4,w2,h2)});c.restore()};
  smoke(true);
  /* contact shadows so the gear sits on the floor */
  {const sh0=(x,y,rx,ry,a)=>{c.save();c.translate(x,y);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore()};
   sh0(TBL.x+236,TBL.y+150,280,26,.7);sh0(SPK.x+150,SPK.b+2,190,20,.6);sh0(MON.x+115,MON.b+2,150,18,.6)}
  /* 6. speakers pump on the kick, glow on the hit */
  if(A){speakers(c,A,pump);
   if(st.bounce>.1&&fx.speakers!==false){c.save();c.globalCompositeOperation='lighter';[[SPK.x+150,SPK.b-140,150],[MON.x+115,MON.b-95,110]].forEach(([gx,gy,gr0])=>{const gr=c.createRadialGradient(gx,gy,0,gx,gy,gr0);gr.addColorStop(0,`hsla(${hue},100%,66%,${Math.min(.22,st.bounce*.16)})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(gx-gr0,gy-gr0,gr0*2,gr0*2)});c.restore()}}
  /* 7. the producer: body bounces, head nods, each hand presses on its own hits, pads flash */
  if(A)producer(c,A,{bounce:st.bounce,nod:st.nod,hands:st.hands,pads:st.pads,hue,t:T});
  smoke(false);
  /* low haze band over the stage floor, lit by the rig */
  {const g=c.createLinearGradient(0,440,0,640);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,`hsla(${hue+20},70%,60%,${.06+int*.07+bass*.04})`);g.addColorStop(1,'rgba(0,0,0,0)');c.save();c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(0,440,W,200);c.restore()}
  /* 8. the crowd: one smooth mesh warp so people sway and wave without tearing; energy follows the music */
  const E=st.energy;
  if(A){const cw=MT.r.crowd,sc=CRW.s,bp=(T/beatLen)%1,hop=playing?E*Math.pow(Math.max(0,Math.sin(Math.PI*bp)),2)*3.2:0,jy=hop+(st.bounce*1.6+st.cheer*3)*(.4+E);
   c.drawImage(A,cw[0],cw[1],cw[2],cw[3],CRW.x,CRW.y-jy,cw[2]*sc,cw[3]*sc);
   MT.arms.forEach(([ax,ay,pvx,pvy],i)=>{const r=MT.r['arm'+i],ang=Math.sin(T*(1.5+(i%5)*.33)+i*1.7+seedP)*(.04+E*.15)+st.cheer*.08*(i%2?1:-1)+hop*.012*(i%3-1),lift=hop*.6+st.cheer*2*E;
    c.save();c.translate(CRW.x+pvx*sc,CRW.y+pvy*sc-jy-lift);c.rotate(ang);c.drawImage(A,r[0],r[1],r[2],r[3],(ax-pvx)*sc,(ay-pvy)*sc,r[2]*sc,r[3]*sc);c.restore()});
  /* phone screens twinkle (softer once the crowd calms) */
   if(fx.flash!==false&&MT.phones){c.save();c.globalCompositeOperation='lighter';MT.phones.forEach((p,i)=>{const px=CRW.x+p[0]*sc,py=CRW.y+p[1]*sc-jy,r=Math.max(8,p[2]*sc*1.5),a=(.12+.28*(.5+.5*Math.sin(T*(3+(i%5)*1.3)+i*2.1)))*(.5+(1-E)*.5+(q.seg.preset==='breakdown'?.5:0)),gr=c.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,`rgba(190,225,255,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(px-r,py-r,r*2,r*2)});c.restore()}}
  /* strobe flash on drops */
  if(st.flash>.02&&fx.flash!==false){c.fillStyle=`rgba(255,255,255,${Math.min(.5,st.flash*.45)})`;c.fillRect(0,0,W,H)}
  /* fireworks and confetti (unlocked by hearts, plus the finale) */
  const fwOn=fx.fireworks!==false&&(fg.fireworks||q.seg.preset==='finale')&&mode!=='wait';if(fwOn&&R()<dt*(q.seg.preset==='finale'?1.6:.6)*(fg.fireworks?1:.5))burst(W*(.12+R()*.76),H*(.06+R()*.2),R()*360,40);
  if(fg.special&&mode==='live'&&R()<dt*30)st.confetti.push({x:R()*W,y:-6,vy:70+R()*100,vx:(R()-.5)*34,c:Math.floor(R()*360)});
  c.save();c.globalCompositeOperation='lighter';st.fireworks=st.fireworks.filter(p=>p.l>0);st.fireworks.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.vx*=.985;p.l-=dt*.55;c.fillStyle=`hsla(${p.h},100%,65%,${Math.max(0,p.l)})`;c.fillRect(p.x,p.y,3,3)});c.restore();
  st.confetti=st.confetti.filter(p=>p.y<H+8);st.confetti.forEach(p=>{p.y+=p.vy*dt;p.x+=p.vx*dt+Math.sin(p.y*.05)*.4;c.fillStyle=`hsl(${p.c},90%,60%)`;c.fillRect(p.x,p.y,4,3)});
  c.restore();
  /* post: bloom, vignette, grain */
  bctx.clearRect(0,0,W/4,H/4);bctx.drawImage(canvas,0,0,W/4,H/4);c.save();c.globalCompositeOperation='screen';c.globalAlpha=.34+int*.2;c.drawImage(bloom,0,0,W,H);c.restore();
  c.drawImage(vig,0,0);
  if(!noiseC){noiseC=document.createElement('canvas');noiseC.width=noiseC.height=128;const g=noiseC.getContext('2d'),d=g.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}g.putImageData(d,0,0)}
  c.save();c.globalCompositeOperation='overlay';c.globalAlpha=.06;c.translate(-Math.random()*128,-Math.random()*128);c.fillStyle=c.createPattern(noiseC,'repeat');c.fillRect(0,0,W+128,H+128);c.restore();
  /* the banner at the end of the show */
  if(mode==='end'&&st.endT>=0){const e=st.endT,x=lerp(-W*1.2,0,1-Math.pow(1-clamp(e/1.1,0,1),3)),yb=H*.43;c.save();c.translate(x,0);c.fillStyle='rgba(8,6,16,.9)';c.fillRect(0,yb-48,W,96);c.fillStyle='#ffd34a';c.fillRect(0,yb-48,W,4);c.fillRect(0,yb+44,W,4);
   c.font='46px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#000';c.fillText('THANKS FOR WATCHING!',W/2+4,yb+4);const gr2=c.createLinearGradient(0,yb-26,0,yb+26);gr2.addColorStop(0,'#fff6c8');gr2.addColorStop(.5,'#ffd34a');gr2.addColorStop(1,'#d99a12');c.fillStyle=gr2;c.shadowColor='#ffb020';c.shadowBlur=18;c.fillText('THANKS FOR WATCHING!',W/2,yb);c.restore()}
 };
 st.setScript=(s,hits)=>{S.script=s;S.hits=hits||[];S.theme=VARIANT[s.theme]!==undefined?s.theme:'city';st.look=null;st.hitIdx=0;st.lastHit=-1;st.lastStartTrack=-2};
 st.setTheme=t=>{S.theme=VARIANT[t]!==undefined?t:'city';st.look=null};st.setHits=h=>{S.hits=h;st.hitIdx=0;st.lastHit=-1};st.setPlate=i=>{S.plate=i;for(const k in L)delete L[k];for(const k in C)delete C[k]};
 st.setHearts=n=>{st.hearts=n};st.reset=()=>{st.hitIdx=0;st.lastHit=-1;st.fireworks=[];st.confetti=[];st.endT=-1;st.lastStartTrack=-2;st.lastDrop=-1};
 st.canvas=canvas;st.burst=burst;st.script=()=>S.script;st.themeThumb=name=>compFor(name);
 return st;
}

/* ---------- helpers for loading ---------- */
async function loadPlate(){
 const base=u=>new URL(u,document.baseURI).href,V='?v=7',ld=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=base(u+V)});
 const [atlas,stage,lights,meta]=await Promise.all([ld('show-atlas.webp'),ld('show-stage.webp'),ld('show-lights.webp'),fetch(base('show-atlas.json'+V)).then(r=>r.json()).catch(()=>null)]);
 return(atlas&&stage&&lights&&meta)?{atlas,stage,lights,meta}:null;
}
async function loadFonts(){await Promise.all(['28px Anton','13px "Press Start 2P"'].map(f=>document.fonts.load(f).catch(()=>{})))}
async function loadTracks(script,ctx){
 const bufs=[],data=[];
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

window.MZShow={W,H,PRESETS,THEMES,defaultScript,segAt,trackAt,analyze,hitTimeline,schedule,makeStage,loadPlate,loadFonts,loadTracks,dataFromBuffer,fmt,mulberry};
})();
