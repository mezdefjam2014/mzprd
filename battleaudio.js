/* MZPRD Beat Battle audio: every sound is synthesized (no files) except the crowd, plus the two beat clips of each match.
   One function lays the sounds of any time range onto any audio context, so the live preview and the video render sound the same. */
(function(){
'use strict';
const TX=window.MZBattleText;let noiseB=null,crowd=null,crowdP=null;
const nb=ctx=>{if(noiseB&&noiseB.sampleRate===ctx.sampleRate)return noiseB;const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return noiseB=b};
const env=(ctx,g,T,a,d,peak)=>{g.gain.setValueAtTime(.0001,T);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),T+a);g.gain.exponentialRampToValueAtTime(.0001,T+a+d)};
function nz(ctx,d,T,dur,type,f,q,g,sweepTo){const s=ctx.createBufferSource();s.buffer=nb(ctx);s.loop=true;const bp=ctx.createBiquadFilter();bp.type=type;bp.frequency.setValueAtTime(f,T);if(sweepTo)bp.frequency.exponentialRampToValueAtTime(sweepTo,T+dur);bp.Q.value=q||1;const gn=ctx.createGain();env(ctx,gn,T,Math.min(.02,dur*.2),dur,g);s.connect(bp);bp.connect(gn);gn.connect(d);s.start(T,Math.random()*1.5,dur+.1);s.stop(T+dur+.15)}
function osc(ctx,d,T,type,f0,f1,dur,g,a){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,T);if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),T+dur);const gn=ctx.createGain();env(ctx,gn,T,a||.004,dur,g);o.connect(gn);gn.connect(d);o.start(T);o.stop(T+dur+.1)}
const S={
 whoosh:(c,d,T,o)=>nz(c,d,T,(o&&o.dur)||.6,'bandpass',300,1.2,.35,3600),
 boom:(c,d,T)=>{osc(c,d,T,'sine',130,34,.7,.95);nz(c,d,T,.4,'lowpass',2400,.7,.6,200)},
 sub:(c,d,T)=>{osc(c,d,T,'sine',64,28,1.5,.95,.02);osc(c,d,T,'sine',128,56,.9,.3)},
 slice:(c,d,T)=>{nz(c,d,T,.25,'highpass',3200,.7,.5);osc(c,d,T,'sine',2400,2100,.5,.18);osc(c,d,T+.03,'sine',3700,3500,.45,.1)},
 crunch:(c,d,T)=>{for(let i=0;i<6;i++)nz(c,d,T+i*.035,.06,'bandpass',400+i*500,3,.4);osc(c,d,T,'square',90,40,.4,.4)},
 wob:(c,d,T)=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=110;const f=c.createBiquadFilter();f.type='lowpass';f.Q.value=8;f.frequency.value=500;const l=c.createOscillator();l.frequency.value=6;const lg=c.createGain();lg.gain.value=420;l.connect(lg);lg.connect(f.frequency);const g=c.createGain();env(c,g,T,.02,.9,.4);o.connect(f);f.connect(g);g.connect(d);o.start(T);l.start(T);o.stop(T+1.1);l.stop(T+1.1)},
 chain:(c,d,T)=>{for(let i=0;i<7;i++){nz(c,d,T+i*.07,.05,'highpass',5200,1,.28);osc(c,d,T+i*.07,'sine',2300+i*80,2000,.12,.08)}},
 flurry:(c,d,T)=>{for(let i=0;i<16;i++)nz(c,d,T+i*.04,.035,'highpass',6000,1,.22)},
 snap:(c,d,T)=>{nz(c,d,T,.12,'highpass',1800,.8,.6);osc(c,d,T,'sine',1900,500,.14,.4)},
 bell:(c,d,T)=>{[880,1320,1760,2640].forEach((f,i)=>osc(c,d,T,'sine',f,f*.995,1.3-i*.2,.28/(i+1),.002))},
 fanfare:(c,d,T)=>{[[523,0],[659,.13],[784,.26],[1047,.4]].forEach(([f,t])=>{osc(c,d,T+t,'sawtooth',f,f,.9,.16);osc(c,d,T+t,'square',f/2,f/2,.9,.1)});[523,659,784].forEach(f=>osc(c,d,T+.55,'sawtooth',f,f,1.2,.14))},
 tick:(c,d,T,o)=>osc(c,d,T,'sine',(o&&o.f)||1000,(o&&o.f)||1000,.08,.3),
 beep:(c,d,T,o)=>osc(c,d,T,'square',(o&&o.f)||880,(o&&o.f)||880,.16,.16),
 blip:(c,d,T,o)=>osc(c,d,T,'square',(o&&o.f)||520,(o&&o.f)||520,.04,.07),
 pop:(c,d,T)=>{osc(c,d,T,'sine',700,200,.12,.28);nz(c,d,T,.06,'highpass',2000,1,.15)},
 riser:(c,d,T,o)=>{const du=(o&&o.dur)||1.6;nz(c,d,T,du,'bandpass',300,1.4,.4,9000);osc(c,d,T,'sawtooth',120,900,du,.12,du*.8)},
 drumroll:(c,d,T,o)=>{const du=(o&&o.dur)||1.6;for(let t=0,k=0;t<du;k++){nz(c,d,T+t,.06,'lowpass',900,1,.18+.3*t/du);t+=Math.max(.035,.13*(1-t/du))}},
 stinger:(c,d,T)=>{osc(c,d,T,'sawtooth',110,880,.5,.25,.45);nz(c,d,T+.5,.25,'highpass',2000,.7,.5);osc(c,d,T+.5,'sine',160,50,.6,.8)},
 vs:(c,d,T)=>{S.boom(c,d,T);osc(c,d,T,'square',440,220,.35,.16);nz(c,d,T,.3,'highpass',1500,.8,.35)},
 bubble:(c,d,T)=>osc(c,d,T,'sine',600,900,.08,.12)
};
async function loadCrowd(){if(crowdP)return crowdP;const dc=new OfflineAudioContext(2,1,44100),ld=u=>fetch(new URL('sfx/'+u+'.mp3',document.baseURI).href).then(r=>r.arrayBuffer()).then(b=>dc.decodeAudioData(b)).catch(()=>null);
 crowdP=Promise.all(['crowd-cheer1','crowd-cheer2','crowd-roar','crowd-applause'].map(ld)).then(([c1,c2,roar,app])=>crowd={cheers:[c1,c2].filter(Boolean),roar,app});return crowdP}
function crowdAt(ctx,d,T,kind,len,g){if(!crowd)return;let b=kind==='roar'?crowd.roar:kind==='app'?crowd.app:(crowd.cheers[Math.floor(Math.random()*crowd.cheers.length)]);if(!b)return;const s=ctx.createBufferSource();s.buffer=b;s.playbackRate.value=.95+Math.random()*.1;const gn=ctx.createGain(),dur=Math.min(len||3,b.duration);gn.gain.setValueAtTime(.0001,T);gn.gain.linearRampToValueAtTime(g||.6,T+.15);gn.gain.setValueAtTime(g||.6,T+Math.max(.2,dur-1.2));gn.gain.linearRampToValueAtTime(.0001,T+dur);s.connect(gn);gn.connect(d);s.start(T);s.stop(T+dur+.05)}
/* every sound of one scene, as {at: seconds into the scene, ...} */
function events(B,seg){
 const E=[],o=B.opts||{},sfxOn=o.sfx!==false;if(!sfxOn)return E;const add=(at,name,x)=>E.push(Object.assign({at,name},x||{}));
 const talkOn=(o.talk==null?2:o.talk)>0;
 switch(seg.type){
  case 'title':add(0,'whoosh',{dur:.5});add(.2,'boom');add(.55,'boom');add(.55,'stinger');add(1.2,'crowd',{kind:'cheer',len:2.2,g:.35});break;
  case 'bracket':add(0,'riser',{dur:1.8});for(let i=0;i<10;i++)add(.3+i*.14,'pop');add(2.4,'whoosh',{dur:.6});add(4,'boom');add(4,'vs');break;
  case 'intro':add(.1,'whoosh',{dur:.5});add(.25,'whoosh',{dur:.5});if(talkOn){for(let i=0;i<6;i++){add(1+i*.14,'blip',{f:480+i*30});add(2.45+i*.14,'blip',{f:400+i*30})}}add(1.7,'vs');add(3.4,'riser',{dur:.3});add(3.7,'stinger');add(3.7,'crowd',{kind:'cheer',len:1.6,g:.4});break;
  case 'play':{const SC=window.MZBattleScenes;if(SC&&SC.hitsOf&&seg.r!=null)SC.hitsOf(B,seg).forEach(h=>add(h.t,h.blk?'tick':h.big?'snap':'pop',{f:1500}));break}
  case 'vote':add(0,'whoosh',{dur:.4});for(let k=0;k<5;k++){add(.6+k,'tick',{f:900+k*40})}add(5.6,'bell');if(talkOn){add(.6,'blip');add(.9,'blip')}break;
  case 'recap':{const k=seg.rd/7,t=x=>x*k,fin=seg.fin||{};add(0,'whoosh',{dur:.4});add(t(.7),'drumroll',{dur:t(1.8)});for(let i=0;i<5;i++)add(t(.8+i*.3),'tick',{f:700+i*60});add(t(2.4),'riser',{dur:.15});
   add(t(2.5),fin.sfx||'boom');if(fin.sfx!=='boom')add(t(2.5),'boom',{g:.5});add(t(2.55),'crowd',{kind:fin.id==='photo'||fin.id==='decision'?'app':'cheer',len:3,g:.55});add(t(3.6),'bell');if(fin.id==='flawless'||fin.id==='upset')add(t(3.0),'fanfare');add(t(3.7),'crowd',{kind:'app',len:3.2,g:.35});
   if(talkOn){for(let i=0;i<6;i++){add(t(3.7+i*.12),'blip',{f:500+i*20});add(t(5.2+i*.12),'blip',{f:340+i*20})}}break}
  case 'champ':add(0,'riser',{dur:2});add(1.9,'whoosh',{dur:.5});add(2.5,'boom');add(2.5,'fanfare');add(2.45,'crowd',{kind:'roar',len:6,g:.7});add(4.0,'crowd',{kind:'app',len:6,g:.45});for(let i=0;i<10;i++)add(3.0+i*.55,'pop');if(talkOn)for(let i=0;i<7;i++)add(5+i*.15,'blip',{f:520+i*20});add(7,'whoosh',{dur:.5});add(7.4,'bell');break;
  case 'outro':add(0,'whoosh',{dur:.5});add(.9,'tick',{f:1400});add(.95,'bell');if(seg.champion)add(.3,'crowd',{kind:'app',len:3.5,g:.4});break}
 return E}
/* lays everything between `from` and `until` (seconds of the episode) onto ctx; t0 = ctx time of `from` */
function schedule(ctx,dest,B,tl,from,until,t0){
 const bus=ctx.createGain(),comp=ctx.createDynamicsCompressor();bus.gain.value=.9;comp.threshold.value=-12;comp.ratio.value=5;comp.attack.value=.004;comp.release.value=.18;bus.connect(comp);comp.connect(dest);const sfx=ctx.createGain();sfx.gain.value=.38;sfx.connect(bus);
 const C=T=>t0+(T-from);
 tl.segs.forEach(seg=>{
  if(seg.start+seg.dur<=from||seg.start>=until)return;
  /* the beat of a playing scene */
  if(seg.type==='play'){const F=B.fighters[(seg.side===0?B.rounds[seg.r][seg.m].a:B.rounds[seg.r][seg.m].b)],bf=F.beat&&F.beat.buf;if(bf){const a=Math.max(seg.start,from),e=Math.min(seg.start+seg.dur,until),off=(F.beat.start||0)+(a-seg.start);if(off<bf.duration){const s=ctx.createBufferSource();s.buffer=bf;if(bf.duration<seg.dur+(F.beat.start||0))s.loop=true;const gn=ctx.createGain();const T0=C(a),T1=C(e);gn.gain.setValueAtTime(a>seg.start?1:.0001,T0);if(a<=seg.start)gn.gain.linearRampToValueAtTime(1,T0+.25);gn.gain.setValueAtTime(1,Math.max(T0,T1-1.3));gn.gain.linearRampToValueAtTime(.0001,T1);s.connect(gn);gn.connect(bus);s.start(T0,off,Math.max(.05,e-a));s.stop(T1+.05)}}}
  events(B,seg).forEach(ev=>{const at=seg.start+ev.at;if(at<from||at>=until)return;const T=C(at);if(ev.name==='crowd')crowdAt(ctx,sfx,T,ev.kind,ev.len,ev.g);else if(S[ev.name])S[ev.name](ctx,sfx,T,ev)})});
}
async function renderRange(B,tl,from,until,sr){sr=sr||44100;const len=Math.max(.1,until-from),ctx=new OfflineAudioContext(2,Math.ceil(len*sr),sr);await loadCrowd();schedule(ctx,ctx.destination,B,tl,from,until,0);return ctx.startRendering()}
window.MZBattleAudio={S,schedule,renderRange,events,loadCrowd};
})();
