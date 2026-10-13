/* MZPRD MPC studio: SAMPLE TO BEAT, stage 2 = drums and 300 variations. The drum sounds are the user's own pack (mpc/drums.ogg + drums.json, built by tools/make_drumpack.py); the synthesized drums below are only a fallback if that file cannot load.
   - 10 synthesized drum kits: 5 trap (808s, snappy snare + clap, fast hats) and 5 East Coast (dusty kick, cracking snare, loose swung hats, vinyl crackle, tape)
   - hand-written pattern parts (kick, snare, hat motifs and fills) for each style that combine into 150 trap + 150 East Coast variations
   - each variation is a "plan": a list of timed events (which drum, which chop, how hard, when). The audio is rendered from the plan, and stage 3
     will drive the MPC video from the very same plan, so every pad press matches what you hear exactly. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mul=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const pick=(r,a)=>a[Math.floor(r()*a.length)];

/* ================= kits ================= */
const KITS=[
 {id:'T1',style:'trap',n:'SUB HEAVY',b:{len:1.5,drive:.12,tri:0},sn:{tone:185,noise:.85,dec:.17,clap:.85,hi:5200},hat:{hp:8000,dec:.04,open:.22,gain:.34},lp:17000},
 {id:'T2',style:'trap',n:'DISTORTED 808',b:{len:1.2,drive:.7,tri:.3},sn:{tone:200,noise:.9,dec:.14,clap:.7,hi:6000},hat:{hp:9000,dec:.035,open:.2,gain:.32},lp:16000},
 {id:'T3',style:'trap',n:'CLEAN LONG',b:{len:2.2,drive:.04,tri:0},sn:{tone:175,noise:.75,dec:.2,clap:1,hi:4500},hat:{hp:7000,dec:.05,open:.3,gain:.36},lp:17000},
 {id:'T4',style:'trap',n:'SHORT PUNCH',b:{len:.6,drive:.3,tri:.15},sn:{tone:210,noise:.95,dec:.11,clap:.6,hi:6500},hat:{hp:9500,dec:.03,open:.18,gain:.3},lp:18000},
 {id:'T5',style:'trap',n:'DARK DRILL',b:{len:1.8,drive:.45,tri:.2},sn:{tone:165,noise:.7,dec:.22,clap:.9,hi:4000},hat:{hp:6500,dec:.045,open:.34,gain:.38},lp:12000},
 {id:'E1',style:'ec',n:'DUSTY',k:{f0:50,drop:90,dec:.26,click:.25,sat:.4},sn:{tone:190,noise:.8,dec:.22,room:.3,hi:3600},hat:{hp:5500,dec:.05,open:.2,gain:.3},crackle:.07,lp:7500,tape:.5},
 {id:'E2',style:'ec',n:'PUNCHY',k:{f0:56,drop:120,dec:.2,click:.4,sat:.25},sn:{tone:205,noise:.95,dec:.18,room:.2,hi:5000},hat:{hp:7000,dec:.04,open:.18,gain:.32},crackle:.02,lp:12000,tape:.2},
 {id:'E3',style:'ec',n:'CRISP',k:{f0:58,drop:100,dec:.18,click:.45,sat:.15},sn:{tone:215,noise:1,dec:.15,room:.12,hi:6200},hat:{hp:8000,dec:.035,open:.16,gain:.34},crackle:0,lp:15000,tape:.1},
 {id:'E4',style:'ec',n:'LO-FI',k:{f0:48,drop:70,dec:.3,click:.12,sat:.55},sn:{tone:180,noise:.65,dec:.26,room:.35,hi:2800},hat:{hp:4500,dec:.06,open:.24,gain:.26},crackle:.1,lp:5200,tape:.8},
 {id:'E5',style:'ec',n:'TAPE',k:{f0:52,drop:95,dec:.23,click:.2,sat:.6},sn:{tone:195,noise:.85,dec:.2,room:.28,hi:3800},hat:{hp:6000,dec:.045,open:.2,gain:.3},crackle:.05,lp:8800,tape:1}];

/* ================= pattern parts (16 steps per bar; x normal, X accent, g ghost, o open hat, r double, t triplet) ================= */
const E4=()=>({kick:[],snare:[],hat:[],fill:[]});
const P={trap:E4(),ec:E4()};   /* patterns removed on purpose: the new ones will be made from the user's own drum loops (converted to MIDI) */
const BB=[],BBFILL=[];
const strOf=(steps,ch,base)=>{const q=(base||'................').split('');steps.forEach(i=>q[i]=ch);return q.join('')};
function bbBars(dna){const p=PAT[dna.stem];if(!p)return[];const L=p.lanes,out=[];for(let i=0;i<4;i++){const g=a=>(a&&a[i%a.length])||'................';out.push({k:g(L.kick),s:g(L.snare),h:g(L.hat)})}return out}
const STEPSETS=[[0,4,8,12],[0,3,6,10,12],[0,6,10],[0,2,4,8,10,12],[0,4,6,8,14],[0,5,8,13],[0,3,8,11]];
const MINOR=[0,0,0,3,5,7,10,-2,-5,12],MAJOR=[0,0,0,4,5,7,9,-3,-5,12];

/* ================= the key of the sample (for the 808) ================= */
function keyOf(buf,ws,we){const sr=buf.sampleRate,L=buf.getChannelData(0),a=Math.floor(ws*sr),b=Math.min(buf.length,Math.floor(Math.min(we,ws+8)*sr)),ds=4,n=Math.floor((b-a)/ds);if(n<2000)return{pc:9,mode:'minor',name:'A minor',guess:true};
 const x=new Float32Array(n);for(let i=0;i<n;i++){const o=a+i*ds;x[i]=(L[o]+L[o+1]+L[o+2]+L[o+3])/4}const fs=sr/ds,chroma=new Float32Array(12);
 for(let m=45;m<=81;m++){const f=440*Math.pow(2,(m-69)/12);if(f>fs/2-150)continue;const w=2*Math.PI*f/fs,c=2*Math.cos(w);let s1=0,s2=0;for(let i=0;i<n;i++){const s0=x[i]+c*s1-s2;s2=s1;s1=s0}chroma[m%12]+=Math.sqrt(Math.max(0,s1*s1+s2*s2-c*s1*s2))/n}
 const maj=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],min=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17],NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
 const corr=(p,r)=>{let ma=0,mb=0;for(let i=0;i<12;i++){ma+=chroma[(i+r)%12];mb+=p[i]}ma/=12;mb/=12;let sx=0,sa=0,sb=0;for(let i=0;i<12;i++){const u=chroma[(i+r)%12]-ma,v=p[i]-mb;sx+=u*v;sa+=u*u;sb+=v*v}return sx/Math.sqrt(sa*sb+1e-12)};
 let best={s:-9,pc:9,mode:'minor'};for(let r=0;r<12;r++){const a1=corr(maj,r),a2=corr(min,r);if(a1>best.s)best={s:a1,pc:r,mode:'major'};if(a2>best.s)best={s:a2,pc:r,mode:'minor'}}
 return{pc:best.pc,mode:best.mode,name:NM[best.pc]+' '+best.mode,score:best.s}}

/* ================= a variation ("DNA"), picked from the id ================= */
const COUNT=0,HALF=0;   /* the pattern list comes from mpc/patterns.json (made by tools/stems_to_pattern.py) */
function dnaOf(id){id=clamp(Math.round(id),1,Math.max(1,PAT.length));
 if(PAT.length){const si=id-1,p=PAT[si],r=mul(id*7919+5),kits=KITS.filter(k=>k.style==='ec'),kit=KITS.indexOf(kits[si%kits.length]),mr=r();
  return{id,style:'ec',stem:si,bb:{s:0,stem:1},kit,kick:0,snare:0,hat:0,fill:0,swing:50,late:0,mode:mr<.4?'loop':mr<.8?'flip':'sparse',steps:Math.floor(r()*STEPSETS.length),hum:0,seed:id*131+7,alt:false,bassSeed:0,reverse:false,kitName:p.name}}

 if(id>HALF){const j=id-HALF-1,r=mul(id*7919+97),si=j%BB.length,S=BB[si],kits=KITS.filter(k=>k.style==='ec'),kit=KITS.indexOf(kits[Math.floor(j/BB.length+j*.37)%kits.length]),mr=r();
  const bb={s:si,k:Math.floor(j/BB.length)%S.kick.length,g:Math.floor(r()*S.gh.length),h:Math.floor(r()*S.hat.length),f:r()<.55?Math.floor(r()*BBFILL.length):-1};
  return{id,style:'ec',bb,kit,kick:bb.k,snare:0,hat:bb.h,fill:Math.max(0,bb.f),swing:pick(r,S.sw),late:S.late,mode:mr<.4?'loop':mr<.8?'flip':'sparse',steps:Math.floor(r()*STEPSETS.length),hum:S.late>.01?7:4,seed:id*131+7,alt:r()<.5,bassSeed:0,reverse:r()<.12,kitName:S.n+' / '+KITS[kit].n}}
 const trap=true,j=id-1,st='trap',r=mul(id*7919+11),PP=P[st],kits=KITS.filter(k=>k.style===st);
 const kick=j%PP.kick.length,hat=(Math.floor(j/PP.kick.length)*3+j%7)%PP.hat.length,snare=(j+Math.floor(j/5))%PP.snare.length,fill=Math.floor(r()*PP.fill.length),kit=KITS.indexOf(kits[(j+Math.floor(j/3))%kits.length]);
 const swing=pick(r,[50,50,52,54,56]),mr=r(),mode=mr<.3?'loop':mr<.8?'flip':'sparse';
 return{id,style:st,kit,kick,snare,hat,fill,swing,mode,steps:Math.floor(r()*STEPSETS.length),hum:3,seed:id*131+7,alt:r()<.6,bassSeed:Math.floor(r()*1e6),reverse:r()<.12,kitName:KITS[kit].n}}

/* does the sample keep the same chord through its bars? (then whole-bar re-orders are safe) */
function chordUniform(buf,Rr){const sr=buf.sampleRate,L=buf.getChannelData(0),ds=4,nb=Math.max(1,Math.min(4,Rr.bars||4)),bar=Rr.bar||(Rr.we-Rr.ws)/nb,cs=[];
 for(let k=0;k<nb;k++){const a=Math.floor((Rr.ws+k*bar)*sr),n=Math.floor(Math.min(bar*sr,L.length-a)/ds);if(n<2000){cs.push(null);continue}const x=new Float32Array(n);for(let i=0;i<n;i++){const o=a+i*ds;x[i]=(L[o]+L[o+1]+L[o+2]+L[o+3])/4}const fs=sr/ds,ch=new Float32Array(12);
  for(let m=45;m<=81;m++){const f=440*Math.pow(2,(m-69)/12);if(f>fs/2-150)continue;const w=2*Math.PI*f/fs,c=2*Math.cos(w);let s1=0,s2=0;for(let i=0;i<n;i++){const s0=x[i]+c*s1-s2;s2=s1;s1=s0}ch[m%12]+=Math.sqrt(Math.max(0,s1*s1+s2*s2-c*s1*s2))/n}cs.push(ch)}
 const cos=(p,q)=>{let d=0,a=0,b=0;for(let i=0;i<12;i++){d+=p[i]*q[i];a+=p[i]*p[i];b+=q[i]*q[i]}return d/Math.sqrt(a*b+1e-12)},ok=cs.filter(Boolean);if(ok.length<2)return{uniform:true,sims:[]};
 const sims=ok.slice(1).map(c=>+cos(ok[0],c).toFixed(3));return{uniform:Math.min(...sims)>=.85,sims}}
/* ================= the plan: every event of one 4-bar loop ================= */
function parseLane(str,bar,lane,out,step,sw,jit,r,velMul){for(let s=0;s<16;s++){const c=str[s];if(c==='.'||!c)continue;const base=(bar*16+s)*step+((s%2)?(2*sw/100-1)*step:0),vel=({x:.78,X:1,g:.34,o:.8,r:.8,t:.78}[c]||.8)*(velMul||1)*(1-.06*r());
  const add=(dt,v,kind)=>out.push({t:Math.max(0,base+dt+(r()-.5)*jit*.002),lane:kind||lane,vel:clamp(v,.1,1),bar,step:s});
  if(c==='r'){add(0,vel);add(step*.5,vel*.8)}else if(c==='t'){add(0,vel*.8);add(step/3,vel*.9);add(step*2/3,vel)}else if(c==='o')add(0,vel,'open');else add(0,vel)}}
/* ================= chop order variations (optional): the same slices in a different order. Slots (the grid positions of the slices) stay where they are; only which slice plays in a slot changes, a slice that stays in its own slot keeps its exact sample timing, and plan() trims every chop so none overlaps the next. 'safe' ones stay inside one bar (one chord); 'bar' ones move whole bars and are only used when the sample keeps the same chord. ================= */
const RO=[null,
 {n:'Swap two neighbouring slices',g:'light',bars:'one'},{n:'Rotate the bar by one slice',g:'light',bars:'odd'},{n:'Rotate the bar by half',g:'light',bars:'odd'},{n:'Last slice first',g:'light',bars:'odd'},
 {n:'Skip one slice, play it at the end',g:'light',bars:'one'},{n:'Echo the opening slice at the end',g:'light',bars:'one'},{n:'Swap the slices in pairs',g:'light',bars:'odd'},{n:'Mirror the first half',g:'light',bars:'odd'},
 {n:'Swap bar 1 and 3, bar 2 and 4',g:'medium',bars:'all',bar:1},{n:'Question and answer (bar 2 plays bar 1 backwards)',g:'medium',bars:'b1'},{n:'Play the bars back to front',g:'medium',bars:'all',bar:1},{n:'Alternate slices from two bars',g:'medium',bars:'odd',bar:1},
 {n:'First half of bar 1, then of bar 3',g:'medium',bars:'b1',bar:1},{n:'Repeat bar 2 in bar 3',g:'medium',bars:'b2',bar:1},{n:'Strongest slice on the downbeat',g:'medium',bars:'all'},{n:'Start the phrase on beat 2',g:'medium',bars:'odd'},
 {n:'Build up: one slice, then two, then three',g:'bigger',bars:'all'},{n:'Peel down: remove a slice each bar',g:'bigger',bars:'all'},{n:'Only the strongest slices',g:'bigger',bars:'all'},{n:'Reorder bars 1-3, keep bar 4',g:'bigger',bars:'all',bar:1}];
const RO_SAFE=[1,2,3,4,5,6,7,8,10,15,16,17,18,19];   /* stay inside one bar; the rest move whole bars */
function roOrder(id,b,sb,items,cx){const m=items.length;if(!m)return items;const slots=items.map(z=>z.w),R=RO[id],aff=R.bars==='all'||(R.bars==='odd'&&b%2===1)||(R.bars==='one'&&b===cx.pb)||(R.bars==='b1'&&b===1)||(R.bars==='b2'&&b===2);if(!aff)return items;
 const mk=order=>order.map((src,j)=>src?{n:src.n,w:slots[j],len:src.len,s:src.s,dt:src===items[j]?src.dt:undefined}:null).filter(Boolean),keep=a=>a.map(z=>({n:z.n,w:z.w,len:z.len,s:z.s,dt:z.dt})),idx=j=>items[((j%m)+m)%m],B=k=>{const q=cx.barItems(((k%cx.nb)+cx.nb)%cx.nb);return q.length?q:items},ord=items.map((_,j)=>j);
 const strongest=()=>{let k=0;items.forEach((z,i)=>{if(z.s>items[k].s)k=i});return k};
 switch(id){
  case 1:{if(m<2)return items;const i=Math.floor(cx.rc()*(m-1)),o=ord.map(j=>items[j]);o[i]=items[i+1];o[i+1]=items[i];return mk(o)}
  case 2:return mk(ord.map(j=>idx(j+1)));
  case 3:return mk(ord.map(j=>idx(j+Math.floor(m/2))));
  case 4:return mk(ord.map(j=>idx(j-1)));
  case 5:{if(m<3)return items;const i=1+Math.floor(cx.rc()*(m-2)),o=ord.map(j=>items[j]);o[i]=null;o[m-1]=items[i];return mk(o)}
  case 6:{if(m<2)return items;const o=ord.map(j=>items[j]);o[m-1]=items[0];return mk(o)}
  case 7:return mk(ord.map(j=>(j^1)<m?items[j^1]:items[j]));
  case 8:{if(m<4)return items;const h=Math.ceil(m/2),o=ord.map(j=>items[j]);for(let t=0;t<m-h;t++)o[h+t]=items[h-1-t];return mk(o)}
  case 9:{if(cx.nb<2)return items;return keep(B((b+2)%4))}
  case 10:{return mk(ord.map(j=>items[m-1-j]))}
  case 11:return keep(B(3-b));
  case 12:{const Bn=B(sb+1);return mk(ord.map(j=>j%2===0?items[j]:Bn[j%Bn.length]))}
  case 13:{const Bn=B(sb+2).filter(z=>z.w<8),hi=items.filter(z=>z.w>=8),lo=items.filter(z=>z.w<8);const out=keep(lo);hi.forEach((z,i)=>{const q=Bn[i];if(q)out.push({n:q.n,w:z.w,len:q.len,s:q.s,dt:undefined})});return out}
  case 14:return keep(B(1));
  case 15:{const k=strongest();if(k===0)return items;const o=ord.map(j=>items[j]);o[0]=items[k];o[k]=items[0];return mk(o)}
  case 16:{const k=Math.max(1,items.filter(z=>z.w<4).length);return mk(ord.map(j=>idx(j+k)))}
  case 17:return keep(items.slice(0,Math.min(m,b+1)));
  case 18:return keep(items.slice(0,Math.max(1,m-b)));
  case 19:{const top=items.slice().sort((x,y)=>y.s-x.s).slice(0,3);return keep(items.filter(z=>top.includes(z)))}
  case 20:{if(b===3||cx.nb<2)return items;return keep(B(cx.perm[b]))}
 }return items}
function plan(dna,Rr,keyInfo){const bpm=Rr.bpmX||Rr.bpm,step=60/bpm/4,r=mul(dna.seed),kit=KITS[dna.kit],trap=dna.style==='trap',PP=P[dna.pool||dna.style],ev=[],jit=dna.hum,rr=dna.stem!==undefined?(()=>.5):r;   /* your beats: no swing, no random timing or loudness, so the loop is exact */
 const kickBars=[],snareBars=[],hatBars=[];
 const BBB=dna.bb?bbBars(dna):null;
 for(let b=0;b<4;b++){let k=PP.kick[dna.kick]||'',s=PP.snare[dna.snare]||'',h=PP.hat[dna.hat]||'';
  if(BBB){}else if(b===3){const f=PP.fill[dna.fill];k=f.k;s=f.s;h=f.h}else if(b===1&&dna.alt){const q=k.split('');const i=q.indexOf('x',3);if(i>0&&i<15&&q[i+1]==='.'){q[i]='.';q[i+1]='x'}k=q.join('')}
  if(BBB){k=BBB[b].k;s=BBB[b].s;h=BBB[b].h}
  kickBars.push(k);snareBars.push(s);hatBars.push(h);
  parseLane(k,b,'kick',ev,step,dna.swing,jit,rr,trap?.6:dna.bb?.92:1);const n0=ev.length;parseLane(s,b,'snare',ev,step,dna.swing,jit,rr,1);if(dna.late)for(let q=n0;q<ev.length;q++)ev[q].t+=dna.late;parseLane(h,b,'hat',ev,step,dna.swing,jit,rr,dna.bb?(dna.stem!==undefined?1:BB[dna.bb.s].hg):1)}
 /* the 808 follows the kicks (trap only) */
 if(trap){const key=keyInfo||{pc:9,mode:'minor'},midi=28+((key.pc-4+12)%12),scale=key.mode==='major'?MAJOR:MINOR,rb=mul(dna.bassSeed),kicks=ev.filter(e=>e.lane==='kick').sort((a,b)=>a.t-b.t);let prev=null;
  kicks.forEach((k,i)=>{const nxt=i<kicks.length-1?kicks[i+1].t:4*16*step,semi=i===0?0:pick(rb,scale),m=midi+semi,f=440*Math.pow(2,(m-69)/12),len=Math.min(kit.b.len,Math.max(.14,nxt-k.t-.01)),slide=prev!==null&&rb()<.22?prev:0;
   ev.push({t:k.t,lane:'b808',vel:clamp(k.vel/.6*.92,.5,1),len,freq:f,slideFrom:slide,semi,bar:k.bar,step:k.step});prev=f})}
 /* the chops: each slice goes back where it sits in the sample (so the phrase fits the drums), then the bars are flipped on purpose: drop to breathe, call and response, swap in another phrase, stutter turnaround */
 const sl=Rr.slices,N=sl.length,chops=[],nb=Math.max(1,Math.min(4,Rr.bars||4)),rc=mul(dna.seed+5);let CM=dna.mode;
 const nat=[];sl.forEach((q,n)=>{const st=clamp(Math.round((q.t0-Rr.ws)/step),0,nb*16-1);if(!nat.some(z=>z.st===st))nat.push({n,st,s:q.s||0,len:q.t1-q.t0,dt:(q.t0-Rr.ws)-st*step})});
 const barItems=sb=>nat.filter(z=>Math.floor(z.st/16)===sb).map(z=>({n:z.n,w:z.st%16,s:z.s,len:z.len,dt:z.dt}));
 /* a slice that sits where it was in the sample plays at its exact original time and length (sample-accurate); a moved slice snaps to the grid */
 const put=(b,it,nx,vel,lenSteps)=>{const ex=it.dt!==undefined,t=(b*16+it.w)*step+(ex?it.dt:((it.w%2)?(2*dna.swing/100-1)*step:0)),ls=lenSteps||Math.max(1,(nx===undefined?16:nx)-it.w);chops.push({t:Math.max(0,t),lane:'chop',vel,n:it.n,len:Math.max(.08,ex?it.len:Math.min(it.len,ls*step*1.02)),bar:b,step:it.w})};
 const play=(b,items,vel)=>items.forEach((it,i)=>put(b,it,i<items.length-1?items[i+1].w:16,vel));
 if(CM==='loop'){chops.push({t:0,lane:'loop',vel:1,len:Math.min(Rr.bars,4)*4*16*step/4*1,bar:0,step:0})}
 else{let v1=Math.floor(rc()*3),v3=Math.floor(rc()*3);if(dna.fv!==undefined){v1=dna.fv%3;v3=(dna.fv*2+1)%3}   /* flip loops walk through every variation in turn */
  
  const rocx={barItems,nb,rc:mul(dna.seed+77),pb:(dna.seed>>3)%4,perm:[[1,2,0],[2,0,1],[2,1,0]][(dna.seed>>5)%3]};
  for(let b=0;b<4;b++){const sb=b%nb;let it=barItems(sb);if(!it.length)it=barItems(0);if(!it.length)continue;
   if(dna.ro&&CM==='flip'){play(b,roOrder(dna.ro,b,sb,it,rocx),b===0?1:.92);continue}
   if(CM==='sparse'){if(b%2===1)continue;const top=it.slice().sort((x,y)=>y.s-x.s).slice(0,2).sort((x,y)=>x.w-y.w);top.forEach((z,i)=>put(b,z,i<top.length-1?top[i+1].w:16,b===0&&i===0?1:.88));continue}
   if(b===0||b===2){play(b,it,b===0?1:.92);continue}
   if(b===1){if(v1===0){const k=it.filter((z,i)=>i===0||i%2===0);play(b,k,.9)}                      /* breathe: every other slice */
    else if(v1===1){const top=it.slice().sort((x,y)=>y.s-x.s)[0],base=it.filter(z=>z.w<8||z===top);play(b,base,.92);const rw=top.w<8?top.w+8:top.w-8;put(b,{n:top.n,w:rw,len:top.len},Math.min(16,rw+4),.82)}  /* call and response */
    else{const alt=barItems((sb+1)%nb);play(b,alt.length?alt:it,.9)}continue}                          /* a different phrase */
   if(b===3){if(v3===0){const top=it.slice().sort((x,y)=>y.s-x.s)[0],head=it.filter(z=>z.w<10);play(b,head,.92);[12,13,14,15].forEach((w,i)=>put(b,{n:top.n,w,len:top.len},w+1,.7+.1*i,1))}   /* stutter turnaround */
    else if(v3===1)play(b,it.filter(z=>z.w<12),.9);else play(b,it,.9)}}}
 /* every chop must end where the next one starts (or at the loop end), so variations never overlap or run into the next loop */
 {const cs=chops.filter(c=>c.lane==='chop').sort((a,b)=>a.t-b.t),LL=64*step;for(let i=cs.length-2;i>=0;i--)if(cs[i+1].t-cs[i].t<.05){chops.splice(chops.indexOf(cs[i]),1);cs.splice(i,1)}   /* two slices under 50 ms apart would flam: keep the later one */
  cs.forEach((c,i)=>{const nx=i<cs.length-1?cs[i+1].t:LL;c.len=Math.max(.04,Math.min(c.len,nx-c.t-.002))})}
 return{events:ev.concat(chops).sort((a,b)=>a.t-b.t),bpm,step,loopLen:64*step,dna,kit:dna.kit,key:keyInfo||null,chopMode:CM}}

/* ================= the user's drum pack ================= */
let PACK=null,PATP=null,PAT=[];const PACKS={};
function loadPatterns(){return PATP=PATP||fetch(new URL('mpc/patterns.json?v=5',document.baseURI).href).then(r=>r.ok?r.json():[]).catch(()=>[]).then(p=>(PAT=p))}
/* every pattern brings its own one-shots (mpc/stems/<name>.ogg + .json, cut from its own stems); loadPack(dna) makes that beat's sounds the current ones */
async function loadPack(dna){await loadPatterns();if(!dna||dna.stem===undefined||!PAT[dna.stem])return PACK;const name=PAT[dna.stem].pack;
 if(!PACKS[name])PACKS[name]=(async()=>{try{const u=n=>new URL('mpc/'+n,document.baseURI).href,[ab,q]=await Promise.all([fetch(u(name+'.ogg?v=4')).then(r=>r.arrayBuffer()),fetch(u(name+'.json?v=4')).then(r=>r.json())]),buf=await new OfflineAudioContext(1,1,44100).decodeAudioData(ab);
  return{buf,meta:q,stem:true,pools:{bb:{kick:q.kick,snare:q.snare,hat:q.hat},clap:[{o:0,d:.01}],open:q.hat,attack:q.kick,kick:{short:q.kick,any:q.kick,long:q.kick},snare:{dark:q.snare,mid:q.snare,bright:q.snare},hat:{dark:q.hat,mid:q.hat,bright:q.hat}}}}catch(e){console.warn('drum sounds did not load',e);return null}})();
 PACK=await PACKS[name];return PACK}
/* what each kit asks of the pack: brightness of snare and hats, kick length, and how much clap sits on the snare */
const KP={T1:{sn:'mid',ht:'bright',kk:'short',cl:.8},T2:{sn:'bright',ht:'bright',kk:'short',cl:.7},T3:{sn:'mid',ht:'mid',kk:'any',cl:.95},T4:{sn:'bright',ht:'bright',kk:'short',cl:.55},T5:{sn:'dark',ht:'mid',kk:'any',cl:.9},
 E1:{sn:'dark',ht:'dark',kk:'short',cl:0},E2:{sn:'bright',ht:'mid',kk:'long',cl:0},E3:{sn:'bright',ht:'bright',kk:'short',cl:0},E4:{sn:'dark',ht:'dark',kk:'any',cl:0},E5:{sn:'mid',ht:'dark',kk:'any',cl:0}};
function soundsOf(dna){if(!PACK)return null;const kit=KITS[dna.kit],kp=KP[kit.id],r=mul(dna.seed+4242),pl=PACK.pools,pk=a=>a[Math.floor(r()*a.length)];
 if(dna.bb)return{bb:1,kick:pk(pl.bb.kick),snare:pk(pl.bb.snare),clap:pk(pl.clap),hat:pk(pl.bb.hat),open:pk(pl.open),attack:pk(pl.attack),clapMix:0};
 return{kick:pk(pl.kick[kp.kk]),snare:pk(pl.snare[kp.sn]),clap:pk(pl.clap),hat:pk(pl.hat[kp.ht]),open:pk(pl.open),attack:pk(pl.attack),clapMix:kp.cl}}

/* ================= the drum voices ================= */
/* a hit from the pack */
function hit(G,t,v,e,gain,rate){const x=G.ctx,s=x.createBufferSource();s.buffer=G.pack.buf;if(rate)s.playbackRate.value=rate;const g=x.createGain();g.gain.value=Math.max(.0001,v*gain);s.connect(g);g.connect(G.bus);s.start(t,e.o,e.d+.01);return g}
function hitF(G,t,v,e,gain,hp,lp,rate){const x=G.ctx,s=x.createBufferSource();s.buffer=G.pack.buf;if(rate)s.playbackRate.value=rate;const g=x.createGain();g.gain.value=Math.max(.0001,v*gain);let n=s;if(hp){const f=x.createBiquadFilter();f.type='highpass';f.frequency.value=hp;n.connect(f);n=f}if(lp){const f=x.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;n.connect(f);n=f}n.connect(g);g.connect(G.bus);s.start(t,e.o,e.d+.01);return g}
function setup(ctx,dna,kit){const sr=ctx.sampleRate,rn=mul(dna.seed+99),nb=ctx.createBuffer(1,Math.floor(sr*.8),sr),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rn()*2-1;
 const ir=ctx.createBuffer(2,Math.floor(sr*.55),sr);for(let c=0;c<2;c++){const q=ir.getChannelData(c);for(let i=0;i<q.length;i++)q[i]=(rn()*2-1)*Math.pow(1-i/q.length,3.2)}
 const bus=ctx.createGain(),sat=ctx.createWaveShaper(),k=((kit.tape||0)*2.2+(kit.k?kit.k.sat:0)*1.6)+.3,cv=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;cv[i]=Math.tanh(x*k)/Math.tanh(k)}sat.curve=cv;sat.oversample='2x';
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=kit.lp||18000;lp.Q.value=.5;const comp=ctx.createDynamicsCompressor();comp.threshold.value=dna.bb?-13:-16;comp.ratio.value=dna.bb?2.2:3.2;comp.attack.value=.006;comp.release.value=.14;
 const out=ctx.createGain();out.gain.value=.9;bus.connect(sat);sat.connect(lp);lp.connect(comp);comp.connect(out);out.connect(ctx.destination);
 const verb=ctx.createConvolver();verb.buffer=ir;const vg=ctx.createGain();vg.gain.value=1;verb.connect(vg);vg.connect(bus);
 const chopBus=ctx.createGain();chopBus.gain.value=dna.bb?1.05:.8;const clp=ctx.createBiquadFilter();clp.type='lowpass';clp.frequency.value=Math.min(kit.lp||18000,dna.style==='ec'?9500:16000);chopBus.connect(clp);clp.connect(bus);
 const G={ctx,nb,bus,verb,chopBus,kit,og:null,drive:{},pack:PACK,snd:PACK?soundsOf(dna):null};
 if(kit.crackle){const L=Math.floor(sr*3),cb=ctx.createBuffer(1,L,sr),q=cb.getChannelData(0);for(let i=0;i<L;i++)q[i]=(rn()*2-1)*.004;for(let p=0;p<90;p++){const at=Math.floor(rn()*L),a=(rn()*.6+.15)*(rn()<.15?1:.4);for(let j=0;j<24&&at+j<L;j++)q[at+j]+=a*(j%2?-1:1)*Math.exp(-j/6)}
  const cs=ctx.createBufferSource();cs.buffer=cb;cs.loop=true;const cg=ctx.createGain();cg.gain.value=kit.crackle;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=900;cs.connect(hp);hp.connect(cg);cg.connect(ctx.destination);G.crackle=cs}
 return G}
const noiseAt=(G,t,dur)=>{const s=G.ctx.createBufferSource();s.buffer=G.nb;s.start(t,Math.random()*.3,dur);return s};
const env=(G,node,t,a,peak,dec,floor)=>{node.gain.setValueAtTime(.0001,t);node.gain.linearRampToValueAtTime(Math.max(.0002,peak),t+a);node.gain.exponentialRampToValueAtTime(floor||.0001,t+a+dec)};
function vKick(G,t,v){if(G.pack&&G.pack.stem){if(G.snd.kick)hit(G,t,v,G.snd.kick,.9);return}if(G.pack&&G.snd.bb){hitF(G,t,v,G.snd.kick,.62,48,5200,1+(Math.random()-.5)*.03);return}if(G.pack){hit(G,t,v,G.snd.kick,.95);return}const x=G.ctx,k=G.kit.k||{f0:50,drop:120,dec:.17,click:.3,sat:.2},o=x.createOscillator(),g=x.createGain();o.type='sine';o.frequency.setValueAtTime(k.f0+k.drop,t);o.frequency.exponentialRampToValueAtTime(k.f0,t+.045);env(G,g,t,.003,v*.95,k.dec);o.connect(g);g.connect(G.bus);o.start(t);o.stop(t+k.dec+.05);
 const n=noiseAt(G,t,.02),hp=x.createBiquadFilter(),g2=x.createGain();hp.type='highpass';hp.frequency.value=2200;env(G,g2,t,.001,v*k.click*.55,.012);n.connect(hp);hp.connect(g2);g2.connect(G.bus)}
function vClap(G,t,v){const x=G.ctx;[0,.011,.022,.034].forEach((o,i)=>{const n=noiseAt(G,t+o,.14),bp=x.createBiquadFilter(),g=x.createGain();bp.type='bandpass';bp.frequency.value=1250;bp.Q.value=1.1;const last=i===3;env(G,g,t+o,.001,v*(last?.55:.4),last?.13:.012);n.connect(bp);bp.connect(g);g.connect(G.bus);if(last&&G.kit.sn.room){const gv=x.createGain();gv.gain.value=G.kit.sn.room*.7;g.connect(gv);gv.connect(G.verb)}})}
function vSnare(G,t,v){if(G.pack&&G.pack.stem){if(G.snd.snare)hit(G,t,v,G.snd.snare,.8);return}if(G.pack&&G.snd.bb){const g=hitF(G,t,v,G.snd.snare,.5,170,7200,1+(Math.random()-.5)*.03);if(G.kit.sn.room){const gv=G.ctx.createGain();gv.gain.value=G.kit.sn.room*.35;g.connect(gv);gv.connect(G.verb)}return}if(G.pack){const g=hit(G,t,v,G.snd.snare,.78);if(G.kit.sn.room){const gv=G.ctx.createGain();gv.gain.value=G.kit.sn.room*.55;g.connect(gv);gv.connect(G.verb)}if(G.snd.clapMix>0)hit(G,t+.002,v,G.snd.clap,.5*G.snd.clapMix);return}const x=G.ctx,s=G.kit.sn,o=x.createOscillator(),g=x.createGain();o.type='triangle';o.frequency.setValueAtTime(s.tone*1.5,t);o.frequency.exponentialRampToValueAtTime(s.tone,t+.03);env(G,g,t,.002,v*.42,.09);o.connect(g);g.connect(G.bus);o.start(t);o.stop(t+.15);
 const n=noiseAt(G,t,s.dec+.05),bp=x.createBiquadFilter(),hp=x.createBiquadFilter(),g2=x.createGain();bp.type='bandpass';bp.frequency.value=1900;bp.Q.value=.65;hp.type='highpass';hp.frequency.value=650;env(G,g2,t,.001,v*s.noise*.75,s.dec);n.connect(bp);bp.connect(hp);hp.connect(g2);g2.connect(G.bus);
 if(s.room){const gv=x.createGain();gv.gain.value=s.room*.6;g2.connect(gv);gv.connect(G.verb)}
 const n2=noiseAt(G,t,.015),h2=x.createBiquadFilter(),g3=x.createGain();h2.type='highpass';h2.frequency.value=s.hi;env(G,g3,t,.0005,v*.45,.012);n2.connect(h2);h2.connect(g3);g3.connect(G.bus);
 if(s.clap)vClap(G,t,v*s.clap*.8)}
function vHat(G,t,v,open){const x=G.ctx,h=G.kit.hat;if(G.pack&&G.pack.stem){if(G.snd.hat)hit(G,t,v,G.snd.hat,.55);return}if(!open&&G.og){G.og.gain.setTargetAtTime(.0001,t,.004);G.og=null}
 if(G.pack&&G.snd.bb){const g=hitF(G,t,v,open?G.snd.open:G.snd.hat,h.gain*(open?.9:.75),500,9500,1);if(open)G.og=g;return}
 if(G.pack){const g=hit(G,t,v,open?G.snd.open:G.snd.hat,h.gain*(open?1.1:1)*1.15);if(open)G.og=g;return}
 const dec=open?h.open:h.dec,n=noiseAt(G,t,dec+.05),hp=x.createBiquadFilter(),lp=x.createBiquadFilter(),g=x.createGain();hp.type='highpass';hp.frequency.value=h.hp;lp.type='lowpass';lp.frequency.value=15500;env(G,g,t,.001,v*h.gain*(open?1.1:1),dec);n.connect(hp);hp.connect(lp);lp.connect(g);g.connect(G.bus);if(open)G.og=g}
function drvCurve(G,d){const key=Math.round(d*10);if(G.drive[key])return G.drive[key];const k=1+d*14,c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;c[i]=Math.tanh(x*k)/Math.tanh(k)}return G.drive[key]=c}
function v808(G,t,v,len,f,slideFrom){const x=G.ctx,b=G.kit.b,o=x.createOscillator(),g=x.createGain(),sh=x.createWaveShaper();o.type='sine';
 if(G.pack&&G.snd&&G.snd.attack&&!slideFrom)hit(G,t,v,G.snd.attack,.5);
 if(slideFrom){o.frequency.setValueAtTime(slideFrom,t);o.frequency.linearRampToValueAtTime(f,t+.07)}else{o.frequency.setValueAtTime(G.pack?f*1.15:f*1.9,t);o.frequency.exponentialRampToValueAtTime(f,t+.03)}
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v*.95,t+.005);g.gain.setValueAtTime(v*.95,t+len*.35);g.gain.exponentialRampToValueAtTime(.0001,t+len);
 sh.curve=drvCurve(G,b.drive);const lp=x.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;o.connect(sh);sh.connect(lp);lp.connect(g);g.connect(G.bus);o.start(t);o.stop(t+len+.05);
 if(b.tri){const o2=x.createOscillator(),g2=x.createGain();o2.type='triangle';o2.frequency.setValueAtTime(f,t);if(slideFrom){o2.frequency.setValueAtTime(slideFrom,t);o2.frequency.linearRampToValueAtTime(f,t+.07)}g2.gain.value=b.tri*.35;o2.connect(g2);g2.connect(g);o2.start(t);o2.stop(t+len+.05)}}
function vChop(G,buf,sl,t,len,v){const x=G.ctx,s=x.createBufferSource();s.buffer=buf;const g=x.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.005);g.gain.setValueAtTime(v,t+Math.max(.006,len-.025));g.gain.linearRampToValueAtTime(.0001,t+len);s.connect(g);g.connect(G.chopBus);s.start(t,sl.t0,len+.02);s.stop(t+len+.05)}

/* ================= render a plan to audio ================= */
async function render(buf,Rr,P_,opt){opt=opt||{};await loadPack(P_.dna);const loops=opt.loops||2,sr=44100,total=loops*P_.loopLen+1.6,ctx=new OfflineAudioContext(2,Math.ceil(total*sr),sr),kit=KITS[P_.kit],G=setup(ctx,P_.dna,kit);
 if(G.crackle)G.crackle.start(0);
 const sample=P_.chopMode==='loop';
 for(let l=0;l<loops;l++){const off=l*P_.loopLen;
  if(sample){const len=Math.min(P_.loopLen,Math.max(.5,Rr.we-Rr.ws)),s=ctx.createBufferSource();s.buffer=buf;const g=ctx.createGain();g.gain.setValueAtTime(.0001,off);g.gain.linearRampToValueAtTime(.8,off+.002);g.gain.setValueAtTime(.8,off+P_.loopLen-.002);g.gain.linearRampToValueAtTime(.0001,off+P_.loopLen);s.connect(g);g.connect(G.chopBus);s.start(off,Rr.ws,Math.min(len,P_.loopLen));
   /* a short sample is repeated to fill the 4 bars */
   if(len<P_.loopLen-.05){let t2=off+len;while(t2<off+P_.loopLen-.05){const s2=ctx.createBufferSource();s2.buffer=buf;const g2=ctx.createGain();g2.gain.value=.8;s2.connect(g2);g2.connect(G.chopBus);s2.start(t2,Rr.ws,Math.min(len,off+P_.loopLen-t2));t2+=len}}}
  for(const e of P_.events){const t=off+e.t;if(e.lane==='loop')continue;
   if(e.lane==='kick')vKick(G,t,e.vel*(P_.dna.style==='trap'?.9:.95));else if(e.lane==='snare')vSnare(G,t,e.vel);else if(e.lane==='hat')vHat(G,t,e.vel,false);else if(e.lane==='open')vHat(G,t,e.vel,true);
   else if(e.lane==='b808')v808(G,t,e.vel,e.len,e.freq,e.slideFrom);else if(e.lane==='chop')vChop(G,buf,Rr.slices[e.n],t,e.len,e.vel)}}
 const out=await ctx.startRendering();let pk=0;for(let c=0;c<2;c++){const d=out.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a}}
 const k=pk>.0001?.92/pk:1;for(let c=0;c<2;c++){const d=out.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=k}
 return out}
function wav(buf){const n=buf.length,ch=buf.numberOfChannels,a=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)a.setUint8(o+i,s.charCodeAt(i))};w(0,'RIFF');a.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');a.setUint32(16,16,true);a.setUint16(20,1,true);a.setUint16(22,ch,true);a.setUint32(24,buf.sampleRate,true);a.setUint32(28,buf.sampleRate*ch*2,true);a.setUint16(32,ch*2,true);a.setUint16(34,16,true);w(36,'data');a.setUint32(40,n*ch*2,true);
 const d=[];for(let c=0;c<ch;c++)d.push(buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,d[c][i]));a.setInt16(o,v<0?v*32768:v*32767,true);o+=2}return new Blob([a.buffer],{type:'audio/wav'})}
window.MZMpcDrums={RO,RO_SAFE,chordUniform,KITS,P,get COUNT(){return PAT.length},HALF,dnaOf,plan,render,keyOf,wav,STEPSETS,loadPack,soundsOf,pack:()=>PACK,engine:{setup,vKick,vSnare,vHat,v808,vChop,noiseAt,KITS}};
})();
