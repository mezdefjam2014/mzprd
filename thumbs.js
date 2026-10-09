/* MZPRD thumbnail maker. Draws 5 cinematic thumbnail designs (3 with the producer character, 2 without) for a beat or pack
   in 16:9 (1280x720, YouTube) and 9:16 (1080x1920, Shorts). Look: graded dark scenes, metallic type, soft bloom, fine grain,
   light rim on the character. Rules from YouTube thumbnail research: 1 to 3 huge heavy words, outline + shadow for contrast,
   colours pulled from the cover, nothing important in the bottom-right corner (duration stamp), JPEG under 2 MB. */
(function(){
const FONT_LINK='https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Oswald:wght@500;600;700&family=Press+Start+2P&family=Permanent+Marker&family=Bangers&display=swap';
let ready=null,hero=null,grain=null;
const SRC={x:520,y:0,w:620,h:468};
function load(){
 if(ready)return ready;
 ready=(async()=>{
  if(!document.querySelector('link[data-th]')){await new Promise(res=>{const l=document.createElement('link');l.rel='stylesheet';l.href=FONT_LINK;l.dataset.th='1';l.onload=res;l.onerror=res;document.head.appendChild(l);setTimeout(res,5000)})}
  await Promise.all(["40px Anton","40px 'Bebas Neue'","600 40px Oswald","12px 'Press Start 2P'","40px 'Permanent Marker'","40px Bangers"].map(f=>document.fonts.load(f).catch(()=>{})));
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
 const shift=[0,25,-25,150,-150][seed%5],extra=seed>4?((seed*47)%90)-45:0;hue=(hue+(hit?shift:shift*.5)+extra+720)%360;
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
function character(c,x,y,w,P,flip,filt){
 const h=w*SRC.h/SRC.w;if(!hero||!hero.naturalWidth)return h;
 const o=document.createElement('canvas');o.width=SRC.w;o.height=SRC.h;const x2=o.getContext('2d');
 x2.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);
 x2.globalCompositeOperation='destination-in';const g=x2.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.26,SRC.w*.52,SRC.h*.55,SRC.h*.76);g.addColorStop(0,'#000');g.addColorStop(.7,'#000');g.addColorStop(1,'rgba(0,0,0,0)');x2.fillStyle=g;x2.fillRect(0,0,SRC.w,SRC.h);
 const draw=()=>{if(flip){c.translate(x+w,y);c.scale(-1,1);c.drawImage(o,0,0,w,h)}else c.drawImage(o,x,y,w,h)};
 c.save();if(filt)c.filter=filt;c.shadowColor=P.aL;c.shadowBlur=w*.07;draw();c.restore();
 c.save();if(filt)c.filter=filt;c.globalCompositeOperation='overlay';c.globalAlpha=.55;draw();c.restore();
 return h;
}
const info=X=>X.infoText!=null?X.infoText:[X.bpm?X.bpm+' BPM':'',X.key||''].filter(Boolean).join('   •   ');
const tagWord=X=>X.tagText||tline(X);
function tline(X){if(X.kind==='packs')return 'SAMPLE PACK';const art=String(X.art||'').trim(),a=art?art:((X.mood||'')+' '+(X.genre||'')).trim();return (a?a.toUpperCase()+' ':'')+'TYPE BEAT'}
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

function chr(X,c,x,y,w,P,flip,filt){if(!X.char)return w*SRC.h/SRC.w;return character(c,x,y,w,P,flip,filt)}
function crownPath(c,cx,cy,sz){const p=[[-1,.45],[-.92,-.35],[-.4,.15],[0,-.7],[.4,.15],[.92,-.35],[1,.45]];c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(cx+x*sz,cy+y*sz):c.moveTo(cx+x*sz,cy+y*sz));c.closePath()}
/* ================= 20 more looks (T6 to T25): type-led, drawn live, no image files ================= */
const BEBAS="'Bebas Neue'",MARK="'Permanent Marker',Anton",BANG="Bangers,Anton",PS="'Press Start 2P'";
function ht(X){const art=String(X.art||'').trim(),a=art?art.toUpperCase():((X.mood||'')+' '+(X.genre||'')).trim().toUpperCase()||'HARD BEAT',b=X.kind==='packs'?'SAMPLE PACK':'TYPE BEAT';return{a,b,name:'"'+X.w.join(' ')+'"'}}
function lay(W,H){const land=W>H,u=Math.min(W,H)/720;return land?{land,u,tx:W*.05,ty:H*.14,tw:W*.55,th:H*.64,cw:H*1.34,cx:W-H*1.34*.89,cy:-H*.02}:{land,u,tx:W*.05,ty:H*.06,tw:W*.9,th:H*.38,cw:W*1.15,cx:-W*.075,cy:H-W*1.15*SRC.h/SRC.w*.98}}
function T(c,s,x,y,px,font,fill,o){o=o||{};c.save();c.font=px+'px '+font;c.textAlign=o.align||'center';c.textBaseline=o.base||'middle';c.lineJoin='round';
 if('letterSpacing' in c)c.letterSpacing=(o.ls||0)+'px';
 if(o.rot){c.translate(x,y);c.rotate(o.rot);x=0;y=0}
 if(o.ex){c.fillStyle=o.exc||'#000';for(let k=o.ex;k>0;k--)c.fillText(s,x+k*(o.exx==null?1:o.exx),y+k*(o.exy==null?1:o.exy))}
 if(o.sh){c.shadowColor=o.sh;c.shadowBlur=o.shb==null?px*.2:o.shb;c.shadowOffsetY=o.shy||0}
 if(o.sw){c.lineWidth=o.sw;c.strokeStyle=o.st||'#000';c.strokeText(s,x,y)}
 c.shadowColor=o.gl||'transparent';c.shadowBlur=o.gl?(o.gb==null?px*.45:o.gb):0;c.fillStyle=fill;c.fillText(s,x,y);c.restore()}
function G(c,x0,y0,x1,y1,st){const g=c.createLinearGradient(x0,y0,x1,y1);st.forEach(([p,col])=>g.addColorStop(p,col));return g}
function RG(c,x,y,r0,r1,st){const g=c.createRadialGradient(x,y,r0,x,y,r1);st.forEach(([p,col])=>g.addColorStop(p,col));return g}
const GOLD=(c,y,h)=>G(c,0,y,0,y+h,[[0,'#fff6c8'],[.35,'#ffd34a'],[.65,'#c98a10'],[.85,'#ffe28a'],[1,'#8a540a']]);
const CHROME=(c,y,h)=>G(c,0,y,0,y+h,[[0,'#ffffff'],[.3,'#9fb4d8'],[.5,'#2a3a66'],[.55,'#e8f0ff'],[.8,'#7f93c0'],[1,'#ffffff']]);
const fitW=(c,s,font,maxW,maxH)=>fitPx(c,s,font,maxW,maxH);
function sparkle(c,x,y,r,col,a){c.save();c.globalCompositeOperation='screen';c.globalAlpha=a==null?1:a;c.fillStyle=col||'#fff';c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r*.25,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r*.25,y);c.quadraticCurveTo(x,y,x,y-r);c.moveTo(x-r,y);c.quadraticCurveTo(x,y,x,y-r*.25);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r*.25);c.quadraticCurveTo(x,y,x-r,y);c.fill();c.restore()}
function tint(c,fn){return fn}
function charT(c,x,y,w,P,flip,filt){return character(c,x,y,w,P,flip,filt)}
function noise(c,W,H,a,mode){if(!grain){grain=document.createElement('canvas');grain.width=grain.height=192;const gx=grain.getContext('2d'),d=gx.createImageData(192,192);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}gx.putImageData(d,0,0)}c.save();c.globalCompositeOperation=mode||'overlay';c.globalAlpha=a;c.fillStyle=c.createPattern(grain,'repeat');c.fillRect(0,0,W,H);c.restore()}
function lcover(c,X,x,y,s,u,rot,border){if(!X.cover)return;c.save();c.translate(x+s/2,y+s/2);c.rotate(rot||0);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=22*u;c.drawImage(X.cover,-s/2,-s/2,s,s);c.shadowColor='transparent';c.lineWidth=(border||3)*u;c.strokeStyle='#ffd34a';c.strokeRect(-s/2,-s/2,s,s);c.restore()}
function nameLine(c,X,x,y,px,col,align){const n=ht(X).name;T(c,n,x,y,px,'Oswald',col||'#fff',{align:align||'center',sw:px*.18,ls:px*.12,sh:'rgba(0,0,0,.8)'})}
function metaLine(c,X,x,y,px,col,align){const i=info(X);if(i)T(c,i.replace(/\s+•\s+/g,'   '),x,y,px,'Oswald',col||'#ffd34a',{align:align||'center',ls:px*.2,sh:'rgba(0,0,0,.8)'})}

const NEW=[
 /* T6: neon tokyo billboard */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+6);
  c.fillStyle=G(c,0,0,0,H,[[0,'#0a0420'],[.55,'#1c0a42'],[1,'#05020d']]);c.fillRect(0,0,W,H);glow(c,W*.5,H*.45,Math.max(W,H)*.6,'#7a2cff',.35);
  const hz=H*(L.land?.72:.78);for(let k=0;k<16;k++){const bw=W*(.05+r()*.08),bx=k/16*W+r()*20*u,bh=H*(.22+r()*.34);c.fillStyle='#07030f';c.fillRect(bx,hz-bh,bw,bh+2);
   for(let wy=hz-bh+8*u;wy<hz-6*u;wy+=12*u)for(let wx=bx+5*u;wx<bx+bw-6*u;wx+=10*u)if(r()>.62){c.fillStyle=r()>.5?'rgba(255,60,170,.8)':'rgba(60,220,255,.8)';c.fillRect(wx,wy,4*u,6*u)}}
  const sw=L.land?W*.58:W*.88,sx=L.land?W*.05:W*.06,sy=L.land?H*.12:H*.1,sh=L.land?H*.5:H*.3;
  c.strokeStyle='#ff2d95';c.lineWidth=5*u;c.shadowColor='#ff2d95';c.shadowBlur=26*u;c.strokeRect(sx,sy,sw,sh);c.shadowBlur=0;c.fillStyle='rgba(12,4,28,.72)';c.fillRect(sx,sy,sw,sh);
  c.fillStyle='#2a1850';c.fillRect(sx+sw*.2,sy+sh,6*u,hz-sy-sh);c.fillRect(sx+sw*.8,sy+sh,6*u,hz-sy-sh);
  const a1=fitW(c,h.a,'Anton',sw*.86,sh*.5);T(c,h.a,sx+sw/2,sy+sh*.34,a1,'Anton','#fff',{gl:'#ff2d95',gb:a1*.5,sw:a1*.02,st:'#ff2d95'});
  const b1=fitW(c,h.b,'Anton',sw*.62,sh*.26);T(c,h.b,sx+sw/2,sy+sh*.76,b1,'Anton','#d9fcff',{gl:'#17e5ff',gb:b1*.6,ls:b1*.1});
  /* rain + wet street */
  c.fillStyle=G(c,0,hz,0,H,[[0,'#150a30'],[1,'#05020d']]);c.fillRect(0,hz,W,H-hz);c.save();c.globalAlpha=.35;c.scale(1,-1);c.translate(0,-hz*2);c.fillStyle='#ff2d95';c.fillRect(sx,sy,sw,sh*.3);c.restore();
  c.strokeStyle='rgba(190,220,255,.28)';c.lineWidth=1.5*u;for(let k=0;k<150;k++){const x=r()*W,y=r()*H,l=(12+r()*26)*u;c.beginPath();c.moveTo(x,y);c.lineTo(x-l*.25,y+l);c.stroke()}
  if(L.land)chr(X,c,W*.6,H*.14,H*1.22,P,false);else{const w=W*.9;chr(X,c,W*.1,H*.52,w,P,false)}
  nameLine(c,X,L.land?W*.34:W*.5,L.land?H*.84:H*.5,(L.land?24:34)*u,'#fff');metaLine(c,X,L.land?W*.34:W*.5,L.land?H*.91:H*.54,(L.land?18:26)*u);
  finish(c,W,H,P,{bloom:.42,grain:.1,vig:.5})},
 /* T7: wanted poster */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+7);
  c.fillStyle='#1a120a';c.fillRect(0,0,W,H);glow(c,W*.5,H*.5,Math.max(W,H)*.6,'#6b4520',.5);
  const pw=L.land?H*.82:W*.9,ph=L.land?H*.94:H*.92,px=(W-pw)/2,py=(H-ph)/2;
  c.save();c.translate(W/2,H/2);c.rotate(L.land?.025:-.012);c.translate(-W/2,-H/2);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=40*u;c.fillStyle=G(c,px,py,px+pw,py+ph,[[0,'#d9bf8a'],[.5,'#cfae72'],[1,'#b98f55']]);c.fillRect(px,py,pw,ph);c.shadowBlur=0;
  for(let k=0;k<26;k++){const x=px+r()*pw,y=py+r()*ph,rad=(20+r()*70)*u;c.fillStyle=RG(c,x,y,0,rad,[[0,'rgba(90,50,10,.16)'],[1,'rgba(90,50,10,0)']]);c.fillRect(x-rad,y-rad,rad*2,rad*2)}
  c.strokeStyle='#3a2410';c.lineWidth=5*u;c.strokeRect(px+14*u,py+14*u,pw-28*u,ph-28*u);c.lineWidth=1.5*u;c.strokeRect(px+24*u,py+24*u,pw-48*u,ph-48*u);
  const w1=fitW(c,'WANTED','Anton',pw*.8,ph*.15);T(c,'WANTED',px+pw/2,py+ph*.13,w1,'Anton','#2a1608',{ls:w1*.08});
  T(c,'FOR HARD BEATS',px+pw/2,py+ph*.215,ph*.026,'Oswald','#3a2410',{ls:ph*.008});
  const iw=pw*.7,ih=ph*.34,ix=px+(pw-iw)/2,iy=py+ph*.25;c.fillStyle='#8a6a3c';c.fillRect(ix,iy,iw,ih);c.save();c.beginPath();c.rect(ix,iy,iw,ih);c.clip();
  if(X.cover){c.filter='sepia(1) contrast(1.15)';coverFit(c,X.cover,ix,iy,iw,ih);c.filter='none'}c.restore();
  c.save();c.beginPath();c.rect(ix,iy,iw,ih);c.clip();const cw=iw*1.05;charT(c,ix+(iw-cw)/2,iy+ih-cw*SRC.h/SRC.w*.96,cw,P,false,'sepia(1) contrast(1.2) brightness(.95)');c.restore();c.lineWidth=4*u;c.strokeStyle='#2a1608';c.strokeRect(ix,iy,iw,ih);
  const a1=fitW(c,h.a,'Anton',pw*.82,ph*.14);T(c,h.a,px+pw/2,py+ph*.665,a1,'Anton','#2a1608',{});
  T(c,h.b+'  -  DEAD OR ALIVE',px+pw/2,py+ph*.74,ph*.032,'Oswald','#3a2410',{ls:ph*.006,sw:0});
  T(c,'REWARD: '+(X.hook==='FREE'?'FREE DOWNLOAD':X.hook+' BEAT'),px+pw/2,py+ph*.805,ph*.04,'Anton','#7a1010',{ls:ph*.004});
  nameLine(c,X,px+pw/2,py+ph*.87,ph*.03,'#2a1608');c.restore();
  finish(c,W,H,P,{bloom:.2,vig:.5,grain:.14})},
 /* T8: magazine cover */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  bg(c,W,H,X.cover,P,.55,seed);glow(c,L.land?W*.72:W*.5,H*.55,Math.max(W,H)*.5,P.a,.4);
  if(L.land)chr(X,c,W-H*1.3*.7,H*.03,H*1.3,P,false);else{const w=W*1.15;chr(X,c,(W-w)/2,H*.46,w,P,false)}
  const mh=fitW(c,'MZPRD','Anton',L.land?W*.46:W*.88,H*.17);T(c,'MZPRD',L.land?W*.05:W*.5,H*.09,mh,'Anton',G(c,0,H*.02,0,H*.17,[[0,'#fff'],[1,'#d8d8de']]),{align:L.land?'left':'center',base:'middle',sh:'rgba(0,0,0,.6)',shb:12*u,ls:mh*.02});
  T(c,'THE BEAT ISSUE   •   '+new Date().getFullYear(),L.land?W*.052:W*.5,H*.175,16*u*(L.land?1:1.5),'Oswald',P.aL,{align:L.land?'left':'center',ls:4*u});
  const a1=fitW(c,h.a,'Anton',L.land?W*.54:W*.9,L.land?H*.3:H*.17);T(c,h.a,L.land?W*.05:W*.5,L.land?H*.4:H*.28,a1,'Anton','#fff',{align:L.land?'left':'center',sw:a1*.05,st:'#000',sh:'#000',shb:a1*.15});
  const b1=fitW(c,h.b,'Anton',L.land?W*.4:W*.7,H*.09);T(c,h.b,L.land?W*.05:W*.5,L.land?H*.58:H*.385,b1,'Anton',P.aL,{align:L.land?'left':'center',sh:'#000',shb:8*u,ls:b1*.08});
  const ly=L.land?H*.72:H*.9;[nameLine,metaLine].forEach(f=>0);T(c,'+ '+ht(X).name,L.land?W*.052:W*.5,ly,18*u*(L.land?1:1.5),'Oswald','#fff',{align:L.land?'left':'center',ls:3*u,sh:'#000'});
  T(c,info(X)||'FREE FOR PROFIT?',L.land?W*.052:W*.5,ly+30*u*(L.land?1:1.4),16*u*(L.land?1:1.4),'Oswald','#ffd34a',{align:L.land?'left':'center',ls:3*u,sh:'#000'});
  c.fillStyle='#fff';const bx=L.land?W*.052:W*.06,by=L.land?H*.86:H*.04,bw=L.land?W*.12:W*.2,bh=L.land?H*.1:H*.05;c.fillRect(bx,by,bw,bh);c.fillStyle='#000';for(let k=0;k<26;k++)c.fillRect(bx+6*u+k*(bw-12*u)/26,by+5*u,(k%3?1.5:3)*u,bh-10*u);
  finish(c,W,H,P,{bloom:.25})},
 /* T9: cyber hud */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+9);
  c.fillStyle='#02090c';c.fillRect(0,0,W,H);glow(c,W*.5,H*.5,Math.max(W,H)*.6,'#0aa',.35);
  c.strokeStyle='rgba(30,230,210,.16)';c.lineWidth=1*u;for(let x=0;x<W;x+=40*u){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=40*u){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
  const cx=L.land?W*.68:W*.5,cy=L.land?H*.52:H*.64,R=(L.land?H:W)*.34;
  if(L.land)chr(X,c,cx-H*1.34*.5,H*.0,H*1.34,P,false);else{const w=W*1.05;chr(X,c,(W-w)/2,H*.4,w,P,false)}
  c.save();c.strokeStyle='#19ffe0';c.shadowColor='#19ffe0';c.shadowBlur=12*u;c.lineWidth=3*u;c.beginPath();c.arc(cx,cy,R,0,6.283);c.stroke();c.lineWidth=1.5*u;c.beginPath();c.arc(cx,cy,R*1.12,.2,2.4);c.stroke();c.beginPath();c.arc(cx,cy,R*1.12,3.4,5.6);c.stroke();
  for(let k=0;k<36;k++){const an=k/36*6.283,l=k%3?8*u:16*u;c.beginPath();c.moveTo(cx+Math.cos(an)*R,cy+Math.sin(an)*R);c.lineTo(cx+Math.cos(an)*(R-l),cy+Math.sin(an)*(R-l));c.stroke()}
  c.lineWidth=3*u;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const bx=cx+sx*R*1.25,by=cy+sy*R*1.05,l=40*u;c.beginPath();c.moveTo(bx,by+sy*-l);c.lineTo(bx,by);c.lineTo(bx+sx*-l,by);c.stroke()});c.restore();
  const a1=fitW(c,h.a,'Oswald',L.land?W*.5:W*.88,H*.14);T(c,h.a,L.land?W*.05:W*.5,L.land?H*.14:H*.09,a1,'Oswald','#e8fffb',{align:L.land?'left':'center',gl:'#19ffe0',gb:a1*.4,ls:a1*.04,sw:0});
  T(c,'// '+h.b,L.land?W*.052:W*.5,L.land?H*.27:H*.19,26*u*(L.land?1:1.4),'Oswald','#19ffe0',{align:L.land?'left':'center',ls:8*u});
  const info1=[['BPM',X.bpm||'--'],['KEY',X.key||'--'],['ID',(X.w.join(' ')).slice(0,14)]];info1.forEach(([k,v],i)=>{const y=L.land?H*(.56+i*.11):H*(.9+(i?0:0)),x=L.land?W*.052:W*(.06+i*.31);
   T(c,k,x,y,14*u*(L.land?1:1.4),'Oswald','#19ffe0',{align:'left',ls:5*u});T(c,String(v),x,y+(L.land?H*.05:H*.04),(L.land?30:40)*u,'Oswald','#fff',{align:'left',gl:'#19ffe0',gb:10*u})});
  c.save();c.globalAlpha=.16;c.fillStyle='#000';for(let y=0;y<H;y+=4*u)c.fillRect(0,y,W,1.5*u);c.restore();
  finish(c,W,H,P,{bloom:.38,grain:.08,vig:.6})},
 /* T10: movie poster */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  c.fillStyle=G(c,0,0,0,H,[[0,'#06232b'],[.55,'#0c1015'],[1,'#3a1405']]);c.fillRect(0,0,W,H);glow(c,L.land?W*.7:W*.5,H*.62,Math.max(W,H)*.5,'#ff7a1a',.45);glow(c,L.land?W*.3:W*.5,H*.1,Math.max(W,H)*.5,'#14b6c9',.3);streak(c,W,H,P,.15);
  if(L.land)chr(X,c,W-H*1.34*.9,H*-.02,H*1.34,P,false);else{const w=W*1.15;chr(X,c,(W-w)/2,H*.36,w,P,false)}
  const tl=['ONE BEAT. NO MERCY.','THEY NEVER SAW IT COMING.','THIS SUMMER, THE DROP DECIDES.','EVERY BEAT HAS A PRICE.','ALL THE BARS. NONE OF THE LIMITS.'][seed%5];
  T(c,tl,L.land?W*.05:W*.5,L.land?H*.1:H*.05,15*u*(L.land?1:1.6),'Oswald','rgba(255,255,255,.8)',{align:L.land?'left':'center',ls:6*u});
  const a1=fitW(c,h.a,'Anton',L.land?W*.54:W*.92,L.land?H*.34:H*.2),ay10=L.land?H*.4:H*.2;T(c,h.a,L.land?W*.05:W*.5,ay10,a1,'Anton',CHROME(c,ay10-a1/2,a1),{align:L.land?'left':'center',sw:a1*.03,st:'#000',sh:'#000',shb:a1*.14});
  T(c,h.b.split('').join(' '),L.land?W*.055:W*.5,L.land?H*.62:H*.32,(L.land?30:44)*u,'Oswald','#fff',{align:L.land?'left':'center',ls:10*u,sh:'#000'});
  const by=H*(L.land?.9:.93);c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,by-H*.04,W,H*.1);
  const cred=('A MZPRD PRODUCTION   •   '+(X.w.join(' '))+'   •   '+(info(X)||'ORIGINAL SCORE')).toUpperCase();T(c,cred,W*.5,by,(L.land?15:22)*u,'Oswald','rgba(255,255,255,.75)',{ls:4*u});
  c.strokeStyle='#fff';c.lineWidth=2*u;const rx=W*(L.land?.9:.82),ry=H*(L.land?.84:.88);c.strokeRect(rx,ry,34*u,26*u);T(c,'R',rx+17*u,ry+14*u,20*u,'Anton','#fff');
  finish(c,W,H,P,{bloom:.3,vig:.6,grain:.12})},
 /* T11: gold crown royal */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  c.fillStyle=RG(c,W*.5,H*.4,0,Math.max(W,H)*.8,[[0,'#3a1070'],[.6,'#12042a'],[1,'#04010a']]);c.fillRect(0,0,W,H);glow(c,W*.5,H*.3,Math.max(W,H)*.45,'#ffd34a',.3);
  if(L.land){chr(X,c,W*.5-H*.58,H*.2,H*1.16,P,false)}else{const w=W*1.1;chr(X,c,(W-w)/2,H*.27,w,P,false)}
  const cs=(L.land?H*.17:W*.24),cx=W*.5,cy=L.land?H*.17:H*.15;
  c.save();c.shadowColor='#ffd34a';c.shadowBlur=40*u;c.fillStyle=GOLD(c,cy-cs,cs*2);crownPath(c,cx,cy,cs);c.fill();c.restore();c.lineWidth=3*u;c.strokeStyle='#7a4a05';crownPath(c,cx,cy,cs);c.stroke();
  [[-1,.45],[-.4,.15],[0,-.7],[.4,.15],[1,.45]].forEach(([x,y],i)=>{const jx=cx+x*cs*.92,jy=cy+y*cs-(i%2?0:cs*.18);c.fillStyle=['#e0242f','#17c3ff','#ffd34a'][i%3];c.beginPath();c.arc(jx,jy,cs*.07,0,6.283);c.fill();sparkle(c,jx,jy,cs*.2,'#fff',.8)});
    const a1=fitW(c,h.a,'Anton',L.land?W*.82:W*.9,L.land?H*.2:H*.12),ay=L.land?H*.78:H*.8;T(c,h.a,W/2,ay,a1,'Anton',GOLD(c,ay-a1/2,a1),{sw:a1*.06,st:'#2a1004',sh:'#000',shb:a1*.2,ex:Math.round(a1*.02)+1,exc:'#4a2a05'});
  const b1=fitW(c,h.b,'Anton',W*.6,H*.08);T(c,h.b,W/2,ay+a1*.62,b1,'Anton','#fff',{ls:b1*.2,sh:'#000',shb:8*u});
  for(let k=0;k<22;k++)sparkle(c,((k*97)%100)/100*W,((k*53)%100)/100*H,(6+(k%5)*5)*u,'#ffe28a',.55);
  finish(c,W,H,P,{bloom:.4,vig:.6})},
 /* T12: space nebula */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+12);
  c.fillStyle='#03030c';c.fillRect(0,0,W,H);[[.2,.3,'#6a2cff'],[.75,.25,'#ff3d9a'],[.55,.7,'#1ac8ff'],[.3,.8,'#7a3cff']].forEach(([x,y,col])=>{glow(c,W*x,H*y,Math.max(W,H)*.5,col,.38)});
  for(let k=0;k<180;k++){const s=(r()>.9?2.2:1.1)*u;c.fillStyle=`rgba(255,255,255,${.3+r()*.7})`;c.fillRect(r()*W,r()*H,s,s)}
  const px=L.land?W*.82:W*.78,py=L.land?H*.26:H*.22,pr=(L.land?H:W)*.17;c.save();c.shadowColor='#8a6aff';c.shadowBlur=30*u;c.fillStyle=RG(c,px-pr*.3,py-pr*.3,pr*.1,pr*1.1,[[0,'#ffd9ff'],[.5,'#7a4ad8'],[1,'#120a3a']]);c.beginPath();c.arc(px,py,pr,0,6.283);c.fill();c.restore();
  c.save();c.translate(px,py);c.rotate(-.35);c.strokeStyle='rgba(255,220,255,.7)';c.lineWidth=5*u;c.beginPath();c.ellipse(0,0,pr*1.8,pr*.4,0,0,6.283);c.stroke();c.restore();
  c.save();c.globalCompositeOperation='screen';c.strokeStyle='rgba(255,255,255,.7)';for(let k=0;k<3;k++){const sx=r()*W*.5+W*.1,sy=r()*H*.4,l=(80+r()*120)*u;const g=G(c,sx,sy,sx+l,sy+l*.4,[[0,'rgba(255,255,255,0)'],[1,'#fff']]);c.strokeStyle=g;c.lineWidth=2*u;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+l,sy+l*.4);c.stroke()}c.restore();
  if(L.land)chr(X,c,W*.5,-H*.04,H*1.25,P,false);else{const w=W*1.0;chr(X,c,(W-w)/2,H*.5,w,P,false)}
  const a1=fitW(c,h.a,'Anton',L.land?W*.5:W*.9,L.land?H*.3:H*.16);T(c,h.a,L.land?W*.05:W*.5,L.land?H*.3:H*.17,a1,'Anton',G(c,0,0,0,H,[[0,'#fff'],[1,'#b8c4ff']]),{align:L.land?'left':'center',sw:a1*.045,st:'#0a0624',gl:'#8a6aff',gb:a1*.35});
  const b1=fitW(c,h.b,'Oswald',L.land?W*.4:W*.7,H*.07);T(c,h.b,L.land?W*.053:W*.5,L.land?H*.5:H*.28,b1,'Oswald','#bfe8ff',{align:L.land?'left':'center',ls:b1*.3,gl:'#1ac8ff',gb:12*u});
  nameLine(c,X,L.land?W*.3:W*.5,L.land?H*.88:H*.93,(L.land?22:34)*u);
  finish(c,W,H,P,{bloom:.45,vig:.5})},
 /* T13: split versus */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  c.save();c.beginPath();if(L.land){c.moveTo(0,0);c.lineTo(W*.53,0);c.lineTo(W*.47,H);c.lineTo(0,H)}else{c.moveTo(0,0);c.lineTo(W,0);c.lineTo(W,H*.52);c.lineTo(0,H*.48)}c.closePath();c.clip();c.fillStyle=G(c,0,0,W,H,[[0,'#3a0508'],[1,'#0d0102']]);c.fillRect(0,0,W,H);glow(c,L.land?W*.25:W*.5,L.land?H*.5:H*.25,Math.max(W,H)*.5,'#ff1a2a',.45);c.restore();
  c.save();c.beginPath();if(L.land){c.moveTo(W*.53,0);c.lineTo(W,0);c.lineTo(W,H);c.lineTo(W*.47,H)}else{c.moveTo(0,H*.48);c.lineTo(W,H*.52);c.lineTo(W,H);c.lineTo(0,H)}c.closePath();c.clip();c.fillStyle=G(c,0,0,W,H,[[0,'#06324a'],[1,'#02111a']]);c.fillRect(0,0,W,H);glow(c,L.land?W*.78:W*.5,L.land?H*.5:H*.78,Math.max(W,H)*.5,'#17c8ff',.5);c.restore();
  c.save();c.globalCompositeOperation='screen';c.strokeStyle='#fff';c.shadowColor='#bfeaff';c.shadowBlur=22*u;c.lineWidth=5*u;c.beginPath();const n=14;for(let k=0;k<=n;k++){const t=k/n,jx=((k*37)%11-5)*5*u;if(L.land)c.lineTo(W*(.53-.06*t)+jx,H*t);else c.lineTo(W*t,H*(.48+.04*t)+jx)}c.stroke();c.restore();
  if(L.land){chr(X,c,W*.64,H*.06,H*1.02,P,true);const a1=fitW(c,h.a,'Anton',W*.4,H*.3);T(c,h.a,W*.05,H*.3,a1,'Anton','#fff',{align:'left',sw:a1*.05,sh:'#ff1a2a',shb:a1*.3});T(c,'VS',W*.5,H*.5,H*.22,'Anton','#ffd34a',{gl:'#ffd34a',gb:30*u,sw:H*.012});T(c,'YOU',W*.95,H*.8,H*.2,'Anton','#d9fcff',{align:'right',gl:'#17c8ff',gb:24*u,sw:H*.01});T(c,h.b,W*.052,H*.55,H*.09,'Anton','#fff',{align:'left',ls:H*.012,sh:'#000'})}
  else{const w=W*.95;chr(X,c,(W-w)/2,H*.5,w,P,true);const a1=fitW(c,h.a,'Anton',W*.9,H*.13);T(c,h.a,W*.5,H*.1,a1,'Anton','#fff',{sw:a1*.05,sh:'#ff1a2a',shb:a1*.3});T(c,'VS',W*.5,H*.5,H*.1,'Anton','#ffd34a',{gl:'#ffd34a',gb:30*u,sw:6*u});T(c,'YOU',W*.5,H*.9,H*.08,'Anton','#d9fcff',{gl:'#17c8ff',gb:24*u});T(c,h.b,W*.5,H*.2,H*.045,'Anton','#fff',{ls:8*u,sh:'#000'})}
  nameLine(c,X,W*.5,H*.955,(L.land?20:30)*u);
  finish(c,W,H,P,{bloom:.4})},
 /* T14: pixel arcade title screen */
 function(c,W,H,X,P,seed){const L=lay(W,H),h=ht(X),lw=L.land?320:180,lh=L.land?180:320,o=document.createElement('canvas');o.width=lw;o.height=lh;const x=o.getContext('2d');
  x.fillStyle=G(x,0,0,0,lh,[[0,'#07021a'],[.6,'#2a0a52'],[1,'#07021a']]);x.fillRect(0,0,lw,lh);for(let i=0;i<46;i++){x.fillStyle=i%5?'#6a58a0':'#ffd34a';x.fillRect((i*53)%lw,(i*31)%lh,1,1)}
  const sy=lh*(L.land?.66:.68);x.fillStyle='#0b0420';x.fillRect(0,sy,lw,lh-sy);x.strokeStyle='#ff3da6';x.globalAlpha=.8;for(let i=-12;i<=12;i++){x.beginPath();x.moveTo(lw/2+i*5,sy);x.lineTo(lw/2+i*(L.land?30:18),lh);x.stroke()}for(let k=1;k<7;k++){const yy=sy+(lh-sy)*Math.pow(k/7,1.7);x.beginPath();x.moveTo(0,yy);x.lineTo(lw,yy);x.stroke()}x.globalAlpha=1;
  const a=h.a.slice(0,L.land?14:10),px=Math.min(L.land?24:17,Math.floor((lw-20)/(a.length*1.05)));x.font=px+"px 'Press Start 2P'";x.textAlign='center';x.textBaseline='top';const ty=L.land?24:46;
  for(let k=5;k>0;k--){x.fillStyle=k>3?'#7a1f9a':'#ff3da6';x.fillText(a,lw/2+k,ty+k)}x.fillStyle='#fff6c8';x.fillText(a,lw/2,ty);
  const b=h.b,px2=L.land?12:10;x.font=px2+"px 'Press Start 2P'";for(let k=3;k>0;k--){x.fillStyle='#0a6a8a';x.fillText(b,lw/2+k,ty+px+8+k)}x.fillStyle='#7af0ff';x.fillText(b,lw/2,ty+px+8);
  if(hero&&hero.naturalWidth){const cw=L.land?110:150,ch=cw*SRC.h/SRC.w,t=document.createElement('canvas');t.width=SRC.w;t.height=SRC.h;const tx=t.getContext('2d');tx.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);tx.globalCompositeOperation='destination-in';const rg=tx.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.3,SRC.w*.52,SRC.h*.55,SRC.h*.75);rg.addColorStop(0,'#000');rg.addColorStop(.75,'#000');rg.addColorStop(1,'rgba(0,0,0,0)');tx.fillStyle=rg;tx.fillRect(0,0,SRC.w,SRC.h);x.drawImage(t,(lw-cw)/2,L.land?lh-ch-14:lh-ch-30,cw,ch)}
  x.font="7px 'Press Start 2P'";x.fillStyle=Math.floor(seed)%2?'#ffd34a':'#fff';x.fillText('PRESS START',lw/2,lh-(L.land?12:22));x.textAlign='left';x.fillStyle='#ff3da6';x.fillText('HI-SCORE '+String(X.bpm||92).padStart(3,'0'),6,6);x.textAlign='right';x.fillText('x3',lw-6,6);
  c.imageSmoothingEnabled=false;c.drawImage(o,0,0,W,H);c.fillStyle='rgba(0,0,0,.2)';const st=Math.max(1,Math.round(W/lw));for(let y=0;y<H;y+=st*2)c.fillRect(0,y,W,st*.5);
  finish(c,W,H,P,{bloom:.42,grain:.06})},
 /* T15: gold chain luxury */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+15);
  c.fillStyle='#040405';c.fillRect(0,0,W,H);glow(c,W*.5,H*.5,Math.max(W,H)*.6,'#3a3a46',.55);
  c.save();c.globalAlpha=.3;c.strokeStyle='#9aa0b0';for(let k=0;k<26;k++){c.lineWidth=(.5+r()*1.4)*u;c.beginPath();let x=r()*W,y=r()*H;c.moveTo(x,y);for(let s=0;s<5;s++){x+=(r()-.5)*W*.3;y+=(r()-.3)*H*.2;c.lineTo(x,y)}c.stroke()}c.restore();
  const chain=(y,rev)=>{const n=Math.ceil(W/(30*u))+2;for(let k=0;k<n;k++){const x=k*30*u-10*u,wob=Math.sin(k*.6+(rev?2:0))*5*u;c.save();c.translate(x,y+wob);c.rotate(k%2?0:Math.PI/2);c.strokeStyle=GOLD(c,-16*u,32*u);c.lineWidth=7*u;c.shadowColor='#ffd34a';c.shadowBlur=10*u;c.beginPath();c.ellipse(0,0,19*u,11*u,0,0,6.283);c.stroke();c.restore()}};chain(H*.05,false);chain(H*.95,true);
  const a1=fitW(c,h.a,'Anton',W*.88,L.land?H*.4:H*.2),ay=H*(L.land?.38:.3);T(c,h.a,W/2,ay,a1,'Anton',GOLD(c,ay-a1/2,a1),{sw:a1*.05,st:'#2a1604',sh:'#000',shb:a1*.2,ex:Math.max(2,Math.round(a1*.025)),exc:'#5a3508'});
  const b1=fitW(c,h.b,'Anton',W*.5,H*.12);T(c,h.b,W/2,ay+a1*.68,b1,'Anton',G(c,0,0,0,H,[[0,'#fff'],[1,'#aeb4c4']]),{ls:b1*.18,sw:b1*.04,st:'#000',sh:'#000',shb:10*u});
  const cs=L.land?H*.22:W*.3;if(X.cover)lcover(c,X,L.land?W*.06:W*.5-cs/2,L.land?H*.66:H*.58,cs,u,-.05,3);
  if(L.land)chr(X,c,W*.64,H*.52,H*.85,P,false);else{const w=W*.8;chr(X,c,W*.2,H*.72,w,P,false)}
  nameLine(c,X,W*(L.land?.5:.5),H*(L.land?.9:.9),(L.land?24:36)*u,'#ffe28a');for(let k=0;k<26;k++)sparkle(c,r()*W,r()*H,(5+r()*14)*u,'#fff2b0',.6);
  finish(c,W,H,P,{bloom:.38,vig:.6})},
 /* T16: blood moon horror */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+16);
  c.fillStyle=G(c,0,0,0,H,[[0,'#150003'],[1,'#030001']]);c.fillRect(0,0,W,H);const mx=W*(L.land?.7:.5),my=H*(L.land?.4:.26),mr=(L.land?H:W)*.36;
  c.save();c.shadowColor='#ff1a1a';c.shadowBlur=90*u;c.fillStyle=RG(c,mx-mr*.2,my-mr*.2,mr*.1,mr,[[0,'#ff6a4a'],[.6,'#b0100c'],[1,'#4a0206']]);c.beginPath();c.arc(mx,my,mr,0,6.283);c.fill();c.restore();
  c.save();c.globalAlpha=.25;c.fillStyle='#2a0204';for(let k=0;k<12;k++){const a=r()*6.283,d=r()*mr*.75;c.beginPath();c.arc(mx+Math.cos(a)*d,my+Math.sin(a)*d,(6+r()*20)*u,0,6.283);c.fill()}c.restore();
  for(let k=0;k<5;k++){const bx=r()*W,by=H*(.08+r()*.3),s=(18+r()*26)*u;c.fillStyle='#050001';c.beginPath();c.moveTo(bx,by);c.quadraticCurveTo(bx-s,by-s*.7,bx-s*1.6,by+s*.2);c.quadraticCurveTo(bx-s*.8,by,bx,by+s*.5);c.quadraticCurveTo(bx+s*.8,by,bx+s*1.6,by+s*.2);c.quadraticCurveTo(bx+s,by-s*.7,bx,by);c.fill()}
  for(let k=0;k<7;k++){const fy=H*(.6+r()*.35);glow(c,r()*W,fy,(120+r()*180)*u,'#8a1010',.35)}
  if(L.land)chr(X,c,W*.12,H*.1,H*1.0,P,false);else{const w=W*.9;chr(X,c,W*.05,H*.5,w,P,false)}
  const a1=fitW(c,h.a,'Anton',W*.9,L.land?H*.3:H*.16),ay=H*(L.land?.62:.4);T(c,h.a,W/2,ay,a1,'Anton',G(c,0,ay-a1/2,0,ay+a1/2,[[0,'#ff5a4a'],[1,'#7a0006']]),{sw:a1*.045,st:'#000',sh:'#e0141c',shb:a1*.3});
  const bw=c.measureText(h.a).width;c.fillStyle='#b0080e';for(let k=0;k<9;k++){const dx=W/2-a1*h.a.length*.22+k*(a1*h.a.length*.44/8),dl=(10+r()*50)*u;c.beginPath();c.roundRect?c.roundRect(dx,ay+a1*.36,5*u,dl,3*u):c.rect(dx,ay+a1*.36,5*u,dl);c.fill()}
  const b1=fitW(c,h.b,'Anton',W*.6,H*.08);T(c,h.b,W/2,ay+a1*.78,b1,'Anton','#fff',{ls:b1*.25,sh:'#000',shb:10*u});if(!L.land)lcover(c,X,W*.22,H*.64,W*.56,u,.03,3);nameLine(c,X,W/2,H*.94,(L.land?22:34)*u,'#ff8a80');
  finish(c,W,H,P,{bloom:.4,vig:.75,grain:.14})},
 /* T17: chrome y2k */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+17);
  c.fillStyle=G(c,0,0,W,H,[[0,'#c8d4f8'],[.5,'#f4d6ee'],[1,'#a8c4f0']]);c.fillRect(0,0,W,H);glow(c,W*.5,H*.5,Math.max(W,H)*.6,'#ffffff',.7);
  for(let k=0;k<9;k++){const bx=r()*W,by=r()*H,br=(20+r()*70)*u;c.fillStyle=RG(c,bx-br*.3,by-br*.3,br*.05,br,[[0,'rgba(255,255,255,.95)'],[.4,'rgba(170,200,255,.5)'],[1,'rgba(120,150,230,.25)']]);c.beginPath();c.arc(bx,by,br,0,6.283);c.fill()}
  const a1=fitW(c,h.a,'Anton',W*.92,L.land?H*.42:H*.2),ay=H*(L.land?.4:.3);c.save();c.shadowColor='rgba(40,60,160,.55)';c.shadowBlur=a1*.2;c.shadowOffsetY=a1*.08;T(c,h.a,W/2,ay,a1,'Anton',CHROME(c,ay-a1*.5,a1),{sw:a1*.05,st:'#1a2860'});c.restore();
  T(c,h.a,W/2,ay,a1,'Anton','rgba(255,255,255,0)',{sw:a1*.012,st:'rgba(255,255,255,.8)'});
  const b1=fitW(c,h.b,'Anton',W*.6,H*.12);c.save();c.shadowColor='rgba(40,60,160,.5)';c.shadowBlur=b1*.2;T(c,h.b,W/2,ay+a1*.72,b1,'Anton',CHROME(c,ay+a1*.72-b1/2,b1),{sw:b1*.05,st:'#1a2860',ls:b1*.12});c.restore();
  if(L.land)chr(X,c,W*.64,H*.4,H*.75,P,false,'saturate(1.2) brightness(1.05)');else{const w=W*.75;chr(X,c,W*.12,H*.66,w,P,false,'')}
  if(!L.land)lcover(c,X,W*.22,H*.58,W*.56,u,-.03,3);nameLine(c,X,W/2,H*(L.land?.92:.94),(L.land?24:36)*u,'#1a2860');for(let k=0;k<14;k++)sparkle(c,r()*W,r()*H,(8+r()*26)*u,'#fff',.9);sparkle(c,W*.18,H*.18,70*u,'#fff',.95);
  finish(c,W,H,P,{bloom:.45,vig:.25,grain:.06})},
 /* T18: vhs glitch */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+18);
  c.fillStyle='#050509';c.fillRect(0,0,W,H);if(X.cover){c.globalAlpha=.35;c.filter='saturate(1.4) contrast(1.2)';coverFit(c,X.cover,0,0,W,H);c.filter='none';c.globalAlpha=1}glow(c,W*.5,H*.5,Math.max(W,H)*.5,P.a,.3);
  if(L.land)chr(X,c,W*.62,H*.04,H*1.2,P,false);else{const w=W*1.05;chr(X,c,(W-w)/2,H*.5,w,P,false)}
  const a1=fitW(c,h.a,'Anton',W*.88,L.land?H*.3:H*.16),ay=H*(L.land?.4:.3),ax=L.land?W*.05+0:W*.5,al=L.land?'left':'center';
  c.save();c.globalCompositeOperation='screen';T(c,h.a,ax-a1*.04,ay,a1,'Anton','#ff2a3a',{align:al});T(c,h.a,ax+a1*.04,ay,a1,'Anton','#19e6ff',{align:al});T(c,h.a,ax,ay,a1,'Anton','#ffffff',{align:al});c.restore();
  const b1=fitW(c,h.b,'Anton',W*.6,H*.1);c.save();c.globalCompositeOperation='screen';T(c,h.b,ax-3*u,ay+a1*.7,b1,'Anton','#ff2a3a',{align:al,ls:b1*.1});T(c,h.b,ax+3*u,ay+a1*.7,b1,'Anton','#19e6ff',{align:al,ls:b1*.1});T(c,h.b,ax,ay+a1*.7,b1,'Anton','#fff',{align:al,ls:b1*.1});c.restore();
  for(let k=0;k<9;k++){const y=r()*H,hh=(4+r()*26)*u,dx=(r()-.5)*80*u;const tmp=document.createElement('canvas');tmp.width=W;tmp.height=Math.max(2,Math.ceil(hh));tmp.getContext('2d').drawImage(c.canvas,0,y,W,hh,0,0,W,hh);c.drawImage(tmp,dx,y)}
  c.fillStyle='rgba(255,255,255,.12)';const ty=H*(.78+r()*.1);c.fillRect(0,ty,W,6*u);T(c,'PLAY ▶',W*.05,H*.06,(L.land?26:40)*u,'Oswald','#fff',{align:'left',sh:'#000',ls:3*u});T(c,'SP  00:'+String(X.bpm||92).padStart(2,'0')+':'+String(10+Math.floor(seed*7)%49),W*.95,H*.94,(L.land?24:38)*u,'Oswald','#fff',{align:'right',sh:'#000',ls:3*u});
  nameLine(c,X,L.land?W*.28:W*.5,H*(L.land?.9:.95),(L.land?24:34)*u);
  c.save();c.globalAlpha=.2;c.fillStyle='#000';for(let y=0;y<H;y+=4*u)c.fillRect(0,y,W,1.6*u);c.restore();finish(c,W,H,P,{bloom:.3,grain:.2,vig:.5})},
 /* T19: comic pop art */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  c.fillStyle='#ffd21a';c.fillRect(0,0,W,H);c.save();c.fillStyle='rgba(255,40,140,.55)';const step=16*u;for(let y=0;y<H;y+=step)for(let x=((y/step)%2)*step/2;x<W;x+=step){const d=Math.max(0,1-Math.hypot(x-W*(L.land?.75:.5),y-H*.6)/(Math.max(W,H)*.75))*step*.46;if(d>.6){c.beginPath();c.arc(x,y,d,0,6.283);c.fill()}}c.restore();
  c.save();c.translate(L.land?W*.74:W*.5,H*(L.land?.5:.6));c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=7*u;c.beginPath();for(let k=0;k<24;k++){const an=k/24*6.283,rad=(k%2?.58:.78)*(L.land?H:W*.9)*.5;c.lineTo(Math.cos(an)*rad,Math.sin(an)*rad)}c.closePath();c.fill();c.stroke();c.restore();
  if(L.land)chr(X,c,W*.56,H*.04,H*1.1,P,false);else{const w=W*1.0;chr(X,c,(W-w)/2,H*.5,w,P,false)}
  const a1=fitW(c,h.a,'Bangers,Anton',L.land?W*.56:W*.9,L.land?H*.34:H*.18),ay=H*(L.land?.28:.2);T(c,h.a,L.land?W*.05:W*.5,ay,a1,BANG,'#ff2a8a',{align:L.land?'left':'center',sw:a1*.1,st:'#000',ex:Math.round(a1*.05),exc:'#000',exx:1,exy:1,rot:-.04});
  const bx=L.land?W*.06:W*.1,by=H*(L.land?.52:.34),bw=L.land?W*.42:W*.8,bh=L.land?H*.26:H*.13;c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=6*u;c.beginPath();c.rect(bx,by,bw,bh);c.fill();c.stroke();c.beginPath();c.moveTo(bx+bw*.2,by+bh);c.lineTo(bx+bw*.12,by+bh+bh*.35);c.lineTo(bx+bw*.34,by+bh);c.closePath();c.fill();c.stroke();
  const b1=fitW(c,h.b+'!','Bangers,Anton',bw*.9,bh*.8);T(c,h.b+'!',bx+bw/2,by+bh/2,b1,BANG,'#000',{});
  c.save();c.translate(L.land?W*.9:W*.86,H*(L.land?.14:.07));c.rotate(.2);c.fillStyle='#e0242f';c.strokeStyle='#000';c.lineWidth=5*u;c.beginPath();for(let k=0;k<16;k++){const an=k/16*6.283,rad=(k%2?.6:1)*58*u;c.lineTo(Math.cos(an)*rad,Math.sin(an)*rad)}c.closePath();c.fill();c.stroke();T(c,X.hook,0,0,26*u,BANG,'#fff',{sw:4*u,st:'#000'});c.restore();
  nameLine(c,X,W*(L.land?.28:.5),H*(L.land?.9:.94),(L.land?26:38)*u,'#000');finish(c,W,H,P,{bloom:.1,vig:.25,grain:.05})},
 /* T20: ice cold frost */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+20);
  c.fillStyle=G(c,0,0,0,H,[[0,'#06304a'],[.5,'#0a6a96'],[1,'#02111e']]);c.fillRect(0,0,W,H);glow(c,W*.5,H*.4,Math.max(W,H)*.6,'#9af0ff',.5);
  for(let k=0;k<30;k++){const ix=k/30*W+r()*10*u,il=(30+r()*110)*u;c.fillStyle=G(c,0,0,0,il,[[0,'rgba(230,252,255,.95)'],[1,'rgba(120,220,255,.1)']]);c.beginPath();c.moveTo(ix,0);c.lineTo(ix+(8+r()*8)*u,0);c.lineTo(ix+5*u,il);c.closePath();c.fill()}
  c.save();c.globalAlpha=.18;c.fillStyle='#fff';for(let k=0;k<180;k++)c.fillRect(r()*W,r()*H,(1+r()*3)*u,(1+r()*3)*u);c.restore();
  if(L.land)chr(X,c,W*.6,H*.06,H*1.18,P,false,'hue-rotate(150deg) saturate(.8) brightness(1.1)');else{const w=W*1.05;chr(X,c,(W-w)/2,H*.5,w,P,false,'hue-rotate(150deg) saturate(.8) brightness(1.1)')}
  const a1=fitW(c,h.a,'Anton',L.land?W*.56:W*.9,L.land?H*.3:H*.17),ay=H*(L.land?.38:.26);T(c,h.a,L.land?W*.05:W*.5,ay,a1,'Anton',G(c,0,ay-a1/2,0,ay+a1/2,[[0,'#ffffff'],[.6,'#bdf1ff'],[1,'#5ac8ee']]),{align:L.land?'left':'center',sw:a1*.045,st:'#04304a',gl:'#9af0ff',gb:a1*.4});
  const b1=fitW(c,h.b,'Oswald',L.land?W*.4:W*.7,H*.08);T(c,h.b,L.land?W*.053:W*.5,ay+a1*.7,b1,'Oswald','#e8fbff',{align:L.land?'left':'center',ls:b1*.3,gl:'#6ad8ff',gb:12*u});
  for(let k=0;k<26;k++){const sx=r()*W,sy=r()*H;c.fillStyle=`rgba(255,255,255,${.4+r()*.5})`;c.beginPath();c.arc(sx,sy,(1+r()*3)*u,0,6.283);c.fill()}
  nameLine(c,X,L.land?W*.3:W*.5,H*(L.land?.9:.94),(L.land?24:36)*u,'#e8fbff');finish(c,W,H,P,{bloom:.42,vig:.5})},
 /* T21: lava and fire */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+21);
  c.fillStyle=G(c,0,0,0,H,[[0,'#0a0200'],[1,'#240500']]);c.fillRect(0,0,W,H);
  c.save();c.globalCompositeOperation='screen';c.strokeStyle='#ff6a00';c.shadowColor='#ff3a00';c.shadowBlur=14*u;for(let k=0;k<14;k++){c.lineWidth=(1.5+r()*3)*u;c.beginPath();let x=r()*W,y=H*(.5+r()*.5);c.moveTo(x,y);for(let s=0;s<6;s++){x+=(r()-.5)*W*.2;y+=(r()-.55)*H*.12;c.lineTo(x,y)}c.stroke()}c.restore();
  for(let k=0;k<26;k++){const fx=k/25*W,fh=H*(.18+r()*.34),fw=W*.05;c.save();c.globalCompositeOperation='screen';const g=G(c,0,H,0,H-fh,[[0,'rgba(255,200,40,.95)'],[.5,'rgba(255,90,10,.6)'],[1,'rgba(200,20,0,0)']]);c.fillStyle=g;c.beginPath();c.moveTo(fx-fw,H);c.quadraticCurveTo(fx-fw*.3,H-fh*.5,fx+(r()-.5)*fw,H-fh);c.quadraticCurveTo(fx+fw*.3,H-fh*.5,fx+fw,H);c.fill();c.restore()}
  if(L.land)chr(X,c,W*.6,H*.04,H*1.2,P,false,'sepia(.6) saturate(1.8) hue-rotate(-20deg)');else{const w=W*1.05;chr(X,c,(W-w)/2,H*.46,w,P,false,'sepia(.6) saturate(1.8) hue-rotate(-20deg)')}
  const a1=fitW(c,h.a,'Anton',L.land?W*.56:W*.9,L.land?H*.32:H*.17),ay=H*(L.land?.36:.24);T(c,h.a,L.land?W*.05:W*.5,ay,a1,'Anton',G(c,0,ay-a1/2,0,ay+a1/2,[[0,'#fff6a8'],[.4,'#ffb81a'],[.8,'#ff4a00'],[1,'#a01000']]),{align:L.land?'left':'center',sw:a1*.05,st:'#1a0400',gl:'#ff5a00',gb:a1*.5});
  const b1=fitW(c,h.b,'Anton',L.land?W*.4:W*.7,H*.09);T(c,h.b,L.land?W*.053:W*.5,ay+a1*.72,b1,'Anton','#fff',{align:L.land?'left':'center',ls:b1*.2,gl:'#ff5a00',gb:14*u});
  for(let k=0;k<70;k++){const ex=r()*W,ey=r()*H;c.fillStyle=`rgba(255,${120+r()*120|0},40,${.4+r()*.6})`;c.fillRect(ex,ey,(1+r()*3)*u,(1+r()*3)*u)}
  nameLine(c,X,L.land?W*.3:W*.5,H*(L.land?.9:.94),(L.land?24:36)*u,'#ffb066');finish(c,W,H,P,{bloom:.5,vig:.6,grain:.12})},
 /* T22: vinyl sleeve */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  c.fillStyle=G(c,0,0,W,H,[[0,'#e8dcc4'],[1,'#c9b894']]);c.fillRect(0,0,W,H);noise(c,W,H,.2,'multiply');
  const vr=(L.land?H:W)*.62,vx=L.land?W*.68:W*.62,vy=L.land?H*.5:H*.7;c.save();c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=30*u;c.fillStyle='#07070a';c.beginPath();c.arc(vx,vy,vr,0,6.283);c.fill();c.restore();
  c.strokeStyle='rgba(255,255,255,.07)';c.lineWidth=1*u;for(let k=.36;k<.98;k+=.025){c.beginPath();c.arc(vx,vy,vr*k,0,6.283);c.stroke()}c.save();c.globalCompositeOperation='screen';const sg=c.createConicGradient?c.createConicGradient(.6,vx,vy):null;if(sg){sg.addColorStop(0,'rgba(255,255,255,.18)');sg.addColorStop(.12,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.14)');sg.addColorStop(.62,'rgba(255,255,255,0)');sg.addColorStop(1,'rgba(255,255,255,.18)');c.fillStyle=sg;c.beginPath();c.arc(vx,vy,vr*.98,0,6.283);c.fill()}c.restore();
  c.fillStyle=P.a;c.beginPath();c.arc(vx,vy,vr*.3,0,6.283);c.fill();c.fillStyle='#050509';c.beginPath();c.arc(vx,vy,vr*.025,0,6.283);c.fill();T(c,'MZPRD',vx,vy-vr*.1,vr*.075,'Anton','#fff',{ls:vr*.01});T(c,(X.w.join(' ')).slice(0,16),vx,vy+vr*.1,vr*.05,'Oswald','#fff',{ls:vr*.01});
  const sw=L.land?W*.48:W*.84,sh=L.land?H*.8:H*.5,sx=L.land?W*.05:W*.08,sy=L.land?H*.1:H*.05;c.save();c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=26*u;c.fillStyle='#14110e';c.fillRect(sx,sy,sw,sh);c.restore();
  if(X.cover){const cs=Math.min(sw*.86,sh*.58);c.drawImage(X.cover,sx+(sw-cs)/2,sy+sw*.07,cs,cs)}else{c.fillStyle=P.a;c.fillRect(sx+sw*.07,sy+sw*.07,sw*.86,sh*.5)}
  const a1=fitW(c,h.a,'Anton',sw*.86,sh*.14),ay=sy+sh*.74;T(c,h.a,sx+sw/2,ay,a1,'Anton','#f4ead4',{});T(c,h.b,sx+sw/2,ay+a1*.75,sh*.05,'Oswald',P.aL,{ls:sh*.012});T(c,(info(X)||'33 1/3 RPM').toUpperCase(),sx+sw/2,sy+sh*.95,sh*.032,'Oswald','rgba(244,234,212,.7)',{ls:sh*.008});
  finish(c,W,H,P,{bloom:.15,vig:.4,grain:.1})},
 /* T23: sticker bomb streetwear */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+23);
  c.fillStyle='#16161c';c.fillRect(0,0,W,H);const COL=['#ff2d6e','#ffd21a','#17c8ff','#7bff3a','#b04dff','#ff7a1a'],WORDS=['HARD','FREE','NEW','BEATS','MZPRD','FIRE','LOOPS','808','DARK','FLEX'];
  const stick=(x,y,s,rot,col,txt)=>{c.save();c.translate(x,y);c.rotate(rot);const kind=Math.floor(r()*3);c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=8*u;c.shadowOffsetY=4*u;c.fillStyle='#fff';c.beginPath();if(kind===0)c.arc(0,0,s*.55+5*u,0,6.283);else if(kind===1){c.rect(-s*.7-5*u,-s*.4-5*u,s*1.4+10*u,s*.8+10*u)}else{for(let k=0;k<10;k++){const an=k/10*6.283,rad=(k%2?.5:.66)*s+5*u;c.lineTo(Math.cos(an)*rad,Math.sin(an)*rad)}c.closePath()}c.fill();c.shadowColor='transparent';c.fillStyle=col;c.beginPath();if(kind===0)c.arc(0,0,s*.55,0,6.283);else if(kind===1)c.rect(-s*.7,-s*.4,s*1.4,s*.8);else{for(let k=0;k<10;k++){const an=k/10*6.283,rad=(k%2?.5:.66)*s;c.lineTo(Math.cos(an)*rad,Math.sin(an)*rad)}c.closePath()}c.fill();T(c,txt,0,0,s*.3,BANG,'#fff',{sw:s*.06,st:'#000'});c.restore()};
  for(let k=0;k<(L.land?44:50);k++)stick(r()*W,r()*H,(50+r()*70)*u,(r()-.5)*.9,COL[k%6],WORDS[k%10]);
  c.fillStyle='rgba(8,8,12,.4)';c.fillRect(0,0,W,H);
  if(L.land)chr(X,c,W*.6,H*.06,H*1.16,P,false);else{const w=W*1.0;chr(X,c,(W-w)/2,H*.52,w,P,false)}
  const a1=fitW(c,h.a,'Anton',L.land?W*.54:W*.88,L.land?H*.3:H*.16),ax=L.land?W*.32:W*.5,ay=H*(L.land?.4:.26);c.save();c.translate(ax,ay);c.rotate(-.05);c.fillStyle='#fff';c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=20*u;c.fillRect(-a1*h.a.length*.27-16*u,-a1*.62,a1*h.a.length*.54+32*u,a1*1.24+(L.land?H*.13:H*.07));c.restore();
  T(c,h.a,ax,ay,a1,'Anton','#101018',{rot:-.05});T(c,h.b,ax+(L.land?0:0),ay+a1*.82,a1*.42,'Anton','#ff2d6e',{rot:-.05,ls:a1*.04});nameLine(c,X,L.land?W*.3:W*.5,H*(L.land?.9:.95),(L.land?24:36)*u,'#fff');
  finish(c,W,H,P,{bloom:.1,vig:.4,grain:.1})},
 /* T24: graffiti wall */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X),r=rnd(seed+24);
  c.fillStyle='#2a1a16';c.fillRect(0,0,W,H);const bw=64*u,bh=26*u;for(let y=0,row=0;y<H;y+=bh,row++)for(let x=-(row%2?bw/2:0);x<W;x+=bw){const t=r();c.fillStyle=`hsl(${10+t*14},${28+t*14}%,${20+t*12}%)`;c.fillRect(x+1.5*u,y+1.5*u,bw-3*u,bh-3*u)}
  noise(c,W,H,.22,'overlay');glow(c,L.land?W*.3:W*.5,H*.4,Math.max(W,H)*.6,'#ffffff',.18);
  if(L.land)chr(X,c,W*.6,H*.08,H*1.14,P,false);else{const w=W*1.0;chr(X,c,(W-w)/2,H*.52,w,P,false)}
  const a1=fitW(c,h.a,'Permanent Marker, Anton',L.land?W*.5:W*.8,L.land?H*.3:H*.18),ay=H*(L.land?.4:.27),ax=L.land?W*.05:W*.5,al=L.land?'left':'center';
  c.save();c.translate(L.land?0:0,0);T(c,h.a,ax+a1*.05,ay+a1*.06,a1,MARK,'#000',{align:al,rot:0});T(c,h.a,ax,ay,a1,MARK,G(c,0,ay-a1/2,0,ay+a1/2,[[0,'#7bff3a'],[1,'#17c8ff']]),{align:al,sw:a1*.05,st:'#fff',gl:'#7bff3a',gb:a1*.3});c.restore();
  const aw=Math.min(W*(L.land?.56:.92),a1*h.a.length*.55);c.fillStyle='#17c8ff';for(let k=0;k<8;k++){const dx=(L.land?ax:W/2-aw/2)+k*(aw/7),dl=(14+r()*70)*u;c.beginPath();c.roundRect?c.roundRect(dx,ay+a1*.36,5*u,dl,3*u):c.rect(dx,ay+a1*.36,5*u,dl);c.fill();c.beginPath();c.arc(dx+2.5*u,ay+a1*.36+dl,4*u,0,6.283);c.fill()}
  const b1=fitW(c,h.b,'Permanent Marker, Anton',L.land?W*.4:W*.7,H*.08);T(c,h.b,L.land?W*.06:W*.5,ay+a1*.9,b1,MARK,'#ffd21a',{align:L.land?'left':'center',sw:b1*.06,st:'#000',rot:-.03});
  nameLine(c,X,L.land?W*.3:W*.5,H*(L.land?.9:.95),(L.land?24:36)*u,'#fff');finish(c,W,H,P,{bloom:.2,vig:.5,grain:.1})},
 /* T25: brutalist minimal */
 function(c,W,H,X,P,seed){const L=lay(W,H),u=L.u,h=ht(X);
  const hue=P.a;c.fillStyle=hue;c.fillRect(0,0,W,H);c.fillStyle='#07070a';const bar=H*.05;c.fillRect(0,0,W,bar);c.fillRect(0,H-bar,W,bar);
  T(c,'MZPRD   '+(X.bpm?X.bpm+' BPM   ':'')+(X.key||'')+'   '+(X.kind==='packs'?'SAMPLE PACK':'FREE DL'),W*.03,bar/2+1,bar*.5,'Oswald','#fff',{align:'left',ls:bar*.12});
  const a1=fitW(c,h.a,'Anton',W*.94,L.land?H*.56:H*.34),ay=H*(L.land?.4:.3);T(c,h.a,W/2,ay,a1,'Anton','#07070a',{});
  const b1=fitW(c,h.b,'Anton',W*.7,H*.13),bx=W/2,by=ay+a1*.66;const bwid=c.measureText?null:0;c.save();c.font=b1+'px Anton';if('letterSpacing' in c)c.letterSpacing=(b1*.08)+'px';const tw=c.measureText(h.b).width+b1*.8;c.restore();c.fillStyle='#fff';c.fillRect(bx-tw/2,by-b1*.62,tw,b1*1.24);T(c,h.b,bx,by,b1,'Anton','#07070a',{ls:b1*.08});
  if(!L.land)lcover(c,X,W*.2,H*.5,W*.6,u,0,5);T(c,ht(X).name,W/2,H*(L.land?.86:.9),(L.land?36:52)*u,'Anton','#07070a',{ls:4*u});c.fillStyle='#07070a';c.fillRect(W*.03,H*(L.land?.915:.945)-3*u,W*.94,5*u);
  if(L.land)chr(X,c,W*.74,H*.58,H*.62,P,false,'grayscale(1) contrast(1.4)');else{const w=W*.55;chr(X,c,W*.43,H*.6,w,P,false,'grayscale(1) contrast(1.4)')}
  noise(c,W,H,.06,'multiply')}
];
V.push(...NEW);
const NAMES=['CHARACTER','COVER POSTER','SPLIT','GIANT TYPE','8-BIT','NEON TOKYO','WANTED POSTER','MAGAZINE COVER','CYBER HUD','MOVIE POSTER','GOLD CROWN','SPACE NEBULA','VERSUS','ARCADE TITLE','GOLD CHAIN','BLOOD MOON','CHROME Y2K','VHS GLITCH','POP ART','ICE COLD','LAVA FIRE','VINYL SLEEVE','STICKER BOMB','GRAFFITI WALL','BRUTALIST'];
const WITH=[true,false,true,false,true, true,true,true,true,true,true,true,true,true, false,false,false,true,true,true,true,false,false,true,false];
function order(seed){const a=V.map((_,i)=>i),r=rnd((seed|0)+11);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}return a}
function make(i,W,H,X){
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 const seed=(X.seed||0)+i,P=palette(X.cover,seed);
 const xx={...X,w:X.w||words(X.title),hook:(HOOKS[X.kind]||HOOKS.beats)[(seed+i)%5],char:WITH[i%V.length]};
 ctx.imageSmoothingQuality='high';V[i%V.length](ctx,W,H,xx,P,seed);return c;
}
window.MZThumbs={load,make,count:V.length,names:NAMES,withChar:WITH,words,order,typeLine:tline};
})();
