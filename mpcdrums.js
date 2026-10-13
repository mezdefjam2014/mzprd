/* MZPRD MPC studio: SAMPLE TO BEAT, the beat engine (rewritten clean).
   - The drum patterns come from the user's own stem folders (mpc/patterns.json) and each beat plays its OWN kick, snare and hat (mpc/stems/<name>.ogg + .json).
   - A beat keeps its own tempo. The sample is time-stretched to the beat (stretch() below, WSOLA) so the drums never speed up or slow down to match the sample.
   - Drums are exact: no swing, no random timing, no random loudness. The mix has no distortion: no saturation, no compressor squash, only a transparent peak limiter.
   - plan() lists every event of one 4-bar loop (drums + chops). The chops sit at their exact place in the sample; a "program" re-orders them for variety (one new program per loop, a new set for every episode).
   The same plan makes the sound and drives the video, so every pad press matches what you hear. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mul=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a};

/* ================= the beats (patterns) and their sounds ================= */
let PAT=[],PATP=null;const PACKS={},PACKR={};
function loadPatterns(){return PATP=PATP||fetch(new URL('mpc/patterns.json?v=6',document.baseURI).href).then(r=>r.ok?r.json():[]).catch(()=>[]).then(p=>(PAT=p))}
/* every beat brings its own one-shots (mpc/stems/<name>.ogg + .json, cut from its own stems) */
async function loadPack(dna){await loadPatterns();if(!dna)return null;const p=PAT[dna.stem];if(!p)return null;const name=p.pack;
 if(!PACKS[name])PACKS[name]=(async()=>{try{const u=n=>new URL('mpc/'+n,document.baseURI).href,[ab,q]=await Promise.all([fetch(u(name+'.ogg?v=4')).then(r=>r.arrayBuffer()),fetch(u(name+'.json?v=4')).then(r=>r.json())]),buf=await new OfflineAudioContext(1,1,44100).decodeAudioData(ab);
  return PACKR[name]={buf,meta:q,kick:q.kick[0]||null,snare:q.snare[0]||null,hat:q.hat[0]||null}}catch(e){console.warn('drum sounds did not load',e);return null}})();
 return PACKS[name]}
function dnaOf(id){id=clamp(Math.round(id),1,Math.max(1,PAT.length));const p=PAT[id-1]||{name:'',bpm:90,lanes:{}};
 return{id,stem:id-1,name:p.name,kitName:p.name,bpm:p.bpm,style:'ec',seed:id*131+7,hasHat:!!(p.lanes&&p.lanes.hat&&p.lanes.hat.some(r=>/[xXg]/.test(r)))}}

/* ================= the key of the sample ================= */
function keyOf(buf,ws,we){const sr=buf.sampleRate,L=buf.getChannelData(0),a=Math.floor(ws*sr),b=Math.min(buf.length,Math.floor(Math.min(we,ws+8)*sr)),ds=4,n=Math.floor((b-a)/ds);if(n<2000)return{pc:9,mode:'minor',name:'A minor',guess:true};
 const x=new Float32Array(n);for(let i=0;i<n;i++){const o=a+i*ds;x[i]=(L[o]+L[o+1]+L[o+2]+L[o+3])/4}const fs=sr/ds,chroma=new Float32Array(12);
 for(let m=45;m<=81;m++){const f=440*Math.pow(2,(m-69)/12);if(f>fs/2-150)continue;const w=2*Math.PI*f/fs,c=2*Math.cos(w);let s1=0,s2=0;for(let i=0;i<n;i++){const s0=x[i]+c*s1-s2;s2=s1;s1=s0}chroma[m%12]+=Math.sqrt(Math.max(0,s1*s1+s2*s2-c*s1*s2))/n}
 const maj=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],min=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17],NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
 const corr=(p,r)=>{let ma=0,mb=0;for(let i=0;i<12;i++){ma+=chroma[(i+r)%12];mb+=p[i]}ma/=12;mb/=12;let sx=0,sa=0,sb=0;for(let i=0;i<12;i++){const u=chroma[(i+r)%12]-ma,v=p[i]-mb;sx+=u*v;sa+=u*u;sb+=v*v}return sx/Math.sqrt(sa*sb+1e-12)};
 let best={s:-9,pc:9,mode:'minor'};for(let r=0;r<12;r++){const a1=corr(maj,r),a2=corr(min,r);if(a1>best.s)best={s:a1,pc:r,mode:'major'};if(a2>best.s)best={s:a2,pc:r,mode:'minor'}}
 return{pc:best.pc,mode:best.mode,name:NM[best.pc]+' '+best.mode,score:best.s}}
/* does the sample keep the same chord through its bars? (then whole-bar re-orders are safe) */
function chordUniform(buf,R){const sr=buf.sampleRate,L=buf.getChannelData(0),ds=4,nb=Math.max(1,Math.min(4,R.bars||4)),bar=R.bar||(R.we-R.ws)/nb,cs=[];
 for(let k=0;k<nb;k++){const a=Math.floor((R.ws+k*bar)*sr),n=Math.floor(Math.min(bar*sr,L.length-a)/ds);if(n<2000){cs.push(null);continue}const x=new Float32Array(n);for(let i=0;i<n;i++){const o=a+i*ds;x[i]=(L[o]+L[o+1]+L[o+2]+L[o+3])/4}const fs=sr/ds,ch=new Float32Array(12);
  for(let m=45;m<=81;m++){const f=440*Math.pow(2,(m-69)/12);if(f>fs/2-150)continue;const w=2*Math.PI*f/fs,c=2*Math.cos(w);let s1=0,s2=0;for(let i=0;i<n;i++){const s0=x[i]+c*s1-s2;s2=s1;s1=s0}ch[m%12]+=Math.sqrt(Math.max(0,s1*s1+s2*s2-c*s1*s2))/n}cs.push(ch)}
 const cos=(p,q)=>{let d=0,a=0,b=0;for(let i=0;i<12;i++){d+=p[i]*q[i];a+=p[i]*p[i];b+=q[i]*q[i]}return d/Math.sqrt(a*b+1e-12)},ok=cs.filter(Boolean);if(ok.length<2)return{uniform:true,sims:[]};
 const sims=ok.slice(1).map(c=>+cos(ok[0],c).toFixed(3));return{uniform:Math.min(...sims)>=.85,sims}}

/* ================= fitting the sample to the beat: WSOLA time stretch (keeps the pitch) =================
   ratio = new length / old length. Frames of 2048 samples are laid down every 1024 samples; each frame is taken from the place near the
   wanted spot that continues the previous frame most smoothly, so the hits stay sharp and the pitch does not move. Both channels share the same cuts. */
function stretch(buf,ratio){const sr=buf.sampleRate,C=buf.numberOfChannels,n=buf.length;if(Math.abs(ratio-1)<.0005){const o=new AudioBuffer({numberOfChannels:C,length:n,sampleRate:sr});for(let c=0;c<C;c++)o.copyToChannel(buf.getChannelData(c),c);return o}
 const outN=Math.max(64,Math.round(n*ratio)),N=2048,Hs=N>>1,Ha=Hs/ratio,tol=Math.round(sr*.008),Lc=1024,ch=[];for(let c=0;c<C;c++)ch.push(buf.getChannelData(c));
 const mono=new Float32Array(n);for(let i=0;i<n;i++){let s=0;for(let c=0;c<C;c++)s+=ch[c][i];mono[i]=s/C}
 const win=new Float32Array(N),win0=new Float32Array(N);for(let i=0;i<N;i++){win[i]=.5-.5*Math.cos(2*Math.PI*i/N);win0[i]=i<Hs?1:win[i]}
 const out=ch.map(()=>new Float32Array(outN+N*2)),add=(pos,at,w)=>{const m=Math.min(N,n-pos);for(let c=0;c<C;c++){const s=ch[c],o=out[c];for(let i=0;i<m;i++)o[at+i]+=w[i]*s[pos+i]}};
 add(0,0,win0);let pPrev=0;
 for(let k=1;k*Hs<outN;k++){const target=Math.round(k*Ha),nat=pPrev+Hs,maxPos=Math.max(0,n-N);let pos;
  if(nat+Lc>=n||target>=maxPos+tol){pos=clamp(target,0,maxPos)}
  else{const lo=Math.max(0,target-tol),hi=Math.min(maxPos,target+tol);if(hi<=lo)pos=clamp(target,0,maxPos);
   else{let eR=0;for(let i=0;i<Lc;i+=4)eR+=mono[nat+i]*mono[nat+i];let best=-1e9,bp=lo;
    for(let p=lo;p<=hi;p+=4){let d=0,e=1e-9;for(let i=0;i<Lc;i+=4){const v=mono[p+i];d+=v*mono[nat+i];e+=v*v}const sc=d/Math.sqrt(e*(eR+1e-9));if(sc>best){best=sc;bp=p}}
    best=-1e9;const l2=Math.max(lo,bp-4),h2=Math.min(hi,bp+4);pos=bp;
    for(let p=l2;p<=h2;p++){let d=0,e=1e-9;for(let i=0;i<Lc;i+=2){const v=mono[p+i];d+=v*mono[nat+i];e+=v*v}const sc=d/Math.sqrt(e*(eR+1e-9));if(sc>best){best=sc;pos=p}}}}
  add(pos,k*Hs,win);pPrev=pos}
 const o=new AudioBuffer({numberOfChannels:C,length:outN,sampleRate:sr});for(let c=0;c<C;c++)o.copyToChannel(out[c].subarray(0,outN),c);return o}

/* ================= chop programs: the same slices in a different order =================
   Slots (the exact positions of the slices inside a bar) never move; a program only changes which slice plays in a slot. A slice that stays in its own slot plays at its exact
   sample timing and length. 'safe' programs stay inside one bar (one chord); 'bar' programs move whole bars and are only used when the sample keeps the same chord. */
const RO=[null,
 {n:'Swap two neighbouring slices',bars:'one',safe:1},{n:'Rotate the bar by half',bars:'odd',safe:1},{n:'Last slice first',bars:'odd',safe:1},
 {n:'Skip one slice, play it at the end',bars:'one',safe:1},{n:'Echo the opening slice at the end',bars:'one',safe:1},{n:'Swap the slices in pairs',bars:'odd',safe:1},
 {n:'Swap bar 1 and 3, bar 2 and 4',bars:'all',safe:0},{n:'Alternate slices from two bars',bars:'odd',safe:0},{n:'Repeat bar 2 in bar 3',bars:'b2',safe:0},
 {n:'Strongest slice on the downbeat',bars:'all',safe:1},{n:'Build up: one slice, then two, then three',bars:'all',safe:1},{n:'Peel down: remove a slice each bar',bars:'all',safe:1},
 {n:'Only the strongest slices',bars:'all',safe:1},{n:'Reorder bars 1-3, keep bar 4',bars:'all',safe:0},
 {n:'Breathe: every other slice',bars:'odd',safe:1},{n:'Call and response',bars:'odd',safe:1},{n:'Stutter turnaround',bars:'b3',safe:1},{n:'Cut out for the fill',bars:'b3',safe:1}];
const RO_SAFE=RO.map((r,i)=>r&&r.safe?i:0).filter(Boolean),RO_ALL=RO.map((r,i)=>r?i:0).filter(Boolean);
function applies(id,b,cx){const w=RO[id].bars;return w==='all'||(w==='odd'&&b%2===1)||(w==='one'&&b===cx.pb)||(w==='b2'&&b===2)||(w==='b3'&&b===3)}
/* items: the slices of one bar [{n,tw,len,s}] sorted by time; returns placements [{n,tw,len,s}] for that bar */
function roBar(id,b,it,cx){const m=it.length;if(!m||!id||!applies(id,b,cx))return it;
 const gapOf=j=>(j<m-1?it[j+1].tw:cx.barLen)-it[j].tw,sl=order=>order.map((src,j)=>src?{n:src.n,tw:it[j].tw,len:src===it[j]?src.len:Math.min(src.len,Math.max(.05,gapOf(j))),s:src.s}:null).filter(Boolean),
  keep=a=>a.map(z=>({n:z.n,tw:z.tw,len:z.len,s:z.s})),ix=j=>it[((j%m)+m)%m],ord=it.map((_,j)=>j),B=k=>{const q=cx.bars[((k%4)+4)%4];return q&&q.length?q:it},top=()=>{let k=0;it.forEach((z,i)=>{if(z.s>it[k].s)k=i});return k};
 switch(id){
  case 1:{if(m<2)return it;const i=Math.floor(cx.rc()*(m-1)),o=ord.map(j=>it[j]);o[i]=it[i+1];o[i+1]=it[i];return sl(o)}
  case 2:return sl(ord.map(j=>ix(j+Math.floor(m/2))));
  case 3:return sl(ord.map(j=>ix(j-1)));
  case 4:{if(m<3)return it;const i=1+Math.floor(cx.rc()*(m-2)),o=ord.map(j=>it[j]);o[i]=null;o[m-1]=it[i];return sl(o)}
  case 5:{if(m<2)return it;const o=ord.map(j=>it[j]);o[m-1]=it[0];return sl(o)}
  case 6:return sl(ord.map(j=>(j^1)<m?it[j^1]:it[j]));
  case 7:return keep(B((b+2)%4));
  case 8:{const Bn=B(b+1);return sl(ord.map(j=>j%2===0?it[j]:Bn[j%Bn.length]))}
  case 9:return keep(B(1));
  case 10:{const k=top();if(!k)return it;const o=ord.map(j=>it[j]);o[0]=it[k];o[k]=it[0];return sl(o)}
  case 11:return keep(it.slice(0,Math.min(m,b+1)));
  case 12:return keep(it.slice(0,Math.max(1,m-b)));
  case 13:{const t3=it.slice().sort((x,y)=>y.s-x.s).slice(0,3);return keep(it.filter(z=>t3.includes(z)))}
  case 14:{if(b===3)return it;return keep(B(cx.perm[b]))}
  case 15:return keep(it.filter((z,i)=>i===0||i%2===0));
  case 16:{const t=it[top()],base=it.filter(z=>z.tw<cx.barLen/2||z===t),out=keep(base),rw=t.tw<cx.barLen/2?t.tw+cx.barLen/2:t.tw-cx.barLen/2;out.push({n:t.n,tw:rw,len:Math.min(t.len,cx.barLen/4),s:t.s});return out.sort((x,y)=>x.tw-y.tw)}
  case 17:{const t=it[top()],head=it.filter(z=>z.tw<cx.barLen*.625),out=keep(head);[12,13,14,15].forEach(w=>out.push({n:t.n,tw:w*cx.step,len:cx.step*.95,s:t.s}));return out}
  case 18:return keep(it.filter(z=>z.tw<cx.barLen*.75));
 }return it}
/* the chop part of one loop: every slice at its exact sample position, then a program applied on top */
function chopEvents(R,step,prog,seed){const barLen=16*step,loopLen=4*barLen,bars=[[],[],[],[]];
 R.slices.forEach((s,n)=>{const tn=s.t0-R.ws,b=Math.floor(tn/barLen+1e-6);if(b<0||b>3)return;bars[b].push({n,tw:tn-b*barLen,len:s.t1-s.t0,s:s.s||0})});bars.forEach(a=>a.sort((x,y)=>x.tw-y.tw));
 const rc=mul(seed+5),cx={barLen,step,bars,rc,pb:Math.floor(rc()*4),perm:[[1,2,0],[2,0,1],[2,1,0]][Math.floor(rc()*3)]},ev=[];
 for(let b=0;b<4;b++){const src=bars[b].length?bars[b]:[];roBar(prog,b,src,cx).forEach(z=>ev.push({t:b*barLen+z.tw,lane:'chop',vel:b===0?1:.94,n:z.n,len:z.len,bar:b}))}
 ev.sort((x,y)=>x.t-y.t);
 /* a slice must end where the next begins (6 ms overlap so the join is a crossfade), never overlap further, and two slices under 40 ms apart would flam: keep the later one */
 for(let i=ev.length-2;i>=0;i--)if(ev[i+1].t-ev[i].t<.04)ev.splice(i,1);
 ev.forEach((e,i)=>{const nx=i<ev.length-1?ev[i+1].t:loopLen+.5;e.len=Math.max(.04,Math.min(e.len,nx-e.t+.006))});
 return ev}

/* ================= the plan: every event of one 4-bar loop ================= */
function plan(dna,R,opt){opt=opt||{};const bpm=R.bpmX||R.bpm,step=60/bpm/4,p=PAT[dna.stem],L=(p&&p.lanes)||{},ev=[];
 const VEL={kick:{X:1,x:.86,g:.42},snare:{X:1,x:.86,g:.42},hat:{X:.85,x:.62,g:.36}};
 for(const lane of ['kick','snare','hat']){const rows=L[lane]||[];if(!rows.length)continue;for(let b=0;b<4;b++){const row=rows[b%rows.length]||'';for(let s=0;s<16;s++){const c=row[s];if(!c||c==='.')continue;ev.push({t:(b*16+s)*step,lane,vel:VEL[lane][c]||.7,bar:b,step:s})}}}
 const prog=opt.prog|0,chops=chopEvents(R,step,prog,dna.seed+(opt.seedAdd|0));
 return{events:ev.concat(chops).sort((a,b)=>a.t-b.t),bpm,step,loopLen:64*step,dna,prog,progName:prog?RO[prog].n:'The original phrase'}}
/* one plan for each loop of an episode: loop 1 is the original phrase, every 4th loop returns to it, the others each get a different program (a new set for every session seed) */
function pickProgs(n,allowed,seed){const r=mul(seed),pool=[],out=[0];let prev=0;for(let q=1;q<n;q++){if(q%4===0||!allowed.length){out.push(0);continue}if(!pool.length)pool.push(...shuffle(allowed.slice(),r));let k=pool.pop();if(k===prev&&pool.length)k=pool.shift()||k;out.push(k);prev=k}return out}
function planLoops(dna,R,opt){opt=opt||{};const n=opt.n||2,allowed=(opt.allow||RO_ALL).filter(i=>RO[i]&&(!opt.safeOnly||RO[i].safe)),progs=opt.vary===false?new Array(n).fill(0):pickProgs(n,allowed,opt.session||1);return{plans:progs.map(g=>plan(dna,R,{prog:g,seedAdd:opt.session||0})),progs}}

/* ================= the sound: clean ================= */
function setup(ctx,dna){const sr=ctx.sampleRate,rn=mul(dna.seed+99),nb=ctx.createBuffer(1,Math.floor(sr*.8),sr),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rn()*2-1;
 const pack=PACKR[PAT[dna.stem]&&PAT[dna.stem].pack]||null,bus=ctx.createGain(),lim=ctx.createDynamicsCompressor(),out=ctx.createGain();
 /* a transparent peak limiter: it only acts on the loudest peaks (no saturation, no squash) */
 lim.threshold.value=-4;lim.knee.value=3;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.09;out.gain.value=1;bus.connect(lim);lim.connect(out);out.connect(ctx.destination);
 const chopBus=ctx.createGain();chopBus.gain.value=.62;chopBus.connect(bus);
 return{ctx,nb,bus,chopBus,pack,og:null}}
const noiseAt=(G,t,dur)=>{const s=G.ctx.createBufferSource();s.buffer=G.nb;s.start(t,Math.random()*.3,dur);return s};
function hit(G,t,v,e,gain){if(!G.pack||!e)return;const x=G.ctx,s=x.createBufferSource();s.buffer=G.pack.buf;const g=x.createGain();g.gain.value=Math.max(.0001,v*gain);s.connect(g);g.connect(G.bus);s.start(t,e.o,e.d+.01)}
const vKick=(G,t,v)=>hit(G,t,v,G.pack&&G.pack.kick,.78),vSnare=(G,t,v)=>hit(G,t,v,G.pack&&G.pack.snare,.66),vHat=(G,t,v)=>hit(G,t,v,G.pack&&G.pack.hat,.42);
/* a chop: 2 ms in, and a 6 ms fade at the end that overlaps the next slice's attack (a clean join) */
function vChop(G,buf,sl,t,len,v){const x=G.ctx,s=x.createBufferSource();s.buffer=buf;const g=x.createGain(),end=t+len,rel=.006;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.002);g.gain.setValueAtTime(v,Math.max(t+.003,end-rel));g.gain.linearRampToValueAtTime(.0001,end);s.connect(g);g.connect(G.chopBus);s.start(t,sl.t0,len+.02);s.stop(end+.02)}
const peakNorm=(out,to)=>{let pk=0;for(let c=0;c<out.numberOfChannels;c++){const d=out.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a}}const k=pk>.0001?to/pk:1;for(let c=0;c<out.numberOfChannels;c++){const d=out.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=k}return out};

/* ================= render plans to audio (plans: one plan, or one per loop) ================= */
async function render(buf,R,plans,opt){opt=opt||{};const pl=Array.isArray(plans)?plans:[plans],first=pl[0],loops=opt.loops||pl.length||2,sr=44100,total=loops*first.loopLen+1.6;await loadPack(first.dna);
 const ctx=new OfflineAudioContext(2,Math.ceil(total*sr),sr),G=setup(ctx,first.dna);
 for(let l=0;l<loops;l++){const P=pl[l%pl.length],off=l*first.loopLen;for(const e of P.events){const t=off+e.t;if(e.lane==='kick')vKick(G,t,e.vel);else if(e.lane==='snare')vSnare(G,t,e.vel);else if(e.lane==='hat')vHat(G,t,e.vel);else if(e.lane==='chop')vChop(G,buf,R.slices[e.n],t,e.len,e.vel)}}
 const raw=await ctx.startRendering();return opt.raw?raw:peakNorm(raw,.9)}
function wav(buf){const n=buf.length,ch=buf.numberOfChannels,a=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)a.setUint8(o+i,s.charCodeAt(i))};w(0,'RIFF');a.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');a.setUint32(16,16,true);a.setUint16(20,1,true);a.setUint16(22,ch,true);a.setUint32(24,buf.sampleRate,true);a.setUint32(28,buf.sampleRate*ch*2,true);a.setUint16(32,ch*2,true);a.setUint16(34,16,true);w(36,'data');a.setUint32(40,n*ch*2,true);
 const d=[];for(let c=0;c<ch;c++)d.push(buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,d[c][i]));a.setInt16(o,v<0?v*32768:v*32767,true);o+=2}return new Blob([a.buffer],{type:'audio/wav'})}

window.MZMpcDrums={get COUNT(){return PAT.length},pat:i=>PAT[i-1],dnaOf,plan,planLoops,pickProgs,render,keyOf,chordUniform,stretch,wav,loadPack,loadPatterns,RO,RO_SAFE,RO_ALL,peakNorm,
 engine:{setup,vKick,vSnare,vHat,vChop,noiseAt}};
})();
