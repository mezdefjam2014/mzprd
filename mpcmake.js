/* MZPRD MPC studio: SAMPLE TO BEAT, stage 3 = the episode.
   Builds the whole "I made this beat from a sample" video from a chosen variation:
     1 the raw sample  ->  2 chopping it (wheel turns, soft keys / number keys / ENTER press, each slice lands on a pad)  ->  3 the chops played as a loop
     ->  4 the drums added one layer at a time (kick, snare, hats, 808)  ->  5 the full beat.
   The same event list makes the sound AND drives the video (pad presses, hands, buttons, screen text, step overlay), so everything is in time. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const PAD_NAMES=['PERC 1','PERC 2','PERC 3','PERC 4','RIDE 1','RIDE 2','CRASH 1','CRASH 2','TOM 1','TOM 2','TOM 3','TOM 4','HIHAT','SNARE 1','SNARE 2','BASS'];
const padIdx=p=>{const r=Math.floor((p-1)/4),c=(p-1)%4;return(3-r)*4+c};
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const LAYERS=[['kick','KICK'],['snare','SNARE'],['hat','HATS']];

async function build(buf,Rr,dna,key,opt){opt=Object.assign({buttons:true,handsBtn:true,overlay:true,layerBars:4,intro:0,name:'SAMPLE',typeBeat:false,session:1,vary:true,allow:null,safeOnly:false},opt);
 /* buf / Rr are the sample already stretched to the beat: 4 bars at the beat's own tempo, chopped, plus a short tail */
 const D=window.MZMpcDrums,E=D.engine;await D.loadPack(dna);const base=D.plan(dna,Rr,{prog:0}),step=base.step,bar=16*step,segLen=opt.layerBars===2?2*bar:4*bar,loopLen=base.loopLen,sl=Rr.slices,N=sl.length;
 const fullLoops=Math.max(2,Math.ceil(90/loopLen)),LP=D.planLoops(dna,Rr,{n:fullLoops,session:opt.session,allow:opt.allow||undefined,safeOnly:opt.safeOnly,vary:opt.vary});
 const layers=LAYERS.filter(l=>base.events.some(e=>e.lane===l[0])),hits=[],btnEv=[],wheelEv=[],chops=[];
 const addHit=(t,pad,v)=>hits.push({t,pad,v});
 /* ---- the timeline ---- */
 let t=opt.intro>0?opt.intro+.25:.7;const T0=t,sample={t,d:Math.min(6.5,Math.max(2,Rr.we-Rr.ws))};t+=sample.d+.6;const chopStart=t;
 sl.forEach((s,i)=>{const c={i,slice:s,t0:t,len:Math.min(s.t1-s.t0,1.0)};wheelEv.push({t:t,d:.45,a:(i%2?-1:1)*1.5});let a=t+.5;
  if(opt.buttons){if(i===0){c.btns=[['sounds',t+.35],['soft1',t+.68]];a=t+1.0}else c.btns=[];c.btns.push(['soft3',a]);const dg=String(s.pad).split('');dg.forEach((d,j)=>c.btns.push(['k'+d,a+.26+j*.18]));const en=a+.26+dg.length*.18+.06;c.btns.push(['enter',en]);c.tEnter=en;c.aud=en+.28}
  else{c.btns=[];c.tEnter=t+.6;c.aud=t+.75}
  c.btns.forEach(b=>{btnEv.push({t:b[1],k:b[0]});if(opt.handsBtn)hits.push({t:b[1],pad:-1,btn:b[0],v:.8})});
  addHit(c.aud,padIdx(s.pad),.9);c.end=c.aud+c.len+.3;t=c.end;chops.push(c)});
 const flipT=t+.15,layerT=layers.map((l,k)=>flipT+segLen*(k+1)),fullT=flipT+segLen*(layers.length+1),endMusic=fullT+loopLen*fullLoops,TAIL=3.8,total=endMusic+TAIL,stopT=endMusic+.05,pdT=endMusic+1.0;   /* the hand presses STOP, then the unit powers down */
 /* ---- the audio, from the same plan ---- */
 const sr=44100,ctx=new OfflineAudioContext(2,Math.ceil(total*sr),sr),G=E.setup(ctx,dna);
 const click=(tt,v,f)=>{const n=E.noiseAt(G,tt,.03),hp=ctx.createBiquadFilter(),g=ctx.createGain();hp.type='highpass';hp.frequency.value=f||1800;g.gain.setValueAtTime(.0001,tt);g.gain.linearRampToValueAtTime(v,tt+.001);g.gain.exponentialRampToValueAtTime(.0001,tt+.02);n.connect(hp);hp.connect(g);g.connect(ctx.destination)};
 /* the sample at the start: the stretched 4 bars (or the first seconds of it) */
 {const s0=ctx.createBufferSource();s0.buffer=buf;const g=ctx.createGain();g.gain.setValueAtTime(.0001,sample.t);g.gain.linearRampToValueAtTime(.6,sample.t+.01);g.gain.setValueAtTime(.6,sample.t+Math.max(.02,sample.d-.06));g.gain.linearRampToValueAtTime(.0001,sample.t+sample.d);s0.connect(g);g.connect(G.bus);s0.start(sample.t,Rr.ws,sample.d)}
 chops.forEach(c=>{for(let k=0;k<9;k++)click(c.t0+.03+k*.06,.05,1100);c.btns.forEach(b=>click(b[1],.13,b[0]==='enter'?2400:1800));E.vChop(G,buf,c.slice,c.aud,c.len,.9)});
 const evOf=(P,allowed,limit)=>P.events.filter(e=>e.t<limit&&allowed.has(e.lane));
 const sched=(off,list)=>{for(const e of list){const tt=off+e.t;
  if(e.lane==='kick'){E.vKick(G,tt,e.vel);addHit(tt,15,e.vel)}else if(e.lane==='snare'){E.vSnare(G,tt,e.vel);addHit(tt,14,e.vel)}else if(e.lane==='hat'){E.vHat(G,tt,e.vel);addHit(tt,12,e.vel)}
  else if(e.lane==='chop'){const s=sl[e.n];E.vEvent(G,buf,Rr,e,tt);if(!e.grace)addHit(tt,padIdx(s.pad),e.vel)}}};
 /* step 3: the chops alone (the original phrase) */
 sched(flipT,evOf(LP.plans[0],new Set(['chop']),segLen));
 /* step 4: the drums, one layer at a time */
 layers.forEach((l,k)=>{const allowed=new Set(['chop']);for(let j=0;j<=k;j++)allowed.add(layers[j][0]);sched(layerT[k],evOf(LP.plans[0],allowed,segLen))});
 /* step 5: everything, loop after loop; every loop plays a different chop pattern (loop 1 and every 4th loop are the original phrase) */
 const all=new Set(['chop','kick','snare','hat']);for(let q=0;q<fullLoops;q++)sched(fullT+q*loopLen,evOf(LP.plans[q],all,loopLen));
 /* STOP, then the power goes: a relay click, then a low thump that falls away */
 if(opt.buttons){btnEv.push({t:stopT,k:'stop'});if(opt.handsBtn)hits.push({t:stopT,pad:-1,btn:'stop',v:.8});click(stopT,.14,1800)}
 {click(pdT+.42,.2,500);const o=ctx.createOscillator(),g=ctx.createGain(),t1=pdT+.45;o.type='sine';o.frequency.setValueAtTime(78,t1);o.frequency.exponentialRampToValueAtTime(24,t1+.5);g.gain.setValueAtTime(.0001,t1);g.gain.linearRampToValueAtTime(.16,t1+.012);g.gain.exponentialRampToValueAtTime(.0001,t1+.55);o.connect(g);g.connect(ctx.destination);o.start(t1);o.stop(t1+.6)}
 const out=D.peakNorm(await ctx.startRendering(),.9);
 hits.sort((a,b)=>a.t-b.t);const per=PAD_NAMES.map(()=>[]);hits.forEach(h=>{if(h.pad>=0)per[h.pad].push({t:h.t,v:clamp(h.v,.4,1)})});
 /* ---- what the video needs ---- */
 const lcdAt=T=>{if(T<T0)return[opt.name.toUpperCase().slice(0,20),'SAMPLE TO BEAT','READY'];
  if(T<sample.t+sample.d+.3)return[opt.name.toUpperCase().slice(0,20),'SAMPLE  '+mmss(Math.max(0,T-sample.t))+'/'+mmss(sample.d),Rr.bpm+' BPM  '+(key?key.name.toUpperCase():'')];
  if(T<flipT){const c=chops.find(q=>T>=q.t0&&T<q.end);if(!c)return null;const s=c.slice;
   if(T<c.tEnter)return['TRIM  CHOP '+(c.i+1)+'/'+N,'START '+s.t0.toFixed(2)+'  END '+s.t1.toFixed(2),opt.buttons?'ASSIGN TO PAD...':'MOVE THE CUT...'];
   return['ASSIGNED  CHOP '+(c.i+1),'PAD '+s.pad+'  '+PAD_NAMES[padIdx(s.pad)],'LENGTH '+(s.t1-s.t0).toFixed(2)+' SEC']}
  if(T>=pdT+.5)return['','',''];if(T>=pdT)return['POWERING DOWN...','PLEASE WAIT',''];if(T>=stopT)return[opt.name.toUpperCase().slice(0,20),'SEQUENCE STOPPED','READY'];
  return null};
 const wheelAngle=T=>{let a=0;for(const e of wheelEv){if(T>e.t)a+=e.a*ease((T-e.t)/e.d)}return a};
 const phase=T=>T<sample.t+sample.d+.3?0:T<flipT?1:T<layerT[0]?2:T<fullT?3:4;
 const chapters=[['0:00','Intro'],[mmss(sample.t),'The sample'],[mmss(chopStart),'Chopping it on the pads'],[mmss(flipT),'Playing the chops']].concat(layers.map((l,k)=>[mmss(layerT[k]),'Adding the '+l[1].toLowerCase()])).concat([[mmss(fullT),'The full beat']]);
 const waveBins=(()=>{const B=Rr.peaks.length/2,a=Math.floor(Rr.ws/Rr.dur*B),b=Math.max(a+2,Math.ceil(Rr.we/Rr.dur*B));return{a,b,B}})();
 /* the hits per lane (for the on-screen meters) and where we are in the loop (for the bar counter) */
 const lanes={kick:[],snare:[],hat:[],chop:[]};hits.forEach(h=>{if(h.pad<0)return;const k=h.pad===15?'kick':h.pad===14?'snare':h.pad===12?'hat':h.pad<12?'chop':null;if(k)lanes[k].push({t:h.t,v:clamp(h.v,.4,1)})});Object.values(lanes).forEach(a=>a.sort((x,y)=>x.t-y.t));
 const barAt=T=>{if(T<flipT||T>=endMusic)return null;const starts=[flipT].concat(layerT,[fullT]);let si=0;while(si+1<starts.length&&starts[si+1]<=T)si++;const full=si===starts.length-1,len=full?loopLen:segLen,rel=T-starts[si],inLoop=full?rel%loopLen:rel%segLen;return{bar:Math.min(4,Math.floor(inLoop/bar)+1),loop:full?Math.floor(rel/loopLen)+1:0,loops:fullLoops}};
 const M={lanes,barAt,T0,sample,chops,flipT,segLen,layers:layers.map((l,k)=>({k:l[0],name:l[1],t:layerT[k]})),fullT,endMusic,loopLen,stopT,pdAt:T=>T<pdT?-1:T-pdT,total,name:opt.name,bpm:Rr.bpm,key:key?key.name:'',style:'ec',kit:dna.name,id:dna.id,mode:'flip',progNames:LP.plans.map(P=>P.progName),chapters,lcdAt,wheelAngle,phase,overlayOn:opt.overlay,wave:waveBins,R:Rr,opt};
 const Sx={title:opt.name,bpm:Rr.bpm,key:(key?key.name:'').replace(' minor','m').replace(' major',''),lcd:'',buf:out,off:flipT,kit:0,dur:total,hits,per,btnEv,wheelEv,raw:null};
 const X={kind:'make',tracks:[{S:Sx,start:0,dur:total}],total,lead:0,title:opt.name,intro:opt.intro,make:M};
 return X}

/* ---------- the step overlay, drawn flat on top of the video ---------- */
function overlay(c,W,H,T,X,v){const M=X.make;if(!M||!M.overlayOn||T<M.T0-.2)return;const ph=M.phase(T),R=M.R,pw=W*(v?.9:.62),px=(W-pw)/2,py=H*(v?.035:.018),ch=H*(v?.028:.04),fs=Math.max(14,Math.round(ch*.55));
 c.save();c.textBaseline='middle';
 /* step chips */
 const names=['1 SAMPLE','2 CHOP','3 '+(M.mode==='loop'?'LOOP':'FLIP'),'4 DRUMS','5 THE BEAT'],cw=pw/5;
 names.forEach((n,i)=>{const on=i===ph,x=px+i*cw;c.fillStyle=on?'rgba(232,185,74,.96)':'rgba(8,6,4,.62)';c.fillRect(x+2,py,cw-4,ch);c.font='700 '+fs+'px Oswald, sans-serif';c.textAlign='center';c.fillStyle=on?'#17110a':(i<ph?'#e8b94a':'#8e8e94');c.fillText(n,x+cw/2,py+ch/2+1)});
 /* the waveform panel (steps 1 to 3) */
 const sy=py+ch+H*.008,sh=H*(v?.07:.1);
 if(ph<=2){c.fillStyle='rgba(8,6,4,.66)';c.fillRect(px,sy,pw,sh);
  const {a,b,B}=M.wave,n=b-a,x0=px+10,w=pw-20,my=sy+sh/2,amp=sh*.42;
  /* slices: bands */
  const t0=R.ws,t1=R.we,tx=u=>x0+clamp((u-t0)/(t1-t0),0,1)*w,cutAt=i=>M.chops[i].t0+.55;
  const done=T<M.flipT?M.chops.filter(q=>T>=q.t0+.45).length:M.chops.length;
  R.slices.forEach((s,i)=>{if(i>=done)return;const hue=(i*47)%360,cur=ph===1?(T>=M.chops[i].t0&&T<M.chops[i].end):false,x=tx(s.t0),xe=tx(s.t1);c.fillStyle='hsla('+hue+',80%,55%,'+(cur?.5:.22)+')';c.fillRect(x,sy+3,Math.max(2,xe-x),sh-6);c.fillStyle='hsl('+hue+',85%,62%)';c.fillRect(x,sy+3,2,sh-6);c.font='700 '+Math.max(10,Math.round(sh*.2))+'px Oswald, sans-serif';c.textAlign='left';c.fillStyle='#fff';c.fillText(String(i+1),x+4,sy+Math.round(sh*.2))});
  /* the waveform */
  c.fillStyle='#e8e8ec';for(let i=0;i<Math.floor(w/2);i++){const bi=a+Math.floor(i/(w/2)*n),mn=R.peaks[bi*2],mx=R.peaks[bi*2+1];c.fillRect(x0+i*2,my+mn*amp*2.4,1.4,Math.max(1,(mx-mn)*amp*2.4))}
  /* a cut line travelling while the wheel turns */
  if(ph===1){const cc=M.chops.find(q=>T>=q.t0&&T<q.end);if(cc){const k=ease((T-cc.t0)/.45),prev=cc.i>0?R.slices[cc.i-1].t0:R.ws,u=prev+(cc.slice.t0-prev)*k;c.fillStyle='#ff4a3a';c.fillRect(tx(u)-1,sy+2,2,sh-4)}}
  /* the playhead */
  if(ph===0){const u=R.ws+(T-M.sample.t)/M.sample.d*Math.min(M.sample.d,R.we-R.ws);c.fillStyle='#e0242f';c.fillRect(tx(u)-1,sy+2,2,sh-4)}
  else if(ph===2){const u=R.ws+((T-M.flipT)%(M.segLen))/M.segLen*(R.we-R.ws);c.fillStyle='#e0242f';c.fillRect(tx(u)-1,sy+2,2,sh-4)}
  c.restore();c.save();c.textBaseline='middle'}
 /* the caption */
 let cap='';const cy=ph<=2?sy+sh+H*.012:sy;
 if(ph===0)cap='THE SAMPLE:  '+M.name.toUpperCase()+'   /   '+M.bpm+' BPM   /   '+M.key.toUpperCase();
 else if(ph===1){const cc=M.chops.find(q=>T>=q.t0&&T<q.end)||M.chops[M.chops.length-1],pn=cc.slice.pad;cap='CHOP '+(cc.i+1)+' OF '+M.chops.length+'   >   PAD '+pn+'  ('+PAD_NAMES[padIdx(pn)]+')'}
 else if(ph===2)cap=M.mode==='loop'?'PLAYING THE SAMPLE LOOP':'PLAYING THE CHOPS ON THE PADS';
 else if(ph===3){const k=M.layers.reduce((a,l,i)=>T>=l.t?i:a,0);cap='ADDING THE '+M.layers[k].name}
 else{const q=Math.floor((T-M.fullT)/M.loopLen),pn=M.progNames&&M.progNames[q];cap=(q>0&&pn&&pn!=='The original phrase')?'CHOP PATTERN   /   '+pn.toUpperCase():'THE FULL BEAT   /   '+M.bpm+' BPM'}
 c.font='700 '+Math.round(fs*1.05)+'px Oswald, sans-serif';c.textAlign='center';const tw=c.measureText(cap).width+36,cx=W/2;c.fillStyle='rgba(8,6,4,.7)';c.fillRect(cx-tw/2,cy,tw,ch*1.05);c.fillStyle='#fff';c.fillText(cap,cx,cy+ch*.55);
 /* drum layer chips (step 4 and 5) */
 if(ph>=3){const ly=cy+ch*1.05+H*.008,n=M.layers.length,lw=(v?.9:.5)*W/n,lx=(W-lw*n)/2;M.layers.forEach((l,i)=>{const on=T>=l.t,x=lx+i*lw;c.fillStyle=on?'rgba(232,185,74,.95)':'rgba(8,6,4,.6)';c.fillRect(x+2,ly,lw-4,ch*.9);c.font='700 '+Math.round(fs*.95)+'px Oswald, sans-serif';c.fillStyle=on?'#17110a':'#8e8e94';c.fillText(l.name,x+lw/2,ly+ch*.47)})}
 /* beat meters and the bar counter (optional): four LED ladders that jump on every hit, so the full beat keeps moving on screen */
 if(M.opt.visuals!==false&&ph>=2){const lv=a=>{let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m].t<=T)lo=m+1;else hi=m}const h=lo>0?a[lo-1]:null;return h?Math.exp(-(T-h.t)/.16)*h.v:0},LN=[['KICK','kick'],['SNARE','snare'],['HATS','hat'],['CHOPS','chop']],mw=W*(v?.105:.042),mg=W*(v?.02:.008),mh=H*(v?.07:.09),n=LN.length,mx0=W*(v?.045:.03),my=H-mh-H*(v?.07:.075),seg=8,sh=mh/seg;
  LN.forEach(([nm,k],i)=>{const x=mx0+i*(mw+mg),L=lv(M.lanes[k]),on=Math.round(L*seg);for(let s=0;s<seg;s++){const y=my+mh-(s+1)*sh,lit=s<on,hue=s<5?'232,185,74':s<7?'255,150,60':'255,74,58';c.fillStyle=lit?'rgba('+hue+',.95)':'rgba(255,255,255,.1)';if(lit){c.shadowColor='rgba('+hue+',.8)';c.shadowBlur=sh*.9}c.fillRect(x,y+sh*.14,mw,sh*.72);c.shadowBlur=0}
   c.font='700 '+Math.max(11,Math.round(H*(v?.0125:.018)))+'px Oswald, sans-serif';c.textAlign='center';c.fillStyle=L>.2?'#e8b94a':'rgba(255,255,255,.55)';c.fillText(nm,x+mw/2,my+mh+H*(v?.016:.024))});
  const ba=M.barAt(T);if(ba){c.font='700 '+Math.max(13,Math.round(H*(v?.016:.024)))+'px Oswald, sans-serif';c.textAlign='left';c.fillStyle='rgba(255,255,255,.88)';c.fillText('BAR '+ba.bar+' / 4'+(ba.loop?'     LOOP '+ba.loop+' / '+ba.loops:''),mx0,my-H*(v?.014:.02))}}
 c.restore()}

/* ---------- the YouTube text for the episode ---------- */
function pack(X,ST,info){const M=X.make,Z=(ST.s2b||{}),src=(Z.src||'').trim(),AR=(window.MZMpcGen?MZMpcGen.artistsOf(ST.artist):[]),A=AR.slice(0,2).join(' x '),dur=Math.round(M.total),style=M.style==='trap'?'trap':'boom bap',year=new Date().getFullYear();
 const nm=M.name,lenTxt=dur<90?dur+' seconds':Math.round(dur/60)+' minutes',tpl=[
  'I Flipped a Sample Into a '+(M.style==='trap'?'Trap':'Boom Bap')+' Beat on the MPC60 (Start to Finish)','Sample to Beat on the MPC60: Chopping "'+nm+'" Step by Step','Making a '+(M.style==='trap'?'Trap':'Boom Bap')+' Beat From a Sample on the Akai MPC60 II','Watch Me Chop a Sample and Build the Drums ('+M.bpm+' BPM)','How I Turned One Sample Into a Full Beat (MPC60 Pad by Pad)','I Chopped "'+nm+'" on the MPC60 and Made This','Sample Flip on a 1988 MPC: '+(M.style==='trap'?'Trap':'Boom Bap')+' Beat From Scratch','From Sample to Beat in '+lenTxt+' (MPC60 Chop Session)'];
 const tb=A?[A+' Type Beat: Flipping a Sample on the MPC60 ('+year+')',(M.style==='trap'?'Hard Trap':'Dusty Boom Bap')+' '+A+' Type Beat - Made From a Sample on MPC60',A+' Type Beat "'+nm+'" ('+style+', '+M.bpm+' BPM)']:['Type Beat: Flipping a Sample on the MPC60 ('+year+')',(M.style==='trap'?'Hard Trap':'Dusty Boom Bap')+' Type Beat - Made From a Sample on MPC60'];
 const titles=(Z.typeBeat?tb.concat(tpl):tpl).map(t=>t.slice(0,100));
 const ch=M.chapters.map(c=>c[0]+' '+c[1]).join('\n');
 const desc=['Watch a sample become a '+style+' beat on the Akai MPC60 II: every chop, every pad press and every drum layer, start to finish.',src?'Sample: '+src:'','Drums: from the MZ drum pack.','','CHAPTERS',ch,'','BEAT DETAILS','Tempo: '+M.bpm+' BPM',M.key?'Key: '+M.key:'','Style: '+style+' ('+M.kit+')','','All beats and sample packs: https://mzprd.com','',Z.typeBeat&&A?'#typebeat #'+A.toLowerCase().replace(/[^a-z0-9]/g,'')+'typebeat #mpc60':'#mpc60 #samplechop #beatmaking'].filter(x=>x!==undefined).join('\n').replace(/\n{3,}/g,'\n\n');
 const tags=['mpc60','akai mpc60','mpc beat making','sample flip','sample chop','chopping samples','how to chop a sample',style+' beat',M.style==='trap'?'trap drums 808':'boom bap drums','beat making process','making a beat from a sample','mzprd','meztheprod'].concat(Z.typeBeat&&A?[A.toLowerCase()+' type beat']:[]);let tg='';tags.forEach(t=>{if((tg+t).length<460)tg+=(tg?', ':'')+t});
 const pinned=['Which chop was your favorite? Tell me the number.','Drop a sample idea below and I will flip it next.','Trap or boom bap for the next one? Vote below.'];
 return{titles,desc,tags:tg,pinned,chapters:ch}}
window.MZMpcMake={build,overlay,pack,PAD_NAMES,padIdx};
})();
