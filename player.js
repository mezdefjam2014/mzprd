/* MZPRD waveform clips: the bottom player's seek bar and the big waveform on beat/pack pages are both a clip
   (red name strip, white waveform of the real audio, red playhead). Drag anywhere on a clip to scrub; on a page clip
   that is not playing yet, touching it starts that track from the spot you touched. The back button restarts the track. */
(function(){
const au=document.getElementById('au'),pg=document.getElementById('pg');if(!au||!pg)return;
const cache=new Map();
async function load(u){if(cache.has(u))return cache.get(u);const p=(async()=>{const buf=await fetch(u).then(r=>r.arrayBuffer());const C=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 const a=await new C(1,2,44100).decodeAudioData(buf),N=600,L=a.length,ch=[...Array(a.numberOfChannels)].map((_,c)=>a.getChannelData(c)),pk=new Float32Array(N),step=Math.floor(L/N)||1;
 for(let i=0;i<N;i++){let m=0;const s=i*step,e=Math.min(L,s+step);for(let j=s;j<e;j+=4)for(const d of ch){const v=Math.abs(d[j]);if(v>m)m=v}pk[i]=m}
 let mx=0;for(const v of pk)mx=Math.max(mx,v);if(mx>0)for(let i=0;i<N;i++)pk[i]/=mx;return pk})();cache.set(u,p);p.catch(()=>cache.delete(u));return p}

/* one clip: el gets the markup; o = {url(), name(), current(), start()} */
function clip(el,o){el.innerHTML='<div class="wc-h"><span></span></div><div class="wc-b"><canvas></canvas><i class="wc-ph"></i></div>';el.classList.add('wclip');
 const cv=el.querySelector('canvas'),ph=el.querySelector('.wc-ph'),nm=el.querySelector('.wc-h span');let peaks=null,url='',drag=false,pend=null;
 function draw(){const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1,W=Math.max(1,Math.round(r.width*dpr)),H=Math.max(1,Math.round(r.height*dpr));if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  const g=cv.getContext('2d');g.clearRect(0,0,W,H);const mid=H/2;g.fillStyle='#ffffff';if(!peaks){g.fillRect(0,mid-dpr/2,W,dpr);return}
  const n=peaks.length;for(let x=0;x<W;x++){const v=peaks[Math.min(n-1,Math.floor(x/W*n))],h=Math.max(dpr,v*(H*.46));g.fillRect(x,mid-h,1,h*2)}}
 function pos(){const d=au.duration,on=o.current();ph.style.left=(on&&d?Math.min(1,au.currentTime/d)*100:0)+'%';el.classList.toggle('live',on)}
 async function refresh(){nm.textContent=o.name();const u=o.url();if(!u||u===url){draw();pos();return}url=u;peaks=null;draw();try{const p=await load(u);if(url===u){peaks=p;draw()}}catch(e){}pos()}
 const frac=e=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))};
 const seek=f=>{if(o.current()&&au.duration){au.currentTime=f*au.duration;pos()}else{pend=f;o.start()}};
 el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();drag=true;try{el.setPointerCapture(e.pointerId)}catch(_){}seek(frac(e))},true);
 el.addEventListener('pointermove',e=>{if(drag&&o.current()&&au.duration){au.currentTime=frac(e)*au.duration;pos()}});
 const up=()=>drag=false;el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('click',e=>e.stopImmediatePropagation(),true);
 au.addEventListener('loadedmetadata',()=>{if(pend!=null&&o.current()){au.currentTime=pend*au.duration;pend=null}});
 return{draw,pos,refresh,el}}

const clips=new Set();let raf=0;
function tick(){clips.forEach(c=>c.el.isConnected?c.pos():clips.delete(c));if(!au.paused)raf=requestAnimationFrame(tick)}
const all=f=>clips.forEach(c=>c.el.isConnected?f(c):clips.delete(c));
au.addEventListener('loadedmetadata',()=>all(c=>c.refresh()));au.addEventListener('play',()=>{all(c=>c.refresh());cancelAnimationFrame(raf);raf=requestAnimationFrame(tick)});
['pause','seeked','emptied'].forEach(ev=>au.addEventListener(ev,()=>all(c=>c.pos())));addEventListener('resize',()=>all(c=>c.draw()));

/* bottom player */
const G=(f,d)=>{try{return f()}catch(e){return d}};
const barName=()=>{const t=document.getElementById('bt');return(t&&t.textContent.trim()&&t.textContent.trim()!=='--')?t.textContent.trim():'MZPRD'};
const bar=clip(pg,{url:()=>au.currentSrc||au.src,name:barName,current:()=>!!au.src,start:()=>{}});clips.add(bar);
new MutationObserver(()=>bar.refresh()).observe(document.getElementById('bt'),{childList:true,characterData:true,subtree:true});
pg.onclick=null;

/* beat / pack page: swap the old bar canvas for a clip */
function pageItem(){const k=G(()=>pageKind,''),i=G(()=>pageIdx,-1);const L=k==='p'?G(()=>packs,[]):G(()=>beats,[]);return{k,i,x:L[i]}}
function upgrade(){const cv=document.querySelector('#bpage canvas#bwv');if(!cv)return;const {k,i,x}=pageItem();if(!x||!x.preview_path){cv.remove();return}
 try{pwv=null}catch(e){}const box=document.createElement('div');box.className='wclip wpage';cv.replaceWith(box);
 const c=clip(box,{url:()=>G(()=>pub(x.preview_path),''),name:()=>x.title||'',current:()=>!!au.src&&(k==='p'?G(()=>curPack,-1)===i:G(()=>cur,-2)===i&&G(()=>curPack,-1)<0),
  start:()=>{k==='p'?playPack(i):play(i)}});clips.add(c);requestAnimationFrame(()=>c.refresh())}
const bp=document.getElementById('bpage');if(bp)new MutationObserver(upgrade).observe(bp,{childList:true});upgrade();

/* back button: restart the track from the top */
const pv=document.getElementById('prev');if(pv)pv.onclick=()=>{if(!au.src)return;au.currentTime=0;all(c=>c.pos());if(au.paused)au.play().catch(()=>{})};

const css=document.createElement('style');css.textContent=`
.wclip{background:none!important;box-shadow:none!important;border:1px solid #e0242f;border-radius:3px;overflow:hidden;display:flex;flex-direction:column;cursor:ew-resize;position:relative;touch-action:none;padding:0!important}
#pg.wclip{height:54px!important}#pg:before,#pg:after{display:none!important}#pg>b{display:none!important}
.wclip .wc-h{height:15px;flex:none;background:#e0242f;display:flex;align-items:center;padding:0 6px;overflow:hidden}
.wclip .wc-h span{font:700 10px/1 Inter,Arial,sans-serif;color:#fff;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 0 #5c0a10,1px 0 0 #5c0a10,-1px 0 0 #5c0a10,0 -1px 0 #5c0a10;text-transform:none}
.wclip .wc-h span:before{content:'\\25B6';font-size:7px;margin-right:5px;color:#ffd6d9;vertical-align:1px}
.wclip .wc-b{flex:1;position:relative;background:#16090b}.wclip canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.wclip .wc-ph{position:absolute;top:0;bottom:0;left:0;width:2px;margin-left:-1px;background:#e0242f;box-shadow:0 0 6px #e0242f;pointer-events:none}
.wpage{height:96px;margin:18px 0 6px;width:100%}.wpage .wc-h{height:20px;padding:0 9px}.wpage .wc-h span{font-size:11px}.wpage:not(.live) .wc-ph{opacity:0}`;
document.head.appendChild(css);requestAnimationFrame(()=>bar.refresh());
})();
