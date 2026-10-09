/* MZPRD Beat Battle engine, part 1: arenas, drawing helpers, the animated bracket and every scene of an episode.
   Everything is drawn from the clock alone (no hidden state), so scrubbing, previewing and video rendering all look identical. */
(function(){
'use strict';
const TX=window.MZBattleText,W=1280,H=720,PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const eo=t=>1-Math.pow(1-clamp(t,0,1),3),ei=t=>{t=clamp(t,0,1);return t*t*t},eio=t=>{t=clamp(t,0,1);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const eb=t=>{t=clamp(t,0,1);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
const hs=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x)};
const LC='#19d4ff',RC='#ff2d8a',GOLD='#ffd34a';
const FN={A:'Anton,Impact,sans-serif',P:"'Press Start 2P',monospace",O:'Oswald,sans-serif',B:'Bangers,Anton,sans-serif'};
const FONT_LINK='https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Press+Start+2P&family=Bangers&display=swap';
const IM={c:[],crown:null,trophy:null,stage:null};
const loadImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=new URL(src,document.baseURI).href});
let fontsP=null;
function loadFonts(){if(fontsP)return fontsP;fontsP=(async()=>{if(!document.querySelector('link[data-bt]')){await new Promise(res=>{const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_LINK;l.dataset.bt='1';l.onload=res;l.onerror=res;document.head.appendChild(l);setTimeout(res,5000)})}
 await Promise.all(["40px Anton","600 40px Oswald","12px 'Press Start 2P'","40px Bangers"].map(f=>document.fonts.load(f).catch(()=>{})))})();return fontsP}
async function loadProps(){if(!IM.crown)IM.crown=await loadImg('battle/crown.webp');if(!IM.trophy)IM.trophy=await loadImg('battle/trophy.webp');if(!IM.stage)IM.stage=await loadImg('show-stage.webp')}
function loadChars(ids){return Promise.all(ids.map(async n=>{if(n>0&&!IM.c[n-1])IM.c[n-1]=await loadImg('battle/c'+String(n).padStart(2,'0')+'.webp')}))}
const charImg=n=>n>0?IM.c[n-1]||null:null;

/* ---------- text and shapes ---------- */
function tx(c,s,x,y,px,font,fill,o){o=o||{};c.save();c.font=px+'px '+font;c.textAlign=o.al||'center';c.textBaseline=o.bl||'middle';c.lineJoin='round';if(o.a!=null)c.globalAlpha*=o.a;
 if(o.ls&&'letterSpacing' in c)c.letterSpacing=o.ls+'px';if(o.rot){c.translate(x,y);c.rotate(o.rot);x=0;y=0}if(o.sc){c.translate(x,y);c.scale(o.sc,o.sc);x=0;y=0}
 if(o.ex){c.fillStyle=o.exc||'#000';for(let k=o.ex;k>0;k--)c.fillText(s,x+k,y+k)}
 if(o.sw){c.lineWidth=o.sw;c.strokeStyle=o.st||'#000';c.strokeText(s,x,y)}
 if(o.gl){c.shadowColor=o.gl;c.shadowBlur=o.gb||px*.5}c.fillStyle=fill;c.fillText(s,x,y);c.restore()}
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function wrap(c,text,maxW,px,font){c.save();c.font=px+'px '+font;const w=String(text).split(/\s+/),L=[];let cur='';w.forEach(x=>{const t=cur?cur+' '+x:x;if(c.measureText(t).width>maxW&&cur){L.push(cur);cur=x}else cur=t});if(cur)L.push(cur);c.restore();return L}
function bubble(c,text,x,y,o){o=o||{};const px=o.px||24,maxW=o.w||330,prog=o.p==null?1:clamp(o.p,0,1),shown=String(text).slice(0,Math.ceil(String(text).length*prog));if(!shown)return;
 const lines=wrap(c,text,maxW-34,px,FN.O),bw=Math.min(maxW,Math.max(...lines.map(l=>{c.save();c.font=px+'px '+FN.O;const w=c.measureText(l).width;c.restore();return w}))+34),bh=lines.length*px*1.25+26;
 const pop=o.pop==null?1:eb(o.pop),al=o.al||'l',bx=al==='l'?x:x-bw,by=y-bh;c.save();c.globalAlpha*=clamp(o.pop==null?1:o.pop*3,0,1);c.translate(x,y);c.scale(pop,pop);c.translate(-x,-y);
 c.fillStyle='#fff';c.strokeStyle='#0a0a12';c.lineWidth=5;rr(c,bx,by,bw,bh,16);c.fill();c.stroke();
 const tx0=al==='l'?bx+bw*.2:bx+bw*.8;c.beginPath();c.moveTo(tx0-12,by+bh-1);c.lineTo(o.tx!=null?o.tx:x,o.ty!=null?o.ty:y+22);c.lineTo(tx0+14,by+bh-1);c.closePath();c.fill();c.stroke();c.fillStyle='#fff';c.fillRect(tx0-10,by+bh-4,22,7);
 c.fillStyle='#0a0a12';c.font=px+'px '+FN.O;c.textAlign='left';c.textBaseline='top';let rem=shown.length;lines.forEach((l,i)=>{const s=l.slice(0,Math.max(0,rem));rem-=l.length+1;c.fillText(s,bx+17,by+13+i*px*1.25)});
 if(o.col){c.fillStyle=o.col;c.fillRect(bx+10,by-1,bw-20,5)}c.restore()}

/* ---------- arenas ---------- */
const TEMPLATES=[{id:'arcade',n:'NEON ARCADE'},{id:'concert',n:'CONCERT STAGE'},{id:'alley',n:'STREET ALLEY'},{id:'stadium',n:'STADIUM'},{id:'cyber',n:'CYBER GRID'},{id:'royal',n:'GOLD ROYAL'},{id:'crt',n:'RETRO CRT'}];
const BG={};
function offc(w,h){const o=document.createElement('canvas');o.width=w||W;o.height=h||H;return o}
function baseBg(id){
 if(BG[id])return BG[id];const o=offc(),c=o.getContext('2d');
 const g=c.createLinearGradient(0,0,0,H);
 if(id==='arcade'){g.addColorStop(0,'#06021a');g.addColorStop(.6,'#1b0838');g.addColorStop(1,'#06021a');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){c.fillStyle=`rgba(255,255,255,${.15+hs(i,3)*.6})`;c.fillRect(hs(i,1)*W,hs(i,2)*H*.55,hs(i,4)<.15?2.4:1.2,hs(i,4)<.15?2.4:1.2)}
  c.fillStyle=RG(c,W/2,H*.55,0,260,[[0,'rgba(255,45,138,.55)'],[.5,'rgba(255,45,138,.12)'],[1,'rgba(255,45,138,0)']]);c.fillRect(0,0,W,H);
  const hz=H*.62;c.fillStyle='#08031a';c.fillRect(0,hz,W,H-hz);c.strokeStyle='rgba(255,45,138,.5)';c.lineWidth=1.5;
  for(let i=-24;i<=24;i++){c.beginPath();c.moveTo(W/2+i*18,hz);c.lineTo(W/2+i*130,H);c.stroke()}for(let k=1;k<12;k++){const y=hz+(H-hz)*Math.pow(k/12,1.8);c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}}
 else if(id==='concert'){c.fillStyle='#05040a';c.fillRect(0,0,W,H);if(IM.stage){c.save();c.filter='blur(2px) saturate(1.15)';c.drawImage(IM.stage,-20,-20,W+40,H+40);c.restore()}c.fillStyle='rgba(5,3,12,.62)';c.fillRect(0,0,W,H)}
 else if(id==='alley'){g.addColorStop(0,'#1a1014');g.addColorStop(1,'#07050a');c.fillStyle=g;c.fillRect(0,0,W,H);const bw=84,bh=34;for(let y=0,row=0;y<H;y+=bh,row++)for(let x=-(row%2?bw/2:0);x<W;x+=bw){const t=hs(x+y,row);c.fillStyle=`hsl(${8+t*14},${22+t*14}%,${10+t*9}%)`;c.fillRect(x+2,y+2,bw-4,bh-4)}
  c.fillStyle=G(c,0,H*.55,0,H,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.8)']]);c.fillRect(0,0,W,H);c.fillStyle='#050308';c.fillRect(0,H*.78,W,H*.22);c.strokeStyle='rgba(255,255,255,.08)';for(let k=0;k<7;k++){c.beginPath();c.moveTo(0,H*.78+k*14);c.lineTo(W,H*.78+k*14);c.stroke()}}
 else if(id==='stadium'){g.addColorStop(0,'#04061a');g.addColorStop(.7,'#0b1030');g.addColorStop(1,'#04050c');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let r=0;r<6;r++)for(let i=0;i<46;i++){c.fillStyle=`hsl(${220+hs(i,r)*40},25%,${6+r*2}%)`;c.beginPath();c.arc(i*29+(r%2)*14,H*.66+r*21,12,0,6.283);c.fill()}
  [[.08,.1],[.92,.1]].forEach(([x,y])=>{for(let a=0;a<3;a++)for(let b=0;b<3;b++){c.fillStyle='#fff';c.shadowColor='#bcd';c.shadowBlur=22;c.beginPath();c.arc(W*x+(a-1)*24,H*y+(b-1)*24,8,0,6.283);c.fill()}c.shadowBlur=0});c.fillStyle='#0a0c14';c.fillRect(0,H*.9,W,H*.1)}
 else if(id==='cyber'){g.addColorStop(0,'#020a12');g.addColorStop(1,'#041a24');c.fillStyle=g;c.fillRect(0,0,W,H);c.strokeStyle='rgba(30,230,210,.13)';c.lineWidth=1;const s=46;for(let y=0;y<H+s;y+=s*.866){for(let x=((y/(s*.866))%2)*s/2;x<W+s;x+=s){c.beginPath();for(let k=0;k<6;k++){const a=k*PI/3;c.lineTo(x+Math.cos(a)*s*.5,y+Math.sin(a)*s*.5)}c.closePath();c.stroke()}}
  c.fillStyle=G(c,0,H*.62,0,H*.74,[[0,'rgba(0,0,0,0)'],[.5,'rgba(25,255,224,.35)'],[1,'rgba(0,0,0,0)']]);c.fillRect(0,0,W,H);c.fillStyle='rgba(2,10,16,.88)';c.fillRect(0,H*.68,W,H*.32)}
 else if(id==='royal'){c.fillStyle='#050308';c.fillRect(0,0,W,H);c.save();c.translate(W/2,H*.5);for(let k=0;k<28;k++){c.rotate(PI*2/28);c.fillStyle=k%2?'rgba(255,211,74,.08)':'rgba(255,211,74,.02)';c.beginPath();c.moveTo(0,0);c.lineTo(W,-60);c.lineTo(W,60);c.closePath();c.fill()}c.restore();
  c.strokeStyle='rgba(255,211,74,.7)';c.lineWidth=3;c.strokeRect(24,24,W-48,H-48);c.lineWidth=1;c.strokeRect(36,36,W-72,H-72);[[24,24],[W-24,24],[24,H-24],[W-24,H-24]].forEach(([x,y])=>{c.fillStyle=GOLD;c.beginPath();c.arc(x,y,10,0,6.283);c.fill()});c.fillStyle=G(c,0,H*.7,0,H,[[0,'rgba(0,0,0,0)'],[1,'rgba(255,211,74,.14)']]);c.fillRect(0,0,W,H)}
 else{g.addColorStop(0,'#10133a');g.addColorStop(.5,'#241044');g.addColorStop(1,'#0a0a26');c.fillStyle=g;c.fillRect(0,0,W,H);c.fillStyle='rgba(255,255,255,.04)';for(let y=0;y<H;y+=6)c.fillRect(0,y,W,2);c.fillStyle=RG(c,W/2,H/2,H*.3,H*.95,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.65)']]);c.fillRect(0,0,W,H)}
 return BG[id]=o}
function G(c,x0,y0,x1,y1,st){const g=c.createLinearGradient(x0,y0,x1,y1);st.forEach(([p,col])=>g.addColorStop(p,col));return g}
function RG(c,x,y,r0,r1,st){const g=c.createRadialGradient(x,y,r0,x,y,r1);st.forEach(([p,col])=>g.addColorStop(p,col));return g}
/* the living part of every arena: swinging beams, dust, a pulse on the kick, corner colours */
function arena(c,id,t,au,B){
 const bass=au&&au.bass||0,tpl=id||'arcade';c.drawImage(baseBg(tpl),0,0);
 c.save();c.globalCompositeOperation='lighter';
 const cols=tpl==='royal'?[GOLD,GOLD]:[LC,RC];
 for(let i=0;i<2;i++){const x0=i?W*.86:W*.14,sw=Math.sin(t*.8+i*2.1)*(.32+bass*.25)*(i?-1:1),ang=PI/2+sw+(i?.18:-.18),len=H*1.2,half=34+bass*30;
  const x1=x0+Math.cos(ang)*len,y1=Math.sin(ang)*len,px=-Math.sin(ang),py=Math.cos(ang),g=c.createLinearGradient(x0,0,x1,y1);g.addColorStop(0,cols[i]+(tpl==='royal'?'':'')+'66');g.addColorStop(1,cols[i]+'00');
  c.fillStyle=g;c.globalAlpha=.34+bass*.4;c.beginPath();c.moveTo(x0-5,0);c.lineTo(x0+5,0);c.lineTo(x1+px*half,y1+py*half);c.lineTo(x1-px*half,y1-py*half);c.closePath();c.fill()}
 c.globalAlpha=1;for(let i=0;i<34;i++){const sp=.03+hs(i,5)*.05,y=((t*sp*60+hs(i,1)*H)%(H+40))-20,x=hs(i,2)*W+Math.sin(t*.6+i)*16,a=.15+hs(i,3)*.4;c.fillStyle=`rgba(255,255,255,${a})`;c.fillRect(x,H-y,1.8,1.8)}
 if(tpl==='stadium'){for(let i=0;i<14;i++){const f=(Math.sin(t*5+i*9.7)>.97)?1:0;if(f){c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(hs(i,8)*W,H*(.68+hs(i,9)*.2),5,0,6.283);c.fill()}}}
 if(tpl==='cyber'){c.strokeStyle='rgba(25,255,224,.35)';for(let i=0;i<18;i++){const x=hs(i,4)*W,y=((t*140*(.5+hs(i,6))+hs(i,7)*H)%(H+160))-80;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+70);c.stroke()}}
 if(tpl==='royal'){for(let i=0;i<26;i++){const tw=.5+.5*Math.sin(t*3+i*4.1);sparkle(c,hs(i,1)*W,hs(i,2)*H,5+hs(i,3)*9,`rgba(255,226,138,${tw})`)}}
 if(tpl==='crt'){c.globalAlpha=.12;c.fillStyle='#fff';c.fillRect(0,(t*90)%H,W,26)}
 c.restore();
 if(bass>.5){c.fillStyle=`rgba(255,255,255,${(bass-.5)*.07})`;c.fillRect(0,0,W,H)}}
function sparkle(c,x,y,r,col){c.save();c.fillStyle=col||'#fff';c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r*.28,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r*.28,y);c.quadraticCurveTo(x,y,x,y-r);c.moveTo(x-r,y);c.quadraticCurveTo(x,y,x,y-r*.28);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r*.28);c.quadraticCurveTo(x,y,x-r,y);c.fill();c.restore()}
function vignette(c,a){c.fillStyle=RG(c,W/2,H/2,H*.35,H*.95,[[0,'rgba(0,0,0,0)'],[1,`rgba(0,0,0,${a})`]]);c.fillRect(0,0,W,H)}

/* ---------- fighters on screen ---------- */
function portrait(c,F,x,y,s,o){o=o||{};const img=F.img;c.save();c.translate(x,y+(o.dy||0));if(o.rot)c.rotate(o.rot);c.scale((o.flip?-1:1)*(o.sc||1)*(o.sx||1),(o.sc||1)*(o.sy||1));c.globalAlpha*=o.a==null?1:o.a;
 if(o.glow){const g=RG(c,0,0,s*.1,s*.8,[[0,o.glow+'cc'],[1,o.glow+'00']]);c.globalAlpha*=(o.ga==null?.7:o.ga);c.fillStyle=g;c.fillRect(-s,-s,s*2,s*2);c.globalAlpha=1*(o.a==null?1:o.a)}
 if(o.gray)c.filter='grayscale(1) brightness(.6) contrast(1.15)';else if(o.bright)c.filter=`brightness(${o.bright})`;
 if(img){if(o.split!=null){const h=o.split;c.save();c.beginPath();c.moveTo(-s,-s);c.lineTo(s*.25+h*40,-s);c.lineTo(-s*.25+h*40,s);c.lineTo(-s,s);c.closePath();c.clip();c.translate(-h*50,h*10);c.rotate(-h*.2);c.drawImage(img,-s/2,-s/2,s,s);c.restore();
  c.save();c.beginPath();c.moveTo(s*.25+h*40,-s);c.lineTo(s,-s);c.lineTo(s,s);c.lineTo(-s*.25+h*40,s);c.closePath();c.clip();c.translate(h*50,h*40);c.rotate(h*.25);c.drawImage(img,-s/2,-s/2,s,s);c.restore()}
  else if(o.melt!=null){const m=o.melt,strips=40;for(let i=0;i<strips;i++){const sy=i/strips,sh=1/strips,off=Math.sin(sy*9+m*8)*m*26,stretch=1+m*sy*.9;c.drawImage(img,0,sy*img.height,img.width,img.height*sh+1,-s/2+off,-s/2+sy*s*stretch,s,s*sh*stretch+1)}}
  else{c.drawImage(img,-s/2,-s/2,s,s);if(o.red>0){c.save();c.filter='sepia(1) saturate(9) hue-rotate(-52deg) brightness(1.15)';c.globalAlpha*=clamp(o.red,0,1)*.8;c.drawImage(img,-s/2,-s/2,s,s);c.restore()}}}
 else{c.fillStyle='#222';c.beginPath();c.arc(0,0,s*.4,0,6.283);c.fill()}
 c.restore()}
function plate(c,x,y,w,F,col,o){o=o||{};const h=o.h||78;c.save();c.globalAlpha*=o.a==null?1:o.a;c.fillStyle='rgba(6,4,16,.88)';rr(c,x-w/2,y-h/2,w,h,12);c.fill();c.strokeStyle=col;c.lineWidth=3;c.stroke();c.fillStyle=col;c.fillRect(x-w/2+12,y-h/2,w-24,4);
 tx(c,F.name,x,y-h*.2,Math.min(34,w/Math.max(7,F.name.length)*1.55),FN.A,'#fff',{sw:5,ls:1});const sub=[F.beat&&F.beat.title?String(F.beat.title).toUpperCase():'',F.beat&&F.beat.bpm?F.beat.bpm+' BPM':'',F.beat&&F.beat.key||''].filter(Boolean).join('   ');
 if(sub)tx(c,sub.slice(0,34),x,y+h*.25,Math.min(18,w/Math.max(10,sub.length)*1.35),FN.O,GOLD,{ls:1});c.restore()}
function hpbar(c,x,y,w,p,col,al,o){o=o||{};c.save();c.fillStyle='#000';c.fillRect(x-5,y-5,w+10,44);c.fillStyle='#2a2a34';c.fillRect(x,y,w,34);const bw=w*clamp(p,0,1),bx=al==='r'?x+w-bw:x,g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,col);g.addColorStop(1,'#fff');if(o.chip>p){const cw=w*clamp(o.chip,0,1),cx=al==='r'?x+w-cw:x;c.fillStyle='#ffd34a';c.fillRect(cx,y,cw,34)}c.fillStyle=o.fl>0?'#ff2a2a':(p<.25?'#ff4a3a':col);c.fillRect(bx,y,bw,34);if(o.fl>0){c.fillStyle='rgba(255,255,255,'+(.55*o.fl)+')';c.fillRect(bx,y,bw,34)}c.fillStyle='rgba(255,255,255,.35)';c.fillRect(bx,y,bw,10);c.strokeStyle=o.fl>0?'#ff2a2a':'#fff';c.lineWidth=3+(o.fl>0?3*o.fl:0);c.strokeRect(x-5,y-5,w+10,44);if(o.fl>0){c.shadowColor='#ff2a2a';c.shadowBlur=22*o.fl;c.strokeRect(x-5,y-5,w+10,44)}c.restore()}

/* ---------- effects, all closed-form from time ---------- */
function shake(lt,t0,mag,dur){const u=(lt-t0)/dur;if(u<0||u>1)return[0,0];const a=mag*(1-u)*(1-u);return[(hs(Math.floor(lt*60),1)-.5)*2*a,(hs(Math.floor(lt*60),2)-.5)*2*a]}
function flashFx(c,lt,t0,dur,col,a){const u=(lt-t0)/dur;if(u<0||u>1)return;c.fillStyle=col||'#fff';c.globalAlpha=(a==null?.8:a)*(1-u)*(1-u);c.fillRect(0,0,W,H);c.globalAlpha=1}
function rings(c,x,y,lt,t0,col,n,sp){for(let k=0;k<(n||3);k++){const u=(lt-t0-k*.13)*(sp||1.1);if(u<0||u>1)continue;c.save();c.strokeStyle=col;c.globalAlpha=(1-u)*.9;c.lineWidth=2+(1-u)*10;c.beginPath();c.ellipse(x,y,40+u*620,(40+u*620)*.55,0,0,6.283);c.stroke();c.restore()}}
function confetti(c,lt,t0,seed,n,dur,sp){const age=lt-t0;if(age<0)return;c.save();for(let i=0;i<n;i++){const d=hs(i,seed)*.9,a=age-d*.8;if(a<0)continue;const x=hs(i,seed+1)*W+Math.sin(a*3+i)*26,y=-30+(a*(120+hs(i,seed+2)*160)*(sp||1))+.5*60*a*a;if(y>H+20)continue;c.save();c.translate(x,y);c.rotate(a*(3+hs(i,seed+3)*5));c.fillStyle=`hsl(${hs(i,seed+4)*360},90%,60%)`;c.fillRect(-5,-3,10,6);c.restore()}c.restore()}
function fireworks(c,lt,t0,seed,count){for(let k=0;k<count;k++){const st=t0+k*.55+hs(k,seed)*.3,age=lt-st;if(age<0||age>1.8)continue;const cx=W*(.12+hs(k,seed+1)*.76),cy=H*(.12+hs(k,seed+2)*.3),hu=hs(k,seed+3)*360;c.save();c.globalCompositeOperation='lighter';for(let p=0;p<34;p++){const an=p/34*6.283,sp=120+hs(p,k+seed)*130,x=cx+Math.cos(an)*sp*age,y=cy+Math.sin(an)*sp*age+90*age*age;c.fillStyle=`hsla(${hu},100%,65%,${1-age/1.8})`;c.fillRect(x,y,3.4,3.4)}c.restore()}}
function crack(c,x,y,r,seed,p,col){c.save();c.strokeStyle=col||'#fff';c.lineWidth=3;c.shadowColor=col||'#fff';c.shadowBlur=10;for(let k=0;k<9;k++){let px=x,py=y,an=k*.7+hs(k,seed)*.5;c.beginPath();c.moveTo(px,py);const seg=Math.floor(7*p);for(let s=0;s<seg;s++){an+=(hs(s,k+seed)-.5)*.9;const l=r*.16*(.7+hs(s,k)*.6);px+=Math.cos(an)*l;py+=Math.sin(an)*l;c.lineTo(px,py)}c.stroke()}c.restore()}
function speedLines(c,lt,a,col){c.save();c.globalCompositeOperation='lighter';c.strokeStyle=col||'#fff';for(let i=0;i<30;i++){const an=hs(i,Math.floor(lt*20))*6.283,r0=240+hs(i,2)*160,r1=r0+160+hs(i,3)*380;c.globalAlpha=a*(.15+hs(i,4)*.45);c.lineWidth=1+hs(i,5)*3;c.beginPath();c.moveTo(W/2+Math.cos(an)*r0*1.2,H/2+Math.sin(an)*r0*.8);c.lineTo(W/2+Math.cos(an)*r1*1.2,H/2+Math.sin(an)*r1*.8);c.stroke()}c.restore()}
function godRays(c,x,y,lt,col,a){c.save();c.globalCompositeOperation='lighter';c.translate(x,y);c.rotate(lt*.2);for(let k=0;k<14;k++){c.rotate(PI*2/14);const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,col+'88');g.addColorStop(1,col+'00');c.fillStyle=g;c.globalAlpha=a;c.beginPath();c.moveTo(0,0);c.lineTo(W,-34);c.lineTo(W,34);c.closePath();c.fill()}c.restore()}
function slamText(c,s,x,y,px,lt,t0,col,o){o=o||{};const u=(lt-t0);if(u<0)return;const k=u<.18?lerp(3.2,1,eo(u/.18)):1+Math.sin(u*14)*Math.max(0,.06-u*.04),a=o.hold==null?1:clamp((o.hold-u)/.3,0,1);tx(c,s,x,y,px,o.font||FN.A,col,{sc:k,a:a,sw:px*.12,st:'#000',gl:o.gl||col,gb:px*.5,rot:o.rot||0,ls:o.ls||0,ex:o.ex==null?Math.round(px*.04):o.ex,exc:o.exc||'#000'})}

/* ---------- the animated bracket ---------- */
function bracketLayout(B){
 const N=B.fighters.length;const out={cards:[],lines:[],fmt:B.format};
 if(B.format==='team'){const n=Math.max(1,Math.floor(N/2)),ch=Math.min(70,(H-190)/n-6),gap=(H-170)/n;for(let i=0;i<n;i++){const y=130+i*gap+gap/2;out.cards.push({f:i,x:150,y,w:230,h:ch,round:0,side:'L'});out.cards.push({f:n+i,x:W-150,y,w:230,h:ch,round:0,side:'R'});out.lines.push({a:[265,y],b:[W/2-34,y],m:i,round:0})}out.n=n;return out}
 const rounds=Math.round(Math.log2(Math.max(2,N)));const half=N/2,sideRounds=rounds-1;
 const colX=r=>({L:120+r*(rounds>3?150:190),R:W-120-r*(rounds>3?150:190)});
 for(const side of['L','R']){const base=side==='L'?0:half;let ids=[];for(let i=0;i<half;i++)ids.push(base+i);
  for(let r=0;r<=sideRounds;r++){const n=ids.length,ch=Math.min(66,(H-170)/n-8),gap=(H-170)/n;ids.forEach((id,i)=>{const y=110+i*gap+gap/2;out.cards.push({f:r===0?id:null,x:colX(r)[side],y,w:r===0?(rounds>3?132:176):(rounds>3?118:150),h:r===0?ch:Math.min(60,ch),round:r,side,slot:i,pair:side+r});if(r>0){}});
   if(r<sideRounds){const next=[];for(let i=0;i<n;i+=2)next.push(i);ids=next}}}
 out.rounds=rounds;out.sideRounds=sideRounds;return out}
/* who stands in which slot, from the results so far: slot k of round r on a side */
function slotFighters(B){
 const N=B.fighters.length,rounds=Math.round(Math.log2(Math.max(2,N))),half=N/2;const res={};
 for(const side of['L','R']){const base=side==='L'?0:half;let cur=[];for(let i=0;i<half;i++)cur.push(base+i);res[side]=[cur.slice()];
  for(let r=0;r<rounds-1;r++){const nx=[];for(let i=0;i<cur.length;i+=2){const mi=Math.floor((side==='L'?i/2:(half/2)+i/2));const M=B.rounds[r]&&B.rounds[r][mi];const w=M&&M.w!=null?M.w:null;nx.push(w)}cur=nx;res[side].push(cur.slice())}}
 return res}
function drawBracket(c,B,lt,o){
 o=o||{};const L=bracketLayout(B),F=B.fighters;const t=lt;
 const mk=(f,x,y,w,h,col,a,state)=>{if(f==null){c.save();c.globalAlpha=a*.55;c.strokeStyle='rgba(255,255,255,.35)';c.setLineDash([6,6]);rr(c,x-w/2,y-h/2,w,h,10);c.stroke();tx(c,'?',x,y,h*.6,FN.A,'rgba(255,255,255,.5)');c.restore();return}
  const fi=F[f];c.save();c.globalAlpha*=a;c.fillStyle='rgba(8,6,18,.9)';rr(c,x-w/2,y-h/2,w,h,10);c.fill();c.strokeStyle=state==='out'?'#555':col;c.lineWidth=state==='cur'?4:3;c.stroke();
  const fs=h*1.15;c.save();rr(c,x-w/2+3,y-h/2+3,h-6,h-6,8);c.clip();portrait(c,fi,x-w/2+h*.5,y+h*.06,fs,{gray:state==='out'});c.restore();
  tx(c,fi.name.replace('THE ','').slice(0,13),x-w/2+h+6,y-h*.12,Math.min(20,h*.34),FN.A,state==='out'?'#777':'#fff',{al:'left',ls:.5});tx(c,String(fi.beat&&fi.beat.title||'').slice(0,13).toUpperCase(),x-w/2+h+6,y+h*.24,Math.min(14,h*.24),FN.O,state==='out'?'#555':GOLD,{al:'left'});
  if(state==='out'){c.strokeStyle='#e0242f';c.lineWidth=5;c.beginPath();c.moveTo(x-w/2+6,y-h/2+6);c.lineTo(x+w/2-6,y+h/2-6);c.moveTo(x+w/2-6,y-h/2+6);c.lineTo(x-w/2+6,y+h/2-6);c.stroke()}
  if(state==='cur'){c.strokeStyle=col;c.globalAlpha=.4+.4*Math.sin(t*6);c.lineWidth=7;rr(c,x-w/2-5,y-h/2-5,w+10,h+10,13);c.stroke()}c.restore()};
 if(B.format==='team'){const n=L.n,ps=B.rounds[0]||[];const done=ps.filter(m=>m.w!=null);let sa=0,sb=0;ps.forEach((m,i)=>{if(m.w==null)return;if(m.w===m.a)sa++;else sb++});
  L.cards.forEach((cd,k)=>{const st=Math.min(1,(t-k*.05)/.5);if(st<=0)return;const mi=cd.side==='L'?cd.f:cd.f-n,M=ps[mi],out=M&&M.w!=null&&M.w!==cd.f,cur=(o.curMatch===mi);const dx=(cd.side==='L'?-1:1)*(1-eb(st))*420;mk(cd.f,cd.x+dx,cd.y,cd.w,cd.h,cd.side==='L'?LC:RC,clamp(st*2,0,1),out?'out':cur?'cur':'')});
  L.lines.forEach((ln,k)=>{const u=eo((t-.4-k*.05)/.5);if(u<=0)return;const M=ps[ln.m],col=M&&M.w!=null?(M.w===M.a?LC:RC):'rgba(255,255,255,.45)';c.save();c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.moveTo(ln.a[0],ln.a[1]);c.lineTo(lerp(ln.a[0],W-ln.a[0],u),ln.a[1]);c.stroke();c.restore();if(u>.9){tx(c,'VS',W/2,ln.a[1],20,FN.P,M&&M.w!=null?GOLD:'#fff',{sw:5})}});
  tx(c,'TEAM BLUE',150,70,26,FN.A,LC,{sw:6,ls:3});tx(c,'TEAM PINK',W-150,70,26,FN.A,RC,{sw:6,ls:3});tx(c,sa+' - '+sb,W/2,70,52,FN.A,GOLD,{sw:8,gl:GOLD});return}
 const slots=slotFighters(B),rounds=L.rounds,cur=B.cur||0;
 L.cards.forEach((cd,k)=>{const side=cd.side,r=cd.round,f=cd.f!=null?cd.f:slots[side][r]&&slots[side][r][cd.slot];const st=clamp((t-.15*r-k*.035)/.55,0,1);if(st<=0)return;
  let state='';if(f!=null&&r<rounds-1){const M=B.rounds[r]&&B.rounds[r][matchIndexOf(B,side,r,cd.slot)];if(M&&M.w!=null&&M.w!==f)state='out';else if(r===cur&&M&&M.w==null)state='cur'}
  const dx=(side==='L'?-1:1)*(1-eb(st))*380,dy=(1-eb(st))*-40;mk(f,cd.x+dx,cd.y+dy,cd.w,cd.h,side==='L'?LC:RC,clamp(st*2.2,0,1),state)});
 /* connectors that draw themselves */
 for(const side of['L','R'])for(let r=0;r<rounds-1;r++){const cs=L.cards.filter(cd=>cd.side===side&&cd.round===r),ns=L.cards.filter(cd=>cd.side===side&&cd.round===r+1);if(!ns.length)continue;
  ns.forEach((nc,j)=>{const a=cs[j*2],b=cs[j*2+1];if(!a||!b)return;const u=eo((t-.5-r*.35)/.6);if(u<=0)return;const dir=side==='L'?1:-1,ax=a.x+dir*a.w/2,bx=b.x+dir*b.w/2,mx=(ax+nc.x-dir*nc.w/2)/2;c.save();c.strokeStyle=side==='L'?LC:RC;c.globalAlpha=.8;c.lineWidth=3;c.beginPath();c.moveTo(ax,a.y);c.lineTo(lerp(ax,mx,u),a.y);c.lineTo(lerp(ax,mx,u),lerp(a.y,nc.y,u));c.moveTo(bx,b.y);c.lineTo(lerp(bx,mx,u),b.y);c.lineTo(lerp(bx,mx,u),lerp(b.y,nc.y,u));c.lineTo(lerp(mx,nc.x-dir*nc.w/2,u),nc.y);c.stroke();c.restore()})}
 /* the final in the middle */
 const fin=B.rounds[rounds-1]&&B.rounds[rounds-1][0],lastL=slots.L[rounds-1]&&slots.L[rounds-1][0],lastR=slots.R[rounds-1]&&slots.R[rounds-1][0];
 const tu=eb(clamp((t-.9)/.8,0,1));if(IM.trophy){c.save();c.globalAlpha=clamp(tu*2,0,1);c.translate(W/2,H*.5);const sc=tu*(.52+.03*Math.sin(t*2.4)),tw=IM.trophy.width*.5*sc,th=IM.trophy.height*.5*sc;c.shadowColor=GOLD;c.shadowBlur=50;c.drawImage(IM.trophy,-tw/2,-th/2+10,tw,th);c.restore()}
 if(IM.crown){c.save();c.globalAlpha=clamp(tu*2,0,1);const cy=H*.27+Math.sin(t*2)*6,cw=IM.crown.width*.2*tu;c.translate(W/2,cy);c.rotate(-.1+Math.sin(t*1.6)*.05);c.shadowColor=GOLD;c.shadowBlur=30;c.drawImage(IM.crown,-cw/2,-IM.crown.height*.1*tu,cw,IM.crown.height*.2*tu);c.restore()}
 const ffx=W/2,ffy=H*.78;tx(c,'FINAL',ffx,ffy-34,22,FN.P,GOLD,{sw:6,a:clamp((t-1.4)/.4,0,1)});
 if(o.cursor!=null){}}
function matchIndexOf(B,side,r,slot){const N=B.fighters.length,per=N/Math.pow(2,r+1);const sideIndex=Math.floor(slot/2);return side==='L'?sideIndex:per/2+sideIndex}

window.MZBattleFX={W,H,IM,FN,LC,RC,GOLD,TEMPLATES,loadFonts,loadProps,loadChars,charImg,arena,vignette,portrait,plate,hpbar,bubble,tx,rr,wrap,sparkle,shake,flashFx,rings,confetti,fireworks,crack,speedLines,godRays,slamText,drawBracket,bracketLayout,slotFighters,hs,eo,ei,eio,eb,clamp,lerp,G,RG,matchIndexOf};
})();
