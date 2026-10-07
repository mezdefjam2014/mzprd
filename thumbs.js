/* MZPRD thumbnail maker. Draws 5 thumbnail designs (3 with the producer character, 2 without) for a beat or pack
   in 16:9 (1280x720, YouTube) and 9:16 (1080x1920, Shorts). Rules baked in from YouTube thumbnail research:
   1 to 3 huge heavy words, thick outline + shadow, high contrast colours pulled from the cover, the subject fills the frame,
   nothing important in the bottom-right corner (the duration stamp covers it), small file (JPEG under 2 MB). */
(function(){
const FONT_LINK='https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Oswald:wght@600;700&family=Press+Start+2P&display=swap';
let ready=null,hero=null;
const SRC={x:520,y:0,w:620,h:468};
function load(){
 if(ready)return ready;
 ready=(async()=>{
  if(!document.querySelector('link[data-th]')){const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_LINK;l.dataset.th='1';document.head.appendChild(l)}
  await new Promise(r=>setTimeout(r,60));
  await Promise.all(["40px Anton","40px 'Bebas Neue'","40px Oswald","12px 'Press Start 2P'"].map(f=>document.fonts.load(f).catch(()=>{})));
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
 return{hue,a:`hsl(${hue} 95% 56%)`,a2:`hsl(${(hue+180)%360} 92% 60%)`,dark:`hsl(${hue} 50% 6%)`,mid:`hsl(${hue} 55% 15%)`,gold:'#ffd60a'};
}
function words(t){const w=String(t||'BEAT').toUpperCase().replace(/[^A-Z0-9' &]/g,' ').split(/\s+/).filter(Boolean);return(w.length?w:['BEAT']).slice(0,3)}
function fitPx(c,str,font,maxW,maxPx){c.font='100px '+font;const w=c.measureText(str).width||1;return Math.min(maxPx,100*maxW/w)}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function coverFit(c,img,x,y,w,h){const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function bg(c,W,H,cover,P,dim,blur){
 c.fillStyle=P.dark;c.fillRect(0,0,W,H);
 if(cover){const s=document.createElement('canvas');s.width=Math.round(W/4);s.height=Math.round(H/4);const x=s.getContext('2d');x.filter='blur('+(blur||10)+'px)';coverFit(x,cover,-20,-20,s.width+40,s.height+40);c.globalAlpha=dim;c.drawImage(s,0,0,W,H);c.globalAlpha=1}
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=g;c.fillRect(0,0,W,H);
}
function glow(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');c.save();c.globalAlpha=a;c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
function vignette(c,W,H,a){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+a+')');c.fillStyle=g;c.fillRect(0,0,W,H)}
function character(c,x,y,w,P,flip){
 const h=w*SRC.h/SRC.w;if(!hero||!hero.naturalWidth)return h;
 const o=document.createElement('canvas');o.width=SRC.w;o.height=SRC.h;const x2=o.getContext('2d');
 x2.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);
 x2.globalCompositeOperation='destination-in';const g=x2.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.28,SRC.w*.52,SRC.h*.55,SRC.h*.78);g.addColorStop(0,'#000');g.addColorStop(.7,'#000');g.addColorStop(1,'rgba(0,0,0,0)');x2.fillStyle=g;x2.fillRect(0,0,SRC.w,SRC.h);
 c.save();c.shadowColor=P.a;c.shadowBlur=w*.04;if(flip){c.translate(x+w,y);c.scale(-1,1);c.drawImage(o,0,0,w,h)}else c.drawImage(o,x,y,w,h);c.restore();return h;
}
function title(c,ws,x,y,maxW,maxH,align,o){
 o=o||{};const font=o.font||'Anton',n=ws.length,lh=1.02;let cy=y;
 const sizes=ws.map(w=>fitPx(c,w,font,maxW,maxH/n/lh));const base=o.same?Math.min(...sizes):null;
 ws.forEach((w,i)=>{const px=base||sizes[i];c.save();c.font=px+'px '+font;c.textAlign=align||'left';c.textBaseline='top';
  const tx=align==='center'?x+maxW/2:align==='right'?x+maxW:x;
  c.lineJoin='round';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=px*.12;c.shadowOffsetY=px*.06;
  c.lineWidth=px*.16;c.strokeStyle='#000';c.strokeText(w,tx,cy);c.shadowColor='transparent';
  c.fillStyle=(o.fills||['#fff'])[i%(o.fills||['#fff']).length];c.fillText(w,tx,cy);c.restore();cy+=px*lh});
 return cy;
}
function chip(c,text,x,y,px,bgc,fg,font,rot){
 c.save();c.font=px+'px '+(font||'Oswald');const w=c.measureText(text).width+px*1.1,h=px*1.5;if(rot){c.translate(x+w/2,y+h/2);c.rotate(rot);c.translate(-(x+w/2),-(y+h/2))}
 c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=px*.4;c.fillStyle=bgc;rr(c,x,y,w,h,px*.25);c.fill();c.shadowColor='transparent';
 c.fillStyle=fg;c.textBaseline='middle';c.textAlign='left';c.fillText(text,x+px*.55,y+h/2+px*.04);c.restore();return w;
}
function burst(c,cx,cy,r,col,text,fg,rot){
 c.save();c.translate(cx,cy);c.rotate(rot||-.2);c.beginPath();for(let i=0;i<24;i++){const a=i/24*Math.PI*2,rad=i%2?r*.8:r;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}c.closePath();
 c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=r*.2;c.fillStyle=col;c.fill();c.shadowColor='transparent';c.lineWidth=r*.06;c.strokeStyle='#000';c.stroke();
 const px=fitPx(c,text,'Anton',r*1.2,r*.8);c.font=px+'px Anton';c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(text,0,r*.04);c.restore();
}
function info(X){return[X.bpm?X.bpm+' BPM':'',X.key||''].filter(Boolean).join('  ')}
const HOOKS={beats:['FREE','NEW','HARD','FIRE','DARK'],packs:['NEW','VINYL','LOOPS','FREE','DARK']};
const tagWord=X=>X.kind==='packs'?'SAMPLE PACK':'TYPE BEAT';

const V=[
 /* 0: character hero (with character) */
 function(c,W,H,X,P){const land=W>H,u=Math.min(W,H)/720;
  bg(c,W,H,X.cover,P,.4,12);glow(c,land?W*.72:W*.5,land?H*.55:H*.75,Math.max(W,H)*.6,P.a,.5);
  if(land){character(c,W-H*1.32*.9,H*-.02,H*1.32,P,false);title(c,X.w,W*.05,H*.1,W*.5,H*.62,'left',{fills:['#fff',P.gold,'#fff']});
   chip(c,tagWord(X),W*.05,H*.8,34*u,P.a,'#fff');if(info(X))chip(c,info(X),W*.05+260*u,H*.8,30*u,'#000',P.gold)}
  else{const w=W*1.15,h=w*SRC.h/SRC.w;character(c,(W-w)/2,H-h*.98,w,P,false);title(c,X.w,W*.05,H*.05,W*.9,H*.36,'center',{fills:['#fff',P.gold,'#fff']});
   chip(c,tagWord(X),W*.05,H*.43,52*u,P.a,'#fff');if(info(X))chip(c,info(X),W*.05,H*.5,46*u,'#000',P.gold)}
  vignette(c,W,H,.55)},
 /* 1: cover poster (no character) */
 function(c,W,H,X,P){const land=W>H,u=Math.min(W,H)/720;
  bg(c,W,H,X.cover,P,.7,14);glow(c,W*.3,H*.5,Math.max(W,H)*.5,P.a,.35);
  const s=land?H*.76:W*.8,cx=land?W*.07:(W-s)/2,cy=land?(H-s)/2:H*.07;
  c.save();c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=40*u;c.shadowOffsetY=14*u;c.fillStyle='#000';c.fillRect(cx,cy,s,s);c.restore();
  if(X.cover){c.save();c.beginPath();c.rect(cx,cy,s,s);c.clip();coverFit(c,X.cover,cx,cy,s,s);c.restore()}else{c.fillStyle=P.mid;c.fillRect(cx,cy,s,s)}
  c.lineWidth=8*u;c.strokeStyle='#fff';c.strokeRect(cx,cy,s,s);
  burst(c,cx+s-(land?10:20)*u,cy+(land?24:40)*u,(land?92:150)*u,P.gold,X.hook,'#000',.25);
  if(land){const y=title(c,X.w,W*.52,H*.14,W*.43,H*.52,'left',{fills:['#fff',P.a,'#fff']});c.fillStyle=P.a;c.fillRect(W*.52,y+8*u,W*.2,10*u);
   chip(c,tagWord(X),W*.52,y+36*u,34*u,'#000','#fff');if(info(X))chip(c,info(X),W*.52,y+96*u,30*u,P.a,'#fff')}
  else{const y=title(c,X.w,W*.05,cy+s+H*.03,W*.9,H*.22,'center',{fills:['#fff',P.a,'#fff']});chip(c,tagWord(X),W*.08,y+20*u,50*u,'#000','#fff');if(info(X))chip(c,info(X),W*.08,y+110*u,44*u,P.a,'#fff')}
  vignette(c,W,H,.45)},
 /* 2: diagonal split (with character) */
 function(c,W,H,X,P){const land=W>H,u=Math.min(W,H)/720;
  c.fillStyle=P.dark;c.fillRect(0,0,W,H);
  const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,P.mid);g.addColorStop(1,'#000');c.fillStyle=g;c.fillRect(0,0,W,H);
  glow(c,land?W*.75:W*.5,land?H*.5:H*.78,Math.max(W,H)*.55,P.a,.5);
  c.save();c.beginPath();if(land){c.moveTo(0,0);c.lineTo(W*.56,0);c.lineTo(W*.44,H);c.lineTo(0,H)}else{c.moveTo(0,0);c.lineTo(W,0);c.lineTo(W,H*.46);c.lineTo(0,H*.56)}c.closePath();c.clip();
  if(X.cover)coverFit(c,X.cover,0,0,land?W*.6:W,land?H:H*.6);else{c.fillStyle=P.a;c.fillRect(0,0,W,H)}
  c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,0,W,H);c.restore();
  c.save();c.beginPath();if(land){c.moveTo(W*.56,0);c.lineTo(W*.575,0);c.lineTo(W*.455,H);c.lineTo(W*.44,H)}else{c.moveTo(W,H*.46);c.lineTo(W,H*.475);c.lineTo(0,H*.575);c.lineTo(0,H*.56)}c.closePath();c.fillStyle=P.gold;c.fill();c.restore();
  {const bg2=c.createLinearGradient(0,H*(land?.45:.62),0,H);bg2.addColorStop(0,'rgba(0,0,0,0)');bg2.addColorStop(1,'rgba(0,0,0,.8)');c.fillStyle=bg2;c.fillRect(0,H*(land?.45:.62),land?W*.58:W,H)}
  if(land){character(c,W*.42,H*.05,H*1.1,P,true);const y=title(c,X.w,W*.04,H*.56,W*.5,H*.34,'left',{fills:['#fff',P.gold,'#fff']});chip(c,tagWord(X),W*.04,H*.06,32*u,P.a,'#fff')}
  else{const w=W*1.1,h=w*SRC.h/SRC.w;character(c,(W-w)/2,H*.5,w,P,true);title(c,X.w,W*.05,H*.7,W*.9,H*.24,'center',{fills:['#fff',P.gold,'#fff']});chip(c,tagWord(X),W*.06,H*.04,48*u,P.a,'#fff')}
  if(info(X)){if(land)chip(c,info(X),W*.04,H*.88,28*u,'#000',P.gold);else chip(c,info(X),W*.06,H*.94,40*u,'#000',P.gold)}
  vignette(c,W,H,.5)},
 /* 3: giant type (no character) */
 function(c,W,H,X,P){const land=W>H,u=Math.min(W,H)/720;
  bg(c,W,H,X.cover,P,.9,16);c.save();c.globalCompositeOperation='multiply';c.fillStyle=P.a;c.globalAlpha=.55;c.fillRect(0,0,W,H);c.restore();
  c.save();c.fillStyle='rgba(0,0,0,.22)';for(let y=0;y<H;y+=22*u)for(let x=((y/(22*u))%2)*11*u;x<W;x+=22*u){c.beginPath();c.arc(x,y,3.2*u,0,7);c.fill()}c.restore();
  const n=X.w.length,top=land?H*.08:H*.2,hh=land?H*.84:H*.6;
  let cy=top;X.w.forEach((w,i)=>{const px=fitPx(c,w,'Anton',W*.92,hh/n/1.0);c.save();c.font=px+'px Anton';c.textAlign='center';c.textBaseline='top';c.lineJoin='round';
   c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=px*.1;c.shadowOffsetY=px*.07;c.lineWidth=px*.15;c.strokeStyle='#000';c.strokeText(w,W/2,cy);c.shadowColor='transparent';
   c.fillStyle=i%2?P.gold:'#fff';c.fillText(w,W/2,cy);c.restore();cy+=px*1.0});
  const s=land?H*.2:W*.26,cx=land?W*.03:W*.05,cy2=land?H*.05:H*.04;
  if(X.cover){c.save();c.translate(cx+s/2,cy2+s/2);c.rotate(-.07);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=20*u;c.drawImage(X.cover,-s/2,-s/2,s,s);c.lineWidth=5*u;c.strokeStyle='#fff';c.strokeRect(-s/2,-s/2,s,s);c.restore()}
  chip(c,tagWord(X),land?W*.03:W*.06,land?H*.88:H*.86,land?30*u:48*u,'#000','#fff');
  if(info(X))chip(c,info(X),land?W*.03+240*u:W*.06,land?H*.88:H*.92,land?28*u:42*u,P.gold,'#000');
  vignette(c,W,H,.5)},
 /* 4: 8-bit retro (with character) */
 function(c,W,H,X,P){const land=W>H,lw=land?320:180,lh=land?180:320,o=document.createElement('canvas');o.width=lw;o.height=lh;const x=o.getContext('2d');
  const g=x.createLinearGradient(0,0,0,lh);g.addColorStop(0,'#0a0314');g.addColorStop(.6,P.mid);g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,lw,lh);
  for(let i=0;i<40;i++){x.fillStyle=i%4?'#5a4a85':P.gold;x.fillRect((i*47)%lw,(i*29)%(lh*.55),1,1)}
  const sy=lh*(land?.62:.56);x.fillStyle=P.a;x.globalAlpha=.9;x.beginPath();x.arc(land?lw*.72:lw*.5,sy-8,land?34:30,Math.PI,0);x.fill();x.globalAlpha=1;
  x.fillStyle='#07040c';x.fillRect(0,sy,lw,lh-sy);x.strokeStyle=P.a;x.globalAlpha=.7;x.lineWidth=1;for(let i=-10;i<=10;i++){x.beginPath();x.moveTo(lw/2+i*4,sy);x.lineTo(lw/2+i*(land?26:16),lh);x.stroke()}for(let k=1;k<7;k++){const yy=sy+(lh-sy)*Math.pow(k/7,1.8);x.beginPath();x.moveTo(0,yy);x.lineTo(lw,yy);x.stroke()}x.globalAlpha=1;
  x.imageSmoothingEnabled=true;const cw=land?150:170,ch=cw*SRC.h/SRC.w;if(hero&&hero.naturalWidth){const t=document.createElement('canvas');t.width=SRC.w;t.height=SRC.h;const tx=t.getContext('2d');tx.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);tx.globalCompositeOperation='destination-in';const rg=tx.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.3,SRC.w*.52,SRC.h*.55,SRC.h*.75);rg.addColorStop(0,'#000');rg.addColorStop(.75,'#000');rg.addColorStop(1,'rgba(0,0,0,0)');tx.fillStyle=rg;tx.fillRect(0,0,SRC.w,SRC.h);
   x.drawImage(t,land?lw-cw+14:(lw-cw)/2,land?lh-ch+8:lh-ch+4,cw,ch)}
  if(X.cover){const s=land?52:60,cx=land?10:(lw-s)/2,cy=land?10:8;x.fillStyle='#000';x.fillRect(cx-2,cy-2,s+4,s+4);x.drawImage(X.cover,cx,cy,s,s);x.strokeStyle='#fff';x.lineWidth=1;x.strokeRect(cx-1.5,cy-1.5,s+3,s+3)}
  const ws=X.w;x.textBaseline='top';x.textAlign=land?'left':'center';let ty=land?70:78;const tx0=land?10:lw/2;
  ws.forEach((w,i)=>{const px=Math.min(land?20:16,Math.floor((land?170:170)/(w.length*.95)));x.font=px+"px 'Press Start 2P'";x.fillStyle='#000';x.fillText(w,tx0+1.5,ty+1.5);x.fillStyle=i%2?P.gold:'#fff';x.fillText(w,tx0,ty);ty+=px+4});
  x.font="7px 'Press Start 2P'";x.fillStyle=P.a;x.fillRect(land?10:lw/2-34,ty+4,68,11);x.fillStyle='#fff';x.textAlign='center';x.fillText(X.kind==='packs'?'PACK':'BEAT',(land?10:lw/2-34)+34,ty+6);
  if(info(X)){x.textAlign=land?'left':'center';x.fillStyle=P.gold;x.font="6px 'Press Start 2P'";x.fillText(info(X),land?10:lw/2,ty+20)}
  c.imageSmoothingEnabled=false;c.drawImage(o,0,0,W,H);c.fillStyle='rgba(0,0,0,.2)';const st=Math.round(W/lw);for(let y=0;y<H;y+=st*2)c.fillRect(0,y,W,st*.5);vignette(c,W,H,.5)}
];
const NAMES=['CHARACTER','COVER POSTER','SPLIT','GIANT TYPE','8-BIT'];
const WITH=[true,false,true,false,true];
function make(i,W,H,X){
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 const seed=(X.seed||0)+i,P=palette(X.cover,seed);
 const xx={...X,w:X.w||words(X.title),hook:(HOOKS[X.kind]||HOOKS.beats)[(seed+i)%5]};
 ctx.imageSmoothingQuality='high';V[i%V.length](ctx,W,H,xx,P);return c;
}
window.MZThumbs={load,make,count:V.length,names:NAMES,withChar:WITH,words};
})();
