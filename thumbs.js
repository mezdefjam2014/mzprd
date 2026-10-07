/* MZPRD thumbnail maker. Draws 5 cinematic thumbnail designs (3 with the producer character, 2 without) for a beat or pack
   in 16:9 (1280x720, YouTube) and 9:16 (1080x1920, Shorts). Look: graded dark scenes, metallic type, soft bloom, fine grain,
   light rim on the character. Rules from YouTube thumbnail research: 1 to 3 huge heavy words, outline + shadow for contrast,
   colours pulled from the cover, nothing important in the bottom-right corner (duration stamp), JPEG under 2 MB. */
(function(){
const FONT_LINK='https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Oswald:wght@500;600;700&family=Press+Start+2P&display=swap';
let ready=null,hero=null,grain=null;
const SRC={x:520,y:0,w:620,h:468};
function load(){
 if(ready)return ready;
 ready=(async()=>{
  if(!document.querySelector('link[data-th]')){const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_LINK;l.dataset.th='1';document.head.appendChild(l)}
  await new Promise(r=>setTimeout(r,60));
  await Promise.all(["40px Anton","40px 'Bebas Neue'","600 40px Oswald","12px 'Press Start 2P'"].map(f=>document.fonts.load(f).catch(()=>{})));
  hero=new Image();hero.src=new URL('hero.jpg',document.baseURI).href;try{await hero.decode()}catch(e){}
 })();
 return ready;
}
function rgb2h(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,l=(mx+mn)/2;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:d?d/(1-Math.abs(2*l-1)):0,l}}
function palette(cover,seed){
 let hue=355,hit=false;
 if(cover){try{const c=document.createElement('canvas');c.width=c.height=24;const x=c.getContext('2d');x.drawImage(cover,0,0,24,24);const d=x.getImageData(0,0,24,24).data,b=new Float32Array(12);
  for(let i=0;i<d.length;i+=4){const o=rgb2h(d[i],d[i+1],d[i+2]),w=o.s*(1-Math.abs(2*o.l-1));b[Math.floor(o.h/30)%12]+=w}
  let bi=0;for(let i=1;i<12;i++)if(b[i]>b[bi])bi=i;if(b[bi]>1.2){hue=bi*30+15;hit=true}}catch(e){}}
 const shift=[0,25,-25,150,-150][seed%5];hue=(hue+(hit?shift:shift*.5)+360)%360;
 return{hue,a:`hsl(${hue} 90% 52%)`,aL:`hsl(${hue} 95% 66%)`,a2:`hsl(${(hue+180)%360} 85% 58%)`,dark:`hsl(${hue} 40% 4%)`,mid:`hsl(${hue} 45% 12%)`};
}
const words=t=>{const w=String(t||'BEAT').toUpperCase().replace(/[^A-Z0-9' &]/g,' ').split(/\s+/).filter(Boolean);return(w.length?w:['BEAT']).slice(0,3)};
function fitPx(c,str,font,maxW,maxPx){c.font='100px '+font;const w=c.measureText(str).width||1;return Math.min(maxPx,100*maxW/w)}
function coverFit(c,img,x,y,w,h){const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function rnd(seed){let s=seed*9301+49297;return()=>{s=(s*9301+49297)%233280;return s/233280}}

/* ---------- atmosphere ---------- */
function bg(c,W,H,cover,P,dim,seed){
 c.fillStyle=P.dark;c.fillRect(0,0,W,H);
 if(cover){const s=document.createElement('canvas');s.width=Math.round(W/5);s.height=Math.round(H/5);const x=s.getContext('2d');x.filter='blur(7px) saturate(1.3)';coverFit(x,cover,-14,-14,s.width+28,s.height+28);c.globalAlpha=dim;c.drawImage(s,0,0,W,H);c.globalAlpha=1}
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.5,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,.75)');c.fillStyle=g;c.fillRect(0,0,W,H);
 const r=rnd(seed+3),u=Math.min(W,H)/720;
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<16;i++){const x=r()*W,y=r()*H,rad=(10+r()*46)*u,a=.04+r()*.09,gg=c.createRadialGradient(x,y,0,x,y,rad);gg.addColorStop(0,(i%3?P.aL:'#ffffff'));gg.addColorStop(1,'transparent');c.globalAlpha=a;c.fillStyle=gg;c.fillRect(x-rad,y-rad,rad*2,rad*2)}
 c.restore();
}
function glow(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');c.save();c.globalAlpha=a;c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
function streak(c,W,H,P,a){c.save();c.globalCompositeOperation='screen';c.translate(W*.5,H*.5);c.rotate(-.55);const g=c.createLinearGradient(-W,0,W,0);g.addColorStop(0,'transparent');g.addColorStop(.5,P.aL);g.addColorStop(1,'transparent');c.globalAlpha=a;c.fillStyle=g;c.fillRect(-W,-H*.04,W*2,H*.08);c.restore()}
function vignette(c,W,H,a){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,Math.max(W,H)*.78);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+a+')');c.fillStyle=g;c.fillRect(0,0,W,H)}
function finish(c,W,H,P,o){
 o=o||{};
 const s=document.createElement('canvas');s.width=Math.round(W/6);s.height=Math.round(H/6);const x=s.getContext('2d');x.drawImage(c.canvas,0,0,s.width,s.height);
 const b=document.createElement('canvas');b.width=s.width;b.height=s.height;const bx=b.getContext('2d');bx.filter='blur(5px) brightness(1.15)';bx.drawImage(s,0,0);
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=o.bloom==null?.34:o.bloom;c.drawImage(b,0,0,W,H);c.restore();
 vignette(c,W,H,o.vig==null?.55:o.vig);
 if(!grain){grain=document.createElement('canvas');grain.width=grain.height=192;const gx=grain.getContext('2d'),d=gx.createImageData(192,192);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}gx.putImageData(d,0,0)}
 c.save();c.globalCompositeOperation='overlay';c.globalAlpha=o.grain==null?.12:o.grain;c.fillStyle=c.createPattern(grain,'repeat');c.fillRect(0,0,W,H);c.restore();
 /* soft grade: lift teal in shadows, warm highlights */
 c.save();c.globalCompositeOperation='soft-light';const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(40,60,120,.35)');g.addColorStop(1,'rgba(255,140,60,.28)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();
}

/* ---------- type ---------- */
function paint(c,kind,y,px,P){
 const g=c.createLinearGradient(0,y,0,y+px);
 if(kind==='gold'){g.addColorStop(0,'#fff6c8');g.addColorStop(.38,'#ffd34a');g.addColorStop(.7,'#d99a12');g.addColorStop(1,'#a8670a')}
 else if(kind==='silver'){g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#d9dde6');g.addColorStop(1,'#8e96a8')}
 else if(kind==='accent'){g.addColorStop(0,P.aL);g.addColorStop(1,P.a)}
 else{g.addColorStop(0,'#ffffff');g.addColorStop(1,'#e9e9ee')}
 return g;
}
function title(c,ws,x,y,maxW,maxH,align,P,kinds,font){
 font=font||'Anton';const n=ws.length,lh=1.0,sizes=ws.map(w=>fitPx(c,w,font,maxW,maxH/n/lh));let cy=y;
 ws.forEach((w,i)=>{const px=sizes[i];c.save();c.font=px+'px '+font;c.textAlign=align||'left';c.textBaseline='top';
  const tx=align==='center'?x+maxW/2:align==='right'?x+maxW:x;c.lineJoin='round';
  c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=px*.28;c.shadowOffsetY=px*.08;c.fillStyle='#000';c.fillText(w,tx,cy);
  c.shadowColor='transparent';c.lineWidth=px*.075;c.strokeStyle='#050505';c.strokeText(w,tx,cy);
  c.fillStyle=paint(c,(kinds||['white'])[i%(kinds||['white']).length],cy,px,P);c.fillText(w,tx,cy);
  c.globalCompositeOperation='source-atop';const hg=c.createLinearGradient(0,cy,0,cy+px*.5);hg.addColorStop(0,'rgba(255,255,255,.35)');hg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=hg;c.fillText(w,tx,cy);
  c.restore();cy+=px*lh});
 return cy;
}
function label(c,text,x,y,px,col,align,bold){
 c.save();c.font=(bold?'700 ':'600 ')+px+'px Oswald';if('letterSpacing' in c)c.letterSpacing=(px*.32)+'px';c.textAlign=align||'left';c.textBaseline='top';
 c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=px*.5;c.fillStyle=col;c.fillText(text,x,y);const w=c.measureText(text).width;c.restore();return w;
}
function rule(c,x,y,w,col,t){c.save();c.fillStyle=col;c.fillRect(x,y,w,t);c.restore()}
function measure(c,text,px,bold){c.save();c.font=(bold?'700 ':'600 ')+px+'px Oswald';if('letterSpacing' in c)c.letterSpacing=(px*.32)+'px';const w=c.measureText(text).width;c.restore();return w}
function tagLine(c,X,P,x,y,px,align){
 /* small accent bar + label, then BPM / key in gold */
 const u=px/20,t1=px*1.3,t2=px*1.05;let xs=x;
 if(align==='center'){const wm=Math.max(measure(c,tagWord(X),t1,true),info(X)?measure(c,info(X),t2,false):0);xs=x-(wm+14*u)/2}
 rule(c,xs,y+px*.1,4*u,P.aL,info(X)?px*2.6:px*1.3);
 label(c,tagWord(X),xs+14*u,y,t1,'#fff','left',true);
 if(info(X))label(c,info(X),xs+14*u,y+px*1.9,t2,'#ffd34a','left',false);
}
function character(c,x,y,w,P,flip,rim){
 const h=w*SRC.h/SRC.w;if(!hero||!hero.naturalWidth)return h;
 const o=document.createElement('canvas');o.width=SRC.w;o.height=SRC.h;const x2=o.getContext('2d');
 x2.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);
 x2.globalCompositeOperation='destination-in';const g=x2.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.26,SRC.w*.52,SRC.h*.55,SRC.h*.76);g.addColorStop(0,'#000');g.addColorStop(.7,'#000');g.addColorStop(1,'rgba(0,0,0,0)');x2.fillStyle=g;x2.fillRect(0,0,SRC.w,SRC.h);
 const draw=()=>{if(flip){c.translate(x+w,y);c.scale(-1,1);c.drawImage(o,0,0,w,h)}else c.drawImage(o,x,y,w,h)};
 c.save();c.shadowColor=P.aL;c.shadowBlur=w*.07;draw();c.restore();
 c.save();c.globalCompositeOperation='overlay';c.globalAlpha=.55;draw();c.restore();
 return h;
}
const info=X=>X.infoText!=null?X.infoText:[X.bpm?X.bpm+' BPM':'',X.key||''].filter(Boolean).join('   •   ');
const tagWord=X=>X.tagText||(X.kind==='packs'?'SAMPLE PACK':'TYPE BEAT');
const HOOKS={beats:['FREE','NEW','HARD','FIRE','DARK'],packs:['NEW','VINYL','LOOPS','FREE','DARK']};
function frameBox(c,x,y,s,u,P){
 c.save();c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=50*u;c.shadowOffsetY=18*u;c.fillStyle='#000';c.fillRect(x,y,s,s);c.restore();
 c.lineWidth=2*u;c.strokeStyle='rgba(255,214,90,.9)';c.strokeRect(x-9*u,y-9*u,s+18*u,s+18*u);
 c.lineWidth=1*u;c.strokeStyle='rgba(255,255,255,.35)';c.strokeRect(x-15*u,y-15*u,s+30*u,s+30*u);
}
function stamp(c,text,x,y,px,rot,P){
 c.save();c.translate(x,y);c.rotate(rot);c.font=px+'px Anton';if('letterSpacing' in c)c.letterSpacing=(px*.12)+'px';const w=c.measureText(text).width+px*.9,h=px*1.5;
 c.fillStyle='rgba(0,0,0,.55)';c.fillRect(-w/2,-h/2,w,h);c.lineWidth=px*.07;c.strokeStyle='#ffd34a';c.strokeRect(-w/2,-h/2,w,h);
 c.textAlign='center';c.textBaseline='middle';c.fillStyle=paint(c,'gold',-h/2,h,P);c.fillText(text,0,px*.05);c.restore();
}

const V=[
 /* 0: character hero */
 function(c,W,H,X,P,seed){const land=W>H,u=Math.min(W,H)/720;
  bg(c,W,H,X.cover,P,.5,seed);glow(c,land?W*.74:W*.5,land?H*.5:H*.78,Math.max(W,H)*.55,P.a,.5);streak(c,W,H,P,.2);
  if(land){character(c,W-H*1.32*.9,H*-.03,H*1.34,P,false);title(c,X.w,W*.055,H*.2,W*.5,H*.58,'left',P,['white','gold','white']);
   label(c,'MZPRD  •  NEW',W*.057,H*.1,20*u,P.aL,'left',true);tagLine(c,X,P,W*.057,H*.8,22*u)}
  else{const w=W*1.15,h=w*SRC.h/SRC.w;character(c,(W-w)/2,H-h*.98,w,P,false);title(c,X.w,W*.05,H*.07,W*.9,H*.36,'center',P,['white','gold','white']);
   label(c,'MZPRD  •  NEW',W/2,H*.035,32*u,P.aL,'center',true);tagLine(c,X,P,W*.5,H*.46,36*u,'center')}
  finish(c,W,H,P)},
 /* 1: cover poster, reflection */
 function(c,W,H,X,P,seed){const land=W>H,u=Math.min(W,H)/720;
  bg(c,W,H,X.cover,P,.8,seed);glow(c,W*.3,H*.5,Math.max(W,H)*.5,P.a,.35);streak(c,W,H,P,.14);
  const s=land?H*.7:W*.74,cx=land?W*.09:(W-s)/2,cy=land?H*.12:H*.09;
  if(X.cover){c.save();c.translate(0,cy*2+s*2);c.scale(1,-1);c.globalAlpha=.22;coverFit(c,X.cover,cx,cy,s,s);c.restore();
   const rg=c.createLinearGradient(0,cy+s,0,cy+s+s*.5);rg.addColorStop(0,'rgba(0,0,0,.2)');rg.addColorStop(1,P.dark);c.fillStyle=rg;c.fillRect(cx-40*u,cy+s,s+80*u,s*.55)}
  frameBox(c,cx,cy,s,u,P);
  if(X.cover){c.save();c.beginPath();c.rect(cx,cy,s,s);c.clip();coverFit(c,X.cover,cx,cy,s,s);c.restore()}else{c.fillStyle=P.mid;c.fillRect(cx,cy,s,s)}
  stamp(c,X.hook,cx+s-(land?6:10)*u,cy+(land?10:20)*u,(land?34:54)*u,.16,P);
  if(land){label(c,'MZPRD  •  PRESENTS',W*.55,H*.12,19*u,P.aL,'left',true);const y=title(c,X.w,W*.55,H*.2,W*.4,H*.5,'left',P,['white','gold','white']);rule(c,W*.553,y+10*u,W*.14,P.aL,5*u);tagLine(c,X,P,W*.553,y+34*u,22*u)}
  else{label(c,'MZPRD  •  PRESENTS',W/2,cy+s+H*.03,32*u,P.aL,'center',true);const y=title(c,X.w,W*.05,cy+s+H*.07,W*.9,H*.2,'center',P,['white','gold','white']);tagLine(c,X,P,W*.5,y+H*.015,34*u,'center')}
  finish(c,W,H,P,{bloom:.28})},
 /* 2: diagonal split */
 function(c,W,H,X,P,seed){const land=W>H,u=Math.min(W,H)/720;
  c.fillStyle=P.dark;c.fillRect(0,0,W,H);const g0=c.createLinearGradient(0,0,W,H);g0.addColorStop(0,P.mid);g0.addColorStop(1,'#000');c.fillStyle=g0;c.fillRect(0,0,W,H);
  glow(c,land?W*.76:W*.5,land?H*.5:H*.78,Math.max(W,H)*.55,P.a,.55);streak(c,W,H,P,.16);
  c.save();c.beginPath();if(land){c.moveTo(0,0);c.lineTo(W*.56,0);c.lineTo(W*.44,H);c.lineTo(0,H)}else{c.moveTo(0,0);c.lineTo(W,0);c.lineTo(W,H*.46);c.lineTo(0,H*.56)}c.closePath();c.clip();
  if(X.cover)coverFit(c,X.cover,0,0,land?W*.6:W,land?H:H*.6);else{c.fillStyle=P.a;c.fillRect(0,0,W,H)}
  const sh=c.createLinearGradient(0,0,0,H);sh.addColorStop(0,'rgba(0,0,0,.25)');sh.addColorStop(.4,'rgba(0,0,0,.55)');sh.addColorStop(1,'rgba(0,0,0,.92)');c.fillStyle=sh;c.fillRect(0,0,W,H);c.restore();
  c.save();c.beginPath();if(land){c.moveTo(W*.56,0);c.lineTo(W*.566,0);c.lineTo(W*.446,H);c.lineTo(W*.44,H)}else{c.moveTo(W,H*.46);c.lineTo(W,H*.468);c.lineTo(0,H*.568);c.lineTo(0,H*.56)}c.closePath();c.fillStyle='#ffd34a';c.shadowColor='#ffd34a';c.shadowBlur=16*u;c.fill();c.restore();
  if(land){character(c,W*.42,H*.05,H*1.1,P,true);const y=title(c,X.w,W*.045,H*.5,W*.5,H*.36,'left',P,['white','gold','white']);label(c,'MZPRD  •  NEW',W*.047,H*.07,19*u,'#fff','left',true);tagLine(c,X,P,W*.047,H*.88,18*u)}
  else{const w=W*1.1;character(c,(W-w)/2,H*.5,w,P,true);title(c,X.w,W*.05,H*.66,W*.9,H*.2,'center',P,['white','gold','white']);label(c,'MZPRD  •  NEW',W/2,H*.03,32*u,'#fff','center',true);tagLine(c,X,P,W*.5,H*.89,28*u,'center')}
  finish(c,W,H,P)},
 /* 3: giant editorial type */
 function(c,W,H,X,P,seed){const land=W>H,u=Math.min(W,H)/720;
  bg(c,W,H,X.cover,P,.85,seed);c.save();c.globalCompositeOperation='multiply';c.fillStyle=P.a;c.globalAlpha=.5;c.fillRect(0,0,W,H);c.restore();streak(c,W,H,P,.2);
  const n=X.w.length,top=land?H*.1:H*.2,hh=land?H*.8:H*.6;let cy=top;
  X.w.forEach((w,i)=>{const px=fitPx(c,w,'Anton',W*.92,hh/n);
   c.save();c.font=px+'px Anton';c.textAlign='center';c.textBaseline='top';c.lineJoin='round';
   c.lineWidth=2*u;c.strokeStyle='rgba(255,255,255,.35)';c.strokeText(w,W/2+px*.05,cy+px*.06);
   c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=px*.25;c.shadowOffsetY=px*.07;c.fillStyle='#000';c.fillText(w,W/2,cy);c.shadowColor='transparent';
   c.lineWidth=px*.07;c.strokeStyle='#050505';c.strokeText(w,W/2,cy);c.fillStyle=paint(c,i%2?'gold':'white',cy,px,P);c.fillText(w,W/2,cy);c.restore();cy+=px});
  const s=land?H*.19:W*.25,cx=land?W*.035:W*.05,cy2=land?H*.06:H*.045;
  if(X.cover){c.save();c.translate(cx+s/2,cy2+s/2);c.rotate(-.06);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=24*u;c.drawImage(X.cover,-s/2,-s/2,s,s);c.lineWidth=3*u;c.strokeStyle='#ffd34a';c.strokeRect(-s/2,-s/2,s,s);c.restore()}
  if(land){tagLine(c,X,P,W*.04,H*.85,20*u);label(c,'PROD. MZPRD',W*.96,H*.06,18*u,'rgba(255,255,255,.8)','right',true)}
  else{tagLine(c,X,P,W*.5,H*.86,34*u,'center');label(c,'PROD. MZPRD',W*.95,H*.05,26*u,'rgba(255,255,255,.8)','right',true)}
  finish(c,W,H,P,{bloom:.3})},
 /* 4: 8-bit retro */
 function(c,W,H,X,P,seed){const land=W>H,lw=land?320:180,lh=land?180:320,o=document.createElement('canvas');o.width=lw;o.height=lh;const x=o.getContext('2d');
  const g=x.createLinearGradient(0,0,0,lh);g.addColorStop(0,'#0a0314');g.addColorStop(.6,P.mid);g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,lw,lh);
  for(let i=0;i<40;i++){x.fillStyle=i%4?'#5a4a85':'#ffd34a';x.fillRect((i*47)%lw,(i*29)%(lh*.55),1,1)}
  const sy=lh*(land?.62:.56);x.fillStyle=P.a;x.globalAlpha=.9;x.beginPath();x.arc(land?lw*.72:lw*.5,sy-8,land?34:30,Math.PI,0);x.fill();x.globalAlpha=1;
  x.fillStyle='#07040c';x.fillRect(0,sy,lw,lh-sy);x.strokeStyle=P.a;x.globalAlpha=.7;x.lineWidth=1;for(let i=-10;i<=10;i++){x.beginPath();x.moveTo(lw/2+i*4,sy);x.lineTo(lw/2+i*(land?26:16),lh);x.stroke()}for(let k=1;k<7;k++){const yy=sy+(lh-sy)*Math.pow(k/7,1.8);x.beginPath();x.moveTo(0,yy);x.lineTo(lw,yy);x.stroke()}x.globalAlpha=1;
  const cw=land?150:170,ch=cw*SRC.h/SRC.w;if(hero&&hero.naturalWidth){const t=document.createElement('canvas');t.width=SRC.w;t.height=SRC.h;const tx=t.getContext('2d');tx.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);tx.globalCompositeOperation='destination-in';const rg=tx.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.3,SRC.w*.52,SRC.h*.55,SRC.h*.75);rg.addColorStop(0,'#000');rg.addColorStop(.75,'#000');rg.addColorStop(1,'rgba(0,0,0,0)');tx.fillStyle=rg;tx.fillRect(0,0,SRC.w,SRC.h);
   x.drawImage(t,land?lw-cw+14:(lw-cw)/2,land?lh-ch+8:lh-ch+4,cw,ch)}
  if(X.cover){const s=land?52:60,cx=land?10:(lw-s)/2,cy=land?10:8;x.fillStyle='#000';x.fillRect(cx-2,cy-2,s+4,s+4);x.drawImage(X.cover,cx,cy,s,s);x.strokeStyle='#ffd34a';x.lineWidth=1;x.strokeRect(cx-1.5,cy-1.5,s+3,s+3)}
  x.textBaseline='top';x.textAlign=land?'left':'center';let ty=land?70:78;const tx0=land?10:lw/2;
  X.w.forEach((w,i)=>{const px=Math.min(land?20:16,Math.floor(170/(w.length*.95)));x.font=px+"px 'Press Start 2P'";x.fillStyle='#000';x.fillText(w,tx0+1.5,ty+1.5);x.fillStyle=i%2?'#ffd34a':'#fff';x.fillText(w,tx0,ty);ty+=px+4});
  x.font="7px 'Press Start 2P'";x.fillStyle=P.a;x.fillRect(land?10:lw/2-34,ty+4,68,11);x.fillStyle='#fff';x.textAlign='center';x.fillText(X.kind==='packs'?'PACK':'BEAT',(land?10:lw/2-34)+34,ty+6);
  if(info(X)){x.textAlign=land?'left':'center';x.fillStyle='#ffd34a';x.font="6px 'Press Start 2P'";x.fillText(info(X).replace(/\s+•\s+/g,' '),land?10:lw/2,ty+20)}
  c.imageSmoothingEnabled=false;c.drawImage(o,0,0,W,H);c.fillStyle='rgba(0,0,0,.22)';const st=Math.round(W/lw);for(let y=0;y<H;y+=st*2)c.fillRect(0,y,W,st*.5);
  finish(c,W,H,P,{bloom:.4,grain:.07})}
];
const NAMES=['CHARACTER','COVER POSTER','SPLIT','GIANT TYPE','8-BIT'];
const WITH=[true,false,true,false,true];
function make(i,W,H,X){
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 const seed=(X.seed||0)+i,P=palette(X.cover,seed);
 const xx={...X,w:X.w||words(X.title),hook:(HOOKS[X.kind]||HOOKS.beats)[(seed+i)%5]};
 ctx.imageSmoothingQuality='high';V[i%V.length](ctx,W,H,xx,P,seed);return c;
}
window.MZThumbs={load,make,count:V.length,names:NAMES,withChar:WITH,words};
})();
