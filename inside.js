/* MZPRD pack page: WHAT'S INSIDE. Lists every sound in the pack (from packs.contents, made by the Pack Builder)
   with an 8-second preview each. Previews fade out at the end (baked in, plus a volume fade), one plays at a time,
   and the main player pauses while one plays. */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LAB={loop:'LOOP',shot:'ONE-SHOT',other:'EXTRA'},SEC=8,FADE=1.5;
const url=p=>{try{return pub(p)}catch(e){return p}};
let cur=null,au=null,raf=0,showAll=false,filt='all';
window.MZInside=function(P){const L=Array.isArray(P.contents)?P.contents:[];if(!L.length)return'';
 const n=k=>L.filter(x=>x.k===k).length,chips=[['all','ALL '+L.length]].concat(n('loop')?[['loop','LOOPS '+n('loop')]]:[],n('shot')?[['shot','ONE-SHOTS '+n('shot')]]:[],n('other')?[['other','EXTRAS '+n('other')]]:[]);
 return`<section class="ins" id="ins"><div class="ins-h"><h4>WHAT'S INSIDE</h4><span>${L.length} SOUNDS · TAP TO HEAR 8 SECONDS</span></div>
 <div class="ins-f">${chips.map(([k,t])=>`<button data-insf="${k}"${filt===k?' class="on"':''}>${t}</button>`).join('')}</div>
 <div class="ins-l">${L.map((x,i)=>`<div class="ins-r" data-k="${esc(x.k)}" data-i="${i}"${!showAll&&i>=12?' hidden':''}><button class="ins-p" data-snip="${esc(url(x.p))}" aria-label="Play ${esc(x.n)}"><i></i></button><span class="ins-n">${esc(x.n.replace(/_/g,' '))}</span><span class="ins-t">${LAB[x.k]||'SOUND'}</span><span class="ins-b">${x.bpm?x.bpm+' BPM':''}</span><span class="ins-k">${esc(x.key||'')}</span><b class="ins-bar"><u></u></b></div>`).join('')}</div>
 ${L.length>12?`<button class="ins-more" data-insmore>${showAll?'SHOW LESS':'SHOW ALL '+L.length+' SOUNDS'}</button>`:''}</section>`};
function stop(){if(au){au.pause();au=null}cancelAnimationFrame(raf);if(cur){cur.classList.remove('on');cur.querySelector('.ins-bar u').style.width='0'}cur=null}
function play(row,src){stop();
 try{if(typeof playing!=='undefined'&&playing&&typeof togglePlay==='function')togglePlay()}catch(e){}
 try{document.querySelectorAll('audio').forEach(a=>{if(!a.paused)a.pause()})}catch(e){}
 cur=row;row.classList.add('on');au=new Audio(src);au.volume=1;au.play().catch(()=>stop());const bar=row.querySelector('.ins-bar u');
 const tick=()=>{if(!au)return;const t=au.currentTime,d=Math.min(SEC,au.duration||SEC);bar.style.width=Math.min(100,t/d*100)+'%';au.volume=t>d-FADE?Math.max(0,(d-t)/FADE):1;if(au.ended||t>=d){stop();return}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
document.addEventListener('click',e=>{const p=e.target.closest('[data-snip]');if(p){const row=p.closest('.ins-r');if(cur===row){stop();return}play(row,p.dataset.snip);return}
 const f=e.target.closest('[data-insf]');if(f){filt=f.dataset.insf;const box=f.closest('.ins');box.querySelectorAll('[data-insf]').forEach(b=>b.classList.toggle('on',b===f));box.querySelectorAll('.ins-r').forEach((r,i)=>{r.hidden=!(filt==='all'||r.dataset.k===filt)||(filt==='all'&&!showAll&&i>=12)});return}
 const m=e.target.closest('[data-insmore]');if(m){showAll=!showAll;const box=m.closest('.ins');box.querySelectorAll('.ins-r').forEach((r,i)=>{if(filt==='all')r.hidden=!showAll&&i>=12});m.textContent=showAll?'SHOW LESS':'SHOW ALL '+box.querySelectorAll('.ins-r').length+' SOUNDS'}});
addEventListener('popstate',stop);addEventListener('hashchange',stop);
const css=document.createElement('style');css.textContent=`.ins{margin:44px auto 0;max-width:1100px;padding:0 4px}
.ins-h{display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;border-bottom:1px solid #1d1d20;padding-bottom:12px}.ins-h h4{font:400 clamp(30px,3.4vw,44px)/1 Anton,sans-serif;letter-spacing:.02em;color:#fff;margin:0}.ins-h span{font:700 10px Inter,sans-serif;letter-spacing:.2em;color:#7c7c82}
.ins-f{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 6px}.ins-f button{background:none;border:1px solid #2a2a2e;color:#9a9aa0;font:800 10px Inter,sans-serif;letter-spacing:.16em;padding:8px 12px;cursor:pointer}.ins-f button.on,.ins-f button:hover{border-color:#e0242f;color:#fff}.ins-f button.on{background:#e0242f}
.ins-l{display:grid;gap:2px}.ins-r{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) 92px 70px 52px;gap:12px;align-items:center;padding:10px 12px;background:#0f0f11;border:1px solid transparent;transition:border-color .15s,background .15s;overflow:hidden}.ins-r[hidden]{display:none}
.ins-r:hover{border-color:#2a2a2e;background:#131316}.ins-r.on{border-color:#e0242f;background:#140a0c}
.ins-p{width:34px;height:34px;border-radius:50%;border:1px solid #3a3a40;background:none;display:grid;place-items:center;cursor:pointer;transition:.15s}.ins-p i{width:0;height:0;border-left:9px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;margin-left:3px}
.ins-r.on .ins-p{background:#e0242f;border-color:#e0242f}.ins-r.on .ins-p i{border:0;width:9px;height:10px;margin:0;border-left:3px solid #fff;border-right:3px solid #fff}
.ins-n{font:600 13px Inter,sans-serif;color:#e6e6ea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ins-t{font:800 9px Inter,sans-serif;letter-spacing:.16em;color:#e0242f}.ins-b,.ins-k{font:700 11px Inter,sans-serif;color:#8a8a90;text-align:right}
.ins-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;background:transparent}.ins-bar u{display:block;height:100%;width:0;background:#e0242f;transition:width .1s linear}
.ins-more{display:block;margin:14px auto 0;background:none;border:1px solid #333;color:#fff;font:800 11px Inter,sans-serif;letter-spacing:.18em;padding:13px 22px;cursor:pointer}.ins-more:hover{border-color:#fff}
@media(max-width:640px){.ins-r{grid-template-columns:36px minmax(0,1fr) 64px;gap:10px}.ins-k,.ins-b{display:none}}`;document.head.appendChild(css);
})();
