/* MZPRD Mix Video maker (pop-out window opened from the Video Studio).
   Pick beats in order, choose a style, get premade thumbnails and YouTube text with chapters, and render one long 16:9 video
   (target 10-15 minutes) from the public previews. Rendering is offline and fast (WebCodecs + mp4-muxer), not real time. */
(function(){
const SITE='https://mzprd.com',YEAR=new Date().getFullYear(),SR=48000,FPS=24;let W=1280,H=720;
const ST={
 clean:{n:'CLEAN',acc:'#e8b94a',tint:'rgba(0,0,0,.5)',font:'Anton',grain:.08,vis:'bars'},
 neon:{n:'NEON',acc:'#35e0ff',acc2:'#ff3df2',tint:'rgba(25,0,70,.55)',font:'Anton',grain:.05,vis:'wave',grid:1,bloom:.5},
 lofi:{n:'LO-FI TAPE',acc:'#ffb067',tint:'rgba(70,35,10,.5)',font:"'Bebas Neue'",grain:.24,vis:'bars',warm:1,stamp:1},
 bit:{n:'8-BIT',acc:'#ffd34a',tint:'rgba(10,0,28,.62)',font:"'Press Start 2P'",grain:0,vis:'chunk',scan:1,pix:1},
 min:{n:'MINIMAL',acc:'#ffffff',tint:'rgba(0,0,0,.72)',font:'Oswald',grain:.05,vis:'line',center:1},
 vinyl:{n:'VINYL',acc:'#e0242f',tint:'rgba(10,0,0,.55)',font:'Anton',grain:.1,vis:'bars',scene:'vinyl'},
 ipod:{n:'IPOD',acc:'#e8e8ee',tint:'rgba(0,0,0,.6)',font:'Anton',grain:.06,vis:'line',scene:'ipod'},
 mpc:{n:'MPC',acc:'#ff3040',tint:'rgba(0,0,0,.55)',font:'Anton',grain:.08,vis:'bars',scene:'mpc'},
 crate:{n:'CRATE',acc:'#f2c230',tint:'rgba(20,12,0,.55)',font:'Anton',grain:.14,vis:'bars',scene:'crate',warm:1},
 ring:{n:'NEON RING',acc:'#ff2d3d',tint:'rgba(0,0,0,.66)',font:'Anton',grain:.05,vis:'radial',scene:'ring',bloom:.5},
 polaroid:{n:'POLAROID',acc:'#f3f1ec',tint:'rgba(15,8,0,.5)',font:"'Bebas Neue'",grain:.16,vis:'bars',scene:'polaroid',warm:1},
 gold:{n:'GOLD',acc:'#e8b94a',acc2:'#fff3c4',tint:'rgba(20,12,0,.6)',font:'Anton',grain:.07,vis:'wave',scene:'gold'},
 cinema:{n:'CINEMA',acc:'#ffffff',tint:'rgba(0,0,0,.6)',font:'Anton',grain:.1,vis:'line',center:1,bars:1}
};
/* scene art (the same cut-out photos as the thumbnails) */
const SCI={};['mpc/pk2/mpc.webp','mpc/pk3/ipod.webp','mpc/pk3/crate.webp','crate-record.webp'].forEach(f=>{const i=new Image();i.onload=()=>{SCI[f.split('/').pop().split('.')[0]]=i};i.src=new URL(f+'?v=1',document.baseURI).href});
function coverSq(c,im,x,y,s){if(!im||!im.naturalWidth){c.fillStyle='#111';c.fillRect(x,y,s,s);return}const m=Math.min(im.naturalWidth,im.naturalHeight);c.drawImage(im,(im.naturalWidth-m)/2,(im.naturalHeight-m)/2,m,m,x,y,s,s)}
function sceneDraw(c,st,cx,cy,cs,im,tg,d,prog){const u=H/720,x0=cx,y0=cy,mx=x0+cs/2,my=y0+cs/2,b=d.bass||0;c.save();
 if(st.scene==='vinyl'){const R=cs*.5*(1+b*.01),rec=SCI['crate-record'];c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=40*u;c.beginPath();c.arc(mx,my,R,0,6.283);c.fillStyle='#050505';c.fill();c.shadowColor='transparent';c.translate(mx,my);c.rotate(tg*3.49);if(rec)c.drawImage(rec,-R,-R,R*2,R*2);const lr=R*.36;c.beginPath();c.arc(0,0,lr,0,6.283);c.clip();coverSq(c,im,-lr,-lr,lr*2);c.restore();c.save();c.fillStyle='#0b0b0d';c.beginPath();c.arc(mx,my,R*.025,0,6.283);c.fill();const g=c.createLinearGradient(mx-R,my-R,mx+R,my+R);g.addColorStop(.3,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.07)');g.addColorStop(.7,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.arc(mx,my,R,0,6.283);c.fill()}
 else if(st.scene==='ipod'){const I=SCI.ipod;if(I){const h=cs*1.08,w=I.width*h/I.height,ox=mx-w/2,oy=my-h/2;c.fillStyle='#000';c.fillRect(ox+w*.06,oy+h*.04,w*.88,h*.39);c.save();c.beginPath();c.rect(ox+w*.07,oy+h*.045,w*.86,h*.38);c.clip();if(im&&im.naturalWidth){const sw=w*.86,sh=h*.38,sc=Math.max(sw/im.naturalWidth,sh/im.naturalHeight);c.drawImage(im,ox+w/2-im.naturalWidth*sc/2,oy+h*.235-im.naturalHeight*sc/2,im.naturalWidth*sc,im.naturalHeight*sc)}c.fillStyle='rgba(0,0,0,.55)';c.fillRect(ox+w*.07,oy+h*.37,w*.86,h*.055);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(ox+w*.12,oy+h*.395,w*.76,h*.006);c.fillStyle=st.acc;c.fillRect(ox+w*.12,oy+h*.395,w*.76*prog,h*.006);c.restore();c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=40*u;c.drawImage(I,ox,oy,w,h)}}
 else if(st.scene==='mpc'){const I=SCI.mpc;if(I){const w=cs*1.05,h=I.height*w/I.width,ox=mx-w/2,oy=my-h/2,sc=w/649;c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=40*u;c.drawImage(I,ox,oy,w,h);c.shadowColor='transparent';c.save();c.beginPath();c.rect(ox+20*sc,oy+70*sc,406*sc,222*sc);c.clip();if(im&&im.naturalWidth){const sw=406*sc,sh=222*sc,s2=Math.max(sw/im.naturalWidth,sh/im.naturalHeight);c.drawImage(im,ox+(20+203)*sc-im.naturalWidth*s2/2,oy+(70+111)*sc-im.naturalHeight*s2/2,im.naturalWidth*s2,im.naturalHeight*s2)}c.restore();
  c.globalCompositeOperation='screen';const pw=277*sc/4,ph=282*sc/4;for(let r=0;r<4;r++)for(let q=0;q<4;q++){const v=d.fd[4+(r*4+q)*6]/255,on=Math.max(0,v-.55)/.45;if(on<=0)continue;c.globalAlpha=on*.85;c.fillStyle='#ff3040';c.shadowColor='#ff3040';c.shadowBlur=pw*.5;c.fillRect(ox+83*sc+q*pw+pw*.1,oy+348*sc+r*ph+ph*.08,pw*.8,ph*.72)}}}
 else if(st.scene==='crate'){const I=SCI.crate;if(I){const w=cs*1.05,h=I.height*w/I.width,base=my+cs*.5,top=base-h,sz=cs*.6;c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=30*u;c.save();c.translate(mx+w*.05,top+h*.18-b*cs*.04);c.rotate(.04);c.fillStyle='#000';c.fillRect(-sz/2,-sz/2,sz,sz);coverSq(c,im,-sz/2,-sz/2,sz);c.restore();c.drawImage(I,mx-w/2,top,w,h)}}
 else if(st.scene==='ring'){const R=cs*.42;c.save();c.shadowColor=st.acc;c.shadowBlur=40*u*(1+b);c.strokeStyle=st.acc;c.lineWidth=8*u;c.beginPath();c.arc(mx,my,R+14*u,0,6.283);c.stroke();c.restore();c.save();c.beginPath();c.arc(mx,my,R,0,6.283);c.clip();coverSq(c,im,mx-R,my-R,R*2);c.restore();
  c.fillStyle=st.acc;for(let i=0;i<96;i++){const a=i/96*6.283-Math.PI/2,v=d.fd[Math.floor(Math.pow(i/96,1.5)*260)]/255,l=6*u+v*cs*.18;c.save();c.translate(mx+Math.cos(a)*(R+26*u),my+Math.sin(a)*(R+26*u));c.rotate(a);c.fillRect(0,-2*u,l,4*u);c.restore()}}
 else if(st.scene==='polaroid'){const s=cs*.86,bd=s*.06;c.translate(mx,my);c.rotate(-.05+Math.sin(tg*.4)*.01);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=40*u;c.fillStyle='#f3f1ec';c.fillRect(-s/2-bd,-s/2-bd,s+bd*2,s+bd*4.6);c.shadowColor='transparent';coverSq(c,im,-s/2,-s/2,s);c.fillStyle='#2a2a2e';c.font=(26*u)+"px 'Bebas Neue',Oswald";c.textAlign='center';c.fillText('MZPRD',0,s/2+bd*2.6)}
 else if(st.scene==='gold'){c.translate(mx,my);c.scale(1+b*.02,1+b*.02);const s=cs*.92;c.shadowColor='rgba(232,185,74,.45)';c.shadowBlur=50*u;c.fillStyle='#000';c.fillRect(-s/2,-s/2,s,s);c.shadowColor='transparent';coverSq(c,im,-s/2,-s/2,s);const g=c.createLinearGradient(-s/2,-s/2,s/2,s/2);g.addColorStop(0,'#fff3c4');g.addColorStop(.5,'#b8862c');g.addColorStop(1,'#fff3c4');c.strokeStyle=g;c.lineWidth=10*u;c.strokeRect(-s/2-12*u,-s/2-12*u,s+24*u,s+24*u)}
 c.restore()}

const M={fmt:'mix',cs:{},kind:'beats',lists:{},beats:[],sel:[],dur:{},cov:{},style:'clean',fade:1.5,repeat:false,char:false,outro:true,title:'Hard Rap Beats Mix',seed:0,yt:0,busy:false,pf:null};
let box=null,ac=null,noise=null,hero=null,bdc={};
/* what each kind is called, and where it links */
const KW={beats:{one:'beat',many:'beats',ONE:'BEAT',MANY:'BEATS',mix:'BEAT MIX',url:b=>SITE+'/beat/'+slugOf(b)+'/',title:'Hard Rap Beats Mix'},
 packs:{one:'sample pack',many:'sample packs',ONE:'PACK',MANY:'PACKS',mix:'SAMPLE PACK MIX',url:b=>SITE+'/pack/'+slugOf(b)+'/',title:'Soul Sample Packs Mix'},
 samples:{one:'sample',many:'samples',ONE:'SAMPLE',MANY:'SAMPLES',mix:'SAMPLE MIX',url:()=>SITE+'/crate-dig/',title:'Soul Samples Mix'}};
const K=()=>KW[M.kind];
async function setKind(k){if(M.busy||k===M.kind&&M.lists[k])return;M.lists[M.kind]=M.beats;M.kind=k;
 if(!M.lists[k]){try{const q=sb.from(k).select('*').order('created_at',{ascending:false});const r=k==='beats'?await q:await q.eq('published',true);M.lists[k]=r.data||[]}catch(e){M.lists[k]=[]}}
 M.beats=M.lists[k];M.sel=[];M.title=K().title;M.yt=0;M.gen=null;if($m('#mxTitle'))$m('#mxTitle').value=M.title;
 box.querySelectorAll('#mxKind button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));$m('#mxPick').textContent='1. PICK YOUR '+K().MANY;
 M.beats.forEach(b=>loadCover(b));ui();preview();genAll()}
const SLEEVE=()=>new URL('crate-sleeve.jpg',document.baseURI).href;
const artOf=(b,px)=>b.cover_path?((window.thumbUrl&&thumbUrl(b.cover_path))||pub(b.cover_path)):M.kind==='samples'?SLEEVE():M.kind==='beats'?stockCover(b.title,px):SLEEVE();
const $m=s=>box.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const slugOf=b=>b.slug||String(b.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||b.id;
const ctxA=()=>ac||(ac=new (window.AudioContext||window.webkitAudioContext)());

/* ---------- playlist ---------- */
function playlist(){
 let L=M.sel.map(id=>M.beats.find(b=>String(b.id)===String(id))).filter(Boolean);if(M.fmt==='speed')return speedList(L);
 if(M.repeat&&L.length){const base=L.slice(),dur=b=>M.dur[b.id]||180;let t=L.reduce((s,b)=>s+dur(b),0),i=0;while(t<600&&L.length<60){const b=base[i++%base.length];L.push(b);t+=dur(b)}}
 return L;
}
function layout(){let t=0;const cl=FM().clip;return playlist().map(b=>{const d0=M.dur[b._sid||b.id]||0,d=b._mode?(d0?Math.min(SPM[b._mode].sec,d0/SPM[b._mode].rate):0):cl&&d0?Math.min(d0,cl):d0,o={b,start:t,dur:d};t+=d;return o})}
const total=()=>layout().reduce((s,o)=>s+o.dur,0);

/* ---------- drawing ---------- */
function fitPx(c,str,font,maxW,maxPx){c.font='100px '+font;const w=c.measureText(str).width||1;return Math.min(maxPx,100*maxW/w)}
function coverFit(c,img,x,y,w,h){const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function blurBd(id){
 if(bdc[id])return bdc[id];const im=M.cov[id];if(!im||!im.naturalWidth)return null;
 const s=document.createElement('canvas');s.width=320;s.height=180;const x=s.getContext('2d');x.filter='blur(6px) saturate(1.3)';coverFit(x,im,-12,-12,344,204);bdc[id]=s;return s;
}
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}}
const prevFd=new Float32Array(512);
function dataAt(L,t){
 const N=2048,c=Math.floor(t*SR),re=new Float64Array(N),im=new Float64Array(N),td=new Uint8Array(1024),fd=new Uint8Array(512);
 for(let i=0;i<N;i++){const j=c+i-N,v=(j>=0&&j<L.length)?L[j]:0;re[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));if(i>=N-1024)td[i-(N-1024)]=Math.max(0,Math.min(255,Math.round(128+v*128)))}
 fft(re,im);
 for(let i=0;i<512;i++){const m=Math.sqrt(re[i]*re[i]+im[i]*im[i])/N*2;prevFd[i]=prevFd[i]*.7+m*.3;fd[i]=Math.max(0,Math.min(255,Math.round((20*Math.log10(Math.max(prevFd[i],1e-9))+100)/70*255)))}
 let s=0;for(let i=0;i<8;i++)s+=fd[i];return{td,fd,bass:s/8/255};
}
function fakeData(t){const td=new Uint8Array(1024),fd=new Uint8Array(512);for(let i=0;i<1024;i++)td[i]=128+Math.sin(i/26+t*3)*34*Math.sin(i/190+t)+Math.sin(i/7+t*5)*8;for(let i=0;i<512;i++)fd[i]=Math.max(8,(1-i/512)*190*(.55+.45*Math.sin(i/9+t*4)));let s=0;for(let i=0;i<8;i++)s+=fd[i];return{td,fd,bass:s/8/255}}
function drawVis(c,st,d,x0,x1,base,ph){
 c.save();c.strokeStyle=c.fillStyle=st.acc;c.lineCap='round';c.lineJoin='round';
 if(st.vis==='wave'||st.vis==='line'){c.lineWidth=st.vis==='line'?2:4;if(st.vis==='wave'){c.shadowColor=st.acc;c.shadowBlur=14}c.beginPath();for(let i=0;i<1024;i+=3){const x=x0+(x1-x0)*i/1024,y=base+(d.td[i]-128)/128*ph;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 else{const n=st.vis==='chunk'?32:72,w=(x1-x0)/n;for(let i=0;i<n;i++){let h=d.fd[Math.floor(Math.pow(i/n,1.6)*300)]/255*ph*1.7+3;if(st.vis==='chunk')h=Math.round(h/12)*12+6;c.fillRect(x0+i*w+w*.15,base-h/2,w*(st.vis==='chunk'?.78:.68),h)}}
 c.restore();
}
function charDraw(c,x,y,w,t,bass){
 if(!hero||!hero.naturalWidth)return;const SRC={x:520,y:0,w:620,h:468},h=w*SRC.h/SRC.w,o=document.createElement('canvas');o.width=SRC.w;o.height=SRC.h;const g=o.getContext('2d');
 g.drawImage(hero,SRC.x,SRC.y,SRC.w,SRC.h,0,0,SRC.w,SRC.h);g.globalCompositeOperation='destination-in';const rg=g.createRadialGradient(SRC.w*.52,SRC.h*.55,SRC.h*.26,SRC.w*.52,SRC.h*.55,SRC.h*.76);rg.addColorStop(0,'#000');rg.addColorStop(.7,'#000');rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,SRC.w,SRC.h);
 c.drawImage(o,x,y+bass*H*.012,w,h);
}
function mixFrame(c,st,L,k,tl,tg,tot,d,opts){
 const u=H/720,cur=L[k],id=cur.b.id,pulse=1+d.bass*.025;
 c.fillStyle='#050507';c.fillRect(0,0,W,H);
 const bd=blurBd(id);if(bd){c.drawImage(bd,0,0,W,H);const f=M.fade;if(k>0&&tl<f){const pb=blurBd(L[k-1].b.id);if(pb){c.globalAlpha=1-tl/f;c.drawImage(pb,0,0,W,H);c.globalAlpha=1}}}
 c.fillStyle=st.tint;c.fillRect(0,0,W,H);
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,.7)');c.fillStyle=g;c.fillRect(0,0,W,H);
 if(st.grid){c.save();c.strokeStyle=st.acc2;c.globalAlpha=.35;c.lineWidth=1.5;const hy=H*.72;for(let i=-14;i<=14;i++){c.beginPath();c.moveTo(W/2+i*40,hy);c.lineTo(W/2+i*190,H);c.stroke()}for(let q=1;q<8;q++){const y=hy+(H-hy)*Math.pow(q/8,1.8);c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}c.restore()}
 const font=st.font,center=st.center,cs=center?H*.5:H*.56,cx=center?(W-cs)/2:W*.06,cy=center?H*.14:H*.2;
 const im=M.cov[id];
 if(st.scene){sceneDraw(c,st,cx,cy,cs,im,tg,d,Math.min(1,tl/Math.max(1,cur.dur)))}else{
 c.save();c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=36*u;c.shadowOffsetY=12*u;c.fillStyle='#000';c.translate(cx+cs/2,cy+cs/2);c.scale(pulse,pulse);c.fillRect(-cs/2,-cs/2,cs,cs);c.shadowColor='transparent';
 if(im&&im.naturalWidth){if(st.pix){const px=document.createElement('canvas');px.width=px.height=56;px.getContext('2d').drawImage(im,0,0,56,56);c.imageSmoothingEnabled=false;c.drawImage(px,-cs/2,-cs/2,cs,cs);c.imageSmoothingEnabled=true}else{c.beginPath();c.rect(-cs/2,-cs/2,cs,cs);c.clip();coverFit(c,im,-cs/2,-cs/2,cs,cs)}}
 c.restore();c.lineWidth=2*u;c.strokeStyle=st.acc;c.globalAlpha=.9;c.strokeRect(cx-8*u,cy-8*u,cs+16*u,cs+16*u);c.globalAlpha=1;}
 const tx=center?W/2:W*.52,tw=center?W*.8:W*.42,al=center?'center':'left';
 c.textBaseline='top';c.textAlign=al;
 /* header: mix title */
 let px=fitPx(c,M.title.toUpperCase(),font,center?W*.7:W*.46,center?44*u:40*u);c.font=px+'px '+font;c.fillStyle='rgba(255,255,255,.92)';c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=10;c.fillText(M.title.toUpperCase(),center?W/2:W*.06,H*.055);c.shadowColor='transparent';
 c.font='600 '+16*u+'px Oswald';if('letterSpacing' in c)c.letterSpacing='5px';c.fillStyle=st.acc;c.textAlign=center?'center':'left';c.fillText('MZPRD  •  '+L.length+' '+(L.length>1?K().MANY:K().ONE),center?W/2:W*.06,H*.055+px*1.15);
 /* now playing */
 c.textAlign=al;const ny=center?cy+cs+H*.04:H*.2;
 c.font='600 '+15*u+'px Oswald';c.fillStyle=st.acc;c.fillText('NOW PLAYING  '+String(k+1).padStart(2,'0')+' / '+String(L.length).padStart(2,'0'),tx,ny);
 if('letterSpacing' in c)c.letterSpacing='0px';
 const tt=cur.b.title.toUpperCase();px=fitPx(c,tt,font,tw,center?50*u:58*u);c.font=px+'px '+font;c.fillStyle='#fff';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=14;c.fillText(tt,tx,ny+22*u);c.shadowColor='transparent';
 const meta=[cur.b.bpm&&cur.b.bpm+' BPM',cur.b.musical_key].filter(Boolean).join('   •   ');
 if(meta){c.font='600 '+17*u+'px Oswald';if('letterSpacing' in c)c.letterSpacing='3px';c.fillStyle='#ffd34a';c.fillText(meta,tx,ny+22*u+px*1.1);if('letterSpacing' in c)c.letterSpacing='0px'}
 /* tracklist */
 if(!center){const R=6,rh=H*.07,ly=H*.46,start=Math.max(0,Math.min(k-2,L.length-R));
  for(let r=0;r<R&&start+r<L.length;r++){const i=start+r,y=ly+r*rh,on=i===k;
   c.fillStyle=on?'rgba(255,255,255,.08)':'rgba(255,255,255,0)';c.fillRect(W*.52,y,W*.42,rh-4*u);if(on){c.fillStyle=st.acc;c.fillRect(W*.52,y,4*u,rh-4*u)}
   c.font=(on?'700 ':'500 ')+19*u+'px Oswald';c.textAlign='left';c.fillStyle=on?'#fff':'rgba(255,255,255,.55)';c.fillText(String(i+1).padStart(2,'0')+'   '+L[i].b.title.toUpperCase(),W*.535,y+rh*.2);
   c.textAlign='right';c.font='500 '+16*u+'px Oswald';c.fillText(fmt(L[i].dur),W*.935,y+rh*.24)}}
 /* visualizer + progress */
 if(st.vis!=='radial')drawVis(c,st,d,W*.06,W*.94,H*.9,H*.05*(st.vis==='line'?1.6:1));
 c.fillStyle='rgba(255,255,255,.18)';c.fillRect(W*.06,H*.965,W*.88,3*u);c.fillStyle=st.acc;c.fillRect(W*.06,H*.965,W*.88*Math.min(1,tg/tot),3*u);
 c.font='500 '+14*u+'px Oswald';c.textAlign='left';c.fillStyle='rgba(255,255,255,.7)';c.fillText(fmt(tg),W*.06,H*.935);c.textAlign='right';c.fillText(fmt(tot),W*.94,H*.935);
 if(M.char&&!center)charDraw(c,W*.77,H*.015,W*.2,tg,d.bass);
 if(st.stamp){c.font='600 '+16*u+'px Oswald';c.textAlign='right';c.fillStyle='#ff4040';c.fillText('● REC  '+fmt(tg),W*.96,H*.935-0)}
 /* finishing */
 if(st.bars){c.fillStyle='#000';c.fillRect(0,0,W,H*.035);c.fillRect(0,H*.965,W,H*.035)}
 if(st.scan){c.fillStyle='rgba(0,0,0,.22)';for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1.5)}
 const vg=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H);
 if(st.grain){if(!noise){noise=document.createElement('canvas');noise.width=noise.height=192;const nx=noise.getContext('2d'),dd=nx.createImageData(192,192);for(let i=0;i<dd.data.length;i+=4){const v=Math.random()*255;dd.data[i]=dd.data[i+1]=dd.data[i+2]=v;dd.data[i+3]=255}nx.putImageData(dd,0,0)}
  c.save();c.globalCompositeOperation='overlay';c.globalAlpha=st.grain;c.translate(-Math.random()*192,-Math.random()*192);c.fillStyle=c.createPattern(noise,'repeat');c.fillRect(0,0,W+192,H+192);c.restore()}
 if(opts&&opts.outro&&window.MZEndCard){const ecd=6,e=tg-(tot-ecd);if(e>=0&&k===L.length-1)window.MZEndCard(c,W,H,e,ecd)}
}

/* ---------- video formats: MIX (playlist), COUNTDOWN (top N), VERSUS (A vs B), GIVEAWAY (free loop Short, 9:16) ---------- */
const FMTS={mix:{n:'MIX'},count:{n:'COUNTDOWN',clip:15,max:10},vs:{n:'PACK vs PACK',clip:20,max:2},give:{n:'FREE LOOP SHORT',clip:30,max:1,vert:1},rate:{n:'RATE IT 1-10',clip:12,max:10},speed:{n:'SPEED VERSIONS',max:3}};
const FM=()=>FMTS[M.fmt||'mix'];
const KP=()=>({beats:'Beats',packs:'Sample Packs',samples:'Samples'})[M.kind],K1=()=>({beats:'Beat',packs:'Pack',samples:'Sample'})[M.kind];
function setFmt(f){if(M.busy)return;pvStop(true);M.fmt=f;const v=!!FM().vert;W=v?720:1280;H=v?1280:720;bdc={};PVB=null;const cv=$m('#mxPv');cv.width=W;cv.height=H;cv.style.width=v?'auto':'100%';cv.style.maxHeight=v?'70vh':'';cv.style.margin=v?'0 auto':'';
 const mx=FM().max;if(mx&&M.sel.length>mx)M.sel=M.sel.slice(0,mx);box.querySelectorAll('#mxFmt button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));{const T=THM[f]&&THM[f]();$m('#mxVsW').style.display=T?'block':'none';$m('#mxDealW').style.display=f==='rate'||f==='speed'?'block':'none';$m('#mxThH').textContent=f==='vs'?'BATTLE THEME':'THEME';if(T){M.th=M.th||{};const cur=M.th[f]||Object.keys(T)[0];$m('#mxVsT').innerHTML=Object.keys(T).map(k=>`<button class="btn${k===cur?' on':''}" data-v="${k}">${T[k].n}</button>`).join('')}}
 const hint=$m('#mxFmtHint');if(hint)hint.textContent={mix:'Pick tracks in order. Aim for 10 to 15 minutes.',count:'Pick up to 10 in order: your #1 last. Each plays its best 15 seconds.',vs:'Pick 2. Each plays its best 20 seconds, then a "comment A or B" vote card.',give:'Pick 1 loop. Makes a 9:16 Short (about 30 seconds) for a free download post.',rate:'Pick up to 10. Tap the score next to each one in YOUR MIX to set it (1 to 10). Ends on a sales card.',speed:'Pick 1 to 3. Each plays normal, slowed + reverb, then sped up. Ends on a sales card.'}[f];
 M.title=f==='rate'?'Rating '+KP()+' 1-10':f==='speed'?'Normal vs Slowed vs Sped Up':f==='mix'?K().title:f==='count'?'Top '+Math.max(3,M.sel.length||10)+' '+KP():f==='vs'?K1()+' Battle':'Free Loop';if($m('#mxTitle'))$m('#mxTitle').value=M.title;M.gen=null;ui();preview();genAll()}
/* the strongest stretch of a track (by loudness), so clips start on the good part */
function bestStart(buf,len){if(!len||buf.duration<=len+.5)return 0;const d=buf.getChannelData(0),sr=buf.sampleRate,hop=Math.floor(sr/4),n=Math.floor(d.length/hop),e=new Float32Array(n);for(let i=0;i<n;i++){let s=0;for(let j=i*hop,z=j+hop;j<z;j+=8)s+=d[j]*d[j];e[i]=s}
 const w=Math.floor(len*4);let best=0,bi=0,cur=0;for(let i=0;i<n;i++){cur+=e[i];if(i>=w)cur-=e[i-w];if(i>=w-1&&cur>best){best=cur;bi=i-w+1}}return Math.min(bi*hop/sr,buf.duration-len)}
function ease(x){x=Math.max(0,Math.min(1,x));return 1-Math.pow(1-x,3)}
function bgFor(c,id,st){c.fillStyle='#050507';c.fillRect(0,0,W,H);const bd=blurBd(id);if(bd)c.drawImage(bd,0,0,W,H);c.fillStyle=st.tint;c.fillRect(0,0,W,H)}
function finish(c,st){const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H)}
/* readable on any style: dark ink on light colours, a soft shadow behind light text */
function lum(h){const m=/^#?([0-9a-f]{6})/i.exec(String(h||''));if(!m)return 1;const n=parseInt(m[1],16);return(.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255}
function ink(col){return lum(col)>.62?'#0b0b0d':'#ffffff'}
function txt(c,s,x,y,px,font,col,al,ls){c.save();c.font=px+'px '+font;c.fillStyle=col;c.textAlign=al||'left';c.textBaseline='alphabetic';if('letterSpacing' in c)c.letterSpacing=(ls||0)+'px';if(lum(col)>.45){c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=Math.max(6,px*.18)}c.fillText(s,x,y);c.restore()}
function cov(c,im,x,y,s,st,glow){c.save();c.shadowColor=glow?st.acc:'rgba(0,0,0,.8)';c.shadowBlur=glow?40:36;c.fillStyle='#000';c.fillRect(x,y,s,s);c.restore();coverSq(c,im,x,y,s)}
/* COUNTDOWN */
function countFrame(c,st,L,k,tl,tg,tot,d){const u=H/720,cur=L[k],id=cur.b.id,rank=L.length-k,im=M.cov[id],f=st.font,b=d.bass||0;bgFor(c,id,st);
 const e=ease(tl/.7),cs=H*.56,cx=W*.5,cy=H*.17;txt(c,M.title.toUpperCase(),W*.06,H*.1,fitPx(c,M.title.toUpperCase(),f,W*.6,40*u),f,'rgba(255,255,255,.92)');txt(c,'MZPRD  •  RANKED',W*.06,H*.1+26*u,15*u,'Oswald',st.acc,'left',5);
 c.save();c.globalAlpha=e;const np=(H*.5)*(1.4-.4*e);c.shadowColor=st.acc;c.shadowBlur=30*u*(rank===1?2:1);txt(c,'#'+rank,W*.06,H*.62+np*.15,np,f,rank===1?'#ffd34a':'#fff');c.restore();
 c.save();c.globalAlpha=ease((tl-.2)/.6);cov(c,im,cx+(1-e)*W*.06,cy,cs*(1+b*.015),st,rank===1);c.restore();
 const tt=cur.b.title.toUpperCase();txt(c,tt,cx,cy+cs+H*.075,fitPx(c,tt,f,W*.44,46*u),f,'#fff');
 const n=L.length,bw=W*.88/n;for(let i=0;i<n;i++){c.fillStyle=i<k?st.acc:i===k?'#fff':'rgba(255,255,255,.18)';c.fillRect(W*.06+i*bw+2,H*.93,bw-4,5*u);if(i===k){c.fillStyle=st.acc;c.fillRect(W*.06+i*bw+2,H*.93,(bw-4)*Math.min(1,tl/Math.max(1,cur.dur)),5*u)}}
 txt(c,'#'+n+' TO #1',W*.94,H*.91,15*u,'Oswald','rgba(255,255,255,.6)','right',4);drawVis(c,st,d,W*.5,W*.94,H*.86,H*.035);finish(c,st)}
/* PACK vs PACK themes: each side gets its own team colour, the split is diagonal, energy bars move with the music */
const VST={fight:{n:'FIGHT NIGHT',a:'#ff2d3d',b:'#2d7bff',bg:'#07070a',badge:'#ffd34a'},neon:{n:'NEON ARENA',a:'#ff3df2',b:'#35e0ff',bg:'#06001a',badge:'#ffffff',grid:1},gold:{n:'GOLD vs SILVER',a:'#e8b94a',b:'#cfd6e0',bg:'#0a0805',badge:'#fff3c4'},
 street:{n:'STREET',a:'#f2c230',b:'#ffffff',bg:'#0b0b0b',badge:'#f2c230',hazard:1},vinyl:{n:'VINYL CLASH',a:'#e0242f',b:'#e8e8ee',bg:'#08080a',badge:'#e0242f',rec:1}};
const VE={a:0,b:0};
function vsFrame(c,st,L,k,tl,tg,tot,d){const T=thOf('vs'),u=H/720,f=st.font,bass=d.bass||0,cur=L[k],sl=W*.06;
 VE[k?'b':'a']=VE[k?'b':'a']*.85+bass*.15;VE[k?'a':'b']*=.97;
 c.fillStyle=T.bg;c.fillRect(0,0,W,H);
 const side=(s,draw)=>{c.save();c.beginPath();if(s===0){c.moveTo(0,0);c.lineTo(W/2+sl,0);c.lineTo(W/2-sl,H);c.lineTo(0,H)}else{c.moveTo(W/2+sl,0);c.lineTo(W,0);c.lineTo(W,H);c.lineTo(W/2-sl,H)}c.closePath();c.clip();draw();c.restore()};
 for(let s=0;s<2;s++){const o=L[s];if(!o)continue;const col=s?T.b:T.a,on=s===k;side(s,()=>{const bd=blurBd(o.b.id);if(bd){c.globalAlpha=on?.55:.25;c.drawImage(bd,0,0,W,H);c.globalAlpha=1}
   const g=c.createLinearGradient(s?W:0,0,W/2,0);g.addColorStop(0,col+(on?'66':'26'));g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.fillStyle=on?'rgba(0,0,0,.25)':'rgba(0,0,0,.6)';c.fillRect(0,0,W,H);
   if(T.grid){c.strokeStyle=col;c.globalAlpha=.25;c.lineWidth=1.5;const hy=H*.74;for(let i=-12;i<=12;i++){c.beginPath();c.moveTo((s?W*.75:W*.25)+i*30,hy);c.lineTo((s?W*.75:W*.25)+i*140,H);c.stroke()}c.globalAlpha=1}
   if(T.hazard){c.save();c.globalAlpha=.18;c.fillStyle=col;for(let x=-H;x<W;x+=60){c.beginPath();c.moveTo(x,H);c.lineTo(x+30,H);c.lineTo(x+30+H*.12,H*.88);c.lineTo(x+H*.12,H*.88);c.fill()}c.restore()}})}
 /* the divider */
 c.save();c.shadowColor='#fff';c.shadowBlur=20*u;c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=4*u;c.beginPath();c.moveTo(W/2+sl,0);c.lineTo(W/2-sl,H);c.stroke();c.restore();
 for(let s=0;s<2;s++){const o=L[s];if(!o)continue;const col=s?T.b:T.a,on=s===k,cx=s?W*.75:W*.25,cs=H*.44*(on?1+bass*.025:.9),cy=H*.47,im=M.cov[o.b.id];
  c.save();c.globalAlpha=on?1:.55;
  if(T.rec){const R=cs*.6;c.save();c.translate(cx,cy);c.rotate(on?tl*3.4:0);const rec=SCI['crate-record'];c.shadowColor=col;c.shadowBlur=on?40*u:0;if(rec)c.drawImage(rec,-R,-R,R*2,R*2);else{c.fillStyle='#050505';c.beginPath();c.arc(0,0,R,0,6.283);c.fill()}c.beginPath();c.arc(0,0,R*.36,0,6.283);c.clip();coverSq(c,im,-R*.36,-R*.36,R*.72);c.restore()}
  else{c.shadowColor=on?col:'rgba(0,0,0,.8)';c.shadowBlur=on?50*u:30*u;c.fillStyle='#000';c.fillRect(cx-cs/2,cy-cs/2,cs,cs);c.shadowColor='transparent';coverSq(c,im,cx-cs/2,cy-cs/2,cs);c.strokeStyle=col;c.lineWidth=(on?6:3)*u;c.strokeRect(cx-cs/2-8*u,cy-cs/2-8*u,cs+16*u,cs+16*u)}
  c.restore();
  /* team letter + name */
  txt(c,s?'B':'A',s?W*.94:W*.06,H*.2,120*u,f,on?col:col+'66',s?'right':'left');
  const tt=o.b.title.toUpperCase();txt(c,tt,cx,cy+cs*.62+H*.07,fitPx(c,tt,f,W*.38,46*u),f,on?'#fff':'rgba(255,255,255,.55)','center');
  txt(c,on?'NOW PLAYING':'ROUND '+(s+1),cx,cy+cs*.62+H*.115,14*u,'Oswald',on?col:'rgba(255,255,255,.4)','center',6);
  /* energy bar (fills with the music) */
  const bw=W*.36,bx=s?W*.6:W*.04,by=H*.88,lv=Math.min(1,(s?VE.b:VE.a)*1.6+(s<k||(s===k&&tl>1)?.25:0));c.fillStyle='rgba(255,255,255,.12)';c.fillRect(bx,by,bw,14*u);c.save();c.shadowColor=col;c.shadowBlur=14*u;c.fillStyle=col;const w2=bw*lv;c.fillRect(s?bx+bw-w2:bx,by,w2,14*u);c.restore();
  txt(c,'ENERGY',s?bx+bw:bx,by-8*u,12*u,'Oswald','rgba(255,255,255,.6)',s?'right':'left',4)}
 /* VS emblem */
 const r=64*u*(1+bass*.1),ex=W/2,ey=H*.47;c.save();c.translate(ex,ey);c.rotate(-.08);c.shadowColor=T.badge;c.shadowBlur=40*u;c.fillStyle='#000';c.beginPath();for(let i=0;i<8;i++){const a=i/8*6.283,rr=i%2?r*.78:r*1.12;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.strokeStyle=T.badge;c.lineWidth=5*u;c.stroke();c.restore();
 txt(c,'VS',ex,ey+22*u,64*u,f,T.badge,'center');
 txt(c,M.title.toUpperCase(),W/2,H*.075,fitPx(c,M.title.toUpperCase(),f,W*.5,34*u),f,'#fff','center');txt(c,'ROUND '+(k+1)+' OF 2',W/2,H*.075+22*u,13*u,'Oswald',T.badge,'center',6);
 drawVis(c,Object.assign({},st,{acc:k?T.b:T.a}),d,k?W*.6:W*.04,k?W*.96:W*.4,H*.955,H*.02);
 /* vote card */
 if(k===L.length-1&&cur&&tl>cur.dur-4.5){const a=ease((tl-(cur.dur-4.5))/.6);c.save();c.globalAlpha=a*.9;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=a;
  txt(c,'WHO WON?',W/2,H*.36,110*u,f,'#fff','center');const bw=W*.3,bh=90*u,by=H*.47;[[0,T.a,'A'],[1,T.b,'B']].forEach(([s,col,lt])=>{const bx=s?W/2+20*u:W/2-20*u-bw;c.save();c.shadowColor=col;c.shadowBlur=30*u;c.fillStyle=col;c.fillRect(bx,by,bw,bh);c.restore();txt(c,'COMMENT '+lt,bx+bw/2,by+bh*.66,44*u,f,'#0b0b0d','center')});
  txt(c,(L[0]?L[0].b.title.toUpperCase():'')+'   vs   '+(L[1]?L[1].b.title.toUpperCase():''),W/2,by+bh+H*.08,22*u,'Oswald','rgba(255,255,255,.75)','center',3);c.restore()}
 finish(c,st)}
/* FREE LOOP GIVEAWAY (9:16) */
function giveFrame(c,st,L,k,tl,tg,tot,d){const u=W/720,cur=L[k],id=cur.b.id,f=st.font,b=d.bass||0,im=M.cov[id];bgFor(c,id,st);
 const p=.5+.5*Math.sin(tl*5);c.save();c.fillStyle=st.acc;c.shadowColor=st.acc;c.shadowBlur=30*u*(.6+p*.4);const bw=W*.84,bh=150*u,bx=(W-bw)/2,by=H*.07;c.fillRect(bx,by,bw,bh);c.restore();{const fp=fitPx(c,'FREE LOOP',f,bw*.88,120*u);txt(c,'FREE LOOP',W/2,by+bh/2+fp*.36,fp,f,ink(st.acc),'center')}
 const cs=W*.78*(1+b*.025),cx=(W-cs)/2,cy=H*.24;cov(c,im,cx,cy,cs,st,true);{const g=c.createLinearGradient(0,cy+cs,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.25,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,.75)');c.fillStyle=g;c.fillRect(0,cy+cs,W,H-cy-cs)}const tt=cur.b.title.toUpperCase();txt(c,tt,W/2,cy+cs+H*.075,fitPx(c,tt,f,W*.86,84*u),f,'#fff','center');
 txt(c,'ROYALTY FREE  •  MZPRD',W/2,cy+cs+H*.115,26*u,'Oswald',lum(st.acc)<.3?'#fff':st.acc,'center',5);
 const py=H*.8,pw=W*.84,ph=78*u;c.fillStyle='#fff';c.beginPath();c.roundRect?c.roundRect((W-pw)/2,py,pw,ph,ph/2):c.rect((W-pw)/2,py,pw,ph);c.fill();{const dp=fitPx(c,'DOWNLOAD IN DESCRIPTION ↓',f,pw*.86,34*u);txt(c,'DOWNLOAD IN DESCRIPTION ↓',W/2,py+ph/2+dp*.36,dp,f,'#0b0b0d','center')}
 drawVis(c,st,d,W*.08,W*.92,H*.9,H*.025);const left=Math.max(0,cur.dur-tl);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(W*.08,H*.955,W*.84,8*u);c.fillStyle=st.acc;c.fillRect(W*.08,H*.955,W*.84*(1-left/Math.max(1,cur.dur)),8*u);finish(c,st)}
/* ---------- RATE IT 1-10 and SPEED VERSIONS: themes built from the real cut-out photos (MPC, iPod, speakers, record, sleeve) ---------- */
['mpc/pk2/speaker.webp','mpc/pk3/sleeve.webp'].forEach(f=>{const i=new Image();i.onload=()=>{SCI[f.split('/').pop().split('.')[0]]=i};i.src=new URL(f+'?v=1',document.baseURI).href});
const RT={mpc:{n:'MPC PADS',bg:'#07070a',led:'#ff3040',a:'#ff3040'},ipod:{n:'IPOD',bg:'#08080a',led:'#e8e8ee',a:'#e0242f'},speakers:{n:'STUDIO SPEAKERS',bg:'#070708',led:'#ffd34a',a:'#e0242f'}};
const SPT={turntable:{n:'TURNTABLE',bg:'#09080a',a:'#e0242f',b:'#ffd34a'},ipod:{n:'IPOD',bg:'#08080a',a:'#e8e8ee',b:'#e0242f'},mpc:{n:'MPC',bg:'#07070a',a:'#ff3040',b:'#ffd34a'}};
const SPM={n:{lab:'NORMAL',rate:1,sec:10,rv:0},s:{lab:'SLOWED + REVERB',rate:.8,sec:12,rv:1},f:{lab:'SPED UP',rate:1.25,sec:8,rv:0}};
const THM={vs:()=>VST,rate:()=>RT,speed:()=>SPT};
const thOf=f=>{const T=THM[f]&&THM[f]();return T?T[(M.th&&M.th[f])||Object.keys(T)[0]]:null};
const thKey=f=>{const T=THM[f]&&THM[f]();return T?((M.th&&M.th[f])||Object.keys(T)[0]):''};
const rateOf=(id,i,n)=>M.rate&&M.rate[id]!=null?M.rate[id]:Math.max(1,10-i);
const scoreCol=v=>v>=10?'#ffd34a':v>=8?'#3ad07a':v>=6?'#e8e8ee':v>=4?'#ff9f1a':'#ff3b30';
const priceOf=b=>{const p=Number(b&&b.price);return p>0?'$'+p.toFixed(2):''};
function shotImg(c,I,x,y,w,u){if(!I)return 0;const h=I.height*w/I.width;c.save();c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=40*u;c.shadowOffsetY=16*u;c.drawImage(I,x,y,w,h);c.restore();return h}
/* the closing sales card: price, optional coupon, link */
function salesCard(c,st,a,b,title,line){const u=Math.min(W,H)/720,v=H>W,f=st.font,D=M.deal||{};c.save();c.globalAlpha=a*.93;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=a;
 const cs=v?W*.56:H*.46,cx=v?(W-cs)/2:W*.1,cy=v?H*.16:H*.27;cov(c,M.cov[b.id],cx,cy,cs,st,true);
 const tx=v?W/2:W*.58,al=v?'center':'left';let y=v?cy+cs+H*.07:H*.3;txt(c,line,tx,y,fitPx(c,line,f,v?W*.9:W*.38,v?64*u:56*u),f,'#fff',al);y+=v?H*.05:H*.09;
 txt(c,String(title).toUpperCase(),tx,y,fitPx(c,String(title).toUpperCase(),f,v?W*.86:W*.38,v?44*u:40*u),f,lum(st.acc)<.3?'#fff':st.acc,al);y+=v?H*.06:H*.1;
 const pr=priceOf(b);if(D.code&&D.off){const sale=Number(b.price)>0?'$'+(Number(b.price)*(1-D.off/100)).toFixed(2):'';txt(c,D.off+'% OFF  •  CODE '+String(D.code).toUpperCase(),tx,y,v?40*u:36*u,f,'#ffd34a',al);y+=v?H*.045:H*.075;if(pr){c.font=28*u+'px Oswald';const pw=c.measureText(pr).width,px0=v?tx-pw/2-50*u:tx;txt(c,pr,px0,y,28*u,'Oswald','rgba(255,255,255,.5)','left');c.fillStyle='#ff3b30';c.fillRect(px0,y-11*u,pw,3*u);if(sale)txt(c,sale,px0+pw+18*u,y,40*u,f,'#fff','left')}y+=v?H*.04:H*.07;if(D.ends){txt(c,'ENDS IN '+String(D.ends).toUpperCase(),tx,y,22*u,'Oswald','#ff6b6b',al,4);y+=v?H*.04:H*.065}}
 else if(pr){txt(c,pr,tx,y,v?56*u:52*u,f,'#fff',al);y+=v?H*.06:H*.09}
 const bc=lum(st.acc)>.62||lum(st.acc)<.25?'#e0242f':st.acc,bw=v?W*.82:W*.34,bh=(v?90:74)*u,bx=v?(W-bw)/2:tx;c.save();c.shadowColor=bc;c.shadowBlur=30*u;c.fillStyle=bc;c.fillRect(bx,y,bw,bh);c.restore();
 const ct='LINK IN DESCRIPTION ↓',cp=fitPx(c,ct,f,bw*.86,(v?40:34)*u);txt(c,ct,bx+bw/2,y+bh/2+cp*.36,cp,f,ink(bc),'center');c.restore()}
/* RATE IT */
function rateFrame(c,st,L,k,tl,tg,tot,d){const T=thOf('rate'),th=thKey('rate'),u=H/720,f=st.font,cur=L[k],b=cur.b,v=rateOf(b.id,k,L.length),bass=d.bass||0,D=cur.dur,rs=Math.max(1,D-3.2),rp=ease((tl-rs)/1.4),shown=Math.round(v*rp),col=scoreCol(v);
 c.fillStyle=T.bg;c.fillRect(0,0,W,H);const bd=blurBd(b.id);if(bd){c.globalAlpha=.35;c.drawImage(bd,0,0,W,H);c.globalAlpha=1}c.fillStyle='rgba(0,0,0,.45)';c.fillRect(0,0,W,H);
 txt(c,M.title.toUpperCase(),W*.05,H*.09,fitPx(c,M.title.toUpperCase(),f,W*.55,38*u),f,'#fff');txt(c,'RATING '+(k+1)+' OF '+L.length,W*.05,H*.09+24*u,14*u,'Oswald',T.led,'left',6);
 const cs=H*.5*(1+bass*.02),cx=W*.05,cy=H*.2;cov(c,M.cov[b.id],cx,cy,cs,st,rp>=1&&v>=9);const tt=b.title.toUpperCase();txt(c,tt,cx,cy+cs+H*.08,fitPx(c,tt,f,W*.4,48*u),f,'#fff');
 const big=rp>0?String(shown):'?',gx=W*.5,gw=W*.46;
 if(th==='mpc'){const I=SCI.mpc,w=gw*.68,x=gx+(gw-w)/2,h=shotImg(c,I,x,H*.13,w,u),sc=w/649,y=H*.13;if(I){const sx=x+20*sc,sy=y+70*sc,sw=406*sc,sh=222*sc;c.fillStyle='#0b0b0d';c.fillRect(sx,sy,sw,sh);txt(c,'SCORE',sx+sw/2,sy+sh*.2,18*u,'Oswald',T.led,'center',6);txt(c,big+(rp>0?'/10':''),sx+sw/2,sy+sh*.8,sh*.55,f,rp>0?col:'rgba(255,255,255,.25)','center');
   const lit=Math.round(16*v/10*rp),pw=277*sc/4,ph=282*sc/4;c.save();c.globalCompositeOperation='screen';for(let r=0;r<4;r++)for(let q=0;q<4;q++){const n=(3-r)*4+q;if(n>=lit)continue;c.globalAlpha=.85;c.fillStyle=n>=14?'#ffd34a':T.a;c.shadowColor=c.fillStyle;c.shadowBlur=pw*.6;c.fillRect(x+83*sc+q*pw+pw*.1,y+348*sc+r*ph+ph*.08,pw*.8,ph*.72)}c.restore()}}
 else if(th==='ipod'){const I=SCI.ipod,h=H*.66,w=I?I.width*h/I.height:0,x=gx+gw/2-w/2,y=H*.14;if(I){c.fillStyle='#0b0b0d';c.fillRect(x+w*.06,y+h*.04,w*.88,h*.39);txt(c,'NOW RATING',x+w/2,y+h*.1,14*u,'Oswald','rgba(255,255,255,.6)','center',4);txt(c,big+(rp>0?'/10':''),x+w/2,y+h*.33,h*.2,f,rp>0?col:'rgba(255,255,255,.25)','center');shotImg(c,I,x,y,w,u);
   c.save();c.globalCompositeOperation='screen';c.globalAlpha=rp*(.5+bass*.5);const g=c.createRadialGradient(x+w/2,y+h*.735,0,x+w/2,y+h*.735,w*.32);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x,y+h*.5,w,h*.5);c.restore()}}
 else{const I=SCI.speaker,sh=H*.5*(1+bass*.03),sw=I?I.width*sh/I.height:0;if(I){shotImg(c,I,gx,H*.25,sw,u);c.save();c.translate(gx+gw,0);c.scale(-1,1);shotImg(c,I,0,H*.25,sw,u);c.restore()}
   const ccx=gx+gw/2;txt(c,'SCORE',ccx,H*.33,18*u,'Oswald',T.led,'center',8);c.save();if(rp>0){c.shadowColor=col;c.shadowBlur=40*u}txt(c,big,ccx,H*.62,H*.3,f,rp>0?col:'rgba(255,255,255,.2)','center');c.restore();txt(c,'/10',ccx,H*.7,36*u,f,'rgba(255,255,255,.55)','center')}
 if(rp>=1){const sa=ease((tl-rs-1.4)/.35);if(sa>0){c.save();c.translate(W*.73,H*.9);c.rotate(-.08);c.scale(1.6-.6*sa,1.6-.6*sa);c.globalAlpha=sa;c.strokeStyle=col;c.lineWidth=5*u;const sw=W*.3,sh=64*u;c.fillStyle='rgba(0,0,0,.6)';c.fillRect(-sw/2,-sh/2,sw,sh);c.strokeRect(-sw/2,-sh/2,sw,sh);const lb=v>=10?'PERFECT 10':v>=8?'CERTIFIED HEAT':v>=6?'SOLID':v>=4?'MID':'SKIP';txt(c,lb,0,sh*.22,fitPx(c,lb,f,sw*.85,42*u),f,col,'center');c.restore()}}
 drawVis(c,Object.assign({},st,{acc:T.led}),d,W*.05,W*.45,H*.975,H*.015);
 const last=k===L.length-1,ce=last?ease((tl-(D-5))/.6):0;if(last&&ce>0){let best=L[0],bv=-1;L.forEach((o,i)=>{const r=rateOf(o.b.id,i,L.length);if(r>bv){bv=r;best=o}});salesCard(c,st,ce,best.b,best.b.title,'THE '+bv+'/10 IS IN')}
 finish(c,st)}
/* SPEED VERSIONS */
function speedFrame(c,st,L,k,tl,tg,tot,d){const T=thOf('speed'),th=thKey('speed'),u=H/720,f=st.font,cur=L[k],b=cur.b,m=SPM[b._mode]||SPM.n,sid=b._sid||b.id,bass=d.bass||0,im=M.cov[sid];
 c.fillStyle=T.bg;c.fillRect(0,0,W,H);const bd=blurBd(sid);if(bd){c.globalAlpha=.32;c.drawImage(bd,0,0,W,H);c.globalAlpha=1}c.fillStyle='rgba(0,0,0,.5)';c.fillRect(0,0,W,H);
 ['n','s','f'].forEach((mk,i)=>{const on=mk===b._mode,x=W*.05+i*W*.15,y=H*.06;c.fillStyle=on?T.a:'rgba(255,255,255,.08)';c.fillRect(x,y,W*.14,40*u);const lb=SPM[mk].lab.replace(' + REVERB','');txt(c,lb,x+W*.07,y+27*u,fitPx(c,lb,'Oswald',W*.12,18*u),'Oswald',on?ink(T.a):'rgba(255,255,255,.6)','center',3)});
 txt(c,M.title.toUpperCase(),W*.95,H*.06+28*u,fitPx(c,M.title.toUpperCase(),f,W*.4,30*u),f,'#fff','right');
 const mx=W*.3,my=H*.55;
 if(th==='turntable'){const SL=SCI.sleeve,R=H*.27;if(SL){const sw=R*2.3,sh=SL.height*sw/SL.width;shotImg(c,SL,mx-sw*.62,my-sh/2,sw,u)}c.save();c.translate(mx+R*.55,my);c.rotate(tl*m.rate*3.49);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=30*u;const rec=SCI['crate-record'];if(rec)c.drawImage(rec,-R,-R,R*2,R*2);c.shadowColor='transparent';c.beginPath();c.arc(0,0,R*.36,0,6.283);c.clip();coverSq(c,im,-R*.36,-R*.36,R*.72);c.restore()}
 else if(th==='ipod'){const I=SCI.ipod,h=H*.76,w=I?I.width*h/I.height:0,x=mx-w/2,y=my-h/2;if(I){c.fillStyle='#000';c.fillRect(x+w*.06,y+h*.04,w*.88,h*.39);c.save();c.beginPath();c.rect(x+w*.07,y+h*.045,w*.86,h*.38);c.clip();coverSq(c,im,x+w*.07,y+h*.045-w*.2,w*.86);c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x+w*.07,y+h*.32,w*.86,h*.105);txt(c,(m.rate===1?'1.0':m.rate)+'x  '+m.lab,x+w/2,y+h*.39,fitPx(c,m.lab,'Oswald',w*.6,20*u),'Oswald','#fff','center',2);c.restore();shotImg(c,I,x,y,w,u)}}
 else{const I=SCI.mpc,w=W*.4,x=mx-w/2,y=H*.18;shotImg(c,I,x,y,w,u);if(I){const sc=w/649,sx=x+20*sc,sy=y+70*sc,sw=406*sc,sh=222*sc;c.save();c.beginPath();c.rect(sx,sy,sw,sh);c.clip();if(im&&im.naturalWidth){const s2=Math.max(sw/im.naturalWidth,sh/im.naturalHeight);c.drawImage(im,sx+sw/2-im.naturalWidth*s2/2,sy+sh/2-im.naturalHeight*s2/2,im.naturalWidth*s2,im.naturalHeight*s2)}c.fillStyle='rgba(0,0,0,.5)';c.fillRect(sx,sy+sh*.7,sw,sh*.3);txt(c,(m.rate===1?'1.0':m.rate)+'x',sx+sw/2,sy+sh*.94,sh*.22,f,T.b,'center');c.restore();
   const beat=(tl*m.rate*2)%1,pw=277*sc/4,ph=282*sc/4;c.save();c.globalCompositeOperation='screen';for(let r=0;r<4;r++)for(let q=0;q<4;q++){const n=r*4+q,on=(Math.floor(tl*m.rate*4)%16)===n||d.fd[4+n*6]/255>.7;if(!on)continue;c.globalAlpha=.85;c.fillStyle=T.a;c.shadowColor=T.a;c.shadowBlur=pw*.5;c.fillRect(x+83*sc+q*pw+pw*.1,y+348*sc+r*ph+ph*.08,pw*.8,ph*.72)}c.restore()}}
 const pop=ease(tl/.5),lx=W*.6;c.save();c.globalAlpha=pop;txt(c,(m.rate===1?'1.0':m.rate)+'x',lx,H*.36,90*u*(1.2-.2*pop),f,T.a===('#e8e8ee')?'#fff':T.a);c.restore();
 txt(c,m.lab,lx,H*.48,fitPx(c,m.lab,f,W*.36,64*u),f,'#fff');const tt=b.title.toUpperCase();txt(c,tt,lx,H*.56,fitPx(c,tt,'Oswald',W*.36,26*u),'Oswald','rgba(255,255,255,.7)','left',3);
 drawVis(c,Object.assign({},st,{acc:T.b}),d,lx,W*.95,H*.7,H*.04);
 c.fillStyle='rgba(255,255,255,.15)';c.fillRect(lx,H*.8,W*.35,6*u);c.fillStyle=T.b;c.fillRect(lx,H*.8,W*.35*Math.min(1,tl/Math.max(1,cur.dur)),6*u);
 const last=k===L.length-1,ce=last?ease((tl-(cur.dur-4.5))/.6):0;if(last&&ce>0)salesCard(c,st,ce,Object.assign({},b,{id:sid}),b.title,'WAV + ALL VERSIONS');
 finish(c,st)}
/* speed versions: each picked item becomes 3 entries (normal, slowed + reverb, sped up) */
function speedList(L){const out=[];L.forEach(b=>['n','s','f'].forEach(m=>out.push(Object.assign({},b,{id:b.id+'#'+m,_sid:b.id,_mode:m}))));return out}
let IR=null;function impulse(ctx){if(IR&&IR.sampleRate===ctx.sampleRate)return IR;const n=Math.floor(ctx.sampleRate*2.4),b=ctx.createBuffer(2,n,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)}IR=b;return b}
function speedChain(ctx,src,m,dest){src.playbackRate.value=m.rate;if(!m.rv){src.connect(dest);return}const dry=ctx.createGain(),wet=ctx.createGain(),cv=ctx.createConvolver();cv.buffer=impulse(ctx);dry.gain.value=.78;wet.gain.value=.42;src.connect(dry);dry.connect(dest);src.connect(cv);cv.connect(wet);wet.connect(dest)}

function frameAny(c,st,L,k,tl,tg,tot,d,opts){if(M.fmt==='rate')return rateFrame(c,st,L,k,tl,tg,tot,d);if(M.fmt==='speed')return speedFrame(c,st,L,k,tl,tg,tot,d);const f=M.fmt||'mix';if(f==='count')return countFrame(c,st,L,k,tl,tg,tot,d);if(f==='vs')return vsFrame(c,st,L,k,tl,tg,tot,d);if(f==='give')return giveFrame(c,st,L,k,tl,tg,tot,d);return mixFrame(c,st,L,k,tl,tg,tot,d,opts)}
/* titles for the new formats */
const MXF={rate:['Rating My {st} {Kp} 1-10 ({y})','I Rated {n} {st} {Kp} (Brutally Honest)','Rate These {st} Loops 1-10 | {T}','{n} {Kp} Rated 1-10: Which Is a 10?','Producer Rates {st} {Kp} 1-10 ({pr} Type)','Is This a 10/10 {K1}? Rating {n} {Kp}','Rating {st} {Kp} Until I Find a 10'],
 speed:['{A} - Normal vs Slowed vs Sped Up','{A} (Slowed + Reverb) vs Sped Up #shorts','{st} Loop: Normal, Slowed + Reverb, Sped Up','Which Version Hits Harder? "{A}" (3 Speeds)','"{A}" Slowed + Reverb ({st} {K1})','{A} Sped Up vs Slowed | {st} Sample {y}'],count:['Top {n} {Kp} {y} (Ranked)','Top {n} {st} {Kp} of {y}','{n} Best {st} {Kp} {y} | #{n} to #1','Ranking My {st} {Kp}: Top {n} ({y})','Top {n} {st} {Kp} for {pr} Type Beats','#1 Will Surprise You: Top {n} {st} {Kp}','Top {n} {Kp} You Need in {y} (Ranked)','The {n} Hardest {st} {Kp} of {y}'],
 vs:['"{A}" vs "{B}" | Which {K1} Wins?','{st} {K1} Battle: {A} vs {B} ({y})','Which Is Harder? {A} vs {B}','{A} or {B}? Comment Your Pick','{K1} vs {K1}: {A} vs {B} | Vote Below','{A} vs {B} ({pr} Type {K1} Battle)','Battle of the {st} {Kp}: {A} vs {B}'],
 give:['FREE {st} Loop {y} - "{A}" (Download Below)','[FREE] {pr} Type Loop - "{A}" #shorts','Free {st} Sample Download {y} | "{A}"','FREE {st} Sample for Your Next Beat #shorts','Free Loop Friday: "{A}" (Royalty Free)','[FREE] {st} Loop / Sample - "{A}" #shorts']};
function fmtTitles(r,st){const L=layout(),n=new Set(L.map(o=>o.b.id)).size||M.sel.length,A=(L[0]&&L[0].b.title)||'A',B=(L[1]&&L[1].b.title)||'B',out=new Map(),T=MXF[M.fmt];
 for(let g=0;g<200&&out.size<10;g++){const t=T[Math.floor(r()*T.length)].replace(/\{n\}/g,Math.max(1,n)).replace(/\{y\}/g,YEAR).replace(/\{Kp\}/g,KP()).replace(/\{K1\}/g,K1()).replace(/\{A\}/g,A).replace(/\{B\}/g,B).replace(/\{st\}/g,st[Math.floor(r()*st.length)]).replace(/\{pr\}/g,MXP[Math.floor(r()*MXP.length)]).replace(/\s+/g,' ').trim().slice(0,100);if(!out.has(t.toLowerCase()))out.set(t.toLowerCase(),{t,s:mxScore(t,M.kind)})}
 return[...out.values()].sort((a,b)=>b.s-a.s)}

/* ---------- audio ---------- */
async function fetchBuf(b){if(window.MZPrime)try{await MZPrime([b.preview_path])}catch(e){}const r=await fetch(pub(b.preview_path));if(!r.ok)throw new Error('audio');return await ctxA().decodeAudioData(await r.arrayBuffer())}
async function track48(b){
 if(b._mode){const m=SPM[b._mode],src=await fetchBuf(b),need=m.sec*m.rate,st0=bestStart(src,Math.min(need,src.duration)),len=Math.min(m.sec,(src.duration-st0)/m.rate),oc=new OfflineAudioContext(2,Math.ceil(len*SR),SR),s=oc.createBufferSource();s.buffer=src;speedChain(oc,s,m,oc.destination);s.start(0,st0,len*m.rate);const rb=await oc.startRendering();return{L:rb.getChannelData(0),R:rb.getChannelData(1),dur:len}}
 const src=await fetchBuf(b),n=Math.ceil(src.duration*SR),oc=new OfflineAudioContext(2,n,SR),s=oc.createBufferSource();s.buffer=src;s.connect(oc.destination);s.start(0);
 const rb=await oc.startRendering();return{L:rb.getChannelData(0),R:rb.getChannelData(1),dur:src.duration};
}
async function loadCover(b){
 if(M.cov[b.id])return;
 await new Promise(r=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{M.cov[b.id]=im;r()};im.onerror=r;im.src=artOf(b,1024)});
}
const PRB={};function probe(b){if(b&&b._sid){const src=M.beats.find(x=>String(x.id)===String(b._sid));if(src)return probe(src)}if(M.dur[b.id])return Promise.resolve();return PRB[b.id]||(PRB[b.id]=(async()=>{M.dur[b.id]=M.dur[b.id]||0;
 try{const s=await fetchBuf(b);M.dur[b.id]=s.duration;M.cs[b.id]={15:bestStart(s,15),20:bestStart(s,20),30:bestStart(s,30)}}catch(e){M.dur[b.id]=0;delete PRB[b.id]}
 await loadCover(b);ui();
})())}

/* ---------- ui ---------- */
function css(){
 if(document.getElementById('mxCss'))return;const s=document.createElement('style');s.id='mxCss';
 s.textContent=`#mixModal{display:none;position:fixed;inset:0;z-index:85;background:rgba(0,0,0,.84);align-items:center;justify-content:center;padding:16px}
#mixModal.on{display:flex}
#mxKind,#mxFmt{display:flex;flex-wrap:wrap;gap:0;margin:0 0 10px;border:1px solid #3a3a40}#mxKind button,#mxFmt button{flex:1;background:transparent;border:0;color:#a9a9ae;font:700 10px Montserrat;letter-spacing:.14em;padding:10px 6px;cursor:pointer}#mxKind button.on,#mxFmt button.on{background:#e0242f;color:#fff}.mxTl{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;max-height:260px;overflow:auto}.mxTl button{display:flex;gap:8px;align-items:center;text-align:left;background:#0c0c0f;border:1px solid #26262b;color:#e9e9ec;font:500 12px Montserrat;padding:7px 9px;cursor:pointer}.mxTl button:hover,.mxTl button.on{border-color:#e0242f}.mxTl b{flex:0 0 30px;font:700 12px Montserrat;color:#0b0b0d;background:#e8b94a;text-align:center;padding:2px 0}.mxTl b.hi{background:#3ad07a}
#mixModal{padding:0!important}.mxSeek{display:flex;align-items:center;gap:12px;margin-top:8px}.mxSk{position:relative;flex:1;height:12px;background:#1d1d22;border:1px solid #2c2c32;border-radius:6px;cursor:pointer}.mxSk b{position:absolute;left:0;top:0;bottom:0;width:0;background:#e0242f;border-radius:6px;box-shadow:0 0 10px rgba(224,36,47,.5)}.mxSk i{position:absolute;top:-4px;bottom:-4px;width:2px;background:#fff;opacity:0;pointer-events:none}.mxSk:hover i{opacity:.8}.mxSk i::after{content:attr(data-t);position:absolute;bottom:20px;left:-20px;font:700 10px Montserrat;color:#fff;background:#000;padding:2px 5px}#mxSkT{font:700 12px Montserrat;color:#fff;min-width:100px;text-align:right}.mxTicks{position:relative;height:22px;margin:4px 112px 0 0}.mxTicks button{position:absolute;transform:translateX(-1px);height:20px;min-width:20px;border:0;border-left:2px solid #e0242f;background:#141418;color:#a9a9ae;font:700 10px Montserrat;cursor:pointer;padding:0 5px}.mxTicks button:hover{color:#fff;background:#2a0b0e}
#mixModal .mb{position:relative;width:100vw;height:100vh;max-height:100vh;overflow:auto;background:#0c0c0f;border:1.5px solid var(--red);box-shadow:0 0 50px rgba(224,36,47,.3);padding:20px}
#mixModal .mx{position:absolute;top:8px;right:10px;width:40px;height:40px;background:transparent;border:1.5px solid #4a4a50;color:#fff;font:400 26px/1 Montserrat;padding:0}
#mixModal .mx:hover{border-color:var(--red);color:var(--red)}
#mixModal h3{font:700 13px Montserrat;letter-spacing:.3em;color:var(--gold);margin:0 0 12px}
#mixModal h4{font:700 11px Montserrat;letter-spacing:.28em;color:var(--gold);margin:16px 0 8px}
#mixModal h4:first-child{margin-top:0}
#mixModal .mg{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr) minmax(250px,320px);gap:16px;align-items:start}
@media(max-width:1000px){#mixModal .mg{grid-template-columns:1fr}}
#mixModal .pn{background:#08080a;border:1px solid #2a2a2e;padding:12px}
#mixModal label{display:block;font:600 10px Montserrat;letter-spacing:.2em;color:#8e8e94;margin:10px 0 5px}
#mixModal input[type=text],#mixModal input[type=number],#mixModal textarea,#mixModal select{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 13px Montserrat}
#mixModal textarea{min-height:80px;resize:vertical}
#mixModal .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.16em;padding:10px 6px}
#mixModal .btn:hover{border-color:#fff}#mixModal .btn.on{background:var(--red);border-color:var(--red)}
#mixModal .go{display:block;width:100%;background:var(--red);border:0;color:#fff;font:700 13px Montserrat;letter-spacing:.3em;padding:15px;margin-top:12px}
#mixModal .go:disabled{opacity:.45}
#mixModal .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#mixModal .row{display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #1d1d21;font:600 11px Montserrat;color:#d9d9dc}
#mixModal .row img,#mixModal .row i{width:34px;height:34px;object-fit:cover;background:#1b1b20;flex:none}
#mixModal .row b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mixModal .row button{background:transparent;border:1px solid #4a4a50;color:#fff;font:700 11px Montserrat;padding:4px 8px}
#mixModal .lst{max-height:210px;overflow:auto;border:1px solid #2a2a2e}
#mixModal canvas#mxPv{width:100%;height:auto;display:block;border:1px solid #2a2a2e;background:#000}
#mixModal .st{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0}
#mixModal .st button{padding:9px 2px;font-size:9px;letter-spacing:.08em}
#mixModal .chk{display:flex;gap:8px;align-items:center;letter-spacing:.08em;margin:7px 0}#mixModal .chk input{width:auto}
#mixModal .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}
#mixModal .bar{height:6px;background:#1b1b20;margin-top:8px}#mixModal .bar b{display:block;height:100%;width:0;background:var(--red)}
#mixModal #mxTh{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#mixModal .thc{background:#050506;border:1px solid #2a2a2e;padding:4px}#mixModal .thc canvas{width:100%;height:auto;display:block;cursor:zoom-in}
#mixModal .thc b{display:block;font:700 8px Montserrat;letter-spacing:.12em;color:#c9c9ce;margin:3px 0}
#mixModal .thc .two button{padding:6px 2px;font-size:8px}`;
 document.head.appendChild(s);
}
function build(){
 css();box=document.createElement('div');box.id='mixModal';box.setAttribute('aria-hidden','true');
 box.innerHTML=`<div class="mb" role="dialog" aria-label="Mix video"><button class="mx" id="mxX" aria-label="Close">&times;</button>
 <h3>MIX VIDEO (10 TO 15 MINUTES)</h3>
 <div class="mg">
  <div><div class="pn"><div class="mxK" id="mxKind"><button data-k="beats" class="on">BEATS</button><button data-k="packs">SAMPLE PACKS</button><button data-k="samples">SINGLE SAMPLES</button></div><h4 id="mxPick">1. PICK YOUR BEATS</h4><div class="lst" id="mxAll"></div>
   <h4>YOUR MIX (IN ORDER)</h4><div class="lst" id="mxSel"></div><div class="msg" id="mxTot"></div><h4 style="margin-top:14px">STYLE</h4><div class="st" id="mxSt"></div><div id="mxVsW" style="display:none"><h4 style="margin-top:14px" id="mxThH">THEME</h4><div class="st" id="mxVsT"></div></div><div id="mxDealW" style="display:none"><h4 style="margin-top:14px">SALES CARD (OPTIONAL)</h4><div class="two"><input type="text" id="mxCode" placeholder="Coupon code"><input type="number" id="mxOff" min="1" max="90" placeholder="% off"></div><input type="text" id="mxEnds" placeholder="Ends in, e.g. 48 hours" style="margin-top:6px"><div class="msg" style="margin-top:6px">Shown on the last card with the price and LINK IN DESCRIPTION.</div></div></div></div>
  <div><div class="pn"><h4>2. FORMAT</h4><div class="mxK" id="mxFmt"><button data-f="mix" class="on">MIX</button><button data-f="count">COUNTDOWN</button><button data-f="vs">PACK vs PACK</button><button data-f="give">FREE LOOP SHORT</button><button data-f="rate">RATE IT 1-10</button><button data-f="speed">SPEED VERSIONS</button></div><div class="msg" id="mxFmtHint" style="margin:-4px 0 10px">Pick tracks in order. Aim for 10 to 15 minutes.</div>
   <canvas id="mxPv" width="1280" height="720"></canvas><div class="mxSeek" id="mxSeek"><div class="mxSk"><b id="mxSkF"></b><i id="mxSkH"></i></div><span id="mxSkT">0:00 / 0:00</span></div><div class="mxTicks" id="mxTicks"></div><div class="two" style="margin-top:6px"><button class="go" id="mxPlay" style="margin:0">&#9654; PLAY PREVIEW</button><button class="btn" id="mxStopB">&#9632; STOP</button></div>
   <label>MIX TITLE</label><input type="text" id="mxTitle">
   <div class="two"><div><label>FADE BETWEEN TRACKS (SEC)</label><input type="number" id="mxFade" min="0" max="4" step="0.5"></div><div><label>&nbsp;</label><button class="btn" id="mxPrev">REFRESH PREVIEW</button></div></div>
   <label class="chk"><input type="checkbox" id="mxRep"> REPEAT THE LIST TO REACH 10 MINUTES</label>
   <input type="checkbox" id="mxChar" style="display:none">
   <label class="chk"><input type="checkbox" id="mxOut" checked> 8-BIT SUBSCRIBE CARD AT THE END</label>
   <button class="go" id="mxRender">RENDER MIX VIDEO</button><div class="bar"><b id="mxProg"></b></div><div class="msg" id="mxMsg">Renders offline (faster than real time). A 15 minute mix is a large file, close other heavy tabs first.</div>
   <a id="mxDl" class="btn" style="display:none;text-align:center;margin-top:8px;text-decoration:none">DOWNLOAD MIX VIDEO</a></div></div>
  <div><div class="pn"><h4>3. PREMADE THUMBNAILS</h4><div class="two"><button class="btn" id="mxThGo">MAKE 5</button><button class="btn" id="mxThNew">NEW SET</button></div><div id="mxTh" style="margin-top:6px"></div>
   <h4>4. YOUTUBE TEXT</h4><button class="go" id="mxGen" style="margin:0 0 8px">GENERATE TITLES, DESCRIPTION + TAGS</button><div id="mxTl" class="mxTl"></div><label>TITLE <span id="mxTi" style="color:#6c6c73"></span></label><input type="text" id="mxYt"><div class="two" style="margin-top:6px"><button class="btn" id="mxYc">COPY</button><button class="btn" id="mxYn">NEXT TITLE</button></div>
   <label>DESCRIPTION WITH CHAPTERS AND LINKS</label><textarea id="mxYd" style="min-height:150px"></textarea><div class="two" style="margin-top:6px"><button class="btn" id="mxYdc">COPY DESCRIPTION</button><button class="btn" id="mxYdn">NEW DESCRIPTION</button></div>
   <label>TAGS</label><textarea id="mxYg"></textarea><button class="btn" id="mxYgc" style="width:100%;margin-top:6px">COPY TAGS</button></div></div>
 </div></div>`;
 document.body.appendChild(box);
 $m('#mxX').onclick=shut;box.onclick=e=>{if(e.target===box)shut()};
 $m('#mxSt').innerHTML=Object.keys(ST).map(k=>`<button class="btn${k===M.style?' on':''}" data-s="${k}">${ST[k].n}</button>`).join('');
 $m('#mxSt').onclick=e=>{const b=e.target.closest('button');if(!b)return;M.style=b.dataset.s;$m('#mxSt').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));preview()};
 $m('#mxTitle').value=M.title;$m('#mxFade').value=M.fade;
 $m('#mxTitle').oninput=e=>{M.title=e.target.value||K().title;preview();genAll()};
 $m('#mxFade').oninput=e=>{M.fade=Math.max(0,Math.min(4,parseFloat(e.target.value)||0))};
 $m('#mxRep').onchange=e=>{M.repeat=e.target.checked;ui()};$m('#mxChar').onchange=e=>{M.char=e.target.checked;preview()};$m('#mxOut').onchange=e=>{M.outro=e.target.checked};
 $m('#mxPrev').onclick=preview;$m('#mxPlay').onclick=()=>{PV.on?pvStop():pvPlay()};{const sk=$m('#mxSeek .mxSk');let drag=false;const at=e=>{const r=sk.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*skTot()};sk.onmousemove=e=>{const h=$m('#mxSkH'),t=at(e);h.style.left=(t/Math.max(1,skTot())*100)+'%';h.dataset.t=fmt(t)};sk.onclick=e=>pvSeek(at(e))}$m('#mxStopB').onclick=()=>pvStop();$m('#mxRender').onclick=render;
 $m('#mxThGo').onclick=()=>thumbs(false);$m('#mxThNew').onclick=()=>thumbs(true);
 $m('#mxYn').onclick=()=>{M.yt++;pickTitle()};$m('#mxGen').onclick=()=>{M.seed2=(M.seed2||0)+1;genAll()};$m('#mxYdn').onclick=()=>{M.dv=(M.dv||0)+1;yt()};
 $m('#mxVsT').onclick=e=>{const b=e.target.closest('button');if(!b)return;M.th=M.th||{};M.th[M.fmt]=b.dataset.v;$m('#mxVsT').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));if(!PV.on)preview()};
 M.deal={};['#mxCode','#mxOff','#mxEnds'].forEach(id=>$m(id).oninput=()=>{M.deal={code:$m('#mxCode').value.trim(),off:+$m('#mxOff').value||0,ends:$m('#mxEnds').value.trim()};if(!PV.on)preview()});
 $m('#mxFmt').onclick=e=>{const b=e.target.closest('button');if(b)setFmt(b.dataset.f)};
 $m('#mxKind').onclick=e=>{const b=e.target.closest('button');if(b)setKind(b.dataset.k)};
 const cp=async(id,btn)=>{try{await navigator.clipboard.writeText($m(id).value);toast('COPIED')}catch(e){$m(id).select();document.execCommand('copy')}};
 $m('#mxYc').onclick=()=>cp('#mxYt');$m('#mxYdc').onclick=()=>cp('#mxYd');$m('#mxYgc').onclick=()=>cp('#mxYg');
}
function shut(){pvStop(true);box.classList.remove('on');box.setAttribute('aria-hidden','true');document.removeEventListener('keydown',key)}
function key(e){if(e.key!=='Escape')return;const lb=document.getElementById('thLb');if(lb){lb.remove();return}shut()}
function ui(){setTimeout(skTicks,0);if(M.fmt==='count'&&M.sel.length&&/^Top \d+ /.test(M.title)){M.title=M.title.replace(/^Top \d+ /,'Top '+M.sel.length+' ');const ti=box&&box.querySelector('#mxTitle');if(ti)ti.value=M.title}
 const all=$m('#mxAll'),sel=$m('#mxSel');
 all.innerHTML=M.beats.length?M.beats.map(b=>{const on=M.sel.includes(String(b.id));return`<div class="row" data-id="${esc(b.id)}"><img src="${esc(artOf(b,96))}" alt="" loading="lazy" decoding="async"><b>${esc(b.title)}${b.preview_path?'':' (no preview)'}</b><button data-a="${on?'rm':'add'}"${b.preview_path?'':' disabled'}>${on?'✓':'+'}</button></div>`}).join(''):'<div class="msg" style="padding:10px">No '+K().many+' yet.</div>';
 all.querySelectorAll('button').forEach(bt=>bt.onclick=()=>{const id=bt.parentNode.dataset.id;if(bt.dataset.a==='add'){M.sel.push(id);if(FM().max&&M.sel.length>FM().max)M.sel=M.sel.slice(-FM().max);const b=M.beats.find(x=>String(x.id)===id);probe(b)}else M.sel=M.sel.filter(x=>x!==id);ui();preview();thumbsAuto();yt()});
 sel.innerHTML=M.sel.length?M.sel.map((id,i)=>{const b=M.beats.find(x=>String(x.id)===id);return`<div class="row" data-i="${i}"><span style="width:18px;color:#8e8e94">${i+1}</span><b>${esc(b.title)}</b><span style="color:#8e8e94">${M.dur[b.id]?fmt(M.dur[b.id]):'...'}</span>${M.fmt==='rate'?`<button data-m="r" title="Tap to change the score" style="color:${scoreCol(rateOf(id,i,M.sel.length))};font-weight:700;min-width:44px">${rateOf(id,i,M.sel.length)}/10</button>`:''}<button data-m="-1">↑</button><button data-m="1">↓</button><button data-m="x">×</button></div>`}).join(''):'<div class="msg" style="padding:10px">Tap + to add beats.</div>';
 sel.querySelectorAll('button').forEach(bt=>bt.onclick=()=>{const i=+bt.parentNode.dataset.i,m=bt.dataset.m;if(m==='r'){M.rate=M.rate||{};const id=M.sel[i],cv=rateOf(id,i,M.sel.length);M.rate[id]=cv<=1?10:cv-1;ui();if(!PV.on)preview();M.gen=null;yt();return}if(m==='x')M.sel.splice(i,1);else{const j=i+ +m;if(j<0||j>=M.sel.length)return;[M.sel[i],M.sel[j]]=[M.sel[j],M.sel[i]]}ui();preview();yt()});
 const t=total(),n=playlist().length;
 const tl=$m('#mxTot');tl.textContent=n?n+' track'+(n>1?'s':'')+' / '+fmt(t)+(M.fmt!=='mix'?'':t<600?'  (under 10 min: add '+K().many+' or tick REPEAT)':t>900?'  (over 15 min)':'  (good length)'):'';
 tl.style.color=n&&t>=600&&t<=900?'#6fd08c':'#a9a9ae';
}
const pvMsg=t=>{const m=box&&box.querySelector('#mxMsg');if(m)m.textContent=t};const PV={on:false,k:0,src:null,an:null,raf:0,t0:0,buf:null};
function preview(){
 if(!box)return;if(PV.on)return;const L=layout(),cv=$m('#mxPv'),c=cv.getContext('2d');
 if(!L.length){c.fillStyle='#000';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#8e8e94';c.font='14px Montserrat';c.textAlign='center';c.fillText('Pick '+K().many+' to preview the style',cv.width/2,cv.height/2);return}
 const k=M.fmt==='speed'?Math.max(0,L.length-2):Math.min(1,L.length-1),big=pvBig();const Ld=L.map(o=>({...o,dur:o.dur||(FM().clip||180)}));frameAny(big.getContext('2d'),ST[M.style],Ld,k,M.fmt==='mix'?12:M.fmt==='rate'?Ld[k].dur-.6:4,Ld[0].dur+4,Math.max(60,total()),fakeData(1.2),{outro:false});
 c.drawImage(big,0,0,cv.width,cv.height);
}
let PVB=null;function pvBig(){if(!PVB){PVB=document.createElement('canvas');PVB.width=W;PVB.height=H}return PVB}
/* PLAY: real audio through an analyser, the frame redrawn live; when a track ends the next one starts */
async function pvPlay(k0,off0){k0=k0||0;off0=off0||0;const L=layout();if(!L.length){pvMsg('Pick '+K().many+' first.');return}pvStop(true);const GEN=PV.gen=(PV.gen||0)+1;PV.on=true;$m('#mxPlay').classList.add('on');$m('#mxPlay').innerHTML='&#9632; STOP';
 const a=ctxA();try{await a.resume()}catch(e){}const go=async k=>{if(!PV.on||PV.gen!==GEN)return;if(k>=L.length)k=0;PV.k=k;pvMsg('Loading '+L[k].b.title+'...');let buf;try{buf=await fetchBuf(L[k].b)}catch(e){pvMsg('Could not load the preview audio for '+L[k].b.title+'.');pvStop();return}if(!PV.on||PV.gen!==GEN)return;pvMsg('');if(PV.src){try{PV.src.onended=null;PV.src.stop()}catch(e){}}
  const s=a.createBufferSource(),an=a.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=.7;s.buffer=buf;const MD=L[k].b._mode&&SPM[L[k].b._mode];if(MD)speedChain(a,s,MD,an);else s.connect(an);an.connect(a.destination);s.onended=()=>{if(PV.on&&PV.src===s&&PV.gen===GEN)go(k+1)};PV.src=s;PV.an=an;PV.buf=buf;PV.t0=a.currentTime-(k===k0?off0:0);if(MD){const st0=bestStart(buf,Math.min(MD.sec*MD.rate,buf.duration)),o=k===k0?off0*MD.rate:0;s.start(0,st0+o,Math.max(.05,MD.sec*MD.rate-o))}else{const CL=FM().clip,cs=CL&&buf.duration>CL?((M.cs[L[k].b.id]||{})[CL]||0):0,o=k===k0?Math.min(off0,Math.max(0,(CL||buf.duration)-.05)):0;if(CL)s.start(0,cs+o,Math.max(.05,Math.min(CL,buf.duration)-o));else s.start(0,o)}if(k===k0)off0=0};
 await go(k0);
 const td=new Uint8Array(1024),fd=new Uint8Array(512),cv=$m('#mxPv'),c=cv.getContext('2d');let last=0;
 const loop=t=>{if(!PV.on||PV.gen!==GEN)return;PV.raf=requestAnimationFrame(loop);if(t-last<33||!PV.an)return;last=t;PV.an.getByteTimeDomainData(td);PV.an.getByteFrequencyData(fd);let s=0;for(let i=0;i<8;i++)s+=fd[i];
  const Ld=layout().map(o=>({...o,dur:o.dur||(o.b.id===L[PV.k].b.id&&PV.buf?Math.min(PV.buf.duration,FM().clip||1e9):(FM().clip||180))}));const tl=a.currentTime-PV.t0,k=PV.k,tg=(Ld[k]?Ld[k].start:0)+tl,tot=Math.max(tg+1,total()||Ld.reduce((x,o)=>x+o.dur,0));
  frameAny(pvBig().getContext('2d'),ST[M.style],Ld,Math.min(k,Ld.length-1),tl,tg,tot,{td,fd,bass:s/8/255},{outro:false});c.drawImage(pvBig(),0,0,cv.width,cv.height);skDraw(tg,tot)};
 PV.raf=requestAnimationFrame(loop)}
function skTot(){const L=layout();return L.reduce((s,o)=>s+(o.dur||0),0)}
function skDraw(tg,tot){if(!box)return;tot=tot||skTot();const f=$m('#mxSkF'),tt=$m('#mxSkT');if(!f)return;f.style.width=(tot?Math.min(100,tg/tot*100):0)+'%';tt.textContent=fmt(tg)+' / '+fmt(tot)}
function skTicks(){if(!box)return;const L=layout(),tot=skTot(),el=$m('#mxTicks');if(!el)return;el.innerHTML=tot?L.map((o,i)=>`<button data-i="${i}" style="left:${o.start/tot*100}%" title="${esc(o.b.title)}">${i+1}</button>`).join(''):'';el.onclick=e=>{const b=e.target.closest('button');if(b){const o=L[+b.dataset.i];pvSeek(o.start+.01)}};skDraw(PV.on?0:0,tot)}
/* jump anywhere: click the bar (or a track number), playback starts right there */
async function pvSeek(t){const L=layout();if(!L.length)return;await Promise.all(L.map(o=>probe(o.b).catch(()=>{})));const L2=layout();let k=L2.findIndex(o=>t>=o.start&&t<o.start+(o.dur||0));if(k<0)k=L2.length-1;const off=Math.max(0,t-L2[k].start);skDraw(t,skTot());pvPlay(k,off)}
function pvStop(quiet){PV.on=false;PV.gen=(PV.gen||0)+1;cancelAnimationFrame(PV.raf);if(PV.src){try{PV.src.onended=null;PV.src.stop()}catch(e){}PV.src=null}const b=box&&$m('#mxPlay');if(b){b.classList.remove('on');b.innerHTML='&#9654; PLAY PREVIEW'}if(!quiet)preview()}
/* ---------- thumbnails + text ---------- */
async function thLoad(){if(!window.MZThumbs){await new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('thumbs.js?v=6',document.baseURI).href;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}await window.MZThumbs.load();hero=hero||(await new Promise(r=>{const i=new Image();i.src=new URL('hero.jpg',document.baseURI).href;i.onload=()=>r(i);i.onerror=()=>r(null)}))}
function thCtx(){const L=playlist(),first=L[0]||M.beats[0],t=total();return{title:M.title,w:MZThumbs.words(M.title),cover:first&&M.cov[first._sid||first.id],kind:M.kind==='beats'?'beats':'packs',label:K().mix,tagText:M.fmt==='rate'?'RATED 1-10':M.fmt==='speed'?'SLOWED + SPED UP':M.fmt==='count'?'TOP '+M.sel.length:M.fmt==='vs'?'A VS B':M.fmt==='give'?'FREE LOOP':K().mix,infoText:L.length+' '+(L.length>1?K().MANY:K().ONE)+'   •   '+Math.max(1,Math.round(t/60))+' MIN',seed:M.seed}}
let thT=0;function thumbsAuto(){if($m('#mxTh').children.length){clearTimeout(thT);thT=setTimeout(()=>thumbs(false),500)}}
async function thumbs(bump){
 await thLoad();if(bump)M.seed+=7;const g=$m('#mxTh'),X=thCtx();g.innerHTML='';
 for(let i=0;i<MZThumbs.count;i++){const card=document.createElement('div');card.className='thc';const cv=MZThumbs.make(i,640,360,X);cv.onclick=()=>{const lb=document.createElement('div');lb.id='thLb';lb.style.cssText='position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';const big=MZThumbs.make(i,1280,720,thCtx());big.style.cssText='max-width:92vw;max-height:92vh';lb.appendChild(big);lb.onclick=()=>lb.remove();document.body.appendChild(lb)};
  const lab=document.createElement('b');lab.textContent=(i+1)+'. '+MZThumbs.names[i];const bt=document.createElement('div');bt.className='two';bt.innerHTML='<button class="btn">16:9 JPG</button><button class="btn">9:16 JPG</button>';
  bt.querySelectorAll('button').forEach((b,j)=>b.onclick=()=>{const [w,h]=j?[1080,1920]:[1280,720],c2=MZThumbs.make(i,w,h,thCtx());c2.toBlob(bl=>{if(!bl)return;const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='mix-thumb'+(i+1)+(j?'-9x16':'-16x9')+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)},'image/jpeg',.92)});
  card.append(cv,lab,bt);g.appendChild(card)}
}
/* ---------- YouTube text generator for mixes (beats, sample packs, single samples) ----------
   Formats from top compilation / bundle uploads: count + kit type early ("[12 IN 1]", "20 Samples"), runtime ("15 Minutes of..."),
   year, a "sounds like" producer, "Royalty Free", "Bundle" / "Mega". Scored like the pack generator: short + keyword + year first. */
const MXP=['Alchemist','Pete Rock','J Dilla','Madlib','Griselda','Daringer','Conductor Williams','Roc Marciano','Hit-Boy','DJ Premier'];
const MXS={beats:['Hard Rap','Boom Bap','Dark','Soulful','Street','Old School','Gritty','Lo-Fi'],packs:['Soul','Vintage','Jazz','Boom Bap','Dusty','Lo-Fi','90s','Soulful'],samples:['Soul','Vintage','Jazz','Dusty','Boom Bap','Lo-Fi','Rare Soul','Gospel']};
const MXT={
 beats:['[FREE] {st} Beats Mix {y} | {n} Beats | Prod. MZPRD','{T} ({n} Beats) | Rap Instrumentals Mix {y}','{mins} Minutes of {st} Beats | {T} | Prod. MZPRD','{T} - Type Beat Mix | {n} Rap Instrumentals | MZPRD','Best {st} Beats {y} | {T} | Hip Hop Instrumental Mix',
  '{st} Type Beat Mix {y} ({pr} Type) | {n} Beats','{n} {st} Beats in {mins} Minutes | {T}','{st} Instrumentals Mix {y} | {T} ({n} Beats)','1 Hour? No. {mins} Minutes of {st} Beats | {T}','{pr} Type Beats Mix {y} | {n} {st} Instrumentals'],
 packs:['{n} Sample Packs in 1 | {T} ({y})','{st} Sample Pack Mix {y} - {n} Loop Kits ({mins} Min)','Sample Pack Bundle {y}: {n} {st} Loop Kits','{mins} Minutes of {st} Samples | {n} Sample Packs','[{n} IN 1] {st} Loop Kit / Sample Pack Bundle {y}','{T} | {n} {st} Sample Packs ({pr} Type)',
  'Best {st} Sample Packs {y} ({n} Loop Kits, Royalty Free)','Mega {st} Sample Pack Bundle {y} - {T}','{st} Loop Kits {y}: {n} Packs for {pr} Type Beats','Royalty Free {st} Loop Kit Bundle {y} | {T}','{n} {st} Loop Kits You Need in {y}','{st} Sample Packs {y} | {n} Kits ({pr}, Boom Bap)',
  '{T}: {n} {st} Loop Kits ({mins} Min Preview)','Loop Kit / Sample Pack Bundle {y} - "{T}" ({n} in 1)','{n} PreChopped {st} Sample Packs {y} ({pr} Type)','Every {st} Sample Pack {y} in One Video ({n} Kits)'],
 samples:['{mins} Minutes of {st} Samples | {T} (Royalty Free)','{n} {st} Samples for Beats {y} ({pr} Type)','[{n} SAMPLES] {st} Sample Pack {y} - {T}','{st} Samples Mix {y} | {n} Loops ({pr} Type)','1 Hour? No. {mins} Minutes of {st} Loops | {T}','Rare {st} Samples for Hip Hop {y} | {T}',
  '{n} Soul Chops / Loops {y} ({pr}, Boom Bap)','{st} Sample Chops Compilation {y} | {n} Samples','Royalty Free {st} Loops {y} - {n} Samples ({mins} Min)','{T} | {n} {st} Samples (Boom Bap, Jazz, Soul)','{n} {st} Samples {pr} Would Flip ({y})','{st} Loop Compilation {y} | {n} Royalty Free Samples',
  '{n} PreChopped {st} Samples {y} ({pr} Type Soul/Jazz)','{st} Melody Loops {y} | {n} Samples for Beats','{T} - {n} {st} Samples ({mins} Minutes)','Vintage Soul Samples Mix {y} | {n} Loops ({pr} Type)']};
function mxRng(s){let x=s|0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}}
function mxScore(t,k){let s=50;const lo=t.toLowerCase(),L=t.length;if(L<=60)s+=14;else if(L<=70)s+=6;else if(L>100)s-=30;else s-=6;
 if(k==='beats'?/beats|instrumental|type beat/.test(lo):/sample pack|loop kit|samples|loops|sample chops/.test(lo))s+=10;if(lo.includes(String(YEAR)))s+=6;if(/\b\d+\b/.test(t.replace(String(YEAR),'')))s+=6;if(/minutes|min\)/.test(lo))s+=3;if(/type|inspired/.test(lo))s+=3;if(/royalty free|bundle|in 1/.test(lo))s+=3;if(/^\[/.test(t))s+=2;return Math.max(0,Math.min(100,s))}
function genAll(){if(!box)return;const L=layout(),n=new Set(L.map(o=>o.b.id)).size||M.sel.length,k=M.kind,r=mxRng(((M.seed2||0)+1)*7919+String(M.title).length*31+n);
 const st=MXS[k],out=new Map(),TL=MXT[k].filter(x=>total()>=120||!/\{mins\}/.test(x));for(let g=0;g<200&&out.size<10;g++){const t=TL[Math.floor(r()*TL.length)].replace(/\{T\}/g,M.title).replace(/\{n\}/g,Math.max(1,n)).replace(/\{y\}/g,YEAR).replace(/\{mins\}/g,Math.max(1,Math.round(total()/60))).replace(/\{st\}/g,st[Math.floor(r()*st.length)]).replace(/\{pr\}/g,MXP[Math.floor(r()*MXP.length)]).replace(/\s+/g,' ').trim().slice(0,100);if(!out.has(t.toLowerCase()))out.set(t.toLowerCase(),{t,s:mxScore(t,k)})}
 M.gen=M.fmt&&M.fmt!=='mix'?fmtTitles(r,st):[...out.values()].sort((a,b)=>b.s-a.s);M.genN=L.map(o=>o.b.id).join(',')+'|'+M.fmt;M.genM=Math.round(total()/60);M.yt=0;const tl=$m('#mxTl');tl.innerHTML=M.gen.map((x,i)=>`<button data-i="${i}"${i===0?' class="on"':''}><b class="${x.s>=85?'hi':''}">${x.s}</b><span>${esc(x.t)}</span></button>`).join('');
 tl.onclick=e=>{const b=e.target.closest('button');if(!b)return;M.yt=+b.dataset.i;pickTitle()};pickTitle()}
function pickTitle(){if(!M.gen||!M.gen.length){genAll();return}const i=M.yt%M.gen.length;$m('#mxYt').value=M.gen[i].t;$m('#mxTi').textContent='('+(i+1)+'/'+M.gen.length+', score '+M.gen[i].s+')';$m('#mxTl').querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',j===i));yt()}
function yt(){
 if(!box)return;const L=layout(),n=L.length,k=M.kind,W=K();if(!n){$m('#mxYt').value='';$m('#mxYd').value='';$m('#mxYg').value='';$m('#mxTl').innerHTML='';return}
 const d=M.dv||0,mins=Math.max(1,Math.round(total()/60)),u=new Set(L.map(o=>o.b.id)).size;if(!M.gen||M.genN!==L.map(o=>o.b.id).join(',')+'|'+M.fmt||M.genM!==Math.round(total()/60))return genAll();
 const ch=L.map(o=>fmt(o.start)+' '+o.b.title+(o.b.bpm?' ('+o.b.bpm+' BPM'+(o.b.musical_key?' '+o.b.musical_key:'')+')':'')).join('\n');
 const links=[...new Map(L.map(o=>[o.b.id,o.b])).values()].map(b=>b.title+': '+W.url(b)).join('\n');
 const HOOK={beats:[M.title+' | '+u+' beats by MZPRD (Meztheprod), '+mins+(mins>1?' minutes':' minute')+', no ads between tracks.',mins+(mins>1?' minutes':' minute')+' of '+M.title.toLowerCase()+': '+u+' beats back to back by MZPRD.'],
  packs:[M.title+': '+u+' sample packs by MZPRD in one video, '+mins+(mins>1?' minutes':' minute')+' of loops you can hear before you buy.',u+' royalty free sample packs, back to back. Every pack is linked below, jump with the chapters.'],
  samples:[M.title+': '+u+' royalty free samples by MZPRD, '+mins+(mins>1?' minutes':' minute')+', every one ready for your next beat.',mins+(mins>1?' minutes':' minute')+' of samples, '+u+' loops back to back. Every one is linked below.']}[k];
 if(M.fmt&&M.fmt!=='mix'){const A=L[0]&&L[0].b,B=L[1]&&L[1].b,F=M.fmt,intro=F==='rate'?'I rated '+u+' '+KP().toLowerCase()+' from 1 to 10. Agree? Comment your own scores.':F==='speed'?'"'+(A?A.title:'')+'" three ways: normal, slowed + reverb and sped up. Which version hits hardest? Every version comes with it.':F==='count'?'Ranking '+u+' '+KP().toLowerCase()+' from #'+u+' down to #1. Which one should be #1? Comment below.':F==='vs'?(A&&B?'"'+A.title+'" vs "'+B.title+'". Which one wins? Comment A or B.':''):'FREE LOOP: "'+(A?A.title:'')+'" by MZPRD. Royalty free for your beats.';
  const lines=F==='rate'?L.map((o,i)=>fmt(o.start)+' '+o.b.title+' - '+rateOf(o.b.id,i,L.length)+'/10').join('\n'):F==='speed'?L.map(o=>fmt(o.start)+' '+o.b.title+' ('+SPM[o.b._mode].lab.toLowerCase()+')').join('\n'):F==='count'?L.map((o,i)=>fmt(o.start)+' #'+(L.length-i)+' '+o.b.title).join('\n'):F==='vs'?L.map((o,i)=>fmt(o.start)+' '+(i?'B':'A')+': '+o.b.title).join('\n'):'';
  $m('#mxYd').value=intro+(lines?'\n\n'+lines:'')+'\n\n'+(F==='give'?'GET IT (FREE): ':'LINKS\n')+[...new Map(L.map(o=>[o.b._sid||o.b.id,o.b])).values()].map(b=>(F==='give'?'':b.title+': ')+W.url(b)).join('\n')+'\n\nAll beats and sample packs: '+SITE+'\n\n'+(F==='rate'?'#samplepack #producer #mzprd':F==='speed'?'#slowedandreverb #spedup #mzprd':F==='give'?'#shorts #freeloop #samples #mzprd':F==='vs'?'#beatbattle #samplepack #mzprd':'#top10 #samplepack #mzprd');
  const ft={rate:['rating samples','rate my samples','sample pack review','rated 1-10','producer reacts'],speed:['slowed + reverb','sped up','slowed and reverb','sped up version','slowed reverb loop'],count:['top 10 '+KP().toLowerCase(),'best '+KP().toLowerCase()+' '+YEAR,'ranked','top '+KP().toLowerCase()+' '+YEAR],vs:[KP().toLowerCase()+' battle','which is better','beat battle','vs'],give:['free loop','free sample','free loop download','free samples '+YEAR,'royalty free loop','free soul sample','shorts']}[F];const all=[...ft,...L.map(o=>o.b.title),'mzprd','meztheprod'];let out=[],len=0;for(const t of [...new Set(all.map(x=>String(x).toLowerCase()))]){if(len+t.length+2>500)break;out.push(t);len+=t.length+2}$m('#mxYg').value=out.join(', ');return}
 const BUY={beats:'BUY OR DOWNLOAD ANY BEAT',packs:'GET ANY SAMPLE PACK',samples:'GET ANY SAMPLE (CRATE DIG)'}[k],LIC=k==='beats'?'':'\n\nLICENSE\n100% royalty free for your beats and releases. No reselling the sounds as-is.';
 const HT={beats:'#typebeat #rapbeats #beatmix #mzprd',packs:'#samplepack #loopkit #boombap',samples:'#samples #soulsamples #loopkit'}[k];
 $m('#mxYd').value=HOOK[d%HOOK.length]+'\n\n'+(k==='beats'?'TRACKLIST':'CHAPTERS')+'\n'+ch+'\n\n'+BUY+'\n'+links+LIC+'\n\nAll beats and sample packs: '+SITE+'\n\n'+(k==='beats'?'Subscribe for new beats every week.':'Subscribe for new sample packs every week.')+'\n\n'+HT;
 const tg=[...new Set(L.flatMap(o=>(o.b.tags||'').split(/[\/,]/).map(x=>x.trim()).filter(Boolean)))];
 const base={beats:['beat mix','rap beats mix','type beat mix','hip hop instrumentals','rap instrumentals','beats '+YEAR,'boom bap beats'],
  packs:['sample pack bundle','loop kit bundle','sample pack '+YEAR,'loop kit '+YEAR,'sample packs','loop kits','royalty free samples','soul sample pack','vintage sample pack','boom bap sample pack','sample pack mix','loop kit / sample pack'],
  samples:['soul samples','vintage samples','samples for beats','sample chops','soul loops','royalty free samples','samples '+YEAR,'jazz samples','boom bap samples','rare soul samples','loops for beats','melody loops']}[k];
 const all=[...base,...tg,'MZPRD','Meztheprod',...L.map(o=>o.b.title)];let out=[],len=0;for(const t of [...new Set(all.map(x=>String(x).toLowerCase()))]){if(len+t.length+2>500)break;out.push(t);len+=t.length+2}
 $m('#mxYg').value=out.join(', ');
}
/* ---------- render ---------- */
const mcx=new MessageChannel(),ysq=[];mcx.port1.onmessage=()=>{const f=ysq.shift();if(f)f()};const yieldNow=()=>new Promise(r=>{ysq.push(r);mcx.port2.postMessage(0)});
function loadMuxer(){return window.Mp4Muxer?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('mp4-muxer.js',document.baseURI).href;s.onload=ok;s.onerror=()=>no(new Error('muxer'));document.head.appendChild(s)})}
function badge(p){const b=document.querySelector('.bh [data-t=video]');if(b)b.textContent=p==null?'VIDEO STUDIO':'VIDEO STUDIO '+p+'%'}
const beforeUnload=e=>{if(M.busy){e.preventDefault();e.returnValue=''}};
async function render(){
 if(M.busy)return;const msg=t=>$m('#mxMsg').textContent=t,btn=$m('#mxRender'),dl=$m('#mxDl');
 if(!playlist().length){msg('Pick at least one '+K().one+' first.');return}
 if(!(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext)){msg('This browser cannot render long videos. Use Chrome or Edge.');return}
 M.busy=true;btn.disabled=true;dl.style.display='none';badge(0);addEventListener('beforeunload',beforeUnload);
 let err=null,venc,aenc;
 try{
  await loadMuxer();await thLoad();await Promise.all(M.sel.map(id=>{const b=M.beats.find(x=>String(x.id)===id);return loadCover(b)}));await Promise.all(playlist().map(b=>probe(b).catch(()=>{})));
  await document.fonts.load("40px "+ST[M.style].font).catch(()=>{});
  const st=ST[M.style],list=playlist();
  if(M.outro&&window.MZEndCard){try{const tc=document.createElement('canvas');tc.width=W;tc.height=H;window.MZEndCard(tc.getContext('2d'),W,H,0,6)}catch(e){}await new Promise(r=>setTimeout(r,700))}
  const pick=async()=>{for(const c of [{codec:'avc1.4d001f',mux:'avc'},{codec:'avc1.42E01f',mux:'avc'},{codec:'vp09.00.31.08',mux:'vp9'}]){const cfg={codec:c.codec,width:W,height:H,bitrate:3e6,framerate:FPS};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
  const pa=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:SR,numberOfChannels:2,bitrate:160000});if(r&&r.supported)return c}catch(e){}}return null};
  const vc=await pick(),acf=await pa();if(!vc||!acf)throw new Error('no codec available');
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:W,height:H},audio:{codec:acf.mux,numberOfChannels:2,sampleRate:SR},fastStart:'in-memory'});
  venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);
  aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:acf.codec,sampleRate:SR,numberOfChannels:2,bitrate:160000});
  /* real durations first (cheap: already probed), then render track by track */
  msg('Measuring track lengths...');await Promise.all([...new Set(list)].map(b=>probe(b).catch(()=>{})));
  const CL=FM().clip,dOf=b=>{if(b._mode)return Math.min(SPM[b._mode].sec,(M.dur[b._sid]||1e9)/SPM[b._mode].rate);const d=M.dur[b.id]||180;return CL?Math.min(d,CL):d};const tot=list.reduce((s,b)=>s+dOf(b),0);let gUs=0,done=0;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  const Lyt=[];let acc=0;for(const b of list){const d=dOf(b);Lyt.push({b,start:acc,dur:d});acc+=d}
  const t0=performance.now();
  for(let k=0;k<list.length;k++){
   msg('Preparing track '+(k+1)+' of '+list.length+'...');
   const tr=await track48(list[k]);if(CL&&tr.dur>CL){const st0=((M.cs[list[k].id]||{})[CL])||0,a0=Math.floor(st0*SR),n0=Math.floor(CL*SR);tr.L=tr.L.slice(a0,a0+n0);tr.R=tr.R.slice(a0,a0+n0);tr.dur=CL}const nf=Math.floor(tr.dur*FPS),n=Math.floor(nf/FPS*SR),fade=Math.floor(M.fade*SR);Lyt[k].dur=nf/FPS;
   for(let i=0;i<n;i++){let g=1;if(fade){if(i<fade)g=i/fade;else if(n-i<fade)g=(n-i)/fade}tr.L[i]*=g;tr.R[i]*=g}
   const CH=4800;for(let o=0;o<n;o+=CH){const m=Math.min(CH,n-o),b=new Float32Array(m*2);b.set(tr.L.subarray(o,o+m),0);b.set(tr.R.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:SR,numberOfFrames:m,numberOfChannels:2,timestamp:gUs+Math.round(o/SR*1e6),data:b});aenc.encode(ad);ad.close();if((o/CH)%30===0)await yieldNow()}
   const mono=new Float32Array(n);for(let i=0;i<n;i++)mono[i]=(tr.L[i]+tr.R[i])*.5;
   prevFd.fill(0);let lastStart=Lyt.slice(0,k).reduce((s,o)=>s+o.dur,0);
   for(let f=0;f<nf;f++){
    if(err)throw err;const tl=f/FPS,tg=lastStart+tl;
    frameAny(c,st,Lyt.map((o,i)=>i<=k?o:{...o}),k,tl,tg,tot,dataAt(mono,tl),{outro:M.outro&&M.fmt==='mix'});
    const vf=new VideoFrame(cv,{timestamp:gUs+Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:(done+f)%120===0});vf.close();
    while(venc.encodeQueueSize>8){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
    if(f%6===0){const p=Math.min(99,Math.round((done+f)/Math.max(1,tot*FPS)*100));$m('#mxProg').style.width=p+'%';badge(p);msg('Rendering track '+(k+1)+' of '+list.length+' ('+p+'%). You can close this window or switch tabs, it keeps going.');await yieldNow()}
   }
   gUs+=Math.round(nf*1e6/FPS);done+=nf;
  }
  await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();
  const blob=new Blob([target.buffer],{type:'video/mp4'});dl.href=URL.createObjectURL(blob);dl.download='mzprd-'+M.kind+'-'+(M.fmt==='mix'?'mix':M.fmt==='count'?'countdown':M.fmt==='vs'?'versus':M.fmt==='rate'?'rate-it':M.fmt==='speed'?'speed-versions':'free-loop-short')+'.mp4';dl.style.display='block';$m('#mxProg').style.width='100%';
  msg('Done in '+Math.round((performance.now()-t0)/1000)+'s. '+(blob.size/1048576).toFixed(0)+' MB MP4, '+fmt(done/FPS)+' long. Click DOWNLOAD MIX VIDEO.');try{toast('MIX VIDEO READY')}catch(e){}
 }catch(e){console.warn(e);msg('Render failed: '+((e&&e.message)||e))}
 finally{try{venc&&venc.close()}catch(e){}try{aenc&&aenc.close()}catch(e){}M.busy=false;btn.disabled=false;badge();removeEventListener('beforeunload',beforeUnload)}
}
window.mixOpen=async function(){
 if(!box){if(!M.beats.length){try{const r=await sb.from('beats').select('*').order('created_at',{ascending:false});M.beats=r.data||[]}catch(e){}}
  try{await thLoad()}catch(e){}build();M.beats.forEach(b=>loadCover(b))}
 box.classList.add('on');box.setAttribute('aria-hidden','false');document.addEventListener('keydown',key);ui();setTimeout(()=>{preview();genAll()},300);
};
window.mixClose=function(){if(box)shut()};
})();
