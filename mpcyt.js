/* MZPRD MPC video maker, part 2: the YouTube package brain (titles, description, tags, comments, checks) and the thumbnail engine with the MPC in it.
   Rules behind it (from what producers and YouTube guides agree on): artist + "type beat" first in the title, strongest keywords in the first 60 characters,
   the first 150 characters of the description carry the hook and the buy link, BPM / key / mood listed for buyers, only the first 3 hashtags show, tags matter least,
   thumbnails with 5 words or fewer, big and high contrast, one consistent template, and test two or three of them against each other. */
(function(){
'use strict';
const M=()=>window.MZMpc;
const hs=(n,s)=>{const x=Math.sin((n+1)*127.1+(s||0)*311.7)*43758.5453;return x-Math.floor(x)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const cap=s=>String(s||'').replace(/\b\w/g,c=>c.toUpperCase());

/* ================= YOUTUBE PACKAGE ================= */
const SATURATED=['drake','travis scott','kanye west','kanye','future','juice wrld','lil baby','lil uzi vert','pop smoke','kendrick lamar','j cole','nba youngboy','polo g','central cee','21 savage','metro boomin','gunna','young thug','lil durk','roddy ricch'];
const MOODS=['hard','dark','dusty','gritty','smooth','soulful','emotional','melodic','cinematic','raw','moody','lo-fi'];
function artistsOf(str){return String(str||'').split(/\s*(?:,|\bx\b|&|\/|\+)\s*/i).map(s=>s.trim()).filter(Boolean).slice(0,3)}
function build(ST,beat,S){
 if(!beat)return null;const T=beat.title,bpm=Number(beat.bpm)||0,key=beat.musical_key||'',year=new Date().getFullYear(),AR=artistsOf(ST.artist),A=AR.join(' x '),A1=AR[0]||'',link='https://mzprd.com/beat/'+(beat.slug||slug(T))+'/',pre=ST.yt.mode==='premiere';
 const v=ST.yt.v||0,seed=(String(beat.id).length*31+T.length*7+v*13),mood=cap(MOODS[Math.floor(hs(1,seed)*MOODS.length)]),mood2=cap(MOODS[(Math.floor(hs(2,seed)*MOODS.length)+3)%MOODS.length]);
 const tb=A?`${A} Type Beat`:`Boom Bap Type Beat`,sub=bpm?`${bpm} BPM`:'';
 const tpl=[
  ['SEARCH',`${tb} - "${T}" | ${year}`],['SEARCH',`${tb} "${T}" (${mood} Boom Bap ${year})`],['SEARCH',`${A?A+' ':''}${mood} Boom Bap Type Beat - "${T}" (Prod. MZPRD)`],
  ['SEARCH',`${tb} ${year} - ${mood} MPC Instrumental "${T}"`],['SEARCH',`"${T}" - ${tb} | ${mood} ${mood2} Beat`],['SEARCH',`${tb} (${sub?sub+' ':''}${key?key+' ':''}${mood}) - ${T}`],
  ['MPC',`I Made a ${mood} ${A?A+' ':''}Type Beat on the MPC60 ("${T}")`],['MPC',`MPC60 Beat Making: "${T}" - ${tb}`],['MPC',`Watch the Pads: "${T}" Played Live on the Akai MPC60 II`],
  ['MPC',`${sub?sub+' ':''}${key?key+' ':''}${mood} Boom Bap on the MPC60 | "${T}"`],['MPC',`MPC60 Live Pad Performance - ${tb} "${T}"`],['MPC',`Making a ${mood} Boom Bap Beat on the Akai MPC60 II (${T})`],
  ['CLICK',`This MPC60 Beat Hits Different ("${T}")`],['CLICK',`Boom Bap on an MPC60 in ${year}: "${T}"`],['CLICK',`"${T}" - ${tb}, Played Live on MPC`],['CLICK',`Pure ${mood} Boom Bap, All Played on a 1988 MPC (${T})`],
  ['HYBRID',`${tb} "${T}" | MPC60 Live Pad Performance`],['HYBRID',`${A1?A1+' Type Beat':'Type Beat'} ${year} "${T}" (Played Live on MPC60)`],['HYBRID',`${mood} ${tb} - "${T}" | Akai MPC60 II`]];
 const score=(k,t)=>{let s=50;const L=t.length,i=t.toLowerCase().indexOf('type beat');if(A&&t.toLowerCase().indexOf(A.toLowerCase())>=0&&t.toLowerCase().indexOf(A.toLowerCase())<30)s+=14;if(i>=0&&i<45)s+=10;if(L<=60)s+=12;else if(L<=70)s+=6;else if(L>100)s-=30;else s-=6;if(t.indexOf(String(year))>=0)s+=6;if(/mpc/i.test(t))s+=4;if(k==='SEARCH'&&A)s+=4;if(!A&&/type beat/i.test(t))s-=4;return clamp(s,0,100)};
 const order=tpl.map((x,i)=>({k:x[0],t:x[1].replace(/\s+/g,' ').replace(/\s\)/g,')').replace(/\(\s/g,'(').replace(/ \| \|/g,'|').trim(),i,r:hs(i,seed)}));
 order.sort((a,b)=>a.r-b.r);const titles=order.slice(0,9).map(o=>({k:o.k,t:o.t.slice(0,100),s:score(o.k,o.t)}));let best=0;titles.forEach((t,i)=>{if(t.s>titles[best].s)best=i});titles[best].best=true;
 const first=`${pre&&ST.yt.when?'Premieres '+ST.yt.when+': ':''}${A?A+' type beat':'Boom bap type beat'} "${T}" played live on the Akai MPC60 II.${bpm?' '+bpm+' BPM':''}${key?' / '+key:''}`;
 const desc=[first+' Buy or lease it here: '+link,'',
  '> BUY / LEASE THIS BEAT: '+link,'> ALL BEATS AND SAMPLE PACKS: https://mzprd.com','',
  'BEAT DETAILS','Title: '+T,A?'Type: '+AR.map(a=>a+' type beat').join(' / '):'Style: Boom bap / hip hop instrumental',bpm?'BPM: '+bpm:'',key?'Key: '+key:'','Mood: '+mood+', '+mood2.toLowerCase(),'Played on: Akai MPC60 II (the pads you see are the hits you hear)','',
  'ABOUT THIS VIDEO','Every pad that pushes in on screen is a kick, snare, hat or chop from the beat. '+(A?'If you are looking for a '+A+' type beat with a real boom bap feel, this one is for you.':'If you are looking for a hard boom bap type beat with a real MPC feel, this one is for you.'),'',
  'All beats are original productions by MZPRD (Meztheprod). Lease or buy at mzprd.com.','','#typebeat #mpc60 #boombap'].filter((x,i,a)=>!(x===''&&a[i-1]===''&&i>0)).filter(x=>x!==undefined).join('\n').replace(/\n\n\n+/g,'\n\n');
 const tagList=[A?A.toLowerCase()+' type beat':'',A?A.toLowerCase()+' type beat '+year:'',A?A.toLowerCase()+' instrumental':'',AR.length>1?AR[0].toLowerCase()+' type beat':'',AR.length>1?AR[1].toLowerCase()+' type beat':'','boom bap type beat','mpc60 beat','mpc beat making','akai mpc60 ii','mpc live pad performance','hard boom bap instrumental',(mood.toLowerCase()+' boom bap'),T.toLowerCase(),'hip hop instrumental','buy beats online','mzprd','meztheprod'].filter(Boolean);
 const seen=new Set();let tags='';tagList.forEach(t=>{if(!seen.has(t)&&(tags+t).length<430){seen.add(t);tags+=(tags?', ':'')+t}});
 const pinned=[`Which pad hit hardest? Tell me in the comments. Buy or lease "${T}": ${link}`,`Drop your favorite rapper and I will make the next ${A?A+' ':''}type beat for them. Get this one: ${link}`,`Who would sound best on "${T}"? ${A?A+' or somebody else? ':''}Lease it here: ${link}`];
 const shorts={title:`${T} on the MPC60${A?' ('+A+' type beat)':''}`.slice(0,70),desc:`${A?A+' type beat':'Boom bap type beat'} "${T}" played live on the MPC60 II. Full beat: ${link}\n\n#shorts #mpc60 #typebeat`};
 const checks=[],ck=(ok,msg)=>checks.push({ok,msg});const bt=titles[best];
 ck(bt.t.length<=60,'Best title is '+bt.t.length+' characters. Under 60 shows in full in search; the limit is 100.');
 ck(!!A,A?'Artist in the title: yes. "type beat" searches are how buyers find you.':'No artist yet. Add a "sounds like" artist (or two) so the title can rank for "[artist] type beat".');
 if(A1&&SATURATED.includes(A1.toLowerCase()))ck(false,A1+' is very crowded: huge catalogue channels own the top results. Pair it ("'+A1+' x a smaller artist") or add a sub-style ("dark boom bap") to stand out.');
 else if(A1)ck(true,'"'+A1+'" is not one of the most crowded names, which helps.');
 ck(!!bpm&&!!key,bpm&&key?'BPM and key are in the description (buyers search by them).':'BPM or key missing on this beat. Add them in the beat editor so they land in the description.');
 ck(true,'The first 150 characters of the description hold the hook and your buy link.');
 ck(true,'Only 3 hashtags are used (YouTube shows the first 3 above the title; more can hurt).');
 ck(tags.length<=450,'Tags are short and specific ('+tags.length+' characters). They matter less than the title, so do not stuff them.');
 const tips=['Upload the 16:9 for YouTube. Upload the 9:16 as a Short too, with the Shorts title below.','Test 2 or 3 thumbnails: after upload use "Test & Compare" in YouTube Studio and let it pick the winner.','Pick 2 or 3 artists and stay with them for a month. Channels that stay focused get recommended more.','Pin your comment right after you upload (it is below), and answer the first comments fast.','Add the video to a playlist called "MPC Beats" so the next video autoplays.','Do not paste your tags into the description. Keep tags in the tag box only.'];
 return{titles,desc,tags,pinned,shorts,checks,tips,link}}

/* ================= THUMBNAILS ================= */
const PAL=[
 {n:'RED',bg:'#e0242f',bg2:'#7d0c14',acc:'#ffd23f',ink:'#ffffff',dark:'#0b0b0d'},
 {n:'GOLD',bg:'#e8b94a',bg2:'#8f6209',acc:'#0b0b0d',ink:'#0b0b0d',dark:'#0b0b0d',light:true},
 {n:'BLACK',bg:'#0b0b0d',bg2:'#2a2a30',acc:'#e0242f',ink:'#ffffff',dark:'#0b0b0d'},
 {n:'WHITE',bg:'#ffffff',bg2:'#dcdce2',acc:'#e0242f',ink:'#0b0b0d',dark:'#0b0b0d',light:true},
 {n:'BLUE',bg:'#1f4bff',bg2:'#0a1b78',acc:'#ffe14a',ink:'#ffffff',dark:'#07102e'},
 {n:'GREEN',bg:'#14c46c',bg2:'#05603a',acc:'#0b0b0d',ink:'#ffffff',dark:'#032b1a'},
 {n:'PURPLE',bg:'#7b2cff',bg2:'#27086b',acc:'#ffd23f',ink:'#ffffff',dark:'#12043a'},
 {n:'ORANGE',bg:'#ff7a1a',bg2:'#8a3200',acc:'#0b0b0d',ink:'#ffffff',dark:'#1d0c00'}];
const BGS=['solid','vgrad','sunburst','halftone','grid','stripes','spot','split','vinyl','paper'];
const TXS=['stack','banner','sticker','outline','bar'];
const LAYOUTS=12;
function bg(c,W,H,st,P,r){
 c.save();c.fillStyle=P.bg;c.fillRect(0,0,W,H);
 if(st==='vgrad'){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,P.bg);g.addColorStop(1,P.bg2);c.fillStyle=g;c.fillRect(0,0,W,H)}
 else if(st==='sunburst'){c.translate(W*(.3+r*.4),H*.55);const n=18;for(let i=0;i<n;i+=2){c.fillStyle=P.bg2;c.globalAlpha=.55;c.beginPath();c.moveTo(0,0);const a0=i/n*6.283,a1=(i+1)/n*6.283,R=Math.max(W,H)*1.4;c.lineTo(Math.cos(a0)*R,Math.sin(a0)*R);c.lineTo(Math.cos(a1)*R,Math.sin(a1)*R);c.closePath();c.fill()}}
 else if(st==='halftone'){c.fillStyle=P.bg2;c.globalAlpha=.5;const s=26;for(let y=0;y<H+s;y+=s)for(let x=((y/s)%2)*s/2;x<W+s;x+=s){const d=Math.hypot(x-W*.5,y-H*.5)/Math.hypot(W*.5,H*.5);c.beginPath();c.arc(x,y,2+9*d,0,6.283);c.fill()}}
 else if(st==='grid'){c.strokeStyle=P.bg2;c.globalAlpha=.55;c.lineWidth=2;const s=Math.round(H/10);for(let x=0;x<W;x+=s){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=s){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}}
 else if(st==='stripes'){c.fillStyle=P.bg2;c.globalAlpha=.5;c.rotate(-.35);for(let x=-H;x<W+H;x+=90){c.fillRect(x,-H,44,H*3)}}
 else if(st==='spot'){const g=c.createRadialGradient(W*(.3+r*.4),H*.5,20,W*.5,H*.5,Math.max(W,H)*.8);g.addColorStop(0,P.light?'#fff':P.bg);g.addColorStop(1,P.bg2);c.fillStyle=g;c.fillRect(0,0,W,H);if(!P.light){c.globalAlpha=.35;const g2=c.createRadialGradient(W*.5,H*.5,10,W*.5,H*.5,H*.7);g2.addColorStop(0,'#fff');g2.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g2;c.fillRect(0,0,W,H)}}
 else if(st==='split'){c.fillStyle=P.bg2;c.beginPath();c.moveTo(W*(.45+r*.15),0);c.lineTo(W,0);c.lineTo(W,H);c.lineTo(W*(.3+r*.15),H);c.closePath();c.fill()}
 else if(st==='vinyl'){c.strokeStyle=P.bg2;c.globalAlpha=.6;c.lineWidth=3;const cx=W*(.25+r*.5),cy=H*.5;for(let R=60;R<Math.max(W,H);R+=34){c.beginPath();c.arc(cx,cy,R,0,6.283);c.stroke()}c.globalAlpha=.9;c.fillStyle=P.bg2;c.beginPath();c.arc(cx,cy,60,0,6.283);c.fill()}
 else if(st==='paper'){c.globalAlpha=.16;c.fillStyle=P.dark;for(let i=0;i<700;i++){const x=hs(i,3)*W,y=hs(i,4)*H;c.fillRect(x,y,1+hs(i,5)*2,1+hs(i,6)*2)}}
 c.restore()}
const lum=h=>{h=String(h||'#000');if(h[0]!=='#')return .5;if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];const n=parseInt(h.slice(1),16);return(.299*(n>>16&255)+.587*(n>>8&255)+.114*(n&255))/255};
function heavy(c,t,x,y,size,P,o){o=o||{};o=Object.assign({},o);const fl=o.fill||P.ink;if(o.stroke){if(Math.abs(lum(fl)-lum(o.stroke))<.45)o.stroke=lum(fl)<.5?'#ffffff':'#0b0b0d';o.sw=Math.min(o.sw||size*.085,size*.085)}if(o.shadow&&Math.abs(lum(fl)-lum(o.shadow))<.3)o.shadow=lum(fl)<.5?'rgba(255,255,255,.55)':'rgba(0,0,0,.55)';c.save();c.font='700 '+size+'px Anton, Oswald, Impact, sans-serif';c.textAlign=o.al||'center';c.textBaseline='middle';c.translate(x,y);if(o.rot)c.rotate(o.rot);c.lineJoin='round';
 if(o.shadow){c.fillStyle=o.shadow;c.fillText(t,size*.06,size*.07)}
 if(o.stroke){c.lineWidth=o.sw||size*.14;c.strokeStyle=o.stroke;c.strokeText(t,0,0)}c.fillStyle=o.fill||P.ink;c.fillText(t,0,0);c.restore()}
function fitW(c,t,max,w){let s=max;c.font='700 '+s+'px Anton, Oswald, Impact, sans-serif';while(s>14&&c.measureText(t).width>w){s-=2;c.font='700 '+s+'px Anton, Oswald, Impact, sans-serif'}return s}
function layoutOf(i,W,H){const v=H>W;
 if(v){const L=[{w:.9,cx:.5,cy:.66,rot:0,t:'top'},{w:.95,cx:.5,cy:.68,rot:-.07,t:'top'},{w:.95,cx:.5,cy:.68,rot:.07,t:'top'},{w:1.5,cx:.5,cy:.86,rot:0,t:'top',crop:1},{w:.92,cx:.5,cy:.36,rot:-.04,t:'bottom'},{w:.78,cx:.5,cy:.5,rot:0,t:'top',two:1},{w:2.3,cx:.3,cy:.8,rot:0,t:'top',crop:1},{w:.98,cx:.5,cy:.3,rot:.06,t:'bottom',crop:1}];return L[i%8]}
 return[{w:.44,cx:.5,cy:.72,rot:0,t:'top'},{w:.56,cx:.3,cy:.54,rot:-.06,t:'right'},{w:.56,cx:.7,cy:.54,rot:.06,t:'left'},{w:1.16,cx:.5,cy:1.24,rot:0,t:'top',crop:1},
  {w:.58,cx:.67,cy:.55,rot:-.1,t:'left'},{w:.58,cx:.33,cy:.55,rot:.1,t:'right'},{w:.34,cx:.5,cy:.84,rot:0,t:'huge'},{w:2.0,cx:.28,cy:.58,rot:0,t:'right',zoom:1,panel:1},
  {w:.42,cx:.5,cy:.74,rot:-.04,t:'top',two:1},{w:.78,cx:.15,cy:.92,rot:.1,t:'right',crop:1,panel:1},{w:.6,cx:.75,cy:.6,rot:.08,t:'left'},{w:.48,cx:.5,cy:.42,rot:0,t:'bar',card:1}][i%12]}
/* a crop of the empty desk picture (random zoom, side, flip and grade) for a thumbnail background */
function deskBg(c,W,H,r,key){const img=M().bg(key);if(!img)return null;const iw=img.naturalWidth,ih=img.naturalHeight,ar=W/H;let zf=1+.9*Math.pow(r(31),1.4),w=iw/zf,h=w/ar;if(h>ih){h=ih/zf;w=h*ar}
 const x0=(iw-w)*r(33),y0=(ih-h)*r(34),flip=r(32)<.4;c.save();if(flip){c.translate(W,0);c.scale(-1,1)}c.drawImage(img,x0,y0,w,h,0,0,W,H);c.restore();
 const g=Math.floor(r(35)*4);c.save();
 if(g===1){c.globalCompositeOperation='multiply';c.fillStyle='rgb(190,210,225)';c.fillRect(0,0,W,H)}
 else if(g===2){c.globalCompositeOperation='overlay';c.fillStyle='rgba(255,150,50,.28)';c.fillRect(0,0,W,H)}
 else if(g===3){c.globalCompositeOperation='multiply';c.fillStyle='rgb(228,214,200)';c.fillRect(0,0,W,H)}
 c.restore();c.save();const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=vg;c.fillRect(0,0,W,H);c.restore();
 return{flip,lamp:flip?[W*.85,H*.12]:[W*.2,H*.1]}}
const DESKP=[{n:'DESK',bg:'#000',bg2:'#222',acc:'#ffd23f',ink:'#ffffff',dark:'#0b0b0d'},{n:'DESK',bg:'#000',bg2:'#222',acc:'#ff5a3a',ink:'#ffffff',dark:'#0b0b0d'},{n:'DESK',bg:'#000',bg2:'#222',acc:'#ffb347',ink:'#ffffff',dark:'#0b0b0d'}];
function make(c,W,H,seed,X,o){o=o||{};const r=n=>hs(n,seed),bgk=H>W?'v':'h',wantDesk=o.desk===true||(o.desk==null&&r(30)<.7),deskOk=wantDesk&&!!M().bg(bgk),P=deskOk?DESKP[Math.floor(r(36)*3)]:(o.pal!=null?PAL[o.pal%PAL.length]:PAL[Math.floor(r(1)*PAL.length)]),B=deskOk?'desk':(o.bg!=null?BGS[o.bg%BGS.length]:BGS[Math.floor(r(2)*BGS.length)]),
  li=o.layout!=null?o.layout:Math.floor(r(3)*(H>W?8:LAYOUTS)),tx=o.tx!=null?TXS[o.tx%TXS.length]:TXS[Math.floor(r(4)*TXS.length)],Ly=layoutOf(li,W,H),v=H>W,Z=M(),S0={title:X.title,bpm:X.bpm,key:X.key,dur:30,lcd:X.title};
 c.save();c.clearRect(0,0,W,H);let DB=null;if(deskOk)DB=deskBg(c,W,H,r,bgk);else bg(c,W,H,B,P,r(5));
 /* the MPC */
 const sc=Ly.w*W/850,pressed=new Set();const np=4+Math.floor(r(6)*4);for(let i=0;i<np;i++)pressed.add(Math.floor(r(10+i)*16));
 c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
 const place=(cx,cy,rot,alpha,blur)=>{c.save();c.translate(cx,cy);c.rotate(rot);if(alpha!=null)c.globalAlpha=alpha;const ox=-512*sc,oy=-460*sc;
  if(Ly.card){c.fillStyle=P.light?P.dark:'#fff';const pw=850*sc+40,ph=734*sc+40;c.fillRect(-pw/2,-ph/2,pw,ph);}
  const WM=deskOk&&Z.warm(),cutI=WM?WM.cut:Z.cut();
  c.save();if(deskOk){c.shadowColor='rgba(0,0,0,.78)';c.shadowBlur=62*sc*1.3;c.shadowOffsetX=(DB.flip?-1:1)*-30*sc;c.shadowOffsetY=34*sc}else{c.shadowColor='rgba(0,0,0,'+(P.light?.35:.6)+')';c.shadowBlur=40*sc*1.2;c.shadowOffsetY=18*sc}c.drawImage(cutI,ox,oy,1024*sc,922*sc);c.restore();
  Z.machine(c,ox,oy,sc,S0,{img:cutI,src:WM?WM.photo:null,lt:4,run:true,press:i=>pressed.has(i)?.7+.3*hs(i,seed):0});
  if(deskOk){/* light from the lamp side: a soft gradient over the machine, bright toward the lamp, darker away from it */
   const sd=document.createElement('canvas');sd.width=Math.ceil(1024*sc);sd.height=Math.ceil(922*sc);const sx=sd.getContext('2d'),gx=DB.flip?1:0,gr=sx.createLinearGradient(sd.width*(gx?1:0),sd.height*.1,sd.width*(gx?0:1),sd.height*.9);gr.addColorStop(0,'rgb(255,244,226)');gr.addColorStop(.55,'rgb(205,186,168)');gr.addColorStop(1,'rgb(120,104,94)');sx.fillStyle=gr;sx.fillRect(0,0,sd.width,sd.height);sx.globalCompositeOperation='destination-in';sx.drawImage(Z.cut(),0,0,sd.width,sd.height);
   c.save();c.globalCompositeOperation='multiply';c.drawImage(sd,ox,oy);c.restore();
   if(Z.handsReady()&&r(40)<.55&&pressed.size){const pads=[...pressed],pi=pads[Math.floor(r(41)*pads.length)],key=(pi%4)<2?'l':'r';c.save();c.translate(ox,oy);c.scale(sc,sc);Z.hand(c,key,pi,.22+.3*r(42),DB.flip?[1500,-300]:[-250,-250]);c.restore()}}
  c.restore()};
 let cx=Ly.cx*W,cy=Ly.cy*H;if(Ly.zoom){cx=W*.33;cy=H*.64}
 if(Ly.two)place(cx+W*.12,cy-H*.05,.18,.5);
 place(cx,cy,Ly.rot,1);c.restore();
 /* the words: at most 5 on the picture (artist line + TYPE BEAT + the beat name) */
 const AR=artistsOf(X.artist),line1=AR.length?AR.join(' X ').toUpperCase():'',title=String(X.title||'').toUpperCase(),big=X.big||'TYPE BEAT';
 let bx,by,bw,al='center';const t=Ly.t;
 if(v){bx=W/2;by=Ly.t==='bottom'?H*.74:H*.1;bw=W*.9}else if(t==='top'){bx=W/2;by=H*.12;bw=W*.92}else if(t==='right'){bx=W*.8;by=H*.36;bw=W*.36}else if(t==='left'){bx=W*.2;by=H*.36;bw=W*.36}else if(t==='topleft'){bx=W*.28;by=H*.2;bw=W*.5}else if(t==='huge'){bx=W/2;by=H*.24;bw=W*.94}else{bx=W/2;by=H*.9;bw=W*.8}
 const ink=P.ink,acc=P.acc,dk=P.dark;
 const kk=v?.82:t==='top'?.56:t==='huge'?.7:t==='bar'?1:.78,ls=(txt,mx)=>fitW(c,txt,mx*kk,bw);if(Ly.panel){c.save();c.fillStyle='rgba(8,8,10,.82)';c.fillRect(bx-bw/2-22,26,bw+44,H-52);c.restore()}
 const draw={
  stack(){let y=by;if(line1){const s=ls(line1,v?150:t==='huge'?130:110);heavy(c,line1,bx,y,s,P,{fill:ink,stroke:dk,shadow:null});y+=s*1.05}const s2=ls(big,v?210:t==='huge'?200:170);heavy(c,big,bx,y+s2*.1,s2,P,{fill:acc,stroke:dk});y+=s2*.95;
   const s3=ls(title,v?100:78);c.save();c.fillStyle=dk;const w3=Math.min(bw,(c.measureText(title).width||0)+40);c.font='700 '+s3+'px Anton, sans-serif';const tw=c.measureText(title).width+40;c.fillRect(bx-tw/2,y-s3*.1,tw,s3*1.2);c.restore();heavy(c,title,bx,y+s3*.5,s3,P,{fill:'#fff'})},
  banner(){let y=by;const s2=ls(big,v?200:150);heavy(c,big,bx,y,s2,P,{fill:ink,stroke:dk,shadow:acc});y+=s2*.9;if(line1){const s=ls(line1,v?110:84);c.save();c.translate(bx,y);c.rotate(-.04);c.font='700 '+s+'px Anton, sans-serif';const w=c.measureText(line1).width+50;c.fillStyle=acc;c.fillRect(-w/2,-s*.6,w,s*1.2);c.fillStyle=P.light&&acc===P.dark?'#fff':dk;c.textAlign='center';c.textBaseline='middle';c.fillText(line1,0,0);c.restore();y+=s*1.05}
   const s3=ls(title,v?90:64);heavy(c,title,bx,y+s3*.4,s3,P,{fill:ink,stroke:dk})},
  sticker(){let y=by;const s2=ls(big,v?200:160);heavy(c,big,bx,y,s2,P,{fill:ink,stroke:dk,sw:s2*.2,shadow:dk});y+=s2*.95;
   const s3=ls(title,v?100:72);c.save();c.translate(bx,y+s3*.3);c.rotate(-.05);c.font='700 '+s3+'px Anton, sans-serif';const w=c.measureText(title).width+56;c.fillStyle=acc;c.strokeStyle=dk;c.lineWidth=7;c.beginPath();c.rect(-w/2,-s3*.65,w,s3*1.3);c.fill();c.stroke();c.fillStyle=acc===dk?'#fff':dk;c.textAlign='center';c.textBaseline='middle';c.fillText(title,0,0);c.restore();y+=s3*1.4;
   if(line1){const s=ls(line1,v?96:64);heavy(c,line1,bx,y+s*.2,s,P,{fill:ink,stroke:dk})}},
  outline(){let y=by;if(line1){const s=ls(line1,v?170:130);heavy(c,line1,bx,y,s,P,{fill:'#fff',stroke:dk,sw:s*.2});y+=s*1.05}const s2=ls(big,v?230:190);heavy(c,big,bx,y+s2*.1,s2,P,{fill:acc,stroke:dk,sw:s2*.2});y+=s2*.95;const s3=ls(title,v?100:70);heavy(c,title,bx,y+s3*.3,s3,P,{fill:'#fff',stroke:dk,sw:s3*.22})},
  bar(){const bh=v?H*.26:H*.36,by2=v?(Ly.t==='bottom'?H-bh-H*.02:H*.02):H-bh-H*.02;c.save();c.fillStyle=dk;c.globalAlpha=.95;c.fillRect(0,by2,W,bh);c.globalAlpha=1;c.fillStyle=acc;c.fillRect(0,by2,W,9);c.restore();
   const s1=fitW(c,big,v?190:150,W*.9);heavy(c,big,W/2,by2+bh*.36,s1,P,{fill:acc});const line=(line1?line1+'  /  ':'')+title,s3=fitW(c,line,v?84:62,W*.92);heavy(c,line,W/2,by2+bh*.78,s3,P,{fill:'#fff'})}};
 (draw[tx]||draw.stack)();
 /* badges */
 const bd=[];if(X.extra)bd.push(X.extra);if(X.bpm)bd.push(X.bpm+' BPM');if(X.key)bd.push(X.key);bd.push('MPC60');
 if(tx!=='bar'){c.save();c.font='700 '+(v?44:30)+'px Oswald, sans-serif';c.textBaseline='middle';let x=v?W*.06:W*.03;const y=v?H*.96:H*.94;bd.forEach((b,i)=>{const w=c.measureText(b).width+30,h=v?64:44;c.fillStyle=i===bd.length-1?acc:dk;c.fillRect(x,y-h/2,w,h);c.fillStyle=i===bd.length-1?(acc===dk?'#fff':dk):'#fff';c.textAlign='left';c.fillText(b,x+15,y+2);x+=w+10});c.restore()}
 c.restore();return{pal:P.n,bg:B,layout:li,text:tx,hand:false}}

function buildTape(ST,TP){
 const tr=TP.tracks,N=tr.length,year=new Date().getFullYear(),AR=artistsOf(ST.artist),A=AR.join(' x '),pre=ST.yt.mode==='premiere',v=ST.yt.v||0,seed=N*31+TP.title.length*7+v*13,mood=cap(MOODS[Math.floor(hs(1,seed)*MOODS.length)]),mins=Math.max(1,Math.round(TP.total/60)),mw=mins===1?'Minute':'Minutes';
 const ts=t=>{t=Math.max(0,Math.floor(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
 const tpl=[['SEARCH',`${N} ${mood} Boom Bap Beats on the MPC60 | ${TP.title}`],['SEARCH',`${A?A+' Type Beats ':'Boom Bap Type Beats '}${year} - ${N}-Beat MPC Tape (${mins} Min)`],['SEARCH',`${TP.title}: ${N} ${A?A+' Style ':''}Instrumentals (All Played on MPC60)`],
  ['SEARCH',`Boom Bap Beat Tape ${year} | ${N} Beats on the Akai MPC60 II`],['MPC',`I Played ${N} Beats on the MPC60 and Put Them in One Tape`],['MPC',`Watch the Pads: ${N} Boom Bap Beats Live on the MPC60 (Beat Tape)`],
  ['MPC',`${mins} ${mw} of ${mood} MPC60 Boom Bap Beats (${TP.title})`],['CLICK',`${mood} Boom Bap Beat Tape - Every Beat on a 1988 MPC`],['HYBRID',`${A?A+' Type Beat Tape ':'Type Beat Tape '}${year} | ${N} MPC60 Beats`],['HYBRID',`${TP.title} | Full Boom Bap Instrumental Album (MPC60)`]];
 const score=(k,t)=>{let s=52;const L=t.length;if(/beat tape|tape/i.test(t))s+=10;if(/type beat/i.test(t)&&A)s+=10;if(L<=60)s+=12;else if(L<=70)s+=6;else if(L>100)s-=30;else s-=6;if(t.indexOf(String(year))>=0)s+=6;if(/mpc/i.test(t))s+=6;if(/\d+/.test(t))s+=4;return clamp(s,0,100)};
 const order=tpl.map((x,i)=>({k:x[0],t:x[1].replace(/\s+/g,' ').trim(),r:hs(i,seed)})).sort((a,b)=>a.r-b.r);const titles=order.slice(0,9).map(o=>({k:o.k,t:o.t.slice(0,100),s:score(o.k,o.t)}));let best=0;titles.forEach((t,i)=>{if(t.s>titles[best].s)best=i});titles[best].best=true;
 const link=t=>'https://mzprd.com/beat/'+(t.b.slug||slug(t.b.title))+'/';
 const chapters=(tr.map((t,i)=>(i===0?'0:00':ts(t.start))+' '+(i+1)+'. '+t.S.title+(t.S.bpm?' ('+t.S.bpm+' BPM'+(t.S.key?' / '+t.S.key:'')+')':'')));
 const desc=[`${pre&&ST.yt.when?'Premieres '+ST.yt.when+': ':''}${TP.title}: ${N} ${A?A+' type ':'boom bap '}beats played live on the Akai MPC60 II. Lease any beat: https://mzprd.com`,'','> ALL BEATS AND SAMPLE PACKS: https://mzprd.com','','CHAPTERS',...chapters,'','BUY / LEASE EACH BEAT',...tr.map((t,i)=>(i+1)+'. '+t.S.title+': '+link(t)),'','Played on: Akai MPC60 II. Every pad you see pushing in is a hit from the beat.','All beats are original productions by MZPRD (Meztheprod).','','#typebeat #mpc60 #beattape'].join('\n');
 const tagList=[A?A.toLowerCase()+' type beat':'',A?A.toLowerCase()+' type beat '+year:'','beat tape','boom bap beat tape','mpc60 beat tape','mpc60','akai mpc60 ii','mpc beat making','mpc live pad performance','boom bap instrumentals','hip hop instrumental album','mzprd','meztheprod',...tr.slice(0,4).map(t=>t.S.title.toLowerCase()+' beat')].filter(Boolean);
 const seen=new Set();let tags='';tagList.forEach(t=>{if(!seen.has(t)&&(tags+t).length<430){seen.add(t);tags+=(tags?', ':'')+t}});
 const pinned=[`Which track is your favorite? Type the number. Every beat is linked in the description.`,`Which beat should I turn into a full video next? Tell me the number below.`,`Drop your favorite rapper and I will make a beat for them. All ${N} beats: https://mzprd.com`];
 const checks=[],ck=(ok,msg)=>checks.push({ok,msg});
 ck(N>=5,N>=5?N+' beats in the tape: long videos with chapters hold viewers and give every beat a chance.':'Only '+N+' beats. Tapes with 6 to 10 beats tend to hold watch time better.');
 ck(TP.total>=480,'The tape is '+ts(TP.total)+' long. '+(TP.total>=480?'YouTube can show mid-roll ads over 8 minutes.':'Past 8 minutes lets YouTube place mid-roll ads, if monetized.'));
 ck(true,'Chapter timestamps are in the description (the first is 0:00, as YouTube requires, and each beat is over 10 seconds). They show as sections on the progress bar.');
 ck(true,'Every beat has its own buy link in the description.');
 ck(!!A,A?'Artist in the titles: yes.':'No artist added. Add a "sounds like" artist so the tape can show up for "[artist] type beat" searches.');
 const tips=['Put the strongest beat first or second. Most viewers decide in the first minute.','Test 2 or 3 thumbnails with "Test & Compare" in YouTube Studio.','Pin a comment asking which track people like best, and reply to the first ones quickly.','Add the tape to an "MPC Beats" playlist so the next video autoplays.','Do not paste your tags into the description. Keep tags in the tag box.'];
 return{titles,desc,tags,pinned,shorts:null,checks,tips}}
window.MZMpcYT={build,buildTape,make,PAL,BGS,TXS,LAYOUTS,artistsOf};
})();
