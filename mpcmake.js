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
const LAYERS=[['kick','KICK'],['snare','SNARE'],['hat','HATS'],['b808','808']];

async function build(buf,Rr,dna,key,opt){opt=Object.assign({buttons:true,handsBtn:true,overlay:true,layerBars:4,intro:0,name:'SAMPLE',typeBeat:false},opt);
 const D=window.MZMpcDrums,E=D.engine;await D.loadPack(dna);const pl=D.plan(dna,Rr,key),kit=E.KITS[dna.kit],trap=dna.style==='trap',step=pl.step,bar=16*step,segLen=opt.layerBars===2?2*bar:4*bar,loopLen=pl.loopLen,sl=Rr.slices,N=sl.length;
 const layers=LAYERS.filter(l=>l[0]==='b808'?trap:pl.events.some(e=>e.lane===l[0])),hits=[],btnEv=[],wheelEv=[],chops=[];
 const addHit=(t,pad,v)=>hits.push({t,pad,v});
 /* the snare always sits on pad 14 (beside the kick, never next to the hi-hat pad 12), on every beat, so viewers learn where it is */
 const snarePad=14;
 /* ---- the timeline ---- */
 let t=opt.intro>0?opt.intro+.25:.7;const T0=t,sample={t,d:Math.min(6.5,Math.max(2,Rr.we-Rr.ws))};t+=sample.d+.6;const chopStart=t;
 sl.forEach((s,i)=>{const c={i,slice:s,t0:t,len:Math.min(s.t1-s.t0,1.0)};wheelEv.push({t:t,d:.45,a:(i%2?-1:1)*1.5});let a=t+.5;
  if(opt.buttons){if(i===0){c.btns=[['sounds',t+.35],['soft1',t+.68]];a=t+1.0}else c.btns=[];c.btns.push(['soft3',a]);const dg=String(s.pad).split('');dg.forEach((d,j)=>c.btns.push(['k'+d,a+.26+j*.24]));const en=a+.26+dg.length*.24+.08;c.btns.push(['enter',en]);c.tEnter=en;c.aud=en+.28}
  else{c.btns=[];c.tEnter=t+.6;c.aud=t+.75}
  c.btns.forEach(b=>{btnEv.push({t:b[1],k:b[0]});if(opt.handsBtn)hits.push({t:b[1],pad:-1,btn:b[0],v:.8})});
  addHit(c.aud,padIdx(s.pad),.9);c.end=c.aud+c.len+.3;t=c.end;chops.push(c)});
 const PG=.5,flipT=t+.15+PG,fullLoops=Math.max(2,Math.ceil(90/loopLen)),layerT=layers.map((l,k)=>flipT+(segLen+PG)*(k+1)),fullT=flipT+(segLen+PG)*(layers.length+1),endMusic=fullT+loopLen*fullLoops,TAIL=1.4,total=endMusic+TAIL;
 /* ---- the audio, from the same plan ---- */
 const sr=44100,ctx=new OfflineAudioContext(2,Math.ceil(total*sr),sr),G=E.setup(ctx,dna,kit);if(G.crackle)G.crackle.start(0);D.mixPrep(G,buf,Rr);
 const click=(tt,v,f)=>{const n=E.noiseAt(G,tt,.03),hp=ctx.createBiquadFilter(),g=ctx.createGain();hp.type='highpass';hp.frequency.value=f||1800;g.gain.setValueAtTime(.0001,tt);g.gain.linearRampToValueAtTime(v,tt+.001);g.gain.exponentialRampToValueAtTime(.0001,tt+.02);n.connect(hp);hp.connect(g);g.connect(ctx.destination)};
 const mkPlay=(ctx,G)=>(at,from,len,gain,seam)=>{const s=ctx.createBufferSource();s.buffer=buf;const g=ctx.createGain(),fi=seam?.002:.01,fo=seam?.002:.06;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(gain,at+fi);g.gain.setValueAtTime(gain,at+Math.max(.02,len-fo));g.gain.linearRampToValueAtTime(.0001,at+len);s.connect(g);g.connect(G.chopBus);s.start(at,from,len)};
 const playSample=mkPlay(ctx,G);
 /* power-on / pre-roll */
 playSample(sample.t,Rr.ws,sample.d,.8);
 chops.forEach(c=>{wheelEv.forEach(()=>{});for(let k=0;k<9;k++)click(c.t0+.03+k*.06,.05,1100);c.btns.forEach(b=>click(b[1],.13,b[0]==='enter'?2400:1800));E.vChop(G,buf,c.slice,c.aud,c.len,.9)});
 const roList=(opt.ro&&opt.ro.length)?(opt.roChange?opt.ro.filter(i=>D.RO_SAFE.includes(i)):opt.ro):[],roIdx=q=>q-1-Math.floor(q/4),roPick=q=>(roList.length&&q>0&&q%4!==0)?roList[roIdx(q)%roList.length]:undefined;
 /* the chops are flipped on the pads every loop (a new phrase from the same slices, each slice at its exact place in the sample); every 4th loop goes back to the original. With chop orders switched on, each flip loop gets one new order. */
 const flipPlan=q=>(q===0||q%4===0)?pl:D.plan(Object.assign({},dna,{mode:'flip',fv:q,seed:dna.seed+q*131,ro:roPick(q)}),Rr,key);
 const all=new Set(['chop','kick','snare','hat','open','b808']),drops=[];
 const isLoop=pl.chopMode==='loop';
 /* the music of the build, scheduled on any context: O gives the start of each step. The video uses it with gaps for the hand; the clean download uses it back to back with no button sounds. */
 const musicPass=(ctx,G,O,addH,dropsOut)=>{const playSample=mkPlay(ctx,G);
  const evOf=(allowed,limit)=>pl.events.filter(e=>e.t<limit&&allowed.has(e.lane));
  const sched=(off,list)=>{for(const e of list){const tt=off+e.t;
   if(e.lane==='kick'){E.vKick(G,tt,e.vel*(trap?.9:.95));addH(tt,15,e.vel)}else if(e.lane==='snare'){E.vSnare(G,tt,e.vel);addH(tt,snarePad,e.vel)}else if(e.lane==='hat'){E.vHat(G,tt,e.vel,false);addH(tt,12,e.vel)}else if(e.lane==='open'){E.vHat(G,tt,e.vel,true);addH(tt,12,e.vel)}
   else if(e.lane==='b808')E.v808(G,tt,e.vel,e.len,e.freq,e.slideFrom);
   else if(e.lane==='chop'){const s=sl[e.n];E.vChop(G,buf,s,tt,e.len,e.vel);addH(tt,padIdx(s.pad),e.vel)}}};
  const loopSample=(off,len)=>{const L=Math.min(Rr.we-Rr.ws,len);let u=off;while(u<off+len-.05){const d=Math.min(L,off+len-u);playSample(u,Rr.ws,d,.8,true);u+=L}};
  const chopSet=new Set(['chop']);
  /* step 3: the chops alone */
  if(isLoop)loopSample(O.flip,segLen);sched(O.flip,evOf(chopSet,segLen));
  /* step 4: the drums, one layer at a time */
  layers.forEach((l,k)=>{const allowed=new Set(['chop']);for(let j=0;j<=k;j++){allowed.add(layers[j][0]);if(layers[j][0]==='hat')allowed.add('open')}const off=O.layers[k];if(isLoop)loopSample(off,segLen);sched(off,evOf(allowed,segLen))});
  /* step 5: everything, with the fills */
  for(let q=0;q<fullLoops;q++){const off=O.full+q*loopLen,P=flipPlan(q);if(isLoop&&P===pl)loopSample(off,loopLen);let evs=P.events.filter(e=>e.t<loopLen&&all.has(e.lane));
   /* optional drop and rebuild: every other loop the hats leave in bar 3, then everything but the chops leaves in bar 4 behind a rising snare roll, and the next loop slams back in */
   if(opt.drops&&q%2===1&&q<fullLoops-1){evs=evs.filter(e=>e.bar===3?e.lane==='chop':e.bar===2?(e.lane!=='hat'&&e.lane!=='open'):true);
    [12,13,14,15].forEach((s,i)=>evs.push({t:(3*16+s)*step,lane:'snare',vel:.45+.17*i,bar:3,step:s}));if(dropsOut)dropsOut.push({a:off+2*bar,b:off+4*bar})}
   sched(off,evs)}};
 musicPass(ctx,G,{flip:flipT,layers:layerT,full:fullT},addHit,drops);
 /* the build-up as one continuous beat with no button sounds, no pauses and no sample audition (rendered when asked for) */
 const renderClean=async()=>{const O={flip:0,layers:[],full:0};let cur=segLen;layers.forEach((l,k)=>{O.layers[k]=cur;cur+=segLen});O.full=cur;const len=cur+loopLen*fullLoops+TAIL,c2=new OfflineAudioContext(2,Math.ceil(len*sr),sr),G2=E.setup(c2,dna,kit);if(G2.crackle)G2.crackle.start(0);D.mixPrep(G2,buf,Rr);
  musicPass(c2,G2,O,()=>{},null);const o2=await c2.startRendering();let pk=0;for(let c=0;c<2;c++){const d=o2.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a}}const k=pk>.0001?.92/pk:1;for(let c=0;c<2;c++){const d=o2.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=k}if(D.mixOn())D.finish(o2);return o2};
 /* the hand presses PLAY whenever the music starts (the sample, the chops, each new drum layer, the full beat) and STOP at the end */
 if(opt.buttons){const press=(k,tt)=>{btnEv.push({t:tt,k});if(opt.handsBtn)hits.push({t:tt,pad:-1,btn:k,v:.8});click(tt,.13,1800)};
  const lead=PG-.08;   /* press PLAY, the hand lifts away, and the music starts a beat later so the first kick is tapped */
  press('play',sample.t-.3);press('play',flipT-lead);layers.forEach((l,k)=>press('play',layerT[k]-lead));press('play',fullT-lead);press('stop',endMusic+.05)}
 const out=await ctx.startRendering();let pk=0;for(let c=0;c<2;c++){const d=out.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a}}const gk=pk>.0001?.92/pk:1;for(let c=0;c<2;c++){const d=out.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=gk}if(D.mixOn())D.finish(out);
 hits.sort((a,b)=>a.t-b.t);const per=PAD_NAMES.map(()=>[]);hits.forEach(h=>{if(h.pad>=0)per[h.pad].push({t:h.t,v:clamp(h.v,.4,1)})});
 /* ---- what the video needs ---- */
 const lcdAt=T=>{if(T<T0)return[opt.name.toUpperCase().slice(0,20),'SAMPLE TO BEAT','READY'];
  if(T<sample.t+sample.d+.3)return[opt.name.toUpperCase().slice(0,20),'SAMPLE  '+mmss(Math.max(0,T-sample.t))+'/'+mmss(sample.d),Rr.bpm+' BPM  '+(key?key.name.toUpperCase():'')];
  if(T<flipT){const c=chops.find(q=>T>=q.t0&&T<q.end);if(!c)return null;const s=c.slice;
   if(T<c.tEnter){/* the digits appear on the screen as they are pressed */const typed=opt.buttons?c.btns.filter(b=>/^k\d$/.test(b[0])&&b[1]<=T).map(b=>b[0][1]).join(''):'',armed=opt.buttons&&c.btns.some(b=>b[0]==='soft3'&&b[1]<=T);
    return['TRIM  CHOP '+(c.i+1)+'/'+N,'START '+s.t0.toFixed(2)+'  END '+s.t1.toFixed(2),opt.buttons?(armed?'ASSIGN TO PAD: '+typed+(Math.floor(T*3)%2||typed?'_':' '):'ASSIGN TO PAD...'):'MOVE THE CUT...']}
   return['ASSIGNED  CHOP '+(c.i+1),'PAD '+s.pad+'  '+PAD_NAMES[padIdx(s.pad)],'LENGTH '+(s.t1-s.t0).toFixed(2)+' SEC']}
  return null};
 const wheelAngle=T=>{let a=0;for(const e of wheelEv){if(T>e.t)a+=e.a*ease((T-e.t)/e.d)}return a};
 const phase=T=>T<sample.t+sample.d+.3?0:T<flipT?1:T<layerT[0]?2:T<fullT?3:4;
 const chapters=[['0:00','Intro'],[mmss(sample.t),'The sample'],[mmss(chopStart),'Chopping it on the pads'],[mmss(flipT),isLoop?'Playing the loop':'Playing the chops']].concat(layers.map((l,k)=>[mmss(layerT[k]),'Adding the '+l[1].toLowerCase()])).concat([[mmss(fullT),'The full beat']]);
 const waveBins=(()=>{const B=Rr.peaks.length/2,a=Math.floor(Rr.ws/Rr.dur*B),b=Math.max(a+2,Math.ceil(Rr.we/Rr.dur*B));return{a,b,B}})();
 const M={T0,sample,chops,flipT,segLen,layers:layers.map((l,k)=>({k:l[0],name:l[1],t:layerT[k]})),fullT,endMusic,loopLen,drops,roNames:Array.from({length:fullLoops},(_,q)=>roPick(q)?D.RO[roPick(q)].n:''),renderClean,total,name:opt.name,bpm:Rr.bpm,key:key?key.name:'',style:dna.style,kit:kit.n,id:dna.id,mode:pl.chopMode,chapters,lcdAt,wheelAngle,phase,overlayOn:opt.overlay,wave:waveBins,R:Rr,opt};
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
 else cap=M.drops&&M.drops.some(d=>T>=d.a&&T<d.b)?'THE DROP   /   REBUILD':(M.roNames&&T>=M.fullT&&T<M.endMusic&&M.roNames[Math.floor((T-M.fullT)/M.loopLen)])?'CHOP ORDER   /   '+M.roNames[Math.floor((T-M.fullT)/M.loopLen)].toUpperCase():(M.loopLen&&T>=M.fullT&&T<M.endMusic&&Math.floor((T-M.fullT)/M.loopLen)%4?'CHOP FLIP '+(Math.floor((T-M.fullT)/M.loopLen)%4)+'   /   ':'')+'THE FULL BEAT   /   '+M.style.toUpperCase().replace('EC','EAST COAST')+'  '+M.kit+'   /   '+M.bpm+' BPM';
 c.font='700 '+Math.round(fs*1.05)+'px Oswald, sans-serif';c.textAlign='center';const tw=c.measureText(cap).width+36,cx=W/2;c.fillStyle='rgba(8,6,4,.7)';c.fillRect(cx-tw/2,cy,tw,ch*1.05);c.fillStyle='#fff';c.fillText(cap,cx,cy+ch*.55);
 /* drum layer chips (step 4 and 5) */
 if(ph>=3){const ly=cy+ch*1.05+H*.008,n=M.layers.length,lw=(v?.9:.5)*W/n,lx=(W-lw*n)/2;M.layers.forEach((l,i)=>{const on=T>=l.t,x=lx+i*lw;c.fillStyle=on?'rgba(232,185,74,.95)':'rgba(8,6,4,.6)';c.fillRect(x+2,ly,lw-4,ch*.9);c.font='700 '+Math.round(fs*.95)+'px Oswald, sans-serif';c.fillStyle=on?'#17110a':'#8e8e94';c.fillText(l.name,x+lw/2,ly+ch*.47)})}
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
