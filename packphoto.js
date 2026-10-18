/* MZPRD SAMPLE PACK thumbnails from real photos: product box, CD case, vinyl, two cassettes, SD card, pad sampler and DAW shots.
   The selected pack's cover (and its name) is perspective-warped onto the real label / screen / sleeve of each photo, then the
   pack name is set huge with SAMPLE PACK after it. make() returns a canvas at once; canvas.ready resolves when it is painted. */
(function(){
'use strict';
const RED='#e0242f',F="Anton, Impact, 'Arial Narrow Bold', sans-serif",B="Inter, 'Helvetica Neue', Arial, sans-serif";
const A={},files=['box','cd','vinyl','tape1','tape2','sd','mpc','daw','clips','arrow'];let boot=null;
function load(){return boot=boot||Promise.all(files.map(n=>new Promise(r=>{const i=new Image();i.onload=()=>{A[n]=i;r()};i.onerror=()=>r();i.src=new URL('mpc/pk/'+n+'.webp?v=2',document.baseURI).href})))}
const cvs=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;if(fn)fn(c.getContext('2d'),w,h);return c};
function sq(img){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,m=Math.min(iw,ih);return[(iw-m)/2,(ih-m)/2,m]}
/* ---------- perspective warp: homography from the unit square onto a quad, drawn as many small affine triangles ---------- */
function homo(q){const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;let g=0,h=0;
 if(Math.abs(dx3)>1e-6||Math.abs(dy3)>1e-6){const den=dx1*dy2-dx2*dy1;g=(dx3*dy2-dx2*dy3)/den;h=(dx1*dy3-dx3*dy1)/den}
 const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;return(u,v)=>{const w=g*u+h*v+1;return[(a*u+b*v+x0)/w,(d*u+e*v+y0)/w]}}
function tri(c,img,s,d){const [[sx0,sy0],[sx1,sy1],[sx2,sy2]]=s,[[dx0,dy0],[dx1,dy1],[dx2,dy2]]=d;const den=sx0*(sy2-sy1)-sx1*sy2+sx2*sy1+(sx1-sx2)*sy0;if(!den)return;
 const m11=-(sy0*(dx2-dx1)-sy1*dx2+sy2*dx1+(sy1-sy2)*dx0)/den,m12=(sy1*dy2+sy0*(dy1-dy2)-sy2*dy1+(sy2-sy1)*dy0)/den,m21=(sx0*(dx2-dx1)-sx1*dx2+sx2*dx1+(sx1-sx2)*dx0)/den,m22=-(sx1*dy2+sx0*(dy1-dy2)-sx2*dy1+(sx2-sx1)*dy0)/den,
  tx=(sx0*(sy2*dx1-sy1*dx2)+sy0*(sx1*dx2-sx2*dx1)+(sx2*sy1-sx1*sy2)*dx0)/den,ty=(sx0*(sy2*dy1-sy1*dy2)+sy0*(sx1*dy2-sx2*dy1)+(sx2*sy1-sx1*sy2)*dy0)/den;
 const cx=(dx0+dx1+dx2)/3,cy=(dy0+dy1+dy2)/3,gr=p=>{const vx=p[0]-cx,vy=p[1]-cy,l=Math.hypot(vx,vy)||1;return[p[0]+vx/l*.7,p[1]+vy/l*.7]};
 c.save();c.beginPath();const p0=gr(d[0]),p1=gr(d[1]),p2=gr(d[2]);c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.closePath();c.clip();c.transform(m11,m12,m21,m22,tx,ty);c.drawImage(img,0,0);c.restore()}
function warp(c,src,q,N){N=N||14;const W=src.width,H=src.height,P=homo(q);for(let j=0;j<N;j++)for(let i=0;i<N;i++){const u0=i/N,u1=(i+1)/N,v0=j/N,v1=(j+1)/N,a=P(u0,v0),b=P(u1,v0),cc=P(u1,v1),d=P(u0,v1),A0=[u0*W,v0*H],B0=[u1*W,v0*H],C0=[u1*W,v1*H],D0=[u0*W,v1*H];tri(c,src,[A0,B0,cc&&C0],[a,b,cc]);tri(c,src,[A0,C0,D0],[a,cc,d])}}
/* place an asset: returns a mapper from asset pixels to canvas pixels */
function put(c,img,x,y,s,o){o=o||{};c.save();if(o.shadow){c.shadowColor=o.shadow;c.shadowBlur=o.blur||40;c.shadowOffsetY=o.dy||16}c.drawImage(img,x,y,img.width*s,img.height*s);c.restore();return p=>[x+p[0]*s,y+p[1]*s]}
const Q=(m,q)=>q.map(m);
/* ---------- label art ---------- */
function fitFont(x,t,font,maxW,px,min){x.font=px+'px '+font;while(x.measureText(t).width>maxW&&px>min){px-=2;x.font=px+'px '+font}return px}
function coverSq(X,s){return cvs(s,s,(x,w)=>{if(X.cover){const [ox,oy,m]=sq(X.cover);x.drawImage(X.cover,ox,oy,m,m,0,0,w,w)}else{x.fillStyle='#111';x.fillRect(0,0,w,w)}})}
function tone(X){try{const c=cvs(8,8,x=>{if(X.cover)x.drawImage(X.cover,0,0,8,8)}),d=c.getContext('2d').getImageData(0,0,8,8).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2]}return[r/64|0,g/64|0,b/64|0]}catch(e){return[30,20,20]}}
function boxFront(X){return cvs(620,1220,(x,w,h)=>{const [r,g,b]=X.tone,gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgb('+(r*.35|0)+','+(g*.35|0)+','+(b*.35|0)+')');gr.addColorStop(1,'#050506');x.fillStyle=gr;x.fillRect(0,0,w,h);
 x.drawImage(coverSq(X,620),0,60);x.fillStyle='rgba(0,0,0,.0)';const t=X.name;x.fillStyle='#fff';x.textAlign='center';x.textBaseline='alphabetic';const fs=fitFont(x,t,F,560,120,40);x.fillText(t,w/2,780+fs*.8);
 x.fillStyle=RED;x.font='800 40px '+B;x.fillText(CURLABEL,w/2,780+fs*.8+70);x.fillStyle='rgba(255,255,255,.75)';x.font='64px '+F;x.fillText('MZPRD',w/2,h-90)})}
function spine(X){return cvs(140,1300,(x,w,h)=>{x.fillStyle='#09090b';x.fillRect(0,0,w,h);const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(0,0,0,.4)');x.fillStyle=g;x.fillRect(0,0,w,h);
 x.save();x.translate(w/2,h*.46);x.rotate(-Math.PI/2);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';fitFont(x,X.name,F,h*.7,96,30);x.fillText(X.name,0,0);x.restore();x.fillStyle=RED;x.font='800 26px '+B;x.textAlign='center';x.fillText('SAMPLE',w/2,h-150);x.fillText('PACK',w/2,h-118)})}
function sdLabel(X){return cvs(680,980,(x,w,h)=>{x.fillStyle='#1d1e22';x.fillRect(0,0,w,h);x.drawImage(coverSq(X,600),40,40);x.fillStyle='#fff';x.textBaseline='top';const fs=fitFont(x,X.name,F,600,120,40);x.fillText(X.name,40,665);
 x.fillStyle='#d9d9dc';x.fillRect(40,680+fs,600,72);x.fillStyle='#111';x.font='800 44px '+B;x.textBaseline='middle';x.fillText(CURLABEL,62,716+fs)})}
function tapeLabel(X){return cvs(1600,1030,(x,w,h)=>{x.fillStyle='#ece7dd';x.fillRect(0,0,w,h);x.fillStyle='#141414';x.fillRect(0,0,w,640);x.drawImage(coverSq(X,560),40,40);
 x.fillStyle='#ece7dd';x.textBaseline='alphabetic';const fs=fitFont(x,X.name,F,900,260,70);x.fillText(X.name,640,90+fs*.85);x.font='800 64px '+B;x.fillText(CURLABEL,644,600);
 x.fillStyle='#141414';x.font='150px '+F;x.fillText('MZPRD',60,900);x.font='800 56px '+B;x.fillText('VOL.',1040,960);x.lineWidth=5;x.strokeStyle='#141414';x.font='230px '+F;x.strokeText('001',1180,985);for(let i=0;i<500;i++){x.fillStyle='rgba(0,0,0,'+(Math.random()*.12)+')';x.fillRect(Math.random()*w,Math.random()*h,2,2)}})}
function stripLabel(X){return cvs(1130,160,(x,w,h)=>{x.fillStyle='#f4f2ec';x.fillRect(0,0,w,h);x.fillStyle='#111';x.textBaseline='middle';const fs=fitFont(x,X.name,F,720,110,40);x.fillText(X.name,24,h/2+4);x.fillStyle=RED;x.font='800 40px '+B;x.fillText(CURLABEL,w-330,h/2+4)})}
/* ---------- backgrounds + type ---------- */
function bgDaw(x,W,H,k,a){x.fillStyle='#07080a';x.fillRect(0,0,W,H);if(A.daw){x.save();x.filter='blur('+(5*k)+'px) saturate(1.1)';x.globalAlpha=a==null?.5:a;x.drawImage(A.daw,-40*k,-30*k,W+80*k,H+60*k);x.restore()}vig(x,W,H,.75)}
function bgCover(x,W,H,k,X,a){x.fillStyle='#07070a';x.fillRect(0,0,W,H);if(X.cover){const s=cvs(W/8|0,H/8|0,(c,w,h)=>{c.filter='blur(4px) saturate(1.3)';const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy,m,m,-10,-w*.3,w+20,w+20)});x.globalAlpha=a||.55;x.drawImage(s,0,0,W,H);x.globalAlpha=1}vig(x,W,H,.75)}
function vig(x,W,H,v){const g=x.createRadialGradient(W*.6,H*.5,H*.2,W*.5,H*.5,W*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+v+')');x.fillStyle=g;x.fillRect(0,0,W,H)}
function glow(x,cx,cy,r,a){const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(224,36,47,'+a+')');g.addColorStop(1,'rgba(224,36,47,0)');x.save();x.globalCompositeOperation='screen';x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);x.restore()}
function title(x,W,H,k,name,o){o=o||{};const maxW=o.w||640*k,X0=o.x||48*k;let fs=o.size||200*k;x.font=fs+'px '+F;let lines=[name];
 if(x.measureText(name).width>maxW&&name.includes(' ')){const w=name.split(' '),h=Math.ceil(w.length/2);lines=[w.slice(0,h).join(' '),w.slice(h).join(' ')]}
 const tall=()=>lines.length*fs*.94+Math.max(46*k,fs*.33)*1.25;while((Math.max(...lines.map(l=>x.measureText(l).width))>maxW||tall()>(o.maxH||H*.62))&&fs>56*k){fs-=4*k;x.font=fs+'px '+F}
 const ss=Math.max(46*k,fs*.33),tot=lines.length*fs*.94+ss*1.25;let y=o.bottom!=null?H-o.bottom-tot+fs*.86:o.y!=null?o.y:(H-tot)/2+fs*.86;{const end=y+(lines.length-1)*fs*.94+fs*.94+ss*.55,lim=H-26*k;if(end>lim)y-=end-lim;if(y-fs*.86<18*k)y=18*k+fs*.86}
 x.save();x.lineJoin='round';x.textBaseline='alphabetic';
 lines.forEach(l=>{x.lineWidth=fs*.07;x.strokeStyle='#000';x.strokeText(l,X0,y);x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=26*k;x.shadowOffsetY=8*k;x.fillStyle='#fff';x.fillText(l,X0,y);x.shadowBlur=0;x.shadowOffsetY=0;y+=fs*.94});
 x.font=ss+'px '+F;const tw=x.measureText(CURLABEL).width;x.fillStyle=RED;x.fillRect(X0-4*k,y-ss*.6,tw+28*k,ss*1.1);x.fillStyle='#fff';x.fillText(CURLABEL,X0+10*k,y+ss*.38);x.restore()}
function arrow(x,cx,cy,s,rot){if(!A.arrow)return;x.save();x.translate(cx,cy);x.rotate(rot);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=16;x.drawImage(A.arrow,-s/2,-s/2,s,s);x.restore()}
/* ---------- templates (1280x720 space, k = scale) ---------- */
const T=[
 {n:'PRODUCT BOX',f(x,W,H,k,X){bgDaw(x,W,H,k,.55);const cx=330*k,cy=300*k,R=235*k;x.save();x.beginPath();x.arc(cx,cy,R,0,6.283);x.clip();if(A.daw)x.drawImage(A.daw,0,60,520,560,cx-R,cy-R,R*2.05,R*2.2);x.restore();x.lineWidth=16*k;x.strokeStyle=RED;x.beginPath();x.arc(cx,cy,R,0,6.283);x.stroke();
  glow(x,1000*k,360*k,430*k,.85);const s=.95*k,m=put(x,A.box,720*k,8*k,s,{shadow:'rgba(224,36,47,.9)',blur:60*k,dy:0});warp(x,boxFront(X),Q(m,[[243,22],[553,72],[553,640],[243,693]]));warp(x,spine(X),Q(m,[[183,40],[243,22],[243,693],[183,650]]),8);
  x.save();x.globalCompositeOperation='screen';const gl=x.createLinearGradient(m([243,22])[0],m([243,22])[1],m([553,640])[0],m([553,640])[1]);gl.addColorStop(0,'rgba(255,255,255,.22)');gl.addColorStop(.35,'rgba(255,255,255,0)');x.fillStyle=gl;x.beginPath();[[243,22],[553,72],[553,640],[243,693]].map(m).forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));x.fill();x.restore();
  x.fillStyle='#07080a';const yb=m([0,700])[1];x.fillRect(0,yb,W,H-yb);arrow(x,650*k,330*k,230*k,-2.0);title(x,W,H,k,X.name,{bottom:70*k,w:640*k,size:130*k,maxH:H*.36})}},
 {n:'CD CASE',f(x,W,H,k,X){bgCover(x,W,H,k,X,.5);glow(x,920*k,360*k,420*k,.5);const s=.62*k,m=put(x,A.cd,610*k,50*k,s,{shadow:'rgba(0,0,0,.8)',blur:50*k});
  const c=m([493,503]),r=357*s,h=142*s;x.save();x.beginPath();x.arc(c[0],c[1],r,0,6.283);x.arc(c[0],c[1],h,0,6.283,true);x.clip();x.drawImage(coverSq(X,900),c[0]-r,c[1]-r,r*2,r*2);x.restore();
  x.save();x.globalCompositeOperation='screen';x.globalAlpha=.45;x.drawImage(A.cd,610*k,50*k,A.cd.width*s,A.cd.height*s);x.restore();title(x,W,H,k,X.name,{w:540*k})}},
 {n:'VINYL',f(x,W,H,k,X){const g=x.createRadialGradient(W*.6,H*.55,0,W*.6,H*.55,W*.7);g.addColorStop(0,'#3b2a20');g.addColorStop(1,'#0b0806');x.fillStyle=g;x.fillRect(0,0,W,H);
  const S=440*k,sx=560*k,sy=200*k,vs=S*1.02/350;x.save();x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=30*k;x.drawImage(A.vinyl,sx+S*.42,sy+S/2-175*vs,350*vs,350*vs);x.restore();
  const lc=[sx+S*.42+176*vs,sy+S/2-175*vs+176*vs],lr=57*vs;x.save();x.beginPath();x.arc(lc[0],lc[1],lr,0,6.283);x.clip();x.drawImage(coverSq(X,400),lc[0]-lr,lc[1]-lr,lr*2,lr*2);x.restore();x.fillStyle='#ddd';x.beginPath();x.arc(lc[0],lc[1],4*k,0,6.283);x.fill();
  x.save();x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=40*k;x.shadowOffsetX=12*k;x.fillStyle='#000';x.fillRect(sx,sy,S,S);x.restore();x.drawImage(coverSq(X,900),sx,sy,S,S);const wg=x.createLinearGradient(sx,0,sx+S,0);wg.addColorStop(0,'rgba(0,0,0,.25)');wg.addColorStop(.05,'rgba(255,255,255,.1)');wg.addColorStop(.12,'rgba(0,0,0,0)');x.fillStyle=wg;x.fillRect(sx,sy,S,S);
  x.save();const t=X.name+' '+CURLABEL;let fs=fitFont(x,t,F,W-100*k,124*k,50*k);x.textAlign='center';x.textBaseline='top';x.lineWidth=fs*.06;x.strokeStyle='#000';x.strokeText(t,W/2,36*k);x.fillStyle='#f1e9dc';x.fillText(t,W/2,36*k);const tw=x.measureText(t).width,w0=x.measureText(X.name+' ').width;x.textAlign='left';x.fillStyle=RED;x.fillText(CURLABEL,W/2-tw/2+w0,36*k);x.restore();
  x.save();x.fillStyle=RED;x.beginPath();x.arc(sx+40*k,sy+S-40*k,74*k,0,6.283);x.fill();x.fillStyle='#fff';x.textAlign='center';x.font=44*k+'px '+F;x.fillText('NEW',sx+40*k,sy+S-44*k);x.font='800 '+(16*k)+'px '+B;x.fillText(CURLABEL,sx+40*k,sy+S-14*k);x.restore()}},
 {n:'CASSETTE',f(x,W,H,k,X){bgDaw(x,W,H,k,.4);glow(x,880*k,380*k,460*k,.6);const s=.39*k,m=put(x,A.tape1,540*k,120*k,s,{shadow:'rgba(0,0,0,.8)',blur:50*k});x.save();const p=m([214,91]),q=m([1814,1120]);x.drawImage(tapeLabel(X),p[0],p[1],q[0]-p[0],q[1]-p[1]);x.restore();
  arrow(x,470*k,560*k,190*k,.25);title(x,W,H,k,X.name,{w:470*k})}},
 {n:'SD CARD',f(x,W,H,k,X){x.fillStyle='#0a0a0c';x.fillRect(0,0,W,H);for(let i=0;i<60;i++){x.strokeStyle='rgba(255,255,255,'+(.02+Math.random()*.03)+')';x.beginPath();x.moveTo(0,i*13*k);x.lineTo(W,i*13*k+40*k);x.stroke()}glow(x,900*k,380*k,480*k,.6);
  const s=.92*k,m=put(x,A.sd,560*k,-10*k,s,{shadow:'rgba(0,0,0,.85)',blur:50*k});warp(x,sdLabel(X),Q(m,[[215,135],[552,135],[645,598],[295,632]]));arrow(x,560*k,540*k,190*k,.25);title(x,W,H,k,X.name,{w:520*k})}},
 {n:'CASSETTE II',f(x,W,H,k,X){bgCover(x,W,H,k,X,.5);glow(x,850*k,380*k,450*k,.45);const s=.88*k,m=put(x,A.tape2,560*k,130*k,s,{shadow:'rgba(0,0,0,.8)',blur:40*k});const p=m([110,110]),q=m([675,190]);x.drawImage(stripLabel(X),p[0],p[1],q[0]-p[0],q[1]-p[1]);
  const cs=150*k,cp=m([110,215]);x.save();x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=10*k;x.translate(cp[0]+cs*.3,cp[1]+cs*.1);x.rotate(-.12);x.drawImage(coverSq(X,300),0,0,cs,cs);x.restore();title(x,W,H,k,X.name,{w:520*k})}},
 {n:'PAD SAMPLER',f(x,W,H,k,X){bgCover(x,W,H,k,X,.45);glow(x,900*k,400*k,480*k,.7);const s=1.7*k,m=put(x,A.mpc,470*k,70*k,s,{shadow:'rgba(0,0,0,.8)',blur:50*k});warp(x,coverSq(X,600),Q(m,[[96,104],[236,80],[272,122],[132,150]]),10);title(x,W,H,k,X.name,{w:520*k})}},
 {n:'DAW CLIPS',f(x,W,H,k,X){bgDaw(x,W,H,k,.55);const S=360*k;x.save();x.shadowColor='rgba(224,36,47,.9)';x.shadowBlur=50*k;x.fillStyle='#000';x.fillRect(70*k,50*k,S,S);x.restore();x.drawImage(coverSq(X,700),70*k,50*k,S,S);
  if(A.clips){x.save();x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=30*k;x.drawImage(A.clips,520*k,110*k,738*.95*k,315*.95*k);x.restore()}arrow(x,475*k,240*k,160*k,.95);title(x,W,H,k,X.name,{bottom:70*k,w:1150*k,size:150*k,maxH:H*.3})}}
];
/* 9:16 (Shorts / Reels / TikTok): a real vertical layout instead of cropping the 16:9 one */
let REC=null;const recImg=()=>REC||(REC=new Promise(ok=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>ok(im);im.onerror=()=>ok(null);im.src=new URL('crate-record.webp?v=1',document.baseURI).href}));
/* 8 vertical layouts; cards cycle through them (layout 4 uses the real product photos, so it varies again by photo) */
function portrait(x,W,H,XX,i,rec){const nP=XX.beat?8:8+PD.length,LL=((i%nP)+nP)%nP;if(LL>=8){PD[LL-8](x,W,H,XX);return}const k=W/1080,cv=XX.cover,L=LL,name=(XX.name.replace(/\s*SAMPLE PACK\s*$/,'')||XX.name);
 const bg=(blur,br)=>{x.fillStyle='#08080a';x.fillRect(0,0,W,H);if(cv){const s=Math.max(W/cv.width,H/cv.height)*1.12;x.save();try{x.filter='blur('+Math.round(blur*k)+'px) brightness('+br+') saturate(1.2)'}catch(e){}x.drawImage(cv,(W-cv.width*s)/2,(H-cv.height*s)/2,cv.width*s,cv.height*s);x.restore()}};
 const fade=(a,b,c)=>{const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(8,8,10,'+a+')');g.addColorStop(.5,'rgba(8,8,10,'+b+')');g.addColorStop(1,'rgba(8,8,10,'+c+')');x.fillStyle=g;x.fillRect(0,0,W,H)};
 const redGlow=(y)=>{const g=x.createRadialGradient(W/2,y,0,W/2,y,W*.9);g.addColorStop(0,'rgba(224,36,47,.38)');g.addColorStop(1,'rgba(224,36,47,0)');x.fillStyle=g;x.fillRect(0,0,W,H)};
 const cover=(cx,cy,sz,rot)=>{x.save();x.translate(cx,cy);if(rot)x.rotate(rot);x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=70*k;x.shadowOffsetY=30*k;if(cv)x.drawImage(cv,-sz/2,-sz/2,sz,sz);else{x.fillStyle='#1a1a1e';x.fillRect(-sz/2,-sz/2,sz,sz)}x.shadowColor='transparent';x.strokeStyle='rgba(255,255,255,.14)';x.lineWidth=2*k;x.strokeRect(-sz/2,-sz/2,sz,sz);x.restore()};
 const record=(cx,cy,rs,rot)=>{if(!rec)return;x.save();x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=50*k;x.translate(cx,cy);x.rotate(rot||0);x.drawImage(rec,-rs/2,-rs/2,rs,rs);x.restore()};
 const fit=(txt,maxW,start,minS,maxLines)=>{const ws=txt.split(/\s+/);let fs=start*k,lines;const wrap=()=>{x.font=fs+'px '+F;lines=[];let cur='';for(const w of ws){const t=cur?cur+' '+w:w;if(x.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur)};
  wrap();while((lines.length>maxLines||Math.max(...lines.map(l=>x.measureText(l).width))>maxW)&&fs>minS*k){fs-=6*k;wrap()}return{fs,lines}};
 const title=(y,o)=>{o=o||{};const {fs,lines}=fit(name,o.maxW||W*.86,o.size||210,70,o.lines||3);x.textAlign=o.align||'center';const tx=o.align==='left'?W*.07:W/2;x.font=fs+'px '+F;
  for(const l of lines){if(o.outline){x.lineWidth=4*k;x.strokeStyle=o.color||'#fff';x.strokeText(l,tx,y)}else{x.fillStyle=o.color||'#fff';x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=24*k;x.fillText(l,tx,y);x.shadowBlur=0}y+=fs*.92}return y-fs*.92};
 const tag=(y,o)=>{o=o||{};const t=XX.label||'SAMPLE PACK';x.font='800 '+Math.round(38*k)+'px '+B;x.letterSpacing=Math.round(8*k)+'px';const tw=x.measureText(t).width+70*k,th=74*k,cx=o.align==='left'?W*.07+tw/2:W/2;
  x.fillStyle=o.bg||RED;x.fillRect(cx-tw/2,y,tw,th);x.fillStyle=o.fg||'#fff';x.textAlign='center';x.fillText(t,cx,y+th*.66);x.letterSpacing='0px'};
 const kicker=(y,col,align)=>{x.textAlign=align||'center';x.fillStyle=col||RED;x.font='800 '+Math.round(34*k)+'px '+B;x.letterSpacing=Math.round(10*k)+'px';x.fillText('NEW '+(XX.label||'SAMPLE PACK'),align==='left'?W*.07:W/2,y);x.letterSpacing='0px'};
 const foot=(col)=>{x.textAlign='center';x.fillStyle=col||'rgba(255,255,255,.75)';x.font='700 '+Math.round(30*k)+'px '+B;x.letterSpacing=Math.round(8*k)+'px';x.fillText('MZPRD.COM  ·  ROYALTY-FREE',W/2,H*.955);x.letterSpacing='0px'};
 x.textBaseline='alphabetic';
 if(L===0){/* cover + record */bg(46,.42);fade(.55,.15,.95);redGlow(H*1.02);const v=(i>>3)%2;record(W/2+(v?1:-1)*W*.05+(v?-1:1)*W*.7*.36,H*.36,W*.7*.94,v?-.5:.5);cover(W/2+(v?1:-1)*W*.05,H*.36,W*.7);kicker(H*.075);const y=title(H*.665+150*k);tag(y+48*k);foot()}
 else if(L===1){/* big title on top, tilted cover below */bg(60,.35);fade(.9,.4,.9);redGlow(H*.72);kicker(H*.08);const y=title(H*.08+200*k,{size:230,lines:3});tag(y+44*k);record(W*.42+W*.62*.36,H*.69,W*.62*.94,.3);cover(W*.42,H*.69,W*.62,-.07);foot()}
 else if(L===2){/* full-bleed cover with the title over a fade */x.fillStyle='#08080a';x.fillRect(0,0,W,H);if(cv){const s=Math.max(W/cv.width,(H*.72)/cv.height);x.drawImage(cv,(W-cv.width*s)/2,0,cv.width*s,cv.height*s)}
  const g=x.createLinearGradient(0,H*.35,0,H*.8);g.addColorStop(0,'rgba(8,8,10,0)');g.addColorStop(1,'rgba(8,8,10,1)');x.fillStyle=g;x.fillRect(0,0,W,H);x.fillStyle='#08080a';x.fillRect(0,H*.8,W,H*.2);
  kicker(H*.62,RED,'left');const y=title(H*.62+170*k,{align:'left',size:200,lines:3});tag(y+44*k,{align:'left'});foot()}
 else if(L===3){/* real product photo scene in a frame */const t=T[((i>>3)%T.length+T.length)%T.length],o=cvs(1280,720);t.f(o.getContext('2d'),1280,720,1,XX);bg(50,.35);fade(.7,.3,.95);
  kicker(H*.08);const y0=title(H*.08+170*k,{size:170,lines:2});const fw=W*.94,fh=fw*720/1280,fy=Math.max(y0+60*k,H*.34);x.save();x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=60*k;x.drawImage(o,(W-fw)/2,fy,fw,fh);x.restore();
  x.strokeStyle=RED;x.lineWidth=4*k;x.strokeRect((W-fw)/2,fy,fw,fh);tag(fy+fh+70*k);x.textAlign='center';x.fillStyle='#fff';x.font='700 '+Math.round(40*k)+'px '+B;x.fillText('LOOPS · ONE-SHOTS · INSTANT DOWNLOAD',W/2,fy+fh+230*k);foot()}
 else if(L===4){/* split: cover on top, red block with black title */x.fillStyle=RED;x.fillRect(0,0,W,H);if(cv){x.save();x.beginPath();x.rect(0,0,W,H*.56);x.clip();const s=Math.max(W/cv.width,(H*.56)/cv.height);x.drawImage(cv,(W-cv.width*s)/2,(H*.56-cv.height*s)/2,cv.width*s,cv.height*s);x.restore()}
  x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,H*.56,W,6*k);kicker(H*.56+90*k,'#0b0b0d');const y=title(H*.56+260*k,{color:'#0b0b0d',size:200,lines:3});tag(y+44*k,{bg:'#0b0b0d',fg:'#fff'});foot('rgba(11,11,13,.8)')}
 else if(L===5){/* giant record with the cover as its label */bg(60,.3);fade(.6,.2,.95);redGlow(H*.4);const rs=W*1.05,cy=H*.38;if(rec)record(W/2,cy,rs,.2);else{x.fillStyle='#111';x.beginPath();x.arc(W/2,cy,rs/2,0,6.283);x.fill()}
  if(cv){const ls=rs*.36;x.save();x.beginPath();x.arc(W/2,cy,ls/2,0,6.283);x.clip();x.drawImage(cv,W/2-ls/2,cy-ls/2,ls,ls);x.restore();x.fillStyle='#0b0b0d';x.beginPath();x.arc(W/2,cy,10*k,0,6.283);x.fill()}
  kicker(H*.07);const y=title(H*.72,{size:190,lines:2});tag(y+44*k);foot()}
 else if(L===6){/* stack of three tilted covers */bg(50,.32);fade(.65,.2,.95);redGlow(H*.95);const sz=W*.58;cover(W*.34,H*.34,sz,-.16);cover(W*.66,H*.36,sz,.14);cover(W*.5,H*.4,sz*1.06,-.02);kicker(H*.075);const y=title(H*.74,{size:200,lines:2});tag(y+44*k);foot()}
 else {/* minimal: black, small cover, giant outlined title */x.fillStyle='#070708';x.fillRect(0,0,W,H);redGlow(H*.15);const {fs,lines}=fit(name,W*.9,300,110,4);x.font=fs+'px '+F;x.textAlign='center';let y=H*.1+fs;
  for(const l of lines){x.lineWidth=3*k;x.strokeStyle='rgba(255,255,255,.85)';x.strokeText(l,W/2,y);y+=fs*.9}cover(W/2,Math.min(H*.72,y+W*.25),W*.46,0);kicker(H*.86,'#fff');tag(H*.875);foot('rgba(255,255,255,.55)')}
}
/* 16:9 add-on designs (same looks as the 9:16 set, laid out wide). Appended after the photo designs; nothing removed. */
let RECIMG=null,CURLABEL='SAMPLE PACK';
function wideKit(x,W,H,X){const k=W/1280,cv=X.cover,name=(X.name.replace(/\s*SAMPLE PACK\s*$/,'')||X.name);
 const bg=(blur,br)=>{x.fillStyle='#08080a';x.fillRect(0,0,W,H);if(cv){const s=Math.max(W/cv.width,H/cv.height)*1.1;x.save();try{x.filter='blur('+Math.round(blur*k)+'px) brightness('+br+') saturate(1.2)'}catch(e){}x.drawImage(cv,(W-cv.width*s)/2,(H-cv.height*s)/2,cv.width*s,cv.height*s);x.restore()}};
 const vign=()=>{const g=x.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,W*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.7)');x.fillStyle=g;x.fillRect(0,0,W,H)};
 const glowR=(cx,cy,r)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(224,36,47,.42)');g.addColorStop(1,'rgba(224,36,47,0)');x.fillStyle=g;x.fillRect(0,0,W,H)};
 const cover=(cx,cy,sz,rot)=>{x.save();x.translate(cx,cy);if(rot)x.rotate(rot);x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=50*k;x.shadowOffsetY=22*k;if(cv)x.drawImage(cv,-sz/2,-sz/2,sz,sz);else{x.fillStyle='#1a1a1e';x.fillRect(-sz/2,-sz/2,sz,sz)}x.shadowColor='transparent';x.strokeStyle='rgba(255,255,255,.14)';x.lineWidth=2*k;x.strokeRect(-sz/2,-sz/2,sz,sz);x.restore()};
 const record=(cx,cy,rs,rot)=>{if(!RECIMG){x.fillStyle='#0d0d0f';x.beginPath();x.arc(cx,cy,rs/2,0,6.283);x.fill();return}x.save();x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=40*k;x.translate(cx,cy);x.rotate(rot||0);x.drawImage(RECIMG,-rs/2,-rs/2,rs,rs);x.restore()};
 const fit=(maxW,start,maxLines)=>{const ws=name.split(/\s+/);let fs=start*k,lines;const wrap=()=>{x.font=fs+'px '+F;lines=[];let cur='';for(const w of ws){const t=cur?cur+' '+w:w;if(x.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur)};
  wrap();while((lines.length>maxLines||Math.max(...lines.map(l=>x.measureText(l).width))>maxW)&&fs>54*k){fs-=5*k;wrap()}return{fs,lines}};
 const title=(tx,y,o)=>{o=o||{};const {fs,lines}=fit(o.maxW||W*.5,o.size||150,o.lines||3);x.textAlign=o.align||'left';x.textBaseline='alphabetic';x.font=fs+'px '+F;
  for(const l of lines){if(o.outline){x.lineWidth=3*k;x.strokeStyle=o.color||'#fff';x.strokeText(l,tx,y)}else{x.fillStyle=o.color||'#fff';x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=18*k;x.fillText(l,tx,y);x.shadowBlur=0}y+=fs*.92}return y-fs*.92};
 const tag=(tx,y,o)=>{o=o||{};const t=X.label||'SAMPLE PACK';x.font='800 '+Math.round(26*k)+'px '+B;x.letterSpacing=Math.round(6*k)+'px';const tw=x.measureText(t).width+44*k,th=50*k,cx=o.align==='center'?tx:tx+tw/2;
  x.fillStyle=o.bg||RED;x.fillRect(cx-tw/2,y,tw,th);x.fillStyle=o.fg||'#fff';x.textAlign='center';x.fillText(t,cx,y+th*.67);x.letterSpacing='0px'};
 const kick=(tx,y,col,align)=>{x.textAlign=align||'left';x.fillStyle=col||RED;x.font='800 '+Math.round(24*k)+'px '+B;x.letterSpacing=Math.round(8*k)+'px';x.fillText('NEW '+(X.label||'SAMPLE PACK'),tx,y);x.letterSpacing='0px'};
 const foot=(tx,col,align)=>{x.textAlign=align||'left';x.fillStyle=col||'rgba(255,255,255,.7)';x.font='700 '+Math.round(20*k)+'px '+B;x.letterSpacing=Math.round(6*k)+'px';x.fillText('MZPRD.COM  ·  ROYALTY-FREE',tx,H*.93);x.letterSpacing='0px'};
 return{k,cv,name,bg,vign,glowR,cover,record,fit,title,tag,kick,foot}}
T.push(
 {n:'COVER + RECORD',f(x,W,H,k0,X){const K=wideKit(x,W,H,X),k=K.k;K.bg(40,.4);K.vign();K.glowR(W*.72,H*.5,W*.45);{const cs=H*.8;K.record(W*.66+cs*.36,H*.5,cs*.94,.4);K.cover(W*.66,H*.5,cs)}K.kick(W*.06,H*.24);const y=K.title(W*.06,H*.24+130*k,{maxW:W*.46,size:150});K.tag(W*.06,y+34*k);K.foot(W*.06)}},
 {n:'RED SPLIT',f(x,W,H,k0,X){const K=wideKit(x,W,H,X),k=K.k;x.fillStyle=RED;x.fillRect(0,0,W,H);if(K.cv){x.save();x.beginPath();x.rect(W*.5,0,W*.5,H);x.clip();const s=Math.max((W*.5)/K.cv.width,H/K.cv.height);x.drawImage(K.cv,W*.75-K.cv.width*s/2,H/2-K.cv.height*s/2,K.cv.width*s,K.cv.height*s);x.restore()}
  x.fillStyle='rgba(0,0,0,.2)';x.fillRect(W*.5-4*k,0,6*k,H);K.kick(W*.05,H*.22,'#0b0b0d');const y=K.title(W*.05,H*.22+130*k,{maxW:W*.42,size:150,color:'#0b0b0d'});K.tag(W*.05,y+34*k,{bg:'#0b0b0d'});K.foot(W*.05,'rgba(11,11,13,.8)')}},
 {n:'GIANT RECORD',f(x,W,H,k0,X){const K=wideKit(x,W,H,X),k=K.k;K.bg(55,.3);K.vign();K.glowR(W*.28,H*.5,W*.4);const rs=H*1.18,cx=W*.28,cy=H*.5;K.record(cx,cy,rs,.25);
  if(K.cv){const ls=rs*.36;x.save();x.beginPath();x.arc(cx,cy,ls/2,0,6.283);x.clip();x.drawImage(K.cv,cx-ls/2,cy-ls/2,ls,ls);x.restore();x.fillStyle='#0b0b0d';x.beginPath();x.arc(cx,cy,7*k,0,6.283);x.fill()}
  K.kick(W*.58,H*.26);const y=K.title(W*.58,H*.26+130*k,{maxW:W*.38,size:140});K.tag(W*.58,y+34*k);K.foot(W*.58)}},
 {n:'COVER STACK',f(x,W,H,k0,X){const K=wideKit(x,W,H,X),k=K.k;K.bg(45,.32);K.vign();K.glowR(W*.7,H*.55,W*.45);const sz=H*.62;K.cover(W*.6,H*.5,sz,-.16);K.cover(W*.82,H*.52,sz,.14);K.cover(W*.71,H*.55,sz*1.05,-.02);
  K.kick(W*.05,H*.26);const y=K.title(W*.05,H*.26+130*k,{maxW:W*.42,size:150});K.tag(W*.05,y+34*k);K.foot(W*.05)}},
 {n:'FULL BLEED',f(x,W,H,k0,X){const K=wideKit(x,W,H,X),k=K.k;x.fillStyle='#08080a';x.fillRect(0,0,W,H);if(K.cv){const s=Math.max((W*.62)/K.cv.width,H/K.cv.height);x.drawImage(K.cv,W-K.cv.width*s,(H-K.cv.height*s)/2,K.cv.width*s,K.cv.height*s)}
  const g=x.createLinearGradient(W*.3,0,W*.62,0);g.addColorStop(0,'rgba(8,8,10,1)');g.addColorStop(1,'rgba(8,8,10,0)');x.fillStyle=g;x.fillRect(0,0,W,H);x.fillStyle='#08080a';x.fillRect(0,0,W*.3,H);
  K.kick(W*.05,H*.26);const y=K.title(W*.05,H*.26+130*k,{maxW:W*.44,size:150});K.tag(W*.05,y+34*k);K.foot(W*.05)}},
 {n:'MINIMAL OUTLINE',f(x,W,H,k0,X){const K=wideKit(x,W,H,X),k=K.k;x.fillStyle='#070708';x.fillRect(0,0,W,H);K.glowR(W*.8,H*.2,W*.5);K.cover(W*.8,H*.5,H*.56);
  const {fs,lines}=K.fit(W*.58,230,3);x.font=fs+'px '+F;x.textAlign='left';x.textBaseline='alphabetic';let y=H*.18+fs*.82;for(const l of lines){x.lineWidth=3*k;x.strokeStyle='rgba(255,255,255,.85)';x.strokeText(l,W*.05,y);y+=fs*.9}
  K.kick(W*.05,H*.82,'#fff');K.tag(W*.05,H*.835+4*k);K.foot(W*.62,'rgba(255,255,255,.5)')}}
);
/* PHOTO SET 2 (your own photos, cut out): studio desk, MPC One, keys, speakers, DAW blur, mixer art, channel rack,
   floating windows, waveform strip, MZPRD logo. Packs + single samples only. Each works in 16:9 and 9:16. */
const A2={},F2={desk:'desk.jpg',mpc:'mpc.webp',keys:'keys.webp',speaker:'speaker.webp',dawblur:'dawblur.jpg',mixer:'mixer.jpg',rack:'rack.jpg',floaty:'floaty.webp',wave:'wave.jpg',logo:'logo.png'};let boot2=null;
function load2(){return boot2=boot2||Promise.all(Object.entries(F2).map(([n,f])=>new Promise(r=>{const i=new Image();i.onload=()=>{A2[n]=i;r()};i.onerror=()=>r();i.src=new URL('mpc/pk2/'+f+'?v=1',document.baseURI).href})))}
function P2(x,W,H,X,fn){const K=wideKit(x,W,H,X),k=K.k,L=W>H;
 const photo=(img,cx,cy,s,dark)=>{if(!img)return;x.drawImage(img,cx-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s);if(dark){x.fillStyle='rgba(6,6,8,'+dark+')';x.fillRect(0,0,W,H)}};
 const fill=(img,ax,ay,dark)=>{if(!img)return;const s=Math.max(W/img.width,H/img.height);photo(img,W/2+(ax||0)*(img.width*s-W)/2,H/2+(ay||0)*(img.height*s-H)/2,s,dark)};
 const shade=()=>{if(L){const g=x.createLinearGradient(0,0,W*.55,0);g.addColorStop(0,'rgba(6,6,8,.92)');g.addColorStop(1,'rgba(6,6,8,0)');x.fillStyle=g;x.fillRect(0,0,W,H)}else{const g=x.createLinearGradient(0,H*.55,0,H);g.addColorStop(0,'rgba(6,6,8,0)');g.addColorStop(.35,'rgba(6,6,8,.9)');g.addColorStop(1,'rgba(6,6,8,.98)');x.fillStyle=g;x.fillRect(0,0,W,H)}};
 const text=()=>{if(L){K.kick(W*.05,H*.26);const y=K.title(W*.05,H*.26+130*k,{maxW:W*.42,size:150});K.tag(W*.05,y+34*k);K.foot(W*.05)}
  else{const y0=H*.7;K.kick(W/2,y0,null,'center');const y=K.title(W/2,y0+130*k,{align:'center',maxW:W*.88,size:170,lines:2});K.tag(W/2,y+34*k,{align:'center'});K.foot(W/2,null,'center')}};
 const shot=(img,cx,cy,s,sh)=>{if(!img)return;x.save();x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=(sh||50)*k;x.shadowOffsetY=18*k;x.drawImage(img,cx-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s);x.restore()};
 fn({K,k,L,photo,fill,shade,text,shot})}
const PD=[
 /* STUDIO DESK: the cover on the monitor */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text})=>{const d=A2.desk;K.bg(50,.3);if(d){const mc=[777,338],s=L?H*1.1/d.height:W*1.35/814,ox=(L?W*.6:W/2)-mc[0]*s,oy=(L?H/2:H*.33)-mc[1]*s;x.drawImage(d,ox,oy,d.width*s,d.height*s);
  const q=[[424,164],[1180,96],[1184,580],[370,556]].map(p=>[ox+p[0]*s,oy+p[1]*s]);x.save();x.globalAlpha=.96;warp(x,coverSq(X,900),q,16);x.restore();
  x.save();x.globalCompositeOperation='screen';x.globalAlpha=.12;x.drawImage(d,ox,oy,d.width*s,d.height*s);x.restore()}shade();text()}),
 /* MPC ONE: the cover on its screen */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text})=>{K.bg(45,.3);K.glowR(L?W*.7:W/2,L?H*.5:H*.33,W*.5);const m=A2.mpc;if(m){const s=L?H*.9/m.height:W*.84/m.width,cx=L?W*.7:W/2,cy=L?H/2:H*.35,ox=cx-m.width*s/2,oy=cy-m.height*s/2;
  x.save();x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=60*k;x.shadowOffsetY=24*k;x.drawImage(m,ox,oy,m.width*s,m.height*s);x.restore();
  const sx=ox+20*s,sy=oy+70*s,sw=406*s,sh=222*s,cv=X.cover;if(cv){const r=Math.max(sw/cv.width,sh/cv.height);x.save();x.beginPath();x.rect(sx,sy,sw,sh);x.clip();x.drawImage(cv,sx+sw/2-cv.width*r/2,sy+sh/2-cv.height*r/2,cv.width*r,cv.height*r);
   const g=x.createLinearGradient(sx,sy,sx+sw,sy+sh);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(.45,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(sx,sy,sw,sh);x.restore()}}shade();text()}),
 /* KEYS: cover floating above the keyboard */
 (x,W,H,X,)=>P2(x,W,H,X,({K,k,L,shade,text,shot})=>{K.bg(50,.32);K.glowR(L?W*.72:W/2,L?H*.6:H*.45,W*.5);const kb=A2.keys;
  if(L){K.cover(W*.72,H*.36,H*.52,-.05);if(kb)shot(kb,W*.72,H*.78,W*.5/kb.width)}else{K.cover(W/2,H*.27,W*.62,-.04);if(kb)shot(kb,W/2,H*.52,W*.92/kb.width)}shade();text()}),
 /* SPEAKERS: a pair of monitors either side of the cover */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text,shot})=>{K.bg(50,.3);K.glowR(L?W*.7:W/2,L?H*.5:H*.33,W*.5);const sp=A2.speaker;
  if(L){if(sp){const s=H*.55/sp.height;shot(sp,W*.5,H*.66,s);x.save();x.translate(W*.92,H*.66);x.scale(-1,1);shot(sp,0,0,s);x.restore()}K.cover(W*.71,H*.46,H*.62)}
  else{if(sp){const s=H*.2/sp.height;shot(sp,W*.2,H*.52,s);x.save();x.translate(W*.8,H*.52);x.scale(-1,1);shot(sp,0,0,s);x.restore()}K.cover(W/2,H*.3,W*.64)}shade();text()}),
 /* DAW BLUR: framed cover over the blurred session */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,fill,shade,text})=>{fill(A2.dawblur,0,0,.45);K.glowR(L?W*.7:W/2,L?H*.5:H*.33,W*.5);const sz=L?H*.68:W*.7,cx=L?W*.7:W/2,cy=L?H/2:H*.33;K.cover(cx,cy,sz,L?.02:0);x.strokeStyle=RED;x.lineWidth=5*k;x.strokeRect(cx-sz/2-10*k,cy-sz/2-10*k,sz+20*k,sz+20*k);shade();text()}),
 /* MIXER: the dark plugin/mixer artwork behind the cover */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,fill,shade,text})=>{fill(A2.mixer,L?0:.9,0,.15);K.glowR(L?W*.68:W/2,L?H*.5:H*.33,W*.45);K.cover(L?W*.66:W/2,L?H*.5:H*.33,L?H*.6:W*.62,L?-.03:0);shade();text()}),
 /* CHANNEL RACK: the step sequencer floating behind the cover */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text})=>{K.bg(55,.25);K.glowR(L?W*.7:W/2,L?H*.45:H*.3,W*.5);const r=A2.rack;if(r){const w=L?W*.62:W*1.02,h=w*r.height/r.width,cx=L?W*.68:W/2,cy=L?H*.32:H*.17,t=L?.07:.05;
  const q=[[cx-w/2,cy-h/2+h*t],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2-h*t]];x.save();x.shadowColor='rgba(0,0,0,.8)';x.shadowBlur=40*k;x.fillStyle='#000';x.beginPath();q.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.fill();x.restore();warp(x,r,q,10)}
  K.cover(L?W*.72:W/2,L?H*.62:H*.42,L?H*.5:W*.56,L?.04:0);shade();text()}),
 /* FLOATING WINDOWS: piano roll + waveforms around the cover */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text,shot})=>{K.bg(55,.28);K.glowR(L?W*.68:W/2,L?H*.45:H*.3,W*.55);const f=A2.floaty;if(f)shot(f,L?W*.7:W/2,L?H*.36:H*.22,(L?W*.6:W*1.05)/f.width,40);K.cover(L?W*.6:W/2,L?H*.64:H*.44,L?H*.46:W*.56,L?-.06:-.03);shade();text()}),
 /* WAVEFORM: the waveform strip under the cover */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text,shot})=>{K.bg(55,.3);K.glowR(L?W*.7:W/2,L?H*.45:H*.3,W*.5);K.cover(L?W*.72:W/2,L?H*.4:H*.28,L?H*.56:W*.62);const w=A2.wave;if(w){x.save();x.translate(L?W*.72:W/2,L?H*.84:H*.56);x.rotate(-.025);shot(w,0,0,(L?W*.5:W*.92)/w.width,30);x.restore()}shade();text()}),
 /* MZPRD LOGO: the logo big, then the cover */
 (x,W,H,X)=>P2(x,W,H,X,({K,k,L,shade,text})=>{x.fillStyle='#070708';x.fillRect(0,0,W,H);K.glowR(L?W*.7:W/2,L?H*.3:H*.12,W*.6);const lg=A2.logo;
  if(lg){const lw=L?W*.36:W*.7,lh=lw*lg.height/lg.width;x.drawImage(lg,L?W*.7-lw/2:W/2-lw/2,L?H*.08:H*.06,lw,lh)}K.cover(L?W*.7:W/2,L?H*.62:H*.4,L?H*.5:W*.6);shade();text()})
];
const PDN=['STUDIO DESK','MPC SCREEN','KEYS','SPEAKERS','DAW BLUR','MIXER','CHANNEL RACK','FLOATING WINDOWS','WAVEFORM','MZPRD LOGO'];
const BASE_T=T.length;PD.forEach((fn,j)=>T.push({n:PDN[j],photo2:1,f(x,W,H,k0,X){fn(x,W,H,X)}}));
function make(i,W,H,X){const c=cvs(W,H);c.ready=load().then(()=>load2()).then(()=>recImg()).then(r=>{RECIMG=r;CURLABEL=X.label||'SAMPLE PACK';const k=W/1280,x=c.getContext('2d'),XX={beat:X.kind==='beats',label:X.label||'SAMPLE PACK',name:String(X.title||'SAMPLE PACK').toUpperCase(),cover:X.cover&&(X.cover.naturalWidth||X.cover.width)?X.cover:null};XX.tone=tone(XX);
  const nT=X.kind==='beats'?BASE_T:T.length,t=T[((i%nT)+nT)%nT];if(Math.abs(W/H-16/9)<.02)t.f(x,W,H,k,XX);else if(H>W*1.2)return recImg().then(rec=>{portrait(x,W,H,XX,i,rec);return c});else{const o=cvs(1280,720);t.f(o.getContext('2d'),1280,720,1,XX);x.fillStyle='#08080a';x.fillRect(0,0,W,H);const s=Math.max(W/1280,H/720);x.drawImage(o,(W-1280*s)/2,(H-720*s)/2,1280*s,720*s)}return c}).catch(e=>{console.warn(e);return c});return c}
window.MZPackPhoto={make,load,count:T.length,names:T.map(t=>t.n)};
})();
