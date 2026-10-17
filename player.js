/* MZPRD bottom player: the seek bar becomes a waveform clip (purple name strip, pink waveform of the real audio),
   drag anywhere on it to scrub, and the back button restarts the track from the top. */
(function(){
const au=document.getElementById('au'),pg=document.getElementById('pg');if(!au||!pg)return;
pg.innerHTML='<div class="wc-h"><span></span></div><div class="wc-b"><canvas></canvas><i class="wc-ph"></i></div>';
const cv=pg.querySelector('canvas'),ph=pg.querySelector('.wc-ph'),nm=pg.querySelector('.wc-h span');
const cache=new Map();let peaks=null,url='',raf=0,drag=false;
function name(){const t=document.getElementById('bt');return (t&&t.textContent.trim()&&t.textContent.trim()!=='--')?t.textContent.trim():'MZPRD'}
async function load(u){if(cache.has(u))return cache.get(u);const p=(async()=>{const buf=await fetch(u).then(r=>r.arrayBuffer());const C=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 const a=await new C(1,2,44100).decodeAudioData(buf),N=600,L=a.length,ch=[...Array(a.numberOfChannels)].map((_,c)=>a.getChannelData(c)),pk=new Float32Array(N),step=Math.floor(L/N)||1;
 for(let i=0;i<N;i++){let m=0;const s=i*step,e=Math.min(L,s+step);for(let j=s;j<e;j+=4)for(const d of ch){const v=Math.abs(d[j]);if(v>m)m=v}pk[i]=m}
 let mx=0;for(const v of pk)mx=Math.max(mx,v);if(mx>0)for(let i=0;i<N;i++)pk[i]/=mx;return pk})();cache.set(u,p);p.catch(()=>cache.delete(u));return p}
function draw(){const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1,W=Math.max(1,Math.round(r.width*dpr)),H=Math.max(1,Math.round(r.height*dpr));if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
 const g=cv.getContext('2d');g.clearRect(0,0,W,H);const mid=H/2;g.fillStyle='#ffffff';
 if(!peaks){g.fillRect(0,mid-dpr/2,W,dpr);return}
 const n=peaks.length;for(let x=0;x<W;x++){const v=peaks[Math.min(n-1,Math.floor(x/W*n))],h=Math.max(dpr,v*(H*.46));g.fillRect(x,mid-h,1,h*2)}}
function pos(){const d=au.duration;ph.style.left=(d?Math.min(1,au.currentTime/d)*100:0)+'%'}
function loop(){pos();if(!au.paused)raf=requestAnimationFrame(loop)}
async function refresh(){nm.textContent=name();const u=au.currentSrc||au.src;if(!u||u===url){draw();return}url=u;peaks=null;draw();try{const p=await load(u);if(url===u){peaks=p;draw()}}catch(e){}}
au.addEventListener('loadedmetadata',refresh);au.addEventListener('play',()=>{refresh();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)});
au.addEventListener('pause',pos);au.addEventListener('seeked',pos);au.addEventListener('emptied',()=>{url='';peaks=null;draw();pos()});
new MutationObserver(()=>nm.textContent=name()).observe(document.getElementById('bt'),{childList:true,characterData:true,subtree:true});
addEventListener('resize',draw);
/* scrub: press and drag anywhere on the clip */
const seekTo=e=>{const r=pg.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));if(au.duration){au.currentTime=f*au.duration;pos()}};
pg.onclick=null;pg.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();drag=true;try{pg.setPointerCapture(e.pointerId)}catch(_){}seekTo(e)},true);
pg.addEventListener('pointermove',e=>{if(drag)seekTo(e)});const up=()=>drag=false;pg.addEventListener('pointerup',up);pg.addEventListener('pointercancel',up);
pg.addEventListener('click',e=>e.stopImmediatePropagation(),true);
/* back button: restart the track from the top */
const pv=document.getElementById('prev');if(pv)pv.onclick=()=>{if(!au.src)return;au.currentTime=0;pos();if(au.paused)au.play().catch(()=>{})};
const css=document.createElement('style');css.textContent=`
#pg{height:54px!important;background:none!important;box-shadow:none!important;border:1px solid #e0242f;border-radius:3px;overflow:hidden;display:flex;flex-direction:column;cursor:ew-resize;position:relative;touch-action:none;padding:0!important}
#pg:before,#pg:after{display:none!important}#pg>b{display:none!important}
#pg .wc-h{height:15px;flex:none;background:#e0242f;display:flex;align-items:center;padding:0 6px;overflow:hidden}
#pg .wc-h span{font:700 10px/1 Inter,Arial,sans-serif;color:#fff;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 0 #5c0a10,1px 0 0 #5c0a10,-1px 0 0 #5c0a10,0 -1px 0 #5c0a10;text-transform:none}
#pg .wc-h span:before{content:'\\25B6';font-size:7px;margin-right:5px;color:#ffd6d9;vertical-align:1px}
#pg .wc-b{flex:1;position:relative;background:#16090b}#pg canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#pg .wc-ph{position:absolute;top:0;bottom:0;left:0;width:2px;margin-left:-1px;background:#e0242f;box-shadow:0 0 6px #e0242f;pointer-events:none}`;
document.head.appendChild(css);requestAnimationFrame(()=>{refresh();pos()});
})();
