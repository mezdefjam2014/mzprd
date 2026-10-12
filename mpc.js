/* MZPRD MPC Beat Video Maker (back office tab). Pick a beat from the library, the tool listens to it and "plays" an Akai MPC60 II:
   the pads push in and get darker on every kick, snare, hat and chop, the screen shows the beat name on a green LCD, the REC and PLAY lights come on.
   White background. Exports 16:9 (1920x1080) and 9:16 (1080x1920) MP4s in the browser, plus a YouTube package. */
(function(){
'use strict';
const $q=s=>root.querySelector(s);let root=null,mounted=false;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const KEY='mzprd_mpc_v1',LEAD=.5,TAIL=1.4;
const loadS=f=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL(f,document.baseURI).href;s.onload=ok;s.onerror=()=>no(new Error(f));document.head.appendChild(s)});
const loadImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=new URL(src,document.baseURI).href});
const FONT_LINK='https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=VT323&family=Reenie+Beanie&family=Caveat:wght@600;700&display=swap';

/* where things are on the photo (1024 x 922) */
const PH={W:1024,H:922,cx:512,cy:455,pad:{x0:252,y0:443,w:54.5,h:54.5,px:64.7,py:63.8},lcd:{x:603,y:230,w:196,h:54},
 leds:{rec:[694,674.5],over:[729,674.5],play:[798,674.5]},plate:'#939aa0',btnPlate:'#c9c9cc',faderPlate:'#c6c6c9'};
/* moving parts of the real machine (photo pixels) */
const BTN={rec:[676,683,35,23],over:[712,683,34,23],stop:[747,683,34,23],play:[782,683,34,23],start:[817,683,34,23]};
Object.assign(PH,{id:'photo',u:1,btn:BTN,vol:[235,277,20],con:[493,277,8],fader:{x:173,y:676,w:22,h:34,slot:[178,676,11,31],hx:175,hy:678,hw:19,hh:30},glow:false});
/* the desk scene for 16:9 (your reference picture, 2000 x 1131) */
const DK={id:'deskh',W:2000,H:1131,u:1.32,sampled:true,glow:true,lamp:[330,110,900],pad:{x0:712,y0:570,w:72,h:68,px:83.7,py:82.3},lcd:{x:1167,y:307,w:270,h:67},
 leds:{rec:[1291,870],over:[1340,870],play:[1434,871]},btn:{rec:[1270,880,46,31],over:[1319,880,45,31],stop:[1367,880,45,31],play:[1414,880,45,31],start:[1462,880,44,31]},
 vol:[688,362,26],con:[1027,362,11],fader:{x:606,y:866,w:30,h:46,slot:[615,866,13,40],hx:608,hy:868,hw:26,hh:42},faderPt:[644,892]};
DK.label={cx:326,cy:971,ang:-.35,w:195,h:118};
/* the desk scene for 9:16 (1131 x 2000) */
const DKV={id:'deskv',W:1131,H:2000,u:1.2,sampled:true,glow:true,lamp:[800,140,1100],pad:{x0:258,y0:935.5,w:65,h:63.5,px:75.3,py:76.8},lcd:{x:667,y:685,w:235,h:64},
 leds:{rec:[782,1214.5],over:[823,1214.5],play:[908,1214.5]},btn:{rec:[760,1222,43,31],over:[804,1222,43,31],stop:[848,1222,42,31],play:[890,1222,43,31],start:[934,1222,42,31]},
 vol:[238,742,22],con:[541,737,10],fader:{x:158,y:1214,w:28,h:44,slot:[167,1214,12,38],hx:161,hy:1216,hw:21,hh:39},faderPt:[200,1242],
 smoke:{x:908,y:1564},label:{cx:699,cy:1887,ang:.33,w:205,h:117}};
DK.bulb=[190,120];DKV.bulb=[772,150];DK.cone={apex:[-163,13],a0:.024,a1:1.017,len:2700};DKV.cone={apex:[772,150],a0:1.34,a1:2.42,len:2300};
Object.assign(DK.btn,{soft1:[1271,570,36,16],soft2:[1318,570,38,16],soft3:[1371,570,35,16],soft4:[1418,570,38,16],sounds:[1418,615,38,16],enter:[1190,705,39,15],k0:[1092,704,37,16],kdot:[1141,704,38,16],k1:[1095,659,34,16],k2:[1140,659,39,16],k3:[1190,660,39,15],k4:[1091,615,38,16],k5:[1140,615,39,16],k6:[1190,616,39,15],k7:[1096,570,33,16],k8:[1140,570,39,16],k9:[1190,571,39,15]});
Object.assign(DKV.btn,{soft1:[759,936,34,16],soft2:[803,936,34,16],soft3:[847,936,35,16],soft4:[892,936,35,16],sounds:[892,977,35,16],enter:[688,1061,34,15],k0:[599,1061,34,15],kdot:[643,1060,35,16],k1:[599,1019,34,15],k2:[643,1018,35,16],k3:[688,1018,34,16],k4:[599,977,34,16],k5:[643,977,35,15],k6:[688,977,34,15],k7:[599,935,34,16],k8:[643,935,35,16],k9:[688,935,34,16]});
DK.wheel=[1160,822,35];DKV.wheel=[660,1170,31];
const GEO={deskh:DK,deskv:DKV};
/* pad order on the MPC60 II, top row first */
const PAD_NAMES=['PERC 1','PERC 2','PERC 3','PERC 4','RIDE 1','RIDE 2','CRASH 1','CRASH 2','TOM 1','TOM 2','TOM 3','TOM 4','HIHAT','SNARE 1','SNARE 2','BASS'];

let CUT=null,ST=null,S=null,beats=[],AC=null,IMG=null,PV={playing:false,raf:0,src:null,t0:0},busy=false;
function defaults(){return{cam:{dof:'0',rack:false,grade:'0'},intro:false,open:{g_beat:1},skin:'orig',res:'1080',can:{id:'orig',size:100,rot:0,x:0,y:0},gen:{n:25,angle:'',seed:1,fav:[],sort:'score',show:'all'},hands:{on:true},smoke:{on:true,amt:1},scene:'desk',eng:{hook:false,hookText:'',sub:true,loop:true,note:false,noteText:'Played live on the Akai MPC60 II',q:false,qText:'WHICH RAPPER GETS THIS BEAT?'},tape:{on:false,ids:[],title:'MZPRD BEAT TAPE VOL. 1',len:60,xf:1.2},th:{seed:1,pal:'',fmt:'h'},kits:{},beat:null,artist:'',fmt:'h',len:0,text:false,lcd:'',yt:{mode:'straight',when:'',v:0}}}
function load(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j)return Object.assign(defaults(),j)}catch(e){}return defaults()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}}
const ctxA=()=>{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();return AC};
const pubU=p=>typeof pub==='function'?pub(p):p;

/* ---------- listen to the beat: kicks, snares, hats and chops become pad hits ---------- */
async function band(mono,sr,lo,hi){const ctx=new OfflineAudioContext(1,mono.length,sr),b=ctx.createBuffer(1,mono.length,sr);b.copyToChannel(mono,0);const s=ctx.createBufferSource();s.buffer=b;let n=s;
 if(lo){const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=lo;f.Q.value=.7;n.connect(f);n=f}
 if(hi){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=hi;f.Q.value=.7;n.connect(f);n=f}
 n.connect(ctx.destination);s.start();return (await ctx.startRendering()).getChannelData(0)}
function envOf(x,hop){const n=Math.floor(x.length/hop),e=new Float32Array(n);for(let k=0;k<n;k++){let s=0;for(let i=k*hop;i<k*hop+hop*2&&i<x.length;i+=2)s+=x[i]*x[i];e[k]=Math.sqrt(s/hop)}return e}
function onsets(x,sr,o){const hop=256,e=envOf(x,hop),n=e.length,sorted=[...e].sort((a,b)=>a-b),p95=sorted[Math.floor(n*.95)]||1e-6,fl=o.floor*p95,lg=new Float32Array(n);
 for(let k=0;k<n;k++)lg[k]=Math.log(e[k]+p95*.02);
 const d=new Float32Array(n);for(let k=3;k<n;k++)d[k]=Math.max(0,lg[k]-Math.min(lg[k-2],lg[k-3]));
 const W=Math.round(1.6*sr/hop),out=[];let last=-9;
 for(let k=3;k<n-2;k++){if(d[k]<d[k-1]||d[k]<d[k+1]||e[k+1]<fl)continue;let s=0,s2=0,c=0;for(let j=Math.max(3,k-W);j<Math.min(n,k+W);j+=2){s+=d[j];s2+=d[j]*d[j];c++}
  const m=s/c,sd=Math.sqrt(Math.max(0,s2/c-m*m));if(d[k]<m+o.c*sd+o.min)continue;const t=(k+1)*hop/sr;if(t-last<o.gap)continue;last=t;out.push({t,v:clamp(e[k+1]/(p95*1.15),.35,1),k:k+1})}
 return out}
function zcr(x,sr,t){const a=Math.floor(t*sr),b=Math.min(x.length,a+Math.floor(.04*sr));let z=0;for(let i=a+1;i<b;i++)if((x[i]>=0)!==(x[i-1]>=0))z++;return z/Math.max(1,b-a)*sr}
async function analyze(buf){const sr=buf.sampleRate,mono=new Float32Array(buf.length),L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L;for(let i=0;i<mono.length;i++)mono[i]=(L[i]+R[i])*.5;
 const [kk,sn,ht,md,hi]=await Promise.all([band(mono,sr,0,150),band(mono,sr,1400,5200),band(mono,sr,7500,0),band(mono,sr,280,1200),band(mono,sr,2400,7200)]);
 const raw={kick:onsets(kk,sr,{floor:.22,c:.9,min:.15,gap:.15}),snare:onsets(sn,sr,{floor:.3,c:.9,min:.15,gap:.22}),hat:onsets(ht,sr,{floor:.28,c:1,min:.12,gap:.07})};
 if(raw.hat.length>buf.duration*7)raw.hat=raw.hat.filter(h=>h.v>.5);
 const mids=onsets(md,sr,{floor:.4,c:1.7,min:.2,gap:.14}).filter(h=>!raw.kick.some(q=>Math.abs(q.t-h.t)<.03)),his=onsets(hi,sr,{floor:.45,c:1.9,min:.2,gap:.16}).filter(h=>!raw.snare.some(q=>Math.abs(q.t-h.t)<.04));
 const q=(arr,i)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(i*(s.length-1))]||0};
 const zm=mids.map(h=>zcr(md,sr,h.t)),zh=his.map(h=>zcr(hi,sr,h.t));const bin=(z,arr)=>{const a=q(arr,.25),b=q(arr,.5),c=q(arr,.75);return z<a?0:z<b?1:z<c?2:3};
 raw.mid=mids.map((h,i)=>({t:h.t,v:h.v,bin:bin(zm[i],zm),weak:h.v<.42,i}));raw.hi=his.map((h,i)=>({t:h.t,v:h.v*.9,bin:bin(zh[i],zh)}));raw.off=Math.max(0,Math.min(2,(raw.kick[0]||raw.snare[0]||{t:0}).t));return raw}
/* each beat gets its own pad layout (a "kit"), picked from the beat id so it is the same every time you play or render it */
const KITS=[
 {n:'CLASSIC',kick:15,sn:[13,14],hat:12,mid:[11,10,9,8],hi:[4,5,6,7],weak:[0,1,2,3]},
 {n:'SNARE 2 LEAD',kick:15,sn:[14,13],hat:12,mid:[8,9,10,11],hi:[7,6,5,4],weak:[3,2,1,0]},
 {n:'TOM KICK',kick:11,sn:[13,14],hat:12,mid:[10,9,8,3],hi:[5,6,7,15],weak:[0,1,2,4]},
 {n:'RIDE HATS',kick:15,sn:[13,14],hat:4,mid:[11,10,9,8],hi:[5,6,7,12],weak:[0,1,2,3]},
 {n:'TOM SNARES',kick:15,sn:[9,10],hat:12,mid:[11,8,13,14],hi:[4,5,6,7],weak:[0,1,2,3]},
 {n:'PERC GROOVE',kick:8,sn:[14,13],hat:5,mid:[3,2,1,0],hi:[7,6,4,12],weak:[9,10,11,15]}];
const hashStr=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const kitFor=id=>hashStr('mpc'+id)%KITS.length;
function layout(raw,kit){const K=KITS[kit],hits=[],vmin=[.55,.3,.12][ST.sens==null?1:ST.sens],nd=(ST.nudge||0)/1000,add=(h,pad,v)=>{if(v>=vmin)hits.push({t:Math.max(0,h.t+nd),pad,v})};
 raw.kick.forEach(h=>add(h,K.kick,h.v));let sc=0;raw.snare.forEach(h=>add(h,h.v>.62?K.sn[0]:K.sn[(sc++%2)?1:0],h.v));raw.hat.forEach(h=>add(h,K.hat,h.v*.9));
 if((ST.sens==null?1:ST.sens)===2)raw.mid.forEach(h=>add(h,K.mid[h.bin],h.v));raw.hi.forEach(h=>add(h,K.hi[h.bin],h.v*.95));(raw.keys||[]).forEach(h=>add(h,K.weak[h.bin],h.v*.9));
 hits.sort((a,b)=>a.t-b.t);const per=PAD_NAMES.map(()=>[]);hits.forEach(h=>per[h.pad].push(h));return{hits,per}}
function pressAt(S,pad,T){const a=S.per[pad];if(!a||!a.length)return 0;let lo=0,hi=a.length-1,r=-1;const tt=T+.006;while(lo<=hi){const m=(lo+hi)>>1;if(a[m].t<=tt){r=m;lo=m+1}else hi=m-1}if(r<0)return 0;const dt=tt-a[r].t;if(dt>.5)return 0;const k=.6+.4*a[r].v;return k*(dt<.03?dt/.03:Math.exp(-(dt-.03)/.085))}

/* ---------- drawing (a pure function of time, so preview and export match) ---------- */
function fitFont(c,txt,font,max,w){let s=max;c.font=font(s);while(s>8&&c.measureText(txt).width>w){s-=1;c.font=font(s)}return s}
function px1(img,x,y){const cv=px1.cv||(px1.cv=document.createElement('canvas'));cv.width=cv.height=1;const q=cv.getContext('2d');q.drawImage(img,Math.round(x)-1,Math.round(y)-1,3,3,0,0,1,1);const d=q.getImageData(0,0,1,1).data;return 'rgb('+d[0]+','+d[1]+','+d[2]+')'}
function sampleColors(){try{if(IMG){PH.btnPlate=px1(IMG,700,712);PH.faderPlate=px1(IMG,197,700)}if(DESKS.h)DK.faderPlate=px1(DESKS.h,DK.faderPt[0],DK.faderPt[1]);if(DESKS.v)DKV.faderPlate=px1(DESKS.v,DKV.faderPt[0],DKV.faderPt[1])}catch(e){}}
const PCOL=new Map();
function plateCol(G,src,i){if(!G.sampled)return G.plate||PH.plate;const key=G.id+i;if(PCOL.has(key))return PCOL.get(key);const P=G.pad,col=i%4,row=Math.floor(i/4);let c;try{c=px1(src,P.x0+col*P.px-(P.px-P.w)/2,P.y0+row*P.py+P.h/2)}catch(e){c='#777'}PCOL.set(key,c);return c}
function knob(c,src,cx,cy,r,ang){if(!ang)return;c.save();c.beginPath();c.arc(cx,cy,r,0,6.2832);c.clip();c.translate(cx,cy);c.rotate(ang);c.drawImage(src,cx-r,cy-r,2*r,2*r,-r,-r,2*r,2*r);c.restore();c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=.8;c.beginPath();c.arc(cx,cy,r,0,6.2832);c.stroke()}
function fader(c,G,src,off){const F=G.fader;if(off<.3)return;c.fillStyle=G.faderPlate||PH.faderPlate;c.fillRect(F.x,F.y,F.w,F.h);c.fillStyle='#0b0b0d';c.fillRect(F.slot[0],F.slot[1],F.slot[2],F.slot[3]);c.drawImage(src,F.hx,F.hy,F.hw,F.hh,F.hx,F.hy-off,F.hw,F.hh)}
function button(c,src,G,r,p){if(!(p>0))return;const u=G.u||1,x=r[0],y=r[1],w=r[2],h=r[3];c.fillStyle='#202023';c.fillRect(x+1,y+1,w-2,h-2);const k=1-.07*p,bw=(w-2)*k,bh=(h-2)*k,bx=x+1+(w-2-bw)/2,by=y+1+(h-2-bh)/2+1.6*u*p;
 c.save();c.beginPath();c.rect(bx,by,bw,bh);c.clip();c.drawImage(src,x+1,y+1,w-2,h-2,bx,by,bw,bh);c.fillStyle='rgba(0,0,0,'+(.3*p).toFixed(3)+')';c.fillRect(bx,by,bw,bh);c.fillStyle='rgba(0,0,0,'+(.25*p).toFixed(3)+')';c.fillRect(bx,by,bw,1.6*u);c.restore()}
/* the machine itself: used by the videos and by the thumbnails. o = {img, press(pad)->0..1, T, run} */
const LGC={};
function lcdGlass(w){const key=Math.round(w);if(LGC[key])return LGC[key];const k=3,W=Math.round(w*k),H=54*k,mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c};const base=mk(),scan=mk();let x=base.getContext('2d');x.scale(k,k);
 const g=x.createLinearGradient(0,0,0,54);g.addColorStop(0,'#c4ee93');g.addColorStop(1,'#93cf6c');x.fillStyle=g;x.fillRect(0,0,w,54);const gl=x.createRadialGradient(w/2,27,6,w/2,27,w*.62);gl.addColorStop(0,'rgba(255,255,220,.35)');gl.addColorStop(1,'rgba(255,255,220,0)');x.fillStyle=gl;x.fillRect(0,0,w,54);
 x=scan.getContext('2d');x.scale(k,k);x.fillStyle='rgba(20,60,10,.07)';for(let y=0;y<54;y+=2)x.fillRect(0,y,w,1);for(let q=0;q<w;q+=2)x.fillRect(q,0,1,54);return LGC[key]={base,scan}}
/* the data wheel has no markings, so a pale notch on the rim shows it turning */
function wheelMark(c,w,ang){const r=w[2];c.save();c.translate(w[0],w[1]);c.rotate(ang);c.fillStyle='rgba(235,235,238,.55)';c.fillRect(-r*.04,-r*.9,r*.08,r*.28);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(-r*.04+r*.08,-r*.9,r*.02,r*.28);c.restore()}
function machine(c,ox,oy,sc,S,o){
 const G=o.geo||PH,SRC=o.src||IMG,u=G.u||1;
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(o.img,ox,oy,G.W*sc,G.H*sc);
 c.save();c.translate(ox,oy);c.scale(sc,sc);
 const P=G.pad;
 if(o.fx){knob(c,SRC,G.vol[0],G.vol[1],G.vol[2],o.fx.vol);knob(c,SRC,G.con[0],G.con[1],G.con[2],o.fx.con);fader(c,G,SRC,o.fx.fader*u);for(const k in G.btn)button(c,SRC,G,G.btn[k],o.fx.btn[k]||0);if(G.wheel&&o.fx.wheel!=null)wheelMark(c,G.wheel,o.fx.wheel)}
 for(let i=0;i<16;i++){const col=i%4,row=Math.floor(i/4),x=P.x0+col*P.px,y=P.y0+row*P.py,p=o.press(i);if(!(p>.004))continue;
  c.fillStyle=plateCol(G,SRC,i);c.fillRect(x-3*u,y-3*u,P.w+6*u,P.h+6*u);
  const k=1-.12*p,w=P.w*k,h=P.h*k,px=x+(P.w-w)/2,py=y+(P.h-h)/2+1.6*u*p;
  c.save();c.beginPath();c.rect(px,py,w,h);c.clip();c.drawImage(SRC,x,y,P.w,P.h,px,py,w,h);
  c.fillStyle='rgba(0,0,0,'+(.58*p).toFixed(3)+')';c.fillRect(px,py,w,h);
  if(p>0){c.fillStyle='rgba(0,0,0,'+(.3*p).toFixed(3)+')';c.fillRect(px,py,w,2.2*u);c.fillRect(px,py,2.2*u,h)}c.restore();
  if(p>0){c.strokeStyle='rgba(20,20,22,'+(.45*p).toFixed(3)+')';c.lineWidth=1.2*u;c.strokeRect(px+.6*u,py+.6*u,w-1.2*u,h-1.2*u)}}
 /* the screen: green and on */
 const L0=G.lcd,s1=L0.h/54,L={x:0,y:0,w:L0.w/s1,h:54},lt=o.lt,run=o.run,bl=60/(S.bpm||90);
 c.save();c.translate(L0.x,L0.y);c.scale(s1,s1);c.beginPath();c.rect(L.x,L.y,L.w,L.h);c.clip();
 const LG=lcdGlass(L.w);c.drawImage(LG.base,L.x,L.y,L.w,L.h);
 c.fillStyle='#1c3a12';c.textBaseline='middle';c.textAlign='left';
 const pad2=n=>String(n).padStart(2,'0'),f=q=>q+"px VT323,monospace";
 const l1=(o.lcd?o.lcd[0]:(o.head||S.lcd||S.title||'BEAT')).toUpperCase(),sz=fitFont(c,l1,f,23,L.w-16);c.font=f(sz);c.fillText(l1,L.x+8,L.y+11);
 let l2,l3;
 if(o.lcd){l2=o.lcd[1];l3=o.lcd[2]}
 else if(o.head){l2=o.sub||'';l3='LOADING...'}
 else{const x=(lt-(S.off||0))/bl,n=x<0?0:Math.floor(x);l2='BAR '+String(Math.floor(n/4)+1).padStart(3,'0')+'   BEAT '+(n%4+1);
  l3=(run?'PLAY ':'READY ')+mmss(clamp(lt,0,S.dur))+'   '+(o.trk?'TRK '+pad2(o.trk[0])+'/'+pad2(o.trk[1]):(S.bpm||'--')+' BPM  '+(S.key||'').toUpperCase());
  if(o.loading&&lt<.6)l3='LOADING...';
  for(let q=0;q<4;q++){const on=run&&lt>=0&&q===n%4,bx=L.x+L.w-12-(3-q)*12;c.fillStyle=on?'#1c3a12':'rgba(28,58,18,.22)';c.fillRect(bx,L.y+22,8,7)}}
 c.font=f(15);c.fillStyle='#1c3a12';c.fillText(l2,L.x+8,L.y+26);c.fillText(l3,L.x+8,L.y+39);
 c.fillStyle='rgba(28,58,18,.25)';c.fillRect(L.x+8,L.y+47,L.w-16,3);c.fillStyle='#1c3a12';c.fillRect(L.x+8,L.y+47,(L.w-16)*clamp(lt/Math.max(1,S.dur),0,1),3);

 const bt=o.boot==null?-1:o.boot,sbv=bt<0?1:bt<.45?0:bt<.95?((bt-.45)/.5)*(.5+.5*Math.sin(bt*140)):1;
 if(bt>=0){c.drawImage(LG.base,L.x,L.y,L.w,L.h);c.fillStyle='rgba(6,14,4,'+(.93*(1-sbv)).toFixed(3)+')';c.fillRect(L.x,L.y,L.w,L.h);
  if(sbv>.6&&bt>=1.0){c.fillStyle='#1c3a12';c.textAlign='left';c.textBaseline='middle';
   if(bt<2.4){c.font=f(20);c.fillText('AKAI PROFESSIONAL MPC60 II',L.x+8,L.y+12);c.font=f(15);c.fillText('SOFTWARE V3.10   16 PADS',L.x+8,L.y+27);c.fillText('LOADING FROM DISK'+'...'.slice(0,1+Math.floor(bt*4)%3),L.x+8,L.y+40);c.fillStyle='rgba(28,58,18,.25)';c.fillRect(L.x+8,L.y+47,L.w-16,3);c.fillStyle='#1c3a12';c.fillRect(L.x+8,L.y+47,(L.w-16)*clamp((bt-1)/1.3,0,1),3)}
   else{const nm=(S.lcd||S.title||'BEAT').toUpperCase(),n=Math.min(nm.length,Math.floor((bt-2.4)/.07)),shown=nm.slice(0,n)+(Math.floor(bt*5)%2&&n<nm.length?'_':'');const sz2=fitFont(c,nm,f,23,L.w-16);c.font=f(sz2);c.fillText(shown,L.x+8,L.y+12);c.font=f(15);c.fillText(n>=nm.length?'READY':'LOADING BEAT',L.x+8,L.y+27);if(S.bpm)c.fillText('BPM '+S.bpm,L.x+8,L.y+40)}}}
 c.drawImage(LG.scan,L.x,L.y,L.w,L.h);
 c.restore();c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1;c.strokeRect(L0.x+.5,L0.y+.5,L0.w-1,L0.h-1);
 /* a lit screen throws a little green light on the case */
 if(G.glow){c.save();c.globalCompositeOperation='lighter';const rg=c.createRadialGradient(L0.x+L0.w/2,L0.y+L0.h/2,10,L0.x+L0.w/2,L0.y+L0.h/2,L0.w*.95);rg.addColorStop(0,'rgba(110,255,110,'+((run?.2:.1)*sbv).toFixed(3)+')');rg.addColorStop(1,'rgba(110,255,110,0)');c.fillStyle=rg;c.fillRect(L0.x-L0.w,L0.y-L0.h*3,L0.w*3,L0.h*8);c.restore()}
 /* lights */
 const led=(x,y,on,col)=>{c.fillStyle=on?col:'rgba(40,10,10,.9)';c.fillRect(x-4*u,y-2*u,8*u,3.4*u);if(on){const r=c.createRadialGradient(x,y,1,x,y,14*u);r.addColorStop(0,'rgba(255,60,40,.75)');r.addColorStop(1,'rgba(255,60,40,0)');c.fillStyle=r;c.fillRect(x-16*u,y-16*u,32*u,32*u)}};
 const ph=((lt%(bl*2))+bl*2)%(bl*2);
 led(G.leds.play[0],G.leds.play[1],run,'#ff3a24');led(G.leds.rec[0],G.leds.rec[1],run,'#ff3a24');led(G.leds.over[0],G.leds.over[1],run&&ph<bl*.5,'#ff3a24');
 c.restore()}
const INTRO=3.4,leadOf=()=>ST&&ST.intro?INTRO:LEAD;
const tlOne=Sx=>{const L=leadOf();return{kind:'one',tracks:[{S:Sx,start:L,dur:Sx.dur}],total:L+Sx.dur+TAIL,lead:L,title:Sx.title,intro:ST&&ST.intro?INTRO:0}};
function derive(X,fmt,cu){const E=ST.eng,sub=E.sub&&!cu,loop=E.loop&&X.kind==='one'&&fmt==='v';if(!sub&&!loop)return X;let tracks,total;
 if(loop){const Sx=X.tracks[0].S,xf=Math.min(3.8,Sx.dur*.3),lead=.12;
  const A={S:Sx,start:lead,off:xf,dur:Sx.dur-xf,fi:.04,fo:xf},B={S:Sx,start:lead+Sx.dur-2*xf,off:0,dur:xf,fi:xf,fo:0};tracks=[A,B];total=A.start+A.dur}
 else{tracks=X.tracks.map(t=>Object.assign({},t));const l=tracks[tracks.length-1];total=l.start+l.dur+3.6}
 return{kind:X.kind,tracks,total,lead:X.lead,title:X.title,sub:!!sub,subT0:sub?total-4.2:0,loop,intro:loop?0:(X.intro||0),make:X.make}}
const XF=fmt=>{const b=X();if(!b)return null;const k=fmt==='v'?'_v':fmt==='c'?'_c':'_h';if(!b[k])b[k]=derive(b,fmt==='c'?'v':fmt,fmt==='c');return b[k]};
function dropV(){if(S&&S.tl){S.tl._v=null;S.tl._h=null;S.tl._c=null}if(TP){TP._v=null;TP._h=null;TP._c=null}}
const trackAt=(X,T)=>{let k=0;for(let i=0;i<X.tracks.length;i++)if(T>=X.tracks[i].start)k=i;return k};
const SKINS=[['orig','The original (aged cream)'],['2','Black with red slashes'],['3','Synthwave sunset'],['4','Rosewood']];
const SKINIMG={};
async function loadSkin(id,fmt){if(id==='orig')return;const k=(fmt==='v'||fmt==='c')?'v':'h';SKINIMG[id]=SKINIMG[id]||{};if(!SKINIMG[id][k])SKINIMG[id][k]=await loadImg('mpc/desk_'+k+'_s'+id+'.webp?v=2')}
let STUDIO=null;
/* the white-studio photo, its cutout and the desk backgrounds for thumbnails: only loaded when something asks for them */
function ensureStudio(){if(STUDIO)return STUDIO;return STUDIO=(async()=>{IMG=await loadImg('mpc/mpc60.webp');CUT=await loadImg('mpc/mpc60_cut.webp');DESKBG.h=await loadImg('mpc/bg_h.webp?v=1');DESKBG.v=await loadImg('mpc/bg_v.webp?v=1');if(IMG&&CUT)WARM={cut:warmVer(CUT),photo:warmVer(IMG)};sampleColors()})()}
const SCN={};
async function ensureScene(fmt){fmt=fmt||ST.fmt;const tall=fmt==='v'||fmt==='c';
 if(ST.scene==='white'){await ensureStudio();return}
 if(!tall){if(!DESKS.h)DESKS.h=await loadImg('mpc/desk_nocan.webp?v=1');if(!DESKS.h0&&(ST.can||{}).id==='orig'&&(!ST.skin||ST.skin==='orig'))DESKS.h0=await loadImg('mpc/desk.webp?v=2');if(!DESKS.h)DESKS.h=DESKS.h0}
 else if(!DESKS.v)DESKS.v=await loadImg('mpc/desk_v.webp?v=2');
 await loadSkin(ST.skin||'orig',fmt);
 const c=ST.can||{};if(!tall&&c.id!=='orig'&&c.id!=='none'&&!CANS.length)await loadCans();
 if(!tall&&c.id==='orig'&&ST.skin&&ST.skin!=='orig'&&!CANS.length)await loadCans();
 sampleColors()}
const sceneOK=fmt=>ST.scene==='white'?!!(IMG&&CUT):!!((fmt==='v'||fmt==='c')?DESKS.v:DESKS.h);
let GR=null,OC=null,DESKS={h:null,v:null,h0:null},DESKBG={h:null,v:null},WARM=null;
function warmVer(img){const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;const x=cv.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='multiply';x.fillStyle='rgb(255,212,168)';x.fillRect(0,0,cv.width,cv.height);x.globalCompositeOperation='destination-in';x.drawImage(img,0,0);return cv}
const sceneOf=fmt=>(ST.scene!=='white'&&DESKS[fmt]&&GEO['desk'+fmt])?{G:GEO['desk'+fmt],img:(ST.skin&&ST.skin!=='orig'&&SKINIMG[ST.skin]&&SKINIMG[ST.skin][fmt])||((fmt==='h'&&(ST.can||{}).id==='orig'&&DESKS.h0)?DESKS.h0:DESKS[fmt])}:null;
function grain(){if(GR)return GR;const t=document.createElement('canvas');t.width=t.height=160;const x=t.getContext('2d'),d=x.createImageData(160,160);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.random()*14}x.putImageData(d,0,0);return GR=t}
function ground(c,W,H,ox,oy,sc){
 const g=c.createRadialGradient(W/2,H*.48,H*.08,W/2,H*.5,Math.max(W,H)*.78);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#f4f4f6');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.save();c.globalAlpha=.5;c.fillStyle=c.createPattern(grain(),'repeat');c.fillRect(0,0,W,H);c.restore();
 c.save();c.shadowColor='rgba(36,36,48,.3)';c.shadowBlur=64*sc;c.shadowOffsetY=28*sc;c.drawImage(CUT,ox,oy,PH.W*sc,PH.H*sc);c.restore();
 c.save();c.shadowColor='rgba(16,16,26,.46)';c.shadowBlur=9*sc;c.shadowOffsetY=5*sc;c.drawImage(CUT,ox,oy,PH.W*sc,PH.H*sc);c.restore()}
/* a soft light that slowly crosses the plastic, plus a gentle key light and shading so it has volume */
function sheen(c,ox,oy,sc,T){const w=Math.round(PH.W*sc),h=Math.round(PH.H*sc);if(!OC||OC.width!==w||OC.height!==h){OC=document.createElement('canvas');OC.width=w;OC.height=h}
 const x=OC.getContext('2d');x.globalCompositeOperation='source-over';x.clearRect(0,0,w,h);
 const k=.5+.5*Math.sin(T*.34+.6),cx=w*(-.1+1.2*k);x.save();x.translate(cx,h*.5);x.rotate(.38);const g=x.createLinearGradient(-w*.22,0,w*.22,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(-w*.22,-h,w*.44,h*2);x.restore();
 const key=x.createRadialGradient(w*.22,h*.1,10,w*.22,h*.1,w*.8);key.addColorStop(0,'rgba(255,255,255,.35)');key.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=key;x.fillRect(0,0,w,h);
 x.globalCompositeOperation='destination-in';x.drawImage(CUT,0,0,w,h);
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=.34;c.drawImage(OC,ox,oy);c.restore();
 /* shade the lower right a little */
 x.globalCompositeOperation='source-over';x.clearRect(0,0,w,h);const sh=x.createLinearGradient(w*.3,h*.2,w,h);sh.addColorStop(0,'rgba(0,0,20,0)');sh.addColorStop(1,'rgba(0,0,20,.5)');x.fillStyle=sh;x.fillRect(0,0,w,h);x.globalCompositeOperation='destination-in';x.drawImage(CUT,0,0,w,h);
 c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.16;c.drawImage(OC,ox,oy);c.restore()}
const hs=(n,sd)=>{const x=Math.sin((n+1)*127.1+(sd||0)*311.7)*43758.5453;return x-Math.floor(x)};
/* cigarette smoke: every puff is a pure function of time, so preview, scrub and export all match */
function smoke(c,T,SM,amt){const passes=[{dx:0,a:1,sd:0},{dx:5,a:.5,sd:7}],dt=.055,life=6.4;c.save();
 for(const ps of passes){const N=Math.round(130*amt),base=Math.floor(T/dt);
  for(let j=N-1;j>=0;j--){const k=base-j,tb=k*dt,age=T-tb;if(age<=0||age>life)continue;const u=age/life,r1=hs(k,11+ps.sd),r2=hs(k,12+ps.sd);
   const dens=Math.max(.15,.62+.34*Math.sin(tb*.9)+.3*Math.max(0,Math.sin(tb*.77+1.2)));
   const sw=Math.sin(tb*.8+age*1.35)+.55*Math.sin(tb*1.7+age*2.3+r1*6),x=SM.x+ps.dx+sw*(4+17*Math.pow(u,.8))-6.5*age+(r2-.5)*20*u,y=SM.y-(46*age-3.4*age*age);
   const r=2.2+34*Math.pow(u,.75),a=dens*ps.a*.108*ease(u/.08)*(1-ease((u-.3)/.7))*(1+(1-u)*1.1);if(a<.004)continue;
   const m=ease(u*1.3),cr=Math.round(188+42*m),cg=Math.round(194+28*m),cb=Math.round(206+2*m);
   const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+cr+','+cg+','+cb+','+a.toFixed(3)+')');g.addColorStop(.55,'rgba('+cr+','+cg+','+cb+','+(a*.5).toFixed(3)+')');g.addColorStop(1,'rgba('+cr+','+cg+','+cb+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}}
 const br=Math.pow(.5+.5*Math.sin(T*.95),3);c.globalCompositeOperation='lighter';const eg=c.createRadialGradient(SM.x,SM.y,0,SM.x,SM.y,10+4*br);eg.addColorStop(0,'rgba(255,140,50,'+(.3+.35*br).toFixed(3)+')');eg.addColorStop(1,'rgba(255,90,20,0)');c.fillStyle=eg;c.fillRect(SM.x-16,SM.y-16,32,32);c.restore()}
/* the beat name, handwritten on the floppy's label; the pen writes it out as each track starts */
function handwrite(c,L,l1,l2,prog){if(prog<=0)return;c.save();c.translate(L.cx,L.cy);c.rotate(L.ang);c.beginPath();c.rect(-L.w/2,-L.h/2,L.w*clamp(prog,0,1)*1.04,L.h);c.clip();c.globalCompositeOperation='multiply';c.textBaseline='alphabetic';c.textAlign='left';
 const draw=(txt,size,y,col,font)=>{let sz=size;c.font=font(sz);while(sz>10&&c.measureText(txt).width>L.w*.86){sz-=1;c.font=font(sz)}const tw=c.measureText(txt).width;let x=-tw/2;for(let i=0;i<txt.length;i++){const ch=txt[i],w=c.measureText(ch).width,jy=(hs(i,3+txt.length)-.5)*sz*.07,jr=(hs(i,5)-.5)*.07;c.save();c.translate(x+w/2,y+jy);c.rotate(jr);c.globalAlpha=.78+.2*hs(i,9);c.fillStyle=col;c.fillText(ch,-w/2,0);c.globalAlpha*=.5;c.fillText(ch,-w/2+.5,.35);c.restore();x+=w}};
 draw(l1,L.h*.4,L.h*.06,'#1d2340',s=>s+"px 'Caveat',cursive");if(l2)draw(l2,L.h*.24,L.h*.38,'#2a2f55',s=>s+"px 'Reenie Beanie',cursive");c.restore()}
/* your hands: fingertip anchor, arm slant and finger width of the two cutouts (mpc/hand_r.webp, mpc/hand_l.webp) */
const HM={r:{tip:[137.8,6.8],axis:.2477,fw:62},l:{tip:[594.7,6.8],axis:-.2208,fw:62}};
const CAN_NAMES=['Pepsi','Coca-Cola','Sprite','Fanta','Dr Pepper','Mtn Dew','7up','Red Bull','Canada Dry','A&W Root Beer','Sunkist','Schweppes'];
let CANS=[],CANSH={};
async function loadCans(){CANS=await Promise.all(CAN_NAMES.map((n,i)=>loadImg('mpc/can_'+String(i+1).padStart(2,'0')+'.webp?v=1')))}
/* a can lit from the lamp side (left): bright and warm on the left, falling off to the right */
function shadedCan(i){if(CANSH[i])return CANSH[i];const im=CANS[i];if(!im)return null;const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;const x=cv.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='multiply';const g=x.createLinearGradient(0,0,cv.width,cv.height*.4);g.addColorStop(0,'rgb(255,238,214)');g.addColorStop(.55,'rgb(205,184,166)');g.addColorStop(1,'rgb(118,100,92)');x.fillStyle=g;x.fillRect(0,0,cv.width,cv.height);x.globalCompositeOperation='destination-in';x.drawImage(im,0,0);
 const sil=document.createElement('canvas');sil.width=cv.width;sil.height=cv.height;const y=sil.getContext('2d');y.drawImage(im,0,0);y.globalCompositeOperation='source-in';y.fillStyle='#000';y.fillRect(0,0,sil.width,sil.height);return CANSH[i]={cv,sil}}
function canIndex(Sx){const c=ST.can||{};if(c.id==='none')return -1;if(c.id==='orig'){if(!ST.skin||ST.skin==='orig')return -1;return 0}if(c.id==='auto'){let h=0;for(const ch of String(Sx.title))h=(h*31+ch.charCodeAt(0))>>>0;return h%12}return Math.max(0,Math.min(11,(+c.id||1)-1))}
function drawCan(c,G,Sx){const i=canIndex(Sx);if(i<0)return;if(!CANS.length){if(!drawCan.l){drawCan.l=1;loadCans().then(()=>{drawCan.l=0;try{drawNow()}catch(e){}})}return}const sh=shadedCan(i);if(!sh)return;const k=ST.can,h=360*(k.size||100)/100,w=h*sh.cv.width/sh.cv.height,cx=1815+(k.x||0),cy=322+(k.y||0),rot=.26+(k.rot||0)*Math.PI/180;
 c.save();c.translate(cx,cy);c.rotate(rot);
 /* two shadows thrown away from the lamp (down and to the right), one wide and soft, one tight */
 for(const L of [{dx:34,dy:42,b:20,a:.5},{dx:10,dy:12,b:5,a:.55}]){c.save();c.globalAlpha=L.a;c.filter='blur('+L.b+'px)';c.rotate(-rot);c.translate(L.dx,L.dy);c.rotate(rot);c.drawImage(sh.sil,-w/2,-h/2,w,h);c.restore()}
 c.drawImage(sh.cv,-w/2,-h/2,w,h);c.restore()}
let HANDS=null;
function prepHands(r,l){if(!r||!l)return;const mk=(img,warm)=>{const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;const x=cv.getContext('2d');x.drawImage(img,0,0);if(warm){x.globalCompositeOperation='multiply';x.fillStyle='rgb(255,204,150)';x.fillRect(0,0,cv.width,cv.height);x.globalCompositeOperation='destination-in';x.drawImage(img,0,0)}return cv};
 const sil=img=>{const w=Math.round(img.naturalWidth/4),h=Math.round(img.naturalHeight/4),cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');x.drawImage(img,0,0,w,h);x.globalCompositeOperation='source-in';x.fillStyle='#000';x.fillRect(0,0,w,h);return cv};
 const blurs=cv=>[0,1.2,2.6,4.5].map(b=>{if(!b)return cv;const o=document.createElement('canvas');o.width=cv.width;o.height=cv.height;const x=o.getContext('2d');x.filter='blur('+b+'px)';x.drawImage(cv,0,0);return o});
 const one=(img)=>{const sl=sil(img);return{norm:mk(img,false),warm:mk(img,true),sil:sl,silB:blurs(sl),sh:{}}};
 HANDS={r:one(r),l:one(l)}}
const btnC=(G,k)=>{const r=G.btn&&G.btn[k];return r?[r[0]+r[2]/2,r[1]+r[3]*.55]:null};
function handHits(Sx,G){const ck='_hh'+(G&&G.id||'');if(Sx[ck])return Sx[ck];const o={l:[],r:[]},last={l:-9,r:-9};(Sx.hits||[]).forEach(h=>{let key,hh=h;if(h.btn){const pc=btnC(G||{},h.btn);if(!pc)return;key='r';hh={t:h.t,pad:-1,v:h.v,pos:pc}}else key=(h.pad%4)<2?'l':'r';if(h.t-last[key]<.115)return;last[key]=h.t;o[key].push(hh)});return Sx[ck]=o}
const hpos=(G,h)=>h.pos||padC(G,h.pad);
const padC=(G,i)=>[G.pad.x0+(i%4)*G.pad.px+G.pad.w/2,G.pad.y0+Math.floor(i/4)*G.pad.py+G.pad.h*.58];
/* Hand motion model. Everything is a smooth physical curve of time (no random shake):
   - travel between pads is a lightly under-damped spring, so the hand arrives with a hair of overshoot, like a real arm
   - after each hit the hand springs up (higher when there is more time before the next hit, lower in a fast flurry)
   - the drop onto the next pad accelerates like a fall and lands exactly on the hit
   - the finger squashes for a moment on contact and the arm leans into the direction it is moving
   - at the end of the beat the hand just rests, floating with a slow breathing sway */
const spring=u=>{if(u<=0)return 0;if(u>=1)return 1;const z=.8,w=9.5,wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*u)*(Math.cos(wd*u)+(z*w/wd)*Math.sin(wd*u))};
function handPose(list,T,G,key){let i=0;while(i<list.length&&list[i].t<=T)i++;const prev=i>0?list[i-1]:null,next=i<list.length?list[i]:null,restY=G.pad.y0+G.pad.py*3+G.pad.h+G.pad.py*1.7;let A,B,tA,tB;
 if(next){B=hpos(G,next);tB=next.t;if(prev){A=hpos(G,prev);tA=prev.t}else{A=[B[0]+(key==='r'?30:-30),restY];tA=tB-1.5}}else{A=hpos(G,prev);tA=prev.t;B=A;tB=tA+9}
 const gap=tB-tA,v=(prev?prev.v:.7);
 /* where the hand is */
 const travel=Math.max(.07,gap-.12),e=spring((T-tA-.015)/travel),x=A[0]+(B[0]-A[0])*e,y=A[1]+(B[1]-A[1])*e;
 /* how high it is: springs up after the hit, falls onto the next one */
 const Hmax=clamp((.22+.62*Math.min(1,gap/.5))*(.62+.38*v),.12,.95),dt=T-tA,tau=.05;
 let h=prev?Hmax*(1-(1+dt/tau)*Math.exp(-dt/tau))+Hmax*.1*Math.exp(-dt/.03)*Math.abs(Math.sin(dt*52)):Hmax;
 if(next){const dd=clamp(.06+.1*Hmax,.07,.16),ts=tB-dd;if(T>ts){const q=clamp((T-ts)/dd,0,1);h=Math.min(h,(prev?Hmax:Hmax)*(1-Math.pow(q,2.3)))}}
 else{h=Math.min(h,.5)+clamp((T-tA-.35)/1.6,0,1)*.12}
 h=clamp(h,0,1);
 /* a tiny slow sway, stronger while it is in the air */
 const sw=.5+.5*h,sx=1.1*Math.sin(T*.8+(key==='r'?1:3))*sw,sy=1.3*Math.sin(T*.63+(key==='r'?2:.5))*sw;
 /* squash on contact */
 const c=prev&&dt>=0?Math.exp(-dt/.045)*(1-clamp(h*3,0,1)):0;
 return{x:x+sx*G.pad.w/72,y:y+sy*G.pad.w/72,hover:h,contact:c}}
function handAt(list,T,G,key){if(!list.length)return null;const a=handPose(list,T,G,key),b=handPose(list,T-.022,G,key);a.vx=(a.x-b.x)/.022;a.vy=(a.y-b.y)/.022;a.vh=(a.hover-b.hover)/.022;return a}
/* a hard tap: the hand floats up, drops fast and lands on the pad; its shadow is big and soft when lifted and tight and dark on contact */
function drawHands(c,G,Sx,T,desk){if(!HANDS)return;const H=handHits(Sx,G);for(const key of ['l','r']){const st=handAt(H[key],T,G,key);if(st)drawOneHand(c,G,key,st,desk,T)}}
const SHQ=[.3,.45,.6,.8,1];
function drawOneHand(c,G,key,st,desk,T,lampOver){const k=G.pad.w/72,lp=lampOver||G.lamp||[G.W*.2,-G.H*.35,0];st.vx=st.vx||0;st.vy=st.vy||0;st.vh=st.vh||0;st.contact=st.contact||0;
 {const m=HM[key],hv=st.hover,sq=1-.03*st.contact,s0=G.pad.w*.5/m.fw,s=s0*(1+.17*hv)*sq,sx=G.W*(key==='r'?.66:.34),sy=G.H*1.55,ang=Math.atan2(sx-st.x,sy-st.y),lean=clamp(st.vx/k*.00055,-.07,.07),rot=m.axis-ang+lean,push=(1-hv)*5*k+st.contact*5*k,HI=HANDS[key];
  let dx=lp[0]-st.x,dy=lp[1]-st.y;const dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;const cr=Math.cos(rot),sr=Math.sin(rot),lx=dx*cr+dy*sr,ly=-dx*sr+dy*cr,tipX=st.x,tipY=st.y+.12*G.pad.h;
  const ao=Math.pow(1-hv,1.6);if(ao>.02){c.save();const rg=c.createRadialGradient(tipX,tipY+4*k,1,tipX,tipY+4*k,26*k);rg.addColorStop(0,'rgba(0,0,0,'+(.45*ao).toFixed(3)+')');rg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=rg;c.fillRect(tipX-30*k,tipY-26*k,60*k,64*k);c.restore()}
  for(const L of [{o:(10+30*hv)*k,b:(3+10*hv)*k,a:(desk?.3:.18)*(1-.45*hv),g:1.08+.1*hv},{o:(3+8*hv)*k,b:(1.2+3*hv)*k,a:(desk?.5:.3)*(1-hv*.85),g:1.01+.03*hv}]){const lv=(L.b/s/4)<.9?0:(L.b/s/4)<2?1:(L.b/s/4)<3.6?2:3,SB=HI.silB[lv];c.save();c.translate(st.x-dx*L.o,st.y-dy*L.o);c.rotate(rot);c.scale(s*L.g,s*L.g);c.globalAlpha=L.a;c.drawImage(SB,-m.tip[0],-m.tip[1],SB.width*4,SB.height*4);c.restore()}
  const lit=desk?clamp(1.08-Math.hypot(lp[0]-st.x,lp[1]-st.y)/(Math.max(G.W,G.H)*1.3),.55,1)*(.45+.55*LAMPFL):.9,ds=c.getTransform().a*s*1.05,q=SHQ.find(v=>v>=ds)||1,sh=shadeHand(HI,m,desk,lx,ly,hv,lit,T||0,q);
  const spd=Math.hypot(st.vx,st.vy)/k+Math.abs(st.vh)*60;
  if(spd>520){const n=spd>1100?2:1;for(let r=n;r>=1;r--){const tb=r*.011,bx=st.x-st.vx*tb,by=st.y-st.vy*tb,bh=clamp(hv-st.vh*tb,0,1),ss=s0*(1+.17*bh)/q;c.save();c.globalAlpha=(.2/r)*clamp((spd-520)/700,0,1);c.translate(bx,by+.12*G.pad.h+push);c.rotate(rot);c.translate(0,bh*26*k);c.scale(ss,ss);c.drawImage(sh,-m.tip[0]*q,-m.tip[1]*q);c.restore()}}
  c.save();c.translate(tipX,tipY+push);c.rotate(rot);c.translate(0,hv*26*k);c.scale(s/q,s/q);c.drawImage(sh,-m.tip[0]*q,-m.tip[1]*q);c.restore()}}
function shadeHand(HI,m,desk,lx,ly,hv,lit,T,q){const w=Math.round(HI.norm.width*q),h=Math.round(HI.norm.height*q),cv=HI.sh[q]||(HI.sh[q]=document.createElement('canvas'));if(cv.width!==w){cv.width=w;cv.height=h}const x=cv.getContext('2d');x.globalCompositeOperation='copy';x.globalAlpha=1;x.drawImage(desk?HI.warm:HI.norm,0,0,w,h);x.globalCompositeOperation='multiply';
 const R=360*q,cxx=(m.tip[0]+120)*q,cyy=(m.tip[1]+300)*q,tq=m.tip[1]*q;
 const E=desk?clamp(.4+.5*lit,.5,.92):.93;x.fillStyle='rgb('+Math.round(255*E)+','+Math.round(255*E*.95)+','+Math.round(255*E*.88)+')';x.fillRect(0,0,w,h);
 const g=x.createLinearGradient(cxx-lx*R,cyy-ly*R,cxx+lx*R,cyy+ly*R);
 if(desk){g.addColorStop(0,'rgb(98,74,62)');g.addColorStop(.5,'rgb(180,150,126)');g.addColorStop(1,'rgb(255,234,204)')}else{g.addColorStop(0,'rgb(176,172,170)');g.addColorStop(.5,'rgb(226,224,222)');g.addColorStop(1,'rgb(255,255,255)')}
 x.fillStyle=g;x.fillRect(0,0,w,h);
 const g2=x.createLinearGradient(0,tq+160*q,0,h*.72);if(desk){g2.addColorStop(0,'rgb(255,255,255)');g2.addColorStop(.45,'rgb(184,160,144)');g2.addColorStop(1,'rgb(112,90,80)')}else{g2.addColorStop(0,'rgb(255,255,255)');g2.addColorStop(1,'rgb(186,182,180)')}
 x.fillStyle=g2;x.fillRect(0,0,w,h);
 if(desk){const ph=Math.sin(T*.4)*.1+Math.sin(T*.93+1)*.03,gb=x.createLinearGradient(cxx-lx*R,cyy-ly*R,cxx+lx*R,cyy+ly*R);gb.addColorStop(0,'rgb(255,255,255)');gb.addColorStop(clamp(.36+ph,0,.9),'rgb(255,255,255)');gb.addColorStop(clamp(.5+ph,0,.95),'rgb(104,84,74)');gb.addColorStop(clamp(.64+ph,0,.98),'rgb(170,146,130)');gb.addColorStop(clamp(.8+ph,0,1),'rgb(255,255,255)');gb.addColorStop(1,'rgb(255,255,255)');x.fillStyle=gb;x.fillRect(0,0,w,h)}
 x.globalCompositeOperation='destination-in';x.drawImage(HI.norm,0,0,w,h);
 if(desk){x.globalCompositeOperation='lighter';x.globalAlpha=.05+.09*hv*lit;x.drawImage(HI.norm,0,0,w,h);x.globalAlpha=1}
 x.globalCompositeOperation='source-over';return cv}
/* dust drifting through the lamp light */
function dust(c,T,G){const lp=G.lamp;if(!lp)return;const N=96,A=[lp[0]+(G.W*.5-lp[0])*.42,lp[1]+(G.H*.5-lp[1])*.42],R=lp[2]*.95,sg=lp[2]*.62;c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<N;i++){const r1=hs(i,21),r2=hs(i,22),r3=hs(i,23),r4=hs(i,24),a=r1*6.2832,d=R*Math.sqrt(r2),bx=A[0]+Math.cos(a)*d,by=A[1]+Math.sin(a)*d,sp=2.2+5*r3;
  const yy=((by-T*sp-(A[1]-R))%(2*R)+2*R)%(2*R)+(A[1]-R),xx=bx+16*Math.sin(T*(.12+.2*r3)+r4*6.28)+5*Math.sin(T*.9+i),dd=Math.hypot(xx-lp[0],yy-lp[1]),w=Math.exp(-(dd*dd)/(2*sg*sg)),tw=.5+.5*Math.sin(T*(.8+r3*1.9)+r4*9);
  const al=.62*w*(.35+.65*tw);if(al<.02)continue;const big=r1>.9,rad=big?5+6*r2:.8+2*Math.pow(r2,2.5);
  if(big){c.fillStyle='rgba(255,214,160,'+(al*.18).toFixed(3)+')';c.beginPath();c.arc(xx,yy,rad,0,6.2832);c.fill()}
  else{const g=c.createRadialGradient(xx,yy,0,xx,yy,rad*2.2);g.addColorStop(0,'rgba(255,226,180,'+al.toFixed(3)+')');g.addColorStop(1,'rgba(255,200,140,0)');c.fillStyle=g;c.fillRect(xx-rad*2.2,yy-rad*2.2,rad*4.4,rad*4.4)}}
 c.restore()}
let LAMPFL=1;
const lampAmt=()=>[0,.55,1,1.7][ST.lamp==null?2:ST.lamp];
function lampLevel(T){const a=lampAmt();if(!a)return 1;const w=.5+.5*Math.sin(T*.9)*Math.sin(T*.33+1),ph=((T+4)%15)-8,brown=Math.exp(-Math.pow((ph-1)/.7,2)),sag=Math.exp(-Math.pow((((T+9.5)%23)-8)/.5,2)),tt=(T%7)-5.1,burst=tt>0&&tt<.7?Math.sin(tt*70)*Math.exp(-tt*5)*.22:0,mic=.035*Math.sin(T*9.3)*Math.sin(T*1.7);return clamp(1-.09*a*(1-w)-.2*a*brown-.14*a*sag-.5*a*burst-.5*a*mic,.62,1)}
const lampFl=T=>clamp(.62+.38*Math.sin(T*1.1)*Math.sin(T*.37+1)+.12*Math.sin(T*8.7)*Math.sin(T*.9),.18,1);
const ease=t=>t<=0?0:t>=1?1:t*t*(3-2*t),pulse=(T,a,b)=>Math.min(ease((T-a)/.07),ease((b-T)/.09));
const HOOKS=['WAIT FOR THE DROP','THIS ONE HITS DIFFERENT','LIVE ON THE MPC60','TURN IT UP','BOOM BAP ON A 1988 MPC','WATCH THE PADS','PURE BOOM BAP'];
function wrapTwo(t){if(t.length<=15)return[t];const w=t.split(' ');let best=[t,''],bd=1e9;for(let i=1;i<w.length;i++){const a=w.slice(0,i).join(' '),b=w.slice(i).join(' '),d=Math.abs(a.length-b.length);if(d<bd){bd=d;best=[a,b]}}return best}
function sticker(c,lines,x,y,size,T0,T,o){o=o||{};const u=T-T0;if(u<0)return;const pop=1+1.2*Math.pow(Math.max(0,1-u/.22),2),sh=u<.3?(Math.sin(u*90)*(1-u/.3)*size*.05):0;
 c.save();c.translate(x+sh,y);c.scale(pop,pop);c.globalAlpha=clamp(u/.06,0,1)*(o.out!=null?clamp(o.out,0,1):1);c.font='700 '+size+'px Anton, Oswald, Impact, sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 lines.forEach((t,i)=>{const yy=(i-(lines.length-1)/2)*size*1.02;c.lineWidth=size*.16;c.strokeStyle='#fff';c.strokeText(t,0,yy);c.fillStyle='rgba(0,0,0,.18)';c.fillText(t,size*.04,yy+size*.05);c.fillStyle=o.fill||'#0b0b0d';c.fillText(t,0,yy)});c.restore()}
function pill(c,txt,x,y,size,a,o){o=o||{};c.save();c.globalAlpha=a;c.font='600 '+size+'px Oswald, sans-serif';const w=c.measureText(txt).width+size*1.6,h=size*1.9;c.shadowColor='rgba(0,0,0,.25)';c.shadowBlur=size*.6;c.shadowOffsetY=size*.2;c.fillStyle='#fff';const r=h/2;c.beginPath();c.moveTo(x-w/2+r,y-h/2);c.arcTo(x+w/2,y-h/2,x+w/2,y+h/2,r);c.arcTo(x+w/2,y+h/2,x-w/2,y+h/2,r);c.arcTo(x-w/2,y+h/2,x-w/2,y-h/2,r);c.arcTo(x-w/2,y-h/2,x+w/2,y-h/2,r);c.fill();c.shadowColor='transparent';c.fillStyle=o.fill||'#222';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x,y+size*.05);c.restore()}
/* the animated subscribe: slides up, the cursor clicks it, it turns to SUBSCRIBED and the bell rings */
function subscribe(c,W,H,te,cyF,wide){if(te<0)return;const w=W*(wide?.3:.5),h=w*.2,cx=W/2,cy=H*(cyF||.865),s1=clamp(te/.5,0,1),slide=(1-ease(s1))*h*3,over=1+.06*Math.sin(clamp((te-.3)/.4,0,1)*Math.PI),clickT=1.55,done=te>=clickT+.1,sq=te>clickT&&te<clickT+.16?.93:1;
 c.save();c.globalAlpha=ease(s1*1.4);c.translate(cx,cy+slide);c.scale(over*sq,over*sq);
 const r=h/2;c.shadowColor='rgba(0,0,0,.28)';c.shadowBlur=h*.3;c.shadowOffsetY=h*.1;c.fillStyle=done?'#8a8a90':'#e0242f';c.beginPath();c.moveTo(-w/2+r,-h/2);c.arcTo(w/2,-h/2,w/2,h/2,r);c.arcTo(w/2,h/2,-w/2,h/2,r);c.arcTo(-w/2,h/2,-w/2,-h/2,r);c.arcTo(-w/2,-h/2,w/2,-h/2,r);c.fill();c.shadowColor='transparent';
 c.fillStyle='#fff';c.font='700 '+h*.46+'px Oswald, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(done?'SUBSCRIBED':'SUBSCRIBE',done?h*.1:0,h*.03);if(done){c.strokeStyle='#fff';c.lineWidth=h*.07;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(-w*.36,0);c.lineTo(-w*.33,h*.1);c.lineTo(-w*.28,-h*.12);c.stroke()}
 c.restore();
 /* tag line */
 c.save();c.globalAlpha=ease((te-.3)/.4);c.font='600 '+h*.3+'px Oswald, sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=h*.1;c.strokeStyle='rgba(0,0,0,.85)';c.fillStyle='#fff';c.strokeText('NEW MPC BEAT EVERY WEEK  /  MZPRD',cx,wide?cy-h*.95+slide:cy+h*1.1+slide);c.fillText('NEW MPC BEAT EVERY WEEK  /  MZPRD',cx,wide?cy-h*.95+slide:cy+h*1.1+slide);c.restore();
 /* the bell */
 if(done){const bt=te-clickT-.1,pop=ease(bt/.3)*(1+.18*Math.sin(clamp(bt/.4,0,1)*Math.PI)),ring=bt>.25&&bt<1.8?Math.sin(bt*26)*.35*Math.exp(-(bt-.25)*2.2):0,bx=cx+w/2+h*.85,by=cy;c.save();c.translate(bx,by-h*.35);c.rotate(ring);c.scale(pop,pop);c.translate(0,h*.35);
  c.fillStyle='#2a2a2e';c.beginPath();c.moveTo(-h*.34,h*.22);c.bezierCurveTo(-h*.3,h*.1,-h*.3,-h*.1,-h*.2,-h*.3);c.bezierCurveTo(-h*.12,-h*.45,h*.12,-h*.45,h*.2,-h*.3);c.bezierCurveTo(h*.3,-h*.1,h*.3,h*.1,h*.34,h*.22);c.closePath();c.fill();c.beginPath();c.arc(0,h*.3,h*.1,0,6.2832);c.fill();c.beginPath();c.arc(0,-h*.46,h*.05,0,6.2832);c.fill();
  if(ring!==0){c.strokeStyle='rgba(42,42,46,.6)';c.lineWidth=h*.04;c.beginPath();c.arc(0,-h*.05,h*.52,-.5,.5);c.stroke();c.beginPath();c.arc(0,-h*.05,h*.52,Math.PI-.5,Math.PI+.5);c.stroke()}c.restore()}
 /* the cursor */
 if(te>.5&&te<clickT+.9){const k=ease(clamp((te-.55)/.95,0,1)),sx=cx+w*.55,sy=cy+h*2.4,ex=cx+w*.12,ey=cy+h*.1,px=sx+(ex-sx)*k+Math.sin(k*3.1416)*h*.5,py=sy+(ey-sy)*k,ga=te>clickT+.5?1-clamp((te-clickT-.5)/.4,0,1):1;
  if(te>clickT&&te<clickT+.55){c.save();c.strokeStyle='rgba(224,36,47,'+(.6*(1-(te-clickT)/.55))+')';c.lineWidth=h*.06;c.beginPath();c.arc(ex,ey,h*.15+(te-clickT)*h*1.6,0,6.2832);c.stroke();c.restore()}
  c.save();c.globalAlpha=ga;c.translate(px,py);c.scale(h/46,h/46);c.fillStyle='#111';c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(0,32);c.lineTo(8,25);c.lineTo(14,38);c.lineTo(20,35);c.lineTo(14,23);c.lineTo(24,23);c.closePath();c.stroke();c.fill();c.restore()}}
/* the lamp as a real light: the room darkens and warms when it sags, the bulb and the shade slats glow, a soft cone and bloom fall onto the desk */
const CONEC={};
/* the light pool is drawn once per scene (at half size) as two soft masks: one that is just the shape, one that is the shape with warm light fading out from the bulb */
function coneMasks(G){if(CONEC[G.id])return CONEC[G.id];const w=Math.round(G.W/2),h=Math.round(G.H/2),k=.5,C=G.cone,ax=C.apex[0]*k,ay=C.apex[1]*k,L=C.len*k;
 const path=x=>{x.beginPath();x.moveTo(ax,ay);x.lineTo(ax+Math.cos(C.a0)*L*1.25,ay+Math.sin(C.a0)*L*1.25);x.arc(ax,ay,L*1.25,C.a0,C.a1);x.closePath()};
 const shape=document.createElement('canvas');shape.width=w;shape.height=h;let x=shape.getContext('2d');
 const rg=x.createRadialGradient(ax,ay,0,ax,ay,L);rg.addColorStop(0,'rgba(0,0,0,1)');rg.addColorStop(.38,'rgba(0,0,0,1)');rg.addColorStop(.7,'rgba(0,0,0,.82)');rg.addColorStop(1,'rgba(0,0,0,.5)');
 x.filter='blur('+Math.round(w*.022)+'px)';x.fillStyle=rg;path(x);x.fill();x.filter='none';
 const warm=document.createElement('canvas');warm.width=w;warm.height=h;const y=warm.getContext('2d');
 const wg=y.createRadialGradient(ax,ay,0,ax,ay,L*.8);wg.addColorStop(0,'rgba(255,200,120,1)');wg.addColorStop(.3,'rgba(255,170,90,.7)');wg.addColorStop(.7,'rgba(255,140,60,.25)');wg.addColorStop(1,'rgba(255,120,40,0)');
 y.filter='blur('+Math.round(w*.03)+'px)';y.fillStyle=wg;path(y);y.fill();y.filter='none';
 return CONEC[G.id]={shape,warm}}
/* the lamp as a real light: a pool of warm light under the shade with an edge, shadow outside it, a hot bulb and glowing slats; all of it sags and flickers with the lamp */
let LDK=null,LWM=null;
function lampFx(c,W,H,ox,oy,sc,G,T){const a=lampAmt(),fl=LAMPFL,bx=ox+G.bulb[0]*sc,by=oy+G.bulb[1]*sc,R=G.lamp[2]*sc;if(!a||!G.cone)return;const dim=1-fl,M=coneMasks(G),hw=Math.ceil(W/2),hh=Math.ceil(H/2);
 if(!LDK||LDK.width!==hw||LDK.height!==hh){LDK=document.createElement('canvas');LDK.width=hw;LDK.height=hh;LWM=document.createElement('canvas');LWM.width=hw;LWM.height=hh}
 const x=LDK.getContext('2d');x.globalCompositeOperation='source-over';x.clearRect(0,0,hw,hh);
 const da=clamp(.3+.12*a+.35*dim,0,.7);x.fillStyle='rgba(14,9,8,'+da.toFixed(3)+')';x.fillRect(0,0,hw,hh);
 x.globalCompositeOperation='destination-out';x.globalAlpha=clamp(1-.45*dim,0,1);x.drawImage(M.shape,ox/2,oy/2,G.W*sc/2,G.H*sc/2);x.globalAlpha=1;x.globalCompositeOperation='source-over';
 const y=LWM.getContext('2d');y.globalCompositeOperation='source-over';y.clearRect(0,0,hw,hh);y.globalAlpha=clamp(.17*Math.pow(fl,1.7)*Math.min(1.4,.55+a*.4),0,.4);y.drawImage(M.warm,ox/2,oy/2,G.W*sc/2,G.H*sc/2);y.globalAlpha=1;
 {const gg=y.createRadialGradient(bx/2,by/2,3,bx/2,by/2,R*.45),k=.09*Math.pow(fl,1.6);gg.addColorStop(0,'rgba(255,190,110,'+k.toFixed(3)+')');gg.addColorStop(1,'rgba(255,150,70,0)');y.fillStyle=gg;y.fillRect(0,0,hw,hh)}
 c.save();c.imageSmoothingEnabled=true;c.drawImage(LDK,0,0,W,H);c.globalCompositeOperation='lighter';c.drawImage(LWM,0,0,W,H);
 {const hot=Math.pow(fl,2.2),r1=R*.2,g=c.createRadialGradient(bx,by,0,bx,by,r1);g.addColorStop(0,'rgba(255,240,200,'+(.6*hot).toFixed(3)+')');g.addColorStop(.3,'rgba(255,200,120,'+(.3*hot).toFixed(3)+')');g.addColorStop(1,'rgba(255,150,70,0)');c.fillStyle=g;c.fillRect(bx-r1,by-r1,2*r1,2*r1)}
 c.restore();
 if(dim>.1){c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(120,130,170,'+(.16*dim).toFixed(3)+')';c.fillRect(0,0,W,H);c.restore()}}
/* ---------- camera look (all optional): depth of field, focus pull, color grade ---------- */
let CB=null,CL=null;
const camOn=()=>{const m=ST.cam||{};return m.dof!=='0'&&m.dof!=null||m.rack||(m.grade&&m.grade!=='0')};
function dofFx(c,W,H,T,ox,oy,sc,G,v){const m=ST.cam,amt=m.dof==='2'?2:m.dof==='1'?1:(m.rack?1:0);if(!amt)return;
 const p=m.rack?ease((T-.15)/1.8):1,bulb=G&&G.bulb?[ox+G.bulb[0]*sc,oy+G.bulb[1]*sc]:[W*.15,H*.1],G0=G||PH,pc=[ox+(G0.pad.x0+2*G0.pad.px)*sc,oy+(G0.pad.y0+2*G0.pad.py)*sc];
 const fx=bulb[0]+(pc[0]-bulb[0])*p,fy=bulb[1]+(pc[1]-bulb[1])*p,Rr=(v?W*.62:Math.max(W*.3,H*.46))*(1-.38*(1-p)),bl=(amt===2?3.4:1.9)*(1+(m.rack?(1-p)*1.8:0));
 const sw=Math.round(W/4),sh=Math.round(H/4);if(!CB||CB.width!==sw||CB.height!==sh){CB=document.createElement('canvas');CB.width=sw;CB.height=sh;CL=document.createElement('canvas');CL.width=W;CL.height=H}
 if(CL.width!==W||CL.height!==H){CL.width=W;CL.height=H}
 const b=CB.getContext('2d');b.filter='blur('+bl.toFixed(2)+'px)';b.drawImage(c.canvas,0,0,sw,sh);b.filter='none';
 const l=CL.getContext('2d');l.globalCompositeOperation='source-over';l.clearRect(0,0,W,H);l.imageSmoothingEnabled=true;l.drawImage(CB,0,0,W,H);
 l.globalCompositeOperation='destination-out';const g=l.createRadialGradient(fx,fy,Rr*.55,fx,fy,Rr*1.25);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');l.fillStyle=g;l.fillRect(0,0,W,H);
 c.drawImage(CL,0,0)}
function gradeFx(c,W,H){const g=(ST.cam||{}).grade;if(!g||g==='0')return;c.save();const fill=(op,col,a)=>{c.globalCompositeOperation=op;c.globalAlpha=a==null?1:a;c.fillStyle=col;c.fillRect(0,0,W,H)};
 const vig=(a)=>{c.globalCompositeOperation='multiply';c.globalAlpha=1;const r=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.78);r.addColorStop(0,'rgb(255,255,255)');r.addColorStop(1,'rgb('+Math.round(255*(1-a))+','+Math.round(255*(1-a))+','+Math.round(255*(1-a))+')');c.fillStyle=r;c.fillRect(0,0,W,H)};
 if(g==='warm'){fill('multiply','rgb(255,236,212)');fill('overlay','rgb(255,160,70)',.14);fill('soft-light','rgb(255,200,150)',.35);vig(.22)}
 else if(g==='teal'){const t=c.createLinearGradient(0,0,W,H);t.addColorStop(0,'rgb(30,120,140)');t.addColorStop(1,'rgb(255,140,60)');fill('soft-light',t,.7);fill('overlay','rgb(20,90,120)',.12);vig(.18)}
 else if(g==='cold'){fill('multiply','rgb(214,228,248)');fill('overlay','rgb(90,150,255)',.10);fill('screen','rgb(30,50,90)',.06);vig(.12)}
 else if(g==='faded'){fill('screen','rgb(52,50,70)',.2);fill('multiply','rgb(252,242,226)');fill('saturation','rgb(128,128,128)',.32);fill('soft-light','rgb(255,210,160)',.2);vig(.14)}
 c.restore()}
function frame(c,W,H,fmt,T,X){
 LAMPFL=lampLevel(T);const cu=fmt==='c';if(cu)fmt='v';const OV=!cu&&!X.long;
 const v=fmt==='v',E=ST.eng,sc0=v?.87*W/848:.6*W/848,k=trackAt(X,T),tr=X.tracks[k],Sx=tr.S,lt=T-tr.start,la=lt+(tr.off||0),tape=X.kind==='tape',last=X.tracks[X.tracks.length-1],lastEnd=last.start+last.dur,t0=X.make?X.make.T0:X.tracks[0].start;
 const dx=(1.3*Math.sin(T*.31)+.7*Math.sin(T*.77+1.3))*W/1920,dy=(1.1*Math.sin(T*.27+.8)+.6*Math.sin(T*.69+2.1))*W/1920,zs=(1+.0028*Math.sin(T*.21+.4))*(E.hook?1+.2*(1-ease(T/.8)):1)*(ST.cam&&ST.cam.rack?1+.014*(1-ease((T-.15)/1.8)):1);
 c.save();c.fillStyle='#fff';c.fillRect(0,0,W,H);c.translate(W/2+dx,H/2+dy);c.scale(zs,zs);c.translate(-W/2,-H/2);
 const SC=sceneOf(fmt),intro=tape&&T<t0;let sc=sc0,cx=W/2,cy=v?H*.5:H*.495,ox=cx-PH.cx*sc,oy=cy-PH.cy*sc;
 if(SC){sc=Math.max(W/SC.G.W,H/SC.G.H)*1.025;ox=(W-SC.G.W*sc)/2;oy=(H-SC.G.H*sc)/2}else ground(c,W+80,H+80,ox,oy,sc);
 if(cu){const G0=SC?SC.G:PH,pcx=G0.pad.x0+1.5*G0.pad.px+G0.pad.w/2,pcy=G0.pad.y0+1.5*G0.pad.py+G0.pad.h/2,zoom=(SC?1.78:1.55)*(1+.04*Math.sin(T*.23)),sc2=(SC?sc:sc0)*zoom;sc=sc2;ox=W/2-pcx*sc+Math.sin(T*.19)*6;oy=H*.47-pcy*sc+Math.cos(T*.16)*5}
 const fx={vol:(.21*ease((T-.15)/2.4))+.012*Math.sin(T*.6),con:.05*Math.sin(T*.4),fader:Math.max(0,26*(.5+.5*Math.sin(T*.29-.6))),btn:{play:0,start:pulse(T,t0-.42,t0-.12),rec:pulse(T,t0-.42,t0-.12),over:0,stop:pulse(T,lastEnd-.08,lastEnd+.2)}};
 if(X.make){for(const e of Sx.btnEv){const q=pulse(T,e.t-.05,e.t+.16);if(q>(fx.btn[e.k]||0))fx.btn[e.k]=q}fx.wheel=X.make.wheelAngle(T)}
 machine(c,ox,oy,sc,Sx,{lcd:X.make&&!((X.intro>0)&&T<X.intro)?X.make.lcdAt(T):null,boot:(X.intro>0&&T<X.intro)?T:-1,img:SC?SC.img:CUT,geo:SC?SC.G:null,src:SC?SC.img:null,fx,lt:la,run:la>=-.02&&T<lastEnd,trk:tape?[k+1,X.tracks.length]:null,loading:tape&&k>0,head:intro?X.title:'',sub:intro?X.tracks.length+' TRACKS':'',press:i=>la>=-.02?pressAt(Sx,i,la):0});
{c.save();c.translate(ox,oy);c.scale(sc,sc);const Gs=SC?SC.G:PH;
  if(SC&&Gs.id==='deskh')drawCan(c,Gs,Sx);
  if(ST.hands&&ST.hands.on)drawHands(c,Gs,Sx,la,!!SC);
  if(SC){if(Gs.label){const pr=X.long?1:ease((T-tr.start+.25)/1.1);handwrite(c,Gs.label,Sx.title,'MZPRD'+(Sx.bpm?'  '+Sx.bpm+' BPM':'')+(Sx.key?'  '+Sx.key:''),X.kind==='tape'&&k===0&&T<t0?0:pr)}
   if(Gs.smoke&&ST.smoke&&ST.smoke.on)smoke(c,T,Gs.smoke,ST.smoke.amt||1);dust(c,T,Gs)}
  c.restore()}
 if(SC&&SC.G.lamp){lampFx(c,W,H,ox,oy,sc,SC.G,T)}else if(!SC)sheen(c,ox,oy,sc,T);
 c.restore();
 if(camOn()){dofFx(c,W,H,T,ox,oy,sc,SC?SC.G:null,v);gradeFx(c,W,H)}
 /* optional words and the subscribe, drawn flat on top (no camera drift) */
 const topY=v?H*.17:H*.12,sz=v?Math.min(150,W*.12):Math.min(110,W*.058);
 if(OV&&E.hook&&T<2.9){const txt=(E.hookText||'').trim().toUpperCase()||HOOKS[(String(X.title||'').length*7+3)%HOOKS.length],lines=wrapTwo(txt),size=Math.min(sz,W*.9/Math.max(5,Math.max(...lines.map(l=>l.length)))*1.9);sticker(c,lines,W/2,topY,size,.04,T,{out:(2.9-T)/.3})}
 if(OV&&E.note&&(E.noteText||'').trim()&&T>2.4&&T<7.4)pill(c,E.noteText.trim(),W/2,v?(SC?H*.722:H*.775):H*.95,v?40:28,Math.min(ease((T-2.4)/.4),ease((7.4-T)/.4)));
 if(OV&&E.q&&(E.qText||'').trim()&&X.total>14&&T>X.total-10.5&&T<X.total-.15){const txt=E.qText.trim().toUpperCase(),lines=wrapTwo(txt),size=Math.min(v?100:72,W*.9/Math.max(5,Math.max(...lines.map(l=>l.length)))*1.9),pu=1+.025*Math.sin(T*5);sticker(c,lines,W/2,topY,size*pu,X.total-10.5,T,{fill:'#e0242f',out:Math.min(1,(X.total-.15-T)/.3)})}
 if(OV&&X.sub)subscribe(c,W,H,T-X.subT0,v?(SC?.905:0):.9,!v);
 if(X.make&&window.MZMpcMake&&!cu)MZMpcMake.overlay(c,W,H,T,X,v);
 if(OV&&ST.text&&!SC)text(c,W,H,v,{title:tape?X.title:Sx.title,bpm:Sx.bpm,key:Sx.key,sub:tape&&!intro?(k+1)+'. '+Sx.title:''})}
function text(c,W,H,v,S){const ink='#111';c.save();c.fillStyle=ink;c.textBaseline='alphabetic';
 if(v){c.textAlign='center';const t=(S.title||'').toUpperCase(),f=s=>'700 '+s+'px Anton, Oswald, sans-serif',s=fitFont(c,t,f,150,W*.86);c.font=f(s);c.fillText(t,W/2,H*.2);c.font='600 44px Oswald, sans-serif';c.fillStyle='#666';c.fillText(S.sub?S.sub.toUpperCase():([S.bpm?S.bpm+' BPM':'',S.key||'','PROD. MZPRD'].filter(Boolean)).join('   /   '),W/2,H*.2+70);
  c.font='600 40px Oswald, sans-serif';c.fillStyle=ink;c.fillText('MZPRD.COM',W/2,H*.9)}
 else{c.textAlign='left';const t=(S.title||'').toUpperCase(),w=W*.17,f=s=>'700 '+s+'px Anton, Oswald, sans-serif';let s=fitFont(c,t,f,110,w);c.font=f(s);c.fillText(t,W*.03,H*.5);c.font='600 28px Oswald, sans-serif';c.fillStyle='#666';c.fillText(S.sub?S.sub.toUpperCase().slice(0,20):([S.bpm?S.bpm+' BPM':'',S.key||''].filter(Boolean)).join('  /  '),W*.03,H*.5+44);c.textAlign='right';c.font='600 26px Oswald, sans-serif';c.fillStyle=ink;c.fillText('MZPRD.COM',W*.97,H*.94)}
 c.restore()}

/* ---------- UI ---------- */
function css(){if(document.getElementById('mpcCss'))return;const s=document.createElement('style');s.id='mpcCss';s.textContent=`#mpcmk{display:none}#mpcmk.on{display:block}
#mpcmk .mg{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,400px);gap:16px;align-items:start}@media(max-width:1000px){#mpcmk .mg{grid-template-columns:1fr}}
#mpcmk .pn{background:#0c0c0f;border:1px solid #2a2a2e;padding:14px;margin-bottom:16px}#mpcmk h3{font:700 16px Montserrat;letter-spacing:.14em;color:#fff;margin:0}
#mpcmk h4{font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 8px}
#mpcmk label{display:block;font:600 10px Montserrat;letter-spacing:.2em;color:#8e8e94;margin:8px 0 4px}
#mpcmk input[type=text],#mpcmk select,#mpcmk textarea{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 13px Montserrat}
#mpcmk .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.16em;padding:10px 8px;cursor:pointer}#mpcmk .btn:hover{border-color:#fff}#mpcmk .btn.on{border-color:var(--red);background:rgba(224,36,47,.15)}
#mpcmk .btn.big{background:var(--red);border-color:var(--red);font:700 13px Montserrat;letter-spacing:.24em;padding:15px;width:100%}#mpcmk .btn:disabled{opacity:.5}
#mpcmk .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}#mpcmk .chk{display:flex;gap:8px;align-items:center;letter-spacing:.1em;margin:6px 0}#mpcmk .chk input{width:auto}
#mpcmk .box{width:100%;background:#000;border:0;display:block;margin:0 auto}#mpcmk .ctl{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}
#mpcmk .ctl input[type=range]{flex:1;min-width:140px;accent-color:var(--red)}#mpcmk .time{font:600 12px Montserrat;color:#c9c9ce;min-width:92px;text-align:right}
#mpcmk .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}#mpcmk .bar{height:6px;background:#1b1b20;margin-top:8px}#mpcmk .bar b{display:block;height:100%;width:0;background:var(--red)}
#mpcmk .it{display:flex;gap:10px;align-items:center;padding:9px;border-bottom:1px solid #1d1d21;font:600 12px Montserrat;color:#d9d9dc}#mpcmk .it b{flex:1;min-width:0;font-weight:600;white-space:normal}#mpcmk .it button{background:transparent;border:1px solid #4a4a50;color:#fff;font:600 9px Montserrat;letter-spacing:.12em;padding:6px 8px;cursor:pointer}
#mpcmk .sec{border:1px solid #2a2a2e;margin:10px 0;background:#08080a}#mpcmk .sec>summary{cursor:pointer;padding:12px;font:700 11px Montserrat;letter-spacing:.22em;color:var(--gold);list-style:none}#mpcmk .sec .in{padding:0 12px 12px}
#mpcmk .sec>summary{display:flex;justify-content:space-between;align-items:center;gap:8px}#mpcmk .sec>summary::-webkit-details-marker{display:none}
#mpcmk .sec>summary:after{content:'+';font-size:16px;color:#8e8e94;margin-left:6px}#mpcmk .sec[open]>summary:after{content:'\\2212'}
#mpcmk .sec>summary small{flex:1;text-align:right;color:#8e8e94;font:500 10px Montserrat;letter-spacing:.06em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#mpcmk .grp{border:1px solid #2a2a2e;margin:8px 0;background:#0a0a0d}#mpcmk .grp[open]{border-color:#3a3a40}#mpcmk .grp>summary{padding:13px 12px;font-size:11px}
#mpcmk .sub{margin:14px 0 4px;font:700 10px Montserrat;letter-spacing:.22em;color:#c9a14a;border-top:1px solid #1d1d21;padding-top:10px}
#mpcmk .sub2{border:1px solid #232327;margin:8px 0;background:#08080a}#mpcmk .sub2>summary{padding:9px 10px;font-size:10px;color:#c9c9ce}#mpcmk .sub2 .in{padding:0 10px 10px}
#mpcmk .grp .chk{align-items:flex-start;line-height:1.35}#mpcmk .grp .chk input{margin-top:2px}`;document.head.appendChild(s)}
function html(){return`<div class="mg"><div>
 <div class="pn"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3>MPC BEAT VIDEO</h3><div style="display:flex;gap:6px"><button class="btn" id="mFh">16:9</button><button class="btn" id="mFv">9:16</button></div></div>
  <div style="margin-top:10px;display:flex;justify-content:center;background:#000"><canvas class="box" id="mCv" width="1920" height="1080"></canvas></div>
  <div class="ctl"><button class="btn" id="mPlay">PLAY</button><input type="range" id="mScrub" min="0" max="1000" value="0"><span class="time" id="mTime">0:00 / 0:00</span></div>
  <div class="msg" id="mMsg">Pick a beat on the right. The tool listens to it and plays the MPC for you.</div>
  <div class="two" style="margin-top:8px"><button class="btn big" id="mRh">RENDER 16:9</button><button class="btn big" id="mRv">RENDER 9:16</button></div>
  <button class="btn" id="mRb" style="width:100%;margin-top:6px">RENDER BOTH (ONE AFTER THE OTHER)</button><div class="bar"><b id="mProg"></b></div><div class="msg" id="mRMsg"></div></div>
 <details class="pn sec" id="mTHd" style="padding:0"><summary>THUMBNAILS <small style="color:#8e8e94;font-weight:500;letter-spacing:.06em">the MPC in 12 looks, new set any time</small></summary><div class="in" id="mTH"></div></details>
 <details class="pn sec" id="mGnd" style="padding:0"><summary>PACKAGE GENERATOR <small style="color:#8e8e94;font-weight:500;letter-spacing:.06em">dozens of full YouTube packages, scored</small></summary><div class="in" id="mGN"></div></details>
 <details class="pn sec" id="mYTd" style="padding:0"><summary>YOUTUBE PACKAGE <small style="color:#8e8e94;font-weight:500;letter-spacing:.06em">titles, description with the beat link, tags</small></summary><div class="in" id="mYT"></div></details>
</div><div><div class="pn" id="mRight">
 <div style="display:flex;justify-content:space-between;align-items:center"><h3>SETTINGS</h3><div style="display:flex;gap:6px"><button class="btn" id="mOpenAll">OPEN ALL</button><button class="btn" id="mCloseAll">CLOSE ALL</button></div></div>
 <details class="sec grp" id="g_beat"><summary>1. THE BEAT <small id="s_beat">pick a beat</small></summary><div class="in">
  <label>BEAT</label><select id="mBeat"></select>
  <div id="mInfo" class="msg"></div>
  <label>SOUNDS LIKE (ARTIST, OPTIONAL: USED IN THE TITLES)</label><input type="text" id="mArt" placeholder="e.g. Lil Baby">
  <label>SCREEN TEXT (LEAVE EMPTY TO USE THE BEAT NAME)</label><input type="text" id="mLcd" maxlength="40">
  <label>HOW MUCH OF THE BEAT</label><select id="mLen"><option value="0">The whole preview</option><option value="15">First 15 seconds</option><option value="30">First 30 seconds</option><option value="45">First 45 seconds</option><option value="60">First 60 seconds</option></select>
 </div></details>
 <details class="sec grp" id="g_scene"><summary>2. SCENE <small id="s_scene"></small></summary><div class="in">
  <label>LOOK OF THE VIDEOS</label><select id="mScene"><option value="desk">Desk scene (the worn desk, lamp and floppy disks)</option><option value="white">White studio</option></select>
  <label>MACHINE SKIN (DESK SCENES)</label><select id="mSkin">${SKINS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
  <div class="sub">CAN ON THE DESK (16:9)</div>
  <select id="mCan"><option value="orig">The original Pepsi can (as in the picture)</option><option value="auto">A different can for each beat (automatic)</option>${CAN_NAMES.map((n,i)=>`<option value="${i+1}">${n}</option>`).join('')}<option value="none">No can</option></select>
  <details class="sec sub2" id="mCanSet"><summary>CAN SIZE, TILT AND POSITION</summary><div class="in"><label>SIZE: <span id="mCanSv">100</span>%</label><input type="range" id="mCanS" min="50" max="170" step="1" style="width:100%;accent-color:var(--red)">
  <label>TILT: <span id="mCanRv">0</span> DEGREES</label><input type="range" id="mCanR" min="-60" max="60" step="1" style="width:100%;accent-color:var(--red)">
  <label>LEFT / RIGHT</label><input type="range" id="mCanX" min="-330" max="120" step="1" style="width:100%;accent-color:var(--red)">
  <label>UP / DOWN</label><input type="range" id="mCanY" min="-160" max="260" step="1" style="width:100%;accent-color:var(--red)"><button class="btn" id="mCanReset" style="width:100%;margin-top:6px">PUT THE CAN BACK</button></div></details>
  <div class="sub">PICTURE SIZE</div>
  <select id="mRes"><option value="1080">Full HD (1920x1080 / 1080x1920)</option><option value="4k">4K (3840x2160 / 2160x3840): slower, much bigger file</option></select>
 </div></details>
 <details class="sec grp" id="g_cam"><summary>3. CAMERA AND LIGHT <small id="s_cam"></small></summary><div class="in">
  <label>LAMP LIGHT (DESK SCENES)</label><select id="mLamp"><option value="0">Steady (no change)</option><option value="1">Gentle</option><option value="2">Real (it sags and flickers now and then)</option><option value="3">Dramatic</option></select>
  <label>DEPTH OF FIELD (BLURRED BACKGROUND, LIKE A REAL LENS)</label><select id="mDof"><option value="0">Off (everything sharp)</option><option value="1">Soft</option><option value="2">Strong</option></select>
  <label class="chk"><input type="checkbox" id="mRack"> FOCUS PULL AT THE START (FOCUS SLIDES FROM THE LAMP TO THE PADS)</label>
  <label>COLOR GRADE</label><select id="mGrade"><option value="0">None (as is)</option><option value="warm">Warm film</option><option value="teal">Teal and orange</option><option value="cold">Cold studio</option><option value="faded">Faded 90s</option></select>
 </div></details>
 <details class="sec grp" id="g_extras"><summary>4. DESK EXTRAS <small id="s_extras"></small></summary><div class="in">
  <label class="chk"><input type="checkbox" id="mIntro"> POWER-ON INTRO (THE SCREEN BOOTS UP AND TYPES THE BEAT NAME, ABOUT 3 SECONDS)</label>
  <div class="msg" id="mIntroN" style="margin-top:0">The intro is not used in the looping 9:16 version.</div>
  <label class="chk"><input type="checkbox" id="mHands"> HANDS TAPPING THE PADS (YOUR OWN HANDS, THEY STRIKE EVERY HIT)</label>
  <label class="chk"><input type="checkbox" id="mSmoke"> CIGARETTE SMOKE (9:16 DESK SCENE)</label>
  <select id="mSmokeAmt"><option value="0.6">Light smoke</option><option value="1">Normal smoke</option><option value="1.5">Heavy smoke</option></select>
  <label class="chk"><input type="checkbox" id="mTxt"> ALSO SHOW THE TITLE AS TEXT ON THE WHITE STUDIO (OFF = CLEAN)</label>
 </div></details>
 <details class="sec grp" id="g_hits"><summary>5. PAD HITS <small id="s_hits"></small></summary><div class="in">
  <label>PAD LAYOUT (EACH BEAT GETS ITS OWN BY DEFAULT, THE SAME EVERY TIME)</label><select id="mKit"><option value="">Automatic for this beat</option>${KITS.map((k,i)=>`<option value="${i}">${k.n}</option>`).join('')}</select>
  <label>HOW MANY HITS (MORE = EVERY SMALL HIT)</label><select id="mSens"><option value="0">Only the clear hits</option><option value="1">Balanced</option><option value="2">Every hit</option></select>
  <label>TIMING NUDGE: <span id="mNudgeV">0</span> MS (MOVE THE PAD HITS EARLIER OR LATER)</label><input type="range" id="mNudge" min="-80" max="80" step="1" value="0" style="width:100%;accent-color:var(--red)">
  <div class="msg">The kick is the bottom right pad (BASS), snares are SNARE 1 and 2, hats are HIHAT, and chops and melody hits land on the toms, rides, crashes and percs.</div>
  <details class="sec sub2"><summary>WHAT THE TOOL HEARD</summary><div class="in msg" id="mMap"></div></details>
 </div></details>
 <details class="sec grp" id="g_watch"><summary>6. KEEP THEM WATCHING <small id="s_watch"></small></summary><div class="in">
  <label class="chk"><input type="checkbox" id="mEhk"> BIG HOOK LINE AT THE START (SLAMS ON SCREEN, THE MPC PUNCHES IN)</label>
  <input type="text" id="mEhkT" maxlength="40" placeholder="Leave empty for an automatic line, or type your own">
  <label class="chk"><input type="checkbox" id="mEsub"> ANIMATED SUBSCRIBE AT THE END (BOTH FORMATS)</label>
  <label class="chk"><input type="checkbox" id="mEloop"> LOOPING ENDING (9:16, SINGLE BEAT): THE END BLENDS BACK INTO THE START</label>
  <label class="chk"><input type="checkbox" id="mEnote"> PRODUCER'S NOTE AT THE START</label>
  <input type="text" id="mEnoteT" maxlength="60">
  <label class="chk"><input type="checkbox" id="mEq"> QUESTION ON SCREEN AT THE END</label>
  <input type="text" id="mEqT" maxlength="40">
 </div></details>
 <details class="sec grp" id="g_tape"><summary>7. BEAT TAPE <small id="s_tape">several beats in one video</small></summary><div class="in">
  <label class="chk"><input type="checkbox" id="mTpOn"> MAKE A BEAT TAPE: ONE VIDEO THAT PLAYS THE BEATS BELOW, ONE AFTER THE OTHER</label>
  <div id="mTpBox">
   <label>TAPE TITLE (SHOWS ON THE SCREEN AT THE START)</label><input type="text" id="mTpT" maxlength="40">
   <div class="two"><div><label>TIME PER BEAT</label><select id="mTpL"><option value="30">30 seconds</option><option value="45">45 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option><option value="0">The whole preview</option></select></div>
   <div><label>BLEND BETWEEN BEATS</label><select id="mTpX"><option value="0.6">Short (0.6 s)</option><option value="1.2">Smooth (1.2 s)</option><option value="2">Long (2 s)</option></select></div></div>
   <label>ADD A BEAT</label><div style="display:grid;grid-template-columns:1fr auto;gap:6px"><select id="mTpA"></select><button class="btn" id="mTpAdd">ADD</button></div>
   <div id="mTpList"></div>
   <button class="btn big" id="mTpBuild" style="margin-top:8px">BUILD THE TAPE (LISTEN TO EVERY BEAT)</button><div class="msg" id="mTpMsg">Add at least 2 beats, then build the tape. Then preview it and render it with the buttons on the left.</div>
  </div>
 </div></details>
 <details class="sec grp" id="g_s2b"><summary>9. SAMPLE TO BEAT <small id="s_s2b">optional series: chop a sample</small></summary><div class="in" id="mS2B"></div></details>
 <details class="sec grp" id="g_extra"><summary>8. EXTRA VIDEOS <small id="s_extra">close-up Short, freestyle loop</small></summary><div class="in">
  <div class="msg" style="margin-top:0">Same beat, different uploads. Each one is a separate video for a different audience.</div>
  <button class="btn" id="mRcu" style="width:100%;margin-top:6px">RENDER PAD CLOSE-UP SHORT (9:16, NO TEXT)</button>
  <label>FREESTYLE LOOP (NO LYRICS): LENGTH AND SHAPE</label><div class="two"><select id="mLpM"><option value="10">10 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select><select id="mLpF"><option value="h">16:9 (720p)</option><option value="v">9:16 (720p)</option></select></div>
  <button class="btn" id="mRlp" style="width:100%;margin-top:6px">RENDER FREESTYLE LOOP VIDEO</button>
  <div class="msg">The loop is made at 720p and 15 frames a second so a 30 minute file stays a few hundred MB. A 30 minute loop can take 10 to 20 minutes to render, so leave the tab open.</div>
  <div id="mLpOut"></div>
 </div></details>
</div></div></div>`}

function applyKit(){const id=ST.beat,k=ST.kits&&ST.kits[id]!=null&&ST.kits[id]!==''?+ST.kits[id]:kitFor(id);S.kit=k;const L=layout(S.raw,k);S.hits=L.hits;S.per=L.per;
 const tot=S.per.map((x,i)=>x.length?PAD_NAMES[i]+' '+x.length:'').filter(Boolean);const m=root&&$q('#mMap');if(m)m.textContent='Kit: '+KITS[k].n+'. '+(tot.join(' / ')||'Nothing was found.');const ks=root&&$q('#mKit');if(ks)ks.value=(ST.kits&&ST.kits[id]!=null&&ST.kits[id]!=='')?String(ST.kits[id]):''}
const CACHE={};
async function loadBeat(b){if(CACHE[b.id])return CACHE[b.id];const r=await fetch(pubU(b.preview_path));if(!r.ok)throw new Error('The preview of "'+b.title+'" did not load ('+r.status+').');const buf=await ctxA().decodeAudioData(await r.arrayBuffer());const raw=window.MZMpcDetect?await MZMpcDetect.analyze(buf):await analyze(buf);return CACHE[b.id]={buf,raw}}
const kitOf=id=>ST.kits&&ST.kits[id]!=null&&ST.kits[id]!==''?+ST.kits[id]:kitFor(id);
function mkS(b,len,kit){const C=CACHE[b.id],Sx={title:b.title,bpm:Number(b.bpm)||0,key:b.musical_key||'',lcd:'',raw:C.raw,buf:C.buf,off:C.raw.off||0,kit,dur:len?Math.min(C.buf.duration,len):C.buf.duration};const L=layout(C.raw,kit);Sx.hits=L.hits;Sx.per=L.per;return Sx}
let TP=null;
let EP=null;
const X=()=>(ST.s2b&&ST.s2b.useEp&&EP)?EP:(ST.tape.on?TP:(S&&S.tl));
function applyKit(){const id=ST.beat,k=kitOf(id),L=layout(S.raw,k);S.kit=k;S.hits=L.hits;S.per=L.per;
 const tot=S.per.map((x,i)=>x.length?PAD_NAMES[i]+' '+x.length:'').filter(Boolean);const m=root&&$q('#mMap');if(m)m.textContent='Kit: '+KITS[k].n+'. '+(tot.join(' / ')||'Nothing was found.');const ks=root&&$q('#mKit');if(ks)ks.value=(ST.kits&&ST.kits[id]!=null&&ST.kits[id]!=='')?String(ST.kits[id]):''}
async function pick(id){ST.beat=id;if(EP){EP=null;if(ST.s2b)ST.s2b.useEp=false}save();stopPlay();const b=beats.find(x=>String(x.id)===String(id));if(!b)return;
 S=null;drawNow();$q('#mMsg').textContent='Loading "'+b.title+'" and listening for the hits...';$q('#mInfo').textContent='';
 try{await loadBeat(b);if(String(ST.beat)!==String(id))return;S=mkS(b,ST.len,kitOf(id));S.lcd=ST.lcd.trim();S.tl=tlOne(S);applyKit();
  $q('#mInfo').textContent=mmss(CACHE[b.id].buf.duration)+' preview / '+S.hits.length+' pad hits found';$q('#mMsg').textContent='Ready. Press PLAY to watch it, or render the video.';mark('yt','th','gen');if(window.__lpShow)__lpShow();drawNow()}
 catch(e){$q('#mMsg').textContent='Could not load this beat: '+(e&&e.message||e)}}
function size(){const v=ST.fmt==='v',cv=$q('#mCv');cv.width=v?1080:1920;cv.height=v?1920:1080;cv.style.maxWidth=v?'360px':'100%';$q('#mFh').classList.toggle('on',!v);$q('#mFv').classList.toggle('on',v)}
function drawNow(){const cv=$q('#mCv'),Xt=XF(ST.fmt);if(!cv||!sceneOK(ST.fmt))return;if(!Xt){const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);$q('#mTime').textContent='0:00 / 0:00';return}
 const T=PV.playing?(AC.currentTime-PV.t0):parseFloat($q('#mScrub').value)/1000*Xt.total;frame(cv.getContext('2d'),cv.width,cv.height,ST.fmt,T,Xt);$q('#mTime').textContent=mmss(clamp(T,0,Xt.total))+' / '+mmss(Xt.total)}
function stopPlay(){PV.playing=false;PV.loading=false;cancelAnimationFrame(PV.raf);try{PV.src&&PV.src.stop()}catch(e){}PV.src=null;if(root)$q('#mPlay').textContent='PLAY'}
/* the whole sound of the video in one buffer: lead-in, every beat with its blend, the fade out */
async function mixAudio(Xt,sr){if(Xt.mix&&Xt.mixSr===sr)return Xt.mix;const oa=new OfflineAudioContext(2,Math.ceil(Xt.total*sr),sr);
 Xt.tracks.forEach((tr,i)=>{const src=oa.createBufferSource();src.buffer=tr.S.buf;src.loop=tr.S.buf.duration<tr.dur+(tr.off||0);const g=oa.createGain();src.connect(g);g.connect(oa.destination);const last=i===Xt.tracks.length-1,fin=tr.fi!=null?tr.fi:(i===0?.04:(Xt.xf||1.2)),fout=tr.fo!=null?tr.fo:(last?1.3:(Xt.xf||1.2)),s0=tr.start,e0=tr.start+tr.dur;
  g.gain.setValueAtTime(.0001,s0);g.gain.linearRampToValueAtTime(1,s0+Math.max(.01,fin));if(fout>0){g.gain.setValueAtTime(1,Math.max(s0+fin,e0-fout));g.gain.linearRampToValueAtTime(.0001,e0)}else g.gain.setValueAtTime(1,e0);src.start(s0,tr.off||0,tr.dur)});
 if(Xt.sub){const at=Xt.subT0,tone=(t,f0,f1,d,v)=>{const o=oa.createOscillator(),g=oa.createGain();o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(oa.destination);o.start(t);o.stop(t+d+.05)};
  tone(at+1.55,560,240,.07,.1);[1320,1980,2640].forEach((f,i)=>tone(at+1.72,f,f,1.3-i*.25,.045/(i+1)))}
 if(Xt.intro>0){const o1=oa.createOscillator(),g1=oa.createGain();o1.type='sine';o1.frequency.setValueAtTime(95,.32);o1.frequency.exponentialRampToValueAtTime(38,.55);g1.gain.setValueAtTime(.0001,.32);g1.gain.linearRampToValueAtTime(.26,.335);g1.gain.exponentialRampToValueAtTime(.0001,.6);o1.connect(g1);g1.connect(oa.destination);o1.start(.32);o1.stop(.65);
  const nb=oa.createBuffer(1,Math.ceil(sr*.12),sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;for(let k=0;k<7;k++){const s1=oa.createBufferSource();s1.buffer=nb;const bp=oa.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1500+k%3*500;bp.Q.value=3;const g2=oa.createGain();g2.gain.value=.05;s1.connect(bp);bp.connect(g2);g2.connect(oa.destination);s1.start(1.05+k*.17)}
  const bp2=(t,f,d,v)=>{const o=oa.createOscillator(),g=oa.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(oa.destination);o.start(t);o.stop(t+d+.02)};bp2(2.32,1760,.07,.035);const nm=String(Xt.title||'').length;for(let i=0;i<Math.min(nm,18);i++)bp2(2.4+i*.07,1300+(i%3)*90,.02,.02);bp2(Math.min(3.2,2.45+Math.min(nm,18)*.07+.1),2093,.09,.035)}
 const ab=await oa.startRendering();Xt.mix=ab;Xt.mixSr=sr;return ab}
async function play(){if(PV.playing||PV.loading){stopPlay();drawNow();return}await ensureScene(ST.fmt);const Xt=XF(ST.fmt);if(!Xt){$q('#mMsg').textContent=ST.tape.on?'Build the tape first (right side, section 3).':'Pick a beat first.';return}
 PV.loading=true;$q('#mPlay').textContent='LOADING...';const my=++PV.tok||(PV.tok=1);
 const a=ctxA(),buf=await mixAudio(Xt,44100);await Promise.race([a.resume(),new Promise(r=>setTimeout(r,500))]);if(!PV.loading)return;PV.loading=false;
 const src=a.createBufferSource();src.buffer=buf;src.connect(a.destination);let from=parseFloat($q('#mScrub').value)/1000*Xt.total;if(from>=Xt.total-.3)from=0;const start=a.currentTime+.06;PV.t0=start-from;src.start(start,from);PV.src=src;PV.playing=true;$q('#mPlay').textContent='STOP';
 const loop=()=>{if(!PV.playing)return;const T=a.currentTime-PV.t0;if(T>=Xt.total){stopPlay();return}const cv=$q('#mCv');frame(cv.getContext('2d'),cv.width,cv.height,ST.fmt,Math.max(0,T),Xt);$q('#mScrub').value=String(Math.round(T/Xt.total*1000));$q('#mTime').textContent=mmss(T)+' / '+mmss(Xt.total);PV.raf=requestAnimationFrame(loop)};PV.raf=requestAnimationFrame(loop)}

/* ---------- MP4 export ---------- */
const mcx=new MessageChannel(),ysq=[];mcx.port1.onmessage=()=>{const f=ysq.shift();if(f)f()};const yieldNow=()=>new Promise(r=>{ysq.push(r);mcx.port2.postMessage(0)});
const dlf=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000)};
async function renderOne(fmt){
 const rm=t=>{$q('#mRMsg').textContent=t};rm('Loading pictures...');await ensureScene(fmt);const Xt=XF(fmt);
 if(!(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext)){rm('This browser cannot render video. Use Chrome or Edge.');return false}
 if(!Xt){rm(ST.tape.on?'Build the tape first (right side, section 3).':'Pick a beat first.');return false}
 let venc,aenc,err=null;
 try{await loadS('mp4-muxer.js').catch(()=>{});
  const tall=fmt==='v'||fmt==='c',K4=ST.res==='4k'?2:1,OW=(tall?1080:1920)*K4,OH=(tall?1920:1080)*K4,FPS=30,total=Xt.total,N=Math.ceil(total*FPS),out=document.createElement('canvas');out.width=OW;out.height=OH;const oc=out.getContext('2d');
  const pickV=async()=>{for(const c of (K4===2?[{codec:'avc1.640033',mux:'avc'},{codec:'avc1.640032',mux:'avc'},{codec:'avc1.4d0033',mux:'avc'},{codec:'vp09.00.50.08',mux:'vp9'}]:[{codec:'avc1.640028',mux:'avc'},{codec:'avc1.4d0028',mux:'avc'},{codec:'avc1.42E028',mux:'avc'},{codec:'vp09.00.40.08',mux:'vp9'}])){const cfg={codec:c.codec,width:OW,height:OH,bitrate:K4===2?32e6:9e6,framerate:FPS};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
  const pickA=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:48000,numberOfChannels:2,bitrate:192000});if(r&&r.supported)return c}catch(e){}}return null};
  const vc=await pickV(),ac=await pickA();if(!vc||!ac)throw new Error('no video codec available');
  rm('Building the audio...');const ab=await mixAudio(Xt,48000),L0=ab.getChannelData(0),R0=ab.getChannelData(1);
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:OW,height:OH},audio:{codec:ac.mux,numberOfChannels:2,sampleRate:48000},fastStart:'in-memory'});
  venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:ac.codec,sampleRate:48000,numberOfChannels:2,bitrate:192000});
  for(let o=0;o<L0.length;o+=4800){const m=Math.min(4800,L0.length-o),b=new Float32Array(m*2);b.set(L0.subarray(o,o+m),0);b.set(R0.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:m,numberOfChannels:2,timestamp:Math.round(o/48000*1e6),data:b});aenc.encode(ad);ad.close()}
  const t0=performance.now();
  for(let f=0;f<N;f++){if(err)throw err;frame(oc,OW,OH,fmt,Math.min(total-.001,f/FPS),Xt);const vf=new VideoFrame(out,{timestamp:Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:f%90===0});vf.close();
   while(venc.encodeQueueSize>6){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
   if(f%8===0){const p=Math.round(f/N*100),el=(performance.now()-t0)/1000,eta=f?Math.round(el/f*(N-f)):0;$q('#mProg').style.width=p+'%';rm('Rendering '+(fmt==='c'?'close-up 9:16':fmt==='v'?'9:16':'16:9')+' '+p+'%  (about '+mmss(eta)+' left). You can switch tabs, it keeps going.');await yieldNow()}}
  await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();const blob=new Blob([target.buffer],{type:'video/mp4'});
  $q('#mProg').style.width='100%';rm('Done: '+(blob.size/1048576).toFixed(0)+' MB, '+mmss(total)+' long. Downloading.');dlf(blob,((Xt.kind==='tape'?Xt.title:Xt.tracks[0].S.title)||'beat').replace(/[^\w -]+/g,'')+' - MPC '+({v:'9x16',h:'16x9',c:'pad closeup 9x16'}[fmt])+'.mp4');return true
 }catch(e){console.warn(e);rm('Render failed: '+((e&&e.message)||e));return false}
 finally{try{venc&&venc.close()}catch(e){}try{aenc&&aenc.close()}catch(e){}}}
async function render(list){if(busy)return;busy=true;stopPlay();const bar=document.querySelector('.bh [data-t=mpc]');['#mRh','#mRv','#mRb','#mRcu','#mRlp'].forEach(k=>$q(k).disabled=true);
 try{for(const f of list){if(!(await renderOne(f)))break}}finally{busy=false;['#mRh','#mRv','#mRb','#mRcu','#mRlp'].forEach(k=>$q(k).disabled=false);if(bar)bar.textContent='MPC';drawNow();ytOpen()}}
/* ---------- long freestyle loop (no lyrics): the beat repeats with a smooth blend, 15 fps and 720p to keep the file small ---------- */
function loopTL(Sx,mins){const xf=Math.min(2.5,Sx.dur*.2),step=Math.max(2,Sx.dur-xf),lead=.4,total=lead+mins*60,tracks=[];for(let t=lead,i=0;t<total-.01;t+=step,i++)tracks.push({S:Sx,start:t,dur:Sx.dur,off:0,fi:i===0?.05:xf,fo:xf});const X={kind:'one',tracks,total,lead,title:Sx.title,long:true,xf};const l=tracks[tracks.length-1];l.fo=Math.min(3,Math.max(.5,total-(l.start)));return X}
async function mixChunk(Xt,from,to,sr){const n=Math.ceil((to-from)*sr),oa=new OfflineAudioContext(2,n,sr);
 Xt.tracks.forEach(tr=>{const s0=tr.start,e0=tr.start+tr.dur;if(e0<=from||s0>=to)return;const fin=tr.fi!=null?tr.fi:.05,fo=tr.fo!=null?tr.fo:1,src=oa.createBufferSource();src.buffer=tr.S.buf;const g=oa.createGain();src.connect(g);g.connect(oa.destination);
  const gAt=t=>t<=s0?.0001:t<s0+fin?.0001+(1-.0001)*((t-s0)/fin):t<e0-fo?1:t<e0?1-(1-.0001)*((t-(e0-fo))/fo):.0001,w=Math.max(0,s0-from),a=Math.max(s0,from),b=Math.min(e0,to);
  g.gain.setValueAtTime(gAt(a),w);[s0+fin,e0-fo,e0].forEach(bp=>{if(bp>a&&bp<b)g.gain.linearRampToValueAtTime(gAt(bp),bp-from)});g.gain.linearRampToValueAtTime(gAt(b),b-from);
  src.start(w,(tr.off||0)+Math.max(0,from-s0),Math.max(.05,b-a))});
 return oa.startRendering()}
async function renderLoop(){if(busy)return;const rm=t=>{$q('#mRMsg').textContent=t};
 if(!(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext)){rm('This browser cannot render video. Use Chrome or Edge.');return}
 if(ST.tape.on||!S||!S.buf){rm(ST.tape.on?'The loop video is for a single beat. Turn the beat tape off first.':'Pick a beat first.');return}
 busy=true;stopPlay();['#mRh','#mRv','#mRb','#mRcu','#mRlp'].forEach(k=>$q(k).disabled=true);let venc,aenc,err=null;
 try{await ensureScene($q('#mLpF').value);await loadS('mp4-muxer.js').catch(()=>{});const mins=+$q('#mLpM').value,tall=$q('#mLpF').value==='v',OW=tall?720:1280,OH=tall?1280:720,FPS=15,Xt=loopTL(S,mins),total=Xt.total,N=Math.ceil(total*FPS),out=document.createElement('canvas');out.width=OW;out.height=OH;const oc=out.getContext('2d');
  const pickV=async()=>{for(const c of [{codec:'avc1.4d001f',mux:'avc'},{codec:'avc1.42E01f',mux:'avc'},{codec:'vp09.00.31.08',mux:'vp9'}]){const cfg={codec:c.codec,width:OW,height:OH,bitrate:1.6e6,framerate:FPS};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
  const pickA=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:48000,numberOfChannels:2,bitrate:160000});if(r&&r.supported)return c}catch(e){}}return null};
  const vc=await pickV(),ac=await pickA();if(!vc||!ac)throw new Error('no video codec available');
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:OW,height:OH},audio:{codec:ac.mux,numberOfChannels:2,sampleRate:48000},fastStart:'in-memory'});
  venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:ac.codec,sampleRate:48000,numberOfChannels:2,bitrate:160000});
  const CH=60,t0=performance.now();let f=0;
  for(let from=0;from<total;from+=CH){const to=Math.min(total,from+CH),ab=await mixChunk(Xt,from,to,48000),L0=ab.getChannelData(0),R0=ab.getChannelData(1);
   for(let o=0;o<L0.length;o+=4800){const m=Math.min(4800,L0.length-o),b=new Float32Array(m*2);b.set(L0.subarray(o,o+m),0);b.set(R0.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:m,numberOfChannels:2,timestamp:Math.round((from+o/48000)*1e6),data:b});aenc.encode(ad);ad.close()}
   const f1=Math.min(N,Math.round(to*FPS));
   for(;f<f1;f++){if(err)throw err;frame(oc,OW,OH,tall?'v':'h',Math.min(total-.001,f/FPS),Xt);const vf=new VideoFrame(out,{timestamp:Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:f%150===0});vf.close();
    while(venc.encodeQueueSize>6){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
    if(f%15===0){const p=Math.round(f/N*100),el=(performance.now()-t0)/1000,eta=f?Math.round(el/f*(N-f)):0;$q('#mProg').style.width=p+'%';rm('Rendering the '+mins+' minute loop '+p+'%  (about '+mmss(eta)+' left). Keep this tab open, it can take a while.');await yieldNow()}}}
  await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();const blob=new Blob([target.buffer],{type:'video/mp4'});
  $q('#mProg').style.width='100%';rm('Done: '+(blob.size/1048576).toFixed(0)+' MB, '+mmss(total)+' long. Downloading.');dlf(blob,(S.title||'beat').replace(/[^\w -]+/g,'')+' - '+mins+' min freestyle loop '+(tall?'9x16':'16x9')+'.mp4')
 }catch(e){console.warn(e);rm('Render failed: '+((e&&e.message)||e))}
 finally{try{venc&&venc.close()}catch(e){}try{aenc&&aenc.close()}catch(e){}busy=false;['#mRh','#mRv','#mRb','#mRcu','#mRlp'].forEach(k=>$q(k).disabled=false);drawNow()}}
function loopPack(){const b=beats.find(x=>String(x.id)===String(ST.beat));if(!b)return'';const mins=+$q('#mLpM').value,AR=(window.MZMpcGen?MZMpcGen.artistsOf(ST.artist):[]),A=AR.slice(0,2).join(' x '),T=b.title,link='https://mzprd.com/beat/'+(b.slug||T.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''))+'/',bpm=Number(b.bpm)||0,key=b.musical_key||'';
 const titles=[`${mins} Minutes of ${A?A+' ':''}Boom Bap Freestyle Beat (No Lyrics) | "${T}"`,`${A?A+' Type Beat ':'Boom Bap Type Beat '}Loop - ${mins} Min Freestyle Instrumental`,`Freestyle Beat to Rap Over (${mins} Min Loop) - "${T}"${bpm?' '+bpm+' BPM':''}`,`${mins} Min Rap Instrumental to Write To - ${A?A+' Type Beat':'Boom Bap'} "${T}"`,`Hard Boom Bap Beat Loop for Freestyles | ${mins} Minutes | MPC60`];
 const desc=`${mins} minute loop of "${T}", played live on the Akai MPC60 II. No lyrics, made for freestyles and writing. Lease the beat: ${link}\n\n> BUY / LEASE THIS BEAT: ${link}\n> ALL BEATS AND SAMPLE PACKS: https://mzprd.com\n\nBEAT DETAILS\nTitle: ${T}\n${bpm?'BPM: '+bpm+'\n':''}${key?'Key: '+key+'\n':''}Loops every ${mmss(S&&S.dur||0)} with a smooth blend.\n\nWant a verse on it? Post what you wrote in the comments.\n\n#typebeat #freestylebeat #boombap`;
 return{titles,desc}}
function ytOpen(){const d=$q('#mYTd');if(d&&X()){d.open=true}}

/* ---------- beat tape ---------- */
const beatById=id=>beats.find(b=>String(b.id)===String(id));
function tpList(){const T=ST.tape,el=$q('#mTpList');T.ids=T.ids.filter(id=>beatById(id));
 el.innerHTML=T.ids.length?T.ids.map((id,i)=>`<div class="it"><span style="color:var(--gold);font-weight:700">${i+1}</span><b>${esc(beatById(id).title)}</b><button data-u="${i}">UP</button><button data-d="${i}">DOWN</button><button data-x="${i}">REMOVE</button></div>`).join(''):'<div class="msg">No beats in the tape yet.</div>';
 const mv=(i,j)=>{if(j<0||j>=T.ids.length)return;[T.ids[i],T.ids[j]]=[T.ids[j],T.ids[i]];tpDirty()};
 el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>mv(+b.dataset.u,+b.dataset.u-1));el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>mv(+b.dataset.d,+b.dataset.d+1));
 el.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{T.ids.splice(+b.dataset.x,1);tpDirty()});
 const a=$q('#mTpA');a.innerHTML=beats.filter(b=>!T.ids.includes(String(b.id))&&!T.ids.includes(b.id)).map(b=>`<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('')||'<option value="">All beats are in the tape</option>'}
function tpDirty(){TP=null;stopPlay();save();tpList();$q('#mTpMsg').textContent=ST.tape.ids.length>=2?'The list changed. Press BUILD THE TAPE again.':'Add at least 2 beats.';ytRender();thRender();drawNow()}
async function buildTape(){const T=ST.tape,ids=T.ids.filter(beatById),msg=t=>{$q('#mTpMsg').textContent=t};if(ids.length<2){msg('Add at least 2 beats.');return}
 stopPlay();TP=null;const btn=$q('#mTpBuild');btn.disabled=true;
 try{const bs=ids.map(beatById);for(let i=0;i<bs.length;i++){msg('Listening to beat '+(i+1)+' of '+bs.length+': '+bs[i].title+'...');await loadBeat(bs[i])}
  const lead=ST.intro?INTRO:1.6,xf=+T.xf||1.2,tracks=[];let t=lead;bs.forEach(b=>{const Sx=mkS(b,+T.len||0,kitOf(b.id));tracks.push({S:Sx,start:t,dur:Sx.dur,b});t=t+Sx.dur-xf});
  const last=tracks[tracks.length-1];TP={kind:'tape',tracks,lead,xf,title:T.title,intro:ST.intro?INTRO:0,total:last.start+last.dur+TAIL};
  msg('The tape is ready: '+tracks.length+' beats, '+mmss(TP.total)+' long. Press PLAY on the left, or render it.');$q('#mMsg').textContent='Tape ready ('+mmss(TP.total)+').';mark('yt','th','gen');if(window.__lpShow)__lpShow();drawNow()}
 catch(e){msg('Could not build the tape: '+(e&&e.message||e))}finally{btn.disabled=false}}

/* ---------- YouTube package + thumbnails (the brains are in mpcyt.js) ---------- */
const YT=()=>window.MZMpcYT;
const cpy=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}a.remove();return ok}};
function ytRenderNow(){const el=$q('#mYT');if(!el)return;const b=beats.find(x=>String(x.id)===String(ST.beat)),O=ST.tape.on?(TP&&YT()?YT().buildTape(ST,TP):null):(b&&YT()?YT().build(ST,b,S):null);if(!O){el.innerHTML='<div class="msg">'+(ST.tape.on?'Build the tape first.':'Pick a beat first.')+'</div>';return}
 const cc=(n,max,soft)=>`<span style="font:600 10px Montserrat;color:${n>max?'#ff5c5c':soft&&n>soft?'#e8b94a':'#7ad47a'}">${n}/${max}</span>`,pre=ST.yt.mode==='premiere';
 el.innerHTML=`<div class="two"><label class="chk"><input type="radio" name="mym" value="premiere"${pre?' checked':''}> PREMIERE</label><label class="chk"><input type="radio" name="mym" value="straight"${pre?'':' checked'}> STRAIGHT UPLOAD</label></div>${pre?`<label>PREMIERE TIME TEXT</label><input type="text" id="myW" placeholder="Friday at 8:00 PM" value="${esc(ST.yt.when)}">`:''}
 <h4>SMART CHECKS</h4>${O.checks.map(k=>`<div class="it"><span style="color:${k.ok?'#7ad47a':'#e8b94a'};font-weight:700">${k.ok?'OK':'FIX'}</span><b>${esc(k.msg)}</b></div>`).join('')}
 <h4>TITLES <small style="color:#8e8e94;font-weight:500;letter-spacing:.06em">score out of 100, best pick marked</small></h4>${O.titles.map((t,i)=>`<div class="it"><b>${t.best?'<span style="color:var(--gold)">BEST PICK </span>':''}${esc(t.t)}<br><small style="color:#8e8e94">${t.k}</small></b>${cc(t.t.length,100,60)}<span style="font:700 11px Montserrat;color:${t.s>=80?'#7ad47a':t.s>=65?'#e8b94a':'#ff5c5c'}">${t.s}</span><button data-c="t${i}">COPY</button></div>`).join('')}<button class="btn" id="myM" style="width:100%;margin-top:6px">MORE TITLE IDEAS</button>
 <h4>DESCRIPTION ${cc(O.desc.length,5000)}</h4><textarea id="myD" rows="14" style="font:500 12px/1.5 monospace">${esc(O.desc)}</textarea><button class="btn" data-c="desc" style="width:100%;margin-top:6px">COPY DESCRIPTION</button>
 <h4>TAGS ${cc(O.tags.length,500)}</h4><textarea id="myT" rows="3" style="font:500 12px/1.5 monospace">${esc(O.tags)}</textarea><button class="btn" data-c="tags" style="width:100%;margin-top:6px">COPY TAGS</button>
 <h4>PINNED COMMENT (3 OPTIONS)</h4>${O.pinned.map((t,i)=>`<div class="it"><b>${esc(t)}</b><button data-c="p${i}">COPY</button></div>`).join('')}
 ${O.shorts?`<h4>SHORTS (THE 9:16 VERSION)</h4><div class="it"><b>${esc(O.shorts.title)}</b><button data-c="sT">COPY TITLE</button></div><div class="it"><b style="white-space:pre-wrap">${esc(O.shorts.desc)}</b><button data-c="sD">COPY</button></div>`:''}
 <h4>BEFORE YOU UPLOAD</h4>${O.tips.map(t=>`<div class="it"><b>${esc(t)}</b></div>`).join('')}
 <div class="two" style="margin-top:10px"><button class="btn" id="myA">COPY EVERYTHING</button><button class="btn" id="myX">DOWNLOAD .TXT</button></div><div class="msg" id="myMsg"></div>`;
 el.querySelectorAll('[name=mym]').forEach(r=>r.onchange=()=>{ST.yt.mode=r.value;save();ytRender()});const w=el.querySelector('#myW');if(w)w.onchange=()=>{ST.yt.when=w.value.trim();save();ytRender()};
 el.querySelector('#myM').onclick=()=>{ST.yt.v=(ST.yt.v||0)+1;save();ytRender()};
 const val=k=>/^t\d+$/.test(k)?O.titles[+k.slice(1)].t:k==='desc'?el.querySelector('#myD').value:k==='tags'?el.querySelector('#myT').value:/^p\d$/.test(k)?O.pinned[+k.slice(1)]:k==='sT'?O.shorts.title:O.shorts.desc;
 el.querySelectorAll('[data-c]').forEach(x=>x.onclick=async()=>{el.querySelector('#myMsg').textContent=(await cpy(val(x.dataset.c)))?'Copied.':'Copy failed. Select the text and copy it by hand.'});
 const all=()=>'TITLES\n'+O.titles.map((t,i)=>(i+1)+'. '+t.t).join('\n')+'\n\nDESCRIPTION\n'+el.querySelector('#myD').value+'\n\nTAGS\n'+el.querySelector('#myT').value+'\n\nPINNED COMMENT\n'+O.pinned[0]+(O.shorts?'\n\nSHORTS\n'+O.shorts.title+'\n'+O.shorts.desc:'');
 el.querySelector('#myA').onclick=async()=>{el.querySelector('#myMsg').textContent=(await cpy(all()))?'Everything copied.':'Copy failed.'};el.querySelector('#myX').onclick=()=>dlf(new Blob([all()],{type:'text/plain'}),((ST.tape.on?ST.tape.title:S&&S.title)||'beat')+' - MPC YouTube package.txt')}
/* ---------- package generator ---------- */
let GEN=[],GENOPEN=-1;
function genInfo(){const G=window.MZMpcGen,T=ST.tape;if(T.on){if(!TP)return null;const mins=Math.max(1,Math.round(TP.total/60));return{tape:true,TP,N:TP.tracks.length,mins,title:TP.title,link:'https://mzprd.com',seedBase:TP.title.length*3+TP.tracks.length}}
 const b=beats.find(x=>String(x.id)===String(ST.beat));if(!b||!S)return null;const mins=Math.max(1,Math.round((S.dur||60)/60));return{beat:b,S,title:b.title,bpm:Number(b.bpm)||0,key:b.musical_key||'',mins,link:'https://mzprd.com/beat/'+(b.slug||b.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''))+'/',seedBase:String(b.id).length*17+b.title.length}}
function genRenderNow(){const el=$q('#mGN');if(!el)return;const G=window.MZMpcGen;if(!G)return;const g=ST.gen,info=genInfo();
 const opts=Object.entries(G.ANGLES).map(([k,v])=>`<option value="${k}"${g.angle===k?' selected':''}>${v.n} only</option>`).join('');
 const view=GEN.filter(p=>g.show==='fav'?g.fav.includes(p.title):true).slice().sort((a,b)=>g.sort==='order'?0:b.score-a.score);
 el.innerHTML=`<div class="msg">Makes many complete packages at once: title, thumbnail words, description (with the link in the first line), tags, pinned comment and Shorts text. Each one is scored and tells you why. Pick 3 and test them with "Test &amp; Compare" in YouTube Studio: it picks the winner by watch time.</div>
 <div class="two"><div><label>HOW MANY</label><select id="mGc">${[10,25,50,100,200].map(n=>`<option value="${n}"${g.n===n?' selected':''}>${n} packages</option>`).join('')}</select></div><div><label>STYLE</label><select id="mGa"><option value="">All styles mixed</option>${opts}</select></div></div>
 <div class="two"><button class="btn big" id="mGgo">GENERATE</button><button class="btn" id="mGmore">GENERATE A NEW BATCH</button></div>
 <div class="two"><label class="chk"><input type="radio" name="mgs" value="score"${g.sort!=='order'?' checked':''}> BEST SCORE FIRST</label><label class="chk"><input type="radio" name="mgs" value="order"${g.sort==='order'?' checked':''}> MIXED ORDER</label></div>
 <div class="two"><label class="chk"><input type="radio" name="mgf" value="all"${g.show!=='fav'?' checked':''}> ALL (${GEN.length})</label><label class="chk"><input type="radio" name="mgf" value="fav"${g.show==='fav'?' checked':''}> MY PICKS (${g.fav.length})</label></div>
 <div id="mGl">${view.length?view.map((p,i)=>`<div class="it" data-i="${GEN.indexOf(p)}" style="align-items:flex-start;flex-wrap:wrap"><button data-fav="${GEN.indexOf(p)}" title="Keep this one" style="font-size:14px;padding:4px 8px;${g.fav.includes(p.title)?'color:var(--gold);border-color:var(--gold)':''}">${g.fav.includes(p.title)?'&#9733;':'&#9734;'}</button><b style="min-width:160px">${esc(p.title)}<br><small style="color:#8e8e94">${p.angleName} / ${p.title.length} chars / thumbnail: <span style="color:#fff">${esc(p.thumb)}</span></small></b><span style="font:700 12px Montserrat;color:${p.score>=85?'#7ad47a':p.score>=70?'#e8b94a':'#ff9a5c'}">${p.score}</span><button data-ct="${GEN.indexOf(p)}">COPY TITLE</button><button data-co="${GEN.indexOf(p)}">${GENOPEN===GEN.indexOf(p)?'CLOSE':'OPEN PACKAGE'}</button>${GENOPEN===GEN.indexOf(p)?`<div style="flex-basis:100%;margin-top:8px"><div class="msg" style="margin:0 0 6px">${esc(p.why)}</div><label>DESCRIPTION</label><textarea rows="12" id="mGd" style="font:500 12px/1.5 monospace">${esc(p.desc)}</textarea><div class="two" style="margin-top:6px"><button class="btn" data-cd="${GEN.indexOf(p)}">COPY DESCRIPTION</button><button class="btn" data-ca="${GEN.indexOf(p)}">COPY WHOLE PACKAGE</button></div><label>TAGS</label><textarea rows="2" style="font:500 12px/1.5 monospace">${esc(p.tags)}</textarea><button class="btn" data-cg="${GEN.indexOf(p)}" style="width:100%;margin-top:4px">COPY TAGS</button><label>PINNED COMMENT</label><div class="msg" style="color:#d9d9dc;margin-top:0">${esc(p.pin)}</div><button class="btn" data-cp="${GEN.indexOf(p)}" style="width:100%;margin-top:4px">COPY PINNED COMMENT</button>${p.shorts?`<label>SHORTS</label><div class="msg" style="color:#d9d9dc;margin-top:0">${esc(p.shorts.title)}</div>`:''}</div>`:''}</div>`).join(''):`<div class="msg">${GEN.length?'No picks yet. Tap the star on the ones you like.':info?'Press GENERATE.':(ST.tape.on?'Build the tape first.':'Pick a beat first.')}</div>`}</div>
 <div class="two" style="margin-top:8px"><button class="btn" id="mGtxt">DOWNLOAD ALL AS .TXT</button><button class="btn" id="mGfav">COPY MY PICKS (TITLES)</button></div><div class="msg" id="mGmsg"></div>`;
 const all=p=>p.title+'\n\nTHUMBNAIL TEXT: '+p.thumb+'\n\nDESCRIPTION\n'+p.desc+'\n\nTAGS\n'+p.tags+'\n\nPINNED COMMENT\n'+p.pin+(p.shorts?'\n\nSHORTS\n'+p.shorts.title+'\n'+p.shorts.desc:'');
 const say=t=>{$q('#mGmsg').textContent=t};
 const run=more=>{const inf=genInfo();if(!inf){say(ST.tape.on?'Build the tape first (section 3).':'Pick a beat first.');return}g.seed=more?(g.seed||1)+1:(g.seed||1);const t0=performance.now();GEN=window.MZMpcGen.generate(ST,inf,g.n,g.seed,g.angle?[g.angle]:null,window.MZMpcYT);GENOPEN=-1;save();genRender();say(GEN.length+' packages made in '+Math.round(performance.now()-t0)+' ms. Best score: '+(GEN.length?Math.max(...GEN.map(p=>p.score)):0)+'.')};
 $q('#mGgo').onclick=()=>run(false);$q('#mGmore').onclick=()=>run(true);$q('#mGc').onchange=e=>{g.n=+e.target.value;save()};$q('#mGa').onchange=e=>{g.angle=e.target.value;save()};
 el.querySelectorAll('[name=mgs]').forEach(r=>r.onchange=()=>{g.sort=r.value;save();genRender()});el.querySelectorAll('[name=mgf]').forEach(r=>r.onchange=()=>{g.show=r.value;save();genRender()});
 el.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{const t=GEN[+b.dataset.fav].title,i=g.fav.indexOf(t);if(i>=0)g.fav.splice(i,1);else g.fav.push(t);save();genRender()});
 el.querySelectorAll('[data-ct]').forEach(b=>b.onclick=async()=>say((await cpy(GEN[+b.dataset.ct].title))?'Title copied.':'Copy failed.'));
 el.querySelectorAll('[data-co]').forEach(b=>b.onclick=()=>{const i=+b.dataset.co;GENOPEN=GENOPEN===i?-1:i;genRender()});
 el.querySelectorAll('[data-cd]').forEach(b=>b.onclick=async()=>say((await cpy($q('#mGd').value))?'Description copied.':'Copy failed.'));
 el.querySelectorAll('[data-ca]').forEach(b=>b.onclick=async()=>say((await cpy(all(GEN[+b.dataset.ca])))?'Whole package copied.':'Copy failed.'));
 el.querySelectorAll('[data-cg]').forEach(b=>b.onclick=async()=>say((await cpy(GEN[+b.dataset.cg].tags))?'Tags copied.':'Copy failed.'));
 el.querySelectorAll('[data-cp]').forEach(b=>b.onclick=async()=>say((await cpy(GEN[+b.dataset.cp].pin))?'Pinned comment copied.':'Copy failed.'));
 $q('#mGtxt').onclick=()=>{if(!GEN.length){say('Generate some first.');return}dlf(new Blob([GEN.map((p,i)=>'=== PACKAGE '+(i+1)+' (score '+p.score+', '+p.angleName+') ===\n'+all(p)).join('\n\n')],{type:'text/plain'}),((ST.tape.on?ST.tape.title:S&&S.title)||'beat')+' - '+GEN.length+' YouTube packages.txt')};
 $q('#mGfav').onclick=async()=>say(g.fav.length?((await cpy(g.fav.join('\n')))?'Your picks were copied.':'Copy failed.'):'Tap the star on some titles first.')}
let thTok=0;
const PNL={yt:['#mYTd',()=>ytRenderNow()],th:['#mTHd',()=>thRenderNow()],gen:['#mGnd',()=>genRenderNow()]},dirty={yt:1,th:1,gen:1};
let YTP=null;
function ensureYT(){if(window.MZMpcYT&&window.MZMpcGen&&STUDIO!==null)return Promise.resolve();return YTP=YTP||(async()=>{await loadS('mpcyt.js?v=11');await loadS('mpcgen.js?v=4');await ensureStudio()})()}
function paintPanels(){for(const k in PNL){const d=root&&$q(PNL[k][0]);if(d&&d.open&&dirty[k]){dirty[k]=0;ensureYT().then(()=>{try{PNL[k][1]()}catch(e){console.warn(e)}})}}}
const mark=(...ks)=>{ks.forEach(k=>dirty[k]=1);paintPanels()};
function ytRender(){mark('yt')}function thRender(){mark('th')}function genRender(){mark('gen')}
function thRenderNow(){const el=$q('#mTH');if(!el||!YT())return;const b=ST.tape.on?{title:ST.tape.title}:beats.find(x=>String(x.id)===String(ST.beat));if(!b){el.innerHTML='<div class="msg">Pick a beat first.</div>';return}
 const T=ST.th,v=T.fmt==='v',W=v?1080:1280,H=v?1920:720,PALS=YT().PAL;
 el.innerHTML=`<div class="two"><div><label>FORMAT</label><select id="mThF"><option value="h"${v?'':' selected'}>16:9 THUMBNAILS (1280x720)</option><option value="v"${v?' selected':''}>9:16 SHORTS COVERS (1080x1920)</option></select></div><div><label>BACKGROUND</label><select id="mThD"><option value=""${T.bgm===''||T.bgm==null?' selected':''}>Mostly the desk</option><option value="desk"${T.bgm==='desk'?' selected':''}>Only the desk</option><option value="color"${T.bgm==='color'?' selected':''}>Only color backgrounds</option></select></div><div><label>HAND ON THE PADS</label><select id="mThH"><option value=""${T.hands===''||T.hands==null?' selected':''}>Some with, some without</option><option value="yes"${T.hands==='yes'?' selected':''}>Always a hand</option><option value="no"${T.hands==='no'?' selected':''}>Never (clean machine)</option></select></div><div><label>COLOR (COLOR BACKGROUNDS)</label><select id="mThP"><option value="">Mixed</option>${PALS.map((p,i)=>`<option value="${i}"${String(T.pal)===String(i)?' selected':''}>${p.n}</option>`).join('')}</select></div></div>
 <div class="two" style="margin-top:8px"><button class="btn" id="mThN">NEW SET OF 12</button><button class="btn" id="mThA">DOWNLOAD ALL 12</button></div>
 <div class="msg">Text on the picture stays at 5 words or fewer so it reads on a phone: the artist, TYPE BEAT and the beat name. Click a thumbnail to download it.</div>
 <div id="mThG" style="display:grid;grid-template-columns:repeat(${v?4:2},1fr);gap:8px"></div>`;
 const g=el.querySelector('#mThG'),X=ST.tape.on?{title:ST.tape.title,big:'BEAT TAPE',extra:(TP?TP.tracks.length:ST.tape.ids.length)+' BEATS',bpm:0,key:'',artist:ST.artist}:{title:b.title,bpm:Number(b.bpm)||0,key:b.musical_key||'',artist:ST.artist},tok=++thTok;
 const fonts=document.fonts?Promise.all(["40px Anton","600 30px Oswald","30px VT323"].map(f=>document.fonts.load(f).catch(()=>{}))):Promise.resolve();
 const opt=i=>({pal:T.pal===''?null:+T.pal,desk:T.bgm==='desk'?true:T.bgm==='color'?false:null,hands:T.hands==='yes'?true:T.hands==='no'?false:null}),fname=i=>(b.title||'beat').replace(/[^\w -]+/g,'')+' - MPC thumb '+(i+1)+(v?' 9x16':'')+'.jpg';
 /* previews are drawn at half size (a quarter of the work); the full size picture is only drawn when you download it */
 const full=i=>new Promise(res=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;YT().make(cv.getContext('2d'),W,H,T.seed*100+i+1,X,opt(i));cv.toBlob(res,'image/jpeg',.92)});
 const dl=async i=>dlf(await full(i),fname(i));
 fonts.then(()=>{if(tok!==thTok)return;let i=0;const step=()=>{if(tok!==thTok)return;for(let n=0;n<2&&i<12;n++,i++){const k=i,seed=T.seed*100+k+1,cv=document.createElement('canvas');cv.width=Math.round(W/2);cv.height=Math.round(H/2);cv.style.cssText='width:100%;display:block;cursor:pointer;border:1px solid #2a2a2e';const x=cv.getContext('2d');x.scale(.5,.5);const info=YT().make(x,W,H,seed,X,opt(k));
   const wrap=document.createElement('div');wrap.appendChild(cv);const cap=document.createElement('div');cap.className='msg';cap.style.margin='2px 0 0';cap.textContent=info.pal+' / '+info.bg+' / '+info.text;wrap.appendChild(cap);g.appendChild(wrap);cv.onclick=()=>dl(k)}
   if(i<12)requestAnimationFrame(step)};step();
  el.querySelector('#mThA').onclick=async()=>{for(let k=0;k<12;k++){await dl(k);await new Promise(r=>setTimeout(r,500))}}});
 el.querySelector('#mThF').onchange=e=>{T.fmt=e.target.value;save();thRender()};el.querySelector('#mThH').onchange=e=>{T.hands=e.target.value;save();thRender()};el.querySelector('#mThD').onchange=e=>{T.bgm=e.target.value;save();thRender()};el.querySelector('#mThP').onchange=e=>{T.pal=e.target.value;save();thRender()};el.querySelector('#mThN').onclick=()=>{T.seed++;save();thRender()}}

const SUM={scene:()=>(ST.scene==='white'?'White studio':'Desk / '+((SKINS.find(k=>k[0]===(ST.skin||'orig'))||[0,'Original'])[1]).replace(/^The /,''))+(ST.res==='4k'?' / 4K':''),
 cam:()=>{const t=[];if(ST.lamp!=null&&+ST.lamp!==2)t.push('lamp '+['steady','gentle','real','dramatic'][ST.lamp]);const m=ST.cam||{};if(m.dof&&m.dof!=='0')t.push('DOF '+(m.dof==='2'?'strong':'soft'));if(m.rack)t.push('focus pull');if(m.grade&&m.grade!=='0')t.push({warm:'warm film',teal:'teal+orange',cold:'cold',faded:'faded 90s'}[m.grade]);return t.join(' / ')||'lamp real'},
 extras:()=>{const t=[];if(ST.intro)t.push('intro');if(ST.hands&&ST.hands.on)t.push('hands');if(ST.smoke&&ST.smoke.on)t.push('smoke');return t.join(' / ')||'none'},
 hits:()=>['clear hits','balanced','every hit'][ST.sens==null?1:ST.sens]+((ST.nudge||0)?' / '+ST.nudge+' ms':''),
 watch:()=>{const E=ST.eng,t=[];if(E.hook)t.push('hook');if(E.sub)t.push('subscribe');if(E.loop)t.push('loop');if(E.note)t.push('note');if(E.q)t.push('question');return t.join(' / ')||'none'},
 beat:()=>{const b=beats.find(x=>String(x.id)===String(ST.beat));return b?b.title:'pick a beat'}};
function summ(){if(!root)return;const sb=root.querySelector('#s_s2b');if(sb)sb.textContent=(ST.s2b&&ST.s2b.on)?(ST.s2b.last?ST.s2b.last.chops+' chops / '+ST.s2b.last.bpm+' BPM':'ON'):'optional series: chop a sample';for(const k in SUM){const e=root.querySelector('#s_'+k);if(e)e.textContent=SUM[k]()}const t=root.querySelector('#s_tape');if(t)t.textContent=ST.tape.on?(ST.tape.ids.length+' beats / ON'):'several beats in one video'}
function wire(){const sel=$q('#mBeat');sel.innerHTML='<option value="">Choose a beat...</option>'+beats.map(b=>`<option value="${esc(b.id)}">${esc(b.title)}${b.bpm?' ('+b.bpm+' BPM)':''}</option>`).join('');if(ST.beat)sel.value=String(ST.beat);
 $q('#mArt').value=ST.artist;$q('#mLcd').value=ST.lcd;$q('#mTxt').checked=!!ST.text;$q('#mLen').value=String(ST.len);
 sel.onchange=()=>{if(sel.value)pick(sel.value)};$q('#mArt').onchange=e=>{ST.artist=e.target.value.trim();save();mark('yt','th','gen')};for(const k in PNL){$q(PNL[k][0]).addEventListener('toggle',paintPanels)}
 $q('#mLcd').oninput=e=>{ST.lcd=e.target.value;if(S){S.lcd=ST.lcd.trim();drawNow()}save()};$q('#mRes').value=ST.res||'1080';$q('#mRes').onchange=e=>{ST.res=e.target.value;save()};$q('#mSkin').value=ST.skin||'orig';$q('#mSkin').onchange=async e=>{ST.skin=e.target.value;await ensureScene(ST.fmt);save();drawNow()};
 const CM=ST.cam;$q('#mDof').value=CM.dof;$q('#mRack').checked=!!CM.rack;$q('#mGrade').value=CM.grade;
 $q('#mDof').onchange=e=>{CM.dof=e.target.value;save();drawNow()};$q('#mRack').onchange=e=>{CM.rack=e.target.checked;save();drawNow()};$q('#mGrade').onchange=e=>{CM.grade=e.target.value;save();drawNow()};
 $q('#mIntro').checked=!!ST.intro;$q('#mIntro').onchange=e=>{ST.intro=e.target.checked;save();stopPlay();if(S&&S.buf){S.tl=tlOne(S);dropV()}if(TP){TP=null;$q('#mTpMsg').textContent='The intro changed. Press BUILD THE TAPE again.';mark('yt','th','gen')}drawNow()};
 const CN=ST.can;$q('#mCan').value=String(CN.id);const canUi=()=>{$q('#mCanSet').style.display=(CN.id==='orig'||CN.id==='none')?'none':'block';$q('#mCanSv').textContent=CN.size;$q('#mCanRv').textContent=CN.rot};
 $q('#mCanS').value=String(CN.size);$q('#mCanR').value=String(CN.rot);$q('#mCanX').value=String(CN.x);$q('#mCanY').value=String(CN.y);canUi();
 $q('#mCan').onchange=async e=>{CN.id=e.target.value;canUi();await ensureScene(ST.fmt);save();drawNow()};
 [['#mCanS','size'],['#mCanR','rot'],['#mCanX','x'],['#mCanY','y']].forEach(([id,k])=>$q(id).oninput=e=>{CN[k]=+e.target.value;canUi();save();drawNow()});
 $q('#mCanReset').onclick=()=>{Object.assign(CN,{size:100,rot:0,x:0,y:0});$q('#mCanS').value='100';$q('#mCanR').value='0';$q('#mCanX').value='0';$q('#mCanY').value='0';canUi();save();drawNow()};
 $q('#mLamp').value=String(ST.lamp==null?2:ST.lamp);$q('#mLamp').onchange=e=>{ST.lamp=+e.target.value;save();drawNow()};$q('#mHands').checked=!!ST.hands.on;$q('#mHands').onchange=e=>{ST.hands.on=e.target.checked;save();drawNow()};$q('#mSmoke').checked=!!ST.smoke.on;$q('#mSmokeAmt').value=String(ST.smoke.amt||1);$q('#mSmoke').onchange=e=>{ST.smoke.on=e.target.checked;save();drawNow()};$q('#mSmokeAmt').onchange=e=>{ST.smoke.amt=+e.target.value;save();drawNow()};$q('#mScene').value=ST.scene||'desk';$q('#mScene').onchange=async e=>{ST.scene=e.target.value;await ensureScene(ST.fmt);save();drawNow()};$q('#mTxt').onchange=e=>{ST.text=e.target.checked;save();drawNow()};
 $q('#mKit').onchange=e=>{if(!ST.beat)return;ST.kits=ST.kits||{};if(e.target.value==='')delete ST.kits[ST.beat];else ST.kits[ST.beat]=+e.target.value;save();if(S&&S.raw){applyKit();if(TP)TP=null;drawNow()}};
 $q('#mLen').onchange=e=>{ST.len=+e.target.value;save();if(ST.beat)pick(ST.beat)};
 $q('#mFh').onclick=async()=>{ST.fmt='h';save();await ensureScene('h');size();drawNow()};$q('#mFv').onclick=async()=>{ST.fmt='v';save();await ensureScene('v');size();drawNow()};
 $q('#mPlay').onclick=play;$q('#mScrub').oninput=()=>{if(PV.playing)stopPlay();drawNow()};
 const T=ST.tape;$q('#mSens').value=String(ST.sens==null?1:ST.sens);$q('#mNudge').value=String(ST.nudge||0);$q('#mNudgeV').textContent=String(ST.nudge||0);const relay=()=>{save();for(const id in CACHE){}if(S&&S.raw){applyKit();S._hh=null;if(S.tl){S.tl._v=null;S.tl._h=null;S.tl._c=null}}if(TP){TP.tracks.forEach(t=>{const L=layout(t.S.raw,t.S.kit);t.S.hits=L.hits;t.S.per=L.per;t.S._hh=null});TP._v=null;TP._h=null;TP._c=null}drawNow()};$q('#mSens').onchange=e=>{ST.sens=+e.target.value;relay()};$q('#mNudge').oninput=e=>{ST.nudge=+e.target.value;$q('#mNudgeV').textContent=String(ST.nudge);relay()};$q('#mTpOn').checked=!!T.on;$q('#mTpT').value=T.title;$q('#mTpL').value=String(T.len);$q('#mTpX').value=String(T.xf);$q('#mTpBox').style.display=T.on?'block':'none';tpList();
 const mountS2B=async()=>{if(mountS2B.done)return;mountS2B.done=1;try{await loadS('mpcsample.js?v=10');window.__s2b=MZMpcSample.mount($q('#mS2B'),{ST,save:()=>{save();summ()},esc,ctx:ctxA,loadS,cpy,dlf,ensureScene:()=>ensureScene(ST.fmt),setEp:x=>{EP=x;if(ST.s2b)ST.s2b.useEp=!!x;stopPlay();dropV();if(x){const cv=$q('#mScrub');if(cv)cv.value='0'}drawNow();summ()},hasEp:()=>!!EP});summ()}catch(e){mountS2B.done=0;$q('#mS2B').innerHTML='<div class="msg">The sample chopper did not load. Refresh the page.</div>'}};
 root.querySelectorAll('details.grp').forEach(d=>{d.open=!!ST.open[d.id];if(d.id==='g_s2b'){d.addEventListener('toggle',()=>{if(d.open)mountS2B()});if(d.open)mountS2B()}d.addEventListener('toggle',()=>{ST.open[d.id]=d.open?1:0;save()})});$q('#mOpenAll').onclick=()=>root.querySelectorAll('details.grp').forEach(d=>d.open=true);$q('#mCloseAll').onclick=()=>root.querySelectorAll('details.grp').forEach(d=>d.open=false);
 $q('#mRight').addEventListener('change',()=>setTimeout(summ,0));$q('#mRight').addEventListener('input',()=>setTimeout(summ,0));summ();
 $q('#mTpOn').onchange=e=>{T.on=e.target.checked;save();$q('#mTpBox').style.display=T.on?'block':'none';stopPlay();ytRender();thRender();drawNow()};
 $q('#mTpT').onchange=e=>{T.title=e.target.value.trim()||'MZPRD BEAT TAPE';if(TP){TP.title=T.title;TP.mix=null}save();ytRender();thRender();drawNow()};
 $q('#mTpL').onchange=e=>{T.len=+e.target.value;tpDirty()};$q('#mTpX').onchange=e=>{T.xf=+e.target.value;tpDirty()};
 $q('#mTpAdd').onclick=()=>{const v=$q('#mTpA').value;if(!v)return;T.ids.push(v);tpDirty()};$q('#mTpBuild').onclick=buildTape;
 const En=ST.eng;$q('#mEhk').checked=!!En.hook;$q('#mEhkT').value=En.hookText;$q('#mEsub').checked=!!En.sub;$q('#mEloop').checked=!!En.loop;$q('#mEnote').checked=!!En.note;$q('#mEnoteT').value=En.noteText;$q('#mEq').checked=!!En.q;$q('#mEqT').value=En.qText;
 const eng=(id,k,box)=>{$q(id).onchange=e=>{En[k]=box?e.target.checked:e.target.value;if(k==='sub'||k==='loop'){dropV();stopPlay()}save();drawNow()};if(!box)$q(id).oninput=e=>{En[k]=e.target.value;drawNow()}};
 eng('#mEhk','hook',1);eng('#mEhkT','hookText');eng('#mEsub','sub',1);eng('#mEloop','loop',1);eng('#mEnote','note',1);eng('#mEnoteT','noteText');eng('#mEq','q',1);eng('#mEqT','qText');
 $q('#mRcu').onclick=()=>render(['c']);$q('#mRlp').onclick=renderLoop;
 const lpShow=()=>{const o=$q('#mLpOut'),P=loopPack();if(!P||!ST.beat){o.innerHTML='';return}o.innerHTML='<h4>LOOP VIDEO TITLES AND DESCRIPTION</h4>'+P.titles.map((t,i)=>'<div class="it"><b>'+esc(t)+'</b><button data-lt="'+i+'">COPY</button></div>').join('')+'<button class="btn" id="mLpD" style="width:100%;margin-top:6px">COPY DESCRIPTION</button>';o.querySelectorAll('[data-lt]').forEach(b=>b.onclick=async()=>{b.textContent=(await cpy(P.titles[+b.dataset.lt]))?'COPIED':'FAILED'});$q('#mLpD').onclick=async e=>{e.target.textContent=(await cpy(P.desc))?'COPIED':'FAILED'}};
 $q('#mLpM').onchange=lpShow;window.__lpShow=lpShow;
 $q('#mRh').onclick=()=>render(['h']);$q('#mRv').onclick=()=>render(['v']);$q('#mRb').onclick=()=>render(['h','v'])}
window.mpcOpen=async function(){css();root=document.getElementById('mpcmk');root.classList.add('on');
 if(!mounted){root.innerHTML='<div class="pn"><div class="msg">Loading the MPC...</div></div>';
  try{await loadS('mpcdetect.js?v=10');if(!document.querySelector('link[data-mpc]')){await new Promise(res=>{const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_LINK;l.dataset.mpc='1';l.onload=res;l.onerror=res;document.head.appendChild(l);setTimeout(res,5000)})}
   await Promise.all(["40px Anton","600 40px Oswald","30px VT323","700 40px Caveat","40px Reenie Beanie"].map(f=>document.fonts.load(f).catch(()=>{})));prepHands(await loadImg('mpc/hand_r.webp'),await loadImg('mpc/hand_l.webp'))}
  catch(e){root.innerHTML='<div class="pn"><div class="msg">The MPC did not load. Refresh the page.</div></div>';return}
  try{const {data}=await sb.from('beats').select('id,title,bpm,musical_key,preview_path,slug,tags').order('sort_order',{ascending:true}).order('created_at',{ascending:false});beats=(data||[]).filter(b=>b.preview_path)}catch(e){beats=[]}
  ST=load();if(!ST.th)ST.th={seed:1,pal:'',fmt:'h'};if(!ST.yt.v)ST.yt.v=0;if(!ST.tape)ST.tape=defaults().tape;if(!ST.eng)ST.eng=defaults().eng;if(!ST.smoke)ST.smoke=defaults().smoke;if(!ST.hands)ST.hands=defaults().hands;if(!ST.gen)ST.gen=defaults().gen;if(!ST.can)ST.can=defaults().can;if(!ST.cam)ST.cam=defaults().cam;if(!ST.open)ST.open={g_beat:1};S=null;root.innerHTML=html();wire();await ensureScene(ST.fmt);size();mounted=true;drawNow();if(ST.beat&&beats.some(b=>String(b.id)===String(ST.beat)))pick(ST.beat)}
};
window.mpcClose=function(){if(root)root.classList.remove('on');stopPlay()};
window.__mpc={lamp:T=>lampLevel(T),hand:(Sx,key,T)=>handAt(handHits(Sx,DK)[key],T,DK,key),xf:XF,st:()=>ST,s:()=>S,tp:()=>TP,x:X,frame,analyze,PH,pv:()=>PV,buildTape};window.MZMpc={machine,PH,fitFont,mmss,clamp,img:()=>IMG,cut:()=>CUT,bg:k=>DESKBG[k],warm:()=>WARM,handsReady:()=>!!HANDS,hand:(c,key,padIdx,hover,lampPos)=>{if(!HANDS)return;const p=padC(PH,padIdx);drawOneHand(c,PH,key,{x:p[0],y:p[1],hover},true,0,lampPos)}};
})();
