/* MZPRD Show director: 52 camera moves, effects and viewer hooks for the pixel concert (show.js).
   Items are named by code: C = camera, E = effects, H = hooks. A planner turns the show script into timed events
   (auto-director, re-rollable, editable by hand in the Show Maker) and the director draws them inside show.js.
   Everything is switched on/off per code through script.dir = {on, amount, off:{code:true}, seed, auto, events, hook, tag, callouts, bait}. */
(function(){
'use strict';
const M=window.MZShow,W=M.W,H=M.H;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const eo3=p=>1-Math.pow(1-clamp(p,0,1),3),io=p=>{p=clamp(p,0,1);return p*p*(3-2*p)};
const COLD=3.2;

/* ---------- the catalogue ---------- */
const CODES={
 C1:'Slow push-in on builds',C2:'Whip pan between sections',C3:'Drop punch zoom + slow-mo freeze',C4:'Crane rise over the crowd (finale)',C5:'Orbit sway in quiet parts',
 C6:'Rack focus (crowd blurs / DJ sharp)',C7:'Snap cuts to other angles on snares',C8:'Dutch tilt on heavy hits',C9:'Handheld drift',C10:'Dolly zoom (vertigo)',
 C11:'Beat zoom bumps on snares',C12:'Rise from the floor into the stage',C13:'Pull-back reveal (hands to crowd)',C14:'Crowd cam swoop',C15:'Speed ramp (slow-mo into a fast snap)',
 C16:'Mirror flip cut',C17:'Quick cut to the hands',
 E1:'Light beams sweeping with the bass',E2:'Strobe bursts with a warning',E3:'Shockwave rings on drops',E4:'CO2 jets and flame bursts',E5:'Confetti cannons + streamers',
 E6:'Chromatic aberration glitch',E7:'Film look (grain, bloom, grade)',E8:'Speed lines and zoom blur',E9:'Beat-synced screen pulse',E10:'Glow on text',
 E11:'Laser tunnel on the build',E12:'Floor light grid',E13:'Smoke bursts catching the beams',E14:'Lightning arcs',E15:'Gold sparks drifting down',
 E16:'Color wash per section',E17:'Screen crack and glitch before a drop',E18:'Heat-shimmer warp',E19:'Silhouette flash on the first drop hit',E20:'Particle burst from the pads',
 E21:'LED wall logo pulse',E22:'Trailing light streaks on fast moves',
 S11:'Mood: city skyline night',S12:'Mood: rain on glass',S13:'Mood: stars and aurora',S14:'Mood: lava and flame wall',S15:'Mood: pixel rain',S16:'Mood: fireworks over the skyline',
 S17:'Countdown clock on the wall',S18:'DROP text wipe on the wall',S19:'Energy meter filling to the drop',S20:'Flash frames on the kick',S21:'Live heart counter',
 S28:'Beat cover art slide-in',S29:'Up-next teaser',S30:'Milestone celebration on the wall',
 H1:'Cold open teaser of the drop',H2:'Countdown to the drop',H3:'Milestone pop-ups',H4:'Callout banners',H5:'Title + tag lower-third',H6:'Surprise moment mid-show',
 H7:'Title card slam',H8:'Loop-back ending',H9:'Progress bar to the drop',H10:'Fake false drop',H11:'Comment-bait overlay',H12:'Beat counter popups',H13:'Beat-synced subtitle words'
};
const rng=(a,b)=>{const o=[];for(let i=a;i<=b;i++)o.push(i);return o};
const GROUPS=[['CAMERA MOVES','C',rng(1,17)],['EFFECTS','E',rng(1,22)],['HOOKS AND ENGAGEMENT','H',rng(1,13)],['BACK SCREEN','S',rng(11,21).concat([28,29,30])]];
/* default length (s) of items that live on the timeline as events */
const DEFD={C2:.55,C3:1.2,C4:7,C6:3.4,C10:1.5,C12:2.2,C13:4.2,C14:3.4,C15:1.8,C16:.5,C17:.7,E2:2,E3:1,E4:1.4,E5:2.4,E6:.45,E11:8,E17:.5,E18:1.3,E19:.55,H2:3,H4:3.4,H6:3.6,H10:.9,S17:3,S18:1.1};
const DEFAULT_HOOK='MZPRD BEATS LINK IN BIO',DEFAULT_CALLS=['NEW BEAT OUT NOW','LINK IN BIO','MZPRD.COM'],DEFAULT_BAIT='RATE THIS BEAT 1 TO 10 IN THE COMMENTS';
/* shows saved before the director existed have no sc.dir and play exactly as they did */
const enabled=(sc,c)=>{const d=sc.dir;if(!d||d.on===false)return false;return !(d.off&&d.off[c])};
const amount=sc=>{const a=sc.dir&&sc.dir.amount;return a==null?1:clamp(a,.2,1.6)};
const bpmAt=(sc,T)=>{const i=M.trackAt(sc,T),t=i>=0?sc.tracks[i]:null;return(t&&t.bpm)||92};

/* the one drop that gets the fake silence (a build leads into it) */
function falseDrop(sc){
 if(!enabled(sc,'H10'))return -1;const s=sc.segments,c=[];
 s.forEach((g,i)=>{if(g.preset==='drop'&&i>0&&s[i-1].preset==='build'&&s[i-1].end-s[i-1].start>=8)c.push(i)});
 return c.length?c[c.length>1?1:0]:-1;
}
function audioDips(sc){return plan(sc).filter(e=>e.id==='H10').map(e=>({a:e.t,b:e.t+e.d}))}
const coldEnd=sc=>enabled(sc,'H1')?COLD:0;

/* ---------- the planner: script -> timed events ---------- */
function plan(sc){
 const d=sc.dir||{};
 if(d.auto===false&&Array.isArray(d.events))return d.events.filter(e=>e&&CODES[e.id]&&enabled(sc,e.id)).map(e=>Object.assign({},e)).sort((a,b)=>a.t-b.t);
 const R=M.mulberry(((d.seed!=null?d.seed:sc.seed||0)|0)*7919+13),ev=[],S=sc.segments,len=sc.len,cold=coldEnd(sc),fd=falseDrop(sc);
 const add=(id,t,du,x)=>{if(!enabled(sc,id))return;if(t<0)t=0;if(t>=len+8)return;ev.push(Object.assign({id,t:Math.round(t*100)/100,d:du||DEFD[id]||1},x||{}))};
 let dir=1,drops=0;
 S.forEach((g,i)=>{
  const a=g.start,b=g.end,pr=g.preset,bl=60/bpmAt(sc,a+1),bar=bl*4,dur=b-a,pre=i>0?S[i-1]:null;
  if(i>0){add('E6',a-.12,.45);if(R()<.62){dir=-dir;add('C2',a-.15,.55,{k:dir})}else if(pr==='drop'&&R()<.3)add('C16',a,Math.max(.4,bl*2))}
  if(pr==='intro'&&i===0){add('C13',Math.max(cold,.2),4.2)}
  if(pr==='build'){
   if(i>0&&R()<.8)add('C12',a,2.2,{k:R()<.5?1:-1});
   add('E11',Math.max(a,b-9),Math.min(9,dur));
   if(i+1<S.length&&S[i+1].preset==='drop'&&dur>=4){
    if(dur>=5){add('H2',b-3,3);add('S17',b-3,3)}add('H9',a,dur);
    if(dur>=7&&R()<.9)add('C10',b-1.7,1.5);
    if(fd!==i+1){add('E17',b-.6,.5);if(dur>=6)add('E2',b-bl*4,bl*3.6)}
   }
  }
  if(pr==='drop'){
   drops++;const first=drops===1;
   add('C3',a,1.2);add('S18',a,1.1);add('E3',a,1);add('E19',a,.55);add('E18',a+.1,1.3);add('E4',a,1.4,{k:'c'});add('E5',a+.05,2.4);
   for(let t=a+bar*2,n=0;t<b-bar*1.5;t+=bar*2,n++){
    if(R()<.38)add('C17',t,.7);
    else if(R()<.14)add('C16',t,bl*2);
    if(n%2===1&&R()<.7)add('E4',t,1.2,{k:'f'});
    if(n%3===2&&R()<.6)add('E5',t,2.2);
    if(R()<.3)add('E3',t,1);
   }
   if(first&&dur>=14)add('C14',a+dur*.3,3.4);
  }
  if(pr==='breakdown'){for(let t=a+2,n=0;t<b-4;t+=bl*12,n++)add('C6',t,3.4,{k:n%2?1:-1})}
  if(pr==='finale'){add('C4',a,Math.min(7,dur));add('E3',a,1);add('E4',a,1.5,{k:'f'});add('E5',a+.8,2.5);if(dur>10)add('E5',b-6,2.6);add('E3',b-6,1)}
 });
 /* the speed ramp lands on the second drop (or the first if only one) */
 const dr=S.filter(g=>g.preset==='drop');
 {const g=dr[dr.length>1?1:0];if(g&&g.end-g.start>=12)add('C15',g.start+(g.end-g.start)*.62,1.8)}
 /* the surprise moment: mid-show, inside a drop */
 {const g=dr[dr.length>1?1:0];if(g&&g.end-g.start>=10){const bar=60/bpmAt(sc,g.start+1)*4;add('H6',g.start+Math.round((g.end-g.start)*.45/bar)*bar,3.6)}}
 if(len>=60){add('H4',len*.2,3.4,{k:0});add('H4',len*.68,3.4,{k:1})}
 if(fd>=0){const a=S[fd].start;add('H10',a-.9,.9)}
 /* camera moves never overlap (a whip pan may still run into a drop punch); higher priority wins */
 const PRI=['H6','C3','C4','C14','C15','C13','C12','C10','C17','C16','C6'],busy=[];
 const keep=ev.filter(e=>{const pi=PRI.indexOf(e.id);return pi<0}),cams=ev.filter(e=>PRI.indexOf(e.id)>=0).sort((a,b)=>PRI.indexOf(a.id)-PRI.indexOf(b.id)||a.t-b.t);
 cams.forEach(e=>{const a=e.t+(e.id==='H6'?.7:0),b=e.t+e.d;if(busy.some(x=>a<x[1]-.02&&b>x[0]+.02))return;busy.push([a,b]);keep.push(e)});
 ev.length=0;keep.forEach(e=>ev.push(e));
 ev.sort((x,y)=>x.t-y.t);return ev;
}

/* ---------- the director (one per stage) ---------- */
function create(st){
 const D={sc:null,hits:[],ev:[],wev:[],kicks:[],heavy:[],snares:[],snaps:[],bars:[],prevT:-1,parts:{ring:[],puff:[],flame:[],conf:[],strm:[],bolt:[],spark:[],gold:[],smoke:[]},
  imgs:{},msEv:[],hpart:[],_sf:-9,_sfv:0,_hv:null,fired:new Set(),words:[],wordIdx:0,lastWord:-9,hitK:0,shownMs:new Set(),ms:[],first:null,firstHave:false,rngS:1};
 const R=()=>Math.random();
 const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;const tx=tmp.getContext('2d');
 const tmp2=document.createElement('canvas');tmp2.width=W;tmp2.height=H;const tx2=tmp2.getContext('2d');
 const tmp3=document.createElement('canvas');tmp3.width=W;tmp3.height=H;const tx3=tmp3.getContext('2d');
 const small=document.createElement('canvas');small.width=W/6|0;small.height=H/6|0;const sx=small.getContext('2d');
 const snap=document.createElement('canvas');snap.width=W/2;snap.height=H/2;const snx=snap.getContext('2d');
 const on=c=>D.sc?enabled(D.sc,c):false;let amt=1;
 const last=(arr,T)=>{let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m].t<=T)lo=m+1;else hi=m}return lo-1};
 const cv={rd:(a,T,tau)=>{const i=last(a,T);if(i<0)return{e:0,i:-1};const h=a[i],d=T-h.t;return{e:d>=0&&d<tau*5?Math.exp(-d/tau)*(h.s||1):0,i,h}}};

 D.setScript=(sc,hits)=>{
  D.sc=sc;D.hits=hits||[];amt=amount(sc);D.ev=plan(sc);D.reset();
  const segOf=t=>M.segAt(sc,t).seg.preset;
  D.kicks=D.hits.filter(h=>h.type==='kick');D.heavy=D.kicks.filter(h=>h.s>.72);D.snares=D.hits.filter(h=>h.type==='snare');
  /* snap-cut moments: a snare in a drop or finale, never closer than 1.6s apart */
  D.snaps=[];let lt=-9;D.snares.forEach(h=>{const p=segOf(h.t);if((p==='drop'||p==='finale')&&h.t-lt>1.6&&((h.t*7.3)%1)<.46){D.snaps.push({t:h.t,k:D.snaps.length});lt=h.t}});
  /* time warps (hit-stop and speed ramp) must never overlap or time could run backwards */
  D.wev=[];let end=-9;D.ev.filter(e=>e.id==='C3'||e.id==='C15').forEach(e=>{const w=e.id==='C3'?{t:e.t,s:.16,v:.1,rec:.45}:{t:e.t,s:.75,v:.18,rec:.55};if(w.t>=end+.05){D.wev.push(w);end=w.t+w.s+w.rec}});
  D.ms=(sc.milestones||[]).slice().sort((a,b)=>a.at-b.at);D.words=String((sc.dir&&sc.dir.hook)||DEFAULT_HOOK).trim().split(/\s+/).filter(Boolean);
 };
 D.events=()=>D.ev;
 D.reset=()=>{for(const k in D.parts)D.parts[k].length=0;D.fired=new Set();D.prevT=-1;D.hitK=0;D.wordIdx=0;D.lastWord=-9;D.shownMs=new Set();D.msPop=[];D.msEv=[];D.hpart=[];D._sf=-9;D._sfv=0;D._hv=null;D.firstHave=false};
 D.active=mode=>!!D.sc&&!!D.sc.dir&&D.sc.dir.on!==false&&(mode==='live'||mode==='end');

 /* the clock slows around hit-stops and speed ramps, then catches up (always moves forward) */
 D.warp=T=>{let L=0;for(const w of D.wev){if(T<=w.t)continue;const Ls=w.s*(1-w.v);if(T<w.t+w.s)L+=(T-w.t)*(1-w.v);else if(T<w.t+w.s+w.rec)L+=Ls*(1-(T-w.t-w.s)/w.rec)}return T-L};
 D.catchup=T=>{for(const w of D.wev)if(T>=w.t+w.s&&T<w.t+w.s+w.rec)return 1-(T-w.t-w.s)/w.rec;return 0};
 D.coldOn=(T,mode)=>mode==='live'&&on('H1')&&T>=0&&T<COLD;
 const SNAP=[[-170,-30,.22],[190,-40,.22],[0,80,.32],[50,-100,.2],[-120,60,.26],[130,70,.24]];
 const act=(T,id)=>{let r=null;for(const e of D.ev){if(e.t>T)break;if(e.id===id&&T<e.t+e.d)r=e}return r};
 D.actAll=(T,id)=>{const o=[];for(const e of D.ev){if(e.t>T)break;if(e.id===id&&T<e.t+e.d)o.push(e)}return o};

 /* ---------- camera: returns multipliers / offsets applied on top of the normal camera ---------- */
 D.cam=(T,dt,q,mode)=>{
  const a=amt,pr=q.seg.preset,p=q.p,sg=q.seg;let z=1,x=0,y=0,rot=0,flip=false,vert=0,whip=0,rack=0,speed=0,ab=null;
  const sc=D.sc,loud=pr==='drop'||pr==='finale';
  if(on('C9')){x+=(Math.sin(T*1.3)+Math.sin(T*2.7+1)*.5)*3.2*a;y+=(Math.sin(T*1.1+2)+Math.sin(T*2.3)*.6)*2.6*a;rot+=Math.sin(T*.9)*.0035*a}
  if(on('C1')&&pr==='build')z*=1+.2*p*p*a;
  if(on('C5')&&(pr==='intro'||pr==='breakdown')){const w=io(Math.min((T-sg.start)/.9,(sg.end-T)/.9,1));x+=Math.sin(T*.45)*70*w*a;y+=Math.cos(T*.37)*18*w*a;rot+=Math.sin(T*.45)*.014*w*a;z*=1+.05*(.5+.5*Math.sin(T*.3))*w*a}
  if(on('C11')){const e=cv.rd(D.snares,T,.09).e;z*=1+.03*e*a*(loud?1:.45)}
  if(on('C8')&&loud){const r=cv.rd(D.heavy,T,.42);if(r.i>=0){const sgn=(r.i%2)?1:-1;rot+=sgn*.06*r.e*a;}}
  if(on('C7')&&D.snaps.length){const i=last(D.snaps,T);if(i>=0){const s=D.snaps[i],pp=(T-s.t)/.55;if(pp>=0&&pp<1){const f=Math.pow(1-pp,2.2),o=SNAP[s.k%SNAP.length];x+=o[0]*f*a;y+=o[1]*f*a;z*=1+o[2]*f*a}}}
  if(mode==='live'&&D.coldOn(T,mode)){const bl=60/bpmAt(sc,0),ph=(T%bl)/bl;z*=1+.14*Math.exp(-ph*5)+.1*(T/COLD)}
  for(const e of D.ev){
   if(e.t>T)break;if(T>=e.t+e.d)continue;const pp=(T-e.t)/e.d;
   switch(e.id){
    case'C2':{const f=1-eo3(pp);x+=(e.k||1)*460*f*a;whip=Math.max(whip,f);speed=Math.max(speed,f*.8);break}
    case'C3':{const k=Math.exp(-pp*6.5);z*=1+.42*k*a;rot+=.02*k*((e.t*3)%2<1?1:-1);speed=Math.max(speed,k*.9);break}
    case'C4':{const f=1-eo3(pp);y+=230*f-60*Math.sin(pp*Math.PI);z*=1+.35*f+.04*Math.sin(pp*Math.PI);break}
    case'C6':{const w=Math.min(1,pp*6,(1-pp)*6);rack=(e.k||1)*Math.cos(Math.PI*pp)*w;break}
    case'C10':{const w=io(pp);z*=1+.4*w*a;vert=Math.max(vert,w);break}
    case'C12':{const f=1-eo3(pp);y+=270*f;z*=1+.3*f;rot+=.05*f*(e.k||1);speed=Math.max(speed,f*.35);break}
    case'C13':{const f=eo3(pp);z*=lerp(2.3,1,f);x+=lerp(46,0,f);y+=lerp(90,0,f);break}
    case'C14':{const w=io(pp*6)*(1-io((pp-.8)/.2));x+=lerp(-260,260,io(pp))*w;y+=lerp(220,70,pp)*w;z*=1+(.5-.3*pp)*w;speed=Math.max(speed,.35*w);break}
    case'C15':{z*=1+.18*Math.pow(Math.sin(Math.PI*pp),.8)*a;break}
    case'C16':flip=true;break;
    case'C17':{const w=Math.min(1,pp/.18)*(1-io((pp-.72)/.28));ab={w,x:46,y:82,z:1+2.1*a};speed=Math.max(speed,.5*w);break}
    case'H6':{const bt=.8,tt=T-e.t-bt;if(tt>=0){z*=1+.4*Math.exp(-tt*6)*a;speed=Math.max(speed,Math.exp(-tt*5))}break}
   }
  }
  speed=Math.max(speed,D.catchup(T)*.9);
  /* never show the black edge of the stage art: zoom just enough to cover the pan, tilt and shift */
  const need=1+2.3*Math.abs(x)/W+2.3*Math.abs(y)/H+Math.abs(rot)*1.5;z=Math.min(Math.max(z,need),3.6);
  const sxv=clamp((x-(D._px||0))*2.2,-40,40);D._px=x;
  return{z,x,y,rot,flip,vert,whip,rack,speed,ab,sx:sxv,hy:0};
 };

 /* ---------- events + particles ---------- */
 const spawnRing=(x,y,hue,delay)=>D.parts.ring.push({x,y,r:10,l:1,h:hue,dl:delay||0});
 const puff=(x,y,vx,vy,r,hue,kind,life)=>{const P=D.parts[kind];if(P.length<260)P.push({x,y,vx,vy,r,h:hue,l:1,lf:life||1.2})};
 const jets=[[70,572],[255,574],[845,574],[1030,572]];
 const cannon=(side,n)=>{const x=side?W-30:30,y=H-20,base=side?-Math.PI*.64:-Math.PI*.36;for(let i=0;i<n;i++){const an=base+(R()-.5)*.55,sp=520+R()*520;if(D.parts.conf.length<700)D.parts.conf.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,c:Math.floor(R()*360),l:1,s:3+R()*3,sp:R()*10})}
  for(let i=0;i<Math.ceil(n/9);i++){const an=base+(R()-.5)*.45,sp=500+R()*380;if(D.parts.strm.length<60)D.parts.strm.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,c:Math.floor(R()*360),l:1,len:60+R()*60,ph:R()*6})}};
 const bolt=(x0,y0,x1,y1,hue)=>{const pts=[[x0,y0]],n=9;for(let i=1;i<n;i++){const u=i/n;pts.push([lerp(x0,x1,u)+(R()-.5)*70*Math.sin(Math.PI*u),lerp(y0,y1,u)+(R()-.5)*40])}pts.push([x1,y1]);
  const fork=[];if(R()<.7){const k=3+Math.floor(R()*3),b=pts[k];fork.push([b,[b[0]+(R()-.5)*160,b[1]+60+R()*70]])}D.parts.bolt.push({pts,fork,l:1,h:hue})};
 D.tick=(T,dt,ex)=>{
  const sc=D.sc,prev=D.prevT;
  if(prev<0||T<prev||T-prev>.6){D.reset();D.prevT=T;D.hitK=Math.max(0,D.hits.findIndex(h=>h.t>=T-.01));if(D.hitK<0)D.hitK=D.hits.length;
   const fa=D.hits.filter(h=>h.t<T);D.hitK=fa.length;for(const e of D.ev)if(e.t<=T)D.fired.add(e);D.ms.forEach(m=>{if(st.hearts>=m.at)D.shownMs.add(m)});return}
  for(const m of D.ms){if(st.hearts>=m.at&&!D.shownMs.has(m)){D.shownMs.add(m);D.msEv.push({m,t:T})}}
  D.msEv=D.msEv.filter(o=>T-o.t<5&&T>=o.t);
  /* events that start now */
  for(const e of D.ev){if(e.t>T)break;if(D.fired.has(e))continue;D.fired.add(e);
   if(e.id==='E3'){for(let i=0;i<3;i++)spawnRing(546,440,ex.hue+i*30,i*.13)}
   if(e.id==='E5'){cannon(0,70);cannon(1,70);e.n2=true}
   if(e.id==='H6'){e.boom=false}
  }
  for(const e of D.ev){if(e.t>T)break;if(T>=e.t+e.d)continue;
   if(e.id==='E4'){const flame=e.k==='f',n=Math.round(dt*(flame?150:46)*amt+R());jets.forEach(([jx,jy])=>{for(let i=0;i<n;i++){puff(jx+(R()-.5)*16,jy,(R()-.5)*50,-(flame?330:260)-R()*180,flame?9+R()*7:16+R()*12,flame?18+R()*28:210,flame?'flame':'puff',flame?.55:1.1)}})}
   if(e.id==='E5'&&e.n2&&T>=e.t+.45){e.n2=false;cannon(0,40);cannon(1,40)}
   if(e.id==='H6'&&!e.boom&&T>=e.t+.8){e.boom=true;cannon(0,60);cannon(1,60);for(let i=0;i<3;i++)spawnRing(546,440,ex.hue+i*30,i*.12);for(let i=0;i<24;i++)st.burst(W*(.2+R()*.6),H*(.08+R()*.18),R()*360,3)}
  }
  /* hits that just landed */
  const HS=D.hits;while(D.hitK<HS.length&&HS[D.hitK].t<=T){const h=HS[D.hitK],k=D.hitK;D.hitK++;if(T-h.t>.3)continue;
   const loud=ex.loud,hot=ex.pr==='drop'||ex.pr==='finale';
   if(on('E20')){const pad=h.type==='kick'?(k%2?0:3):h.type==='snare'?(5+(k%2)):(8+(k%4)),pp=ex.PADS[pad%12];if(pp)for(let i=0;i<5;i++){const an=-Math.PI/2+(R()-.5)*2.2,sp=70+R()*140;D.parts.spark.push({x:pp[0],y:pp[1],vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,l:1,h:(pad*47+ex.hue)%360})}}
   if(h.type==='kick'&&h.s>.7&&hot){
    if(on('E13')&&R()<.5)D.parts.smoke.push({x:180+R()*730,y:572,r:50,vr:70,vy:-26,l:1,h:ex.hue+R()*40});
    if(on('E14')&&(ex.pr==='finale'||R()<.3)){const fx=[[298,78],[378,78],[712,78],[796,78]],f0=fx[Math.floor(R()*4)];bolt(f0[0],f0[1],320+R()*450,330+R()*80,ex.hue)}}
   if(on('H13')&&hot&&h.type==='kick'&&h.s>.55&&T-D.lastWord>.32&&D.words.length){D.lastWord=T;D.msPop=D.msPop||[];D.wordCur={w:D.words[D.wordIdx%D.words.length],t:T,x:W*(.3+R()*.4)};D.wordIdx++}
  }
  /* gold sparks drift down in quiet moments */
  if(on('E15')&&(ex.pr==='breakdown'||ex.pr==='intro')&&D.parts.gold.length<200&&R()<dt*55*amt)D.parts.gold.push({x:R()*W,y:-6+R()*120,vx:(R()-.5)*14,vy:26+R()*38,ph:R()*6.28,l:1})
  D.prevT=T;
 };
 const stepParts=(dt)=>{
  const P=D.parts;
  P.ring=P.ring.filter(r=>r.l>0);P.ring.forEach(r=>{if(r.dl>0){r.dl-=dt;return}r.r+=dt*850;r.l-=dt*1.05});
  ['puff','flame','smoke'].forEach(k=>{P[k]=P[k].filter(p=>p.l>0);P[k].forEach(p=>{p.x+=(p.vx||0)*dt;p.y+=p.vy*dt;if(k==='smoke'){p.r+=p.vr*dt;p.l-=dt*.4}else{p.vy*=.97;p.r=k==='flame'?Math.max(2,p.r-dt*22):p.r+dt*46;if(k==='flame')p.x+=Math.sin(p.l*14+p.y*.05)*dt*40;p.l-=dt/(p.lf||1)}})});
  P.conf=P.conf.filter(p=>p.l>0&&p.y<H+20);P.conf.forEach(p=>{p.vy+=520*dt;p.vx*=.985;p.vy*=.99;p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt*.32});
  P.strm=P.strm.filter(p=>p.l>0&&p.y<H+60);P.strm.forEach(p=>{p.vy+=420*dt;p.vx*=.985;p.vy*=.985;p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt*.3;p.ph+=dt*9});
  P.bolt=P.bolt.filter(b=>b.l>0);P.bolt.forEach(b=>b.l-=dt*5);
  P.spark=P.spark.filter(s=>s.l>0);P.spark.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=200*dt;s.l-=dt*2.4});
  P.gold=P.gold.filter(g=>g.y<H&&g.l>0);P.gold.forEach(g=>{g.y+=g.vy*dt;g.x+=g.vx*dt+Math.sin(g.ph+g.y*.03)*14*dt;g.l-=dt*.1});
 };

 /* ---------- per-frame context ---------- */
 D.frame=(Treal,T,dt,q,P,mode,bpm,int,hue,au,E,PADS)=>{
  const ex={Treal,T,dt,q,P,mode,bpm,int,hue,au,E,PADS,pr:q.seg.preset,bl:60/bpm,bass:au.bass||0,loud:au.loud||0,cold:D.coldOn(Treal,mode)};
  ex.kick=cv.rd(D.kicks,Treal,.12).e;ex.snare=cv.rd(D.snares,Treal,.1).e;
  if(!D.firstHave&&mode==='live'&&Treal<.35){D.needSnap=true}
  D.tick(Treal,dt,ex);stepParts(dt);return ex;
 };

 /* ---------- world drawing (inside the camera) ---------- */
 const beam=(c,x0,y0,ang,len,half,hue,al)=>{const x1=x0+Math.cos(ang)*len,y1=y0+Math.sin(ang)*len,px=-Math.sin(ang),py=Math.cos(ang),g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,`hsla(${hue},100%,72%,${al})`);g.addColorStop(1,`hsla(${hue},100%,50%,0)`);c.fillStyle=g;c.beginPath();c.moveTo(x0-4,y0);c.lineTo(x0+4,y0);c.lineTo(x1+px*half,y1+py*half);c.lineTo(x1-px*half,y1-py*half);c.closePath();c.fill()};
 D.beams=(c,ex)=>{ /* E1 */
  if(!on('E1'))return;const w=ex.pr==='drop'||ex.pr==='finale'?1:ex.pr==='build'?.35+.65*ex.q.p:.1;if(w<.05)return;
  c.save();c.globalCompositeOperation='lighter';
  [[298,78],[378,78],[712,78],[796,78],[438,84],[653,86]].forEach(([x,y],i)=>{const sg=i%2?1:-1,ang=Math.PI/2+Math.sin(ex.T*1.1+i*1.3)*(.5+ex.bass*.7)*sg,hu=ex.hue+i*16;beam(c,x,y,ang,H*.95,20+ex.bass*34,hu,(.08+ex.bass*.3+ex.kick*.12)*w*amt)});
  c.restore();
 };
 D.floor=(c,ex)=>{ /* E12 */
  if(!on('E12'))return;const w=ex.pr==='drop'||ex.pr==='finale'?1:ex.pr==='build'?.45:0;if(w<.05)return;
  c.save();c.globalCompositeOperation='lighter';
  for(let r=0;r<3;r++)for(let k=0;k<16;k++){const x=150+k*50+r*2,y=582+r*8,v=(.18+.6*ex.kick)*(.45+.55*Math.sin(ex.T*3.4+k*.55+r*1.2)**2)*w*amt;c.fillStyle=`hsla(${(ex.hue+k*14+r*30)%360},100%,62%,${v*.5})`;c.fillRect(x,y,44,6)}
  c.restore();
 };
 D.tunnel=(c,ex)=>{ /* E11 */
  for(const e of D.actAll(ex.Treal,'E11')){const p=(ex.Treal-e.t)/e.d,fade=io(Math.min(1,p*3))*(1-io((p-.9)/.1))*amt;if(fade<=.02)continue;
   c.save();c.globalCompositeOperation='lighter';c.translate(546,380);
   for(let k=0;k<10;k++){const u=((k/10+ex.Treal*(.28+p*1.1))%1),r=u*u*880+8,rot=ex.Treal*.5+k*.21;c.strokeStyle=`hsla(${k%2?190:305},100%,62%,${(.16+u*.6)*fade})`;c.lineWidth=1+u*3.5;c.beginPath();for(let s=0;s<=6;s++){const an=rot+s*Math.PI/3;s?c.lineTo(Math.cos(an)*r,Math.sin(an)*r*.8):c.moveTo(Math.cos(an)*r,Math.sin(an)*r*.8)}c.stroke()}
   c.restore()}
 };
D.led=(c,ex,sx0,sy0,sw,sh)=>{
  D.screen(c,ex,sx0,sy0,sw,sh);
  if(!on('E21'))return;const quiet=ex.pr==='breakdown'||ex.pr==='intro',al=(quiet?.8:.2+ex.kick*.25)*amt;if(al<.05)return;
  c.save();c.textAlign='center';c.textBaseline='middle';const s=40*(1+.09*ex.kick+(quiet?.03*Math.sin(ex.T*2):0));c.font=s+'px "Press Start 2P",monospace';
  c.shadowColor=`hsl(${ex.hue+20},100%,60%)`;c.shadowBlur=on('E10')?18:6;c.globalAlpha=Math.min(1,al);c.fillStyle=`hsl(${ex.hue+20},100%,86%)`;c.fillText('MZPRD',sx0+sw/2,sy0+sh*.46);
  if(quiet){c.font='11px "Press Start 2P",monospace';c.globalAlpha=Math.min(1,al*.75);c.shadowBlur=6;c.fillText('MEZTHEPROD',sx0+sw/2,sy0+sh*.46+40)}
  c.restore();
 };
 /* ---------- S: back screen effects (drawn inside the LED wall, which show.js clips for us) ---------- */
 const hs=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
 const getImg=path=>{if(!path||!window.pub)return null;let r=D.imgs[path];if(!r){const im=new Image();im.crossOrigin='anonymous';r=D.imgs[path]={im,ok:false};im.onload=()=>{r.ok=true};im.onerror=()=>{r.bad=true};try{im.src=window.pub(path)}catch(e){r.bad=true}}return r.ok?r.im:null};
 const HRT=['0110110','1111111','1111111','0111110','0011100','0001000'];
 const pixHeart=(c,x,y,u,col)=>{c.fillStyle=col;for(let r=0;r<6;r++)for(let q=0;q<7;q++)if(HRT[r][q]==='1')c.fillRect(x+q*u,y+r*u,u,u)};
 const wtxt=(c,t,x,y,size,col,al,blur)=>{c.save();c.font=size+'px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';c.globalAlpha=clamp(al,0,1);c.fillStyle='rgba(0,0,0,.85)';c.fillText(t,x+size*.07,y+size*.07);c.shadowColor=col;c.shadowBlur=on('E10')?(blur==null?size*.6:blur):0;c.fillStyle='#fff';c.fillText(t,x,y);c.restore()};
 const SCODES=['S11','S12','S13','S14','S15','S16','S17','S18','S19','S20','S21','S28','S29','S30'];
 D.screen=(c,ex,x0,y0,w,h)=>{
  const T=ex.Treal,pr=ex.pr,hue=ex.hue,sc=D.sc,q=ex.q,k=ex.kick,bass=ex.bass,dt=ex.dt;
  if(!SCODES.some(on))return;
  c.save();c.translate(x0,y0);
  /* S13 stars and aurora */
  if(on('S13')&&(pr==='intro'||pr==='breakdown')){c.save();c.globalCompositeOperation='lighter';
   for(let b=0;b<3;b++){const hu=[140,175,285][b],g=c.createLinearGradient(0,0,0,h*.75);g.addColorStop(0,`hsla(${hu},90%,60%,0)`);g.addColorStop(.5,`hsla(${hu},90%,60%,${.17*amt})`);g.addColorStop(1,`hsla(${hu},90%,60%,0)`);c.fillStyle=g;c.beginPath();c.moveTo(0,h*.75+60);for(let x=0;x<=w;x+=12)c.lineTo(x,h*(.25+.1*b)+Math.sin(x*.025+T*.45+b*1.7)*22+Math.sin(x*.07-T*.3)*7);c.lineTo(w,h*.75+60);c.closePath();c.fill()}
   for(let i=0;i<46;i++){const tw=.4+.6*Math.pow(Math.sin(T*(1+hs(i,3)*3)+i*3.1),2),sz=hs(i,9)<.2?2:1;c.fillStyle=`rgba(255,255,255,${.7*tw})`;c.fillRect(Math.floor(hs(i,1)*w),Math.floor(hs(i,2)*h*.65),sz,sz)}c.restore()}
  /* S15 pixel rain */
  if(on('S15')&&pr==='build'){c.save();c.globalCompositeOperation='lighter';const cols=Math.floor(w/9);
   for(let i=0;i<cols;i++){const sp=.25+hs(i,1)*.5,head=((T*sp+hs(i,2))%1.35)*(h+80)-40,x=i*9;for(let t=0;t<9;t++){const y=head-t*9;if(y<-9||y>h)continue;const a=(1-t/9)*(t===0?1:.55)*amt;c.fillStyle=t===0?`hsla(${hue},100%,88%,${a})`:`hsla(${hue},100%,56%,${a*.7})`;c.fillRect(x+1,y,hs(i*31+t,Math.floor(T*4)+t)>.5?6:4,7)}}c.restore()}
  /* S14 lava and flame wall */
  if(on('S14')&&(pr==='drop'||pr==='finale')){c.save();c.globalCompositeOperation='lighter';const n=26;
   for(let i=0;i<n;i++){const x=(i+.5)*w/n,hh=(.14+.3*(.5+.5*Math.sin(T*6+i*1.9))*(.4+bass*1.1+k*.4)*(.6+.4*hs(i,2)))*h*(pr==='finale'?1.1:1),g=c.createLinearGradient(0,h,0,h-hh);g.addColorStop(0,`hsla(18,100%,55%,${.8*amt})`);g.addColorStop(.6,`hsla(36,100%,55%,${.4*amt})`);g.addColorStop(1,'hsla(48,100%,60%,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-w/n*.7,h);c.quadraticCurveTo(x-w/n*.2,h-hh*.5,x+Math.sin(T*8+i)*5,h-hh);c.quadraticCurveTo(x+w/n*.2,h-hh*.5,x+w/n*.7,h);c.fill()}
   for(let i=0;i<24;i++){const age=(T*.5+hs(i,6))%1,x=hs(i,7)*w+Math.sin(age*6+i)*8,y=h-age*h*.9;c.fillStyle=`rgba(255,${150+Math.floor(hs(i,8)*80)},60,${(1-age)*.8})`;c.fillRect(x,y,2,2)}c.restore()}
  /* S12 rain on glass */
  if(on('S12')&&pr==='breakdown'){c.save();c.fillStyle='rgba(180,210,255,.05)';c.fillRect(0,0,w,h);c.globalCompositeOperation='lighter';
   for(let i=0;i<46;i++){const sp=.06+hs(i,1)*.12,y=((T*sp+hs(i,2))%1)*(h+20)-10,x=hs(i,3)*w+Math.sin(T*.7+i)*2;c.strokeStyle=`rgba(190,220,255,${.16+.2*hs(i,4)})`;c.lineWidth=1;c.beginPath();c.moveTo(x,y-14-hs(i,5)*18);c.lineTo(x,y);c.stroke();c.fillStyle='rgba(220,240,255,.55)';c.fillRect(x-1,y-1,2,3)}c.restore()}
  /* S16 fireworks over the skyline (finale) and S11 skyline (intro and finale) */
  if(on('S16')&&pr==='finale'){c.save();c.globalCompositeOperation='lighter';
   for(let j=0;j<3;j++){const per=1.3,k0=Math.floor(T/per)-j,age=T-k0*per;if(age<0||age>2.2)continue;const cx=hs(k0,11)*w*.8+w*.1,cy=h*(.18+.3*hs(k0,12)),hu=hs(k0,13)*360;for(let p=0;p<26;p++){const an=p/26*6.283+hs(k0,p)*.3,sp=40+hs(k0,p+30)*40,fx=cx+Math.cos(an)*sp*age,fy=cy+Math.sin(an)*sp*age+32*age*age;c.fillStyle=`hsla(${hu},100%,65%,${Math.max(0,1-age/2.2)})`;c.fillRect(fx,fy,2,2)}}c.restore()}
  if(on('S11')&&(pr==='intro'||pr==='finale')){c.save();const n=22,bw=w/n;
   for(let i=0;i<n;i++){const bh=h*(.16+.28*hs(i,5));c.globalCompositeOperation='source-over';c.fillStyle='rgba(6,5,16,.88)';c.fillRect(i*bw,h-bh,bw+1,bh);c.globalCompositeOperation='lighter';
    for(let wy=0;wy<bh-8;wy+=9)for(let wx=3;wx<bw-3;wx+=7){const id=i*97+wy*13+wx;if(hs(id,7)>.55&&Math.sin(T*(.5+hs(id,8))+id)>-.3){c.fillStyle=hs(id,4)<.3?'rgba(120,230,255,.7)':'rgba(255,205,110,.75)';c.fillRect(i*bw+wx,h-bh+4+wy,3,4)}}}c.restore()}
  /* S20 flash frames on the kick (at most about 3 a second) */
  if(on('S20')){if(T<D._sf)D._sf=-9;if((pr==='drop'||pr==='finale'||pr==='build')&&k>.55&&T-D._sf>.34){D._sf=T;D._sfv=1}D._sfv*=Math.exp(-dt*14);if(D._sfv>.03){c.save();c.globalCompositeOperation='lighter';c.fillStyle=`hsla(${hue},100%,${70+D._sfv*25}%,${.3*D._sfv*amt})`;c.fillRect(0,0,w,h);c.restore()}}
  /* S19 energy meter */
  if(on('S19')){let f=-1;if(pr==='build')f=q.p;else if(pr==='drop'&&T-q.seg.start<.7)f=1-(T-q.seg.start)/.7;
   if(f>=0){c.save();c.fillStyle='rgba(8,6,16,.7)';c.fillRect(w-20,10,12,h-20);const bh=(h-24)*f,g=c.createLinearGradient(0,h-12,0,12);g.addColorStop(0,'hsl(260,100%,60%)');g.addColorStop(1,'hsl(8,100%,60%)');c.fillStyle=g;c.fillRect(w-18,h-12-bh,8,bh);if(pr==='drop'){c.fillStyle=`rgba(255,255,255,${f*.8})`;c.fillRect(w-20,10,12,h-20)}c.strokeStyle='rgba(255,255,255,.4)';c.strokeRect(w-19.5,10.5,11,h-21);c.restore()}}
  /* S17 countdown clock */
  if(on('S17')){const e=act(T,'S17');if(e){const rem=e.d-(T-e.t),n=Math.ceil(rem),f=1-(rem-Math.floor(rem));if(n>=1){c.save();c.fillStyle=`rgba(8,6,20,${.55*(1-.3*f)})`;c.fillRect(0,0,w,h);c.restore();c.save();c.translate(w/2,h*.5);const sz=1+.28*(1-f)*(1-f);c.scale(sz,sz);wtxt(c,String(n),0,0,120,`hsl(${hue},100%,60%)`,1-.35*f,50);c.restore();wtxt(c,'DROP IN',w/2,26,12,`hsl(${hue},100%,60%)`,.9)}}}
  /* S18 DROP wipe */
  if(on('S18')){const e=act(T,'S18');if(e){const p=(T-e.t)/e.d,rev=Math.min(1,p*3.2),al=p<.65?1:1-(p-.65)/.35;c.save();c.beginPath();c.rect(0,0,w*rev,h);c.clip();c.globalAlpha=al;
    wtxt(c,'DROP',w/2-4,h*.46,70,'#ff3b2e',1,26);c.globalCompositeOperation='lighter';c.fillStyle=`rgba(90,230,255,${.55*al})`;c.font='70px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('DROP',w/2+4,h*.46);c.restore();
    if(rev<1){c.save();c.fillStyle='rgba(255,255,255,.9)';c.fillRect(w*rev-3,0,5,h);c.restore()}}}
  /* S21 live heart counter */
  if(on('S21')){const hv=Math.floor(st.hearts||0);if(D._hv==null||hv<D._hv)D._hv=hv;if(hv>D._hv){for(let i=0;i<Math.min(6,hv-D._hv);i++)D.hpart.push({x:14+R()*44,y:h-18,vy:-34-R()*30,l:1});D._hv=hv}
   D.hpart=D.hpart.filter(p=>p.l>0);D.hpart.forEach(p=>{p.y+=p.vy*dt;p.l-=dt*1.1;c.save();c.globalAlpha=Math.max(0,p.l);pixHeart(c,p.x,p.y,1.5,'#ff5c8a');c.restore()});
   c.save();c.fillStyle='rgba(8,6,16,.6)';c.fillRect(6,h-30,112,22);c.restore();pixHeart(c,12,h-26,2,'#ff3b4a');c.save();c.font='9px "Press Start 2P",monospace';c.fillStyle='#fff';c.textAlign='left';c.textBaseline='middle';c.shadowColor='#ff3b4a';c.shadowBlur=on('E10')?6:0;c.fillText(hv.toLocaleString(),32,h-18);c.restore()}
  /* S28 beat cover art slide-in, S29 up-next teaser */
  {const ti=M.trackAt(sc,T),tr=ti>=0?sc.tracks[ti]:null;
   if(tr&&on('S28')){const lt=T-tr.start-(ti===0?coldEnd(sc):0)-.2;if(lt>=0&&lt<4.6){const k2=io(lt/.6)*(1-io((lt-4)/.6)),sz=118,x=w*.5-sz/2-(1-k2)*w*.8,y=h*.5-sz/2-8;c.save();c.globalAlpha=k2;c.fillStyle='rgba(8,6,16,.9)';c.fillRect(x-8,y-8,sz+16,sz+34);c.fillStyle=`hsl(${hue},100%,60%)`;c.fillRect(x-8,y-8,sz+16,3);
     const im=getImg(tr.cover);if(im)c.drawImage(im,x,y,sz,sz);else{c.fillStyle='#17171b';c.fillRect(x,y,sz,sz);c.fillStyle=`hsl(${hue},80%,50%)`;c.beginPath();c.arc(x+sz/2,y+sz/2,sz*.34,0,6.283);c.fill();c.fillStyle='#050509';c.beginPath();c.arc(x+sz/2,y+sz/2,sz*.1,0,6.283);c.fill()}
     c.restore();wtxt(c,String(tr.title||'').toUpperCase().slice(0,18),w/2-(1-k2)*w*.8,y+sz+16,9,`hsl(${hue},100%,60%)`,k2,6)}}
   const nx=ti>=0?sc.tracks[ti+1]:null;
   if(tr&&nx&&on('S29')){const rem=tr.end-T;if(rem>=0&&rem<7){const k2=io((7-rem)/.7)*(1-io((.7-rem)/.7));c.save();c.globalAlpha=k2;c.fillStyle='rgba(8,6,16,.82)';c.fillRect(0,h-30,w,24);c.fillStyle=`hsl(${hue},100%,60%)`;c.fillRect(0,h-30,w,2);c.restore();wtxt(c,('NEXT UP '+(Math.floor(T*2)%2?'>':'>>')+' '+String(nx.title||'').toUpperCase()).slice(0,34),w/2,h-18,9,`hsl(${hue},100%,60%)`,k2,6)}}}
  /* S30 milestone celebration */
  if(on('S30')){const o=D.msEv.find(o=>T-o.t<4.2);if(o){const age=T-o.t,al=age<3.5?1:1-(age-3.5)/.7;c.save();c.globalAlpha=al*.74;c.fillStyle='rgb(8,6,20)';c.fillRect(0,0,w,h);c.restore();
    for(let i=0;i<44;i++){const sp=.5+hs(i,1)*.7,y=((age*sp*.5+hs(i,2))%1.2)*h*1.1-12,x=hs(i,3)*w+Math.sin(age*3+i)*8;c.fillStyle=`hsl(${hs(i,4)*360},90%,60%)`;c.globalAlpha=al;c.fillRect(x,y,4,3)}c.globalAlpha=1;
    const sz=1+.12*Math.max(0,1-age*3);c.save();c.translate(w/2,h*.44);c.scale(sz,sz);wtxt(c,Number(o.m.at).toLocaleString(),0,0,46,'#ffd34a',al,30);c.restore();wtxt(c,'HEARTS',w/2,h*.44+40,16,'#ff3b4a',al,16);wtxt(c,String(o.m.label||o.m.fx).toUpperCase().slice(0,22),w/2,h*.44+68,10,'#ffd34a',al,8)}}
  c.restore();
 };
 D.worldLate=(c,ex)=>{ /* rings, jets, smoke, bolts, sparks, gold sparks, cannons: drawn on top of the crowd */
  const P=D.parts;c.save();c.globalCompositeOperation='lighter';
  P.smoke.forEach(p=>{const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,`hsla(${p.h},80%,62%,${.16*p.l*amt})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2)});
  P.ring.forEach(r=>{if(r.dl>0)return;c.strokeStyle=`hsla(${r.h},100%,68%,${Math.max(0,r.l)*.8*amt})`;c.lineWidth=2+r.l*9;c.beginPath();c.ellipse(r.x,r.y,r.r,r.r*.55,0,0,6.283);c.stroke()});
  P.flame.forEach(p=>{const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*1.6);g.addColorStop(0,`hsla(${p.h+34},100%,82%,${.7*p.l})`);g.addColorStop(.45,`hsla(${p.h},100%,52%,${.42*p.l})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(p.x-p.r*1.6,p.y-p.r*1.6,p.r*3.2,p.r*3.2)});
  P.bolt.forEach(b=>{const al=Math.min(1,b.l*1.6)*(R()<.2?.4:1);[[9,.18],[3.5,.5],[1.4,1]].forEach(([lw,a])=>{c.strokeStyle=lw>2?`hsla(${b.h+200},100%,70%,${al*a})`:`rgba(255,255,255,${al*a})`;c.lineWidth=lw;c.beginPath();b.pts.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));b.fork.forEach(f=>{c.moveTo(f[0][0],f[0][1]);c.lineTo(f[1][0],f[1][1])});c.stroke()})});
  P.spark.forEach(s=>{c.fillStyle=`hsla(${s.h},100%,70%,${Math.max(0,s.l)})`;c.fillRect(s.x,s.y,3,3)});
  P.gold.forEach(g=>{const tw=.5+.5*Math.sin(ex.T*8+g.ph);c.fillStyle=`hsla(46,100%,${62+tw*20}%,${Math.min(1,g.l)*(.35+tw*.6)})`;c.fillRect(Math.round(g.x),Math.round(g.y),3,3);if(tw>.8)c.fillRect(Math.round(g.x)-3,Math.round(g.y)+1,9,1)});
  c.restore();
  P.puff.forEach(p=>{const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,`hsla(${p.h},40%,92%,${Math.max(0,p.l)*.2*amt})`);g.addColorStop(1,'hsla(210,40%,92%,0)');c.fillStyle=g;c.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2)});
  P.conf.forEach(p=>{c.save();c.translate(p.x,p.y);c.rotate(p.sp+p.l*9);c.fillStyle=`hsl(${p.c},90%,60%)`;c.fillRect(-p.s,-p.s*.5,p.s*2,p.s);c.restore()});
  P.strm.forEach(p=>{c.strokeStyle=`hsl(${p.c},90%,62%)`;c.lineWidth=3;c.beginPath();c.moveTo(p.x,p.y);for(let i=1;i<=6;i++)c.lineTo(p.x-p.vx*.012*i*.5+Math.sin(p.ph+i)*5,p.y-p.vy*.012*i*.5+Math.cos(p.ph+i)*3);c.stroke()});
 };
  D.silh=(c,pl,ex)=>{ /* E19: the producer goes black against a white flash */
  const e=act(ex.Treal,'E19');if(!e||!on('E19'))return;const p=(ex.Treal-e.t)/e.d,w=(p<.1?p/.1:Math.pow(1-(p-.1)/.9,2.2))*amt;if(w<=.02)return;
  c.save();c.globalAlpha=Math.min(1,w*.92);c.fillStyle='#fff';c.fillRect(-W,-H,W*3,H*3);
  c.globalAlpha=Math.min(1,w*1.4);c.fillStyle='#000';c.shadowColor='#000';c.shadowBlur=9;
  c.beginPath();c.ellipse(577,357,44,50,0,0,6.283);c.fill();
  c.beginPath();c.moveTo(470,484);c.quadraticCurveTo(478,400,545,392);c.lineTo(610,392);c.quadraticCurveTo(676,400,684,484);c.closePath();c.fill();
  c.fillRect(410,484,342,98);c.restore();
 };

 /* ---------- post (screen space, after the camera) ---------- */
 const sliceShift=(c,canvas,rows,amp,seed)=>{tx.clearRect(0,0,W,H);tx.drawImage(canvas,0,0);for(let i=0;i<rows;i++){const y=Math.floor(R()*H),h=8+Math.floor(R()*46),dx=(R()-.5)*amp;c.drawImage(tmp,0,y,W,h,dx,y,W,h)}};
 D.post=(c,canvas,ex,dr)=>{
  const T=ex.Treal,hot=ex.pr==='drop'||ex.pr==='finale';
  /* C6 rack focus */
  if(dr&&Math.abs(dr.rack)>.05){const f=dr.rack,hy=clamp(H/2+(578-H/2-dr.hy)*dr.z,40,H-40);sx.clearRect(0,0,small.width,small.height);sx.drawImage(canvas,0,0,small.width,small.height);
   c.save();c.imageSmoothingEnabled=true;c.beginPath();if(f>0)c.rect(0,hy,W,H-hy);else c.rect(0,0,W,hy);c.clip();c.globalAlpha=Math.min(1,Math.abs(f)*1.1);c.drawImage(small,0,0,W,H);c.restore()}
  /* E8 zoom blur + speed lines, E22 streaks, C10 vertigo stretch */
  const sp=dr?dr.speed:0,vert=dr?dr.vert:0;
  if((on('E8')||on('E22'))&&(sp>.08||vert>.05)){const k=Math.max(sp,vert*.7)*amt;
   tx.clearRect(0,0,W,H);tx.drawImage(canvas,0,0);c.save();c.globalCompositeOperation='lighter';
   for(let i=1;i<=3;i++){const s=1+k*.045*i;c.globalAlpha=.16*k;c.drawImage(tmp,W/2-W*s/2,H/2-H*s/2,W*s,H*s)}
   if(on('E22')&&dr&&dr.whip>.1){for(let i=1;i<=3;i++){c.globalAlpha=.13*dr.whip;c.drawImage(tmp,dr.sx*i*.5,0)}}
   c.restore();
   if(on('E8')&&k>.2){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(255,255,255,1)';for(let i=0;i<34;i++){const an=R()*6.283,r0=300+R()*160,r1=r0+120+R()*340;c.globalAlpha=.1+k*.28*R();c.lineWidth=1+R()*2;c.beginPath();c.moveTo(W/2+Math.cos(an)*r0*1.1,H/2+Math.sin(an)*r0*.8);c.lineTo(W/2+Math.cos(an)*r1*1.1,H/2+Math.sin(an)*r1*.8);c.stroke()}c.restore()}}
  /* E6 chromatic aberration */
  {const e6=on('E6')?act(T,'E6'):null,c16=on('E6')?act(T,'C16'):null;let k=0;if(e6)k=Math.max(k,Math.sin(Math.PI*(T-e6.t)/e6.d));if(c16)k=Math.max(k,.7);if(dr&&dr.whip>.3&&on('E6'))k=Math.max(k,dr.whip*.8);
   if(k>.05){const dx=k*14*amt,ch=[[tx,tmp,'#00ff00'],[tx2,tmp2,'#ff0000'],[tx3,tmp3,'#0000ff']];
    ch.forEach(([g,cv2,col])=>{g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);g.drawImage(canvas,0,0);g.globalCompositeOperation='multiply';g.fillStyle=col;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'});
    c.save();c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalCompositeOperation='lighter';c.drawImage(tmp,0,0);c.drawImage(tmp2,-dx,0);c.drawImage(tmp3,dx,0);c.restore()}}
  /* E17 crack + glitch before a drop */
  if(on('E17')){const e=act(T,'E17');if(e){const p=(T-e.t)/e.d;sliceShift(c,canvas,5+Math.floor(p*9),50+p*90);
   c.save();c.globalCompositeOperation='lighter';c.strokeStyle=`rgba(255,255,255,${.35+p*.5})`;c.lineWidth=2;const cx=W*(.35+((e.t*1.7)%1)*.3),cy=H*.42;for(let i=0;i<9;i++){let x=cx,y=cy,an=i*.7+((e.t*3)%1);c.beginPath();c.moveTo(x,y);for(let s=0;s<7;s++){an+=(R()-.5)*.9;x+=Math.cos(an)*(30+R()*70)*(.4+p);y+=Math.sin(an)*(30+R()*70)*(.4+p);c.lineTo(x,y)}c.stroke()}c.restore()}}
  /* E18 heat shimmer */
  if(on('E18')){const e=act(T,'E18');if(e){const p=(T-e.t)/e.d,amp=14*(1-p)*(1-p)*amt;tx.clearRect(0,0,W,H);tx.drawImage(canvas,0,0);for(let y=0;y<H;y+=5)c.drawImage(tmp,0,y,W,5,Math.sin(y*.045+T*22)*amp,y,W,5)}}
  /* E16 color wash per section */
  if(on('E16')){const WASH={intro:215,build:290,drop:8,breakdown:180,finale:120},e1=Math.min(1,(T-ex.q.seg.start)/1,(ex.q.seg.end-T)/1);c.save();c.globalCompositeOperation='soft-light';c.fillStyle=`hsla(${WASH[ex.pr]||ex.hue},90%,52%,${(.13+.14*(1-io(e1)))*amt})`;c.fillRect(0,0,W,H);c.restore()}
  /* E9 beat pulse */
  if(on('E9')&&(hot||ex.pr==='build')&&ex.kick>.05){c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,255,255,${.07*ex.kick*amt})`;c.fillRect(0,0,W,H);c.restore()}
  /* E2 strobe: at most ~3 flashes a second, with a visible warning */
  if(on('E2')){const e=act(T,'E2');if(e){const rate=Math.min(3,1/ex.bl),ph=((T-e.t)*rate)%1;if(ph<.2){c.save();c.fillStyle=`rgba(255,255,255,${(.34*(1-ph/.2))*amt})`;c.fillRect(0,0,W,H);c.restore()}}}
 };
 /* E7 film look: runs after the vignette so the grade sits over everything */
 D.film=(c,ex)=>{
  if(!on('E7'))return;
  c.save();c.globalCompositeOperation='soft-light';let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(20,110,150,.3)');g.addColorStop(.55,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(255,140,40,.28)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();
  if(R()<.35){c.save();c.fillStyle='rgba(255,255,255,.18)';c.fillRect(R()*W,0,1,H);c.restore()}
  c.save();for(let i=0;i<5;i++){c.fillStyle=`rgba(255,255,255,${.08+R()*.18})`;c.fillRect(R()*W,R()*H,1+R()*2,1+R()*2)}c.restore();
 };

 /* ---------- overlays (text and graphics, screen space) ---------- */
 const font=s=>s+'px "Press Start 2P",monospace';
 const glow=(c,txt,x,y,size,hue,al,align)=>{
  c.save();c.font=font(size);c.textAlign=align||'center';c.textBaseline='middle';c.globalAlpha=clamp(al,0,1);
  c.fillStyle='rgba(0,0,0,.85)';c.fillText(txt,x+size*.06,y+size*.06);
  if(on('E10')){c.shadowColor=`hsl(${hue},100%,60%)`;c.shadowBlur=size*.8;const g=c.createLinearGradient(0,y-size*.6,0,y+size*.6);g.addColorStop(0,'#fff');g.addColorStop(1,`hsl(${hue},100%,86%)`);c.fillStyle=g}else c.fillStyle='#fff';
  c.fillText(txt,x,y);c.restore();
 };
 const pill=(c,txt,x,y,hue,al,size)=>{c.save();c.font=font(size||11);const w=c.measureText(txt).width+34,h=(size||11)+22;c.globalAlpha=clamp(al,0,1);c.fillStyle='rgba(8,6,16,.86)';c.fillRect(x-w/2,y-h/2,w,h);c.fillStyle=`hsl(${hue},100%,62%)`;c.fillRect(x-w/2,y-h/2,w,3);c.restore();glow(c,txt,x,y+1,size||11,hue,al)};
 D.over=(c,canvas,ex)=>{
  const sc=D.sc,T=ex.Treal,hue=ex.hue,mode=ex.mode;
  if(D.needSnap&&T<.35){snx.drawImage(canvas,0,0,snap.width,snap.height);D.snapAt=T}
  if(D.needSnap&&T>=.35){D.needSnap=false;D.firstHave=true}
  if(mode==='live'){
   /* H1 cold open: a teaser of the biggest moment, in a trailer frame */
   if(ex.cold){const p=T/COLD,bar=70*(1-io((p-.86)/.14)),bl=ex.bl;c.fillStyle='#000';c.fillRect(0,0,W,bar);c.fillRect(0,H-bar,W,bar);
    const bk=Math.floor(T/(bl*.5))%2;if(bk||p>.75)glow(c,'COMING UP',W/2,bar*.5+6,18,hue,1);glow(c,'THE DROP',W/2,H-bar*.5-4,14,8,.6+.4*Math.sin(T*9));
    if(p>.9){const k=(p-.9)/.1;c.fillStyle=`rgba(255,255,255,${.85*(1-Math.abs(k*2-1))})`;c.fillRect(0,0,W,H)}}
   /* H7 title card slam */
   if(on('H7')&&sc.title){const t0=coldEnd(sc)+.1,p=(T-t0)/2.4;if(p>=0&&p<1){const k=p<.1?3-2*(p/.1):1,al=p<.7?1:1-(p-.7)/.3,sh=p<.14?(1-p/.14)*10:0;c.save();c.translate(W/2+(R()-.5)*sh,H*.4+(R()-.5)*sh);c.scale(k,k);glow(c,String(sc.title).toUpperCase().slice(0,22),0,0,clamp(2300/Math.max(10,String(sc.title).length)/1.6,26,54),hue,al);c.restore();
    if(p<.1){c.fillStyle=`rgba(255,255,255,${.5*(1-p/.1)})`;c.fillRect(0,0,W,H)}}}
   /* H2 countdown to the drop */
   if(on('H2')&&!on('S17')){const e=act(T,'H2');if(e){const rem=e.d-(T-e.t),n=Math.ceil(rem),f=1-(rem-Math.floor(rem)),al=Math.min(1,rem*2);if(n>=1){c.save();c.translate(W/2,205);const s=1+.3*(1-f)*(1-f);c.scale(s,s);glow(c,String(n),0,0,150,8,al*(1-.35*f));c.restore();glow(c,'DROP IN',W/2,120,22,hue,al)}}}
   /* H9 progress bar to the drop */
   if(on('H9')){const e=act(T,'H9');if(e){const p=(T-e.t)/e.d;c.save();c.fillStyle='rgba(8,6,16,.7)';c.fillRect(0,0,W,9);c.fillStyle=`hsl(${lerp(260,8,p)},100%,60%)`;c.shadowColor=`hsl(${lerp(260,8,p)},100%,60%)`;c.shadowBlur=on('E10')?12:0;c.fillRect(0,0,W*p,7);c.restore();if(p>.55)glow(c,'DROP',W-50,28,13,8,(p-.55)*2)}}
   /* H5 lower third, H12 beat counter */
   const ti=M.trackAt(sc,T),tr=ti>=0?sc.tracks[ti]:null;
   if(tr){const lt=T-tr.start-(ti===0?coldEnd(sc)+2.3:.4);
    if(on('H5')&&lt>=0&&lt<4.2){const k=io(lt/.5)*(1-io((lt-3.6)/.6)),x=40-(1-k)*300,y=H-150;c.save();c.globalAlpha=k;c.fillStyle='rgba(8,6,16,.88)';c.fillRect(x,y-34,380,72);c.fillStyle=`hsl(${hue},100%,60%)`;c.fillRect(x,y-34,5,72);c.restore();
     glow(c,String(tr.title||'').toUpperCase().slice(0,20),x+22,y-9,16,hue,k,'left');glow(c,String((sc.dir&&sc.dir.tag)||'PROD. MZPRD').toUpperCase().slice(0,26),x+22,y+19,9,hue,k*.85,'left')}
    if(on('H12')){const bt=T-tr.start-(ti===0?coldEnd(sc)+.2:0);if(bt>=0&&bt<2.6){const k=io(bt/.4)*(1-io((bt-2.1)/.5));pill(c,'BEAT '+String(ti+1).padStart(2,'0')+' OF '+String(sc.tracks.length).padStart(2,'0'),W/2,60-(1-k)*50,hue,k)}}}
   /* H4 callouts */
   if(on('H4')){const e=act(T,'H4');if(e){const p=(T-e.t)/e.d,k=io(p/.14)*(1-io((p-.86)/.14)),arr=(sc.dir&&sc.dir.callouts&&sc.dir.callouts.length?sc.dir.callouts:DEFAULT_CALLS),txt=String(arr[(e.k||0)%arr.length]).toUpperCase().slice(0,26);c.save();c.font=font(13);const w=c.measureText(txt).width+44;c.restore();
    const x=W-w/2-24+(1-k)*(w+60),y=84;c.save();c.globalAlpha=k;c.fillStyle='rgba(8,6,16,.9)';c.fillRect(x-w/2,y-24,w,48);c.fillStyle='#ffd34a';c.fillRect(x-w/2,y-24,w,4);c.fillRect(x-w/2,y+20,w,4);c.restore();glow(c,txt,x,y,13,46,k)}}
   /* H13 beat-synced subtitle words */
   if(on('H13')&&D.wordCur){const wc=D.wordCur,p=(T-wc.t)/.55;if(p>=0&&p<1){const k=p<.15?.6+(p/.15)*.55:1.15-.15*((p-.15)/.85),al=p<.7?1:1-(p-.7)/.3;c.save();c.translate(W/2,H*.64);c.scale(k,k);glow(c,wc.w,0,0,60,hue,al);c.restore()}}
   /* H3 milestone pop-ups */
   if(on('H3')){const o=D.msEv.find(o=>T-o.t<3.6);if(o){const p=(T-o.t)/3.6,k=io(p/.12)*(1-io((p-.88)/.12));c.save();c.globalAlpha=k;c.fillStyle='rgba(8,6,16,.9)';const y=-40+k*128;c.fillRect(W/2-300,y-26,600,52);c.fillStyle='#e0242f';c.fillRect(W/2-300,y-26,600,4);c.restore();
     glow(c,Number(o.m.at).toLocaleString()+' HEARTS: '+String(o.m.label||o.m.fx).toUpperCase().slice(0,22),W/2,y,13,350,k)}}
   /* H11 comment bait near the end */
   if(on('H11')){const rem=sc.len-T;if(rem<=14&&rem>=2.5){const k=io((14-rem)/.8)*(1-io((3.5-rem)/.8)),txt=String((sc.dir&&sc.dir.bait)||DEFAULT_BAIT).toUpperCase().slice(0,44);pill(c,txt,W/2,H-60,46,k,11);glow(c,'v',W/2,H-28+Math.sin(T*6)*5,16,46,k)}}
   /* H6 surprise moment: blackout, spotlight, boom */
   if(on('H6')){const e=act(T,'H6');if(e){const tt=T-e.t;
    if(tt<.8){const a=io(Math.min(1,tt/.25))*.88;c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(0,0,W,H);
     if(tt>.45){const k=io((tt-.45)/.35),g=c.createRadialGradient(W/2,H*.5,0,W/2,H*.5,230-90*k);g.addColorStop(0,`rgba(255,255,255,${.55*k})`);g.addColorStop(1,'rgba(255,255,255,0)');c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()}
     glow(c,'WAIT FOR IT',W/2,H*.2,18,hue,Math.min(1,tt*4)*(.6+.4*Math.sin(tt*14)))}
    else if(tt<1.3){const k=1-(tt-.8)/.5;c.fillStyle=`rgba(255,255,255,${.9*k})`;c.fillRect(0,0,W,H)}}}
   /* H10 fake false drop: the lights die for a beat */
   if(on('H10')){const e=act(T,'H10');if(e){const p=(T-e.t)/e.d,k=io(Math.min(1,p*8));c.fillStyle=`rgba(0,0,0,${.82*k})`;c.fillRect(0,0,W,H);if(p>.3)glow(c,'. . .',W/2,H*.5,28,hue,.7*Math.min(1,(p-.3)*5))}}
   /* E2 strobe warning label */
   if(on('E2')&&act(T,'E2'))glow(c,'STROBE LIGHTS',W/2,H-40,9,48,.5+.5*Math.sin(T*10));
   /* E17 pre-drop glitch tail / cold open end flash handled above */
  }
  /* H8 loop-back: the last seconds melt back into the first frame so the video loops */
  if(mode==='end'&&on('H8')&&D.firstHave&&st.endT>=0){const e=st.endT,p=clamp((e-5.4)/2.3,0,1);if(p>0){c.save();c.globalAlpha=io(p);c.imageSmoothingEnabled=true;c.drawImage(snap,0,0,W,H);c.restore()}}
 };
 return D;
}
const allOff=()=>{const o={};Object.keys(CODES).forEach(k=>o[k]=true);return o};
window.MZShowFX={allOff,CODES,GROUPS,DEFD,plan,audioDips,coldEnd,enabled,create,falseDrop,DEFAULT_HOOK,DEFAULT_CALLS,DEFAULT_BAIT,COLD};
})();
