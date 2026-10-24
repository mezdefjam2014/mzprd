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
 M.beats.forEach(b=>loadCover(b));{const ib=$m('#mxFmt [data-f="inside"]');if(ib)ib.style.display=k==='samples'?'':'none'}if(k!=='samples'&&M.fmt==='inside'){setFmt('mix');return}ui();preview();genAll()}
const SLEEVE=()=>new URL('crate-sleeve.jpg',document.baseURI).href;
const artOf=(b,px)=>b.cover_path?((window.thumbUrl&&thumbUrl(b.cover_path))||pub(b.cover_path)):M.kind==='samples'?SLEEVE():M.kind==='beats'?stockCover(b.title,px):SLEEVE();
const $m=s=>box.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const slugOf=b=>b.slug||String(b.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||b.id;
const ctxA=()=>ac||(ac=new (window.AudioContext||window.webkitAudioContext)());

/* ---------- playlist ---------- */
function playlist(){
 let L=M.sel.map(id=>M.beats.find(b=>String(b.id)===String(id))).filter(Boolean);if(M.fmt==='speed')return speedList(L);if(M.fmt==='inside')return insList(L);
 if(M.repeat&&L.length){const base=L.slice(),dur=b=>M.dur[b.id]||180;let t=L.reduce((s,b)=>s+dur(b),0),i=0;while(t<600&&L.length<60){const b=base[i++%base.length];L.push(b);t+=dur(b)}}
 return L;
}
function layout(){let t=0;const cl=FM().clip;return playlist().map(b=>{const d0=M.dur[b._sid||b.id]||0,d=b._step?((INS[b._sid]&&INS[b._sid].dur[b._step])||0):b._mode?(d0?Math.min(SPM[b._mode].sec,d0/SPM[b._mode].rate):0):cl&&d0?Math.min(d0,cl):d0,o={b,start:t,dur:d};t+=d;return o})}
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
const FMTS={mix:{n:'MIX'},count:{n:'COUNTDOWN',clip:15,max:10},vs:{n:'PACK vs PACK',clip:20,max:2},give:{n:'FREE LOOP SHORT',clip:30,max:1,vert:1},rate:{n:'RATE IT 1-10',clip:12,max:10},speed:{n:'SPEED VERSIONS',max:3},inside:{n:'INSIDE THE SAMPLE',max:3}};
const FM=()=>FMTS[M.fmt||'mix'];
const KP=()=>({beats:'Beats',packs:'Sample Packs',samples:'Samples'})[M.kind],K1=()=>({beats:'Beat',packs:'Pack',samples:'Sample'})[M.kind];
function applySize(){const v=!!FM().vert||!!M.v916;W=v?720:1280;H=v?1280:720;bdc={};PVB=null;const cv=$m('#mxPv');cv.width=W;cv.height=H;cv.style.width=v?'auto':'100%';cv.style.maxHeight=v?'70vh':'';cv.style.margin=v?'0 auto':'';const z=$m('#mxSize');if(z){z.style.display=FM().vert?'none':'flex';z.querySelectorAll('button').forEach(b=>b.classList.toggle('on',(b.dataset.z==='v')===!!M.v916))}}
function setFmt(f){if(M.busy)return;if(f==='inside'&&M.kind!=='samples')return;pvStop(true);M.fmt=f;const v=!!FM().vert||!!M.v916;W=v?720:1280;H=v?1280:720;bdc={};PVB=null;const cv=$m('#mxPv');cv.width=W;cv.height=H;cv.style.width=v?'auto':'100%';cv.style.maxHeight=v?'70vh':'';cv.style.margin=v?'0 auto':'';
 const mx=FM().max;if(mx&&M.sel.length>mx)M.sel=M.sel.slice(0,mx);box.querySelectorAll('#mxFmt button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));applySize();{const T=THM[f]&&THM[f]();$m('#mxVsW').style.display=T?'block':'none';$m('#mxDealW').style.display=f==='rate'||f==='speed'||f==='inside'?'block':'none';$m('#mxInsW').style.display=f==='inside'?'block':'none';$m('#mxThH').textContent=f==='vs'?'BATTLE THEME':'THEME';if(T){M.th=M.th||{};const cur=M.th[f]||Object.keys(T)[0];$m('#mxVsT').innerHTML=Object.keys(T).map(k=>`<button class="btn${k===cur?' on':''}" data-v="${k}">${T[k].n}</button>`).join('')}}
 const hint=$m('#mxFmtHint');if(hint)hint.textContent={mix:'Pick tracks in order. Aim for 10 to 15 minutes.',count:'Pick up to 10 in order: your #1 last. Each plays its best 15 seconds.',vs:'Pick 2. Each plays its best 20 seconds, then a "comment A or B" vote card.',give:'Pick 1 loop. Makes a 9:16 Short (about 30 seconds) for a free download post.',rate:'Pick up to 10. Tap the score next to each one in YOUR MIX to set it (1 to 10). Ends on a sales card.',speed:'Pick 1 to 3. Each plays normal, slowed + reverb, then sped up. Ends on a sales card.',inside:'Pick 1 sample. It is split, rebuilt, chopped on its real hits, re-ordered into a new loop, slowed, reversed and sped up, with editing sounds. Ends on a sales card.'}[f];
 M.title=f==='inside'?'Inside the Sample':f==='rate'?'Rating '+KP()+' 1-10':f==='speed'?'Normal vs Slowed vs Sped Up':f==='mix'?K().title:f==='count'?'Top '+Math.max(3,M.sel.length||10)+' '+KP():f==='vs'?K1()+' Battle':'Free Loop';if($m('#mxTitle'))$m('#mxTitle').value=M.title;M.gen=null;ui();preview();genAll()}
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
/* ---------- INSIDE THE SAMPLE: one sample taken apart and rebuilt on a DAW timeline ----------
   Steps: intro, part A, part B, full, chop (real transients, zero-cross snapped), new loop from the chops, slowed + reverb,
   reversed, sped up, the flip (medley), sales card. Every step's audio is rendered for real; editing sound effects are synthesised. */
['mpc/pk3/bg_vinyl_red.webp','mpc/pk3/bg_vinyl_mono.webp','mpc/pk3/bg_fl_mixer.webp','mpc/pk3/price.webp'].forEach(f=>{const i=new Image();i.onload=()=>{SCI[f.split('/').pop().split('.')[0]]=i};i.src=new URL(f+'?v=1',document.baseURI).href});
const INS_STEPS=['intro','a','b','full','chop','loop','slow','rev','fast','flip','outro'];
const INS_LAB={intro:'INSIDE THE SAMPLE',a:'PART A',b:'PART B',full:'THE FULL SAMPLE',chop:'CHOP IT',loop:'NEW LOOP FROM THE CHOPS',slow:'SLOWED + REVERB',rev:'REVERSED',fast:'SPED UP',flip:'THE FLIP',outro:'GET THE SAMPLE'};
const INT={fl:{n:'FL PLAYLIST',bg:'#1c2026',grid:'#262b33',lane:'#20252c',ca:['#ffb0b8','#a8323f'],cb:['#8ff0ff','#2f8fa8'],cc:['#c9a6ff','#5b3fa8'],ph:'#ffffff',acc:'#ff5a7a'},
 ableton:{n:'ABLETON GRID',bg:'#2b2b2b',grid:'#333333',lane:'#262626',ca:['#ffd23f','#9a7a12'],cb:['#3ee08f','#1d7a4a'],cc:['#ff7d3e','#99431c'],ph:'#ffffff',acc:'#ffd23f'},
 mpc:{n:'MPC SCREEN',bg:'#0a0a0c',grid:'#16161a',lane:'#121216',ca:['#ff4d5d','#7a1420'],cb:['#ffd34a','#7a5a10'],cc:['#ffffff','#555'],ph:'#ffd34a',acc:'#ff3040'}};
THM.inside=()=>INT;
const LEAD=.4,INS={};window.__mzInsTest=(src,n)=>{const o=M.insN;M.insN=n;const r=insAnalyze('t',src);M.insN=o;return r};
function insList(L){if(!L.length)return[];const out=[],mid=INS_STEPS.slice(1,-1);out.push(Object.assign({},L[0],{id:L[0].id+'#intro',_sid:L[0].id,_step:'intro',_si:0,_sn:L.length}));L.forEach((b,si)=>mid.forEach(s=>out.push(Object.assign({},b,{id:b.id+'#'+s,_sid:b.id,_step:s,_si:si,_sn:L.length}))));const z=L[L.length-1];out.push(Object.assign({},z,{id:z.id+'#outro',_sid:z.id,_step:'outro',_si:L.length-1,_sn:L.length}));return out}
/* analysis: best loop window, real transients for the chops, a new order, waveform peaks */
function insAnalyze(sid,src){const nCh=M.insN||8,sr=src.sampleRate,ch0=src.getChannelData(0),ch1=src.numberOfChannels>1?src.getChannelData(1):ch0,b=M.beats.find(x=>String(x.id)===String(sid))||{},bpm=+b.bpm||0;
 let L=bpm?Math.min(10,Math.max(4,(bpm>=110?8:4)*4*60/bpm)):Math.min(8,src.duration);L=Math.min(L,src.duration);const st0=bestStart(src,L);
 /* onsets: log-magnitude spectral flux (high bins weighted), adaptive median threshold, backtracked to the true attack */
 const a0=Math.floor(st0*sr),N=1024,hop=128,n=Math.max(4,Math.floor((L*sr-N)/hop)),win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
 const mono=i=>((ch0[i]||0)+(ch1[i]||0))*.5,flux=new Float32Array(n),rms=new Float32Array(n);let prev=new Float32Array(N/2);
 for(let f=0;f<n;f++){const re=new Float64Array(N),im=new Float64Array(N),o=a0+f*hop;let e2=0;for(let i=0;i<N;i++){const x=mono(o+i);re[i]=x*win[i];if(i<hop)e2+=x*x}rms[f]=Math.sqrt(e2/hop);fft(re,im);const mg=new Float32Array(N/2);let s=0;for(let k=1;k<N/2;k++){mg[k]=Math.log1p(20*Math.hypot(re[k],im[k]));const dd=mg[k]-prev[k];if(dd>0)s+=dd*(1+k/(N/8))}flux[f]=s;prev=mg}
 let fmx=0;for(const v of flux)fmx=Math.max(fmx,v);const thr=new Float32Array(n),W8=10;for(let i=0;i<n;i++){const w=[];for(let j=Math.max(0,i-W8);j<=Math.min(n-1,i+W8);j++)w.push(flux[j]);w.sort((x,y)=>x-y);thr[i]=w[w.length>>1]*1.35+fmx*.04}
 const cand=[];for(let i=3;i<n-3;i++){const v=flux[i];if(v>thr[i]&&v>=flux[i-1]&&v>=flux[i+1]&&v>=flux[i-2]&&v>=flux[i+2]&&v>=flux[i-3]&&v>=flux[i+3])cand.push([i,v-thr[i]])}cand.sort((x,y)=>y[1]-x[1]);
 const minGap=Math.max(3,Math.floor((L/nCh)*.33*sr/hop)),pick=[0];for(const[i]of cand){if(pick.length>=nCh)break;if(pick.every(p=>Math.abs(p-i)>=minGap))pick.push(i)}
 for(const[i]of cand){if(pick.length>=nCh)break;if(pick.every(p=>Math.abs(p-i)>=Math.max(2,minGap>>1)))pick.push(i)}
 pick.sort((x,y)=>x-y);
 /* backtrack each onset: to the energy valley before the flux peak, then to the first sample that rises, then to a zero crossing */
 const attack=fi=>{if(fi<=0)return 0;const w=Math.max(16,Math.round(.001*sr)),s0=Math.max(a0,a0+(fi-6)*hop),s1=a0+(fi+2)*hop+N,m=Math.floor((s1-s0)/w);if(m<4)return Math.max(0,(a0+fi*hop-a0)/sr);
  const env=new Float32Array(m);const hp=i=>mono(i)-.97*mono(i-1);for(let q=0;q<m;q++){let e=0;for(let i=s0+q*w,z=i+w;i<z;i++){const x=hp(i);e+=x*x}env[q]=Math.sqrt(e/w)}
  let jq=1,jv=-1;for(let q=1;q<m;q++){const dv=env[q]-env[q-1];if(dv>jv){jv=dv;jq=q}}let base=1e9;for(let q=Math.max(0,jq-30);q<jq;q++)base=Math.min(base,env[q]);if(base===1e9)base=env[0];
  const tgt=base+(env[jq]-base)*.1;let q=jq;while(q>0&&env[q-1]>tgt)q--;let i=s0+q*w;for(let z=i+w;i<z;i++){if(Math.abs(hp(i))>tgt*1.2)break}
  for(let k=0;k<Math.round(.0015*sr);k++){const j=i-k;if(j>a0&&((ch0[j-1]<=0&&ch0[j]>0)||(ch0[j-1]>=0&&ch0[j]<0))){i=j;break}}return Math.max(0,(i-a0)/sr)};
 const cuts=pick.map(attack);cuts[0]=0;
 const sl=cuts.map((c,i)=>[c,i<cuts.length-1?cuts[i+1]:L]).filter(s=>s[1]-s[0]>.04);
 const ORD={8:[0,2,1,0,4,7,5,3],12:[0,3,1,0,6,9,4,11,2,7,5,10],16:[0,2,1,0,4,7,5,3,8,10,9,8,12,15,13,11]};let ord=(ORD[sl.length]||sl.map((_,i)=>i).reverse()).filter(i=>i<sl.length);
 const P=900,pk=new Float32Array(P);for(let i=0;i<P;i++){let m=0;for(let j=a0+Math.floor(i*L*sr/P),e=a0+Math.floor((i+1)*L*sr/P);j<e;j+=4)m=Math.max(m,Math.abs(ch0[j]||0));pk[i]=m}let mx=0;for(const v of pk)mx=Math.max(mx,v);for(let i=0;i<P;i++)pk[i]/=mx||1;
 const rev=new AudioBuffer({numberOfChannels:2,length:Math.floor(L*sr),sampleRate:sr});for(let c=0;c<2;c++){const s=c?ch1:ch0,d=rev.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=s[a0+d.length-1-i]||0}
 const loopLen=ord.reduce((s,i)=>s+(sl[i][1]-sl[i][0]),0);
 INS[sid]={src,st0,L,sl,ord,pk,rev,loopLen,dur:{intro:3.2,a:LEAD+L/2,b:LEAD+L/2,full:LEAD+L,chop:LEAD+sl.reduce((s,x)=>s+(x[1]-x[0])+.14,0),loop:.9+loopLen*2,slow:LEAD+L/.8+.8,rev:LEAD+L,fast:LEAD+L/1.25,flip:.4+loopLen+L/1.25*.5+L*.5,outro:6.5}};return INS[sid]}
/* editing sound effects: your ElevenLabs sounds (sfx/inside), trimmed + levelled on load; synthesised ones only as a fallback */
const SFXF={whoosh:'whoosh',impact:'impact',cut:'scratch',tapestop:'tapestop',rewind:'rewind',riser:'riser',click:'click'},SFXB={};let SFXP=null;
const SFXLV={whoosh:.55,impact:.8,cut:.32,tapestop:.6,rewind:.6,riser:.5};
function sfxLoad(){return SFXP=SFXP||Promise.all(Object.entries(SFXF).map(async([k,f])=>{try{const r=await fetch(new URL('sfx/inside/'+f+'.mp3?v=1',document.baseURI).href);const b=await ctxA().decodeAudioData(await r.arrayBuffer());
 let pk=0,st=b.length;for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)pk=Math.max(pk,Math.abs(d[i]))}for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)if(Math.abs(d[i])>pk*.02){st=Math.min(st,i);break}}
 let en=0;for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=d.length-1;i>0;i--)if(Math.abs(d[i])>pk*.01){en=Math.max(en,i);break}}const len=Math.max(1,en-st+1),out=new AudioBuffer({numberOfChannels:2,length:len,sampleRate:b.sampleRate}),fd=Math.min(len,Math.round(b.sampleRate*.01));
 for(let c=0;c<2;c++){const s=b.getChannelData(Math.min(c,b.numberOfChannels-1)),d=out.getChannelData(c);for(let i=0;i<len;i++){let v=s[st+i]/(pk||1);if(i>len-fd)v*=(len-i)/fd;d[i]=v}}SFXB[k]=out}catch(e){}}))}
/* synthesised editing sound effects */
let NZ=null;function nz(oc){if(NZ&&NZ.sampleRate===oc.sampleRate)return NZ;const b=oc.createBuffer(1,oc.sampleRate*2,oc.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;NZ=b;return b}
function sfx(oc,type,t,vol){vol=vol||1;if(SFXB[type]){const n=oc.createBufferSource(),g2=oc.createGain();n.buffer=SFXB[type];g2.gain.value=vol*(SFXLV[type]||.6);n.connect(g2);g2.connect(oc.destination);n.start(t);return}const g=oc.createGain();g.connect(oc.destination);const env=(a,dur,pk)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk*vol,t+a);g.gain.exponentialRampToValueAtTime(.0005,t+dur)};
 if(type==='whoosh'||type==='rewind'||type==='riser'){const s=oc.createBufferSource();s.buffer=nz(oc);const f=oc.createBiquadFilter();f.type='bandpass';f.Q.value=1.4;const d=type==='riser'?1.1:.5;if(type==='rewind'){f.frequency.setValueAtTime(5000,t);f.frequency.exponentialRampToValueAtTime(300,t+d)}else{f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(type==='riser'?8000:4500,t+d)}s.connect(f);f.connect(g);env(d*.7,d,type==='riser'?.35:.5);s.start(t,Math.random(),d)}
 else if(type==='tick'){const o=oc.createOscillator();o.type='square';o.frequency.value=2600;o.connect(g);env(.001,.05,.22);o.start(t);o.stop(t+.06)}
 else if(type==='cut'){const s=oc.createBufferSource();s.buffer=nz(oc);const f=oc.createBiquadFilter();f.type='highpass';f.frequency.value=3000;s.connect(f);f.connect(g);env(.001,.08,.5);s.start(t,0,.09)}
 else if(type==='impact'){const o=oc.createOscillator();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(38,t+.5);o.connect(g);env(.005,.7,.9);o.start(t);o.stop(t+.75)}
 else if(type==='tapestop'){const o=oc.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(40,t+.45);const f=oc.createBiquadFilter();f.type='lowpass';f.frequency.value=900;o.connect(f);f.connect(g);env(.01,.5,.25);o.start(t);o.stop(t+.5)}}
/* the audio for one step, rendered offline at the video rate */
const SB={};async function stepBuffer(b){await sfxLoad();const A=INS[b._sid];if(!A)throw new Error('not analysed');const key=b._sid+'|'+b._step+'|'+(M.insN||8);if(SB[key])return SB[key];
 const s=b._step,D=A.dur[s],oc=new OfflineAudioContext(2,Math.ceil(D*SR),SR),src=A.src,mus=oc.createGain();mus.connect(oc.destination);
 const play=(buf,when,off,dur,rate,gain,rv)=>{const n=oc.createBufferSource();n.buffer=buf;n.playbackRate.value=rate||1;const g=oc.createGain();g.gain.value=gain==null?1:gain;n.connect(g);g.connect(mus);if(rv){/* reverb send */const cv=oc.createConvolver();cv.buffer=impulse(oc);const w=oc.createGain();w.gain.value=.45;g.connect(cv);cv.connect(w);w.connect(mus)}n.start(when,off,dur)};
 const S=A.st0,L=A.L;
 if(s==='intro'){sfx(oc,'riser',.2,1);sfx(oc,'impact',1.4,1);play(src,1.4,S,1.6,1,.5)}
 else if(s==='a'){sfx(oc,'whoosh',0,1);play(src,LEAD,S,L/2)}
 else if(s==='b'){sfx(oc,'whoosh',0,1);play(src,LEAD,S+L/2,L/2)}
 else if(s==='full'){sfx(oc,'impact',0,.9);play(src,LEAD,S,L)}
 else if(s==='chop'){let t=LEAD;A.sl.forEach(x=>{sfx(oc,'click',t,.9);play(src,t,S+x[0],x[1]-x[0]);t+=x[1]-x[0]+.14})}
 else if(s==='loop'){sfx(oc,'whoosh',0,.8);let t=.9;for(let r=0;r<2;r++)A.ord.forEach((i,j)=>{const x=A.sl[i],d=x[1]-x[0];if(r===0)sfx(oc,'tick',t,.5);play(src,t,S+x[0],d);t+=d})}
 else if(s==='slow'){sfx(oc,'tapestop',0,1);play(src,LEAD,S,L,.8,1,1)}
 else if(s==='rev'){sfx(oc,'rewind',0,1);play(A.rev,LEAD,0,L)}
 else if(s==='fast'){sfx(oc,'riser',0,.6);play(src,LEAD,S,L,1.25)}
 else if(s==='flip'){sfx(oc,'impact',0,.8);let t=.4;A.ord.forEach(i=>{const x=A.sl[i],d=x[1]-x[0];play(src,t,S+x[0],d);t+=d});play(src,t,S,L/2,1.25);t+=L/1.25*.5;play(A.rev,t,L/2,L/2)}
 else if(s==='outro'){sfx(oc,'whoosh',0,.8);play(src,.2,S,Math.min(L,6),1,.35)}
 const rb=await oc.startRendering();SB[key]=rb;return rb}
/* ---- visuals ---- */
function clipBox(c,T,x,y,w,h,name,col,pk,a0,a1,rev,lit,u){c.save();c.fillStyle=col[1];c.globalAlpha=lit?1:.55;c.fillRect(x,y,w,h);c.fillStyle=col[0];c.globalAlpha=lit?.28:.14;c.fillRect(x,y+h*.24,w,h*.76);c.globalAlpha=lit?1:.6;c.fillStyle=col[1];c.fillRect(x,y,w,h*.24);
 c.save();c.beginPath();c.rect(x,y,w,h*.24);c.clip();c.font='700 '+Math.max(9,h*.15)+'px Inter, Arial, sans-serif';c.fillStyle='#fff';c.textBaseline='middle';c.fillText('↠ '+name,x+6*u,y+h*.125);c.restore();
 if(pk){c.fillStyle=col[0];const N=Math.max(2,Math.floor(w/(2.4*u))),mid=y+h*.62,amp=h*.33;for(let i=0;i<N;i++){let f=a0+(a1-a0)*(i/N);if(rev)f=a1-(f-a0);const v=pk[Math.min(pk.length-1,Math.floor(f*pk.length))]||0,hh=Math.max(1,v*amp);c.fillRect(x+i*w/N,mid-hh,Math.max(1,w/N*.7),hh*2)}}
 c.strokeStyle=lit?'#fff':col[0];c.lineWidth=(lit?2.5:1.2)*u;c.strokeRect(x,y,w,h);c.restore()}
/* DAW-style stereo LED meter: real level in dB, fast attack / smooth release, peak hold, clip light */
const MTR={l:-60,r:-60,pl:-60,pr:-60,hl:0,hr:0,t:0};
function meterDraw(c,x,y,w,h,d,tg,acc){const u=H/720,td=d.td;let sl=0,sr2=0,pk=0;for(let i=0;i<td.length;i++){const v=(td[i]-128)/128;if(i&1)sr2+=v*v;else sl+=v*v;pk=Math.max(pk,Math.abs(v))}
 const db=v=>20*Math.log10(Math.max(1e-5,v)),rl=db(Math.sqrt(sl/(td.length/2))*1.41)+6,rr=db(Math.sqrt(sr2/(td.length/2))*1.41)+6,dt=Math.max(.001,Math.min(.2,tg-MTR.t));MTR.t=tg;
 const step=(cur,target)=>target>cur?target:Math.max(target,cur-dt*24);MTR.l=step(MTR.l,rl);MTR.r=step(MTR.r,rr);
 [['l','pl','hl'],['r','pr','hr']].forEach(([k,p2,hk])=>{if(MTR[k]>=MTR[p2]){MTR[p2]=MTR[k];MTR[hk]=tg}else if(tg-MTR[hk]>.8)MTR[p2]=Math.max(MTR[k],MTR[p2]-dt*14)});
 /* FL mixer meter, laid sideways: slate panel, solid lime bars, scale 3 0 3 6 9 12 18 24 36, thin peak line */
 const lo=-40,hi=3,frac=v=>Math.max(0,Math.min(1,(v-lo)/(hi-lo))),bh=(h-8*u)/2,x0=x+6*u,sc=w-12*u;
 c.save();c.fillStyle='#3a4650';c.fillRect(x-6*u,y-6*u,w+12*u,h+12*u);c.fillStyle='#2c363e';c.fillRect(x,y,w,h);c.strokeStyle='#1d252b';c.lineWidth=2*u;c.strokeRect(x-6*u,y-6*u,w+12*u,h+12*u);
 const marks=[[3,'3'],[0,'0'],[-3,'3'],[-6,'6'],[-9,'9'],[-12,'12'],[-18,'18'],[-24,'24'],[-36,'36']];
 [['l',MTR.l,MTR.pl],['r',MTR.r,MTR.pr]].forEach(([k,lv,pv],row)=>{const yy=y+4*u+row*(bh+0*u),bw=sc*frac(lv);const g=c.createLinearGradient(0,yy,0,yy+bh);g.addColorStop(0,'#b7e04a');g.addColorStop(1,'#93c22e');c.fillStyle=g;c.fillRect(x0,yy+1*u,bw,bh-2*u);
  if(pv>lo+.5){const px=x0+sc*frac(pv);c.fillStyle='#c8f060';c.fillRect(px-1*u,yy,2*u,bh)}});
 c.fillStyle='#1d252b';c.fillRect(x0,y+4*u+bh-1*u,sc,2*u);
 marks.forEach(([v,lb])=>{const xx=x0+sc*frac(v);c.fillStyle='rgba(210,225,235,.22)';c.fillRect(xx,y,1*u,h);c.save();c.globalAlpha=.55;txt(c,lb,xx+4*u,y+h*.62,h*.42,'Oswald','#c9d6de','left');c.restore()});
 c.restore()}
function insideFrame(c,st,L,k,tl,tg,tot,d){const T=thOf('inside'),th=thKey('inside'),u=H/720,f=st.font,cur=L[k],b=cur.b,s=b._step,sid=b._sid,A=INS[sid],im=M.cov[sid],name=String(b.title||'Sample').replace(/[^A-Za-z0-9]+/g,'_');
 c.fillStyle=T.bg;c.fillRect(0,0,W,H);{const BG=SCI[th==='fl'?'bg_fl_mixer':th==='ableton'?'bg_vinyl_mono':'bg_vinyl_red'];if(BG){const z=1.04+.02*Math.sin(tg*.15),bw=W*z,bh=H*z;{c.drawImage(BG,(W-bw)/2,(H-bh)/2,bw,bh);c.fillStyle=T.bg;c.globalAlpha=th==='fl'?.35:.55;c.fillRect(0,0,W,H);c.globalAlpha=1}const g=c.createLinearGradient(0,H*.18,0,H*.9);g.addColorStop(0,'rgba(0,0,0,.15)');g.addColorStop(.5,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,.2)');c.fillStyle=g;c.fillRect(0,0,W,H)}}
 /* header */
 cov(c,im,W*.035,H*.04,H*.12,st,false);txt(c,String(b.title||'').toUpperCase(),W*.035+H*.14,H*.095,fitPx(c,String(b.title||'').toUpperCase(),f,H>W?W*.6:W*.45,40*u),f,'#fff');const vv=H>W;
 const meta=[b.bpm&&b.bpm+' BPM',b.musical_key,'MZPRD'].filter(Boolean).join('  •  ');txt(c,meta,W*.035+H*.14,H*.135,15*u,'Oswald',T.acc,'left',4);
 const si=INS_STEPS.indexOf(s),lab=INS_LAB[s];txt(c,(b._sn>1?'SAMPLE '+(b._si+1)+' OF '+b._sn+'  •  ':'')+'STEP '+String(si).padStart(2,'0')+' / '+String(INS_STEPS.length-2).padStart(2,'0'),vv?W*.035:W*.965,vv?H*.2:H*.08,15*u,'Oswald','rgba(255,255,255,.55)',vv?'left':'right',5);
 const lp=ease((tl-.05)/.45);c.save();c.globalAlpha=lp;txt(c,lab,W*.965,vv?H*.205:H*.135,fitPx(c,lab,f,vv?W*.5:W*.42,42*u)*(1.15-.15*lp),f,T.acc,'right');c.restore();
 /* the arrangement area */
 const ax=W*.05,aw=W*.9,ay=H*.24,lh=H*.15,gap=H*.025;
 let area=[ax,ay,aw,lh*3+gap*2];
 if(th==='mpc'&&SCI.mpc){const I=SCI.mpc,h=H*.72,w=I.width*h/I.height,x=W*.5-w/2,y=H*.19;shotImg(c,I,x,y,w,u);const sc=w/649;area=[x+20*sc+6*u,y+70*sc+6*u,406*sc-12*u,222*sc-12*u];c.fillStyle=T.bg;c.fillRect(area[0]-6*u,area[1]-6*u,area[2]+12*u,area[3]+12*u)}
 const [X0,Y0,AW,AH]=area,LH=(AH-gap*2)/3;
 /* playlist lanes like the DAW: slate rows, 8 even bars with darker bar lines, fine step lines, dark row edges */
 {const LANE={fl:['#34464f','#2b3b43','#1d282e'],ableton:['#3b3b3b','#323232','#222222'],mpc:['#1d1f26','#181a20','#0e0f13']}[th]||['#34464f','#2b3b43','#1d282e'],lw=Math.max(1,u);
  for(let r=0;r<3;r++){const y=Y0+r*(LH+gap);c.fillStyle=LANE[0];c.fillRect(X0,y,AW,LH);for(let bb=0;bb<8;bb++){if(bb%2){c.fillStyle='rgba(0,0,0,.06)';c.fillRect(X0+AW*bb/8,y,AW/8,LH)}}
   for(let i=1;i<64;i++){const x=Math.round(X0+AW*i/64);if(i%8===0){c.fillStyle=LANE[2];c.fillRect(x-lw,y,lw*2,LH)}else{c.fillStyle=LANE[1];c.fillRect(x,y,lw,LH)}}
   c.fillStyle=LANE[2];c.fillRect(X0,y,AW,lw*2);c.fillRect(X0,y+LH-lw*2,AW,lw*2);c.fillRect(X0,y,lw*2,LH);c.fillRect(X0+AW-lw*2,y,lw*2,LH)}}
 if(!A){txt(c,'LOADING THE SAMPLE...',W/2,Y0+AH/2,30*u,f,'#fff','center');finish(c,st);return}
 const pk=A.pk,Lsec=A.L,laneY=r=>Y0+r*(LH+gap),dur=cur.dur,pt=Math.max(0,tl-LEAD),scale=AW/Lsec;
 const ph=x=>{c.save();c.fillStyle=T.ph;c.shadowColor=T.ph;c.shadowBlur=10*u;c.fillRect(x-1.5*u,Y0-8*u,3*u,AH+16*u);c.restore()};
 const sIn=ease(tl/.4);
 if(s==='intro'){const p=ease(tl/1.3);c.save();c.globalAlpha=p;clipBox(c,T,X0,laneY(1),AW,LH,name,T.ca,pk,0,1,false,true,u);c.restore();const ip=ease((tl-1.4)/.3);if(ip>0){c.save();c.fillStyle='rgba(0,0,0,'+(.55*ip)+')';c.fillRect(0,0,W,H);const t1='INSIDE THE SAMPLE';txt(c,t1,W/2,H*.5,fitPx(c,t1,f,W*.85,120*u)*(1.3-.3*ip),f,'#fff','center');txt(c,String(b.title||'').toUpperCase(),W/2,H*.62,40*u,f,T.acc,'center',4);c.restore()}}
 else if(s==='a'){clipBox(c,T,X0+(1-sIn)*-AW*.3,laneY(0),AW/2,LH,name+'_A',T.ca,pk,0,.5,false,true,u);ph(X0+pt*scale)}
 else if(s==='b'){clipBox(c,T,X0,laneY(0),AW/2,LH,name+'_A',T.ca,pk,0,.5,false,false,u);clipBox(c,T,X0+AW/2+(1-sIn)*AW*.3,laneY(1),AW/2,LH,name+'_B',T.cb,pk,.5,1,false,true,u);ph(X0+AW/2+pt*scale)}
 else if(s==='full'){const m=ease(tl/.35);if(m<1){clipBox(c,T,X0,laneY(0)+(laneY(1)-laneY(0))*m,AW/2,LH,name+'_A',T.ca,pk,0,.5,false,true,u);clipBox(c,T,X0+AW/2,laneY(1),AW/2,LH,name+'_B',T.cb,pk,.5,1,false,true,u)}else clipBox(c,T,X0,laneY(1),AW,LH,name+'_FULL',T.ca,pk,0,1,false,true,u);
  if(tl<.5){c.fillStyle='rgba(255,255,255,'+(.5*(1-tl/.5))+')';c.fillRect(0,0,W,H)}ph(X0+pt*scale)}
 else if(s==='chop'){let t=0,ci=-1;A.sl.forEach((x,i)=>{const dd=x[1]-x[0]+.14;if(pt>=t&&pt<t+dd)ci=i;t+=dd});clipBox(c,T,X0,laneY(1),AW,LH,name+'_CHOPS',T.ca,pk,0,1,false,true,u);
  A.sl.forEach((x,i)=>{const sx=X0+x[0]*scale,sw=(x[1]-x[0])*scale,shown=i<=ci||pt>=t;if(i===ci){c.fillStyle='rgba(255,255,255,.22)';c.fillRect(sx,laneY(1),sw,LH);c.strokeStyle='#fff';c.lineWidth=3*u;c.strokeRect(sx,laneY(1),sw,LH)}
   if(i>0&&(i<=ci||ci<0&&pt>0)){c.save();c.strokeStyle=T.acc;c.shadowColor=T.acc;c.shadowBlur=12*u;c.lineWidth=3*u;c.beginPath();c.moveTo(sx,laneY(1)-14*u);c.lineTo(sx,laneY(1)+LH+14*u);c.stroke();c.restore()}
   if(shown){const bx=sx+sw/2,br=Math.min(16*u,LH*.3,sw*.45);c.fillStyle=i===ci?T.acc:'rgba(0,0,0,.6)';c.beginPath();c.arc(bx,laneY(2)+LH*.35,br,0,6.283);c.fill();txt(c,String(i+1),bx,laneY(2)+LH*.35+br*.38,br*1.05,'Oswald',i===ci?ink(T.acc):'#fff','center')}});
  if(th!=='mpc')txt(c,(ci+1>0?ci+1:A.sl.length)+' / '+A.sl.length+' CHOPS',X0,laneY(2)+LH*.8,18*u,'Oswald','rgba(255,255,255,.7)','left',4);else txt(c,(ci+1>0?ci+1:A.sl.length)+' / '+A.sl.length+' CHOPS',W*.5,H*.165,16*u,'Oswald','rgba(255,255,255,.75)','center',4)}
 else if(s==='loop'||s==='flip'){clipBox(c,T,X0,laneY(0),AW,LH*.8,name,T.ca,pk,0,1,false,false,u);const tot2=A.loopLen,sc2=AW/tot2,lead=s==='loop'?.9:.4;let x=X0;A.ord.forEach((i,j)=>{const sl=A.sl[i],w=(sl[1]-sl[0])*sc2,fx=X0+sl[0]*scale,p=s==='loop'?ease((tl-j*.08)/.6):1,cx=fx+(x-fx)*p,cy=laneY(0)+(laneY(1)-laneY(0))*p,col=[T.ca,T.cb,T.cc][i%3];
   const pos=((tl-lead)%tot2+tot2)%tot2,on=tl>lead&&pos*sc2>=x-X0&&pos*sc2<x-X0+w;clipBox(c,T,cx,cy,Math.max(4,w*(.35+.65*p)),LH,String(i+1),col,pk,sl[0]/Lsec,sl[1]/Lsec,false,on,u);x+=w});
  if(tl>lead)ph(X0+(((tl-lead)%tot2)*sc2));
  if(s==='flip'){const tt='WHICH VERSION WOULD YOU USE?',p=ease((tl-dur+3)/.5);if(p>0){c.save();c.globalAlpha=p;txt(c,tt,W/2,laneY(2)+LH*.7,fitPx(c,tt,f,W*.8,48*u),f,'#fff','center');txt(c,'COMMENT 1 TO 5',W/2,laneY(2)+LH*.7+34*u,20*u,'Oswald',T.acc,'center',6);c.restore()}}}
 else if(s==='slow'||s==='fast'){const r=s==='slow'?.8:1.25,wd=AW*Math.min(1,(1/r)/(1/.8))*(s==='slow'?1:1),ww=AW*(s==='slow'?1:.8),p=ease(tl/.5),w2=AW*(1+(ww/AW-1)*p)*(s==='slow'?1:1);const W2=s==='slow'?AW*(.8+.2*p):AW*(.8-.16*p);
  clipBox(c,T,X0,laneY(1),W2,LH,name+(s==='slow'?'_SLOWED':'_SPED_UP'),s==='slow'?T.cb:T.cc,pk,0,1,false,true,u);{const bx=X0+W2,by=laneY(1)-14*u,lb=r+'x';c.font=44*u+'px '+f;const bw=c.measureText(lb).width+28*u;c.fillStyle=T.acc;c.fillRect(bx-bw,by-44*u,bw,46*u);txt(c,lb,bx-bw/2,by-8*u,40*u,f,ink(T.acc),'center')}ph(X0+Math.min(W2,pt/(cur.dur-LEAD-(s==='slow'?.8:0))*W2))}
 else if(s==='rev'){const p=ease(tl/.4),sy=Math.cos(p*Math.PI);c.save();c.translate(X0+AW/2,laneY(1)+LH/2);c.scale(sy<0?-1:1,1);c.scale(Math.max(.05,Math.abs(sy)),1);c.translate(-(X0+AW/2),-(laneY(1)+LH/2));clipBox(c,T,X0,laneY(1),AW,LH,name+'_REVERSED',T.cc,pk,0,1,false,true,u);c.restore();ph(X0+AW-pt*scale)}
 else if(s==='outro'){clipBox(c,T,X0,laneY(1),AW,LH,name,T.ca,pk,0,1,false,false,u);salesCard(c,st,ease(tl/.6),Object.assign({},b,{id:sid}),b.title,'EVERY SOUND CAME FROM ONE SAMPLE')}
 if(th==='mpc'&&SCI.mpc&&s!=='outro'){const I=SCI.mpc,h=H*.72,w=I.width*h/I.height,x=W*.5-w/2,y=H*.19,sc=w/649,pw=277*sc/4,ph2=282*sc/4;c.save();c.globalCompositeOperation='screen';for(let r=0;r<4;r++)for(let q=0;q<4;q++){const n=r*4+q,on=d.fd[4+n*6]/255>.62;if(!on)continue;c.globalAlpha=.85;c.fillStyle=T.acc;c.shadowColor=T.acc;c.shadowBlur=pw*.5;c.fillRect(x+83*sc+q*pw+pw*.1,y+348*sc+r*ph2+ph2*.08,pw*.8,ph2*.72)}c.restore()}
 /* step chips */
 const chips=INS_STEPS.slice(1,-1),cw=W*.9/chips.length;chips.forEach((x,i)=>{const on=x===s,done=INS_STEPS.indexOf(x)<si;c.fillStyle=on?T.acc:done?'rgba(255,255,255,.25)':'rgba(255,255,255,.07)';c.fillRect(W*.05+i*cw+2*u,H*.93,cw-4*u,6*u)});
 if(s!=='outro'&&s!=='intro'&&th!=='mpc')meterDraw(c,W*.05+8*H/720,H*.795,W*.9-16*H/720,H*.058,d,tg,T.acc);
 finish(c,st)}

async function insEnsure(sid){if(INS[sid]&&INS[sid].n===(M.insN||8))return INS[sid];const b=M.beats.find(x=>String(x.id)===String(sid));if(!b)return null;const src=await fetchBuf(b);const A=insAnalyze(sid,src);A.n=M.insN||8;return A}

/* speed versions: each picked item becomes 3 entries (normal, slowed + reverb, sped up) */
function speedList(L){const out=[];L.forEach(b=>['n','s','f'].forEach(m=>out.push(Object.assign({},b,{id:b.id+'#'+m,_sid:b.id,_mode:m}))));return out}
let IR=null;function impulse(ctx){if(IR&&IR.sampleRate===ctx.sampleRate)return IR;const n=Math.floor(ctx.sampleRate*2.4),b=ctx.createBuffer(2,n,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6)}IR=b;return b}
function speedChain(ctx,src,m,dest){src.playbackRate.value=m.rate;if(!m.rv){src.connect(dest);return}const dry=ctx.createGain(),wet=ctx.createGain(),cv=ctx.createConvolver();cv.buffer=impulse(ctx);dry.gain.value=.78;wet.gain.value=.42;src.connect(dry);dry.connect(dest);src.connect(cv);cv.connect(wet);wet.connect(dest)}

/* ---------- 9:16 for formats built in 16:9: the 16:9 scene is rendered off-screen, then staged as a Short ----------
   blurred cover background, big title on top, the scene in the middle (with a glow frame), track + call to action + progress below */
let VOFF=null;const vScene=()=>{if(!VOFF){VOFF=document.createElement('canvas');VOFF.width=1280;VOFF.height=720}return VOFF};
const isV=()=>!!(M.v916&&!FM().vert);
function vertFrame(draw,c,st,L,k,tl,tg,tot,d,opts){const cv=vScene(),oc=cv.getContext('2d'),ow=W,oh=H;W=1280;H=720;try{draw(oc,st,L,k,tl,tg,tot,d,opts)}finally{W=ow;H=oh}
 const u=W/720,f=st.font,cur=L[k]||L[0],b=cur?cur.b:{},sid=b._sid||b.id,acc=(thOf(M.fmt)&&thOf(M.fmt).acc)||st.acc||'#e0242f';
 c.fillStyle='#050507';c.fillRect(0,0,W,H);const bd=blurBd(sid);if(bd){const s=Math.max(W/bd.width,H/bd.height)*1.1;c.drawImage(bd,(W-bd.width*s)/2,(H-bd.height*s)/2,bd.width*s,bd.height*s)}c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,0,W,H);
 const lab=({mix:K().mix,count:'TOP '+M.sel.length,vs:'BATTLE',rate:'RATED 1-10',speed:'3 SPEEDS',inside:'INSIDE THE SAMPLE'})[M.fmt]||'';
 c.font='800 '+Math.round(24*u)+'px Inter, Arial';const pw=c.measureText(lab).width+40*u;c.save();c.fillStyle=lum(acc)<.25?'#e0242f':acc;c.shadowColor=c.fillStyle;c.shadowBlur=20*u;c.fillRect((W-pw)/2,H*.07,pw,46*u);c.restore();txt(c,lab,W/2,H*.07+32*u,24*u,'Inter, Arial',ink(lum(acc)<.25?'#e0242f':acc),'center',4);
 const t=M.title.toUpperCase();const words=t.split(' ');let l1=t,l2='';if(t.length>16){const m=Math.ceil(words.length/2);l1=words.slice(0,m).join(' ');l2=words.slice(m).join(' ')}
 txt(c,l1,W/2,H*.19,fitPx(c,l1,f,W*.9,92*u),f,'#fff','center');if(l2)txt(c,l2,W/2,H*.19+80*u,fitPx(c,l2,f,W*.9,92*u),f,'#fff','center');
 const sw=W*.96,sh=sw*9/16,sx=(W-sw)/2,sy=H*.33;c.save();c.shadowColor=lum(acc)<.25?'#e0242f':acc;c.shadowBlur=36*u;c.fillStyle='#000';c.fillRect(sx,sy,sw,sh);c.restore();c.drawImage(cv,sx,sy,sw,sh);c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2*u;c.strokeRect(sx,sy,sw,sh);
 const nm=String(b.title||'').toUpperCase();txt(c,nm,W/2,sy+sh+H*.075,fitPx(c,nm,f,W*.86,64*u),f,'#fff','center');
 const meta=[b.bpm&&b.bpm+' BPM',b.musical_key,'MZPRD'].filter(Boolean).join('  •  ');txt(c,meta,W/2,sy+sh+H*.11,22*u,'Oswald',lum(acc)<.25?'#ff5a6a':acc,'center',5);
 const cta='FULL VIDEO + LINK ON MY CHANNEL';const cw=W*.84,ch=72*u,cx=(W-cw)/2,cy=H*.82;c.fillStyle='#fff';c.fillRect(cx,cy,cw,ch);txt(c,cta,W/2,cy+ch*.64,fitPx(c,cta,f,cw*.88,30*u),f,'#0b0b0d','center');
 const pr=tot?Math.min(1,tg/tot):0;c.fillStyle='rgba(255,255,255,.2)';c.fillRect(W*.08,H*.94,W*.84,8*u);c.fillStyle=lum(acc)<.25?'#e0242f':acc;c.fillRect(W*.08,H*.94,W*.84*pr,8*u)}

/* ---------- format thumbnails (Inside the Sample, Speed Versions, Rate It, Free Loop Short): 6 fresh designs each,
   built from the real cut-outs and backgrounds, laid out for 16:9 and 9:16 ---------- */
const TT_F="Anton, Impact, sans-serif";
function tCan(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tBg(x,w,h,img,dark,tint){x.fillStyle='#07070a';x.fillRect(0,0,w,h);if(img&&(img.naturalWidth||img.width)){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,s=Math.max(w/iw,h/ih);x.drawImage(img,(w-iw*s)/2,(h-ih*s)/2,iw*s,ih*s)}if(tint){x.fillStyle=tint;x.fillRect(0,0,w,h)}x.fillStyle='rgba(0,0,0,'+(dark==null?.45:dark)+')';x.fillRect(0,0,w,h)}
function tBlurCov(x,w,h,im,dark){x.fillStyle='#07070a';x.fillRect(0,0,w,h);if(im&&im.naturalWidth){x.save();x.filter='blur('+Math.round(w/40)+'px) saturate(1.3)';const s=Math.max(w/im.naturalWidth,h/im.naturalHeight)*1.15;x.drawImage(im,(w-im.naturalWidth*s)/2,(h-im.naturalHeight*s)/2,im.naturalWidth*s,im.naturalHeight*s);x.restore()}x.fillStyle='rgba(0,0,0,'+(dark==null?.5:dark)+')';x.fillRect(0,0,w,h)}
function tCov(x,im,cx,cy,s,rot,glow){x.save();x.translate(cx,cy);if(rot)x.rotate(rot);x.shadowColor=glow||'rgba(0,0,0,.85)';x.shadowBlur=s*.12;x.shadowOffsetY=glow?0:s*.04;x.fillStyle='#000';x.fillRect(-s/2,-s/2,s,s);x.shadowBlur=0;x.shadowOffsetY=0;coverSq(x,im,-s/2,-s/2,s);x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=Math.max(2,s*.008);x.strokeRect(-s/2,-s/2,s,s);x.restore()}
function tImg(x,I,cx,cy,w,rot){if(!I)return 0;const h=I.height*w/I.width;x.save();x.translate(cx,cy);if(rot)x.rotate(rot);x.shadowColor='rgba(0,0,0,.8)';x.shadowBlur=w*.08;x.shadowOffsetY=w*.03;x.drawImage(I,-w/2,-h/2,w,h);x.restore();return h}
/* big punchy thumbnail words: heavy font, thick dark stroke, drop shadow; returns the bottom y */
function tWord(x,s,cx,y,px,maxW,col,al,stroke){x.save();x.font=px+'px '+TT_F;let p=px;while(x.measureText(s).width>maxW&&p>12){p-=2;x.font=p+'px '+TT_F}x.textAlign=al||'center';x.textBaseline='alphabetic';x.lineJoin='round';x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=p*.18;x.shadowOffsetY=p*.06;x.lineWidth=p*.14;x.strokeStyle=stroke||'#000';x.strokeText(s,cx,y);x.shadowBlur=0;x.shadowOffsetY=0;x.fillStyle=col||'#fff';x.fillText(s,cx,y);x.restore();return y}
function tPill(x,s,cx,cy,px,bg,fg,al){x.save();x.font='800 '+px+'px Inter, Arial';const w=x.measureText(s).width+px*1.4,h=px*1.7,lx=al==='left'?cx:cx-w/2;x.fillStyle=bg;x.shadowColor=bg;x.shadowBlur=px*.8;x.fillRect(lx,cy-h/2,w,h);x.shadowBlur=0;x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.fillText(s,lx+w/2,cy+px*.05);x.restore()}
function tArrow(x,x1,y1,x2,y2,col,lw){x.save();x.strokeStyle=col;x.fillStyle=col;x.lineWidth=lw;x.lineCap='round';x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=lw;x.beginPath();x.moveTo(x1,y1);x.quadraticCurveTo((x1+x2)/2,Math.min(y1,y2)-lw*6,x2,y2);x.stroke();const a=Math.atan2(y2-(Math.min(y1,y2)-lw*6),x2-(x1+x2)/2);x.translate(x2,y2);x.rotate(a);x.beginPath();x.moveTo(0,0);x.lineTo(-lw*3.2,-lw*1.8);x.lineTo(-lw*3.2,lw*1.8);x.fill();x.restore()}
function tWave(x,pk,x0,y0,w,h,col,rev,cuts){const N=Math.max(30,Math.floor(w/5));x.fillStyle=col;for(let i=0;i<N;i++){let f=i/N;if(rev)f=1-f;const v=pk?pk[Math.min(pk.length-1,Math.floor(f*pk.length))]:(.3+.7*Math.abs(Math.sin(i*.37)*Math.sin(i*.11+1))),hh=Math.max(2,v*h*.48);x.fillRect(x0+i*w/N,y0+h/2-hh,Math.max(1.5,w/N*.62),hh*2)}
 if(cuts)cuts.forEach(cf=>{x.save();x.strokeStyle='#ff2d55';x.shadowColor='#ff2d55';x.shadowBlur=10;x.lineWidth=Math.max(3,w*.004);x.beginPath();x.moveTo(x0+cf*w,y0-h*.12);x.lineTo(x0+cf*w,y0+h*1.12);x.stroke();x.restore()})}
function tClip(x,x0,y0,w,h,c1,c2,name,pk,a0,a1){x.save();x.fillStyle=c2;x.fillRect(x0,y0,w,h);x.fillStyle=c1;x.globalAlpha=.25;x.fillRect(x0,y0+h*.24,w,h*.76);x.globalAlpha=1;x.fillStyle=c2;x.fillRect(x0,y0,w,h*.24);x.font='700 '+Math.round(h*.15)+'px Inter, Arial';x.fillStyle='#fff';x.textBaseline='middle';x.fillText('↠ '+name,x0+h*.1,y0+h*.12);
 const N=Math.max(10,Math.floor(w/5));x.fillStyle=c1;for(let i=0;i<N;i++){const f=a0+(a1-a0)*i/N,v=pk?pk[Math.min(pk.length-1,Math.floor(f*pk.length))]:.5,hh=Math.max(1,v*h*.32);x.fillRect(x0+i*w/N,y0+h*.62-hh,Math.max(1,w/N*.7),hh*2)}x.strokeStyle='#fff';x.lineWidth=Math.max(2,h*.03);x.strokeRect(x0,y0,w,h);x.restore()}
function tLogo(x,w,h){const v=h>w,s=v?w*.05:h*.05;x.save();x.font='800 '+Math.round(s*.7)+'px Inter, Arial';x.textAlign='right';x.fillStyle='rgba(255,255,255,.85)';x.shadowColor='#000';x.shadowBlur=8;x.fillText('MZPRD',w-s*.6,h-s*.6);x.restore()}
/* shared data for a format thumbnail */
function tData(){const L=layout(),first=L[0]&&L[0].b,sid=first&&(first._sid||first.id),im=sid&&M.cov[sid],A=sid&&INS[sid],title=String((first&&first.title)||M.title||'').toUpperCase(),covs=[...new Set(M.sel)].map(id=>M.cov[id]).filter(Boolean);
 return{L,first,sid,im,pk:A&&A.pk,cuts:A?A.sl.slice(1).map(s=>s[0]/A.L):[.12,.25,.37,.5,.62,.75,.87],title,covs:covs.length?covs:[im],n:M.sel.length||1}}
const FTH={
 inside:[
  ['KNIFE CUT',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_fl_mixer,.35);const ww=v?w*.9:w*.66,wx=v?(w-ww)/2:w*.04,wy=v?h*.42:h*.32,wh=v?h*.14:h*.36;x.fillStyle='rgba(20,24,30,.75)';x.fillRect(wx-10,wy-10,ww+20,wh+20);tWave(x,D.pk,wx,wy,ww,wh,'#ffb0b8',false,D.cuts);
   tCov(x,D.im,v?w/2:w*.84,v?h*.2:h*.3,v?w*.42:h*.42,.05);tWord(x,'CHOPPED',v?w/2:w*.36,v?h*.7:h*.88,v?w*.2:h*.2,v?w*.92:w*.66,'#fff');tWord(x,'ON EVERY HIT',v?w/2:w*.36,v?h*.8:h*.97-h*.02,v?w*.11:h*.1,v?w*.9:w*.6,'#ff4d6d');tLogo(x,w,h)}],
  ['5 FLIPS',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.55);const s=v?w*.62:h*.62;tCov(x,D.im,v?w/2:w*.3,v?h*.34:h*.5,s,-.06);const t='5';tWord(x,t,v?w*.82:w*.72,v?h*.66:h*.66,v?w*.55:h*.85,w,'#ffd34a');tWord(x,'FLIPS',v?w/2:w*.72,v?h*.8:h*.9,v?w*.22:h*.22,v?w*.9:w*.5,'#fff');tWord(x,'ONE SAMPLE',v?w/2:w*.72,v?h*.62:h*.2,v?w*.1:h*.1,v?w*.8:w*.5,'#fff');tLogo(x,w,h)}],
  ['MPC CHOPS',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_red,.45);const I=SCI.mpc,mw=v?w*.86:w*.42,mx=v?w/2:w*.27,my=v?h*.58:h*.53,mh=tImg(x,I,mx,my,mw);if(I){const sc=mw/649,ox=mx-mw/2,oy=my-mh/2;x.fillStyle='#0b0b0d';x.fillRect(ox+20*sc,oy+70*sc,406*sc,222*sc);tWave(x,D.pk,ox+30*sc,oy+110*sc,386*sc,140*sc,'#ff6b7f',false,D.cuts);x.save();x.globalCompositeOperation='screen';[0,5,6,10,15].forEach(n=>{const pw=277*sc/4,ph=282*sc/4,r=Math.floor(n/4),q=n%4;x.fillStyle='#ff3040';x.shadowColor='#ff3040';x.shadowBlur=pw*.6;x.fillRect(ox+83*sc+q*pw+pw*.1,oy+348*sc+r*ph+ph*.08,pw*.8,ph*.72)});x.restore()}
   tWord(x,'#5 IS',v?w/2:w*.73,v?h*.12:h*.4,v?w*.18:h*.22,v?w*.8:w*.48,'#fff');tWord(x,'CRAZY',v?w/2:w*.73,v?h*.22:h*.64,v?w*.24:h*.3,v?w*.9:w*.5,'#ff3040');tCov(x,D.im,v?w*.82:w*.86,v?h*.92:h*.85,v?w*.24:h*.24,.08);tLogo(x,w,h)}],
  ['BEFORE / AFTER',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_fl_mixer,.5);const s=v?w*.5:h*.5;tCov(x,D.im,v?w/2:w*.2,v?h*.2:h*.42,s,-.04);tWord(x,'SAMPLE',v?w/2:w*.2,v?h*.36:h*.82,v?w*.11:h*.11,s*1.3,'#fff');
   const cw=v?w*.86:w*.5,cx=v?(w-cw)/2:w*.44,cy=v?h*.5:h*.24,ch=v?h*.07:h*.14,cols=[['#ffb0b8','#a8323f'],['#8ff0ff','#2f8fa8'],['#c9a6ff','#5b3fa8']];[0,1,2].forEach(r=>{let xx=cx;[.22,.14,.3,.18,.16].forEach((f,j)=>{const ww=cw*f,c=cols[(r+j)%3];tClip(x,xx,cy+r*(ch+ch*.25),ww-4,ch,c[0],c[1],String(j+1+r*5),D.pk,j*.18,j*.18+.16);xx+=ww})});
   tArrow(x,v?w*.75:w*.33,v?h*.32:h*.3,v?w*.75:w*.43,v?h*.48:h*.32,'#ff2d55',v?w*.018:h*.02);tWord(x,'NEW LOOP',v?w/2:w*.69,v?h*.82:h*.86,v?w*.2:h*.2,v?w*.9:w*.5,'#ffd34a');tLogo(x,w,h)}],
  ['REVERSED?!',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_mono,.35);const ww=v?w*.88:w*.9,wx=(w-ww)/2,wy=v?h*.4:h*.36,wh=v?h*.12:h*.22;tWave(x,D.pk,wx,wy,ww/2,wh,'#8ff0ff',false);x.save();x.translate(wx+ww,0);x.scale(-1,1);tWave(x,D.pk,0,wy,ww/2,wh,'#ff6b7f',false);x.restore();
   x.fillStyle='#fff';x.fillRect(w/2-2,wy-20,4,wh+40);tWord(x,'REVERSED',w/2,v?h*.26:h*.26,v?w*.2:h*.24,w*.9,'#fff');tWord(x,'?!',v?w*.86:w*.86,v?h*.26:h*.26,v?w*.2:h*.24,w*.2,'#ff2d55');tCov(x,D.im,w/2,v?h*.72:h*.78,v?w*.42:h*.32,0,'#ff2d55');tLogo(x,w,h)}],
  ['ONE SAMPLE X3',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.6);const lb=['SLOWED','REVERSED','SPED UP'],cl=['#8ff0ff','#c9a6ff','#ffd34a'];lb.forEach((t,i)=>{const s=v?w*.3:h*.36,cx=v?w*(.2+.3*i):w*(.2+.3*i),cy=v?h*.55:h*.56;tCov(x,D.im,cx,cy,s,(i-1)*.08);tPill(x,t,cx,cy+s*.62,v?w*.035:h*.045,cl[i],'#0b0b0d')});
   tWord(x,'WHICH ONE',w/2,v?h*.2:h*.22,v?w*.15:h*.18,w*.9,'#fff');tWord(x,'HITS HARDEST?',w/2,v?h*.82:h*.95,v?w*.13:h*.15,w*.9,'#ff2d55');tLogo(x,w,h)}]],
 speed:[
  ['3 SPEEDS',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.55);[['0.8x','#8ff0ff'],['1.0x','#fff'],['1.25x','#ff4d6d']].forEach(([t,c],i)=>{if(v){const s=w*.36,cx=w*.34,cy=h*(.34+.22*i);tCov(x,D.im,cx,cy,s,0,c);tWord(x,t,w*.6,cy+w*.06,w*.16,w*.38,c,'left');return}const s=h*.38,cx=w*(.2+.3*i),cy=h*.52;tCov(x,D.im,cx,cy,s*(i===1?1.12:1),0,c);tWord(x,t,cx,cy+s*.85,h*.12,s*1.2,c)});tWord(x,'WHICH HITS HARDER?',w/2,v?h*.2:h*.18,v?w*.12:h*.13,w*.92,'#fff');tLogo(x,w,h)}],
  ['SLOWED + REVERB',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_red,.35);const R=v?w*.42:h*.42,rec=SCI['crate-record'];x.save();x.translate(v?w/2:w*.32,v?h*.42:h*.5);x.filter='blur(2px)';if(rec)x.drawImage(rec,-R,-R,R*2,R*2);x.filter='none';x.beginPath();x.arc(0,0,R*.36,0,6.283);x.clip();coverSq(x,D.im,-R*.36,-R*.36,R*.72);x.restore();
   tWord(x,'SLOWED',v?w/2:w*.72,v?h*.78:h*.42,v?w*.22:h*.24,v?w*.9:w*.5,'#fff');tWord(x,'+ REVERB',v?w/2:w*.72,v?h*.87:h*.66,v?w*.14:h*.15,v?w*.8:w*.5,'#8ff0ff');tPill(x,'0.8x',v?w/2:w*.72,v?h*.08:h*.84,v?w*.05:h*.06,'#8ff0ff','#0b0b0d');tLogo(x,w,h)}],
  ['IPOD SPEED',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_mono,.4);const I=SCI.ipod,ih=v?h*.6:h*.88,iw=I?I.width*ih/I.height:0,ix=v?w/2:w*.3,iy=v?h*.48:h*.5;if(I){const ox=ix-iw/2,oy=iy-ih/2;x.fillStyle='#000';x.fillRect(ox+iw*.06,oy+ih*.04,iw*.88,ih*.39);x.save();x.beginPath();x.rect(ox+iw*.07,oy+ih*.045,iw*.86,ih*.38);x.clip();coverSq(x,D.im,ox+iw*.07,oy+ih*.045-iw*.2,iw*.86);x.restore();tImg(x,I,ix,iy,iw);tPill(x,'1.25x',ix,oy+ih*.36,v?w*.05:h*.05,'#ff4d6d','#fff')}
   tWord(x,'SPED UP',v?w/2:w*.72,v?h*.13:h*.42,v?w*.22:h*.24,v?w*.9:w*.5,'#ff4d6d');tWord(x,'vs SLOWED',v?w/2:w*.72,v?h*.9:h*.64,v?w*.13:h*.14,v?w*.85:w*.5,'#fff');tLogo(x,w,h)}],
  ['SPLIT',(x,w,h,D)=>{const v=h>w;x.save();x.beginPath();if(v){x.moveTo(0,0);x.lineTo(w,0);x.lineTo(w,h*.45);x.lineTo(0,h*.55)}else{x.moveTo(0,0);x.lineTo(w*.55,0);x.lineTo(w*.45,h);x.lineTo(0,h)}x.closePath();x.clip();tBlurCov(x,w,h,D.im,.35);x.fillStyle='rgba(60,170,255,.35)';x.fillRect(0,0,w,h);x.restore();x.save();x.beginPath();if(v){x.moveTo(0,h*.55);x.lineTo(w,h*.45);x.lineTo(w,h);x.lineTo(0,h)}else{x.moveTo(w*.55,0);x.lineTo(w,0);x.lineTo(w,h);x.lineTo(w*.45,h)}x.closePath();x.clip();tBlurCov(x,w,h,D.im,.35);x.fillStyle='rgba(255,50,80,.35)';x.fillRect(0,0,w,h);x.restore();
   tCov(x,D.im,w/2,h/2,v?w*.42:h*.42,0,'#fff');tWord(x,'SLOW',v?w/2:w*.2,v?h*.2:h*.3,v?w*.2:h*.22,v?w*.8:w*.35,'#8ff0ff');tWord(x,'FAST',v?w/2:w*.8,v?h*.9:h*.8,v?w*.2:h*.22,v?w*.8:w*.35,'#ff4d6d');tLogo(x,w,h)}],
  ['TURNTABLE',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_red,.45);const SL=SCI.sleeve,R=v?w*.32:h*.36;if(SL)tImg(x,SL,v?w*.4:w*.26,v?h*.45:h*.5,R*2.3);x.save();x.translate(v?w*.62:w*.42,v?h*.45:h*.5);const rec=SCI['crate-record'];if(rec)x.drawImage(rec,-R,-R,R*2,R*2);x.beginPath();x.arc(0,0,R*.36,0,6.283);x.clip();coverSq(x,D.im,-R*.36,-R*.36,R*.72);x.restore();
   tWord(x,'3 SPEEDS',v?w/2:w*.78,v?h*.16:h*.45,v?w*.2:h*.2,v?w*.9:w*.4,'#fff');tWord(x,'1 LOOP',v?w/2:w*.78,v?h*.85:h*.66,v?w*.16:h*.16,v?w*.8:w*.4,'#ffd34a');tLogo(x,w,h)}],
  ['TAPE STOP',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.5);const s=v?w*.7:h*.66;for(let i=3;i>=0;i--){x.save();x.globalAlpha=i?.18:1;tCov(x,D.im,(v?w/2:w*.32)-i*s*.05,(v?h*.45:h*.5),s,0);x.restore()}tWord(x,'1.25x',v?w/2:w*.76,v?h*.15:h*.4,v?w*.24:h*.3,v?w*.9:w*.42,'#ff4d6d');tWord(x,'SPED UP',v?w/2:w*.76,v?h*.86:h*.64,v?w*.18:h*.18,v?w*.9:w*.42,'#fff');tLogo(x,w,h)}]],
 rate:[
  ['10/10',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.55);tCov(x,D.im,v?w/2:w*.3,v?h*.36:h*.5,v?w*.62:h*.66,-.05,'#ffd34a');tWord(x,'10/10',v?w/2:w*.73,v?h*.78:h*.6,v?w*.3:h*.34,v?w*.92:w*.5,'#ffd34a');tWord(x,'?',v?w*.88:w*.95,v?h*.7:h*.45,v?w*.2:h*.3,w*.2,'#fff');tLogo(x,w,h)}],
  ['MPC SCORE',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_red,.5);const I=SCI.mpc,mw=v?w*.86:w*.42,mx=v?w/2:w*.27,my=v?h*.56:h*.53,mh=tImg(x,I,mx,my,mw);if(I){const sc=mw/649,ox=mx-mw/2,oy=my-mh/2;x.fillStyle='#0b0b0d';x.fillRect(ox+20*sc,oy+70*sc,406*sc,222*sc);x.save();x.font=Math.round(150*sc)+'px '+TT_F;x.fillStyle='#3ad07a';x.textAlign='center';x.shadowColor='#3ad07a';x.shadowBlur=20;x.fillText('9/10',ox+223*sc,oy+235*sc);x.restore()}
   tWord(x,'RATING',v?w/2:w*.73,v?h*.12:h*.4,v?w*.2:h*.2,v?w*.9:w*.5,'#fff');tWord(x,'SAMPLES',v?w/2:w*.73,v?h*.21:h*.64,v?w*.18:h*.2,v?w*.9:w*.5,'#ff3040');tLogo(x,w,h)}],
  ['SPEAKERS',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_fl_mixer,.45);const I=SCI.speaker,sh=v?h*.32:h*.62;if(I){const sw=I.width*sh/I.height;tImg(x,I,v?w*.18:w*.14,v?h*.5:h*.55,sw);x.save();x.translate(v?w*.82:w*.86,0);x.scale(-1,1);tImg(x,I,0,v?h*.5:h*.55,sw);x.restore()}tCov(x,D.im,w/2,v?h*.5:h*.55,v?w*.4:h*.48,0,'#3ad07a');tWord(x,'RATED 1-10',w/2,v?h*.2:h*.2,v?w*.18:h*.17,w*.92,'#fff');tWord(x,'BRUTALLY HONEST',w/2,v?h*.86:h*.95,v?w*.11:h*.11,w*.9,'#ffd34a');tLogo(x,w,h)}],
  ['SCORE ROW',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_mono,.5);const sc=['10','8','6','3'],cl=['#ffd34a','#3ad07a','#e8e8ee','#ff3b30'],n=4;for(let i=0;i<n;i++){const s=v?w*.38:h*.36,cx=v?w*(i%2?.72:.28):w*(.14+.24*i),cy=v?h*(.32+Math.floor(i/2)*.3):h*.48;tCov(x,D.covs[i%D.covs.length]||D.im,cx,cy,s,(i-1.5)*.04);tWord(x,sc[i],cx,cy+s*.68,v?w*.12:h*.14,s,cl[i])}tWord(x,'I RATED MY SAMPLES',w/2,v?h*.12:h*.17,v?w*.11:h*.13,w*.92,'#fff');tLogo(x,w,h)}],
  ['IS THIS A 10?',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.5);tCov(x,D.im,v?w/2:w*.68,v?h*.48:h*.5,v?w*.66:h*.7,.04,'#fff');tWord(x,'IS THIS',v?w/2:w*.27,v?h*.14:h*.38,v?w*.16:h*.2,v?w*.8:w*.45,'#fff');tWord(x,'A 10?',v?w/2:w*.27,v?h*.9:h*.66,v?w*.26:h*.32,v?w*.9:w*.45,'#ffd34a');tLogo(x,w,h)}],
  ['CERTIFIED',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_fl_mixer,.5);const s=v?w*.66:h*.66;tCov(x,D.im,v?w/2:w*.3,v?h*.42:h*.5,s,-.04);x.save();x.translate(v?w/2:w*.32,v?h*.55:h*.65);x.rotate(-.18);const sw=s*1.1,sh=s*.24;x.fillStyle='rgba(0,0,0,.65)';x.fillRect(-sw/2,-sh/2,sw,sh);x.strokeStyle='#3ad07a';x.lineWidth=s*.025;x.strokeRect(-sw/2,-sh/2,sw,sh);x.restore();tWord(x,'CERTIFIED HEAT',v?w/2:w*.32,v?h*.55+s*.06:h*.65+s*.06,s*.14,s*1,'#3ad07a');tWord(x,'RATED',v?w/2:w*.76,v?h*.12:h*.5,v?w*.22:h*.24,v?w*.9:w*.42,'#fff');tLogo(x,w,h)}]],
 give:[
  ['FREE LOOP',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.5);tCov(x,D.im,v?w/2:w*.32,v?h*.48:h*.52,v?w*.66:h*.68,-.04);tPill(x,'FREE',v?w/2:w*.74,v?h*.12:h*.3,v?w*.12:h*.14,'#3ad07a','#0b0b0d');tWord(x,'LOOP',v?w/2:w*.74,v?h*.9:h*.66,v?w*.28:h*.3,v?w*.9:w*.42,'#fff');tLogo(x,w,h)}],
  ['PRICE DROP',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_red,.45);tCov(x,D.im,v?w/2:w*.3,v?h*.44:h*.5,v?w*.62:h*.64,-.03);const P=SCI.price;if(P){x.save();x.translate(v?w*.72:w*.48,v?h*.6:h*.72);x.rotate(-.18);tImg(x,P,0,0,v?w*.42:h*.42);x.strokeStyle='#ff2d55';x.lineWidth=v?w*.02:h*.02;x.beginPath();x.moveTo(-(v?w:h)*.18,(v?w:h)*.05);x.lineTo((v?w:h)*.18,-(v?w:h)*.05);x.stroke();x.restore()}
   tWord(x,'NOW',v?w/2:w*.76,v?h*.1:h*.36,v?w*.14:h*.16,v?w*.8:w*.4,'#fff');tWord(x,'FREE',v?w/2:w*.76,v?h*.9:h*.66,v?w*.3:h*.34,v?w*.9:w*.44,'#3ad07a');tLogo(x,w,h)}],
  ['SLEEVE GIFT',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_mono,.45);const SL=SCI.sleeve,R=v?w*.3:h*.34;x.save();x.translate(v?w*.6:w*.4,v?h*.45:h*.5);const rec=SCI['crate-record'];if(rec)x.drawImage(rec,-R,-R,R*2,R*2);x.beginPath();x.arc(0,0,R*.36,0,6.283);x.clip();coverSq(x,D.im,-R*.36,-R*.36,R*.72);x.restore();if(SL)tImg(x,SL,v?w*.38:w*.24,v?h*.45:h*.5,R*2.3);
   tWord(x,'FREE',v?w/2:w*.78,v?h*.14:h*.42,v?w*.3:h*.3,v?w*.9:w*.4,'#3ad07a');tWord(x,'DOWNLOAD',v?w/2:w*.78,v?h*.84:h*.62,v?w*.16:h*.14,v?w*.9:w*.4,'#fff');tLogo(x,w,h)}],
  ['CRATE FIND',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_vinyl_red,.5);const I=SCI.crate,cw=v?w*.8:w*.4,cx=v?w/2:w*.28,cy=v?h*.7:h*.62;tCov(x,D.im,cx,cy-(v?h*.15:h*.3),v?w*.42:h*.42,.06);tImg(x,I,cx,cy,cw);tWord(x,'FREE',v?w/2:w*.74,v?h*.13:h*.4,v?w*.3:h*.32,v?w*.9:w*.44,'#3ad07a');tWord(x,'SAMPLE',v?w/2:w*.74,v?h*.23:h*.62,v?w*.18:h*.2,v?w*.9:w*.44,'#fff');tLogo(x,w,h)}],
  ['IPOD FREE',(x,w,h,D)=>{const v=h>w;tBg(x,w,h,SCI.bg_fl_mixer,.5);const I=SCI.ipod,ih=v?h*.56:h*.86,iw=I?I.width*ih/I.height:0,ix=v?w/2:w*.3,iy=v?h*.52:h*.5;if(I){const ox=ix-iw/2,oy=iy-ih/2;x.fillStyle='#000';x.fillRect(ox+iw*.06,oy+ih*.04,iw*.88,ih*.39);x.save();x.beginPath();x.rect(ox+iw*.07,oy+ih*.045,iw*.86,ih*.38);x.clip();coverSq(x,D.im,ox+iw*.07,oy+ih*.045-iw*.2,iw*.86);x.restore();tImg(x,I,ix,iy,iw)}
   tWord(x,'FREE',v?w/2:w*.74,v?h*.13:h*.42,v?w*.3:h*.3,v?w*.9:w*.42,'#3ad07a');tWord(x,'LOOP DROP',v?w/2:w*.74,v?h*.92:h*.64,v?w*.16:h*.15,v?w*.9:w*.42,'#fff');tLogo(x,w,h)}],
  ['GET IT FREE',(x,w,h,D)=>{const v=h>w;tBlurCov(x,w,h,D.im,.45);x.fillStyle='rgba(58,208,122,.18)';x.fillRect(0,0,w,h);tCov(x,D.im,w/2,v?h*.42:h*.48,v?w*.6:h*.58,0,'#3ad07a');tWord(x,'GET IT FREE',w/2,v?h*.14:h*.15,v?w*.16:h*.16,w*.92,'#fff');tArrow(x,w*.3,v?h*.76:h*.84,w*.6,v?h*.86:h*.9,'#3ad07a',v?w*.02:h*.02);tPill(x,'DOWNLOAD IN DESCRIPTION',w/2,v?h*.9:h*.93,v?w*.035:h*.04,'#fff','#0b0b0d');tLogo(x,w,h)}]]};
window.__mzFT=()=>fmtThumbs();function fmtThumbs(){const L=FTH[M.fmt];if(!L)return null;return L.map(([n,f])=>({n,make:(w,h)=>{const c=tCan(w,h),x=c.getContext('2d');try{f(x,w,h,tData())}catch(e){console.warn(e)}return c}}))}

/* ---------- native 9:16 layouts (Shorts) for every 16:9 format ---------- */
function vBg(c,id,st,dark){c.fillStyle='#050507';c.fillRect(0,0,W,H);const bd=blurBd(id);if(bd){const s=Math.max(W/bd.width,H/bd.height)*1.15;c.drawImage(bd,(W-bd.width*s)/2,(H-bd.height*s)/2,bd.width*s,bd.height*s)}c.fillStyle='rgba(0,0,0,'+(dark==null?.55:dark)+')';c.fillRect(0,0,W,H);if(st&&st.tint){c.fillStyle=st.tint;c.globalAlpha=.6;c.fillRect(0,0,W,H);c.globalAlpha=1}}
function vHead(c,st,label,acc){const u=W/720;c.font='800 '+Math.round(22*u)+'px Inter, Arial';const pw=c.measureText(label).width+38*u,col=lum(acc)<.25?'#e0242f':acc;c.save();c.fillStyle=col;c.shadowColor=col;c.shadowBlur=18*u;c.fillRect((W-pw)/2,H*.04,pw,42*u);c.restore();txt(c,label,W/2,H*.04+29*u,22*u,'Inter, Arial',ink(col),'center',4)}
function vTitle(c,st,s,y,max){const u=W/720,t=String(s).toUpperCase(),ws=t.split(' ');let l1=t,l2='';if(c.font=(max||84)*u+'px '+st.font,c.measureText(t).width>W*.9&&ws.length>1){const m=Math.ceil(ws.length/2);l1=ws.slice(0,m).join(' ');l2=ws.slice(m).join(' ')}txt(c,l1,W/2,y,fitPx(c,l1,st.font,W*.9,(max||84)*u),st.font,'#fff','center');if(l2)txt(c,l2,W/2,y+(max||84)*u*.95,fitPx(c,l2,st.font,W*.9,(max||84)*u),st.font,'#fff','center');return y+(l2?(max||84)*u*.95:0)}
function vProg(c,acc,tg,tot){const u=W/720,pr=tot?Math.min(1,tg/tot):0;c.fillStyle='rgba(255,255,255,.18)';c.fillRect(W*.07,H*.955,W*.86,7*u);c.fillStyle=lum(acc)<.25?'#e0242f':acc;c.fillRect(W*.07,H*.955,W*.86*pr,7*u);txt(c,fmt(tg),W*.07,H*.945,18*u,'Oswald','rgba(255,255,255,.7)','left');txt(c,fmt(tot),W*.93,H*.945,18*u,'Oswald','rgba(255,255,255,.7)','right')}
/* MIX */
function mixV(c,st,L,k,tl,tg,tot,d){const u=W/720,cur=L[k],id=cur.b.id,b=d.bass||0;vBg(c,id,st);vHead(c,st,'MZPRD  •  '+L.length+' '+(L.length>1?K().MANY:K().ONE),st.acc);vTitle(c,st,M.title,H*.135,70);
 const cs=W*.78*(1+b*.02),cx=(W-cs)/2,cy=H*.2;if(st.scene)sceneDraw(c,st,cx,cy,cs,M.cov[id],tg,d,Math.min(1,tl/Math.max(1,cur.dur)));else{cov(c,M.cov[id],cx,cy,cs,st,false);c.strokeStyle=st.acc;c.lineWidth=3*u;c.strokeRect(cx-10*u,cy-10*u,cs+20*u,cs+20*u)}
 const ny=cy+W*.78+H*.06;txt(c,'NOW PLAYING  '+String(k+1).padStart(2,'0')+' / '+String(L.length).padStart(2,'0'),W/2,ny,20*u,'Oswald',st.acc,'center',5);const tt=cur.b.title.toUpperCase();txt(c,tt,W/2,ny+66*u,fitPx(c,tt,st.font,W*.9,72*u),st.font,'#fff','center');
 const meta=[cur.b.bpm&&cur.b.bpm+' BPM',cur.b.musical_key].filter(Boolean).join('   •   ');if(meta)txt(c,meta,W/2,ny+100*u,20*u,'Oswald','#ffd34a','center',3);
 const nx=L.slice(k+1,k+4);if(nx.length){txt(c,'UP NEXT',W*.07,H*.79,16*u,'Oswald','rgba(255,255,255,.5)','left',5);nx.forEach((o,i)=>txt(c,String(k+2+i).padStart(2,'0')+'   '+o.b.title.toUpperCase(),W*.07,H*.79+(i+1)*30*u,20*u,'Oswald','rgba(255,255,255,.75)','left',2))}
 drawVis(c,st,d,W*.07,W*.93,H*.905,H*.025);vProg(c,st.acc,tg,tot);finish(c,st)}
/* COUNTDOWN */
function countV(c,st,L,k,tl,tg,tot,d){const u=W/720,cur=L[k],id=cur.b.id,rank=L.length-k,b=d.bass||0,e=ease(tl/.7);vBg(c,id,st);vHead(c,st,'TOP '+L.length+' RANKED',st.acc);
 c.save();c.globalAlpha=e;const np=W*.42*(1.4-.4*e);c.shadowColor=rank===1?'#ffd34a':st.acc;c.shadowBlur=40*u;txt(c,'#'+rank,W/2,H*.26,np,st.font,rank===1?'#ffd34a':'#fff','center');c.restore();
 const cs=W*.74*(1+b*.02),cx=(W-cs)/2,cy=H*.3;c.save();c.globalAlpha=ease((tl-.2)/.6);cov(c,M.cov[id],cx,cy+(1-e)*40*u,cs,st,rank===1);c.restore();
 const tt=cur.b.title.toUpperCase();txt(c,tt,W/2,cy+cs+H*.07,fitPx(c,tt,st.font,W*.9,74*u),st.font,'#fff','center');txt(c,M.title.toUpperCase(),W/2,cy+cs+H*.1,20*u,'Oswald',st.acc,'center',4);
 const n=L.length,bw=W*.86/n;for(let i=0;i<n;i++){c.fillStyle=i<k?st.acc:i===k?'#fff':'rgba(255,255,255,.18)';c.fillRect(W*.07+i*bw+2*u,H*.88,bw-4*u,8*u)}drawVis(c,st,d,W*.07,W*.93,H*.84,H*.022);vProg(c,st.acc,tg,tot);finish(c,st)}
/* PACK vs PACK: A top, B bottom */
function vsV(c,st,L,k,tl,tg,tot,d){const T=thOf('vs'),u=W/720,f=st.font,bass=d.bass||0,cur=L[k],sl=H*.03;VE[k?'b':'a']=VE[k?'b':'a']*.85+bass*.15;VE[k?'a':'b']*=.97;c.fillStyle=T.bg;c.fillRect(0,0,W,H);
 const half=(s,draw)=>{c.save();c.beginPath();if(s===0){c.moveTo(0,0);c.lineTo(W,0);c.lineTo(W,H/2-sl);c.lineTo(0,H/2+sl)}else{c.moveTo(0,H/2+sl);c.lineTo(W,H/2-sl);c.lineTo(W,H);c.lineTo(0,H)}c.closePath();c.clip();draw();c.restore()};
 for(let s=0;s<2;s++){const o=L[s];if(!o)continue;const col=s?T.b:T.a,on=s===k;half(s,()=>{const bd=blurBd(o.b.id);if(bd){c.globalAlpha=on?.55:.25;const sc=Math.max(W/bd.width,H/2/bd.height)*1.1;c.drawImage(bd,(W-bd.width*sc)/2,(s?H*.75:H*.25)-bd.height*sc/2,bd.width*sc,bd.height*sc);c.globalAlpha=1}const g=c.createLinearGradient(0,s?H:0,0,H/2);g.addColorStop(0,col+(on?'66':'26'));g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.fillStyle=on?'rgba(0,0,0,.25)':'rgba(0,0,0,.6)';c.fillRect(0,0,W,H)})}
 c.save();c.shadowColor='#fff';c.shadowBlur=18*u;c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=4*u;c.beginPath();c.moveTo(0,H/2+sl);c.lineTo(W,H/2-sl);c.stroke();c.restore();
 for(let s=0;s<2;s++){const o=L[s];if(!o)continue;const col=s?T.b:T.a,on=s===k,cs=W*.46*(on?1+bass*.025:.92),cx=W/2,cy=s?H*.73:H*.25,im=M.cov[o.b.id];c.save();c.globalAlpha=on?1:.55;
  if(T.rec){const R=cs*.6;c.save();c.translate(cx,cy);c.rotate(on?tl*3.4:0);const rec=SCI['crate-record'];if(rec)c.drawImage(rec,-R,-R,R*2,R*2);c.beginPath();c.arc(0,0,R*.36,0,6.283);c.clip();coverSq(c,im,-R*.36,-R*.36,R*.72);c.restore()}
  else{c.shadowColor=on?col:'rgba(0,0,0,.8)';c.shadowBlur=on?50*u:30*u;c.fillStyle='#000';c.fillRect(cx-cs/2,cy-cs/2,cs,cs);c.shadowColor='transparent';coverSq(c,im,cx-cs/2,cy-cs/2,cs);c.strokeStyle=col;c.lineWidth=(on?6:3)*u;c.strokeRect(cx-cs/2-8*u,cy-cs/2-8*u,cs+16*u,cs+16*u)}c.restore();
  txt(c,s?'B':'A',s?W*.92:W*.08,s?H*.6:H*.12,110*u,f,on?col:col+'66',s?'right':'left');const tt=o.b.title.toUpperCase();txt(c,tt,W/2,s?H*.93:H*.44,fitPx(c,tt,f,W*.86,50*u),f,on?'#fff':'rgba(255,255,255,.55)','center');
  const bw=W*.3,bx=s?W*.06:W*.64,by=s?H*.62:H*.36,lv=Math.min(1,(s?VE.b:VE.a)*1.6+(s<k||(s===k&&tl>1)?.25:0));c.fillStyle='rgba(255,255,255,.12)';c.fillRect(bx,by,bw,12*u);c.save();c.shadowColor=col;c.shadowBlur=12*u;c.fillStyle=col;c.fillRect(bx,by,bw*lv,12*u);c.restore()}
 const r=60*u*(1+bass*.1);c.save();c.translate(W/2,H/2);c.rotate(-.08);c.shadowColor=T.badge;c.shadowBlur=40*u;c.fillStyle='#000';c.beginPath();for(let i=0;i<8;i++){const a=i/8*6.283,rr=i%2?r*.78:r*1.12;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.strokeStyle=T.badge;c.lineWidth=5*u;c.stroke();c.restore();txt(c,'VS',W/2,H/2+20*u,58*u,f,T.badge,'center');
 if(k===L.length-1&&cur&&tl>cur.dur-4.5){const a=ease((tl-(cur.dur-4.5))/.6);c.save();c.globalAlpha=a*.9;c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalAlpha=a;txt(c,'WHO WON?',W/2,H*.36,120*u,f,'#fff','center');[[0,T.a,'A'],[1,T.b,'B']].forEach(([s,col,lt])=>{const bw=W*.8,bh=100*u,bx=(W-bw)/2,by=H*.45+s*(bh+24*u);c.save();c.shadowColor=col;c.shadowBlur=30*u;c.fillStyle=col;c.fillRect(bx,by,bw,bh);c.restore();txt(c,'COMMENT '+lt+':  '+String((L[s]&&L[s].b.title)||'').toUpperCase(),W/2,by+bh*.64,fitPx(c,'COMMENT '+lt+':  '+String((L[s]&&L[s].b.title)||'').toUpperCase(),f,bw*.9,44*u),f,'#0b0b0d','center')});c.restore()}
 finish(c,st)}
/* RATE IT */
function rateV(c,st,L,k,tl,tg,tot,d){const T=thOf('rate'),th=thKey('rate'),u=W/720,f=st.font,cur=L[k],b=cur.b,v=rateOf(b.id,k,L.length),bass=d.bass||0,D=cur.dur,rs=Math.max(1,D-3.2),rp=ease((tl-rs)/1.4),shown=Math.round(v*rp),col=scoreCol(v),big=rp>0?String(shown):'?';
 vBg(c,b.id,st,.5);vHead(c,st,'RATING '+(k+1)+' OF '+L.length,T.a);const cs=W*.56*(1+bass*.02),cx=(W-cs)/2,cy=H*.09;cov(c,M.cov[b.id],cx,cy,cs,st,rp>=1&&v>=9);const tt=b.title.toUpperCase();txt(c,tt,W/2,cy+cs+H*.055,fitPx(c,tt,f,W*.9,60*u),f,'#fff','center');
 const ay=H*.5;
 if(th==='mpc'){const I=SCI.mpc,w=W*.82,x=(W-w)/2,h=shotImg(c,I,x,ay,w,u);if(I){const sc=w/649,sx=x+20*sc,sy=ay+70*sc,sw=406*sc,sh=222*sc;c.fillStyle='#0b0b0d';c.fillRect(sx,sy,sw,sh);txt(c,'SCORE',sx+sw/2,sy+sh*.2,18*u,'Oswald',T.led,'center',6);txt(c,big+(rp>0?'/10':''),sx+sw/2,sy+sh*.82,sh*.6,f,rp>0?col:'rgba(255,255,255,.25)','center');const lit=Math.round(16*v/10*rp),pw=277*sc/4,ph=282*sc/4;c.save();c.globalCompositeOperation='screen';for(let r=0;r<4;r++)for(let q=0;q<4;q++){const n=(3-r)*4+q;if(n>=lit)continue;c.globalAlpha=.85;c.fillStyle=n>=14?'#ffd34a':T.a;c.shadowColor=c.fillStyle;c.shadowBlur=pw*.6;c.fillRect(x+83*sc+q*pw+pw*.1,ay+348*sc+r*ph+ph*.08,pw*.8,ph*.72)}c.restore()}}
 else if(th==='ipod'){const I=SCI.ipod,h=H*.4,w=I?I.width*h/I.height:0,x=(W-w)/2;if(I){c.fillStyle='#0b0b0d';c.fillRect(x+w*.06,ay+h*.04,w*.88,h*.39);txt(c,'NOW RATING',W/2,ay+h*.1,14*u,'Oswald','rgba(255,255,255,.6)','center',4);txt(c,big+(rp>0?'/10':''),W/2,ay+h*.34,h*.2,f,rp>0?col:'rgba(255,255,255,.25)','center');shotImg(c,I,x,ay,w,u)}}
 else{const I=SCI.speaker,sh=H*.24*(1+bass*.03),sw=I?I.width*sh/I.height:0;if(I){shotImg(c,I,W*.02,ay+H*.06,sw,u);c.save();c.translate(W,0);c.scale(-1,1);shotImg(c,I,W*.02,ay+H*.06,sw,u);c.restore()}txt(c,'SCORE',W/2,ay+H*.06,20*u,'Oswald',T.led,'center',8);c.save();if(rp>0){c.shadowColor=col;c.shadowBlur=40*u}txt(c,big,W/2,ay+H*.27,H*.2,f,rp>0?col:'rgba(255,255,255,.2)','center');c.restore();txt(c,'/10',W/2,ay+H*.33,40*u,f,'rgba(255,255,255,.55)','center')}
 if(rp>=1){const sa=ease((tl-rs-1.4)/.35);if(sa>0){c.save();c.translate(W/2,H*.9);c.rotate(-.06);c.scale(1.6-.6*sa,1.6-.6*sa);c.globalAlpha=sa;const sw=W*.78,sh=80*u;c.fillStyle='rgba(0,0,0,.65)';c.fillRect(-sw/2,-sh/2,sw,sh);c.strokeStyle=col;c.lineWidth=5*u;c.strokeRect(-sw/2,-sh/2,sw,sh);const lb=v>=10?'PERFECT 10':v>=8?'CERTIFIED HEAT':v>=6?'SOLID':v>=4?'MID':'SKIP';txt(c,lb,0,sh*.25,fitPx(c,lb,f,sw*.86,56*u),f,col,'center');c.restore()}}
 const last=k===L.length-1,ce=last?ease((tl-(D-5))/.6):0;if(last&&ce>0){let best=L[0],bv=-1;L.forEach((o,i)=>{const r=rateOf(o.b.id,i,L.length);if(r>bv){bv=r;best=o}});salesCard(c,st,ce,best.b,best.b.title,'THE '+bv+'/10 IS IN')}finish(c,st)}
/* SPEED VERSIONS */
function speedV(c,st,L,k,tl,tg,tot,d){const T=thOf('speed'),th=thKey('speed'),u=W/720,f=st.font,cur=L[k],b=cur.b,m=SPM[b._mode]||SPM.n,sid=b._sid||b.id,bass=d.bass||0,im=M.cov[sid];vBg(c,sid,st,.5);
 const ord=['n','s','f'],cw=W*.28;ord.forEach((mk,i)=>{const on=mk===b._mode,x=W*.07+i*(cw+W*.015),y=H*.04;c.fillStyle=on?T.a:'rgba(255,255,255,.1)';c.fillRect(x,y,cw,46*u);const lb=SPM[mk].lab.replace(' + REVERB','');txt(c,lb,x+cw/2,y+31*u,fitPx(c,lb,'Oswald',cw*.86,20*u),'Oswald',on?ink(T.a):'rgba(255,255,255,.65)','center',3)});
 const tt=b.title.toUpperCase();txt(c,tt,W/2,H*.13,fitPx(c,tt,f,W*.9,64*u),f,'#fff','center');
 const mx=W/2,my=H*.39;
 if(th==='turntable'){const SL=SCI.sleeve,R=W*.34;if(SL){const sw=R*2.3,sh=SL.height*sw/SL.width;shotImg(c,SL,mx-sw*.66,my-sh/2,sw,u)}c.save();c.translate(mx+R*.32,my);c.rotate(tl*m.rate*3.49);const rec=SCI['crate-record'];if(rec)c.drawImage(rec,-R,-R,R*2,R*2);c.beginPath();c.arc(0,0,R*.36,0,6.283);c.clip();coverSq(c,im,-R*.36,-R*.36,R*.72);c.restore()}
 else if(th==='ipod'){const I=SCI.ipod,h=H*.44,w=I?I.width*h/I.height:0,x=mx-w/2,y=my-h/2;if(I){c.fillStyle='#000';c.fillRect(x+w*.06,y+h*.04,w*.88,h*.39);c.save();c.beginPath();c.rect(x+w*.07,y+h*.045,w*.86,h*.38);c.clip();coverSq(c,im,x+w*.07,y+h*.045-w*.2,w*.86);c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x+w*.07,y+h*.32,w*.86,h*.105);txt(c,(m.rate===1?'1.0':m.rate)+'x  '+m.lab,x+w/2,y+h*.39,fitPx(c,m.lab,'Oswald',w*.7,22*u),'Oswald','#fff','center',2);c.restore();shotImg(c,I,x,y,w,u)}}
 else{const I=SCI.mpc,w=W*.8,x=mx-w/2,y=H*.18;shotImg(c,I,x,y,w,u);if(I){const sc=w/649,sx=x+20*sc,sy=y+70*sc,sw=406*sc,sh=222*sc;c.save();c.beginPath();c.rect(sx,sy,sw,sh);c.clip();if(im&&im.naturalWidth){const s2=Math.max(sw/im.naturalWidth,sh/im.naturalHeight);c.drawImage(im,sx+sw/2-im.naturalWidth*s2/2,sy+sh/2-im.naturalHeight*s2/2,im.naturalWidth*s2,im.naturalHeight*s2)}c.restore();const pw=277*sc/4,ph=282*sc/4;c.save();c.globalCompositeOperation='screen';for(let r=0;r<4;r++)for(let q=0;q<4;q++){const n=r*4+q,on=(Math.floor(tl*m.rate*4)%16)===n||d.fd[4+n*6]/255>.7;if(!on)continue;c.globalAlpha=.85;c.fillStyle=T.a;c.shadowColor=T.a;c.shadowBlur=pw*.5;c.fillRect(x+83*sc+q*pw+pw*.1,y+348*sc+r*ph+ph*.08,pw*.8,ph*.72)}c.restore()}}
 const pop=ease(tl/.5);c.save();c.globalAlpha=pop;c.shadowColor=T.a;c.shadowBlur=30*u;txt(c,(m.rate===1?'1.0':m.rate)+'x',W/2,H*.73,170*u*(1.2-.2*pop),f,T.a==='#e8e8ee'?'#fff':T.a,'center');c.restore();
 txt(c,m.lab,W/2,H*.8,fitPx(c,m.lab,f,W*.9,64*u),f,'#fff','center');drawVis(c,Object.assign({},st,{acc:T.b}),d,W*.07,W*.93,H*.875,H*.025);vProg(c,T.b,tg,tot);
 const last=k===L.length-1,ce=last?ease((tl-(cur.dur-4.5))/.6):0;if(last&&ce>0)salesCard(c,st,ce,Object.assign({},b,{id:sid}),b.title,'WAV + ALL VERSIONS');finish(c,st)}
const VFR={mix:mixV,count:countV,vs:vsV,rate:rateV,speed:speedV};

function frameAny(c,st,L,k,tl,tg,tot,d,opts){if(isV()){const f=VFR[M.fmt||'mix'];if(f)return f(c,st,L,k,tl,tg,tot,d,opts);if(M.fmt==='inside')return insideFrame(c,st,L,k,tl,tg,tot,d);return vertFrame(frameCore,c,st,L,k,tl,tg,tot,d,opts)}return frameCore(c,st,L,k,tl,tg,tot,d,opts)}
function frameCore(c,st,L,k,tl,tg,tot,d,opts){if(M.fmt==='inside')return insideFrame(c,st,L,k,tl,tg,tot,d);if(M.fmt==='rate')return rateFrame(c,st,L,k,tl,tg,tot,d);if(M.fmt==='speed')return speedFrame(c,st,L,k,tl,tg,tot,d);const f=M.fmt||'mix';if(f==='count')return countFrame(c,st,L,k,tl,tg,tot,d);if(f==='vs')return vsFrame(c,st,L,k,tl,tg,tot,d);if(f==='give')return giveFrame(c,st,L,k,tl,tg,tot,d);return mixFrame(c,st,L,k,tl,tg,tot,d,opts)}
/* titles for the new formats */
const MXF={insideMulti:['{n} Samples, {f} Flips: Which Is Hardest?','I Flipped {n} {st} Samples 5 Ways Each','Flipping {n} {st} Samples Into NEW Loops ({y})','{n} Samples, Chopped on Every Hit (Sample Breakdown {y})','{n} {st} Samples Slowed, Reversed and Chopped','Sample Breakdown {y}: {n} {st} Samples, {f} Flips'],
inside:['Flipping a {st} Sample 5 Ways ("{A}")','I Flipped One {st} Sample 5 Different Ways','Flipping a {st} Sample Into a {pr} Type Loop','5 Ways to Flip ONE {st} Sample... #5 Is Crazy','I Chopped This {st} Sample on Every Hit','One Sample, 5 Flips: Which Is Hardest? ("{A}")','How to Chop a {st} Sample Perfectly ("{A}")','Chopping a {st} Sample Into a NEW Loop','Slowed vs Reversed vs Chopped: "{A}"','Inside the Sample: "{A}" (Sample Breakdown {y})','This {st} Sample Has 5 Loops Hidden In It','Ranking 5 Ways to Flip "{A}" ({st} Sample)','Flipping a {st} Sample Into a HARD Loop ({y})','Sample Breakdown: How I Flip "{A}"'],rate:['Rating My {st} {Kp} 1-10 ({y})','I Rated {n} {st} {Kp} (Brutally Honest)','Rate These {st} Loops 1-10 | {T}','{n} {Kp} Rated 1-10: Which Is a 10?','Producer Rates {st} {Kp} 1-10 ({pr} Type)','Is This a 10/10 {K1}? Rating {n} {Kp}','Rating {st} {Kp} Until I Find a 10'],
 speed:['{A} - Normal vs Slowed vs Sped Up','{A} (Slowed + Reverb) vs Sped Up #shorts','{st} Loop: Normal, Slowed + Reverb, Sped Up','Which Version Hits Harder? "{A}" (3 Speeds)','"{A}" Slowed + Reverb ({st} {K1})','{A} Sped Up vs Slowed | {st} Sample {y}'],count:['Top {n} {Kp} {y} (Ranked)','Top {n} {st} {Kp} of {y}','{n} Best {st} {Kp} {y} | #{n} to #1','Ranking My {st} {Kp}: Top {n} ({y})','Top {n} {st} {Kp} for {pr} Type Beats','#1 Will Surprise You: Top {n} {st} {Kp}','Top {n} {Kp} You Need in {y} (Ranked)','The {n} Hardest {st} {Kp} of {y}'],
 vs:['"{A}" vs "{B}" | Which {K1} Wins?','{st} {K1} Battle: {A} vs {B} ({y})','Which Is Harder? {A} vs {B}','{A} or {B}? Comment Your Pick','{K1} vs {K1}: {A} vs {B} | Vote Below','{A} vs {B} ({pr} Type {K1} Battle)','Battle of the {st} {Kp}: {A} vs {B}'],
 give:['FREE {st} Loop {y} - "{A}" (Download Below)','[FREE] {pr} Type Loop - "{A}" #shorts','Free {st} Sample Download {y} | "{A}"','FREE {st} Sample for Your Next Beat #shorts','Free Loop Friday: "{A}" (Royalty Free)','[FREE] {st} Loop / Sample - "{A}" #shorts']};
function fmtTitles(r,st){const L=layout(),n=M.fmt==='inside'||M.fmt==='speed'?M.sel.length:(new Set(L.map(o=>o.b.id)).size||M.sel.length),A=(L[0]&&L[0].b.title)||'A',B=(L[1]&&L[1].b.title)||'B',out=new Map(),T=M.fmt==='inside'&&M.sel.length>1?MXF.insideMulti:MXF[M.fmt];
 for(let g=0;g<200&&out.size<10;g++){const t=T[Math.floor(r()*T.length)].replace(/\{n\}/g,Math.max(1,n)).replace(/\{f\}/g,Math.max(1,n)*5).replace(/\{y\}/g,YEAR).replace(/\{Kp\}/g,KP()).replace(/\{K1\}/g,K1()).replace(/\{A\}/g,A).replace(/\{B\}/g,B).replace(/\{st\}/g,st[Math.floor(r()*st.length)]).replace(/\{pr\}/g,MXP[Math.floor(r()*MXP.length)]).replace(/\s+/g,' ').trim().slice(0,100);if(!out.has(t.toLowerCase()))out.set(t.toLowerCase(),{t,s:mxScore(t,M.kind)})}
 return[...out.values()].sort((a,b)=>b.s-a.s)}

/* ---------- audio ---------- */
async function fetchBuf(b){if(window.MZPrime)try{await MZPrime([b.preview_path])}catch(e){}const r=await fetch(pub(b.preview_path));if(!r.ok)throw new Error('audio');return await ctxA().decodeAudioData(await r.arrayBuffer())}
async function track48(b){
 if(b._step){await insEnsure(b._sid);const rb=await stepBuffer(b);return{L:rb.getChannelData(0).slice(),R:rb.getChannelData(1).slice(),dur:rb.duration}}
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
#mxKind,#mxFmt,#mxInsN,#mxSize{display:flex;flex-wrap:wrap;gap:0;margin:0 0 10px;border:1px solid #3a3a40}#mxKind button,#mxFmt button,#mxInsN button,#mxSize button{flex:1;background:transparent;border:0;color:#a9a9ae;font:700 10px Montserrat;letter-spacing:.14em;padding:10px 6px;cursor:pointer}#mxKind button.on,#mxFmt button.on,#mxInsN button.on,#mxSize button.on{background:#e0242f;color:#fff}.mxTl{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;max-height:260px;overflow:auto}.mxTl button{display:flex;gap:8px;align-items:center;text-align:left;background:#0c0c0f;border:1px solid #26262b;color:#e9e9ec;font:500 12px Montserrat;padding:7px 9px;cursor:pointer}.mxTl button:hover,.mxTl button.on{border-color:#e0242f}.mxTl b{flex:0 0 30px;font:700 12px Montserrat;color:#0b0b0d;background:#e8b94a;text-align:center;padding:2px 0}.mxTl b.hi{background:#3ad07a}
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
   <h4>YOUR MIX (IN ORDER)</h4><div class="lst" id="mxSel"></div><div class="msg" id="mxTot"></div><h4 style="margin-top:14px">STYLE</h4><div class="st" id="mxSt"></div><div id="mxVsW" style="display:none"><h4 style="margin-top:14px" id="mxThH">THEME</h4><div class="st" id="mxVsT"></div></div><div id="mxInsW" style="display:none"><h4 style="margin-top:14px">CHOPS</h4><div class="mxK" id="mxInsN"><button data-n="8" class="on">8 CHOPS</button><button data-n="12">12 CHOPS</button><button data-n="16">16 CHOPS</button></div></div><div id="mxDealW" style="display:none"><h4 style="margin-top:14px">SALES CARD (OPTIONAL)</h4><div class="two"><input type="text" id="mxCode" placeholder="Coupon code"><input type="number" id="mxOff" min="1" max="90" placeholder="% off"></div><input type="text" id="mxEnds" placeholder="Ends in, e.g. 48 hours" style="margin-top:6px"><div class="msg" style="margin-top:6px">Shown on the last card with the price and LINK IN DESCRIPTION.</div></div></div></div>
  <div><div class="pn"><h4>2. FORMAT</h4><div class="mxK" id="mxFmt"><button data-f="mix" class="on">MIX</button><button data-f="count">COUNTDOWN</button><button data-f="vs">PACK vs PACK</button><button data-f="give">FREE LOOP SHORT</button><button data-f="rate">RATE IT 1-10</button><button data-f="speed">SPEED VERSIONS</button><button data-f="inside" style="display:none">INSIDE THE SAMPLE</button></div><div class="mxK" id="mxSize" style="margin:0 0 8px"><button data-z="h" class="on">16:9 VIDEO</button><button data-z="v">9:16 SHORT</button></div><div class="msg" id="mxFmtHint" style="margin:-4px 0 10px">Pick tracks in order. Aim for 10 to 15 minutes.</div>
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
 $m('#mxInsN').onclick=e=>{const b=e.target.closest('button');if(!b||M.busy)return;pvStop(true);M.insN=+b.dataset.n;$m('#mxInsN').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));Object.keys(SB).forEach(k=>delete SB[k]);ui()};
 M.deal={};['#mxCode','#mxOff','#mxEnds'].forEach(id=>$m(id).oninput=()=>{M.deal={code:$m('#mxCode').value.trim(),off:+$m('#mxOff').value||0,ends:$m('#mxEnds').value.trim()};if(!PV.on)preview()});
 $m('#mxSize').onclick=e=>{const b=e.target.closest('button');if(!b||M.busy)return;pvStop(true);M.v916=b.dataset.z==='v';applySize();M.gen=null;ui();preview();genAll()};
 $m('#mxFmt').onclick=e=>{const b=e.target.closest('button');if(b)setFmt(b.dataset.f)};
 $m('#mxKind').onclick=e=>{const b=e.target.closest('button');if(b)setKind(b.dataset.k)};
 const cp=async(id,btn)=>{try{await navigator.clipboard.writeText($m(id).value);toast('COPIED')}catch(e){$m(id).select();document.execCommand('copy')}};
 $m('#mxYc').onclick=()=>cp('#mxYt');$m('#mxYdc').onclick=()=>cp('#mxYd');$m('#mxYgc').onclick=()=>cp('#mxYg');
}
function shut(){pvStop(true);box.classList.remove('on');box.setAttribute('aria-hidden','true');document.removeEventListener('keydown',key)}
function key(e){if(e.key!=='Escape')return;const lb=document.getElementById('thLb');if(lb){lb.remove();return}shut()}
function ui(){setTimeout(skTicks,0);if(M.fmt==='inside'&&M.sel.some(id=>!(INS[id]&&INS[id].n===(M.insN||8)))&&!M.insBusy){M.insBusy=1;Promise.all(M.sel.map(id=>insEnsure(id))).then(()=>{M.insBusy=0;ui();if(!PV.on)preview();M.gen=null;yt()}).catch(()=>{M.insBusy=0})}if(M.fmt==='count'&&M.sel.length&&/^Top \d+ /.test(M.title)){M.title=M.title.replace(/^Top \d+ /,'Top '+M.sel.length+' ');const ti=box&&box.querySelector('#mxTitle');if(ti)ti.value=M.title}
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
 const k=M.fmt==='inside'?Math.min(4,L.length-1):M.fmt==='speed'?Math.max(0,L.length-2):Math.min(1,L.length-1),big=pvBig();const Ld=L.map(o=>({...o,dur:o.dur||(FM().clip||180)}));frameAny(big.getContext('2d'),ST[M.style],Ld,k,M.fmt==='mix'?12:M.fmt==='rate'?Ld[k].dur-.6:M.fmt==='inside'?LEAD+2.2:4,Ld[0].dur+4,Math.max(60,total()),fakeData(1.2),{outro:false});
 c.drawImage(big,0,0,cv.width,cv.height);
}
let PVB=null;function pvBig(){if(!PVB){PVB=document.createElement('canvas');PVB.width=W;PVB.height=H}return PVB}
/* PLAY: real audio through an analyser, the frame redrawn live; when a track ends the next one starts */
async function pvPlay(k0,off0){k0=k0||0;off0=off0||0;const L=layout();if(!L.length){pvMsg('Pick '+K().many+' first.');return}pvStop(true);const GEN=PV.gen=(PV.gen||0)+1;PV.on=true;$m('#mxPlay').classList.add('on');$m('#mxPlay').innerHTML='&#9632; STOP';
 const a=ctxA();try{await a.resume()}catch(e){}const go=async k=>{if(!PV.on||PV.gen!==GEN)return;if(k>=L.length)k=0;PV.k=k;pvMsg('Loading '+L[k].b.title+'...');let buf;try{buf=L[k].b._step?(await insEnsure(L[k].b._sid),await stepBuffer(L[k].b)):await fetchBuf(L[k].b)}catch(e){pvMsg('Could not load the preview audio for '+L[k].b.title+'.');pvStop();return}if(!PV.on||PV.gen!==GEN)return;pvMsg('');if(PV.src){try{PV.src.onended=null;PV.src.stop()}catch(e){}}
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
function thCtx(){const L=playlist(),first=L[0]||M.beats[0],t=total();return{title:M.title,w:MZThumbs.words(M.title),cover:first&&M.cov[first._sid||first.id],kind:M.kind==='beats'?'beats':'packs',label:K().mix,tagText:M.fmt==='inside'?'INSIDE THE SAMPLE':M.fmt==='rate'?'RATED 1-10':M.fmt==='speed'?'SLOWED + SPED UP':M.fmt==='count'?'TOP '+M.sel.length:M.fmt==='vs'?'A VS B':M.fmt==='give'?'FREE LOOP':K().mix,infoText:L.length+' '+(L.length>1?K().MANY:K().ONE)+'   •   '+Math.max(1,Math.round(t/60))+' MIN',seed:M.seed}}
let thT=0;function thumbsAuto(){if($m('#mxTh').children.length){clearTimeout(thT);thT=setTimeout(()=>thumbs(false),500)}}
async function thumbs(bump){
 await thLoad();if(bump)M.seed+=7;const FT=fmtThumbs(),TM=FT?{count:FT.length,names:FT.map(t=>t.n),make:(i,w,h)=>FT[i].make(w,h)}:MZThumbs;const g=$m('#mxTh'),X=thCtx();g.innerHTML='';
 for(let i=0;i<TM.count;i++){const card=document.createElement('div');card.className='thc';const cv=TM.make(i,640,360,X);cv.onclick=()=>{const lb=document.createElement('div');lb.id='thLb';lb.style.cssText='position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';const big=TM.make(i,1280,720,thCtx());big.style.cssText='max-width:92vw;max-height:92vh';lb.appendChild(big);lb.onclick=()=>lb.remove();document.body.appendChild(lb)};
  const lab=document.createElement('b');lab.textContent=(i+1)+'. '+TM.names[i];const bt=document.createElement('div');bt.className='two';bt.innerHTML='<button class="btn">16:9 JPG</button><button class="btn">9:16 JPG</button>';
  bt.querySelectorAll('button').forEach((b,j)=>b.onclick=()=>{const [w,h]=j?[1080,1920]:[1280,720],c2=TM.make(i,w,h,thCtx());c2.toBlob(bl=>{if(!bl)return;const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='mix-thumb'+(i+1)+(j?'-9x16':'-16x9')+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)},'image/jpeg',.92)});
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
function mxScore(t,k){let s=50;const lo=t.toLowerCase(),L=t.length;if(M.fmt==='inside'){if(/flip|chop/.test(lo))s+=8;if(/sample/.test(lo))s+=6;if(/\d+ ways|5 flips|#5/.test(lo))s+=4;}if(L<=60)s+=14;else if(L<=70)s+=6;else if(L>100)s-=30;else s-=6;
 if(k==='beats'?/beats|instrumental|type beat/.test(lo):/sample pack|loop kit|samples|loops|sample chops/.test(lo))s+=10;if(lo.includes(String(YEAR)))s+=6;if(/\b\d+\b/.test(t.replace(String(YEAR),'')))s+=6;if(/minutes|min\)/.test(lo))s+=3;if(/type|inspired/.test(lo))s+=3;if(/royalty free|bundle|in 1/.test(lo))s+=3;if(/^\[/.test(t))s+=2;return Math.max(0,Math.min(100,s))}
function genAll(){if(!box)return;const L=layout(),n=new Set(L.map(o=>o.b.id)).size||M.sel.length,k=M.kind,r=mxRng(((M.seed2||0)+1)*7919+String(M.title).length*31+n);
 const st=MXS[k],out=new Map(),TL=MXT[k].filter(x=>total()>=120||!/\{mins\}/.test(x));for(let g=0;g<200&&out.size<10;g++){const t=TL[Math.floor(r()*TL.length)].replace(/\{T\}/g,M.title).replace(/\{n\}/g,Math.max(1,n)).replace(/\{f\}/g,Math.max(1,n)*5).replace(/\{y\}/g,YEAR).replace(/\{mins\}/g,Math.max(1,Math.round(total()/60))).replace(/\{st\}/g,st[Math.floor(r()*st.length)]).replace(/\{pr\}/g,MXP[Math.floor(r()*MXP.length)]).replace(/\s+/g,' ').trim().slice(0,100);if(!out.has(t.toLowerCase()))out.set(t.toLowerCase(),{t,s:mxScore(t,k)})}
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
 if(M.fmt&&M.fmt!=='mix'){const A=L[0]&&L[0].b,B=L[1]&&L[1].b,F=M.fmt,intro=F==='inside'&&M.sel.length>1?'I took '+M.sel.length+' samples and flipped each one 5 ways: split, chopped on every hit, rebuilt into a new loop, slowed, reversed and sped up. '+M.sel.length*5+' flips in one video. Which flip would you use? Comment the sample and the number.\n\nGet the samples (royalty free): '+K().url(A||{})+'\n\nHOW TO FLIP A SAMPLE LIKE THIS\n1. Chop on the transients (the hits), not on a grid, so every slice starts clean.\n2. Re-order the chops into a new pattern to make it yours.\n3. Try it slowed with reverb, reversed and sped up before you pick a direction.':F==='inside'?'I took one sample, "'+(A?A.title:'')+'", and flipped it 5 ways: split it, chopped it on every hit, rebuilt the chops into a brand new loop, then slowed it down, reversed it and sped it up. Which flip would you use? Comment 1 to 5.\n\nGet the sample (royalty free): '+K().url(A||{})+'\n\nHOW TO FLIP A SAMPLE LIKE THIS\n1. Chop on the transients (the hits), not on a grid, so every slice starts clean.\n2. Re-order the chops into a new pattern to make it yours.\n3. Try it slowed with reverb, reversed and sped up before you pick a direction.':F==='rate'?'I rated '+u+' '+KP().toLowerCase()+' from 1 to 10. Agree? Comment your own scores.':F==='speed'?'"'+(A?A.title:'')+'" three ways: normal, slowed + reverb and sped up. Which version hits hardest? Every version comes with it.':F==='count'?'Ranking '+u+' '+KP().toLowerCase()+' from #'+u+' down to #1. Which one should be #1? Comment below.':F==='vs'?(A&&B?'"'+A.title+'" vs "'+B.title+'". Which one wins? Comment A or B.':''):'FREE LOOP: "'+(A?A.title:'')+'" by MZPRD. Royalty free for your beats.';
  const lines=F==='inside'?L.filter(o=>o.b._step!=='outro').map(o=>fmt(o.start)+' '+(o.b._sn>1&&o.b._step!=='intro'?o.b.title+': ':'')+INS_LAB[o.b._step].charAt(0)+INS_LAB[o.b._step].slice(1).toLowerCase()).join('\n'):F==='rate'?L.map((o,i)=>fmt(o.start)+' '+o.b.title+' - '+rateOf(o.b.id,i,L.length)+'/10').join('\n'):F==='speed'?L.map(o=>fmt(o.start)+' '+o.b.title+' ('+SPM[o.b._mode].lab.toLowerCase()+')').join('\n'):F==='count'?L.map((o,i)=>fmt(o.start)+' #'+(L.length-i)+' '+o.b.title).join('\n'):F==='vs'?L.map((o,i)=>fmt(o.start)+' '+(i?'B':'A')+': '+o.b.title).join('\n'):'';
  $m('#mxYd').value=intro+(lines?'\n\n'+lines:'')+'\n\n'+(F==='give'?'GET IT (FREE): ':'LINKS\n')+[...new Map(L.map(o=>[o.b._sid||o.b.id,o.b])).values()].map(b=>(F==='give'?'':b.title+': ')+W.url(b)).join('\n')+'\n\nAll beats and sample packs: '+SITE+'\n\n'+(isV()?'#shorts ':'')+(F==='inside'?'#samplebreakdown #chopping #mzprd':F==='rate'?'#samplepack #producer #mzprd':F==='speed'?'#slowedandreverb #spedup #mzprd':F==='give'?'#shorts #freeloop #samples #mzprd':F==='vs'?'#beatbattle #samplepack #mzprd':'#top10 #samplepack #mzprd');
  const ft={inside:['flipping samples','sample flip','how to flip samples','chopping samples','how to chop samples','sample chopping','sample breakdown','flip the same sample','soul sample flip','slowed and reverb','reversed sample','fl studio sample chop','mpc chopping','boom bap sample flip','royalty free sample','samples for beats','sample flip '+YEAR],rate:['rating samples','rate my samples','sample pack review','rated 1-10','producer reacts'],speed:['slowed + reverb','sped up','slowed and reverb','sped up version','slowed reverb loop'],count:['top 10 '+KP().toLowerCase(),'best '+KP().toLowerCase()+' '+YEAR,'ranked','top '+KP().toLowerCase()+' '+YEAR],vs:[KP().toLowerCase()+' battle','which is better','beat battle','vs'],give:['free loop','free sample','free loop download','free samples '+YEAR,'royalty free loop','free soul sample','shorts']}[F];const all=[...(isV()?['shorts','youtube shorts']:[]),...ft,...(F==='inside'&&M.sel.length>1?['sample flips','multiple samples flipped','soul samples','sample chopping compilation']:[]),...L.map(o=>o.b.title),'mzprd','meztheprod'];let out=[],len=0;for(const t of [...new Set(all.map(x=>String(x).toLowerCase()))]){if(len+t.length+2>500)break;out.push(t);len+=t.length+2}$m('#mxYg').value=out.join(', ');return}
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
  await loadMuxer();await thLoad();await Promise.all(M.sel.map(id=>{const b=M.beats.find(x=>String(x.id)===id);return loadCover(b)}));await Promise.all(playlist().map(b=>probe(b).catch(()=>{})));if(M.fmt==='inside')for(const id of M.sel)await insEnsure(id);
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
  const CL=FM().clip,dOf=b=>{if(b._step)return(INS[b._sid]&&INS[b._sid].dur[b._step])||3;if(b._mode)return Math.min(SPM[b._mode].sec,(M.dur[b._sid]||1e9)/SPM[b._mode].rate);const d=M.dur[b.id]||180;return CL?Math.min(d,CL):d};const tot=list.reduce((s,b)=>s+dOf(b),0);let gUs=0,done=0;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
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
  const blob=new Blob([target.buffer],{type:'video/mp4'});dl.href=URL.createObjectURL(blob);dl.download='mzprd-'+M.kind+'-'+(M.fmt==='mix'?'mix':M.fmt==='count'?'countdown':M.fmt==='vs'?'versus':M.fmt==='inside'?'inside-the-sample':M.fmt==='rate'?'rate-it':M.fmt==='speed'?'speed-versions':'free-loop-short')+'.mp4';dl.style.display='block';$m('#mxProg').style.width='100%';
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
