/* MZPRD SAMPLE PACK thumbnails: every template puts the selected pack's real cover on a real object (product box, CD jewel case,
   vinyl sleeve + record, cassette, SD card, record crate, DAW clips, pad controller) with the pack name huge and SAMPLE PACK after it.
   Drawn on canvas, no outside images, so it works for any pack. API: MZPackThumbs.make(i,W,H,{title,cover,seed}) -> canvas. */
(function(){
'use strict';
const RED='#e0242f',F="Anton, Impact, 'Arial Narrow Bold', sans-serif",B="Inter, 'Helvetica Neue', Arial, sans-serif";
const rnd=s=>{let x=(s|0)*9301+49297;return()=>{x=(x*9301+49297)%233280;return x/233280}};
const lerp=(a,b,t)=>a+(b-a)*t;
function sq(img){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,m=Math.min(iw,ih);return[(iw-m)/2,(ih-m)/2,m]}
/* draw the cover square into a 4-point quad (tl,tr,br,bl) using thin strips; good for boxes/cards turned around the vertical axis */
function quad(c,img,tl,tr,br,bl,src){const [ox,oy,m]=src||sq(img),N=140;for(let i=0;i<N;i++){const u=i/N,u2=(i+1)/N,x0=lerp(tl[0],tr[0],u),x1=lerp(tl[0],tr[0],u2),t=lerp(tl[1],tr[1],u),b=lerp(bl[1],br[1],u);c.drawImage(img,ox+m*u,oy,m/N+.5,m,x0,t,x1-x0+.8,b-t)}}
function path(c,pts){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath()}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function hueOf(img){try{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.drawImage(img,0,0,16,16);const d=x.getImageData(0,0,16,16).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2]}const n=d.length/4;return[r/n|0,g/n|0,b/n|0]}catch(e){return[120,30,30]}}
/* ---------- backgrounds ---------- */
function bgBlur(c,W,H,img,dim){c.fillStyle='#08080a';c.fillRect(0,0,W,H);if(img){const s=document.createElement('canvas');s.width=W/8|0;s.height=H/8|0;const x=s.getContext('2d');x.filter='blur(4px) saturate(1.3)';const [ox,oy,m]=sq(img);x.drawImage(img,ox,oy,m,m,-10,-s.width*.3,s.width+20,s.width+20);c.globalAlpha=dim;c.drawImage(s,0,0,W,H);c.globalAlpha=1}}
function daw(c,W,H,k,r,a){/* a believable DAW playlist: header bar, track rows with coloured clips and waveforms, playhead */
 c.save();c.globalAlpha=a;c.fillStyle='#1d232b';c.fillRect(0,0,W,H);c.fillStyle='#2b323c';c.fillRect(0,0,W,46*k);
 for(let i=0;i<14;i++){c.fillStyle='#3a424e';rr(c,(14+i*40)*k,10*k,30*k,26*k,4*k);c.fill()}
 c.fillStyle='#11161c';c.fillRect(0,46*k,170*k,H);const cols=['#7c5cff','#38c6ff','#ff5c8a','#5cff9d','#ffb347','#c77dff'];
 for(let t=0;t<9;t++){const y=(60+t*74)*k;c.fillStyle=t%2?'#232a33':'#262e38';c.fillRect(170*k,y,W,70*k);c.fillStyle='#2c343f';c.fillRect(10*k,y+6*k,150*k,58*k);
  let x=(180+r()*80)*k;while(x<W){const w=(120+r()*260)*k,col=cols[(t+(x|0))%cols.length];c.fillStyle=col+'aa';c.fillRect(x,y+4*k,w,62*k);c.fillStyle=col;c.fillRect(x,y+4*k,w,14*k);
   c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=1.4*k;c.beginPath();for(let q=0;q<w;q+=3*k){const v=Math.abs(Math.sin(q*.05/k+t)*Math.sin(q*.011/k+x))*22*k;c.moveTo(x+q,y+44*k-v);c.lineTo(x+q,y+44*k+v)}c.stroke();x+=w+(20+r()*90)*k}}
 c.fillStyle='#ffd23f';c.fillRect(W*.62,46*k,2*k,H);c.restore()}
function grade(c,W,H,v){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(v==null?.7:v)+')');c.fillStyle=g;c.fillRect(0,0,W,H)}
function glow(c,x,y,rad,col,a){const g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.save();c.globalAlpha=a;c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2);c.restore()}
/* ---------- type ---------- */
function title(c,W,H,k,name,o){o=o||{};const x=o.x==null?44*k:o.x,maxW=o.w||700*k,base=o.y||H-118*k;let fs=o.size||210*k;c.font=fs+'px '+F;while(c.measureText(name).width>maxW&&fs>70*k){fs-=5*k;c.font=fs+'px '+F}
 c.save();c.textAlign=o.align||'left';c.textBaseline='alphabetic';c.lineJoin='round';c.lineWidth=fs*.07;c.strokeStyle='#000';c.strokeText(name,x,base);c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=26*k;c.shadowOffsetY=6*k;c.fillStyle=o.col||'#fff';c.fillText(name,x,base);
 const sp=o.sub||'SAMPLE PACK',ss=Math.max(46*k,fs*.36);c.shadowBlur=0;c.shadowOffsetY=0;c.font=ss+'px '+F;const sy=base+ss*1.05;
 if(o.subBox){const w=c.measureText(sp).width;c.fillStyle=RED;c.fillRect(o.align==='center'?x-w/2-14*k:x-6*k,sy-ss*.95,w+28*k,ss*1.15);c.fillStyle='#fff';c.fillText(sp,o.align==='center'?x:x+8*k,sy)}
 else{c.lineWidth=ss*.12;c.strokeText(sp,x,sy);c.fillStyle=o.subCol||RED;c.fillText(sp,x,sy)}c.restore()}
function arrow(c,x0,y0,x1,y1,k,bend){/* chunky hand-drawn style curved arrow with black outline and a darker inner fold */
 const mx=(x0+x1)/2+(bend||0)*k,my=(y0+y1)/2-(bend||0)*.6*k,ang=Math.atan2(y1-my,x1-mx),hw=46*k,hl=78*k,sw=24*k;
 const bx=x1-Math.cos(ang)*hl,by=y1-Math.sin(ang)*hl;c.save();c.lineCap='round';c.lineJoin='round';
 const stroke=(w,col)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo(mx,my,bx,by);c.stroke()};
 stroke(sw+10*k,'#000');stroke(sw,RED);c.globalAlpha=.35;stroke(sw*.35,'#7a0d14');c.globalAlpha=1;
 const head=()=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(bx+Math.cos(ang+Math.PI/2)*hw,by+Math.sin(ang+Math.PI/2)*hw);c.lineTo(bx+Math.cos(ang-Math.PI/2)*hw,by+Math.sin(ang-Math.PI/2)*hw);c.closePath()};
 head();c.lineWidth=10*k;c.strokeStyle='#000';c.stroke();c.fillStyle=RED;c.fill();c.restore()}
function badge(c,x,y,rad,k,l1,l2){c.save();c.fillStyle=RED;c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=18*k;c.beginPath();c.arc(x,y,rad,0,6.283);c.fill();c.shadowBlur=0;c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=3*k;c.beginPath();c.arc(x,y,rad*.86,0,6.283);c.stroke();
 c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font=(rad*.5)+'px '+F;c.fillText(l1,x,y-rad*.16);c.font='800 '+(rad*.2)+'px '+B;c.fillText(l2,x,y+rad*.34);c.restore()}
/* ---------- objects ---------- */
function vinyl(c,x,y,R,img,k,rot){c.save();c.translate(x,y);c.rotate(rot||0);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=30*k;c.beginPath();c.arc(0,0,R,0,6.283);c.fillStyle='#0a0a0b';c.fill();c.shadowBlur=0;
 for(let r=R*.36;r<R*.97;r+=Math.max(1,R/180)){c.strokeStyle='rgba(255,255,255,'+(.025+((r*7)%3)*.012)+')';c.lineWidth=.8;c.beginPath();c.arc(0,0,r,0,6.283);c.stroke()}
 if(c.createConicGradient){const g=c.createConicGradient(-.4,0,0);[[0,0],[.06,.22],[.13,0],[.5,0],[.56,.16],[.63,0],[1,0]].forEach(([o,a])=>g.addColorStop(o,'rgba(255,255,255,'+a+')'));c.fillStyle=g;c.beginPath();c.arc(0,0,R*.98,0,6.283);c.fill()}
 const L=R*.34;c.save();c.beginPath();c.arc(0,0,L,0,6.283);c.clip();if(img){const [ox,oy,m]=sq(img);c.drawImage(img,ox,oy,m,m,-L,-L,L*2,L*2)}else{c.fillStyle=RED;c.fill()}c.restore();
 c.fillStyle='#e8e8ea';c.beginPath();c.arc(0,0,R*.03,0,6.283);c.fill();c.restore()}
function cd(c,x,y,R,img,k){c.save();c.translate(x,y);c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=20*k;c.beginPath();c.arc(0,0,R,0,6.283);c.fillStyle='#c9ccd2';c.fill();c.shadowBlur=0;
 if(c.createConicGradient){const g=c.createConicGradient(.3,0,0);['#d9dce2','#f4f4f6','#b9e8ff','#ffd1f0','#fff3b0','#c9ccd2','#e9eaee','#a8f0d8','#ffc0a8','#d9dce2'].forEach((col,i,a)=>g.addColorStop(i/(a.length-1),col));c.fillStyle=g;c.beginPath();c.arc(0,0,R,0,6.283);c.fill()}
 c.save();c.beginPath();c.arc(0,0,R*.97,0,6.283);c.arc(0,0,R*.4,0,6.283,true);c.clip();if(img){c.globalAlpha=.88;const [ox,oy,m]=sq(img);c.drawImage(img,ox,oy,m,m,-R,-R,R*2,R*2)}c.restore();
 c.fillStyle='rgba(235,238,242,.95)';c.beginPath();c.arc(0,0,R*.4,0,6.283);c.fill();c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=2*k;c.beginPath();c.arc(0,0,R*.28,0,6.283);c.stroke();c.fillStyle='#08080a';c.beginPath();c.arc(0,0,R*.11,0,6.283);c.fill();c.restore()}
function shine(c,pts,a){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys);c.save();path(c,pts);c.clip();const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'rgba(255,255,255,'+a+')');g.addColorStop(.32,'rgba(255,255,255,0)');g.addColorStop(.8,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.3)');c.fillStyle=g;c.fillRect(x0,y0,x1-x0,y1-y0);c.restore()}
function clips(c,x,y,k,name,n){const cols=[['#2b8fb3','#8fe6ff'],['#b33a4b','#ff9aa8'],['#6a3fb3','#c9a8ff'],['#2f9e62','#9cf5c4']],slug=name.replace(/[^A-Z0-9]+/g,'_').slice(0,18);
 for(let i=0;i<n;i++){const [d,l]=cols[i%4],w=520*k,h=118*k,xx=x+(i%2)*120*k,yy=y+i*84*k;c.save();c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=20*k;c.fillStyle='#5b2bd6';rr(c,xx-6*k,yy-6*k,w+12*k,h+12*k,8*k);c.fill();c.shadowBlur=0;
  c.fillStyle=d;c.fillRect(xx,yy,w,h);c.fillStyle=l+'55';c.fillRect(xx,yy,w,30*k);c.fillStyle='#fff';c.font='600 '+(19*k)+'px '+B;c.textBaseline='middle';c.fillText('↠ '+slug+'_'+['Loop','Chop','Drums','Keys'][i%4]+'_0'+(i+1)+'_'+(84+i*6)+'BPM',xx+10*k,yy+15*k);
  c.strokeStyle=l;c.lineWidth=2*k;c.beginPath();for(let q=0;q<w-8*k;q+=4*k){const v=Math.abs(Math.sin(q*.06/k+i)*Math.sin(q*.017/k+i*3))*38*k;c.moveTo(xx+4*k+q,yy+74*k-v);c.lineTo(xx+4*k+q,yy+74*k+v)}c.stroke();c.restore()}}
/* ---------- templates ---------- */
const T=[
/* 1 PRODUCT BOX + DAW ring + curved arrow */
function(c,W,H,k,X,r){daw(c,W,H,k,r,1);c.save();c.filter='blur('+(6*k)+'px)';c.drawImage(c.canvas,0,0);c.restore();c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,0,W,H);
 const cx=330*k,cy=280*k,R=240*k;c.save();c.beginPath();c.arc(cx,cy,R,0,6.283);c.clip();c.fillStyle='#161b22';c.fillRect(cx-R,cy-R,R*2,R*2);clips(c,cx-R+20*k,cy-R+70*k,k*.82,X.name,4);c.restore();
 c.lineWidth=16*k;c.strokeStyle=RED;c.beginPath();c.arc(cx,cy,R,0,6.283);c.stroke();
 const f=[[805*k,108*k],[1215*k,70*k],[1215*k,640*k],[805*k,592*k]],sp=58*k,sd=[[f[0][0]-sp,f[0][1]+20*k],f[0],f[3],[f[3][0]-sp,f[3][1]-20*k]];
 glow(c,1010*k,360*k,420*k,'rgba(224,36,47,1)',.75);c.save();c.shadowColor='rgba(224,36,47,.9)';c.shadowBlur=60*k;path(c,f);c.fillStyle='#000';c.fill();c.restore();
 if(X.cover)quad(c,X.cover,...f);shine(c,f,.25);const sg=c.createLinearGradient(sd[0][0],0,sd[1][0],0);sg.addColorStop(0,'#050506');sg.addColorStop(1,'#202024');path(c,sd);c.fillStyle=sg;c.fill();
 c.save();c.translate(f[0][0]-sp/2,350*k);c.rotate(-Math.PI/2);c.font=24*k+'px '+F;c.fillStyle='rgba(255,255,255,.8)';c.textAlign='center';c.textBaseline='middle';c.fillText(X.name.slice(0,24)+'  •  SAMPLE PACK',0,0);c.restore();
 arrow(c,800*k,470*k,520*k,300*k,k,-90);title(c,W,H,k,X.name,{w:740*k})},
/* 2 CD JEWEL CASE with disc sliding out */
function(c,W,H,k,X,r){bgBlur(c,W,H,X.cover,.55);grade(c,W,H,.75);const s=440*k,x=600*k,y=120*k;
 cd(c,x+s*.98,y+s/2,s*.45,X.cover,k);
 c.save();c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=40*k;c.fillStyle='rgba(30,30,34,.9)';c.fillRect(x,y,s,s);c.restore();
 if(X.cover){const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy,m,m,x+34*k,y+8*k,s-42*k,s-16*k)}
 c.fillStyle='rgba(220,222,226,.5)';c.fillRect(x,y,34*k,s);for(let i=0;i<40;i++){c.fillStyle='rgba(255,255,255,'+(i%2?.12:.04)+')';c.fillRect(x+3*k+i*.75*k,y,.6*k,s)}
 const g=c.createLinearGradient(x,y,x+s,y+s);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(.3,'rgba(255,255,255,.04)');g.addColorStop(.55,'rgba(255,255,255,0)');g.addColorStop(.62,'rgba(255,255,255,.14)');g.addColorStop(.7,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(x,y,s,s);
 c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=3*k;c.strokeRect(x,y,s,s);c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=1.5*k;c.strokeRect(x+6*k,y+6*k,s-12*k,s-12*k);
 title(c,W,H,k,X.name,{w:600*k,y:H-150*k})},
/* 3 VINYL SLEEVE + record pulled out, headline on top */
function(c,W,H,k,X,r){const [R0,G0,B0]=X.tint;c.fillStyle='rgb('+(18+R0*.12|0)+','+(14+G0*.08|0)+','+(14+B0*.08|0)+')';c.fillRect(0,0,W,H);
 for(let i=0;i<70;i++){c.fillStyle='rgba(255,255,255,'+(r()*.03)+')';c.fillRect(r()*W,r()*H,r()*3*k,r()*3*k)}glow(c,W*.45,H*.6,W*.5,'rgba(255,200,150,1)',.12);
 const s=460*k,x=200*k,y=210*k;vinyl(c,x+s*.78,y+s/2,s*.47,X.cover,k,.3);
 c.save();c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=40*k;c.shadowOffsetX=10*k;c.fillStyle='#000';c.fillRect(x,y,s,s);c.restore();if(X.cover){const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy,m,m,x,y,s,s)}
 const wg=c.createLinearGradient(x,y,x+s,y);wg.addColorStop(0,'rgba(0,0,0,.25)');wg.addColorStop(.06,'rgba(255,255,255,.08)');wg.addColorStop(.12,'rgba(0,0,0,0)');wg.addColorStop(1,'rgba(0,0,0,.18)');c.fillStyle=wg;c.fillRect(x,y,s,s);
 badge(c,x+s-30*k,y+s-36*k,70*k,k,'NEW','SAMPLE PACK');
 c.save();let fs=120*k;const t=X.name+' SAMPLE PACK';c.font=fs+'px '+F;while(c.measureText(t).width>W-120*k)fs-=4*k,c.font=fs+'px '+F;c.textAlign='center';c.textBaseline='top';c.lineWidth=fs*.06;c.strokeStyle='#000';c.strokeText(t,W/2,40*k);c.fillStyle='#f3ede4';c.fillText(t,W/2,40*k);
 const w=c.measureText(X.name+' ').width,tw=c.measureText(t).width;c.fillStyle=RED;c.textAlign='left';c.fillText('SAMPLE PACK',W/2-tw/2+w,40*k);c.restore();grade(c,W,H,.5)},
/* 4 CASSETTE: shell, window with reels, J-card label printed from the cover */
function(c,W,H,k,X,r){bgBlur(c,W,H,X.cover,.5);grade(c,W,H,.8);glow(c,W*.62,H*.5,W*.5,'rgba(224,36,47,1)',.35);
 c.save();c.translate(800*k,360*k);c.rotate(-.08);const w=700*k,h=440*k;c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=50*k;c.shadowOffsetY=20*k;c.fillStyle='rgba(28,28,32,.96)';rr(c,-w/2,-h/2,w,h,26*k);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
 c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=3*k;rr(c,-w/2+8*k,-h/2+8*k,w-16*k,h-16*k,20*k);c.stroke();
 const lx=-w/2+40*k,ly=-h/2+34*k,lw=w-80*k,lh=h*.62;c.fillStyle='#ece6da';rr(c,lx,ly,lw,lh,10*k);c.fill();
 if(X.cover){c.save();rr(c,lx,ly,lw,lh*.62,10*k);c.clip();const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy+m*.25,m,m*.5,lx,ly,lw,lh*.62);c.restore()}
 c.fillStyle='#111';c.font=46*k+'px '+F;c.textBaseline='middle';let fs=46*k;while(c.measureText(X.name).width>lw*.62&&fs>20*k){fs-=2*k;c.font=fs+'px '+F}c.fillText(X.name,lx+18*k,ly+lh*.81);c.font='800 '+(16*k)+'px '+B;c.fillStyle=RED;c.fillText('SAMPLE PACK  •  SIDE A',lx+18*k,ly+lh*.95);
 c.fillStyle='#111';rr(c,lx+lw-200*k,ly+lh*.7,180*k,lh*.24,6*k);c.fill();c.fillStyle='#ece6da';c.font=28*k+'px '+F;c.textAlign='center';c.fillText('C-60',lx+lw-110*k,ly+lh*.82);c.textAlign='left';
 const wy=ly+lh*.31;c.fillStyle='rgba(10,10,12,.85)';rr(c,-150*k,wy-48*k,300*k,96*k,48*k);c.fill();[-92,92].forEach(dx=>{c.fillStyle='#f2f2f2';c.beginPath();c.arc(dx*k,wy,34*k,0,6.283);c.fill();c.fillStyle='#222';for(let i=0;i<6;i++){c.save();c.translate(dx*k,wy);c.rotate(i*1.047);c.fillRect(-3*k,-30*k,6*k,14*k);c.restore()}c.fillStyle='#5a3a24';c.beginPath();c.arc(dx*k,wy,dx<0?28*k:18*k,0,6.283);c.globalAlpha=.25;c.fill();c.globalAlpha=1});
 c.fillStyle='rgba(60,60,66,.95)';path(c,[[-w*.32,h/2],[-w*.26,h*.28],[w*.26,h*.28],[w*.32,h/2]]);c.fill();[-.18,-.06,.06,.18].forEach(f=>{c.fillStyle='#0a0a0b';c.beginPath();c.arc(w*f,h*.4,9*k,0,6.283);c.fill()});
 const g=c.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(.35,'rgba(255,255,255,0)');c.fillStyle=g;rr(c,-w/2,-h/2,w,h,26*k);c.fill();c.restore();
 title(c,W,H,k,X.name,{w:520*k,size:150*k,y:200*k,x:40*k,sub:'SAMPLE PACK',subBox:true})},
/* 5 SD CARD with the cover printed on it */
function(c,W,H,k,X,r){c.fillStyle='#0b0b0d';c.fillRect(0,0,W,H);for(let i=0;i<46;i++){c.strokeStyle='rgba(255,255,255,'+(.025+r()*.03)+')';c.lineWidth=1;c.beginPath();c.moveTo(0,i*16*k);c.lineTo(W,i*16*k+r()*40*k);c.stroke()}glow(c,900*k,360*k,520*k,'rgba(224,36,47,1)',.45);
 c.save();c.translate(900*k,370*k);c.rotate(-.12);c.transform(1,0,-.18,1,0,0);const w=420*k,h=560*k,cut=80*k;const P=[[-w/2,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2],[-w/2,h/2]];
 c.save();c.translate(18*k,18*k);path(c,P);c.fillStyle='#000';c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=40*k;c.fill();c.restore();path(c,P);c.fillStyle='#2a2b2f';c.fill();c.strokeStyle='#4a4b52';c.lineWidth=3*k;c.stroke();
 for(let i=0;i<8;i++){c.fillStyle='#1b1c20';c.fillRect(-w/2+30*k+i*42*k,-h/2+10*k,26*k,40*k)}
 const lx=-w/2+30*k,ly=-h/2+64*k,lw=w-60*k,lh=h-100*k;c.fillStyle='#16171a';c.fillRect(lx,ly,lw,lh);if(X.cover){const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy,m,m,lx,ly,lw,lw)}
 c.fillStyle='#fff';c.font='800 '+(15*k)+'px '+B;c.fillText('LOCK ▾',-w/2+6*k,-40*k);c.font=40*k+'px '+F;c.textBaseline='top';let fs=40*k;while(c.measureText(X.name).width>lw-16*k&&fs>18*k){fs-=2*k;c.font=fs+'px '+F}c.fillText(X.name,lx+10*k,ly+lw+12*k);
 c.fillStyle='#d9d9dc';c.fillRect(lx+10*k,ly+lw+16*k+fs,lw-20*k,34*k);c.fillStyle='#111';c.font='800 '+(18*k)+'px '+B;c.textBaseline='middle';c.fillText('SAMPLE PACK',lx+20*k,ly+lw+33*k+fs);
 path(c,P);const g=c.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,'rgba(255,255,255,.14)');g.addColorStop(.4,'rgba(255,255,255,0)');c.fillStyle=g;c.fill();c.restore();
 arrow(c,520*k,560*k,690*k,420*k,k,40);title(c,W,H,k,X.name,{w:600*k,size:170*k,y:250*k})},
/* 6 RECORD CRATE: wooden crate of records, the pack sleeve standing at the front */
function(c,W,H,k,X,r){const g0=c.createLinearGradient(0,0,0,H);g0.addColorStop(0,'#d8cfbf');g0.addColorStop(1,'#a8987f');c.fillStyle=g0;c.fillRect(0,0,W,H);for(let i=0;i<500;i++){c.fillStyle='rgba(60,40,20,'+(r()*.08)+')';c.fillRect(r()*W,r()*H,r()*2*k,r()*2*k)}
 const cx=760*k,base=650*k,cw=560*k,ch=210*k;for(let i=0;i<9;i++){const xx=cx-cw/2+10*k+i*50*k,yy=base-ch-270*k+(i%3)*14*k;c.save();c.translate(xx,yy);c.rotate(-.14+i*.035);c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=10*k;c.fillStyle=['#c9b99a','#2a2420','#8a6a48','#1c1a18','#b8a27e','#4a3a2a'][i%6];c.fillRect(0,0,300*k,300*k);c.shadowBlur=0;c.fillStyle='rgba(0,0,0,.15)';c.fillRect(8*k,8*k,284*k,6*k);c.restore()}
 vinyl(c,cx+40*k,base-ch-150*k,190*k,null,k,0);
 const s=330*k;c.save();c.translate(cx-120*k,base-ch-300*k);c.rotate(-.04);c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=24*k;c.fillStyle='#000';c.fillRect(0,0,s,s);c.shadowBlur=0;if(X.cover){const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy,m,m,0,0,s,s)}c.restore();
 for(let p=0;p<3;p++){const y=base-ch+p*ch/3;const gg=c.createLinearGradient(0,y,0,y+ch/3);gg.addColorStop(0,'#6b4a2b');gg.addColorStop(1,'#3e2814');c.fillStyle=gg;c.fillRect(cx-cw/2,y+2*k,cw,ch/3-4*k);for(let q=0;q<26;q++){c.strokeStyle='rgba(20,10,0,'+(r()*.35)+')';c.lineWidth=1.2*k;c.beginPath();const yy=y+r()*ch/3;c.moveTo(cx-cw/2,yy);c.bezierCurveTo(cx-cw/4,yy+r()*6*k,cx+cw/4,yy-r()*6*k,cx+cw/2,yy);c.stroke()}}
 c.fillStyle='#1a0f06';rr(c,cx-80*k,base-ch+18*k,160*k,40*k,20*k);c.fill();c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(cx,base+16*k,cw*.55,22*k,0,0,6.283);c.fill();
 c.fillStyle='#0e0c0a';c.fillRect(W-110*k,0,110*k,H);c.save();c.translate(W-55*k,H/2);c.rotate(Math.PI/2);c.font=58*k+'px '+F;c.fillStyle='#e9e1d2';c.textAlign='center';c.textBaseline='middle';c.fillText('SAMPLE PACK  •  MZPRD',0,0);c.restore();
 c.save();c.fillStyle='#efe7d6';c.fillRect(0,0,W-110*k,150*k);c.font=110*k+'px '+F;let fs=110*k;while(c.measureText(X.name).width>W-200*k)fs-=4*k,c.font=fs+'px '+F;c.fillStyle='#141210';c.textBaseline='middle';c.fillText(X.name,40*k,80*k);c.restore();
 c.fillStyle='#2a2420';c.font='500 '+(20*k)+'px '+B;c.fillText('dusty loops & chops',40*k,H-70*k);c.fillText('side A / side B',40*k,190*k);c.fillText('33⅓ RPM',cx-40*k,H-30*k)},
/* 7 DAW CLIPS stacked with the cover box */
function(c,W,H,k,X,r){daw(c,W,H,k,r,.9);c.save();c.filter='blur('+(5*k)+'px)';c.drawImage(c.canvas,0,0);c.restore();c.fillStyle='rgba(5,5,8,.55)';c.fillRect(0,0,W,H);
 clips(c,580*k,90*k,k*1.08,X.name,4);const s=380*k,x=80*k,y=60*k;c.save();c.shadowColor='rgba(224,36,47,.9)';c.shadowBlur=50*k;c.fillStyle='#000';c.fillRect(x,y,s,s);c.restore();if(X.cover){const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy,m,m,x,y,s,s)}
 arrow(c,x+s+10*k,y+s*.7,600*k,250*k,k,-40);title(c,W,H,k,X.name,{w:1100*k,size:170*k,y:H-110*k})},
/* 8 PAD CONTROLLER: a red 16-pad sampler with the cover on its screen */
function(c,W,H,k,X,r){bgBlur(c,W,H,X.cover,.45);grade(c,W,H,.8);glow(c,860*k,380*k,500*k,'rgba(224,36,47,1)',.4);
 c.save();c.translate(860*k,390*k);c.transform(1,-.18,.45,.62,0,0);const w=520*k,h=520*k;c.fillStyle='#7a0f16';c.fillRect(-w/2+18*k,-h/2+26*k,w,h);c.fillStyle='#c81d27';rr(c,-w/2,-h/2,w,h,16*k);c.fill();
 const sx=-w/2+30*k,sy=-h/2+30*k,sw=w*.6,sh=h*.3;c.fillStyle='#0a0a0b';c.fillRect(sx-6*k,sy-6*k,sw+12*k,sh+12*k);if(X.cover){const [ox,oy,m]=sq(X.cover);c.drawImage(X.cover,ox,oy+m*.2,m,m*.55,sx,sy,sw,sh)}
 for(let i=0;i<4;i++){c.fillStyle='#1a1a1d';c.beginPath();c.arc(w*.3,-h/2+50*k+i*44*k,16*k,0,6.283);c.fill()}
 const cols=['#ff3b5c','#ff9f1c','#2ec4b6','#8f5cff','#3bff7a','#ff3b5c','#2ec4b6','#ffd23f'];for(let i=0;i<16;i++){const px=-w/2+40*k+(i%4)*76*k,py=-h/2+h*.42+(i/4|0)*62*k;c.fillStyle='#141416';rr(c,px,py,66*k,54*k,6*k);c.fill();c.strokeStyle=cols[(i*3+(r()*8|0))%8];c.lineWidth=4*k;rr(c,px+2*k,py+2*k,62*k,50*k,6*k);c.stroke()}
 c.restore();title(c,W,H,k,X.name,{w:560*k,size:170*k,y:260*k})}
];
const NAMES=['PACK BOX','CD JEWEL CASE','VINYL SLEEVE','CASSETTE','SD CARD','RECORD CRATE','DAW CLIPS','PAD SAMPLER'];
function make(i,W,H,X){const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),k=W/1280,kk=H/720;x.imageSmoothingQuality='high';
 const X2={name:String(X.title||'SAMPLE PACK').toUpperCase(),cover:X.cover&&(X.cover.naturalWidth||X.cover.width)?X.cover:null,tint:X.cover?hueOf(X.cover):[120,30,30]};
 const idx=((i%T.length)+T.length)%T.length;if(Math.abs(k-kk)>.01){/* other aspect (e.g. 9:16): draw 16:9 then fit */const t=make(i,1280,720,X);x.fillStyle='#08080a';x.fillRect(0,0,W,H);const s=Math.max(W/1280,H/720);x.drawImage(t,(W-1280*s)/2,(H-720*s)/2,1280*s,720*s);return c}
 T[idx](x,W,H,k,X2,rnd((X.seed||0)+idx*7+3));return c}
window.MZPackThumbs={make,count:T.length,names:NAMES,daw:(x,W,H,k)=>daw(x,W,H,k,rnd(5),1)};
})();
