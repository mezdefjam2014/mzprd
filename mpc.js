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
Object.assign(DK.btn,{power:[1345,195,30,19],soft1:[1271,570,36,16],soft2:[1318,570,38,16],soft3:[1371,570,35,16],soft4:[1418,570,38,16],sounds:[1418,615,38,16],enter:[1190,705,39,15],k0:[1092,704,37,16],kdot:[1141,704,38,16],k1:[1095,659,34,16],k2:[1140,659,39,16],k3:[1190,660,39,15],k4:[1091,615,38,16],k5:[1140,615,39,16],k6:[1190,616,39,15],k7:[1096,570,33,16],k8:[1140,570,39,16],k9:[1190,571,39,15]});
Object.assign(DKV.btn,{power:[790,598,26,16],soft1:[759,936,34,16],soft2:[803,936,34,16],soft3:[847,936,35,16],soft4:[892,936,35,16],sounds:[892,977,35,16],enter:[688,1061,34,15],k0:[599,1061,34,15],kdot:[643,1060,35,16],k1:[599,1019,34,15],k2:[643,1018,35,16],k3:[688,1018,34,16],k4:[599,977,34,16],k5:[643,977,35,15],k6:[688,977,34,15],k7:[599,935,34,16],k8:[643,935,35,16],k9:[688,935,34,16]});
DK.wheel=[1160,822,35];DKV.wheel=[660,1170,31];
/* the SAMPLE PACKS scene (2000 x 1131): an MPD218 pad controller (12 pads, 3 rows) and a Technics SL-1200 turntable with a spinning record */
const DKP={id:'packh',W:2000,H:1131,u:1.32,sampled:true,glow:false,rows:3,lamp:DK.lamp,bulb:DK.bulb,cone:DK.cone,pad:{x0:596,y0:505,w:74,h:76,px:91.6,py:100.5},lcd:{x:612,y:389,w:219,h:84},
 btn:{power:[507,414,36,21],start:[1046,838,98,68],end:[1046,838,98,68],stop:[495,734,44,25],play:[494,790,44,25]},vol:[905,407,21],deck:{cx:1400,cy:558,r:344,lab:92,strobe:[1100,735]},arm:{x:1700,y:350,pv:[1800,363],tip:[1743,753]},boot:['AKAI MPD218','12 PADS  V1.0'],powLab:'rgba(225,222,212,.82)'};
/* 9:16 shows the pad controller (a crop of the same photo) */
const PX=430,DKPV={id:'packv',W:636,H:1131,u:1.32,sampled:true,glow:false,rows:3,lamp:[DK.lamp[0]-PX,DK.lamp[1],DK.lamp[2]],bulb:[DK.bulb[0]-PX,DK.bulb[1]],cone:{apex:[DK.cone.apex[0]-PX,DK.cone.apex[1]],a0:DK.cone.a0,a1:DK.cone.a1,len:DK.cone.len},
 pad:{x0:596-PX,y0:505,w:74,h:76,px:91.6,py:100.5},lcd:{x:612-PX,y:389,w:219,h:84},btn:{power:[507-PX,414,36,21],start:[494-PX,790,44,25],end:[495-PX,734,44,25]},vol:[905-PX,407,21],deck:{cx:1400-PX,cy:558,r:344,lab:92},boot:DKP.boot,powLab:DKP.powLab};
const GEO={deskh:DK,deskv:DKV,packh:DKP,packv:DKPV};
const PSKINS=[['0','Black (the original)'],['1','Cherry blossom'],['2','8-bit blue'],['3','Street fighter'],['4','Collage (good music)'],['5','Gold 8-bit']];
const PSK={},TSKINS=[['0','Black (the original)'],['1','Fortnite'],['2','50 Cent'],['3','Kanye portrait'],['4','Gucci monogram'],['5','Resident Evil'],['6','Sonic'],['7','Late Registration'],['8','Christmas'],['9','Mortal Kombat'],['10','Pepsi'],['11','Batman'],['12','Joker']];
/* each pad machine skin has its own screen (measured on its photo) and its own backlight colour */
const PLCD={'0':[620,395,206,73],'1':[622,390,208,80],'2':[616,397,210,76],'3':[622,412,188,73],'4':[616,393,210,76],'5':[612,396,222,78]};
const PEM={'0':{fg:'#a9ecff',bg:'rgba(40,110,140,.32)'},'1':{fg:'#c8f3ff',bg:'rgba(60,120,150,.3)'},'2':{fg:'#bfe9ff',bg:'rgba(40,100,160,.32)'},'3':{fg:'#ffd27a',bg:'rgba(150,95,30,.3)'},'4':{fg:'#eef6ff',bg:'rgba(90,105,130,.3)'},'5':{fg:'#ffd889',bg:'rgba(160,115,40,.3)'}};
function setPackLcd(k){const r=PLCD[k]||PLCD['0'];DKP.lcd={x:r[0],y:r[1],w:r[2],h:r[3]};DKPV.lcd={x:r[0]-PX,y:r[1],w:r[2],h:r[3]};DKP.emit=DKPV.emit=PEM[k]||PEM['0']}
/* a backlit screen: the screen is drawn off to the side, then laid on the photo's own glass as light (a soft backlight and glowing characters) */
let EMC=null;
function emitCtx(G){const k=3,L0=G.lcd,w=Math.ceil(L0.w*k),h=Math.ceil(L0.h*k);if(!EMC)EMC=document.createElement('canvas');if(EMC.width!==w||EMC.height!==h){EMC.width=w;EMC.height=h}const x=EMC.getContext('2d');x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-over';x.clearRect(0,0,w,h);x.setTransform(k,0,0,k,-L0.x*k,-L0.y*k);return{x,cv:EMC}}
function emitDraw(c,G,EM,lit){if(!(lit>.01))return;const L0=G.lcd,E=G.emit,x=EM.x,w=EM.cv.width,h=EM.cv.height;c.save();
 c.globalCompositeOperation='screen';c.globalAlpha=lit;c.fillStyle=E.bg;c.fillRect(L0.x,L0.y,L0.w,L0.h);
 const g=c.createRadialGradient(L0.x+L0.w/2,L0.y+L0.h/2,2,L0.x+L0.w/2,L0.y+L0.h/2,L0.w*.62);g.addColorStop(0,'rgba(255,255,255,.07)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(L0.x,L0.y,L0.w,L0.h);
 x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-in';x.fillStyle=E.fg;x.fillRect(0,0,w,h);x.globalCompositeOperation='source-over';
 c.globalCompositeOperation='lighter';c.shadowColor=E.fg;c.shadowBlur=5*(G.u||1);c.globalAlpha=.55*lit;c.drawImage(EM.cv,L0.x,L0.y,L0.w,L0.h);c.shadowBlur=0;c.globalAlpha=.85*lit;c.drawImage(EM.cv,L0.x,L0.y,L0.w,L0.h);c.restore()}
const packMode=()=>!!(ST&&ST.src==='packs');
/* the record's angle: it spins up when START is pressed and brakes to a stop at the end (33 1/3 RPM) */
const spinAt=(T,ts,te)=>{const w=3.4907,ru=.45,rd=1.1;let e=0;if(T>ts){const a=Math.min(T,te)-ts;e=a<ru?a*a/(2*ru):ru/2+(a-ru)}if(T>te&&te>ts){const b=Math.min(T-te,rd);e+=b-b*b/(2*rd)}return e*w};
/* the record: the strobe dots on the platter edge turn with it, the label (the pack name) turns, the spindle and the light on the vinyl stay put */
/* the vinyl, split once from the photo into: a plain record (the same all the way round, so it can turn), and the light on it (which stays still) */
const VYL=new Map(),OIDS=new WeakMap();let OIDN=0;const oid=o=>{if(!o)return 0;if(!OIDS.has(o))OIDS.set(o,++OIDN);return OIDS.get(o)};
function vinylOf(SRC,D,VR){const key=oid(SRC)+'|'+D.cx;if(VYL.has(key))return VYL.get(key);const n=2*VR,cv=document.createElement('canvas');cv.width=cv.height=n;const x=cv.getContext('2d');x.drawImage(SRC,D.cx-VR,D.cy-VR,n,n,0,0,n,n);
 const id=x.getImageData(0,0,n,n),d=id.data,sum=new Float64Array((VR+2)*4);for(let y=0;y<n;y++)for(let q=0;q<n;q++){const r=Math.round(Math.hypot(q-VR+.5,y-VR+.5));if(r>VR)continue;const i=(y*n+q)*4;sum[r*4]+=d[i];sum[r*4+1]+=d[i+1];sum[r*4+2]+=d[i+2];sum[r*4+3]++}
 const A=x.createImageData(n,n),H=x.createImageData(n,n);for(let y=0;y<n;y++)for(let q=0;q<n;q++){const r=Math.round(Math.hypot(q-VR+.5,y-VR+.5)),i=(y*n+q)*4;if(r>VR)continue;const k=Math.max(1,sum[r*4+3]);for(let ch=0;ch<3;ch++){const av=sum[r*4+ch]/k;A.data[i+ch]=av;H.data[i+ch]=Math.max(0,d[i+ch]-av)}A.data[i+3]=255;H.data[i+3]=255}
 const mk=im=>{const z=document.createElement('canvas');z.width=z.height=n;z.getContext('2d').putImageData(im,0,0);return z};
 /* a few specks of dust and wear marks on the vinyl: they turn with it, so the eye sees it spinning */
 const sp=document.createElement('canvas');sp.width=sp.height=n;const y2=sp.getContext('2d');let a=hashStr('vinyl')||1;const rn=()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296};
 for(let i=0;i<70;i++){const r=D.lab+8+rn()*(VR-D.lab-14),t=rn()*6.2832,px=VR+Math.cos(t)*r,py=VR+Math.sin(t)*r;y2.fillStyle='rgba(235,225,205,'+(.08+rn()*.22).toFixed(3)+')';y2.beginPath();y2.arc(px,py,.6+rn()*1.3,0,6.2832);y2.fill()}
 for(let i=0;i<5;i++){const r=D.lab+20+rn()*(VR-D.lab-40),t0=rn()*6.2832;y2.strokeStyle='rgba(220,210,190,'+(.05+rn()*.06).toFixed(3)+')';y2.lineWidth=.8;y2.beginPath();y2.arc(VR,VR,r,t0,t0+.25+rn()*.5);y2.stroke()}
 const o={A:mk(A),H:mk(H),sp,VR};VYL.set(key,o);return o}
/* the tone arm (cut out of the photo) swings on its pivot: at rest it sits on its rest; during the boot it lifts and swings over the record,
   it drops onto the first groove as the record starts, creeps inward while it plays, and lifts back to its rest at the end */
let ARMA=null;
function armPlay(G){if(ARMA!=null)return ARMA;const A=G.arm,D=G.deck,rot=(p,a)=>{const dx=p[0]-A.pv[0],dy=p[1]-A.pv[1],c=Math.cos(a),s=Math.sin(a);return[A.pv[0]+dx*c-dy*s,A.pv[1]+dx*s+dy*c]},dist=a=>{const q=rot(A.tip,a);return Math.hypot(q[0]-D.cx,q[1]-D.cy)};
 const at=r=>{let lo=0,hi=.9;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(dist(m)>r)lo=m;else hi=m}return(lo+hi)/2};return ARMA={a0:at(D.r-40),a1:at(D.r-110)}}
function armAt(G,T,intro,t0,te){const P=armPlay(G);let a,l=0;const sw=(q)=>ease(clamp(q,0,1));
 if(intro>0&&T<t0){const q=sw((T-2.3)/1);a=P.a0*q;l=T<t0-.3?sw((T-2.1)/.25):1-sw((T-(t0-.3))/.3)}
 else if(T<=te+.1){a=P.a0+(P.a1-P.a0)*clamp((T-t0)/Math.max(1,te-t0),0,1);l=0}
 else{const q=(T-te-.1);l=q<.25?sw(q/.25):1-sw((q-1.15)/.3);a=(P.a0+(P.a1-P.a0))*(1-sw((q-.2)/1))}
 return{a,l}}
function drawArm(c,G,img,st){if(!img)return;const A=G.arm;c.save();c.translate(A.pv[0],A.pv[1]);c.rotate(st.a);c.translate(-A.pv[0],-A.pv[1]);
 c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=5+10*st.l;c.shadowOffsetX=4+10*st.l;c.shadowOffsetY=5+12*st.l;c.drawImage(img,A.x,A.y);c.restore()}
/* the record: only the vinyl turns (its label, specks and wear); the platter, its strobe dots, the spindle and the light on the vinyl stay put */
/* LEFT DESK ITEM (MPC desk, 16:9): swap the floppy for a CD (handwritten), a pager (green backlight, the beat name and MZPRD),
   a Nokia playing snake, or an iPad playing a little retro corridor shooter. The item photos are cut from the same desk shot. */
const PROPS=[['floppy','Floppy disk (the original)'],['cd','CD with handwriting'],['pager','Pager (green light, beat name)'],['nokia','Nokia playing snake'],['ipad','iPad playing a retro shooter']];
const PROPIMG={},PROPAT=[60,640];
/* each screen's 4 corners on the photo (top-left, top-right, bottom-right, bottom-left), measured on close-ups */
const PSQ={pager:[[217,884],[396,832],[401,876],[231,930]],nokia:[[265,882],[355,845],[380,904],[291,940]],ipad:[[157,817],[400,747],[498,1040],[237,1112]]};
async function loadProp(){const k=ST.prop||'floppy';if(k!=='floppy'&&!PROPIMG[k])PROPIMG[k]=await loadImg('mpc/prop_'+k+'.webp?v=2');if(k==='ipad'&&!PROPIMG.glass)PROPIMG.glass=await loadImg('mpc/prop_ipad_glass.webp?v=2')}
/* draw a picture onto a 4-corner screen (perspective-style: a fine mesh of triangles), clipped to the screen */
function quadPath(c,q){c.beginPath();q.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath()}
function warp(c,img,q,N){const W=img.width,H=img.height,P=(u,v)=>[(q[0][0]*(1-u)+q[1][0]*u)*(1-v)+(q[3][0]*(1-u)+q[2][0]*u)*v,(q[0][1]*(1-u)+q[1][1]*u)*(1-v)+(q[3][1]*(1-u)+q[2][1]*u)*v];
 const tri=(s0,s1,s2,d0,d1,d2)=>{c.save();const cx=(d0[0]+d1[0]+d2[0])/3,cy=(d0[1]+d1[1]+d2[1])/3,ex=p=>[p[0]+(p[0]-cx)*.04,p[1]+(p[1]-cy)*.04];const e0=ex(d0),e1=ex(d1),e2=ex(d2);c.beginPath();c.moveTo(e0[0],e0[1]);c.lineTo(e1[0],e1[1]);c.lineTo(e2[0],e2[1]);c.closePath();c.clip();
  const x1=s1[0]-s0[0],y1=s1[1]-s0[1],x2=s2[0]-s0[0],y2=s2[1]-s0[1],u1=d1[0]-d0[0],v1=d1[1]-d0[1],u2=d2[0]-d0[0],v2=d2[1]-d0[1],det=x1*y2-x2*y1;if(!det){c.restore();return}
  const A=(u1*y2-u2*y1)/det,B=(v1*y2-v2*y1)/det,C=(u2*x1-u1*x2)/det,D=(v2*x1-v1*x2)/det;c.transform(A,B,C,D,d0[0]-A*s0[0]-C*s0[1],d0[1]-B*s0[0]-D*s0[1]);const bx=Math.max(0,Math.floor(Math.min(s0[0],s1[0],s2[0]))-1),by=Math.max(0,Math.floor(Math.min(s0[1],s1[1],s2[1]))-1),bw=Math.min(W,Math.ceil(Math.max(s0[0],s1[0],s2[0]))+1)-bx,bh=Math.min(H,Math.ceil(Math.max(s0[1],s1[1],s2[1]))+1)-by;if(bw>0&&bh>0)c.drawImage(img,bx,by,bw,bh,bx,by,bw,bh);c.restore()};
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const u0=i/N,u1=(i+1)/N,v0=j/N,v1=(j+1)/N,a=P(u0,v0),b=P(u1,v0),cc=P(u1,v1),d=P(u0,v1),sa=[u0*W,v0*H],sb=[u1*W,v0*H],sc=[u1*W,v1*H],sd=[u0*W,v1*H];tri(sa,sb,sc,a,b,cc);tri(sa,sc,sd,a,cc,d)}}
const SCV={};const scv=(k,w,h)=>{let cv=SCV[k];if(!cv){cv=SCV[k]=document.createElement('canvas');cv.width=w;cv.height=h}const x=cv.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,w,h);x.imageSmoothingEnabled=false;return[cv,x]};
/* tiny 3x5 pixel font for the phone and pager LCDs */
const F35={'0':'7555 7','1':'2622 7','2':'7174 7','3':'7171 7','4':'5571 1','5':'7471 7','6':'7475 7','7':'7111 1','8':'7575 7','9':'7571 7',':':'0202 0',' ':'0000 0','-':'0070 0','.':'0000 2'};
function lcdText(x,str,px,py,sz){str=String(str).toUpperCase();let cx=px;for(const ch of str){const g=F35[ch];if(g){const rows=g.replace(' ','');for(let r=0;r<5;r++){const bits=parseInt(rows[r],10);for(let b=0;b<3;b++)if(bits&(4>>b))x.fillRect(cx+b*sz,py+r*sz,sz,sz)}cx+=4*sz}else{x.font=(7*sz)+'px VT323, monospace';x.textBaseline='top';x.fillText(ch,cx,py-sz);cx+=x.measureText(ch).width+sz*.5}}return cx}
/* Nokia 3310 Snake on loop: title, level 1 (open box), LEVEL 2 card, level 2 (a wall block in the middle, the snake circles it), game over, again */
function snakeScr(T){const[cv,x]=scv('nk',84,48);x.fillStyle='#fff';x.fillRect(0,0,84,48);x.fillStyle='#1b2412';x.font='8px monospace';x.textBaseline='top';x.textAlign='center';
 const P1=24,P2=24,cyc=2.5+P1+2+P2+3,t=T%cyc,txt=(a,y)=>x.fillText(a,42,y);
 if(t<2.5){txt('SNAKE II',10);if(Math.floor(t*3)%2)txt('PRESS 5',28);x.fillRect(14,22,56,1);return cv}
 const card=(a,b)=>{txt(a,12);txt(b,26);return cv};
 if(t>=2.5+P1&&t<4.5+P1)return card('LEVEL 2','GET READY');
 const sc0=Math.floor(P1*7/12)*7;if(t>=4.5+P1+P2)return card('GAME OVER','SCORE '+(sc0+Math.floor(P2*7/12)*7));
 const lv2=t>=4.5+P1,lt=lv2?t-4.5-P1:t-2.5,CW=20,CH=9,ox=2,oy=9;x.fillRect(0,7,84,1);x.fillRect(0,7,1,41);x.fillRect(83,7,1,41);x.fillRect(0,47,84,1);
 let path=[];if(!lv2){for(let r=0;r<CH;r++){if(r%2===0)for(let q=1;q<CW;q++)path.push([q,r]);else for(let q=CW-1;q>=1;q--)path.push([q,r])}for(let r=CH-1;r>0;r--)path.push([0,r]);path.push([0,0])}
 else{for(let q=1;q<=18;q++)path.push([q,1]);for(let r=2;r<=7;r++)path.push([18,r]);for(let q=17;q>=1;q--)path.push([q,7]);for(let r=6;r>=2;r--)path.push([1,r]);x.fillRect(ox+6*4,oy+3*4,8*4-1,3*4-1)}
 const L=path.length,st=Math.floor(lt*7),len=(lv2?6:4)+Math.floor(st/12),hd=st%L,score=(lv2?sc0:0)+Math.floor(st/12)*7;
 for(let i=0;i<Math.min(len,L-2);i++){const p=path[((hd-i)%L+L)%L];x.fillRect(ox+p[0]*4,oy+p[1]*4,3,3)}const hp=path[hd];x.clearRect(ox+hp[0]*4+1,oy+hp[1]*4+1,1,1);
 const f=path[(hd+12-(st%12))%L];if(Math.floor(T*3)%2===0){x.fillRect(ox+f[0]*4+1,oy+f[1]*4,1,1);x.fillRect(ox+f[0]*4,oy+f[1]*4+1,3,1);x.fillRect(ox+f[0]*4+1,oy+f[1]*4+2,1,1)}
 x.textAlign='left';lcdText(x,String(score).padStart(4,'0'),2,1,1);x.textAlign='right';x.fillText(lv2?'L2':'L1',82,0);return cv}
/* pager: the beat name scrolling across the top line, MZPRD and a clock below, in segment-style LCD ink */
function pagerScr(T,Sx){const[cv,x]=scv('pg',120,30);x.fillStyle='#fff';x.fillRect(0,0,120,30);x.fillStyle='#14200f';
 const t=String((Sx&&Sx.title)||'BEAT').toUpperCase();x.font='12px VT323, monospace';x.textBaseline='top';const tw=x.measureText(t+'    ').width;let off=tw>112?(T*20)%tw:0;x.save();x.beginPath();x.rect(3,0,114,15);x.clip();x.fillText(t+'    '+t,4-off,1);x.restore();
 x.fillText('MZPRD',4,15);const sec=Math.floor(T),cl='10:'+String(24+Math.floor(sec/60)).padStart(2,'0');lcdText(x,cl,86,18,1.6);if(Math.floor(T*1.5)%2)x.fillRect(110,2,6,4);return cv}
/* iPad: a sharp little first-person corridor shooter (portrait, as the iPad lies on the desk) */
let DMAP=null;
const DPTS=[[1.5,1.5],[6.5,1.5],[6.5,3.5],[11.5,3.5],[11.5,1.5],[14.5,1.5],[14.5,5.5],[9.5,5.5],[9.5,7.5],[14.5,7.5],[14.5,9.5],[7.5,9.5],[7.5,7.5],[4.5,7.5],[4.5,9.5],[1.5,9.5],[1.5,7.5],[3.5,7.5],[3.5,5.5],[1.5,5.5]],DPER=2.4,DPLAY=(DPTS.length-1)*DPER;
const DMON=[[5,1.5],[10,3.5],[14.5,4],[12,7.5],[9,9.5],[4.5,8.6],[2.5,7.5]];
function dcam(t){const u=clamp(t/DPER,0,DPTS.length-1.001),i0=Math.floor(u),f=u-i0,A=DPTS[i0],B=DPTS[i0+1],C=DPTS[Math.min(i0+2,DPTS.length-1)];const px=A[0]+(B[0]-A[0])*f,py=A[1]+(B[1]-A[1])*f,a1=Math.atan2(B[1]-A[1],B[0]-A[0]),a2=Math.atan2(C[1]-B[1],C[0]-B[0]);let da=a2-a1;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;return{px,py,ang:a1+(f>.55&&C!==B?da*ease((f-.55)/.45):0)}}
function dmap(){if(DMAP)return DMAP;const g=[...Array(11)].map(()=>Array(16).fill('1'));const carve=(x,y)=>{if(y>0&&y<10&&x>0&&x<15)g[y][x]='0'};
 for(let i=0;i+1<DPTS.length;i++){const A=DPTS[i],B=DPTS[i+1];let x=Math.floor(A[0]),y=Math.floor(A[1]);const bx=Math.floor(B[0]),by=Math.floor(B[1]);carve(x,y);while(x!==bx||y!==by){x+=Math.sign(bx-x);y+=Math.sign(by-y);carve(x,y)}}
 [[3,2],[9,2],[12,5],[11,8],[5,10-2]].forEach(p=>carve(p[0],p[1]));return DMAP=g.map(r=>r.join(''))}
let DKILL=null;function dkills(){if(DKILL)return DKILL;DKILL=DMON.map(m=>{for(let t=0;t<DPLAY;t+=.05){const c=dcam(t),dx=m[0]-c.px,dy=m[1]-c.py,d=Math.hypot(dx,dy);let a=Math.atan2(dy,dx)-c.ang;while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;if(d<2.1&&Math.abs(a)<.35)return t}return DPLAY-2});return DKILL}
/* iPad: a whole little shooter on loop: title menu, the level (monsters that are shot and fall), LEVEL COMPLETE with the stats counting up, back to the menu */
const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function bit8(src){const w=60,h=80,[cv,x]=scv('ip8',w,h);x.imageSmoothingEnabled=true;x.drawImage(src,0,0,w,h);const id=x.getImageData(0,0,w,h),d=id.data;
 for(let y=0;y<h;y++)for(let q=0;q<w;q++){const o=(y*w+q)*4,t=(BAY[(y&3)*4+(q&3)]/16-.5)*48;for(let c=0;c<3;c++){const v=d[o+c]+t;d[o+c]=Math.max(0,Math.min(255,Math.round(v/64)*64))}}x.putImageData(id,0,0);return cv}
function doomScr(T){return bit8(doomFull(T))}
function doomFull(T){const W=180,H=240,[cv,x]=scv('ip',W,H),MENU=4.5,DONE=5,cyc=MENU+DPLAY+DONE,t=T%cyc;x.imageSmoothingEnabled=true;
 const title=(y)=>{x.textAlign='center';x.textBaseline='middle';x.font='900 30px Anton, Oswald, sans-serif';x.lineWidth=4;x.strokeStyle='#300';x.strokeText('HELLGATE',W/2,y);const g=x.createLinearGradient(0,y-16,0,y+16);g.addColorStop(0,'#ffd36a');g.addColorStop(.5,'#e2541c');g.addColorStop(1,'#7a1208');x.fillStyle=g;x.fillText('HELLGATE',W/2,y)};
 if(t<MENU){const bg=x.createRadialGradient(W/2,H*.4,10,W/2,H*.4,H*.8);bg.addColorStop(0,'#5a1408');bg.addColorStop(1,'#0c0202');x.fillStyle=bg;x.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){const fx=(i*37%W),fy=H-((t*40+i*53)%H);x.fillStyle='rgba(255,'+(90+i*3%80)+',30,'+(.25+(i%5)*.1)+')';x.fillRect(fx,fy,2,2)}
  title(64);x.font='bold 10px Oswald, sans-serif';x.fillStyle='#c9a';x.fillText('EPISODE 1: THE BASEMENT',W/2,90);
  const items=['NEW GAME','OPTIONS','QUIT GAME'],sel=0;items.forEach((it,i)=>{const y=130+i*24,on=i===sel;x.font='bold 15px Oswald, sans-serif';x.fillStyle=on?'#ffd36a':'#a33';x.fillText(it,W/2,y);if(on&&Math.floor(t*3)%2){x.fillStyle='#ffd36a';x.fillText('>',W/2-52,y)}});
  if(t>MENU-.6){x.fillStyle='rgba(0,0,0,'+((t-(MENU-.6))/.6)+')';x.fillRect(0,0,W,H)}return cv}
 if(t>=MENU+DPLAY){const u=t-MENU-DPLAY,bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#2a0806');bg.addColorStop(1,'#080202');x.fillStyle=bg;x.fillRect(0,0,W,H);x.textAlign='center';x.textBaseline='middle';x.font='900 20px Anton, Oswald, sans-serif';x.fillStyle='#e8e0c8';x.fillText('E1M1',W/2,40);x.fillStyle='#ffd36a';x.fillText('COMPLETE',W/2,64);
  const k=clamp(u/1.6,0,1),rows=[['KILLS',Math.round(100*k)+'%'],['ITEMS',Math.round(85*k)+'%'],['SECRET',Math.round(50*k)+'%'],['TIME','0:'+String(Math.round(DPLAY*k)).padStart(2,'0')]];x.font='bold 14px Oswald, sans-serif';rows.forEach((r,i)=>{x.textAlign='left';x.fillStyle='#d33';x.fillText(r[0],22,105+i*24);x.textAlign='right';x.fillStyle='#eee';x.fillText(r[1],W-22,105+i*24)});
  if(u>DONE-.6){x.fillStyle='rgba(0,0,0,'+((u-(DONE-.6))/.6)+')';x.fillRect(0,0,W,H)}return cv}
 const lt=t-MENU,id=x.createImageData(W,H),d=id.data,VH=H-30,cam=dcam(lt),px=cam.px,py=cam.py,ang=cam.ang,K=dkills(),zb=new Float32Array(W);
 const fire=K.some(k=>lt>k-.35&&lt<k+.05&&((lt-k+.35)%.2)<.07),fl=fire?1.35:1,bob=Math.sin(lt*8)*2;
 for(let c2=0;c2<W;c2++){const cm=(c2/W-.5)*1.15,ra=ang+Math.atan(cm),dx=Math.cos(ra),dy=Math.sin(ra);let mx=Math.floor(px),my=Math.floor(py);const sx=Math.abs(1/dx),sy=Math.abs(1/dy),stx=dx<0?-1:1,sty=dy<0?-1:1;let tx=(dx<0?px-mx:mx+1-px)*sx,ty=(dy<0?py-my:my+1-py)*sy,side=0;
  for(let n=0;n<48;n++){if(tx<ty){tx+=sx;mx+=stx;side=0}else{ty+=sy;my+=sty;side=1}if((dmap()[my]||'')[mx]!=='0')break}
  const rd=side?ty-sy:tx-sx,dist=rd*Math.cos(ra-ang);zb[c2]=dist;const hh=VH*.95/Math.max(.08,dist),mid=VH*.47+bob,top=mid-hh/2,bot=mid+hh/2,hx=side?px+rd*dx:py+rd*dy,wu=hx-Math.floor(hx),fog=Math.max(.12,1-dist/8)*(side?.72:1)*fl;
  for(let r=0;r<VH;r++){const o=(r*W+c2)*4;let R,G,Bc;
   if(r<top){const k2=.35+.65*(1-r/mid);R=28*k2;G=24*k2;Bc=30*k2}
   else if(r>bot){const rr=(VH*.47)/Math.max(1,r-mid+.01),fx=px+dx*rr/Math.cos(ra-ang),fy=py+dy*rr/Math.cos(ra-ang),ck=((Math.floor(fx*2)+Math.floor(fy*2))&1)?.85:1,k2=Math.max(.1,1-rr/7)*fl;R=88*k2*ck;G=70*k2*ck;Bc=52*k2*ck}
   else{const v=(r-top)/(bot-top),row=Math.floor(v*8),bx=(wu*4+(row%2)*.5)%1,mortar=(v*8%1<.1)||(bx<.06),n=((Math.sin((Math.floor(wu*16)+row*7+mx*13+my*7)*12.9)*43758)%1+1)%1*.18+.82;R=mortar?60*fog:150*fog*n;G=mortar?52*fog:84*fog*n;Bc=mortar?46*fog:52*fog*n}
   d[o]=R;d[o+1]=G;d[o+2]=Bc;d[o+3]=255}}
 x.putImageData(id,0,0);
 /* the monsters: horned red demons that bob, flash when hit and fall; drawn behind walls where the walls are nearer */
 const ms=DMON.map((m,i)=>{const dx=m[0]-px,dy=m[1]-py,fw=dx*Math.cos(ang)+dy*Math.sin(ang),sd=-dx*Math.sin(ang)+dy*Math.cos(ang);return{i,fw,sd}}).filter(m=>m.fw>.3).sort((a,b)=>b.fw-a.fw);
 for(const m of ms){const kt=K[m.i],dead=lt>kt,dt=lt-kt;if(dead&&dt>1.2&&m.fw<.6)continue;const scx=W/2*(1+(m.sd/m.fw)/.575),hgt=VH*.95/m.fw,base=VH*.47+bob+hgt/2,mw=hgt*.75,fall=dead?clamp(dt/.45,0,1):0,mh=hgt*.95*(1-.82*fall),top=base-mh,l=Math.floor(scx-mw/2),rr=Math.ceil(scx+mw/2),hit=dead&&dt<.15,shade=Math.max(.25,1-m.fw/8)*fl;
  for(let c2=Math.max(0,l);c2<Math.min(W,rr);c2++){if(zb[c2]<m.fw)continue;x.save();x.beginPath();x.rect(c2,0,1,VH);x.clip();
   const R=Math.round((hit?255:170)*shade),G=Math.round((hit?240:40)*shade),B=Math.round((hit?200:28)*shade);x.fillStyle='rgb('+R+','+G+','+B+')';
   if(fall<1){x.beginPath();x.ellipse(scx,top+mh*.55,mw*.42,mh*.45,0,0,6.3);x.fill();x.beginPath();x.arc(scx,top+mh*.16,mw*.2,0,6.3);x.fill();x.fillStyle='rgb('+Math.round(230*shade)+','+Math.round(200*shade)+',120)';x.beginPath();x.moveTo(scx-mw*.18,top+mh*.08);x.lineTo(scx-mw*.28,top-mh*.06);x.lineTo(scx-mw*.08,top+mh*.04);x.moveTo(scx+mw*.18,top+mh*.08);x.lineTo(scx+mw*.28,top-mh*.06);x.lineTo(scx+mw*.08,top+mh*.04);x.fill();if(!dead){x.fillStyle='#ffef5a';x.fillRect(scx-mw*.1,top+mh*.13,mw*.06,mw*.05);x.fillRect(scx+mw*.04,top+mh*.13,mw*.06,mw*.05)}}
   else{x.fillStyle='rgb('+Math.round(120*shade)+',20,14)';x.beginPath();x.ellipse(scx,base-mh*.4,mw*.55,Math.max(2,mh*.5),0,0,6.3);x.fill()}
   x.restore()}}
 const gx=W/2+Math.sin(lt*4)*4,gy=VH-46+Math.abs(Math.sin(lt*8))*3;if(fire){const g=x.createRadialGradient(gx,gy-6,1,gx,gy-6,26);g.addColorStop(0,'rgba(255,250,200,1)');g.addColorStop(.4,'rgba(255,170,40,.9)');g.addColorStop(1,'rgba(255,120,0,0)');x.fillStyle=g;x.fillRect(gx-30,gy-36,60,60)}
 const gg=x.createLinearGradient(gx-14,0,gx+14,0);gg.addColorStop(0,'#3a3a40');gg.addColorStop(.5,'#8a8a92');gg.addColorStop(1,'#2a2a2e');x.fillStyle=gg;x.fillRect(gx-9,gy,18,40);x.fillStyle='#1c1c20';x.fillRect(gx-4,gy-4,8,8);x.fillStyle='#b77a52';x.beginPath();x.ellipse(gx,gy+42,22,12,0,0,6.3);x.fill();
 if(lt<1.2){x.fillStyle='rgba(0,0,0,'+(1-lt/1.2)+')';x.fillRect(0,0,W,VH)}
 const kills=K.filter(k=>lt>k).length,ammo=50-kills*2,hb=x.createLinearGradient(0,VH,0,H);hb.addColorStop(0,'#5b5b5f');hb.addColorStop(1,'#2e2e32');x.fillStyle=hb;x.fillRect(0,VH,W,30);x.fillStyle='#202024';x.fillRect(0,VH,W,2);
 x.textAlign='left';x.fillStyle='#d21e1e';x.font='bold 15px Oswald, sans-serif';x.textBaseline='middle';x.fillText(String(ammo),10,VH+16);x.fillText('100%',58,VH+16);x.fillText(kills+'/'+DMON.length,134,VH+16);x.fillStyle='#e8c070';x.fillRect(110,VH+8,16,16);
 if(lt>DPLAY-1.2){x.fillStyle='rgba(255,255,255,'+((lt-(DPLAY-1.2))/1.2)+')';x.fillRect(0,0,W,H)}return cv}
function drawProp(c,G,Sx,T){const k=ST.prop||'floppy',im=PROPIMG[k];if(k==='floppy'||!im)return;const v=G.id==='deskv';c.save();
 if(v){if(!PVPATCH)PVPATCH=DESKS.vpatch;if(PVPATCH)c.drawImage(PVPATCH,500,1640);const t=tightProp(k,im);c.translate(713,1830);c.scale(.9,.9);c.translate(-330,-930);c.save();c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=18;c.shadowOffsetX=6;c.shadowOffsetY=10;c.drawImage(t,PROPAT[0],PROPAT[1]);c.restore()}
 else c.drawImage(im,PROPAT[0],PROPAT[1]);
 const q=PSQ[k];if(k==='cd'){c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(28,30,58,.88)';const arc=(t,r,mid,sz,dir)=>{c.font='700 '+sz+'px Caveat, cursive';const w=c.measureText(t).width,span=w/r;let an=mid-dir*span/2;for(const ch of t){const cw=c.measureText(ch).width,a2=an+dir*cw/(2*r);c.save();c.translate(324+Math.cos(a2)*r,927+Math.sin(a2)*r);c.rotate(a2+dir*Math.PI/2);c.textAlign='center';c.textBaseline='middle';c.fillText(ch,0,0);c.restore();an+=dir*cw/r}};
  arc('MZPRD',108,-1.9,30,1);arc(String((Sx&&Sx.title)||'beats').slice(0,22),104,1.25,24,-1);c.font='600 17px Caveat, cursive';c.textAlign='center';c.save();c.translate(324,927);c.rotate(-.3);c.fillText(Sx&&Sx.bpm?Sx.bpm+' bpm':'master',0,-58);c.restore();c.restore()}
 else if(k==='pager'||k==='nokia'){c.save();quadPath(c,q);c.clip();
  if(k==='pager'){c.globalCompositeOperation='multiply';c.fillStyle='rgba(150,255,140,1)';c.fill();c.globalCompositeOperation='screen';c.fillStyle='rgba(60,170,50,.35)';c.fill()}
  else{c.globalCompositeOperation='screen';c.fillStyle='rgba(60,80,10,.18)';c.fill()}
  c.globalCompositeOperation='multiply';c.globalAlpha=.86;warp(c,k==='pager'?pagerScr(T,Sx):snakeScr(T),q,4);c.restore();
  if(k==='pager'){c.save();c.globalCompositeOperation='lighter';const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,g=c.createRadialGradient(cx,cy,10,cx,cy,140);g.addColorStop(0,'rgba(90,255,90,.12)');g.addColorStop(1,'rgba(90,255,90,0)');c.fillStyle=g;c.fillRect(cx-140,cy-140,280,280);c.restore()}}
 else if(k==='ipad'){c.save();quadPath(c,q);c.clip();c.fillStyle='#000';c.fill();c.imageSmoothingEnabled=false;warp(c,doomScr(T),q,8);c.imageSmoothingEnabled=true;const gl=PROPIMG.glass;if(gl){c.globalCompositeOperation='screen';c.globalAlpha=.8;c.drawImage(gl,PROPAT[0],PROPAT[1])}c.globalCompositeOperation='source-over';c.globalAlpha=1;const ig=c.createLinearGradient(q[0][0],q[0][1],q[2][0],q[2][1]);ig.addColorStop(0,'rgba(255,255,255,.06)');ig.addColorStop(.5,'rgba(255,255,255,0)');ig.addColorStop(1,'rgba(0,0,0,.12)');c.fillStyle=ig;c.fill();
  c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.45)';quadPath(c,q);c.stroke();c.restore();c.save();c.globalCompositeOperation='lighter';const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,g=c.createRadialGradient(cx,cy,60,cx,cy,230);g.addColorStop(0,'rgba(255,170,90,.06)');g.addColorStop(1,'rgba(255,170,90,0)');c.fillStyle=g;c.fillRect(cx-230,cy-230,460,460);c.restore()}
 c.restore()}
/* 9:16: the floppy there is painted out and the item (cut tight from its photo) sits in its place */
const PVF={def:[713,1820,.05]},PQ={cd:null,pager:[[164,840],[447,808],[463,1005],[175,1021]],nokia:[[223,803],[308,765],[468,1048],[367,1085]],ipad:[[105,781],[457,691],[516,1101],[191,1131]]};
let PVPATCH=null;const PTIGHT={};
function tightProp(k,im){if(PTIGHT[k])return PTIGHT[k];const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const x=cv.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='destination-in';x.fillStyle='#000';x.beginPath();
 if(k==='cd')x.arc(324-PROPAT[0],927-PROPAT[1],152,0,6.2832);else PQ[k].forEach((p,i)=>i?x.lineTo(p[0]-PROPAT[0],p[1]-PROPAT[1]):x.moveTo(p[0]-PROPAT[0],p[1]-PROPAT[1]));x.closePath();x.fill();return PTIGHT[k]=cv}
/* RIGHT DESK ITEM (MPC desk, 16:9): swap the right floppy for a Game Boy (a platformer level on loop), a BlackBerry (calls coming in and being missed),
   a Sidekick (a long text thread), a mini display (master meters and knobs) or an iPhone (scrolling a photo feed). Each screen is fitted to its measured corners. */
const RPROPS=[['floppy','Floppy disk (the original)'],['gameboy','Game Boy playing a level'],['bberry','BlackBerry with missed calls'],['sidekick','Sidekick texting'],['mini','Mini display (master meters)'],['iphone','iPhone scrolling a photo feed']];
const RPAT=[1620,560],RPIMG={};
const RSQ={gameboy:[[1828,660],[1956,672],[1948,792],[1808,770]],bberry:[[1767,712],[1946,684],[1962,793],[1786,822]],sidekick:[[1797,656],[1990,731],[1952,843],[1759,769]],mini:[[1768,744],[1971,774],[1958,931],[1749,893]],iphone:[[1719.6,689.4],[1888.6,652.0],[2003.1,983.6],[1833.8,1033.0]]};
const IGSRC=['can_01','can_03','can_05','can_07','can_09','can_11','desk_h_sg1','desk_h_sg3','desk_h_sg5','desk_h_sg7','pack_h_s1','pack_h_s2','pack_h_s3','pack_h_s4','pack_h_s5','desk','pack_h_noarm'];
async function loadRProp(){const k=ST.rprop||'floppy';if(k!=='floppy'&&!RPIMG[k])RPIMG[k]=await loadImg('mpc/rprop_'+k+'.webp?v=2');if(k==='iphone'&&!RPIMG.ig){RPIMG.ig=[];for(const n of IGSRC){const im=await loadImg('mpc/'+n+'.webp?v=1');if(im)RPIMG.ig.push(im)}}}
const rnd=n=>{let a=(n*2654435761)>>>0;a^=a>>>15;a=Math.imul(a,2246822519)>>>0;a^=a>>>13;return(a>>>0)/4294967296};

/* --- Game Boy: one level of a little platformer, on loop (title, the level, flag, COURSE CLEAR), drawn in the Game Boy's 4 shades --- */
const GBL=(()=>{const ob=[];let x=220;for(let i=0;x<4200;i++){const r=rnd(i+7),t=r<.3?'pipe':r<.55?'goomba':r<.75?'gap':'blocks';ob.push({t,x,h:t==='pipe'?(rnd(i+99)<.5?16:24):0,w:t==='gap'?24:t==='pipe'?16:t==='blocks'?32:8});x+=90+Math.floor(rnd(i+3)*80)}return{ob,end:x+60}})();
function gbMarioY(px){let y=0;for(const o of GBL.ob){const s=o.x-30,e=o.x+o.w+22;if(px>s&&px<e){const u=(px-s)/(e-s),h=(o.t==='pipe'?o.h+16:o.t==='gap'?22:o.t==='goomba'?20:26);y=Math.max(y,4*h*u*(1-u))}}return y}
function gbScr(T){const[cv,x]=scv('gb',160,144),C=['#fff','#aaa','#555','#151515'],SP=38,PLAY=GBL.end/SP,cyc=3+PLAY+3+6,t=T%cyc,f=(i)=>x.fillStyle=C[i];f(0);x.fillRect(0,0,160,144);x.font='8px monospace';x.textBaseline='top';
 const txt=(s,X,Y,c)=>{f(c==null?3:c);x.textAlign='center';x.fillText(s,X,Y)};
 if(t<3){f(2);x.fillRect(20,24,120,40);f(0);x.fillRect(22,26,116,36);txt('SUPER PLUMBER',80,32);txt('LAND',80,44);if(Math.floor(t*2)%2)txt('PUSH START',80,96);txt('©MZPRD',80,124,2);return cv}
 if(t>=3+PLAY+3){txt('COURSE CLEAR!',80,54);txt('SCORE '+String(GBL.ob.length*100+1200).padStart(6,'0'),80,74);if(t>cyc-1){f(3);x.globalAlpha=t-(cyc-1);x.fillRect(0,0,160,144);x.globalAlpha=1}return cv}
 const pt=Math.min(t-3,PLAY),mx=pt*SP,cam=Math.max(0,mx-56),gy=120;
 /* hills and clouds (slow parallax) */
 f(1);for(let i=-1;i<6;i++){const hx=i*90-(cam*.4%90);x.beginPath();x.arc(hx,gy,30,Math.PI,0);x.fill()}for(let i=-1;i<5;i++){const cx=i*70-(cam*.2%70);f(1);x.fillRect(cx+10,20+(i%2)*10,26,6);x.fillRect(cx+14,16+(i%2)*10,16,4)}
 /* ground with gaps */
 for(let gx=Math.floor(cam/8)*8;gx<cam+168;gx+=8){if(GBL.ob.some(o=>o.t==='gap'&&gx>=o.x&&gx<o.x+o.w))continue;const sx=gx-cam;f(2);x.fillRect(sx,gy,8,24);f(3);x.fillRect(sx,gy,8,1);x.fillRect(sx+7,gy,1,24);x.fillRect(sx,gy+8,8,1)}
 let coins=0,score=0;
 for(const o of GBL.ob){const sx=o.x-cam,passed=mx>o.x+o.w;if(passed){score+=100;if(o.t==='blocks')coins++}if(sx<-40||sx>170)continue;
  if(o.t==='pipe'){f(2);x.fillRect(sx+1,gy-o.h,14,o.h);f(3);x.fillRect(sx,gy-o.h,16,5);x.fillRect(sx+1,gy-o.h+5,1,o.h-5);f(1);x.fillRect(sx+3,gy-o.h+6,2,o.h-6)}
  else if(o.t==='goomba'){const dead=mx>o.x-4,dt=(mx-(o.x-4))/SP;if(dead&&dt>.6)continue;const wob=Math.floor(T*4)%2;f(3);if(dead){x.fillRect(sx,gy-3,8,3)}else{x.fillRect(sx+1,gy-8,6,5);x.fillRect(sx,gy-5,8,3);f(0);x.fillRect(sx+2,gy-7,1,2);x.fillRect(sx+5,gy-7,1,2);f(3);x.fillRect(sx+(wob?0:5),gy-2,3,2)}}
  else if(o.t==='blocks'){for(let b=0;b<4;b++){const bx=sx+b*8,q=b===1||b===2,hit=q&&mx>o.x+b*8;f(hit?2:3);x.fillRect(bx,gy-40,8,8);f(hit?1:0);x.fillRect(bx+1,gy-39,6,6);if(q&&!hit){f(3);x.fillText('?',bx+2,gy-40)}}}}
 /* flag and castle */
 const fx=GBL.end-cam;if(fx<170){f(3);x.fillRect(fx,gy-64,1,64);x.fillRect(fx-2,gy-66,5,3);const fl=mx>=GBL.end-4?Math.min(48,(pt-PLAY+.01)*30+((mx-GBL.end+4)/SP)*40):0;f(2);x.beginPath();x.moveTo(fx,gy-60+fl);x.lineTo(fx-10,gy-55+fl);x.lineTo(fx,gy-50+fl);x.fill();f(2);x.fillRect(fx+24,gy-32,32,32);f(3);x.fillRect(fx+36,gy-14,8,14);for(let i=0;i<4;i++)x.fillRect(fx+24+i*8,gy-36,5,4)}
 /* the plumber: runs, jumps over everything, slides down the flag */
 let my=gbMarioY(mx),sx=mx-cam;if(t-3>PLAY){const q=t-3-PLAY;sx=GBL.end-cam-2+Math.max(0,q-1.2)*20;my=q<1.2?Math.max(0,48-q*40):0;if(q>2.6)sx=-99}
 const air=my>0,run=Math.floor(T*10)%2,py=gy-16-my;if(sx>-20){f(3);x.fillRect(sx+3,py,7,3);x.fillRect(sx+2,py+3,9,4);f(0);x.fillRect(sx+7,py+4,2,2);f(3);x.fillRect(sx+2,py+7,9,5);f(1);x.fillRect(sx+4,py+8,5,3);f(3);if(air){x.fillRect(sx+1,py+12,4,3);x.fillRect(sx+8,py+11,4,3)}else if(run){x.fillRect(sx+2,py+12,3,4);x.fillRect(sx+8,py+12,3,4)}else{x.fillRect(sx+4,py+12,5,4)}}
 f(3);x.textAlign='left';x.fillText('MARIO',4,2);x.fillText(String(score).padStart(6,'0'),4,10);x.fillText('o x'+String(coins).padStart(2,'0'),58,10);x.fillText('WORLD',98,2);x.fillText(' 1-1',98,10);x.fillText('TIME',134,2);x.fillText(String(Math.max(0,400-Math.floor(pt*2))).padStart(3,'0'),136,10);return cv}

/* --- BlackBerry: 40 people calling one after another; each call rings, becomes a missed call, the screen dims, the next call lights it up --- */
const BBN=['Mom','Big Mike','Tay','Dre (Studio)','Unknown','Jaylen','Keisha','Uncle Ron','Marcus B','Lil Saint','DJ Rocko','Nia','Coach T','Brandon','Aaliyah','Manager Lou','Rico','Shay','T-Money','Grandma','Quinn','Deshawn','Vee','Studio A Booking','Kev','Mya','Pooh','Landlord','Chris P','Jasmine','Bank of America','Twin','Ant','Dee Dee','Smoke','Ray Ray','Label - Kim','Ty Dolla','Cuz','Bri'];
function bbScr(T){const W=330,H=200,[cv,x]=scv('bb',W,H),RING=7,MISS=1.6,REST=4.2,per=RING+MISS+REST,n=BBN.length,ci=Math.floor(T/per)%n,ct=T%per,nm=BBN[ci],ph=ct<RING?'ring':ct<RING+MISS?'miss':'rest',missed=Math.floor(T/per)+(ph==='ring'?0:1);x.imageSmoothingEnabled=true;
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a1a33');g.addColorStop(1,'#03070f');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.fillStyle='#e8eef8';x.font='bold 11px Arial';x.textBaseline='top';x.textAlign='left';x.fillText('▂▄▆█ ',6,4);x.textAlign='right';x.fillText('3G ▮▮▮▯',W-6,4);x.textAlign='center';const mm=24+Math.floor(T/60);x.fillText('10:'+String(mm%60).padStart(2,'0')+' AM',W/2,4);x.fillStyle='rgba(255,255,255,.15)';x.fillRect(0,19,W,1);
 if(ph==='rest'){x.fillStyle='#fff';x.font='300 46px Arial';x.fillText('10:'+String(mm%60).padStart(2,'0'),W/2,34);x.font='14px Arial';x.fillStyle='#b9c6dc';x.fillText('Thu, Apr 16',W/2,86);
  x.fillStyle='#d6242d';x.beginPath();x.arc(W/2-58,121,9,0,6.3);x.fill();x.fillStyle='#fff';x.font='bold 11px Arial';x.fillText(String(Math.min(missed,99)),W/2-58,115);x.font='13px Arial';x.textAlign='left';x.fillText(missed+' Missed Call'+(missed>1?'s':''),W/2-44,113);x.textAlign='center';
  ['✉','31','◷','☏','⊕'].forEach((s,i)=>{x.fillStyle='rgba(255,255,255,.85)';x.font='18px Arial';x.fillText(s,40+i*62,156)});x.fillStyle='rgba(0,0,0,'+(.62*ease(Math.min(1,(ct-RING-MISS)/.6))).toFixed(3)+')';x.fillRect(0,0,W,H);return cv}
 const hue=(nm.length*47+ci*31)%360,init=nm.split(/[\s(-]+/).filter(Boolean).map(s=>s[0]).join('').slice(0,2).toUpperCase(),pulse=ph==='ring'?.5+.5*Math.sin(ct*7):0;
 x.fillStyle='#9fb3d1';x.font='12px Arial';x.fillText(ph==='ring'?'Incoming Call':'Missed Call',W/2,26);
 x.save();x.globalAlpha=.35*pulse;x.strokeStyle='#5fd06a';x.lineWidth=3;x.beginPath();x.arc(W/2,72,30+8*pulse,0,6.3);x.stroke();x.restore();
 const ag=x.createLinearGradient(0,44,0,100);ag.addColorStop(0,'hsl('+hue+',55%,58%)');ag.addColorStop(1,'hsl('+hue+',60%,38%)');x.fillStyle=ag;x.beginPath();x.arc(W/2,72,26,0,6.3);x.fill();x.fillStyle='#fff';x.font='bold 20px Arial';x.textBaseline='middle';x.fillText(init,W/2,73);x.textBaseline='top';
 x.font='bold 17px Arial';x.fillText(nm,W/2,104);x.font='12px Arial';x.fillStyle='#b9c6dc';const num='('+(200+ci*17%700)+') '+(300+ci*23%600)+'-'+String(1000+ci*137%9000).padStart(4,'0');x.fillText(nm==='Unknown'?'Private Number':num,W/2,124);
 if(ph==='ring'){[[W/2-70,'#2fa84a','Answer'],[W/2+70,'#c7262f','Ignore']].forEach(([bx,col,l])=>{x.fillStyle=col;x.beginPath();x.roundRect?x.roundRect(bx-55,150,110,32,6):x.rect(bx-55,150,110,32);x.fill();x.fillStyle='#fff';x.font='bold 13px Arial';x.fillText(l,bx,159)})}
 else{x.fillStyle='rgba(199,38,47,.9)';x.beginPath();x.roundRect?x.roundRect(30,150,W-60,32,6):x.rect(30,150,W-60,32);x.fill();x.fillStyle='#fff';x.font='bold 13px Arial';x.fillText('Missed call from '+nm,W/2,159)}
 if(ct<.5){x.fillStyle='rgba(0,0,0,'+(.62*(1-ct/.5)).toFixed(3)+')';x.fillRect(0,0,W,H)}return cv}

/* --- Sidekick: a 100-message text thread that plays out across the whole video (typing dots before each reply) --- */
const SKM=['yo you up?','always. in the lab rn','send me something','cooking one right now, hold on','what bpm','like 92, dusty','say less','kicks hitting crazy on this one','lemme hear it','sending the bounce in 5','bet','ok its sent','OHHH','that sample?? where you find that','crate digging lol, flea market vinyl','bro this is crazy','you want it?','yes. dont send it to nobody else','its yours if you want it','how much','we can talk, come thru the studio','tonight?','after 10','ight im coming','bring the hook you was talking about','i got 3 hooks lol','bring all 3','what you on rn','mpc60 and a dusty lamp','old school','only way to do it','facts','can you make the drums knock more','already on it, swapping the kick','i need it to slap in the car','it will','send the new one when done','give me 20','ok','...','new one sent','THIS IS IT','told you','the snare got that crack now','yea i layered it','who mixing it','me first, then we send it out','cool','you still got that other beat from last week','the one with the flute?','yeah','still got it','hold that too','holding','yo my manager wanna hear','send him mzprd.com lol','he on it now','tell him the packs on there too','he said the vinyl pack hard','big citi vinyl, thats the one','we using that for the album','lets work','what time you closing up','when the beat done lol','respect','im outside','door open','yo turn it up','its up','neighbors gonna call','let em','haha','what we naming it','you name it','late night dusty','i like that','done','we need a video for it','already filming the pads','for real?','its on the desk right now','post it','posting tonight','tag me','always','one more beat before i go?','one more','go crazy','already started','this the one','you say that every time','and im always right','lol true','send stems later','sending in the morning','bet','good session','for sure','tomorrow same time?','same time','say less','peace','✌️','back in the lab tomorrow 💯'];
/* more conversations after Tay: the Sidekick goes back to the buddy list and opens a chat with someone else (about 6 more minutes) */
const SKTH=[{n:'TayOnTheTrack',m:SKM},
 {n:'DreStudioA',m:['you still got the room tonight?','yeah 9 to 2','can i slide thru for an hour','bring your drives','what you working on','new pack, vinyl stuff','big citi vinyl right','yep its out now','i copped it this morning','already flipped 2 loops off it','send me what you made','one sec','bro the second one','that swing is crazy','its the mpc, no quantize','old school','gotta be','what mic you got set up','the 87, same as always','perfect, my artist coming too','who','Lil Saint','oh word, he cold','he wanna hear beats first','i got like 30 ready','bring the dark ones','say less','9 sharp','ill be there 8:45','bet']},
 {n:'Mom',m:['did you eat today','yes mom','what did you eat','a sandwich','that is not food','lol its food','come by sunday, cooking','what you making','greens and the chicken','im there','bring your sister','ok','and call your grandma','i will','love you','love you too','stop staying up so late','im working tho','i know baby, im proud of you','🙏🏾']},
 {n:'ManagerLou',m:['you see the numbers on the last video?','not yet','40k in 2 days','WHAT','the pad close up shorts doing numbers','told you people love the mpc','we need 3 a week','i can do that','label asked about a beat tape','for real?','10 tracks, dusty, no features','i got the tracks','send me a list tonight','ok','also merch','like what','shirts with the mpc on it','ok i like that','ill get mocks','send them','and post the vinyl pack again','posting at 6','perfect','we moving','facts']},
 {n:'LilSaint',m:['yo mzprd','whats good','Dre said you got heat','i do lol','i need something slow','like 80?','yeah, sad but hard','i got one with a piano chop','send it','sending','...','yo','this the one','its yours','how much','we good, just tag me','bet. recording tonight','pull up after','ill be at Dre spot','see you there']},
 {n:'Kev',m:['you up','always','i cant sleep','me neither','what you doing','making beats lol','send me one','which kind','something to drive to','ok sending','this hard','thanks bro','you should sell these','i do lol mzprd.com','oh word im buying one','dont buy it, its yours','nah i gotta support','appreciate you','night bro','night']},
 {n:'TayOnTheTrack',m:['yo you still up','yeah','listening to the beat again','lol which one','late night dusty','its on repeat','told you','send stems when you wake up','already in your email','goat']},
 {n:'DreStudioA',m:['Saint just finished the verse','already??','one take on the hook','send me the rough','sending','bro','this crazy right','mixing tomorrow','bring snacks lol','bet']},
 {n:'ManagerLou',m:['list?','sending now','10 tracks?','11, bonus one','even better','label call friday','ill be there','wear a shirt with no stains lol','no promises','lmao']},
 {n:'Jas',m:['heyyy','hey','you busy','kinda, in the studio','what you making','something for a video','can i hear','when its done','you always say that lol','this time for real','ok i believe you','sent you a preview','omg i love it','for real?','yes, the drums','the drums is everything','lol nerd','proudly','good night beat maker','good night']}];
const SKTC={};function skTimes(k){if(SKTC[k])return SKTC[k];let t=0;const r=SKTH[k].m.map((m,i)=>{const d=1.1+m.length*.07+(rnd(i+77+k*300)*.8);t+=d;return{at:t,d}});r.total=t+4;return SKTC[k]=r}
/* the order the phone is used: open a chat from the buddy list, or the phone sits idle (screen dims and sleeps) until a new message lights it up */
const SKORD=[[0,'b'],[1,'i'],[2,'w'],[6,'w'],[3,'i'],[4,'w'],[7,'w'],[5,'i'],[8,'w'],[9,'w']];
const SKINB=3.5;let SKALL=null;function skAll(){if(SKALL)return SKALL;let t=0;SKALL=SKORD.map(([k,ty],j)=>{const inb=j===0?0:ty==='i'?SKINB:10+rnd(j+500)*14;const o={k,ty,j,s:t,inb};t+=inb+skTimes(k).total;o.e=t;return o});SKALL.total=t;return SKALL}
const SKNAMES=[...new Set(SKTH.map(t=>t.n))];
/* the buddy list between conversations: the cursor moves down and opens the next chat */
function skInbox(x,W,H,j,u,T){const AL=skAll(),cur=SKTH[AL[j].k].n,seen=new Set(AL.slice(0,j).map(o=>SKTH[o.k].n)),bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#f6f8fb');bg.addColorStop(1,'#e4e9f0');x.fillStyle=bg;x.fillRect(0,0,W,H);const tb=x.createLinearGradient(0,0,0,46);tb.addColorStop(0,'#3a6fb5');tb.addColorStop(1,'#1f4b8a');x.fillStyle=tb;x.fillRect(0,0,W,46);
 x.fillStyle='#fff';x.font='bold 21px Tahoma, Verdana, sans-serif';x.textAlign='left';x.textBaseline='alphabetic';x.fillText('Buddy List',20,31);x.font='15px Tahoma, Verdana, sans-serif';x.textAlign='right';x.fillText('mzprd  ●  Available',W-16,30);
 const prev=j?SKTH[AL[j-1].k].n:cur,ci=SKNAMES.indexOf(cur),pi=SKNAMES.indexOf(prev),sel=u<.5?pi:ci;
 SKNAMES.forEach((nm,i)=>{const y=58+i*42;if(y>H-20)return;if(i===sel){x.fillStyle='rgba(58,111,181,.22)';x.fillRect(6,y-4,W-12,38)}const unread=nm===cur||!seen.has(nm);x.fillStyle=rnd(i+9)<.8?'#2fa84a':'#e0a326';x.beginPath();x.arc(24,y+15,6,0,6.3);x.fill();
  x.fillStyle='#1b2430';x.font=(unread?'bold ':'')+'17px Tahoma, Verdana, sans-serif';x.textAlign='left';x.fillText(nm,40,y+14);x.font='14px Tahoma, Verdana, sans-serif';x.fillStyle='#7a8696';const th=SKTH.find(t=>t.n===nm),pv=th.m[0];x.fillText(pv.length>48?pv.slice(0,46)+'…':pv,40,y+31);
  if(unread){x.fillStyle='#c4161c';x.beginPath();x.arc(W-28,y+15,9,0,6.3);x.fill();x.fillStyle='#fff';x.font='bold 12px Tahoma';x.textAlign='center';x.fillText('1',W-28,y+19)}});
 if(u>.8){x.fillStyle='rgba(255,255,255,'+((u-.8)/.2)+')';x.fillRect(0,0,W,H)}}
/* the phone left alone: the screen dims, then sleeps (backlight off, just a faint clock), until a new message lights it up with a banner */
function skIdle(cv,x,W,H,j,u,T,dur){const AL=skAll(),pk=AL[j-1].k,nk=AL[j].k,el=u*dur;
 if(el<4){skChat(cv,x,W,H,pk,skTimes(pk).total,T);x.fillStyle='rgba(0,0,0,'+(el<2.5?.45*ease(el/2.5):.45+.53*ease((el-2.5)/1.5))+')';x.fillRect(0,0,W,H);return}
 const left=dur-el,on=left<2.6;x.fillStyle=on?'#0d1420':'#030508';x.fillRect(0,0,W,H);
 const now=new Date(2026,3,16,22,24+Math.floor(T/60)),hh=((now.getHours()+11)%12)+1,mm=String(now.getMinutes()).padStart(2,'0');x.textAlign='center';x.textBaseline='alphabetic';x.fillStyle=on?'#e8eef8':'rgba(120,140,170,.10)';x.font='300 92px Tahoma, Verdana, sans-serif';x.fillText(hh+':'+mm,W/2,160);x.font='20px Tahoma, Verdana, sans-serif';x.fillText('Thursday, April 16',W/2,196);
 if(on){const a=ease(clamp((2.6-left)/.35,0,1)),nm=SKTH[nk].n,pv=SKTH[nk].m[0];x.globalAlpha=a;const by=236-(1-a)*30;x.fillStyle='rgba(58,111,181,.95)';x.beginPath();x.roundRect?x.roundRect(24,by,W-48,92,12):x.rect(24,by,W-48,92);x.fill();x.fillStyle='#fff';x.textAlign='left';x.font='bold 19px Tahoma, Verdana, sans-serif';x.fillText('✉  New AIM message',44,by+32);x.font='bold 18px Tahoma, Verdana, sans-serif';x.fillText(nm+':',44,by+64);const nw=x.measureText(nm+': ').width;x.font='18px Tahoma, Verdana, sans-serif';x.fillText(pv.length>40?pv.slice(0,38)+'…':pv,44+nw,by+64);x.globalAlpha=1;
  if(left<.3){x.fillStyle='rgba(255,255,255,'+(1-left/.3)*.8+')';x.fillRect(0,0,W,H)}}}
function skScr(T){const W=640,H=372,[cv,x]=scv('sk',W,H),AL=skAll(),tt=T%AL.total,seg=AL.find(o=>tt<o.e)||AL[0];x.imageSmoothingEnabled=true;
 if(tt<seg.s+seg.inb){const u=(tt-seg.s)/seg.inb;if(seg.ty==='w')skIdle(cv,x,W,H,seg.j,u,T,seg.inb);else skInbox(x,W,H,seg.j,u,T);return cv}
 return skChat(cv,x,W,H,seg.k,tt-seg.s-seg.inb,T)}
function skChat(cv,x,W,H,KK,t,T){const MSG=SKTH[KK].m,BUD=SKTH[KK].n,ST2=skTimes(KK),n=MSG.length;t=Math.min(t,ST2.total-.01);let shown=0;while(shown<n&&ST2[shown].at<=t)shown++;const nx=Math.min(shown,n-1),since=shown?t-ST2[shown-1].at:t,frac=shown<n?clamp(1-(ST2[nx].at-t)/ST2[nx].d,0,1):1,GAP=2.2;x.imageSmoothingEnabled=true;x.textBaseline='alphabetic';
 /* AIM on the Sidekick: a white transcript with coloured screen names and timestamps, a blue title bar, an input line and a status bar */
 const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#f6f8fb');bg.addColorStop(1,'#e4e9f0');x.fillStyle=bg;x.fillRect(0,0,W,H);
 const tb=x.createLinearGradient(0,0,0,46);tb.addColorStop(0,'#3a6fb5');tb.addColorStop(1,'#1f4b8a');x.fillStyle=tb;x.fillRect(0,0,W,46);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(0,0,W,1);
 x.fillStyle='#ffd23a';x.beginPath();x.arc(26,23,10,0,6.3);x.fill();x.fillStyle='#1f4b8a';x.beginPath();x.arc(26,23,4,0,6.3);x.fill();
 x.fillStyle='#fff';x.font='bold 21px Tahoma, Verdana, sans-serif';x.textAlign='left';x.fillText(BUD,46,31);x.font='15px Tahoma, Verdana, sans-serif';x.textAlign='right';x.fillText('AIM',W-108,30);
 for(let j=0;j<4;j++){x.fillRect(W-94+j*7,32-(j+1)*4,5,(j+1)*4)}x.strokeStyle='#fff';x.lineWidth=2;x.strokeRect(W-58,18,32,14);x.fillRect(W-55,21,22,8);x.fillRect(W-25,22,3,6);
 const IN=46,OUT=H-46;x.save();x.beginPath();x.rect(0,IN,W,OUT-IN);x.clip();
 const mine=i=>i%2===1^(i>40&&i%3===0),LH=26,F='17px Tahoma, Verdana, sans-serif',FB='bold 17px Tahoma, Verdana, sans-serif';
 const wrap=(nm,s)=>{x.font=FB;const nw=x.measureText(nm+': ').width;x.font=F;const out=[];let line='',first=true;for(const w of s.split(' ')){const tt=line?line+' '+w:w,lim=W-24-(first?nw+70:0);if(x.measureText(tt).width>lim&&line){out.push(line);line=w;first=false}else line=tt}out.push(line);return{nw,out}};
 const items=[];for(let i=0;i<shown;i++){const me=mine(i),nm=me?'mzprd':BUD,w=wrap(nm,MSG[i]);items.push({me,nm,w,h:w.out.length*LH+6,ts:'10:'+String(24+Math.floor(ST2[i].at/60)).padStart(2,'0')})}
 const typing=shown<n&&!mine(shown)&&frac>.35;let y=OUT-10-(typing?LH:0);const last=items[items.length-1];const ar=clamp(since/.28,0,1);y+=shown>0?(1-ease(ar))*last.h:0;
 for(let i=items.length-1;i>=0&&y>IN;i--){const it=items[i];y-=it.h;let ly=y+LH-4;x.globalAlpha=i===items.length-1?.25+.75*ease(ar):1;if(i===items.length-1&&ar<1){x.fillStyle='rgba(58,111,181,'+(.12*(1-ar))+')';x.fillRect(6,y,W-12,it.h)}x.font='13px Tahoma, Verdana, sans-serif';x.fillStyle='#8a94a3';x.textAlign='left';x.fillText('('+it.ts+')',12,ly);
  x.font=FB;x.fillStyle=it.me?'#1a56c4':'#c4161c';x.fillText(it.nm+':',70,ly);x.font=F;x.fillStyle='#1b2430';it.w.out.forEach((l,j)=>{x.fillText(l,j?24:76+it.w.nw-6,ly+j*LH)});
  if(i>0&&items[i-1].me!==it.me){x.fillStyle='rgba(30,50,80,.08)';x.fillRect(10,y+1,W-20,1)}x.globalAlpha=1}
 if(typing){x.font='italic 15px Tahoma, Verdana, sans-serif';x.fillStyle='#8a94a3';x.textAlign='left';x.fillText(BUD+' is typing'+'...'.slice(0,1+Math.floor(T*3)%3),12,OUT-14)}
 x.restore();
 x.fillStyle='#d3dae4';x.fillRect(0,OUT,W,H-OUT);x.fillStyle='#b5c0cf';x.fillRect(0,OUT,W,1);x.fillStyle='#fff';x.beginPath();x.roundRect?x.roundRect(10,OUT+8,W-110,30,6):x.rect(10,OUT+8,W-110,30);x.fill();x.strokeStyle='#9aa7b8';x.lineWidth=1;x.stroke();
 const draft=shown<n&&mine(shown)?MSG[shown].slice(0,Math.floor(MSG[shown].length*clamp((frac-.25)/.7,0,1))):'';x.font=F;x.fillStyle='#1b2430';x.fillText(draft,20,OUT+29);if(Math.floor(T*2)%2){const cw=x.measureText(draft).width;x.fillRect(21+cw,OUT+13,2,20)}
 const sb=x.createLinearGradient(0,OUT+8,0,OUT+38);sb.addColorStop(0,'#4a7fc4');sb.addColorStop(1,'#2a5596');x.fillStyle=sb;x.beginPath();x.roundRect?x.roundRect(W-92,OUT+8,82,30,6):x.rect(W-92,OUT+8,82,30);x.fill();x.fillStyle='#fff';x.font='bold 16px Tahoma, Verdana, sans-serif';x.textAlign='center';x.fillText('Send',W-51,OUT+29);
 return cv}

/* --- Mini display: master bus meters (L/R with peak hold) that move with the beat, and four knobs turning --- */
function miniScr(T,Sx,la){const W=220,H=166,[cv,x]=scv('mn',W,H);x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#1a1d1c';x.strokeStyle='#1a1d1c';x.font='bold 11px monospace';x.textBaseline='top';x.textAlign='left';
 const hs=(Sx&&Sx.hits)||[],env=(tt,tau)=>{let lo=0,hi=hs.length;while(lo<hi){const m=(lo+hi)>>1;if(hs[m].t<=tt)lo=m+1;else hi=m}let e=0;for(let i=lo-1;i>=0&&tt-hs[i].t<.8;i--)e+=hs[i].v*Math.exp(-(tt-hs[i].t)/tau);return Math.min(1,e*.55)};
 const run=la>0&&Sx&&la<Sx.dur,lv=run?.42+.5*env(la,.14):0,lL=run?Math.min(1,lv*(1+.05*Math.sin(la*13))):0,lR=run?Math.min(1,lv*(1+.05*Math.sin(la*11+1))):0,pk=run?Math.max(env(la,.6),env(la-.3,.6))*.55+.42:0;
 x.fillText('MASTER BUS',6,4);x.textAlign='right';x.fillText(run?'PLAY  '+mmss(la):'STOP  0:00',W-6,4);x.fillRect(6,17,W-12,1);
 [['L',lL,26],['R',lR,44]].forEach(([n,l,y])=>{x.textAlign='left';x.fillText(n,6,y);const segs=28,sw=(W-34)/segs;for(let i=0;i<segs;i++){const on=i/segs<l,hot=i>=segs-4;x.globalAlpha=on?1:.12;x.fillRect(22+i*sw,y+1,sw-2,hot?11:9)}x.globalAlpha=1;const pp=Math.floor(Math.min(.98,pk)*segs);x.fillRect(22+pp*sw,y-1,2,13)});
 x.font='9px monospace';x.textAlign='center';['-48','-24','-12','-6','-3','0'].forEach((s,i)=>x.fillText(s,24+i*(W-40)/5,60));
 const K=[['VOL',.62+.04*Math.sin(T*.3)],['LOW',.5+.18*Math.sin(T*.47)],['HIGH',.55+.2*Math.sin(T*.39+1)],['COMP',.35+.25*(run?env(la,.25):0)+.1*Math.sin(T*.2)]];
 K.forEach(([n,v],i)=>{const cx=30+i*53,cy=104,r=17;x.lineWidth=2;x.beginPath();x.arc(cx,cy,r,.75*Math.PI,2.25*Math.PI);x.stroke();x.lineWidth=4;x.beginPath();x.arc(cx,cy,r,.75*Math.PI,.75*Math.PI+1.5*Math.PI*v);x.stroke();const a=.75*Math.PI+1.5*Math.PI*v;x.lineWidth=2;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*(r-5),cy+Math.sin(a)*(r-5));x.stroke();x.font='bold 9px monospace';x.fillText(n,cx,cy+21);x.font='9px monospace';x.fillText(Math.round(v*100),cx,cy-4+12)});
 x.font='bold 10px monospace';x.textAlign='left';x.fillText((Sx&&Sx.bpm?Sx.bpm:'--')+' BPM',6,150);x.textAlign='right';x.fillText('MZPRD',W-6,150);return cv}

/* --- iPhone: scrolling a photo feed, flick and pause, about 3 minutes of posts before it loops --- */
const IGU=['mzprd','studio.nights','vinyl.diggers','beatmakersdaily','mpc.heads','dustykicks','lofi.lab','samplecrate','boom.bap.only','gearporn.audio','late.night.loops','crate.culture','drumbreaks','producergrind','tapehiss'];
const IGC=['late night session 🎛️','new pack drops friday','dust on the pads, fire in the speakers','sampled this off a $1 record','who still uses floppies?','the lamp stays on till the beat is done','mpc life 🔥','cooking with the classics','link in bio','vinyl > everything','90 bpm and a dream','studio ritual','pads worn, beats hard','sunday crate dig haul','mixing tonight'];
function igIcon(x,k,cx,cy,sz,col,fill){x.save();x.translate(cx,cy);x.scale(sz/24,sz/24);x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2;x.lineJoin='round';x.lineCap='round';x.beginPath();
 if(k==='heart'){x.moveTo(0,8);x.bezierCurveTo(-14,-1,-10,-13,0,-6);x.bezierCurveTo(10,-13,14,-1,0,8);if(fill)x.fill();else x.stroke()}
 else if(k==='com'){x.arc(0,0,9,.7,2*Math.PI+.3);x.lineTo(9,9);x.closePath();x.stroke()}
 else if(k==='send'){x.moveTo(-10,-8);x.lineTo(10,-8);x.lineTo(0,10);x.lineTo(-2,-1);x.closePath();x.moveTo(-2,-1);x.lineTo(10,-8);x.stroke()}
 else if(k==='save'){x.moveTo(-7,-10);x.lineTo(7,-10);x.lineTo(7,10);x.lineTo(0,4);x.lineTo(-7,10);x.closePath();x.stroke()}
 else if(k==='home'){x.moveTo(-9,10);x.lineTo(-9,-2);x.lineTo(0,-10);x.lineTo(9,-2);x.lineTo(9,10);x.closePath();x.fill()}
 else if(k==='search'){x.arc(-2,-2,7,0,6.3);x.moveTo(3,3);x.lineTo(9,9);x.stroke()}
 else if(k==='add'){x.rect(-9,-9,18,18);x.moveTo(0,-5);x.lineTo(0,5);x.moveTo(-5,0);x.lineTo(5,0);x.stroke()}
 else if(k==='reel'){x.rect(-9,-9,18,18);x.moveTo(-9,-4);x.lineTo(9,-4);x.moveTo(-2,0);x.lineTo(3,3);x.lineTo(-2,6);x.closePath();x.stroke()}
 else if(k==='dm'){x.arc(0,0,10,0,6.3);x.stroke();x.beginPath();x.moveTo(-5,3);x.lineTo(-1,-2);x.lineTo(2,1);x.lineTo(6,-3);x.stroke()}
 x.restore()}
function igScr(T){const W=360,H=780,[cv,x]=scv('ig',W,H),ims=RPIMG.ig||[],PH=500,N=45,cyc=180,t=T%cyc;x.imageSmoothingEnabled=true;x.textBaseline='middle';
 let pos=0;{const step=4;const k=Math.floor(t/step),u=(t%step)/step,st=i=>PH*(.8+rnd(i+11)*.5);for(let i=0;i<k;i++)pos+=st(i);pos+=st(k)*ease(clamp((u-.55)/.3,0,1))}
 x.fillStyle='#000';x.fillRect(0,0,W,H);const top=92,bot=H-70;x.save();x.beginPath();x.rect(0,top,W,bot-top);x.clip();
 const SR=110;let y=top-pos;
 if(y>top-SR){for(let i=0;i<5;i++){const cx=46+i*76,cy=y+46,g=x.createLinearGradient(cx-32,cy+32,cx+32,cy-32);g.addColorStop(0,'#feda75');g.addColorStop(.5,'#d62976');g.addColorStop(1,'#4f5bd5');x.fillStyle=g;x.beginPath();x.arc(cx,cy,33,0,6.3);x.fill();x.fillStyle='#000';x.beginPath();x.arc(cx,cy,30,0,6.3);x.fill();const im=ims[(i*3+1)%Math.max(1,ims.length)];x.save();x.beginPath();x.arc(cx,cy,27,0,6.3);x.clip();if(im){const s=Math.min(im.width,im.height)*.5;x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,cx-27,cy-27,54,54)}x.restore();x.fillStyle='#f5f5f5';x.font='11px Arial';x.textAlign='center';x.fillText(i?IGU[i].slice(0,10):'Your story',cx,cy+46)}}
 const i0=Math.max(0,Math.floor((pos-SR)/PH)-1);
 for(let i=i0;i<i0+3;i++){const py=top+SR+i*PH-pos;if(py>bot)break;const pi=i%N,u=IGU[(pi*7+3)%IGU.length],im=ims.length?ims[(pi*5)%ims.length]:null;
  x.fillStyle='hsl('+(pi*53%360)+',45%,48%)';x.beginPath();x.arc(26,py+26,16,0,6.3);x.fill();x.fillStyle='#fff';x.font='bold 13px Arial';x.textAlign='left';x.fillText(u,50,py+21);x.font='11px Arial';x.fillStyle='#ddd';x.fillText(['Los Angeles','Brooklyn, NY','Atlanta','Original audio','Houston, TX'][pi%5],50,py+36);x.fillStyle='#fff';x.font='bold 14px Arial';x.fillText('···',W-30,py+24);
  const iy=py+52;if(im){const s=Math.min(im.width,im.height)*(.78+rnd(pi+5)*.22),sx=(im.width-s)*(.3+.4*rnd(pi+9)),sy=(im.height-s)*(.3+.4*rnd(pi+13));x.drawImage(im,sx,sy,s,s,0,iy,W,W)}else{x.fillStyle='#222';x.fillRect(0,iy,W,W)}
  const ay=iy+W+22,liked=rnd(pi+40)<.35;igIcon(x,'heart',20,ay,24,liked?'#ff3040':'#fff',liked);igIcon(x,'com',58,ay,22,'#fff');igIcon(x,'send',96,ay,22,'#fff');igIcon(x,'save',W-20,ay,22,'#fff');
  x.fillStyle='#fff';x.font='bold 13px Arial';x.textAlign='left';x.fillText((1200+Math.floor(rnd(pi)*48000)).toLocaleString('en-US')+' likes',12,ay+28);x.font='13px Arial';x.fillText('',12,ay+48);x.font='bold 13px Arial';const uw=x.measureText(u).width;x.fillText(u,12,ay+48);x.font='13px Arial';x.fillText(IGC[(pi*3)%IGC.length],18+uw,ay+48);x.fillStyle='#a8a8a8';x.fillText('View all '+(12+Math.floor(rnd(pi+2)*300))+' comments',12,ay+68);x.font='11px Arial';x.fillText((1+pi%9)+' hours ago',12,ay+86)}
 x.restore();
 x.fillStyle='#000';x.fillRect(0,0,W,top);x.fillStyle='#fff';x.font='bold 16px Arial';x.textAlign='center';x.fillText('9:41',58,26);x.fillStyle='#000';x.beginPath();x.roundRect?x.roundRect(W/2-58,10,116,32,16):x.rect(W/2-58,10,116,32);x.fill();
 x.fillStyle='#fff';[0,1,2,3].forEach(j=>x.fillRect(W-92+j*6,30-(j+1)*3,4,(j+1)*3));x.strokeStyle='#fff';x.lineWidth=1.5;x.strokeRect(W-58,20,26,12);x.fillRect(W-56,22,18,8);x.fillRect(W-31,24,2,4);
 x.font='italic 600 28px "Snell Roundhand","Brush Script MT",Georgia,cursive';x.textAlign='left';x.fillText('Instagram',14,70);igIcon(x,'heart',W-66,70,24,'#fff');igIcon(x,'dm',W-26,70,24,'#fff');
 x.fillStyle='#000';x.fillRect(0,bot,W,H-bot);x.fillStyle='#262626';x.fillRect(0,bot,W,1);['home','search','add','reel'].forEach((k,j)=>igIcon(x,k,36+j*72,bot+24,24,'#fff'));x.fillStyle='hsl(30,50%,50%)';x.beginPath();x.arc(36+4*72,bot+24,12,0,6.3);x.fill();x.fillStyle='#fff';x.beginPath();x.roundRect?x.roundRect(W/2-66,H-12,132,5,3):x.rect(W/2-66,H-12,132,5);x.fill();
 /* the screen's rounded corners */
 x.globalCompositeOperation='destination-in';x.beginPath();x.roundRect?x.roundRect(0,0,W,H,46):x.rect(0,0,W,H);x.fill();x.globalCompositeOperation='source-over';return cv}

function drawRProp(c,G,Sx,T,la){const k=ST.rprop||'floppy',im=RPIMG[k];if(k==='floppy'||!im)return;c.save();c.drawImage(im,RPAT[0],RPAT[1]);let q=RSQ[k];
 if(k==='iphone'&&+ST.iprot){const a=+ST.iprot*Math.PI/180,cx=q.reduce((v,p)=>v+p[0],0)/4,cy=q.reduce((v,p)=>v+p[1],0)/4,co=Math.cos(a),si=Math.sin(a);q=q.map(p=>[cx+(p[0]-cx)*co-(p[1]-cy)*si,cy+(p[0]-cx)*si+(p[1]-cy)*co])}
 if(k==='gameboy'||k==='mini'){c.save();quadPath(c,q);c.clip();c.globalCompositeOperation='multiply';c.globalAlpha=k==='mini'?.82:.9;warp(c,k==='gameboy'?gbScr(T):miniScr(T,Sx,la),q,4);c.restore()}
 else{const ip=k==='iphone',scr=k==='bberry'?bbScr(T):k==='sidekick'?skScr(T):igScr(T);c.save();quadPath(c,q);c.clip();if(!ip){c.fillStyle='#000';c.fill()}warp(c,scr,q,ip?6:4);
  const g=c.createLinearGradient(q[0][0],q[0][1],q[2][0],q[2][1]);g.addColorStop(0,'rgba(255,255,255,.10)');g.addColorStop(.45,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.15)');if(k==='sidekick'){const cx0=(q[0][0]+q[2][0])/2,cy0=(q[0][1]+q[2][1])/2,v=c.createRadialGradient(cx0,cy0,40,cx0,cy0,150);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,10,30,.28)');c.fillStyle=v;c.fill();const r=c.createLinearGradient(q[0][0],q[0][1],q[3][0],q[3][1]);r.addColorStop(0,'rgba(255,255,255,.14)');r.addColorStop(.35,'rgba(255,255,255,.02)');r.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=r;c.fill()}c.fillStyle=g;if(!ip){c.fill();c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.5)';quadPath(c,q);c.stroke()}c.restore();
  c.save();c.globalCompositeOperation='lighter';const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,gl=c.createRadialGradient(cx,cy,30,cx,cy,170);gl.addColorStop(0,'rgba(120,160,255,.07)');gl.addColorStop(1,'rgba(120,160,255,0)');c.fillStyle=gl;c.fillRect(cx-170,cy-170,340,340);c.restore()}
 c.restore()}

function deck(c,G,SRC,ang,S,pw){const D=G.deck,u=G.u||1,V=vinylOf(SRC,D,D.vr||D.r-28),VR=V.VR;
 c.save();c.beginPath();c.arc(D.cx,D.cy,VR,0,6.2832);c.clip();c.drawImage(V.A,D.cx-VR,D.cy-VR);c.translate(D.cx,D.cy);c.rotate(ang);c.drawImage(V.sp,-VR,-VR);c.restore();
 const R=D.lab,t=String((S&&S.title)||'SAMPLE PACK').toUpperCase(),hue=hashStr(t)%360;c.save();c.translate(D.cx,D.cy);c.rotate(ang);
 const g=c.createRadialGradient(-R*.3,-R*.3,R*.1,0,0,R);g.addColorStop(0,'hsl('+hue+',48%,40%)');g.addColorStop(1,'hsl('+hue+',52%,22%)');c.fillStyle=g;c.beginPath();c.arc(0,0,R,0,6.2832);c.fill();
 c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1.4*u;c.beginPath();c.arc(0,0,R*.86,0,6.2832);c.stroke();
 c.fillStyle='rgba(255,246,225,.92)';c.textAlign='center';c.textBaseline='middle';c.font='700 '+Math.round(R*.2)+'px Anton, Oswald, sans-serif';c.fillText('MZPRD',0,-R*.48);
 const f=q=>'700 '+q+'px Oswald, sans-serif',sz=fitFont(c,t,f,Math.round(R*.2),R*1.45);c.font=f(sz);c.fillText(t,0,R*.42);c.font='600 '+Math.round(R*.11)+'px Oswald, sans-serif';c.fillStyle='rgba(255,246,225,.7)';c.fillText('SAMPLE PACK   33 1/3',0,R*.66);c.restore();
 c.fillStyle='#c9c9cc';c.beginPath();c.arc(D.cx,D.cy,5*u,0,6.2832);c.fill();c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.arc(D.cx+1.2*u,D.cy+1.2*u,2*u,0,6.2832);c.fill();
 c.save();c.beginPath();c.arc(D.cx,D.cy,VR,0,6.2832);c.clip();c.globalCompositeOperation='lighter';c.globalAlpha=.85;c.drawImage(V.H,D.cx-VR,D.cy-VR);c.restore();
 if(D.strobe&&pw>.5){c.save();c.globalCompositeOperation='lighter';const r=c.createRadialGradient(D.strobe[0],D.strobe[1],2,D.strobe[0],D.strobe[1],70*u);r.addColorStop(0,'rgba(255,90,40,.45)');r.addColorStop(1,'rgba(255,90,40,0)');c.fillStyle=r;c.fillRect(D.strobe[0]-70*u,D.strobe[1]-70*u,140*u,140*u);c.restore()}}
/* pad order on the MPC60 II, top row first */
const PAD_NAMES=['PERC 1','PERC 2','PERC 3','PERC 4','RIDE 1','RIDE 2','CRASH 1','CRASH 2','TOM 1','TOM 2','TOM 3','TOM 4','HIHAT','SNARE 1','SNARE 2','BASS'];

let BEATS0=[],PACKS=[],CUT=null,ST=null,S=null,beats=[],AC=null,IMG=null,PV={playing:false,raf:0,src:null,t0:0},busy=false;
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
 {n:'PERC GROOVE',kick:8,sn:[14,13],hat:5,mid:[3,2,1,0],hi:[7,6,4,12],weak:[9,10,11,15]},
 {n:'PACK PADS A',pack:1,kick:8,sn:[10,10],hat:9,mid:[0,1,2,3],hi:[4,5,6,7],weak:[11,11,11,11]},
 {n:'PACK PADS B',pack:1,kick:9,sn:[11,11],hat:10,mid:[4,5,6,7],hi:[0,1,2,3],weak:[8,8,8,8]}];
const hashStr=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const NBK=6,kitFor=id=>String(id).startsWith('p:')?NBK+hashStr('mpc'+id)%2:hashStr('mpc'+id)%NBK;
function layout(raw,kit){const K=KITS[kit],hits=[],vmin=[.55,.3,.12][ST.sens==null?1:ST.sens],nd=(ST.nudge||0)/1000,add=(h,pad,v,src)=>{if(pad==null)return;if(v>=(src==='d'?Math.min(.1,vmin):vmin))hits.push({t:Math.max(0,h.t+nd),pad,v,src:src||'d'})};
 raw.kick.forEach(h=>add(h,K.kick,h.v));let sc=0;raw.snare.forEach(h=>add(h,h.v>.62?K.sn[0]:K.sn[(sc++%2)?1:0],h.v));raw.hat.forEach(h=>add(h,K.hat,h.v*.9));
 if((ST.sens==null?1:ST.sens)===2||K.pack)raw.mid.forEach(h=>add(h,K.mid[h.bin],h.v,'m'+h.bin));raw.hi.forEach(h=>add(h,K.hi[h.bin],h.v*.95,'h'+h.bin));(raw.keys||[]).forEach(h=>add(h,K.weak[h.bin],h.v*.9,'k'+h.bin));
 /* focus on the drums: every kick, snare and hi-hat is tapped; a sample / chop / percussion pad only when it stands out (strong), is not on top of a drum hit, and the hands have room (one at most every ~0.45 s) */
 const drum=new Set([K.kick,...K.sn,K.hat]),dt=hits.filter(h=>drum.has(h.pad)).map(h=>h.t).sort((a,b)=>a-b),near=t=>{let lo=0,hi=dt.length;while(lo<hi){const m=(lo+hi)>>1;if(dt[m]<t)lo=m+1;else hi=m}return(lo<dt.length&&dt[lo]-t<.12)||(lo>0&&t-dt[lo-1]<.12)};
 hits.sort((a,b)=>a.t-b.t||(drum.has(b.pad)?1:0)-(drum.has(a.pad)?1:0));const d0=dt.length?dt[0]-.05:1e9,own={};let lastO=-9;const kept=hits.filter(h=>{if(drum.has(h.pad))return true;if(own[h.pad]&&own[h.pad]!==h.src)return false;const intro=h.t<d0;if(h.v<(intro?.3:.5)||near(h.t)||h.t-lastO<(intro?.2:.35))return false;own[h.pad]=h.src;lastO=h.t;return true});
 const per=PAD_NAMES.map(()=>[]);kept.forEach(h=>per[h.pad].push(h));return{hits:kept,per}}
function pressAt(S,pad,T){const a=S.per[pad];if(!a||!a.length)return 0;let lo=0,hi=a.length-1,r=-1;const tt=T+.006;while(lo<=hi){const m=(lo+hi)>>1;if(a[m].t<=tt){r=m;lo=m+1}else hi=m-1}if(r<0)return 0;const dt=tt-a[r].t;if(dt>.5)return 0;const k=.6+.4*a[r].v;return k*(dt<.03?dt/.03:Math.exp(-(dt-.03)/.085))}

/* ---------- drawing (a pure function of time, so preview and export match) ---------- */
function fitFont(c,txt,font,max,w){let s=max;c.font=font(s);while(s>8&&c.measureText(txt).width>w){s-=1;c.font=font(s)}return s}
function px1(img,x,y){const cv=px1.cv||(px1.cv=document.createElement('canvas'));cv.width=cv.height=1;const q=cv.getContext('2d');q.drawImage(img,Math.round(x)-1,Math.round(y)-1,3,3,0,0,1,1);const d=q.getImageData(0,0,1,1).data;return 'rgb('+d[0]+','+d[1]+','+d[2]+')'}
function sampleColors(){try{if(IMG){PH.btnPlate=px1(IMG,700,712);PH.faderPlate=px1(IMG,197,700)}if(DESKS.h)DK.faderPlate=px1(DESKS.h,DK.faderPt[0],DK.faderPt[1]);if(DESKS.v)DKV.faderPlate=px1(DESKS.v,DKV.faderPt[0],DKV.faderPt[1])}catch(e){}}
const PCOL=new Map();
function plateCol(G,src,i){if(!G.sampled)return G.plate||PH.plate;const key=G.id+i+(src?oid(src):'');if(PCOL.has(key))return PCOL.get(key);const P=G.pad,col=i%4,row=Math.floor(i/4);let c;try{c=px1(src,P.x0+col*P.px-(P.px-P.w)/2,P.y0+row*P.py+P.h/2)}catch(e){c='#777'}PCOL.set(key,c);return c}
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
 if(G.deck)deck(c,G,SRC,o.spin||0,S,o.power==null?1:o.power);if(G.arm&&o.arm)drawArm(c,G,DESKS.arm,o.arm);
 if(o.fx){knob(c,SRC,G.vol[0],G.vol[1],G.vol[2],o.fx.vol);if(G.con)knob(c,SRC,G.con[0],G.con[1],G.con[2],o.fx.con);if(G.fader)fader(c,G,SRC,o.fx.fader*u);for(const k in G.btn)button(c,SRC,G,G.btn[k],o.fx.btn[k]||0);if(G.wheel&&o.fx.wheel!=null)wheelMark(c,G.wheel,o.fx.wheel)}
 for(let i=0;i<(G.rows||4)*4;i++){const col=i%4,row=Math.floor(i/4),x=P.x0+col*P.px,y=P.y0+row*P.py,p=o.press(i);if(!(p>.004))continue;
  c.fillStyle=plateCol(G,SRC,i);c.fillRect(x-3*u,y-3*u,P.w+6*u,P.h+6*u);
  const k=1-.12*p,w=P.w*k,h=P.h*k,px=x+(P.w-w)/2,py=y+(P.h-h)/2+1.6*u*p;
  c.save();c.beginPath();c.rect(px,py,w,h);c.clip();c.drawImage(SRC,x,y,P.w,P.h,px,py,w,h);
  c.fillStyle='rgba(0,0,0,'+(.58*p).toFixed(3)+')';c.fillRect(px,py,w,h);
  if(p>0){c.fillStyle='rgba(0,0,0,'+(.3*p).toFixed(3)+')';c.fillRect(px,py,w,2.2*u);c.fillRect(px,py,2.2*u,h)}c.restore();
  if(p>0){c.strokeStyle='rgba(20,20,22,'+(.45*p).toFixed(3)+')';c.lineWidth=1.2*u;c.strokeRect(px+.6*u,py+.6*u,w-1.2*u,h-1.2*u)}}
 /* the screen: green and on */
 const cM=c,EM=G.emit?emitCtx(G):null;if(EM)c=EM.x;
 const L0=G.lcd,s1=L0.h/54,L={x:0,y:0,w:L0.w/s1,h:54},lt=o.lt,run=o.run,bl=60/(S.bpm||90);
 c.save();c.translate(L0.x,L0.y);c.scale(s1,s1);c.beginPath();c.rect(L.x,L.y,L.w,L.h);c.clip();
 const LG=lcdGlass(L.w);if(!EM)c.drawImage(LG.base,L.x,L.y,L.w,L.h);
 c.fillStyle='#1c3a12';c.textBaseline='middle';c.textAlign='left';
 const pad2=n=>String(n).padStart(2,'0'),f=q=>q+"px VT323,monospace";
 const l1=(o.lcd?o.lcd[0]:(o.head||S.lcd||S.title||'BEAT')).toUpperCase(),sz=fitFont(c,l1,f,23,L.w-16);c.font=f(sz);c.fillText(l1,L.x+8,L.y+11);
 let l2,l3;
 if(o.lcd){l2=o.lcd[1];l3=o.lcd[2]}
 else if(o.head){l2=o.sub||'';l3='LOADING...'}
 else{const x=(lt-(S.off||0))/bl,n=x<0?0:Math.floor(x);l2='BAR '+String(Math.floor(n/4)+1).padStart(3,'0')+'   BEAT '+(n%4+1);
  l3=(run?'PLAY ':'READY ')+mmss(clamp(lt,0,S.dur))+'   '+(o.trk?'TRK '+pad2(o.trk[0])+'/'+pad2(o.trk[1]):(S.bpm||'--')+' BPM  '+(S.key||'').toUpperCase());
  if(o.loading&&lt<.6)l3='LOADING...';
  if(L.w>180)for(let q=0;q<4;q++){const on=run&&lt>=0&&q===n%4,bx=L.x+L.w-12-(3-q)*12;c.fillStyle=on?'#1c3a12':'rgba(28,58,18,.22)';c.fillRect(bx,L.y+22,8,7)}}
 c.font=f(15);c.fillStyle='#1c3a12';c.fillText(l2,L.x+8,L.y+26);c.fillText(l3,L.x+8,L.y+39);
 c.fillStyle='rgba(28,58,18,.25)';c.fillRect(L.x+8,L.y+47,L.w-16,3);c.fillStyle='#1c3a12';c.fillRect(L.x+8,L.y+47,(L.w-16)*clamp(lt/Math.max(1,S.dur),0,1),3);

 const bt=o.boot==null?-1:o.boot,sbv=bt<0?1:bt<.45?0:bt<.95?((bt-.45)/.5)*(.5+.5*Math.sin(bt*140)):1;
 if(bt>=0){if(!EM){c.drawImage(LG.base,L.x,L.y,L.w,L.h);c.fillStyle='rgba(6,14,4,'+(.93*(1-sbv)).toFixed(3)+')';c.fillRect(L.x,L.y,L.w,L.h)}else c.clearRect(L.x,L.y,L.w,L.h);
  if(sbv>.6&&bt>=1.0){c.fillStyle='#1c3a12';c.textAlign='left';c.textBaseline='middle';
   if(bt<2.4){c.font=f(20);c.fillText(G.boot?G.boot[0]:'AKAI PROFESSIONAL MPC60 II',L.x+8,L.y+12);c.font=f(15);c.fillText(G.boot?G.boot[1]:'SOFTWARE V3.10   16 PADS',L.x+8,L.y+27);c.fillText('LOADING FROM DISK'+'...'.slice(0,1+Math.floor(bt*4)%3),L.x+8,L.y+40);c.fillStyle='rgba(28,58,18,.25)';c.fillRect(L.x+8,L.y+47,L.w-16,3);c.fillStyle='#1c3a12';c.fillRect(L.x+8,L.y+47,(L.w-16)*clamp((bt-1)/1.3,0,1),3)}
   else{const nm=(S.lcd||S.title||'BEAT').toUpperCase(),n=Math.min(nm.length,Math.floor((bt-2.4)/.07)),shown=nm.slice(0,n)+(Math.floor(bt*5)%2&&n<nm.length?'_':'');const sz2=fitFont(c,nm,f,23,L.w-16);c.font=f(sz2);c.fillText(shown,L.x+8,L.y+12);c.font=f(15);c.fillText(n>=nm.length?'READY':'LOADING BEAT',L.x+8,L.y+27);if(S.bpm)c.fillText('BPM '+S.bpm,L.x+8,L.y+40)}}}
 /* power down (the Sample to Beat episode): the picture holds for a moment, then collapses to a bright line and goes dark */
 const pd=o.pdown==null?-1:o.pdown;let pk=0;if(pd>=0){pk=clamp((pd-.45)/.5,0,1);if(!EM){c.fillStyle='rgba(6,14,4,'+(.95*pk).toFixed(3)+')';c.fillRect(L.x,L.y,L.w,L.h)}if(pk>0&&pk<1){const hh=Math.max(1,L.h*(1-pk)*.1);c.fillStyle='rgba(190,255,180,'+(.55*(1-pk)).toFixed(3)+')';c.fillRect(L.x+L.w*.12*pk,L.y+L.h/2-hh/2,L.w*(1-.24*pk),hh)}}
 if(!EM)c.drawImage(LG.scan,L.x,L.y,L.w,L.h);
 c.restore();if(EM){c=cM;emitDraw(c,G,EM,(bt>=0?sbv:1)*(1-pk))}else{c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1;c.strokeRect(L0.x+.5,L0.y+.5,L0.w-1,L0.h-1)}
 /* a lit screen throws a little green light on the case */
 if(G.glow){c.save();c.globalCompositeOperation='lighter';const rg=c.createRadialGradient(L0.x+L0.w/2,L0.y+L0.h/2,10,L0.x+L0.w/2,L0.y+L0.h/2,L0.w*.95);rg.addColorStop(0,'rgba(110,255,110,'+((run?.2:.1)*sbv*(1-pk)).toFixed(3)+')');rg.addColorStop(1,'rgba(110,255,110,0)');c.fillStyle=rg;c.fillRect(L0.x-L0.w,L0.y-L0.h*3,L0.w*3,L0.h*8);c.restore()}
 /* lights */
 const led=(x,y,on,col)=>{c.fillStyle=on?col:'rgba(40,10,10,.9)';c.fillRect(x-4*u,y-2*u,8*u,3.4*u);if(on){const r=c.createRadialGradient(x,y,1,x,y,14*u);r.addColorStop(0,'rgba(255,60,40,.75)');r.addColorStop(1,'rgba(255,60,40,0)');c.fillStyle=r;c.fillRect(x-16*u,y-16*u,32*u,32*u)}};
 const ph=((lt%(bl*2))+bl*2)%(bl*2);
 if(G.leds){led(G.leds.play[0],G.leds.play[1],run,'#ff3a24');led(G.leds.rec[0],G.leds.rec[1],run,'#ff3a24');led(G.leds.over[0],G.leds.over[1],run&&ph<bl*.5,'#ff3a24')}
 if(o.power!=null&&G.btn&&G.btn.power)powerSwitch(c,G,u,o.power);
 c.restore()}
/* a rocker power switch with a POWER label and a small green light: the rocker tips to the lit "I" side when the hand presses it (o.power 0 = off, 1 = on) */
function powerSwitch(c,G,u,p){const r=G.btn.power,x=r[0],y=r[1],w=r[2],h=r[3],pl=4*u;c.save();
 c.fillStyle='#070708';c.beginPath();c.roundRect?c.roundRect(x-pl*.5,y-pl*.5,w+pl,h+pl,3*u):c.rect(x-pl*.5,y-pl*.5,w+pl,h+pl);c.fill();c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=.8*u;c.stroke();
 const hw=w/2,onSide=p>.5,drawHalf=(hx,up)=>{const g=c.createLinearGradient(0,y,0,y+h);if(up){g.addColorStop(0,'#e4e2dc');g.addColorStop(1,'#a9a69d')}else{g.addColorStop(0,'#3a3a3d');g.addColorStop(1,'#1d1d20')}c.fillStyle=g;const yy=up?y:y+h*.12,hh=up?h:h*.88;c.beginPath();c.roundRect?c.roundRect(hx+.6*u,yy,hw-1.2*u,hh,2*u):c.rect(hx+.6*u,yy,hw-1.2*u,hh);c.fill()};
 drawHalf(x,!onSide);drawHalf(x+hw,onSide);
 c.fillStyle=onSide?'#262628':'#c9c7c0';c.font='700 '+Math.round(h*.45)+'px Montserrat,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('O',x+hw/2,y+h*.52);c.fillStyle=onSide?'#262628':'#6b6b6e';c.fillText('I',x+hw*1.5,y+h*.52);
 c.fillStyle=G.powLab||'rgba(58,55,48,.85)';c.font='700 '+Math.round(h*.34)+'px Montserrat,sans-serif';c.fillText('POWER',x+w/2,y-h*.42);
 const lx=x+w+pl+4*u,ly=y+h/2;c.fillStyle=onSide?'#3dff5a':'#102614';c.beginPath();c.arc(lx,ly,2.4*u,0,6.2832);c.fill();if(onSide){const rg=c.createRadialGradient(lx,ly,1,lx,ly,12*u);rg.addColorStop(0,'rgba(61,255,90,.55)');rg.addColorStop(1,'rgba(61,255,90,0)');c.fillStyle=rg;c.fillRect(lx-12*u,ly-12*u,24*u,24*u)}
 c.restore()}
/* the start of every video: the unit is dark, a hand switches it on (the screen boots and types the beat name), then the hand presses PLAY START and the beat begins */
const INTRO=4.2,PW=.6,startOn=()=>!!(ST&&ST.start!==false),leadOf=()=>startOn()?INTRO:LEAD;
const preHits=L=>[{t:PW-L,pad:-1,btn:'power',v:.8},{t:-.27,pad:-1,btn:'start',v:.8}];
const tlOne=Sx=>{const L=leadOf();Object.keys(Sx).forEach(k=>{if(k.startsWith('_hh'))delete Sx[k]});Sx.pre=startOn()?preHits(L):null;if(packMode())(Sx.pre=Sx.pre||[]).push({t:Sx.dur,pad:-1,btn:'end',v:.8});return{kind:'one',tracks:[{S:Sx,start:L,dur:Sx.dur}],total:L+Sx.dur+TAIL,lead:L,title:Sx.title,intro:startOn()?INTRO:0}};
function derive(X,fmt,cu){const E=ST.eng,sub=E.sub&&!cu,loop=E.loop&&X.kind==='one'&&fmt==='v';if(!sub&&!loop)return X;let tracks,total;
 if(loop){const Sx=X.tracks[0].S,xf=Math.min(3.8,Sx.dur*.3),lead=.12;
  const A={S:Sx,start:lead,off:xf,dur:Sx.dur-xf,fi:.04,fo:xf},B={S:Sx,start:lead+Sx.dur-2*xf,off:0,dur:xf,fi:xf,fo:0};tracks=[A,B];total=A.start+A.dur}
 else{tracks=X.tracks.map(t=>Object.assign({},t));const l=tracks[tracks.length-1];total=l.start+l.dur+3.6}
 return{kind:X.kind,tracks,total,lead:X.lead,title:X.title,sub:!!sub,subT0:sub?total-4.2:0,loop,intro:loop?0:(X.intro||0),make:X.make}}
const XF=fmt=>{const b=X();if(!b)return null;const k=fmt==='v'?'_v':fmt==='c'?'_c':'_h';if(!b[k])b[k]=derive(b,fmt==='c'?'v':fmt,fmt==='c');const d=b[k];
 if(!(packMode()&&ST.eng&&ST.eng.logo&&fmt!=='c'&&!d.loop&&b.kind==='one'))return d;if(!d._card)d._card={kind:d.kind,tracks:d.tracks,lead:d.lead,title:d.title,intro:d.intro,card:CARD,base:d,total:d.total+CARD,coverId:ST.beat};return d._card};
function dropV(){if(S&&S.tl){S.tl._v=null;S.tl._h=null;S.tl._c=null}if(TP){TP._v=null;TP._h=null;TP._c=null}}
const trackAt=(X,T)=>{let k=0;for(let i=0;i<X.tracks.length;i++)if(T>=X.tracks[i].start)k=i;return k};
const SKINS=[['orig','The original (aged cream)'],['g1','Vice City'],['g2','8-bit legend (Kanye)'],['g3','Call of Duty camo'],['g4','Arcade invaders'],['g5','Street Fighter II'],['g6','007 GoldenEye'],['g7','YouTube Gaming']];
/* each MPC skin's own screen (measured on its photo, 16:9 desk coordinates): blue screens glow (backlit text), the green one keeps the classic LCD */
const SKLCD={g1:[1180,308,304,60],g2:[1178,268,290,106],g3:[1184,307,276,66],g4:[1167,307,271,66],g5:[1194,302,286,66],g6:[1167,302,301,66],g7:[1167,307,271,63]};
const SKEM={fg:'#eaf3ff',bg:'rgba(70,120,255,.22)'};
const DKL0={lcd:DK.lcd,glow:DK.glow},DKVL0={lcd:DKV.lcd,glow:DKV.glow};
/* 9:16 desk: the same machine, scaled (from the pad grid) */
const toV=r=>{const sx=75.3/83.7,sy=76.8/82.3;return{x:r[0]*sx+258-712*sx,y:r[1]*sy+935.5-570*sy,w:r[2]*sx,h:r[3]*sy}};
function applySkinLcd(){const id=ST.skin||'orig',r=SKLCD[id];if(!r){DK.lcd=DKL0.lcd;DK.glow=DKL0.glow;DKV.lcd=DKVL0.lcd;DKV.glow=DKVL0.glow;DK.emit=DKV.emit=null;return}
 DK.lcd={x:r[0],y:r[1],w:r[2],h:r[3]};DKV.lcd=toV(r);const em=id==='g3'?null:SKEM;DK.emit=DKV.emit=em;DK.glow=DKV.glow=!em}
const SKINIMG={};
async function loadSkin(id,fmt){if(!SKINS.some(k=>k[0]===id)){ST.skin='orig';id='orig'}applySkinLcd();if(id==='orig')return;const k=(fmt==='v'||fmt==='c')?'v':'h';SKINIMG[id]=SKINIMG[id]||{};if(!SKINIMG[id][k])SKINIMG[id][k]=await loadImg('mpc/desk_'+k+'_s'+id+'.webp?v=1')}
let STUDIO=null;
/* the white-studio photo, its cutout and the desk backgrounds for thumbnails: only loaded when something asks for them */
function ensureStudio(){if(STUDIO)return STUDIO;return STUDIO=(async()=>{IMG=await loadImg('mpc/mpc60.webp');CUT=await loadImg('mpc/mpc60_cut.webp');DESKBG.h=await loadImg('mpc/bg_h.webp?v=1');DESKBG.v=await loadImg('mpc/bg_v.webp?v=1');if(IMG&&CUT)WARM={cut:warmVer(CUT),photo:warmVer(IMG)};sampleColors()})()}
const SCN={};
async function ensureScene(fmt){fmt=fmt||ST.fmt;const tall=fmt==='v'||fmt==='c';
 if(packMode()){const k0=ST.pskin||'0',tk=ST.tskin||'0',k=k0+'|'+tk;if(!PSK[k]){let im=await loadImg(k0==='0'?'mpc/pack_h_noarm.webp?v=1':'mpc/pack_h_s'+k0+'.webp?v=2');if(tk!=='0'){const ov=await loadImg('mpc/tt_s'+tk+'.png?v=6'),c2=document.createElement('canvas');c2.width=im.width;c2.height=im.height;const x2=c2.getContext('2d');x2.drawImage(im,0,0);if(ov)x2.drawImage(ov,990,200);im=c2}const cv=document.createElement('canvas');cv.width=DKPV.W;cv.height=DKPV.H;cv.getContext('2d').drawImage(im,-PX,0);PSK[k]={h:im,v:cv}}DESKS.ph=PSK[k].h;DESKS.pv=PSK[k].v;setPackLcd(k0);if(!DESKS.arm)DESKS.arm=await loadImg('mpc/pack_arm.webp?v=1');return}
 if(ST.scene==='white'){await ensureStudio();return}
 if(!tall){if(!DESKS.h)DESKS.h=await loadImg('mpc/desk_nocan.webp?v=1');if(!DESKS.h0&&(ST.can||{}).id==='orig'&&(!ST.skin||ST.skin==='orig'))DESKS.h0=await loadImg('mpc/desk.webp?v=2');if(!DESKS.h)DESKS.h=DESKS.h0}
 else if(!DESKS.v)DESKS.v=await loadImg('mpc/desk_v.webp?v=2');
 await loadSkin(ST.skin||'orig',fmt);await loadProp();await loadRProp();if(tall&&!DESKS.vpatch)DESKS.vpatch=await loadImg('mpc/desk_v_nofloppy.webp?v=1');
 const c=ST.can||{};if(!tall&&c.id!=='orig'&&c.id!=='none'&&!CANS.length)await loadCans();
 if(!tall&&c.id==='orig'&&ST.skin&&ST.skin!=='orig'&&!CANS.length)await loadCans();
 sampleColors()}
const sceneOK=fmt=>packMode()?!!((fmt==='v'||fmt==='c')?DESKS.pv:DESKS.ph):ST.scene==='white'?!!(IMG&&CUT):!!((fmt==='v'||fmt==='c')?DESKS.v:DESKS.h);
let GR=null,OC=null,DESKS={h:null,v:null,h0:null},DESKBG={h:null,v:null},WARM=null;
function warmVer(img){const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;const x=cv.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='multiply';x.fillStyle='rgb(255,212,168)';x.fillRect(0,0,cv.width,cv.height);x.globalCompositeOperation='destination-in';x.drawImage(img,0,0);return cv}
const sceneOf=fmt=>packMode()?(DESKS['p'+fmt]?{G:GEO['pack'+fmt],img:DESKS['p'+fmt]}:null):(ST.scene!=='white'&&DESKS[fmt]&&GEO['desk'+fmt])?{G:GEO['desk'+fmt],img:(ST.skin&&ST.skin!=='orig'&&SKINIMG[ST.skin]&&SKINIMG[ST.skin][fmt])||((fmt==='h'&&(ST.can||{}).id==='orig'&&DESKS.h0)?DESKS.h0:DESKS[fmt])}:null;
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
function handHits(Sx,G){const ck='_hh'+(G&&G.id||'');if(Sx[ck])return Sx[ck];const K=Sx.raw&&Sx.kit!=null&&KITS[Sx.kit]?KITS[Sx.kit]:null,o={l:[],r:[]},last={l:-9,r:-9};
 /* kick and snare are never skipped: if the hand is busy, the other hand takes it (one column across), or it replaces that hand's last hi-hat / sample tap. Hi-hats and samples give way. */
 const isMain=h=>h.pad>=0&&(K?(h.pad===K.kick||K.sn.includes(h.pad)):(h.pad===15||h.pad===14||h.pad===13)),gap=.1,reach=(k,p)=>k==='l'?(p%4)<=2:(p%4)>=1;
 const list=(Sx.pre||[]).concat(Sx.hits||[]).slice().sort((a,b)=>a.t-b.t||(isMain(b)?1:0)-(isMain(a)?1:0));
 list.forEach(h=>{let key,hh=h;if(h.btn){const pc=btnC(G||{},h.btn);if(!pc)return;key=(h.btn==='power'&&G&&G.pad&&pc[0]<G.pad.x0+1.5*G.pad.px)?'l':'r';hh={t:h.t,pad:-1,v:h.v,pos:pc}}else key=(h.pad%4)<2?'l':'r';
  if(h.t-last[key]<gap){const ot=key==='l'?'r':'l';
   if(!h.btn&&reach(ot,h.pad)&&h.t-last[ot]>=gap)key=ot;
   else if(isMain(h)){const L=o[key],pv=L[L.length-1];if(pv&&!isMain(pv)&&pv.pad>=0){L.pop();const pp=L[L.length-1];last[key]=pp?pp.t:-9;if(h.t-last[key]<gap*.6)return}else{const L2=o[ot],p2=L2[L2.length-1];if(reach(ot,h.pad)&&p2&&!isMain(p2)&&p2.pad>=0){L2.pop();key=ot}else if(pv&&pv.pad>=0&&reach(ot,pv.pad)&&(!p2||pv.t-p2.t>=gap||(p2.pad>=0&&!isMain(p2)&&(L2.length<2||pv.t-L2[L2.length-2].t>=gap)))){if(p2&&pv.t-p2.t<gap)L2.pop();L.pop();L2.push(pv);last[ot]=pv.t;const pp=L[L.length-1];last[key]=pp?pp.t:-9;if(h.t-last[key]<gap*.6)return}else return}}
   else return}
  last[key]=h.t;o[key].push(hh)});return Sx[ck]=o}
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
 {const m=HM[key],hv=st.hover,sq=1-.03*st.contact,s0=G.pad.w*.5/m.fw,s=s0*(1+.17*hv)*sq,sx=G.H>G.W?(key==='r'?G.W*1.08:-G.W*.08):G.W*(key==='r'?.66:.34),sy=G.H>G.W?G.pad.y0+(G.rows||4)*G.pad.py+G.H*.16:G.H*1.55,ang=Math.atan2(sx-st.x,sy-st.y),lean=clamp(st.vx/k*.00055,-.07,.07),rot=m.axis-ang+lean,push=(1-hv)*5*k+st.contact*5*k,HI=HANDS[key];
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
/* ---------- camera moves (tick the ones you want, they apply live in every video and in the Sample to Beat episode) ----------
   push = a very slow push-in over the whole video; pan = a slow drift between the pads, the screen and the buttons; nod = a small push-in and dip on every kick;
   cuts = wide desk / pad close-up / screen close-up / drum row, switched every 2 bars; whip = a quick punch-in that settles on every section change; tilt = a slow gentle tilt.
   Everything is a pure function of time, so the preview and the export match. The target is kept inside the picture so no edge ever shows. */
const CAMMV=[['push','SLOW PUSH-IN (A VERY SLOW ZOOM TOWARD THE PADS OVER THE WHOLE VIDEO)'],['pan','PAN BETWEEN POINTS (A SLOW DRIFT FROM THE PADS TO THE SCREEN TO THE BUTTONS)'],['nod','KICK NOD (A SMALL PUSH-IN AND DIP ON EVERY KICK)'],['cuts','CUT SHOTS (WIDE DESK, PAD CLOSE-UP, SCREEN CLOSE-UP, DRUM ROW, SWITCHED EVERY 2 BARS)'],['whip','PUNCH-IN ON EVERY SECTION CHANGE (A QUICK ZOOM THAT SETTLES)'],['tilt','SLOW TILT (A GENTLE ROCKING ANGLE ON A LONG BEAT)']];
const camAny=m=>!!m&&CAMMV.some(([k])=>m[k]);
function camMoves(M,T,X,Sx,la,G,sc,ox,oy,W,H,t0,lastEnd){const lerp=(a,b,q)=>a+(b-a)*q;let z=1,tx=W/2,ty=H/2,rot=0;
 const P=G.pad,L=G.lcd,toPx=(gx,gy)=>[ox+gx*sc,oy+gy*sc],pads=toPx(P.x0+1.5*P.px+P.w/2,P.y0+1.5*P.py+P.h/2),drums=toPx(P.x0+1.5*P.px+P.w/2,P.y0+((G.rows||4)-1)*P.py+P.h/2),rec=G.deck?toPx(G.deck.cx,G.deck.cy):null,lcd=toPx(L.x+L.w/2+L.w*.12,L.y+L.h/2+L.h*.9),btns=G.btn&&G.btn.stop?toPx(G.btn.stop[0]+G.btn.stop[2]/2,G.btn.stop[1]-40):pads;
 const bl=60/((Sx&&Sx.bpm)||90),mk=X.make,span=Math.max(10,lastEnd-t0),off=(Sx&&Sx.off)||0;
 if(M.push)z*=1+.07*ease((T-t0)/span);
 if(M.cuts){const seq=rec?['wide','pads','rec','lcd','drums','rec']:['wide','pads','lcd','drums','pads','lcd'],ZS={pads:1.65,drums:2.05,lcd:2.3,rec:1.55},PT={pads,drums,lcd,rec};let st=off,unit=8*bl,i0=0,cutsOn=true;
  if(mk&&mk.flipT!=null){if(T<mk.flipT)cutsOn=false;else{const starts=[mk.flipT].concat(mk.layers.map(l=>l.t),[mk.fullT]);let si=0;while(si+1<starts.length&&starts[si+1]<=T)si++;st=starts[si];unit=(si===starts.length-1?mk.loopLen:mk.segLen)/2;i0=si*2}}
  else{st=off;if(la<off)cutsOn=false}
  if(cutsOn){const rel=mk&&mk.flipT!=null?T-st:la-st,u0=Math.floor(rel/unit),nm=u=>u<=0?'wide':seq[(((i0+u)%seq.length)+seq.length)%seq.length],q=ease((rel-u0*unit)/.24),a=nm(u0-1),b=nm(u0),ZA=a==='wide'?1:ZS[a],ZB=b==='wide'?1:ZS[b],PA=a==='wide'?[W/2,H/2]:PT[a],PB=b==='wide'?[W/2,H/2]:PT[b];
   z*=lerp(ZA,ZB,q);tx=lerp(PA[0],PB[0],q);ty=lerp(PA[1],PB[1],q)}}
 else if(M.pan){const pts=rec?[pads,lcd,rec,drums]:[pads,lcd,btns,drums],per=7,rel=Math.max(0,T-t0),k=Math.floor(rel/per),p=rel-k*per,q=ease(clamp((p-4.4)/2.6,0,1)),A=pts[k%4],B=pts[(k+1)%4];z*=1.22;tx=lerp(A[0],B[0],q);ty=lerp(A[1],B[1],q)}
 if(M.nod){let q=0;const arr=mk?mk.lanes&&mk.lanes.kick:(()=>{const K=KITS[Sx.kit]||KITS[0];return Sx.per&&Sx.per[K.kick]})(),tt=mk?T:la;if(arr&&arr.length){let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m].t<=tt)lo=m+1;else hi=m}if(lo>0){const h=arr[lo-1],dt=tt-h.t;if(dt<.5)q=Math.exp(-dt/.085)*(1-Math.exp(-dt/.012))*Math.min(1,h.v||.8)}}z*=1+.0065*q;ty-=2.4*q*W/1920}
 if(M.whip){let ev=null;if(mk&&mk.flipT!=null){const evs=[mk.flipT].concat(mk.layers.map(l=>l.t),[mk.fullT]);for(const e of evs)if(T>=e)ev=T-e}else if(la>=off){const bar8=32*bl;ev=(la-off)%bar8}
  if(ev!=null&&ev<1.2)z*=1+.09*Math.exp(-ev/.26)*ease(ev/.035)}
 if(M.tilt){rot=.0105*Math.sin(T*.285)+.004*Math.sin(T*.71+1);z*=1.014}
 const hw=W/(2*z),hh=H/(2*z);tx=clamp(tx,hw,W-hw);ty=clamp(ty,hh,H-hh);return{z,tx,ty,rot}}
/* MZPRD LOGO INTRO (optional, sample packs): before the session a gold MZPRD crown slams in out of a light streak (flash, shockwave, sparks,
   colour split, a gloss sweep), then rises while the pack cover glides in, and the card fades away into the session */
const CARD=3.9,VO_AT=.5,COVERS={};let VOBUF=null;
function loadCover(b){if(!b||!b.cover_path||COVERS[b.id]!==undefined)return;COVERS[b.id]=null;const i=new Image();i.crossOrigin='anonymous';i.onload=()=>{COVERS[b.id]=i;drawNow()};i.onerror=()=>{};i.src=pubU(b.cover_path)}
let LOGOC=null;
function crown(x,cx,cy,w,lw){const h=w*.62;x.beginPath();x.moveTo(cx-w/2,cy+h/2);x.lineTo(cx-w/2,cy-h*.15);x.lineTo(cx-w*.25,cy+h*.12);x.lineTo(cx,cy-h/2);x.lineTo(cx+w*.25,cy+h*.12);x.lineTo(cx+w/2,cy-h*.15);x.lineTo(cx+w/2,cy+h/2);x.closePath();x.lineJoin='round';x.lineWidth=lw;x.stroke()}
function logoArt(W,H,u,k){const w=Math.ceil(900*u),h=Math.ceil(420*u);if(!LOGOC)LOGOC=document.createElement('canvas');if(LOGOC.width!==w||LOGOC.height!==h){LOGOC.width=w;LOGOC.height=h}const x=LOGOC.getContext('2d');x.clearRect(0,0,w,h);
 const g=x.createLinearGradient(0,h*.15,0,h*.95);g.addColorStop(0,'#fff3c4');g.addColorStop(.45,'#f2c14e');g.addColorStop(.55,'#c98a1c');g.addColorStop(1,'#ffe08a');
 x.strokeStyle=g;x.fillStyle=g;crown(x,w/2,h*.2,130*u,9*u);x.font='400 '+Math.round(230*u)+'px Anton, Oswald, sans-serif';x.textAlign='center';x.textBaseline='alphabetic';x.fillText('MZPRD',w/2,h*.93);
 /* the gloss: a bright band that crosses the letters once */
 const q=clamp((k-.45)/.8,0,1);if(q>0&&q<1){x.save();x.globalCompositeOperation='source-atop';const bx=-w*.3+q*w*1.6,lg=x.createLinearGradient(bx-90*u,0,bx+90*u,0);lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(.5,'rgba(255,255,255,.85)');lg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=lg;x.fillRect(0,0,w,h);x.restore()}
 return LOGOC}
function logoCard(c,W,H,T,X){const cd=X.card,u=Math.min(W,H)/1080,v=H>W,fade=1-ease(clamp((T-(cd-.65))/.65,0,1));if(fade<=0)return;const hit=.42,k=T-hit;
 c.save();c.globalAlpha=fade;c.fillStyle='#050405';c.fillRect(0,0,W,H);
 const bg=c.createRadialGradient(W/2,H*.45,0,W/2,H*.45,Math.max(W,H)*.62);bg.addColorStop(0,'rgba(140,82,22,'+(.18+.22*clamp(T/hit,0,1)).toFixed(3)+')');bg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=bg;c.fillRect(0,0,W,H);
 const cv=COVERS[X.coverId],up=cv?ease(clamp((T-1.25)/.75,0,1)):0,cy=lerp0(v?H*.42:H*.46,v?H*.2:H*.17,up),ls=lerp0(1,v?.62:.5,up);
 c.globalCompositeOperation='lighter';
 /* the light streak that grows to the hit, then thins away */
 if(T<hit+.6){const a=T<hit?ease(T/hit):1-ease(k/.6),sw=W*(.15+.95*ease(clamp(T/hit,0,1))),sh=(T<hit?3:3+20*Math.exp(-k*9))*u,lg=c.createLinearGradient(W/2-sw/2,0,W/2+sw/2,0);lg.addColorStop(0,'rgba(255,190,90,0)');lg.addColorStop(.5,'rgba(255,236,190,'+(.95*a).toFixed(3)+')');lg.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=lg;c.shadowColor='rgba(255,170,60,.9)';c.shadowBlur=30*u;c.fillRect(W/2-sw/2,cy-sh/2,sw,sh);c.shadowBlur=0}
 if(k>=0){const art=logoArt(W,H,u,k),sc=ls*(1+.22*Math.exp(-k*7)*Math.cos(k*14)),sk=k<.35?(1-k/.35)*7*u*Math.sin(k*95):0,aw=art.width*sc,ah=art.height*sc,ax=W/2-aw/2+sk,ay=cy-ah/2,ca=clamp(k/.06,0,1),split=16*u*Math.exp(-k*7);
  c.globalCompositeOperation='source-over';c.globalAlpha=fade*ca;c.shadowColor='rgba(255,170,50,.55)';c.shadowBlur=40*u*(.6+.4*Math.exp(-k*3));c.drawImage(art,ax,ay,aw,ah);c.shadowBlur=0;
  /* colour split on the hit (red and cyan ghosts that snap back) */
  if(split>.4){c.globalCompositeOperation='lighter';c.globalAlpha=fade*.45*Math.exp(-k*5);c.filter='hue-rotate(-40deg) saturate(3)';c.drawImage(art,ax-split,ay,aw,ah);c.filter='hue-rotate(160deg) saturate(3)';c.drawImage(art,ax+split,ay,aw,ah);c.filter='none'}
  c.globalCompositeOperation='lighter';
  /* flash and shockwave ring */
  if(k<.7){c.globalAlpha=fade*.55*Math.exp(-k*11);c.fillStyle='#fff3d6';c.fillRect(0,0,W,H);const q=k/.7;c.globalAlpha=fade*.55*(1-q);c.strokeStyle='rgba(255,215,140,1)';c.lineWidth=22*u*(1-q)+1;c.beginPath();c.ellipse(W/2,cy,W*.75*ease(q),W*.75*ease(q)*.42,0,0,6.2832);c.stroke()}
  /* sparks thrown out of the hit */
  if(k<1.4){let a=7;const rn=()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296};for(let i=0;i<46;i++){const ang=rn()*6.2832,sp=(260+rn()*620)*u,life=.6+rn()*.8;if(k>life)continue;const px=W/2+Math.cos(ang)*sp*k,py=cy+Math.sin(ang)*sp*k*.6+260*u*k*k,al=(1-k/life);c.globalAlpha=fade*al;c.fillStyle=i%3?'#ffd27a':'#fff4d8';c.beginPath();c.arc(px,py,(1.5+rn()*2.5)*u,0,6.2832);c.fill()}}}
 /* the pack cover glides up under the logo, with a soft shadow and a faint reflection */
 if(cv&&up>0){const sz=(v?W*.62:H*.5),x=W/2-sz/2,y0=(v?H*.33:H*.32)+(1-up)*60*u,r=14*u;c.globalCompositeOperation='source-over';c.globalAlpha=fade*up;
  c.save();c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=50*u;c.shadowOffsetY=24*u;c.beginPath();c.roundRect?c.roundRect(x,y0,sz,sz,r):c.rect(x,y0,sz,sz);c.fillStyle='#000';c.fill();c.restore();
  c.save();c.beginPath();c.roundRect?c.roundRect(x,y0,sz,sz,r):c.rect(x,y0,sz,sz);c.clip();c.drawImage(cv,x,y0,sz,sz);const sh=c.createLinearGradient(x,y0,x+sz,y0+sz),q=clamp((T-1.6)/.9,0,1);sh.addColorStop(Math.max(0,q-.15),'rgba(255,255,255,0)');sh.addColorStop(q,'rgba(255,255,255,.28)');sh.addColorStop(Math.min(1,q+.15),'rgba(255,255,255,0)');c.fillStyle=sh;c.fillRect(x,y0,sz,sz);c.restore();
  c.save();c.globalAlpha=fade*up*.16;c.translate(0,2*(y0+sz)+6*u);c.scale(1,-1);c.beginPath();c.rect(x,y0+sz*.72,sz,sz*.28);c.clip();c.drawImage(cv,x,y0,sz,sz);c.restore()}
 c.restore()}
const lerp0=(a,b,q)=>a+(b-a)*q;
/* 13. the beat name on a strip of masking tape stuck on the MPC, in marker */
function tapeLabel(c,G,Sx){const t=String((Sx&&Sx.title)||'').toUpperCase();if(!t)return;const R=G.id==='deskv'?toV([905,438,300,44]):{x:905,y:438,w:300,h:44};c.save();c.translate(R.x+R.w/2,R.y+R.h/2);c.rotate(-.025);
 const w=Math.min(R.w*1.25,R.w*.45+t.length*R.h*.42),h=R.h;c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=4;c.shadowOffsetY=2;const g=c.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,'rgba(236,224,190,.93)');g.addColorStop(1,'rgba(214,200,160,.93)');c.fillStyle=g;
 c.beginPath();c.moveTo(-w/2,-h/2);for(let i=0;i<=6;i++)c.lineTo(-w/2+(i%2?3:-1),-h/2+h*i/6);c.lineTo(w/2+(1),h/2);for(let i=6;i>=0;i--)c.lineTo(w/2+(i%2?-3:1),-h/2+h*i/6);c.closePath();c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
 c.fillStyle='rgba(255,255,255,.12)';c.fillRect(-w/2,-h/2,w,h*.3);c.fillStyle='#16161c';c.textAlign='center';c.textBaseline='middle';const f=q=>'700 '+q+'px "Permanent Marker", Caveat, cursive';let sz=h*.78;c.font=f(sz);while(sz>8&&c.measureText(t).width>w-16){sz--;c.font=f(sz)}c.fillText(t,0,h*.05);c.restore()}
/* 15. YouTube-style comments popping in at the side (never the same comment twice in a video; some with the grey verified check) */
function comments(c,W,H,v,T,X,Sx,pack){const CM=window.MZMpcComments;if(!CM)return;const t0=X.tracks[0].start,last=X.tracks[X.tracks.length-1],end=last.start+last.dur;if(T<t0+3||T>end-1)return;
 const seed=String(X.title||'').split('').reduce((a,ch)=>a*31+ch.charCodeAt(0)|0,7)>>>0,GAP=4.6,LIFE=9,yr=new Date().getFullYear(),
  /* the open part of each desk (nothing important under it): beats 16:9 the wood above the right-hand gadget, packs 16:9 the strip along the top, 9:16 the bottom-left corner */
  Z=v?(pack?{x:.28,y:.02,w:.43,n:2}:{x:.31,y:.745,w:.38,n:2}):pack?{x:.025,y:.37,w:.16,n:2}:{x:.006,y:.38,w:.21,n:2},u=Math.min(W,H)/1080*(v?.7:.62),cw=W*Z.w,x0=W*Z.x,yb=H*Z.y;
 const k=Math.floor((T-t0-3)/GAP);let y=yb;c.save();
 for(let i=k;i>=0&&i>k-Z.n;i--){const st=t0+3+i*GAP,a=T-st;if(a>LIFE)continue;const cm=CM.at(pack?'pack':'beat',seed,i,end-t0,yr),al=Math.min(1,a/.35)*Math.min(1,(LIFE-a)/.6),sl=(1-ease(Math.min(1,a/.35)))*30*u;
  c.font='500 '+Math.round(26*u)+'px Roboto, Arial, sans-serif';const words=cm.txt.split(' '),lines=[];let ln='';for(const wd of words){const tt=ln?ln+' '+wd:wd;if(c.measureText(tt).width>cw-110*u&&ln){lines.push(ln);ln=wd}else ln=tt}lines.push(ln);
  const h=(66+lines.length*32)*u;let yy;if(Z.up){y-=h+12*u;yy=y}else{yy=y;y+=h+12*u}const y0c=yy;c.globalAlpha=al*.92;const bx=x0-sl;c.fillStyle='rgba(15,15,15,.82)';c.beginPath();c.roundRect?c.roundRect(bx,y0c,cw,h,16*u):c.rect(bx,y0c,cw,h);c.fill();
  c.fillStyle='hsl('+cm.hue+',45%,45%)';c.beginPath();c.arc(bx+38*u,y0c+38*u,22*u,0,6.3);c.fill();c.fillStyle='#fff';c.font='600 '+Math.round(22*u)+'px Roboto, Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(cm.nm.charAt(1).toUpperCase(),bx+38*u,y0c+39*u);
  c.textAlign='left';c.textBaseline='alphabetic';c.font='500 '+Math.round(21*u)+'px Roboto, Arial';c.fillStyle='#f1f1f1';c.fillText(cm.nm,bx+74*u,y0c+34*u);let nx=bx+74*u+c.measureText(cm.nm).width+8*u;
  if(cm.ver){c.fillStyle='#aaaaaa';c.beginPath();c.arc(nx+9*u,y0c+27*u,9*u,0,6.3);c.fill();c.strokeStyle='#0f0f0f';c.lineWidth=2.4*u;c.beginPath();c.moveTo(nx+5*u,y0c+27*u);c.lineTo(nx+8*u,y0c+30.5*u);c.lineTo(nx+13.5*u,y0c+23.5*u);c.stroke();nx+=24*u}
  c.fillStyle='#aaaaaa';c.font='400 '+Math.round(19*u)+'px Roboto, Arial';c.fillText(['just now','1 minute ago','2 minutes ago','5 minutes ago'][i%4],nx+4*u,y0c+34*u);
  c.fillStyle='#f1f1f1';c.font='400 '+Math.round(26*u)+'px Roboto, Arial';lines.forEach((l,j)=>c.fillText(l,bx+74*u,y0c+(66+j*32)*u));
  c.fillStyle='#aaaaaa';c.font='400 '+Math.round(19*u)+'px Roboto, Arial';c.fillText('👍 '+cm.likes.toLocaleString('en-US')+'    👎    Reply',bx+74*u,y0c+h-12*u)}
 c.restore()}
/* 17. end card: the picture dims and a card shows where to get the beat / pack */
/* the sample pack end card: the cover with its record sliding out and spinning, the name in gold, a glowing call to action; everything eases in one after another */
let BCOV=null,ENDV=null,ENDT=null;loadImg('mpc/endtape.png?v=2').then(i=>ENDT=i);loadImg('mpc/endvinyl.webp?v=1').then(i=>ENDV=i);function beatCover(){const sc=sceneOf('h');if(!sc)return null;const key=sc.img.src||sc.img.width;if(BCOV&&BCOV.k===key)return BCOV.c;const G=sc.G,cv=document.createElement('canvas');cv.width=cv.height=600;const x=cv.getContext('2d'),s0=Math.min(G.pad.px*5.4,G.H),cx=G.pad.x0+G.pad.px*2.3,cy=G.pad.y0+G.pad.py*1.2;x.drawImage(sc.img,cx-s0/2,cy-s0/2,s0,s0,0,0,600,600);const g=x.createLinearGradient(0,0,0,600);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');x.fillStyle=g;x.fillRect(0,0,600,600);x.fillStyle='#fff';x.font='400 54px Anton, Oswald, sans-serif';x.textAlign='left';x.fillText('MZPRD',28,568);BCOV={k:key,c:cv};return cv}
function packEndCard(c,W,H,v,T,X,Sx,beat){const D=5,a=T-(X.total-D);if(a<0)return;const u=Math.min(W,H)/1080,st=(d,l)=>ease(clamp((a-d)/(l||.6),0,1)),cov=beat?beatCover():COVERS[ST.beat],name=String(Sx.title||'').toUpperCase();
 c.save();const k0=st(0,.8);c.fillStyle='rgba(5,4,6,'+(.86*k0)+')';c.fillRect(0,0,W,H);const gl=c.createRadialGradient(v?W/2:W*.34,v?H*.36:H*.5,10,v?W/2:W*.34,v?H*.36:H*.5,Math.max(W,H)*.55);gl.addColorStop(0,'rgba(232,170,70,'+(.22*k0)+')');gl.addColorStop(1,'rgba(232,170,70,0)');c.fillStyle=gl;c.fillRect(0,0,W,H);
 /* cover + record */
 const cs=v?W*.56:H*.56,ccx=v?W/2-cs*.12:W*.3,ccy=v?H*.33:H*.5,k1=st(.15,.8),rx=ccx+cs*.42*st(.6,1),ra=(a-.6)*2.2;
 c.globalAlpha=k1;if(beat&&ENDT){/* beats: the cassette slides out from behind the cover, the beat name written on its label */const tw2=cs*.82,th2=tw2*1610/1418,tx2=ccx+cs*.12,ty2=ccy+(1-k1)*40*u;c.save();c.translate(tx2,ty2);c.rotate(.04*(1-k1));c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=30*u;c.shadowOffsetY=16*u;c.drawImage(ENDT,-tw2/2,-th2/2,tw2,th2);c.shadowBlur=0;c.shadowOffsetY=0;
  const sc2=tw2/1418;c.translate(-tw2/2+330*sc2,-th2/2+515*sc2);c.rotate(-.456);c.fillStyle='rgba(20,22,40,.9)';let fz=Math.round(56*sc2);c.font='700 '+fz+'px "Permanent Marker", Caveat, cursive';const bn=String(Sx.title||'');while(fz>8&&c.measureText(bn).width>250*sc2){fz--;c.font='700 '+fz+'px "Permanent Marker", Caveat, cursive'}c.textAlign='left';c.textBaseline='alphabetic';c.fillText(bn,-90*sc2,0);c.restore()}else{c.globalAlpha=k1;c.save();c.translate(rx,ccy+(1-k1)*40*u);c.rotate(ra);const R=cs*.47;c.fillStyle='#0b0b0c';c.beginPath();c.arc(0,0,R,0,6.3);c.fill();c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;for(let r=R*.4;r<R;r+=R*.035){c.beginPath();c.arc(0,0,r,0,6.3);c.stroke()}
 c.restore();
 /* the record's light: an iridescent rainbow sheen that stays put while the record turns under it (like light on a real record) */
 if(ENDV){c.save();c.translate(rx,ccy+(1-k1)*40*u);c.drawImage(ENDV,-R,-R,2*R,2*R);c.restore()}else{c.save();c.translate(rx,ccy+(1-k1)*40*u);c.beginPath();c.arc(0,0,R,0,6.3);c.arc(0,0,R*.36,0,6.3,true);c.clip('evenodd');c.globalCompositeOperation='screen';
 const BANDS=[[-.35,'255,170,60'],[.25,'255,140,40'],[2.75,'60,230,240'],[3.2,'255,60,200'],[3.55,'255,150,50'],[5.9,'60,220,255']];
 for(const [an,col] of BANDS){const g=c.createConicGradient?c.createConicGradient(an-.35,0,0):null;if(!g)continue;g.addColorStop(0,'rgba('+col+',0)');g.addColorStop(.05,'rgba('+col+',.55)');g.addColorStop(.1,'rgba('+col+',0)');g.addColorStop(1,'rgba('+col+',0)');c.fillStyle=g;c.fillRect(-R,-R,2*R,2*R)}
 c.globalCompositeOperation='source-over';c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=R*.006;for(let r=R*.4;r<R;r+=R*.06){c.beginPath();c.arc(0,0,r,0,6.3);c.stroke()}c.restore();}
 /* the label: the pack's cover, turning with the record, with a thin orange ring and the spindle hole */
 c.save();c.translate(rx,ccy+(1-k1)*40*u);c.rotate(ra);if(!ENDV){c.fillStyle='#d9783a';c.beginPath();c.arc(0,0,R*.34,0,6.3);c.fill()}const LR=ENDV?R*.335:R*.32;c.save();c.beginPath();c.arc(0,0,LR,0,6.3);c.clip();if(cov)c.drawImage(cov,-LR,-LR,2*LR,2*LR);else{c.fillStyle='#eee';c.fill()}c.restore();
 c.fillStyle='#050505';c.beginPath();c.arc(0,0,R*.025,0,6.3);c.fill();c.restore();}
 if(!(beat&&ENDT)){c.save();c.translate(ccx,ccy+(1-k1)*60*u);c.rotate(-.02*(1-k1));c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=60*u;c.shadowOffsetY=30*u;c.fillStyle='#111';c.fillRect(-cs/2,-cs/2,cs,cs);c.shadowBlur=0;c.shadowOffsetY=0;if(cov)c.drawImage(cov,-cs/2,-cs/2,cs,cs);
 const sw=clamp((a-1)/1.1,0,1);if(sw>0&&sw<1){c.save();c.beginPath();c.rect(-cs/2,-cs/2,cs,cs);c.clip();const x=-cs+sw*cs*2,g=c.createLinearGradient(x-cs*.2,0,x+cs*.2,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(-cs/2,-cs/2,cs,cs);c.restore()}
 c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=2*u;c.strokeRect(-cs/2,-cs/2,cs,cs);c.restore();}c.globalAlpha=1;
 /* words */
 const tx=v?W/2:W*.73,ty=v?H*.62:H*.3,tw=v?W*.86:W*.42;c.textAlign='center';c.textBaseline='middle';
 const k2=st(.45);c.globalAlpha=k2;c.font='600 '+Math.round(26*u)+'px Oswald, sans-serif';const lab=beat?('NEW BEAT'+(Sx.bpm?'  •  '+Sx.bpm+' BPM':'')+'  •  PROD. MZPRD'):'OUT NOW  •  SAMPLE PACK';const lw=c.measureText(lab).width+40*u;c.strokeStyle='#e8b94a';c.lineWidth=2*u;c.beginPath();c.roundRect?c.roundRect(tx-lw/2,ty-24*u+(1-k2)*20*u,lw,48*u,24*u):c.rect(tx-lw/2,ty-24*u,lw,48*u);c.stroke();c.fillStyle='#e8b94a';c.fillText(lab,tx,ty+(1-k2)*20*u);
 const k3=st(.7);c.globalAlpha=k3;let fs=Math.round((v?150:132)*u);c.font='400 '+fs+'px Anton, Oswald, sans-serif';while(fs>30&&c.measureText(name).width>tw){fs-=4;c.font='400 '+fs+'px Anton, Oswald, sans-serif'}const ny=ty+(v?120:110)*u+(1-k3)*30*u,ng=c.createLinearGradient(0,ny-fs/2,0,ny+fs/2);ng.addColorStop(0,'#fff6d8');ng.addColorStop(.5,'#f0c15a');ng.addColorStop(1,'#b8801f');c.shadowColor='rgba(240,180,70,.45)';c.shadowBlur=30*u;c.fillStyle=ng;c.fillText(name,tx,ny);c.shadowBlur=0;
 const k4=st(.95);c.globalAlpha=k4;c.fillStyle='rgba(235,228,214,.85)';c.font='400 '+Math.round(30*u)+'px Oswald, sans-serif';c.fillText(beat?'Lease or buy  •  instant download  •  MP3 / WAV':'Royalty-free vinyl loops  •  BPM + key labelled',tx,ny+fs*.62+20*u);
 const k5=st(1.2,.5),bw=(v?W*.7:W*.32),bh=86*u,by=ny+fs*.62+80*u,pul=1+.025*Math.sin(a*6)*(a>1.8?1:0);c.globalAlpha=k5;c.save();c.translate(tx,by+bh/2);c.scale(pul*(0.85+.15*k5),pul*(0.85+.15*k5));const bg=c.createLinearGradient(0,-bh/2,0,bh/2);bg.addColorStop(0,'#ff3b46');bg.addColorStop(1,'#b3121c');c.shadowColor='rgba(255,50,60,.55)';c.shadowBlur=36*u;c.fillStyle=bg;c.beginPath();c.roundRect?c.roundRect(-bw/2,-bh/2,bw,bh,bh/2):c.rect(-bw/2,-bh/2,bw,bh);c.fill();c.shadowBlur=0;c.fillStyle='#fff';c.font='600 '+Math.round(40*u)+'px Oswald, sans-serif';c.fillText(beat?'LEASE IT AT MZPRD.COM':'GET IT AT MZPRD.COM',0,2*u);c.restore();
 const k6=st(1.5);c.globalAlpha=k6;c.fillStyle='rgba(235,228,214,.7)';c.font='400 '+Math.round(26*u)+'px Oswald, sans-serif';c.fillText('link in the description  ↓',tx,by+bh+44*u+Math.sin(a*4)*3*u);
 c.restore()}
function endCard(c,W,H,v,T,X,Sx,pack){const D=4.5,a=T-(X.total-D);if(a<0)return;const u=Math.min(W,H)/1080,k=ease(Math.min(1,a/.7));c.save();c.fillStyle='rgba(6,6,8,'+(.78*k)+')';c.fillRect(0,0,W,H);c.globalAlpha=k;
 const cw=v?W*.84:W*.5,chh=v?H*.32:H*.56,cx=W/2-cw/2,cy=(v?H*.3:H*.1)+(1-k)*40*u;c.fillStyle='#111114';c.strokeStyle='#e8b94a';c.lineWidth=3*u;c.beginPath();c.roundRect?c.roundRect(cx,cy,cw,chh,22*u):c.rect(cx,cy,cw,chh);c.fill();c.stroke();
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#e8b94a';c.font='600 '+Math.round(30*u)+'px Oswald, sans-serif';c.fillText(pack?'GET THE PACK':'GET THIS BEAT',W/2,cy+chh*.16);
 c.fillStyle='#fff';const t=String((X.kind==='tape'?X.title:Sx.title)||'').toUpperCase();let sz=Math.round(86*u);c.font='400 '+sz+'px Anton, Oswald, sans-serif';while(sz>20&&c.measureText(t).width>cw*.88){sz-=2;c.font='400 '+sz+'px Anton, Oswald, sans-serif'}c.fillText(t,W/2,cy+chh*.38);
 c.fillStyle='#e0242f';const bw=cw*.62,bh=chh*.17,bx=W/2-bw/2,by=cy+chh*.58;c.beginPath();c.roundRect?c.roundRect(bx,by,bw,bh,bh/2):c.rect(bx,by,bw,bh);c.fill();c.fillStyle='#fff';c.font='600 '+Math.round(38*u)+'px Oswald, sans-serif';c.fillText('MZPRD.COM',W/2,by+bh/2+2*u);
 c.fillStyle='#bdbdc4';c.font='500 '+Math.round(24*u)+'px Oswald, sans-serif';c.fillText(pack?'royalty free  /  link in the description':'lease or buy  /  link in the description',W/2,cy+chh*.88);c.restore()}
function frame(c,W,H,fmt,T,X){if(X.base){frame(c,W,H,fmt,Math.max(0,T-X.card),X.base);if(T<X.card)logoCard(c,W,H,T,X);return}
 LAMPFL=lampLevel(T);const cu=fmt==='c';if(cu)fmt='v';const OV=!cu&&!X.long;
 const v=fmt==='v',E=ST.eng,sc0=v?.87*W/848:.6*W/848,k=trackAt(X,T),tr=X.tracks[k],Sx=tr.S,lt=T-tr.start,la=lt+(tr.off||0),tape=X.kind==='tape',last=X.tracks[X.tracks.length-1],lastEnd=last.start+last.dur,t0=X.make?X.make.T0:X.tracks[0].start;
 const dx=(1.3*Math.sin(T*.31)+.7*Math.sin(T*.77+1.3))*W/1920,dy=(1.1*Math.sin(T*.27+.8)+.6*Math.sin(T*.69+2.1))*W/1920,zs=(1+.0028*Math.sin(T*.21+.4))*(E.hook?1+.2*(1-ease(T/.8)):1)*(ST.cam&&ST.cam.rack?1+.014*(1-ease((T-.15)/1.8)):1);
 c.save();c.fillStyle='#fff';c.fillRect(0,0,W,H);c.translate(W/2+dx,H/2+dy);c.scale(zs,zs);c.translate(-W/2,-H/2);
 const SC=sceneOf(fmt),intro=tape&&T<t0;let sc=sc0,cx=W/2,cy=v?H*.5:H*.495,ox=cx-PH.cx*sc,oy=cy-PH.cy*sc;
 if(SC){sc=Math.max(W/SC.G.W,H/SC.G.H)*1.025;ox=(W-SC.G.W*sc)/2;oy=(H-SC.G.H*sc)/2}
 /* camera moves: everything drawn from here on (ground, desk, machine, hands) moves with the camera */
 if(!cu&&camAny(ST.cam&&ST.cam.moves)){const m=camMoves(ST.cam.moves,T,X,Sx,la,SC?SC.G:PH,sc,ox,oy,W,H,t0,lastEnd);c.translate(W/2,H/2);c.rotate(m.rot);c.scale(m.z,m.z);c.translate(-m.tx,-m.ty)}
 if(!SC)ground(c,W+80,H+80,ox,oy,sc);
 if(cu){const G0=SC?SC.G:PH,pcx=G0.pad.x0+1.5*G0.pad.px+G0.pad.w/2,pcy=G0.pad.y0+1.5*G0.pad.py+G0.pad.h/2,zoom=(SC?1.78:1.55)*(1+.04*Math.sin(T*.23)),sc2=(SC?sc:sc0)*zoom;sc=sc2;ox=W/2-pcx*sc+Math.sin(T*.19)*6;oy=H*.47-pcy*sc+Math.cos(T*.16)*5}
 const fx={vol:(.21*ease((T-.15)/2.4))+.012*Math.sin(T*.6),con:.05*Math.sin(T*.4),fader:Math.max(0,26*(.5+.5*Math.sin(T*.29-.6))),btn:{play:0,start:pulse(T,t0-.42,t0-.12),rec:pulse(T,t0-.42,t0-.12),over:0,stop:X.make?0:pulse(T,lastEnd-.08,lastEnd+.2)}};
 if(X.make){for(const e of Sx.btnEv){const q=pulse(T,e.t-.05,e.t+.16);if(q>(fx.btn[e.k]||0))fx.btn[e.k]=q}fx.wheel=X.make.wheelAngle(T)}
 if(SC&&SC.G.deck){fx.btn.stop=0;fx.btn.end=pulse(T,lastEnd-.08,lastEnd+.2)}
 machine(c,ox,oy,sc,Sx,{arm:SC&&SC.G.arm?armAt(SC.G,T,X.intro,t0,lastEnd):null,spin:SC&&SC.G.deck?spinAt(T,X.intro>0?t0-.27:-9,lastEnd):0,lcd:X.make&&!((X.intro>0)&&T<X.intro)?X.make.lcdAt(T):null,boot:(X.intro>0&&T<X.intro&&T>=PW)?T-PW:-1,img:SC?SC.img:CUT,geo:SC?SC.G:null,src:SC?SC.img:null,fx,lt:la,power:(X.make&&X.make.pdAt&&X.make.pdAt(T+.1)>=0)?0:(X.intro>0?ease((T-PW)/.12):1),pdown:(X.intro>0&&T<PW)?5:(X.make&&X.make.pdAt?X.make.pdAt(T):-1),run:la>=-.02&&T<(X.make&&X.make.stopT?X.make.stopT:lastEnd),trk:tape?[k+1,X.tracks.length]:null,loading:tape&&k>0,head:intro?X.title:'',sub:intro?X.tracks.length+' TRACKS':'',press:i=>la>=-.02?pressAt(Sx,i,la):0});
{c.save();c.translate(ox,oy);c.scale(sc,sc);const Gs=SC?SC.G:PH;
  if(SC&&(Gs.id==='deskh'||Gs.id==='deskv')&&ST.eng&&ST.eng.tapelab)tapeLabel(c,Gs,X.kind==='tape'?{title:X.title}:Sx);
  if(SC&&Gs.id==='deskh')drawRProp(c,Gs,Sx,T,la);
  if(SC&&Gs.id==='deskh')drawCan(c,Gs,Sx);
  if(SC&&Gs.id==='deskh')drawProp(c,Gs,Sx,T);
  if(ST.hands&&ST.hands.on)drawHands(c,Gs,Sx,la,!!SC);
  if(SC){if(Gs.label&&(Gs.id!=='deskh'||!ST.prop||ST.prop==='floppy')){const pr=X.long?1:ease((T-tr.start+.25)/1.1);handwrite(c,Gs.label,Sx.title,'MZPRD'+(Sx.bpm?'  '+Sx.bpm+' BPM':'')+(Sx.key?'  '+Sx.key:''),X.kind==='tape'&&k===0&&T<t0?0:pr)}
   dust(c,T,Gs)}
  c.restore()}
 if(SC&&SC.G.lamp){lampFx(c,W,H,ox,oy,sc,SC.G,T)}else if(!SC)sheen(c,ox,oy,sc,T);
 c.restore();
 if(camOn()){dofFx(c,W,H,T,ox,oy,sc,SC?SC.G:null,v);gradeFx(c,W,H)}
 /* optional words and the subscribe, drawn flat on top (no camera drift) */
 const topY=v?H*.17:H*.12,sz=v?Math.min(150,W*.12):Math.min(110,W*.058);
 if(OV&&E.hook&&T<2.9){const txt=(E.hookText||'').trim().toUpperCase()||HOOKS[(String(X.title||'').length*7+3)%HOOKS.length],lines=wrapTwo(txt),size=Math.min(sz,W*.9/Math.max(5,Math.max(...lines.map(l=>l.length)))*1.9);sticker(c,lines,W/2,topY,size,.04,T,{out:(2.9-T)/.3})}
 if(OV&&E.note&&(E.noteText||'').trim()&&T>2.4&&T<7.4)pill(c,E.noteText.trim(),W/2,v?(SC?H*.722:H*.775):H*.95,v?40:28,Math.min(ease((T-2.4)/.4),ease((7.4-T)/.4)));
 if(OV&&E.q&&(E.qText||'').trim()&&X.total>14&&T>X.total-10.5&&T<X.total-.15){const txt=E.qText.trim().toUpperCase(),lines=wrapTwo(txt),size=Math.min(v?100:72,W*.9/Math.max(5,Math.max(...lines.map(l=>l.length)))*1.9),pu=1+.025*Math.sin(T*5);sticker(c,lines,W/2,topY,size*pu,X.total-10.5,T,{fill:'#e0242f',out:Math.min(1,(X.total-.15-T)/.3)})}
 if(OV&&E.meters!==false&&la>=-.02&&T<lastEnd&&!intro)meters(c,W,H,v,Sx,la);
 if(OV&&E.cmts)comments(c,W,H,v,T,X,Sx,packMode());
 if(OV&&E.endcard&&!X.loop){if(X.kind!=='tape')packEndCard(c,W,H,v,T,X,Sx,!packMode());else endCard(c,W,H,v,T,X,Sx,packMode())}
 if(OV&&X.sub)subscribe(c,W,H,T-X.subT0,v?(SC?.905:0):.9,!v);
 if(X.make&&window.MZMpcMake&&!cu)MZMpcMake.overlay(c,W,H,T,X,v);
 if(OV&&ST.text&&!SC)text(c,W,H,v,{title:tape?X.title:Sx.title,bpm:Sx.bpm,key:Sx.key,sub:tape&&!intro?(k+1)+'. '+Sx.title:''})}
/* beat meters (beats and sample packs): four LED ladders (KICK, SNARE, HATS, other PADS) that jump on every hit the listener found, and a bar counter */
function meters(c,W,H,v,Sx,la){const K=KITS[Sx.kit]||KITS[0],per=Sx.per;if(!per)return;
 const lv=pads=>{let m=0;const tt=la+.006;for(const p of pads){const a=per[p];if(!a||!a.length)continue;let lo=0,hi=a.length;while(lo<hi){const q=(lo+hi)>>1;if(a[q].t<=tt)lo=q+1;else hi=q}if(lo>0){const h=a[lo-1],dt=tt-h.t;if(dt<.9)m=Math.max(m,Math.exp(-dt/.16)*Math.min(1,h.v+.15))}}return m};
 const other=[];for(let i=0;i<16;i++)if(per[i]&&i!==K.kick&&!K.sn.includes(i)&&i!==K.hat)other.push(i);
 const LN=[['KICK',[K.kick]],['SNARE',K.sn],['HATS',[K.hat]],['PADS',other]],mw=W*(v?.105:.042),mg=W*(v?.02:.008),mh=H*(v?.07:.09),mx0=W*(v?.045:.03),my=H-mh-H*(v?.07:.075),seg=8,sh=mh/seg;
 c.save();LN.forEach(([nm,pads],i)=>{const x=mx0+i*(mw+mg),L=lv(pads),on=Math.round(L*seg);for(let s=0;s<seg;s++){const y=my+mh-(s+1)*sh,lit=s<on,hue=s<5?'232,185,74':s<7?'255,150,60':'255,74,58';c.fillStyle=lit?'rgba('+hue+',.95)':'rgba(255,255,255,.1)';if(lit){c.shadowColor='rgba('+hue+',.8)';c.shadowBlur=sh*.9}c.fillRect(x,y+sh*.14,mw,sh*.72);c.shadowBlur=0}
  c.font='700 '+Math.max(11,Math.round(H*(v?.0125:.018)))+'px Oswald, sans-serif';c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle=L>.2?'#e8b94a':'rgba(255,255,255,.55)';c.fillText(nm,x+mw/2,my+mh+H*(v?.016:.024))});
 const bl=60/(Sx.bpm||90),n=Math.floor(Math.max(0,la-(Sx.off||0))/bl);c.font='700 '+Math.max(13,Math.round(H*(v?.016:.024)))+'px Oswald, sans-serif';c.textAlign='left';c.fillStyle='rgba(255,255,255,.88)';c.fillText('BAR '+(Math.floor(n/4)+1),mx0,my-H*(v?.014:.02));c.restore()}
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
  <div style="display:flex;gap:6px;margin-bottom:8px"><button class="btn" type="button" id="mSrcB" style="flex:1">BEATS</button><button class="btn" type="button" id="mSrcP" style="flex:1">SAMPLE PACKS</button></div>
  <label id="mBeatL">BEAT</label><select id="mBeat"></select>
  <div id="mInfo" class="msg"></div>
  <label>SOUNDS LIKE (ARTIST, OPTIONAL: USED IN THE TITLES)</label><input type="text" id="mArt" placeholder="e.g. Lil Baby">
  <label>SCREEN TEXT (LEAVE EMPTY TO USE THE BEAT NAME)</label><input type="text" id="mLcd" maxlength="40">
  <label>HOW MUCH OF THE BEAT</label><select id="mLen"><option value="0">The whole preview</option><option value="15">First 15 seconds</option><option value="30">First 30 seconds</option><option value="45">First 45 seconds</option><option value="60">First 60 seconds</option></select>
 </div></details>
 <details class="sec grp" id="g_scene"><summary>2. SCENE <small id="s_scene"></small></summary><div class="in">
  <label>LOOK OF THE VIDEOS</label><select id="mScene"><option value="desk">Desk scene (the worn desk, lamp and floppy disks)</option><option value="white">White studio</option></select>
  <label>MACHINE SKIN (DESK SCENES)</label><select id="mSkin">${SKINS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
  <label>LEFT DESK ITEM (MPC DESK, 16:9 ONLY)</label><select id="mProp">${PROPS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
  <label>RIGHT DESK ITEM (MPC DESK, 16:9 ONLY)</label><select id="mRProp">${RPROPS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
  <label>IPHONE SCREEN TILT (<span id="mIprotV">0.0</span>°, LEFT − / RIGHT +)</label><input type="range" id="mIprot" min="-5" max="5" step="0.1" value="0" style="width:100%">
  <label>TURNTABLE SKIN (SAMPLE PACKS SCENE)</label><select id="mTSkin">${TSKINS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
  <label>PAD MACHINE SKIN (SAMPLE PACKS SCENE)</label><select id="mPSkin">${PSKINS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
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
  <details id="mCamMv" style="margin:8px 0;border:1px solid #2a2a30;padding:6px 10px"><summary style="cursor:pointer;font:700 10px Montserrat;letter-spacing:.2em;color:#c9a14a">CAMERA ZOOMS AND PANS (CLICK THE ONES YOU WANT, BEATS AND SAMPLE PACKS)</summary><div id="mCamMvList" style="margin-top:6px"></div></details>
  <label class="chk"><input type="checkbox" id="mRack"> FOCUS PULL AT THE START (FOCUS SLIDES FROM THE LAMP TO THE PADS)</label>
  <label>COLOR GRADE</label><select id="mGrade"><option value="0">None (as is)</option><option value="warm">Warm film</option><option value="teal">Teal and orange</option><option value="cold">Cold studio</option><option value="faded">Faded 90s</option></select>
 </div></details>
 <details class="sec grp" id="g_extras"><summary>4. DESK EXTRAS <small id="s_extras"></small></summary><div class="in">
  <label class="chk"><input type="checkbox" id="mIntro"> START OF THE VIDEO: A HAND SWITCHES THE UNIT ON (THE SCREEN BOOTS AND TYPES THE BEAT NAME), THEN PRESSES PLAY START AND GETS TO WORK (ABOUT 4 SECONDS)</label>
  <div class="msg" id="mIntroN" style="margin-top:0">The intro is not used in the looping 9:16 version.</div>
  <label class="chk"><input type="checkbox" id="mHands"> HANDS TAPPING THE PADS (YOUR OWN HANDS, THEY STRIKE EVERY HIT)</label>
  <label class="chk"><input type="checkbox" id="mTxt"> ALSO SHOW THE TITLE AS TEXT ON THE WHITE STUDIO (OFF = CLEAN)</label>
 </div></details>
 <details class="sec grp" id="g_hits"><summary>5. PAD HITS <small id="s_hits"></small></summary><div class="in">
  <label>PAD LAYOUT (EACH BEAT GETS ITS OWN BY DEFAULT, THE SAME EVERY TIME)</label><select id="mKit"><option value="">Automatic for this beat</option>${KITS.map((k,i)=>`<option value="${i}">${k.n}</option>`).join('')}</select>
  <label>HOW MANY HITS (MORE = EVERY SMALL HIT)</label><select id="mSens"><option value="0">Only the clear hits</option><option value="1">Balanced</option><option value="2">Every hit</option></select>
  <label>TIMING NUDGE: <span id="mNudgeV">0</span> MS (MOVE THE PAD HITS EARLIER OR LATER)</label><input type="range" id="mNudge" min="-80" max="80" step="1" value="0" style="width:100%;accent-color:var(--red)">
  <div class="msg">The kick is the bottom right pad (BASS), snares are SNARE 1 and 2, hats are HIHAT, and chops and melody hits land on the toms, rides, crashes and percs.</div>
  <details class="sec sub2"><summary>WHAT THE TOOL HEARD</summary><div class="in msg" id="mMap"></div></details>
  <button class="btn" id="mLearnAll" type="button">LEARN ALL BEATS (SAVED IN THIS BROWSER)</button><div class="msg" id="mLearnMsg">Each beat is learned and saved the first time it is opened, so its taps are the same every time.</div>
 </div></details>
 <details class="sec grp" id="g_watch"><summary>6. KEEP THEM WATCHING <small id="s_watch"></small></summary><div class="in">
  <label class="chk"><input type="checkbox" id="mEhk"> BIG HOOK LINE AT THE START (SLAMS ON SCREEN, THE MPC PUNCHES IN)</label>
  <input type="text" id="mEhkT" maxlength="40" placeholder="Leave empty for an automatic line, or type your own">
  <label class="chk"><input type="checkbox" id="mElogo"> MZPRD LOGO INTRO (SAMPLE PACKS): THE GOLD LOGO SLAMS IN WITH A FLASH, SPARKS AND A SHOCKWAVE, THEN THE PACK COVER GLIDES IN AND IT FADES INTO THE SESSION (WITH THE MZPRD VOICE, ADDS 3.9 SEC)</label>
  <label class="chk"><input type="checkbox" id="mEtape"> BEAT NAME ON MASKING TAPE, STUCK ON THE MPC (WRITTEN IN MARKER)</label>
  <label class="chk"><input type="checkbox" id="mEcmts"> LIVE COMMENTS POPPING IN (2000 FOR BEATS, 2000 FOR PACKS, NEVER THE SAME ONE TWICE IN A VIDEO, SOME VERIFIED)</label>
  <label class="chk"><input type="checkbox" id="mEend"> END CARD (THE PICTURE DIMS AND SHOWS WHERE TO GET THE BEAT OR PACK, LAST 4.5 SEC)</label>
  <label class="chk"><input type="checkbox" id="mEcrk"> NEEDLE DROP CRACKLE WHEN THE RECORD STARTS (SAMPLE PACKS ONLY)</label>
  <label class="chk"><input type="checkbox" id="mEmet"> BEAT METERS AND A BAR COUNTER (FOUR LED LADDERS BOTTOM LEFT: KICK, SNARE, HATS, PADS, THEY JUMP ON EVERY HIT)</label>
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
   <label id="mTpAddL">ADD A BEAT</label><div style="display:grid;grid-template-columns:1fr auto;gap:6px"><select id="mTpA"></select><button class="btn" id="mTpAdd">ADD</button></div>
   <div id="mTpList"></div>
   <button class="btn big" id="mTpBuild" style="margin-top:8px">BUILD THE TAPE (LISTEN TO EVERY BEAT)</button><div class="msg" id="mTpMsg">Add at least 2 beats, then build the tape. Then preview it and render it with the buttons on the left.</div>
  </div>
 </div></details>
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
/* LEARNED BEATS: what the tool heard in a beat (kicks, snares, hats, samples) is saved in this browser the first time the beat is opened,
   so every later load uses exactly the same taps. A new or replaced preview is learned again by itself. */
const LDB=(()=>{let P=null;const db=()=>P||(P=new Promise((ok,no)=>{try{const q=indexedDB.open('mzprd-mpc',1);q.onupgradeneeded=()=>q.result.createObjectStore('learn');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}catch(e){no(e)}}));
 const run=(m,f)=>db().then(d=>new Promise((ok,no)=>{const t=d.transaction('learn',m),r=f(t.objectStore('learn'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})).catch(()=>null);
 return{get:k=>run('readonly',o=>o.get(k)),put:(k,v)=>run('readwrite',o=>o.put(v,k))}})();
const learnKey=b=>'v1|'+b.id+'|'+b.preview_path;
async function fetchBuf(b){const r=await fetch(pubU(b.preview_path));if(!r.ok)throw new Error('The preview of "'+b.title+'" did not load ('+r.status+').');return ctxA().decodeAudioData(await r.arrayBuffer())}
const hear=buf=>window.MZMpcDetect?MZMpcDetect.analyze(buf):analyze(buf);
async function loadBeat(b){if(CACHE[b.id])return CACHE[b.id];const buf=await fetchBuf(b);let raw=await LDB.get(learnKey(b));if(!raw){raw=await hear(buf);LDB.put(learnKey(b),raw)}return CACHE[b.id]={buf,raw}}
/* learn every beat on the site now (the ones already learned are skipped) */
async function learnAll(){const m=$q('#mLearnMsg'),bt=$q('#mLearnAll');bt.disabled=true;let n=0,done=0;
 for(let i=0;i<beats.length;i++){const b=beats[i];if(!b.preview_path)continue;m.textContent='Learning beat '+(i+1)+' of '+beats.length+': '+b.title+'...';
  try{if(await LDB.get(learnKey(b))){done++;continue}const raw=await hear(await fetchBuf(b));await LDB.put(learnKey(b),raw);n++}catch(e){console.warn(e)}}
 m.textContent='Done. '+n+' beat'+(n===1?'':'s')+' learned now, '+done+' already learned. New beats learn themselves the first time you open them.';bt.disabled=false}
const kitOf=id=>ST.kits&&ST.kits[id]!=null&&ST.kits[id]!==''&&KITS[+ST.kits[id]]?+ST.kits[id]:kitFor(id);
function mkS(b,len,kit){const C=CACHE[b.id],Sx={title:b.title,bpm:Number(b.bpm)||0,key:b.musical_key||'',lcd:'',raw:C.raw,buf:C.buf,off:C.raw.off||0,kit,dur:len?Math.min(C.buf.duration,len):C.buf.duration};const L=layout(C.raw,kit);Sx.hits=L.hits;Sx.per=L.per;return Sx}
let TP=null;
let EP=null;
const X=()=>ST.tape.on?TP:(S&&S.tl);
function applyKit(){const id=ST.beat,k=kitOf(id),L=layout(S.raw,k);S.kit=k;S.hits=L.hits;S.per=L.per;
 const tot=S.per.map((x,i)=>x.length?PAD_NAMES[i]+' '+x.length:'').filter(Boolean);const m=root&&$q('#mMap');if(m)m.textContent='Kit: '+KITS[k].n+'. '+(tot.join(' / ')||'Nothing was found.');const ks=root&&$q('#mKit');if(ks)ks.value=(ST.kits&&ST.kits[id]!=null&&ST.kits[id]!=='')?String(ST.kits[id]):''}
async function pick(id){ST.beat=id;if(EP){EP=null;if(ST.s2b)ST.s2b.useEp=false}save();stopPlay();const b=beats.find(x=>String(x.id)===String(id));if(!b)return;
 loadCover(b);S=null;drawNow();$q('#mMsg').textContent='Loading "'+b.title+'" and listening for the hits...';$q('#mInfo').textContent='';
 try{await loadBeat(b);if(String(ST.beat)!==String(id))return;S=mkS(b,ST.len,kitOf(id));S.lcd=ST.lcd.trim();S.tl=tlOne(S);applyKit();
  $q('#mInfo').textContent=mmss(CACHE[b.id].buf.duration)+' preview / '+S.hits.length+' pad hits found';$q('#mMsg').textContent='Ready. Press PLAY to watch it, or render the video.';mark('yt','th','gen');if(window.__lpShow)__lpShow();drawNow()}
 catch(e){$q('#mMsg').textContent='Could not load this beat: '+(e&&e.message||e)}}
function size(){const v=ST.fmt==='v',cv=$q('#mCv');cv.width=v?1080:1920;cv.height=v?1920:1080;cv.style.maxWidth=v?'360px':'100%';$q('#mFh').classList.toggle('on',!v);$q('#mFv').classList.toggle('on',v)}
function drawNow(){const cv=$q('#mCv'),Xt=XF(ST.fmt);if(!cv||!sceneOK(ST.fmt))return;if(!Xt){const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);$q('#mTime').textContent='0:00 / 0:00';return}
 const T=PV.playing?(AC.currentTime-PV.t0):parseFloat($q('#mScrub').value)/1000*Xt.total;frame(cv.getContext('2d'),cv.width,cv.height,ST.fmt,T,Xt);$q('#mTime').textContent=mmss(clamp(T,0,Xt.total))+' / '+mmss(Xt.total)}
function stopPlay(){PV.playing=false;PV.loading=false;cancelAnimationFrame(PV.raf);try{PV.src&&PV.src.stop()}catch(e){}PV.src=null;if(root)$q('#mPlay').textContent='PLAY'}
/* the whole sound of the video in one buffer: lead-in, every beat with its blend, the fade out */
async function mixAudio(Xt,sr){if(Xt.mix&&Xt.mixSr===sr)return Xt.mix;
 if(Xt.base){const m=await mixAudio(Xt.base,sr),oa=new OfflineAudioContext(2,Math.ceil(Xt.total*sr),sr),s0=oa.createBufferSource();s0.buffer=m;s0.connect(oa.destination);s0.start(Xt.card);
  const nb=oa.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;const hit=.42;
  {const n=oa.createBufferSource();n.buffer=nb;const f=oa.createBiquadFilter();f.type='bandpass';f.Q.value=2.5;f.frequency.setValueAtTime(300,0);f.frequency.exponentialRampToValueAtTime(5200,hit);const g=oa.createGain();g.gain.setValueAtTime(.0001,0);g.gain.exponentialRampToValueAtTime(.22,hit-.02);g.gain.exponentialRampToValueAtTime(.0001,hit+.05);n.connect(f);f.connect(g);g.connect(oa.destination);n.start(0);n.stop(hit+.1)}
  /* THE SLAM: a sharp crack, a deep punchy boom that drops in pitch (a little drive for weight), a metallic crash, all into a short room reverb */
  {const bus=oa.createGain();bus.gain.value=.9;const dry=oa.createGain();dry.gain.value=1;const wet=oa.createGain();wet.gain.value=.32;const cv=oa.createConvolver(),L=Math.floor(sr*1.7),ir=oa.createBuffer(2,L,sr);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3.2)}cv.buffer=ir;
   bus.connect(dry);dry.connect(oa.destination);bus.connect(cv);cv.connect(wet);wet.connect(oa.destination);
   const sh=oa.createWaveShaper(),cu=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;cu[i]=Math.tanh(2.2*x)}sh.curve=cu;sh.connect(bus);
   [[62,36,.95,1.1],[124,58,.45,.35]].forEach(([f0,f1,v,d])=>{const o=oa.createOscillator(),g=oa.createGain();o.type='sine';o.frequency.setValueAtTime(f0,hit);o.frequency.exponentialRampToValueAtTime(f1,hit+d*.6);g.gain.setValueAtTime(.0001,hit);g.gain.linearRampToValueAtTime(v,hit+.004);g.gain.exponentialRampToValueAtTime(.0001,hit+d);o.connect(g);g.connect(sh);o.start(hit);o.stop(hit+d+.05)});
   {const n=oa.createBufferSource();n.buffer=nb;const f=oa.createBiquadFilter();f.type='highpass';f.frequency.value=2800;const g=oa.createGain();g.gain.setValueAtTime(.55,hit);g.gain.exponentialRampToValueAtTime(.0001,hit+.035);n.connect(f);f.connect(g);g.connect(bus);n.start(hit);n.stop(hit+.05)}
   [[900,6,.32,.55],[2600,9,.18,.42],[5200,4,.1,.3]].forEach(([fq,q,v,d])=>{const n=oa.createBufferSource();n.buffer=nb;const f=oa.createBiquadFilter();f.type='bandpass';f.frequency.value=fq;f.Q.value=q;const g=oa.createGain();g.gain.setValueAtTime(v,hit+.002);g.gain.exponentialRampToValueAtTime(.0001,hit+d);n.connect(f);f.connect(g);g.connect(bus);n.start(hit,Math.random()*.5);n.stop(hit+d+.05)});
   {const n=oa.createBufferSource();n.buffer=nb;const f=oa.createBiquadFilter();f.type='lowpass';f.frequency.value=1600;const g=oa.createGain();g.gain.setValueAtTime(.4,hit);g.gain.exponentialRampToValueAtTime(.0001,hit+.28);n.connect(f);f.connect(g);g.connect(bus);n.start(hit);n.stop(hit+.3)}}
  /* the MZPRD voice, right after the slam */
  try{if(!VOBUF){const r=await fetch('mpc/intro_vo.mp3?v=1');VOBUF=await new OfflineAudioContext(1,1,sr).decodeAudioData(await r.arrayBuffer())}const vs=oa.createBufferSource();vs.buffer=VOBUF;const vg=oa.createGain();vg.gain.value=1;vs.connect(vg);vg.connect(oa.destination);vs.start(VO_AT)}catch(e){console.warn('intro voice',e)}
  [1318.5,1975.5,2637].forEach((fq,i)=>{const o=oa.createOscillator(),g=oa.createGain(),t=1.3+i*.05;o.type='sine';o.frequency.value=fq;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.025/(i+1),t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+1.4);o.connect(g);g.connect(oa.destination);o.start(t);o.stop(t+1.5)});
  if(packMode()&&ST.eng&&ST.eng.crk&&Xt.tracks&&Xt.tracks.length){const nb2=oa.createBuffer(1,sr*3,sr),d=nb2.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.02;for(let n=0;n<sr*3/350;n++){const p=Math.floor(Math.random()*d.length),a=(Math.random()<.15?.9:.35)*(Math.random()<.5?1:-1);for(let j=0;j<24&&p+j<d.length;j++)d[p+j]+=a*Math.exp(-j/4)}
  const t0=Xt.tracks[0].start,drop=Math.max(0,t0-.3);
  {const o=oa.createOscillator(),g=oa.createGain();o.type='sine';o.frequency.setValueAtTime(70,drop);o.frequency.exponentialRampToValueAtTime(35,drop+.15);g.gain.setValueAtTime(.0001,drop);g.gain.linearRampToValueAtTime(.35,drop+.004);g.gain.exponentialRampToValueAtTime(.0001,drop+.22);o.connect(g);g.connect(oa.destination);o.start(drop);o.stop(drop+.3)}
  {const s2=oa.createBufferSource();s2.buffer=nb2;const f=oa.createBiquadFilter();f.type='highpass';f.frequency.value=900;const g=oa.createGain();g.gain.setValueAtTime(.0001,drop);g.gain.linearRampToValueAtTime(1.1,drop+.01);g.gain.exponentialRampToValueAtTime(.25,drop+1.4);s2.connect(f);f.connect(g);g.connect(oa.destination);s2.start(drop);s2.stop(drop+2.9)}
  {const s3=oa.createBufferSource();s3.buffer=nb2;s3.loop=true;const f=oa.createBiquadFilter();f.type='bandpass';f.frequency.value=2500;f.Q.value=.7;const g=oa.createGain();g.gain.value=.18;s3.connect(f);f.connect(g);g.connect(oa.destination);const end=Xt.tracks[Xt.tracks.length-1];s3.start(drop+.5);s3.stop(end.start+end.dur)}}
 const ab=await oa.startRendering();Xt.mix=ab;Xt.mixSr=sr;return ab}const oa=new OfflineAudioContext(2,Math.ceil(Xt.total*sr),sr);
 Xt.tracks.forEach((tr,i)=>{const src=oa.createBufferSource();src.buffer=tr.S.buf;src.loop=tr.S.buf.duration<tr.dur+(tr.off||0);const g=oa.createGain();src.connect(g);g.connect(oa.destination);const last=i===Xt.tracks.length-1,fin=tr.fi!=null?tr.fi:(i===0?.04:(Xt.xf||1.2)),fout=tr.fo!=null?tr.fo:(last?1.3:(Xt.xf||1.2)),s0=tr.start,e0=tr.start+tr.dur;
  g.gain.setValueAtTime(.0001,s0);g.gain.linearRampToValueAtTime(1,s0+Math.max(.01,fin));if(fout>0){g.gain.setValueAtTime(1,Math.max(s0+fin,e0-fout));g.gain.linearRampToValueAtTime(.0001,e0)}else g.gain.setValueAtTime(1,e0);src.start(s0,tr.off||0,tr.dur)});
 if(Xt.sub){const at=Xt.subT0,tone=(t,f0,f1,d,v)=>{const o=oa.createOscillator(),g=oa.createGain();o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(oa.destination);o.start(t);o.stop(t+d+.05)};
  tone(at+1.55,560,240,.07,.1);[1320,1980,2640].forEach((f,i)=>tone(at+1.72,f,f,1.3-i*.25,.045/(i+1)))}
 if(Xt.intro>0){const o1=oa.createOscillator(),g1=oa.createGain();o1.type='sine';o1.frequency.setValueAtTime(95,PW+.02);o1.frequency.exponentialRampToValueAtTime(38,PW+.25);g1.gain.setValueAtTime(.0001,PW+.02);g1.gain.linearRampToValueAtTime(.26,PW+.035);g1.gain.exponentialRampToValueAtTime(.0001,PW+.3);o1.connect(g1);g1.connect(oa.destination);o1.start(PW+.02);o1.stop(PW+.35);
  const nb=oa.createBuffer(1,Math.ceil(sr*.12),sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;for(let k=0;k<7;k++){const s1=oa.createBufferSource();s1.buffer=nb;const bp=oa.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1500+k%3*500;bp.Q.value=3;const g2=oa.createGain();g2.gain.value=.05;s1.connect(bp);bp.connect(g2);g2.connect(oa.destination);s1.start(PW+1.05+k*.17)}const clk=(t,f,v)=>{const s=oa.createBufferSource();s.buffer=nb;const hp=oa.createBiquadFilter();hp.type='highpass';hp.frequency.value=f;const g=oa.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.001);g.gain.exponentialRampToValueAtTime(.0001,t+.025);s.connect(hp);hp.connect(g);g.connect(oa.destination);s.start(t)};clk(PW,700,.12);clk(Xt.make?Xt.make.T0-.27:Xt.intro-.27,1800,.13);
  const bp2=(t,f,d,v)=>{const o=oa.createOscillator(),g=oa.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(oa.destination);o.start(t);o.stop(t+d+.02)};bp2(PW+2.32,1760,.07,.035);const nm=String(Xt.title||'').length;for(let i=0;i<Math.min(nm,18);i++)bp2(PW+2.4+i*.07,1300+(i%3)*90,.02,.02);bp2(PW+Math.min(3.2,2.45+Math.min(nm,18)*.07+.1),2093,.09,.035)}
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
window.tpList=()=>tpList();function tpLabels(){const p=packMode(),l=$q('#mTpAddL');if(l)l.textContent=p?'ADD A SAMPLE PACK':'ADD A BEAT';const sm=$q('#s_tape');if(sm&&!ST.tape.on)sm.textContent=p?'several packs in one video':'several beats in one video'}
function tpList(){const T=ST.tape,el=$q('#mTpList');T.ids=T.ids.filter(id=>beatById(id));
 el.innerHTML=T.ids.length?T.ids.map((id,i)=>`<div class="it"><span style="color:var(--gold);font-weight:700">${i+1}</span><b>${esc(beatById(id).title)}</b><button data-u="${i}">UP</button><button data-d="${i}">DOWN</button><button data-x="${i}">REMOVE</button></div>`).join(''):'<div class="msg">'+(packMode()?'No packs in the playlist yet.':'No beats in the tape yet.')+'</div>';
 const mv=(i,j)=>{if(j<0||j>=T.ids.length)return;[T.ids[i],T.ids[j]]=[T.ids[j],T.ids[i]];tpDirty()};
 el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>mv(+b.dataset.u,+b.dataset.u-1));el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>mv(+b.dataset.d,+b.dataset.d+1));
 el.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{T.ids.splice(+b.dataset.x,1);tpDirty()});
 const a=$q('#mTpA');a.innerHTML=beats.filter(b=>!T.ids.includes(String(b.id))&&!T.ids.includes(b.id)).map(b=>`<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('')||'<option value="">'+(packMode()?'All packs are in the playlist':'All beats are in the tape')+'</option>'}
function tpDirty(){TP=null;stopPlay();save();tpList();$q('#mTpMsg').textContent=ST.tape.ids.length>=2?'The list changed. Press BUILD THE TAPE again.':'Add at least 2 beats.';ytRender();thRender();drawNow()}
async function buildTape(){const T=ST.tape,ids=T.ids.filter(beatById),msg=t=>{$q('#mTpMsg').textContent=t};if(ids.length<2){msg(packMode()?'Add at least 2 sample packs.':'Add at least 2 beats.');return}
 stopPlay();TP=null;const btn=$q('#mTpBuild');btn.disabled=true;
 try{const bs=ids.map(beatById);for(let i=0;i<bs.length;i++){msg('Listening to beat '+(i+1)+' of '+bs.length+': '+bs[i].title+'...');await loadBeat(bs[i])}
  const lead=startOn()?INTRO:1.6,xf=+T.xf||1.2,tracks=[];let t=lead;bs.forEach(b=>{const Sx=mkS(b,+T.len||0,kitOf(b.id));if(tracks.length===0)Sx.pre=startOn()?preHits(lead):null;tracks.push({S:Sx,start:t,dur:Sx.dur,b});t=t+Sx.dur-xf});
  const last=tracks[tracks.length-1];TP={kind:'tape',tracks,lead,xf,title:(packMode()&&/BEAT TAPE/i.test(T.title||'')?String(T.title).replace(/BEAT TAPE/i,'SAMPLE PACKS'):T.title),intro:startOn()?INTRO:0,total:last.start+last.dur+TAIL};
  msg('The tape is ready: '+tracks.length+' beats, '+mmss(TP.total)+' long. Press PLAY on the left, or render it.');$q('#mMsg').textContent='Tape ready ('+mmss(TP.total)+').';mark('yt','th','gen');if(window.__lpShow)__lpShow();drawNow()}
 catch(e){msg('Could not build the tape: '+(e&&e.message||e))}finally{btn.disabled=false}}

/* ---------- YouTube package + thumbnails (the brains are in mpcyt.js) ---------- */
const YT=()=>window.MZMpcYT;
const cpy=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}a.remove();return ok}};
function ytRenderNow(){const el=$q('#mYT');if(!el)return;const b=beats.find(x=>String(x.id)===String(ST.beat)),O=ST.tape.on?(TP&&YT()?(packMode()&&window.MZMpcPack?MZMpcPack.buildTape(ST,TP):YT().buildTape(ST,TP)):null):(b&&YT()?(packMode()&&window.MZMpcPack?MZMpcPack.build(ST,b):YT().build(ST,b,S)):null);if(!O){el.innerHTML='<div class="msg">'+(ST.tape.on?'Build the tape first.':'Pick a beat first.')+'</div>';return}
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
function genInfo(){const G=window.MZMpcGen,T=ST.tape;if(T.on){if(!TP)return null;const mins=Math.max(1,Math.round(TP.total/60));return{tape:true,beat:{title:TP.title,slug:'',id:'tape'},TP,N:TP.tracks.length,mins,title:TP.title,link:'https://mzprd.com',seedBase:TP.title.length*3+TP.tracks.length}}
 const b=beats.find(x=>String(x.id)===String(ST.beat));if(!b||!S)return null;const mins=Math.max(1,Math.round((S.dur||60)/60));return{beat:b,S,title:b.title,bpm:Number(b.bpm)||0,key:b.musical_key||'',mins,link:'https://mzprd.com/'+(packMode()?'pack':'beat')+'/'+(b.slug||b.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''))+'/',seedBase:String(b.id).length*17+b.title.length}}
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
 const run=more=>{const inf=genInfo();if(!inf){say(ST.tape.on?'Build the tape first (section 3).':'Pick a beat first.');return}g.seed=more?(g.seed||1)+1:(g.seed||1);const t0=performance.now();GEN=(packMode()&&window.MZMpcPack?MZMpcPack.generate(ST,inf,g.n,g.seed,g.angle?[g.angle]:null,MZMpcGen):MZMpcGen.generate(ST,inf,g.n,g.seed,g.angle?[g.angle]:null,window.MZMpcYT));GENOPEN=-1;save();genRender();say(GEN.length+' packages made in '+Math.round(performance.now()-t0)+' ms. Best score: '+(GEN.length?Math.max(...GEN.map(p=>p.score)):0)+'.')};
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
function ensureYT(){if(window.MZMpcYT&&window.MZMpcGen&&STUDIO!==null)return Promise.resolve();return YTP=YTP||(async()=>{await loadS('mpcyt.js?v=14');await loadS('mpcgen.js?v=5');await loadS('mpcpack.js?v=3');await ensureStudio()})()}
function paintPanels(){for(const k in PNL){const d=root&&$q(PNL[k][0]);if(d&&d.open&&dirty[k]){dirty[k]=0;ensureYT().then(()=>{try{PNL[k][1]()}catch(e){console.warn(e)}})}}}
const mark=(...ks)=>{ks.forEach(k=>dirty[k]=1);paintPanels()};
function ytRender(){mark('yt')}function thRender(){mark('th')}function genRender(){mark('gen')}
/* Sample to Beat switched on: the thumbnails follow the sample (its cleaned-up name, the tempo and key, "SAMPLE FLIP"); switched off: back to the selected beat or tape as before */
function s2bInfo(){return null;const z=ST.s2b;const raw=(EP&&z.useEp&&EP.make)?{name:EP.make.name,bpm:EP.make.bpm,key:EP.make.key}:(z.last?{name:z.last.name,bpm:z.last.bpm,key:z.last.key||''}:null);if(!raw||!raw.name)return null;
 const nm=String(raw.name).replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s*\d+(\.\d+)?\s*bpm.*$/i,'').replace(/\s+/g,' ').trim()||'SAMPLE';return{title:nm,bpm:Math.round(Number(raw.bpm)||0),key:String(raw.key||'').replace(' minor','m').replace(' major','')}}
function thRenderNow(){const el=$q('#mTH');if(!el||!YT())return;if(!packMode()&&ST.skin&&ST.skin!=='orig'&&!(SKINIMG[ST.skin]&&SKINIMG[ST.skin].h&&SKINIMG[ST.skin].v)){Promise.all([loadSkin(ST.skin,'h'),loadSkin(ST.skin,'v')]).then(()=>thRenderNow());return}const s2=s2bInfo(),b=s2?{title:s2.title}:ST.tape.on?{title:ST.tape.title}:beats.find(x=>String(x.id)===String(ST.beat));if(!b){el.innerHTML='<div class="msg">Pick a beat first.</div>';return}
 const T=ST.th,v=T.fmt==='v',W=v?1080:1280,H=v?1920:720,PALS=YT().PAL;
 el.innerHTML=`<div class="two"><div><label>FORMAT</label><select id="mThF"><option value="h"${v?'':' selected'}>16:9 THUMBNAILS (1280x720)</option><option value="v"${v?' selected':''}>9:16 SHORTS COVERS (1080x1920)</option></select></div><div><label>BACKGROUND</label><select id="mThD"><option value=""${T.bgm===''||T.bgm==null?' selected':''}>Mostly the desk</option><option value="desk"${T.bgm==='desk'?' selected':''}>Only the desk</option><option value="color"${T.bgm==='color'?' selected':''}>Only color backgrounds</option></select></div><div><label>HAND ON THE PADS</label><select id="mThH"><option value=""${T.hands===''||T.hands==null?' selected':''}>Some with, some without</option><option value="yes"${T.hands==='yes'?' selected':''}>Always a hand</option><option value="no"${T.hands==='no'?' selected':''}>Never (clean machine)</option></select></div><div><label>COLOR (COLOR BACKGROUNDS)</label><select id="mThP"><option value="">Mixed</option>${PALS.map((p,i)=>`<option value="${i}"${String(T.pal)===String(i)?' selected':''}>${p.n}</option>`).join('')}</select></div></div>
 <div class="two" style="margin-top:8px"><button class="btn" id="mThN">NEW SET OF 12</button><button class="btn" id="mThA">DOWNLOAD ALL 12</button></div>
 <div class="msg">Text on the picture stays at 5 words or fewer so it reads on a phone: the artist, TYPE BEAT and the beat name. Click a thumbnail to download it.</div>
 <div id="mThG" style="display:grid;grid-template-columns:repeat(${v?4:2},1fr);gap:8px"></div>`;
 const g=el.querySelector('#mThG'),X=s2?{title:s2.title,big:'SAMPLE FLIP',extra:'CHOP + FLIP',bpm:s2.bpm,key:s2.key,artist:ST.artist}:ST.tape.on?{title:ST.tape.title,big:'BEAT TAPE',extra:(TP?TP.tracks.length:ST.tape.ids.length)+' BEATS',bpm:0,key:'',artist:ST.artist}:{title:b.title,bpm:Number(b.bpm)||0,key:b.musical_key||'',artist:ST.artist},tok=++thTok;
 const fonts=document.fonts?Promise.all(["40px Anton","600 30px Oswald","30px VT323"].map(f=>document.fonts.load(f).catch(()=>{}))):Promise.resolve();
 const opt=i=>({pal:T.pal===''?null:+T.pal,desk:T.bgm==='desk'?true:T.bgm==='color'?false:null,hands:T.hands==='yes'?true:T.hands==='no'?false:null}),fname=i=>(b.title||'beat').replace(/[^\w -]+/g,'')+' - MPC thumb '+(i+1)+(v?' 9x16':'')+'.jpg';
 /* previews are drawn at half size (a quarter of the work); the full size picture is only drawn when you download it */
 const full=i=>new Promise(res=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;(packMode()&&window.MZMpcPack?MZMpcPack.make:YT().make)(cv.getContext('2d'),W,H,T.seed*100+i+1,X,opt(i));cv.toBlob(res,'image/jpeg',.92)});
 const dl=async i=>dlf(await full(i),fname(i));
 fonts.then(()=>{if(tok!==thTok)return;let i=0;const step=()=>{if(tok!==thTok)return;for(let n=0;n<2&&i<12;n++,i++){const k=i,seed=T.seed*100+k+1,cv=document.createElement('canvas');cv.width=Math.round(W/2);cv.height=Math.round(H/2);cv.style.cssText='width:100%;display:block;cursor:pointer;border:1px solid #2a2a2e';const x=cv.getContext('2d');x.scale(.5,.5);const info=(packMode()&&window.MZMpcPack?MZMpcPack.make:YT().make)(x,W,H,seed,X,opt(k));
   const wrap=document.createElement('div');wrap.appendChild(cv);const cap=document.createElement('div');cap.className='msg';cap.style.margin='2px 0 0';cap.textContent=info.pal+' / '+info.bg+' / '+info.text;wrap.appendChild(cap);g.appendChild(wrap);cv.onclick=()=>dl(k)}
   if(i<12)requestAnimationFrame(step)};step();
  el.querySelector('#mThA').onclick=async()=>{for(let k=0;k<12;k++){await dl(k);await new Promise(r=>setTimeout(r,500))}}});
 el.querySelector('#mThF').onchange=e=>{T.fmt=e.target.value;save();thRender()};el.querySelector('#mThH').onchange=e=>{T.hands=e.target.value;save();thRender()};el.querySelector('#mThD').onchange=e=>{T.bgm=e.target.value;save();thRender()};el.querySelector('#mThP').onchange=e=>{T.pal=e.target.value;save();thRender()};el.querySelector('#mThN').onclick=()=>{T.seed++;save();thRender()}}

const SUM={scene:()=>(ST.scene==='white'?'White studio':'Desk / '+((SKINS.find(k=>k[0]===(ST.skin||'orig'))||[0,'Original'])[1]).replace(/^The /,''))+(ST.res==='4k'?' / 4K':''),
 cam:()=>{const t=[];if(ST.lamp!=null&&+ST.lamp!==2)t.push('lamp '+['steady','gentle','real','dramatic'][ST.lamp]);const m=ST.cam||{};if(m.dof&&m.dof!=='0')t.push('DOF '+(m.dof==='2'?'strong':'soft'));if(m.rack)t.push('focus pull');if(m.moves&&camAny(m.moves)){const n=CAMMV.filter(([k])=>m.moves[k]).length;t.push(n+(n===1?' camera move':' camera moves'))}if(m.grade&&m.grade!=='0')t.push({warm:'warm film',teal:'teal+orange',cold:'cold',faded:'faded 90s'}[m.grade]);return t.join(' / ')||'lamp real'},
 extras:()=>{const t=[];if(startOn())t.push('hands power on');if(ST.hands&&ST.hands.on)t.push('hands');if(ST.smoke&&ST.smoke.on)t.push('smoke');return t.join(' / ')||'none'},
 hits:()=>['clear hits','balanced','every hit'][ST.sens==null?1:ST.sens]+((ST.nudge||0)?' / '+ST.nudge+' ms':''),
 watch:()=>{const E=ST.eng,t=[];if(E.hook)t.push('hook');if(E.sub)t.push('subscribe');if(E.loop)t.push('loop');if(E.note)t.push('note');if(E.q)t.push('question');return t.join(' / ')||'none'},
 beat:()=>{const b=beats.find(x=>String(x.id)===String(ST.beat));return b?b.title:'pick a beat'}};
function summ(){if(!root)return;for(const k in SUM){const e=root.querySelector('#s_'+k);if(e)e.textContent=SUM[k]()}const t=root.querySelector('#s_tape');if(t)t.textContent=ST.tape.on?(ST.tape.ids.length+' beats / ON'):'several beats in one video'}
/* BEATS or SAMPLE PACKS: packs play in their own scene (pad controller + turntable); each side remembers its own pick */
function srcUI(){const p=packMode();$q('#mSrcB').style.background=p?'':'var(--red)';$q('#mSrcP').style.background=p?'var(--red)':'';$q('#mBeatL').textContent=p?'SAMPLE PACK':'BEAT'}
async function setSrc(m){if((ST.src||'beats')===m)return;stopPlay();ST['tape_'+(ST.src||'beats')]=ST.tape.ids;ST.tape.ids=ST['tape_'+m]||[];TP=null;ST['pick_'+(ST.src||'beats')]=ST.beat;ST.src=m;beats=m==='packs'?PACKS:BEATS0;ST.beat=ST['pick_'+m]||'';S=null;save();
 const sel=$q('#mBeat');sel.innerHTML='<option value="">'+(m==='packs'?'Choose a sample pack...':'Choose a beat...')+'</option>'+beats.map(b=>`<option value="${esc(b.id)}">${esc(b.title)}${b.bpm?' ('+b.bpm+' BPM)':''}</option>`).join('');sel.value=String(ST.beat||'');srcUI();
 await ensureScene(ST.fmt);size();drawNow();GEN=[];if(window.tpList)tpList();tpLabels();mark('yt','th','gen');if(ST.beat&&beats.some(b=>String(b.id)===String(ST.beat)))pick(ST.beat)}
function wire(){$q('#mSrcB').onclick=()=>setSrc('beats');$q('#mSrcP').onclick=()=>setSrc('packs');srcUI();setTimeout(()=>{try{tpLabels()}catch(e){}},0);const sel=$q('#mBeat');sel.innerHTML='<option value="">Choose a beat...</option>'+beats.map(b=>`<option value="${esc(b.id)}">${esc(b.title)}${b.bpm?' ('+b.bpm+' BPM)':''}</option>`).join('');if(ST.beat)sel.value=String(ST.beat);$q('#mLearnAll').onclick=()=>learnAll();
 $q('#mArt').value=ST.artist;$q('#mLcd').value=ST.lcd;$q('#mTxt').checked=!!ST.text;$q('#mLen').value=String(ST.len);
 sel.onchange=()=>{if(sel.value)pick(sel.value)};$q('#mArt').onchange=e=>{ST.artist=e.target.value.trim();save();mark('yt','th','gen')};for(const k in PNL){$q(PNL[k][0]).addEventListener('toggle',paintPanels)}
 $q('#mLcd').oninput=e=>{ST.lcd=e.target.value;if(S){S.lcd=ST.lcd.trim();drawNow()}save()};$q('#mRes').value=ST.res||'1080';$q('#mRes').onchange=e=>{ST.res=e.target.value;save()};$q('#mSkin').value=ST.skin||'orig';$q('#mSkin').onchange=async e=>{ST.skin=e.target.value;await ensureScene(ST.fmt);save();drawNow();mark('th')};$q('#mProp').value=ST.prop||'floppy';$q('#mProp').onchange=async e=>{ST.prop=e.target.value;await ensureScene(ST.fmt);save();drawNow()};$q('#mIprot').value=String(ST.iprot||0);$q('#mIprotV').textContent=(+ST.iprot||0).toFixed(1);$q('#mIprot').oninput=e=>{ST.iprot=+e.target.value;$q('#mIprotV').textContent=ST.iprot.toFixed(1);save();drawNow()};$q('#mRProp').value=ST.rprop||'floppy';$q('#mRProp').onchange=async e=>{ST.rprop=e.target.value;await ensureScene(ST.fmt);save();drawNow()};$q('#mTSkin').value=ST.tskin||'0';$q('#mTSkin').onchange=async e=>{ST.tskin=e.target.value;await ensureScene(ST.fmt);save();drawNow()};$q('#mPSkin').value=ST.pskin||'0';$q('#mPSkin').onchange=async e=>{ST.pskin=e.target.value;await ensureScene(ST.fmt);save();drawNow()};
 const CM=ST.cam;CM.moves=CM.moves||{};{const box=$q('#mCamMvList');if(box){box.innerHTML=CAMMV.map(([k,t])=>'<label class="chk" style="font-size:11px"><input type="checkbox" data-mv="'+k+'"'+(CM.moves[k]?' checked':'')+'> '+t+'</label>').join('');box.querySelectorAll('[data-mv]').forEach(c=>c.onchange=()=>{CM.moves[c.dataset.mv]=c.checked;save();drawNow();summ()})}}$q('#mDof').value=CM.dof;$q('#mRack').checked=!!CM.rack;$q('#mGrade').value=CM.grade;
 $q('#mDof').onchange=e=>{CM.dof=e.target.value;save();drawNow()};$q('#mRack').onchange=e=>{CM.rack=e.target.checked;save();drawNow()};$q('#mGrade').onchange=e=>{CM.grade=e.target.value;save();drawNow()};
 $q('#mIntro').checked=startOn();$q('#mIntro').onchange=e=>{ST.start=e.target.checked;save();stopPlay();if(S&&S.buf){S.tl=tlOne(S);dropV()}if(TP){TP=null;$q('#mTpMsg').textContent='The intro changed. Press BUILD THE TAPE again.';mark('yt','th','gen')}drawNow()};
 const CN=ST.can;$q('#mCan').value=String(CN.id);const canUi=()=>{$q('#mCanSet').style.display=(CN.id==='orig'||CN.id==='none')?'none':'block';$q('#mCanSv').textContent=CN.size;$q('#mCanRv').textContent=CN.rot};
 $q('#mCanS').value=String(CN.size);$q('#mCanR').value=String(CN.rot);$q('#mCanX').value=String(CN.x);$q('#mCanY').value=String(CN.y);canUi();
 $q('#mCan').onchange=async e=>{CN.id=e.target.value;canUi();await ensureScene(ST.fmt);save();drawNow()};
 [['#mCanS','size'],['#mCanR','rot'],['#mCanX','x'],['#mCanY','y']].forEach(([id,k])=>$q(id).oninput=e=>{CN[k]=+e.target.value;canUi();save();drawNow()});
 $q('#mCanReset').onclick=()=>{Object.assign(CN,{size:100,rot:0,x:0,y:0});$q('#mCanS').value='100';$q('#mCanR').value='0';$q('#mCanX').value='0';$q('#mCanY').value='0';canUi();save();drawNow()};
 $q('#mLamp').value=String(ST.lamp==null?2:ST.lamp);$q('#mLamp').onchange=e=>{ST.lamp=+e.target.value;save();drawNow()};$q('#mHands').checked=!!ST.hands.on;$q('#mHands').onchange=e=>{ST.hands.on=e.target.checked;save();drawNow()};$q('#mScene').value=ST.scene||'desk';$q('#mScene').onchange=async e=>{ST.scene=e.target.value;await ensureScene(ST.fmt);save();drawNow()};$q('#mTxt').onchange=e=>{ST.text=e.target.checked;save();drawNow()};
 $q('#mKit').onchange=e=>{if(!ST.beat)return;ST.kits=ST.kits||{};if(e.target.value==='')delete ST.kits[ST.beat];else ST.kits[ST.beat]=+e.target.value;save();if(S&&S.raw){applyKit();if(TP)TP=null;drawNow()}};
 $q('#mLen').onchange=e=>{ST.len=+e.target.value;save();if(ST.beat)pick(ST.beat)};
 $q('#mFh').onclick=async()=>{ST.fmt='h';save();await ensureScene('h');size();drawNow()};$q('#mFv').onclick=async()=>{ST.fmt='v';save();await ensureScene('v');size();drawNow()};
 $q('#mPlay').onclick=play;$q('#mScrub').oninput=()=>{if(PV.playing)stopPlay();drawNow()};
 const T=ST.tape;$q('#mSens').value=String(ST.sens==null?1:ST.sens);$q('#mNudge').value=String(ST.nudge||0);$q('#mNudgeV').textContent=String(ST.nudge||0);const relay=()=>{save();for(const id in CACHE){}if(S&&S.raw){applyKit();S._hh=null;if(S.tl){S.tl._v=null;S.tl._h=null;S.tl._c=null}}if(TP){TP.tracks.forEach(t=>{const L=layout(t.S.raw,t.S.kit);t.S.hits=L.hits;t.S.per=L.per;t.S._hh=null});TP._v=null;TP._h=null;TP._c=null}drawNow()};$q('#mSens').onchange=e=>{ST.sens=+e.target.value;relay()};$q('#mNudge').oninput=e=>{ST.nudge=+e.target.value;$q('#mNudgeV').textContent=String(ST.nudge);relay()};$q('#mTpOn').checked=!!T.on;$q('#mTpT').value=T.title;$q('#mTpL').value=String(T.len);$q('#mTpX').value=String(T.xf);$q('#mTpBox').style.display=T.on?'block':'none';tpList();
 root.querySelectorAll('details.grp').forEach(d=>{d.open=!!ST.open[d.id];d.addEventListener('toggle',()=>{ST.open[d.id]=d.open?1:0;save()})});$q('#mOpenAll').onclick=()=>root.querySelectorAll('details.grp').forEach(d=>d.open=true);$q('#mCloseAll').onclick=()=>root.querySelectorAll('details.grp').forEach(d=>d.open=false);
 $q('#mRight').addEventListener('change',()=>setTimeout(summ,0));$q('#mRight').addEventListener('input',()=>setTimeout(summ,0));summ();
 $q('#mTpOn').onchange=e=>{T.on=e.target.checked;save();$q('#mTpBox').style.display=T.on?'block':'none';stopPlay();ytRender();thRender();drawNow()};
 $q('#mTpT').onchange=e=>{T.title=e.target.value.trim()||'MZPRD BEAT TAPE';if(TP){TP.title=T.title;TP.mix=null}save();ytRender();thRender();drawNow()};
 $q('#mTpL').onchange=e=>{T.len=+e.target.value;tpDirty()};$q('#mTpX').onchange=e=>{T.xf=+e.target.value;tpDirty()};
 $q('#mTpAdd').onclick=()=>{const v=$q('#mTpA').value;if(!v)return;T.ids.push(v);tpDirty()};$q('#mTpBuild').onclick=buildTape;
 const En=ST.eng;$q('#mEhk').checked=!!En.hook;$q('#mEhkT').value=En.hookText;$q('#mEsub').checked=!!En.sub;$q('#mEmet').checked=En.meters!==false;$q('#mEtape').checked=!!En.tapelab;$q('#mEcmts').checked=!!En.cmts;$q('#mEend').checked=!!En.endcard;$q('#mEcrk').checked=!!En.crk;$q('#mElogo').checked=!!En.logo;$q('#mEloop').checked=!!En.loop;$q('#mEnote').checked=!!En.note;$q('#mEnoteT').value=En.noteText;$q('#mEq').checked=!!En.q;$q('#mEqT').value=En.qText;
 const eng=(id,k,box)=>{$q(id).onchange=e=>{En[k]=box?e.target.checked:e.target.value;if(k==='sub'||k==='loop'||k==='logo'||k==='crk'){dropV();stopPlay()}save();drawNow()};if(!box)$q(id).oninput=e=>{En[k]=e.target.value;drawNow()}};
 eng('#mEhk','hook',1);eng('#mEhkT','hookText');eng('#mEsub','sub',1);eng('#mEmet','meters',1);eng('#mEtape','tapelab',1);eng('#mEcmts','cmts',1);eng('#mEend','endcard',1);eng('#mEcrk','crk',1);eng('#mElogo','logo',1);eng('#mEloop','loop',1);eng('#mEnote','note',1);eng('#mEnoteT','noteText');eng('#mEq','q',1);eng('#mEqT','qText');
 $q('#mRcu').onclick=()=>render(['c']);$q('#mRlp').onclick=renderLoop;
 const lpShow=()=>{const o=$q('#mLpOut'),P=loopPack();if(!P||!ST.beat){o.innerHTML='';return}o.innerHTML='<h4>LOOP VIDEO TITLES AND DESCRIPTION</h4>'+P.titles.map((t,i)=>'<div class="it"><b>'+esc(t)+'</b><button data-lt="'+i+'">COPY</button></div>').join('')+'<button class="btn" id="mLpD" style="width:100%;margin-top:6px">COPY DESCRIPTION</button>';o.querySelectorAll('[data-lt]').forEach(b=>b.onclick=async()=>{b.textContent=(await cpy(P.titles[+b.dataset.lt]))?'COPIED':'FAILED'});$q('#mLpD').onclick=async e=>{e.target.textContent=(await cpy(P.desc))?'COPIED':'FAILED'}};
 $q('#mLpM').onchange=lpShow;window.__lpShow=lpShow;
 $q('#mRh').onclick=()=>render(['h']);$q('#mRv').onclick=()=>render(['v']);$q('#mRb').onclick=()=>render(['h','v'])}
window.MZMpcPackArt={cover:()=>COVERS[ST&&ST.beat]||null,scene:()=>DESKS.ph||null};
window.mpcOpen=async function(){css();root=document.getElementById('mpcmk');root.classList.add('on');
 if(!mounted){root.innerHTML='<div class="pn"><div class="msg">Loading the MPC...</div></div>';
  try{await loadS('mpcdetect.js?v=10');await loadS('mpccomments.js?v=2');if(!document.querySelector('link[data-mpc]')){await new Promise(res=>{const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_LINK;l.dataset.mpc='1';l.onload=res;l.onerror=res;document.head.appendChild(l);setTimeout(res,5000)})}
   await Promise.all(["40px Anton","600 40px Oswald","30px VT323","700 40px Caveat","40px Reenie Beanie"].map(f=>document.fonts.load(f).catch(()=>{})));prepHands(await loadImg('mpc/hand_r.webp'),await loadImg('mpc/hand_l.webp'))}
  catch(e){root.innerHTML='<div class="pn"><div class="msg">The MPC did not load. Refresh the page.</div></div>';return}
  try{const {data}=await sb.from('beats').select('id,title,bpm,musical_key,preview_path,slug,tags').order('sort_order',{ascending:true}).order('created_at',{ascending:false});beats=(data||[]).filter(b=>b.preview_path)}catch(e){beats=[]}BEATS0=beats;
  try{const {data}=await sb.from('packs').select('id,title,preview_path,cover_path,slug').eq('published',true).order('created_at',{ascending:false});PACKS=(data||[]).filter(p=>p.preview_path).map(p=>({id:'p:'+p.id,title:p.title,bpm:null,musical_key:'',preview_path:p.preview_path,cover_path:p.cover_path,slug:p.slug,tags:'Sample pack'}))}catch(e){PACKS=[]}
  ST=load();if(!ST.th)ST.th={seed:1,pal:'',fmt:'h'};if(!ST.yt.v)ST.yt.v=0;if(!ST.tape)ST.tape=defaults().tape;if(!ST.eng)ST.eng=defaults().eng;if(!ST.smoke)ST.smoke=defaults().smoke;if(!ST.hands)ST.hands=defaults().hands;if(!ST.gen)ST.gen=defaults().gen;if(!ST.can)ST.can=defaults().can;if(!ST.cam)ST.cam=defaults().cam;if(!ST.open)ST.open={g_beat:1};S=null;if(packMode())beats=PACKS;root.innerHTML=html();wire();await ensureScene(ST.fmt);size();mounted=true;drawNow();if(ST.beat&&beats.some(b=>String(b.id)===String(ST.beat)))pick(ST.beat)}
};
window.mpcClose=function(){if(root)root.classList.remove('on');stopPlay()};
window.__mpc={lamp:T=>lampLevel(T),hand:(Sx,key,T)=>handAt(handHits(Sx,DK)[key],T,DK,key),xf:XF,st:()=>ST,s:()=>S,tp:()=>TP,x:X,frame,analyze,PH,pv:()=>PV,buildTape};window.MZMpc={skinScene:k=>{const id=ST&&ST.skin;if(!id||id==='orig'||!SKINIMG[id]||!SKINIMG[id][k])return null;applySkinLcd();return{img:SKINIMG[id][k],G:k==='v'?DKV:DK}},machine,PH,fitFont,mmss,clamp,img:()=>IMG,cut:()=>CUT,bg:k=>DESKBG[k],warm:()=>WARM,handsReady:()=>!!HANDS,hand:(c,key,padIdx,hover,lampPos)=>{if(!HANDS)return;const p=padC(PH,padIdx);drawOneHand(c,PH,key,{x:p[0],y:p[1],hover},true,0,lampPos)}};
})();
