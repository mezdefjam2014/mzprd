/* MZPRD sample pack coupons: the code strip at the top of the store (tap to copy + apply) and the
   SAMPLE PACK COUPONS manager in the back office PROMO tab. Codes live in the pack_coupons table;
   the checkout function applies them (percent off every sample pack in the cart). */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DAY=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const endTxt=e=>{if(!e)return'';const d=new Date(e),h=(d-Date.now())/36e5;if(h<=0)return'';if(h<24)return'ENDS TONIGHT';if(h<24*6)return'ENDS '+DAY[d.getDay()];return'ENDS '+(d.getMonth()+1)+'/'+d.getDate()};
window.MZPackCodes=[];
async function load(){try{const {data}=await sb.from('pack_coupons').select('code,pct,banner,ends_at').order('created_at',{ascending:false});window.MZPackCodes=(data||[]).filter(c=>!c.ends_at||new Date(c.ends_at)>new Date());strip();try{renderCart()}catch(e){}}catch(e){}}
/* slim strip above the header: USE CODE MZPRD10 · 10% OFF ALL SAMPLE PACKS */
function strip(){const old=document.getElementById('cpStrip');if(old)old.remove();const c=window.MZPackCodes.find(x=>x.banner);if(!c||document.getElementById('bo')&&document.getElementById('bo').offsetParent)return;
 const el=document.createElement('div');el.id='cpStrip';el.innerHTML=`<span class="cp-l">USE CODE</span><button type="button" class="cp-code" title="Copy the code">${esc(c.code)}</button><span class="cp-r"><b>${Math.round(c.pct)}% OFF</b> ALL SAMPLE PACKS</span>${endTxt(c.ends_at)?`<span class="cp-e">${endTxt(c.ends_at)}</span>`:''}<a class="cp-go" href="${(window.BASEPATH||'/')}sample-packs/">SHOP PACKS &rarr;</a>`;
 document.body.prepend(el);
 el.querySelector('.cp-code').onclick=async()=>{try{await navigator.clipboard.writeText(c.code)}catch(e){}const b=el.querySelector('.cp-code');b.dataset.t=b.textContent;b.textContent='COPIED ✓';setTimeout(()=>b.textContent=b.dataset.t,1400);try{if(typeof cart!=='undefined'&&cart.size&&!coupon)window.applyCoupon&&applyCoupon(c.code);const i=document.getElementById('cpnIn');if(i)i.value=c.code}catch(e){}}}
const css=document.createElement('style');css.textContent=`#cpStrip{position:relative;z-index:30;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;background:#0a0a0b;border-bottom:1px solid #e0242f;padding:9px 16px;font:700 11px Inter,sans-serif;letter-spacing:.16em;color:#d6d6da;text-transform:uppercase}
#cpStrip .cp-code{background:#e0242f;color:#fff;border:1px dashed rgba(255,255,255,.65);font:400 15px/1 Anton,sans-serif;letter-spacing:.12em;padding:6px 12px;cursor:pointer;transition:.15s}#cpStrip .cp-code:hover{background:#fff;color:#000}
#cpStrip .cp-r b{color:#fff}#cpStrip .cp-e{color:#e0242f}#cpStrip .cp-go{color:#fff;border-bottom:1px solid #e0242f;padding-bottom:2px}#cpStrip .cp-go:hover{color:#e0242f}
.st-pr s.was,.prc s.was,.p s.was,s.was{font:600 14px Inter,sans-serif!important;color:#e2e2e6!important;opacity:1!important;margin-left:8px;vertical-align:middle;text-decoration-color:#e0242f}
.st-card .st-cv:after{display:none!important}
/* YOU MAY ALSO LIKE sits in a dark panel with a slow red light running round the edge */
@property --mzA{syntax:'<angle>';inherits:false;initial-value:0deg}
.st-sec.st-rel{position:relative;max-width:1180px;margin-left:auto;margin-right:auto;padding:30px 34px 26px!important;background:linear-gradient(180deg,#121214,#0b0b0d);border-radius:8px;isolation:isolate}
.st-sec.st-rel:before{content:'';position:absolute;inset:0;padding:1px;border-radius:8px;background:conic-gradient(from var(--mzA),#2a2a2e 0deg,#e0242f 60deg,#ff6a72 90deg,#e0242f 120deg,#2a2a2e 180deg,#2a2a2e 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:mzSpin 6s linear infinite;pointer-events:none;z-index:-1}
.st-sec.st-rel:after{content:'';position:absolute;inset:-1px;border-radius:9px;box-shadow:0 0 50px rgba(224,36,47,.12);pointer-events:none;z-index:-2}
@keyframes mzSpin{to{--mzA:360deg}}
#mCart{display:none}
body .st-remind{position:fixed!important;left:auto!important;right:20px!important;bottom:110px!important;top:auto!important;transform:translateY(12px)!important;opacity:0;z-index:60!important;display:flex!important;align-items:center!important;gap:14px!important;width:auto!important;max-width:380px!important;padding:14px 14px 14px 18px!important;background:rgba(14,14,16,.86)!important;-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);border:1px solid rgba(255,255,255,.1)!important;border-left:2px solid #e0242f!important;border-radius:10px!important;box-shadow:0 18px 40px rgba(0,0,0,.55)!important;transition:opacity .3s ease,transform .35s ease!important;font-family:Inter,sans-serif!important}
body .st-remind.on{opacity:1;transform:none!important}
body .st-remind .rm-t{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
body .st-remind b{font:700 13px Inter,sans-serif!important;color:#fff!important;letter-spacing:.01em}body .st-remind span{font:500 12px Inter,sans-serif!important;color:#9a9aa0!important;white-space:nowrap}
body .st-remind button{flex:none;background:#e0242f!important;color:#fff!important;border:0!important;border-radius:6px!important;font:800 10px Inter,sans-serif!important;letter-spacing:.16em!important;text-transform:uppercase;padding:11px 14px!important;cursor:pointer}
body .st-remind a{flex:none;color:#6c6c72!important;font-size:18px!important;line-height:1;cursor:pointer;padding:2px 2px 2px 0;text-decoration:none!important}body .st-remind a:hover{color:#fff!important}
@media(max-width:700px){body .st-remind{left:12px!important;right:12px!important;max-width:none!important;bottom:150px!important}}
@media(max-width:700px){#mCart{display:grid;place-items:center;position:fixed;right:14px;bottom:16px;z-index:45;width:50px;height:50px;border-radius:50%;padding:0;border:1px solid rgba(255,255,255,.14);background:rgba(14,14,16,.78);-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);box-shadow:0 12px 30px rgba(0,0,0,.55);opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .25s ease,transform .3s ease,bottom .2s ease}
#mCart.on{opacity:1;transform:none;pointer-events:auto}body:has(.st-remind.on) #mCart{opacity:0!important;pointer-events:none!important}#mCart:active{transform:scale(.94)}
#mCart svg{width:21px;height:21px;fill:none;stroke:#fff;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}
#mCart b{position:absolute;top:-3px;right:-3px;min-width:19px;height:19px;border-radius:10px;background:#e0242f;color:#fff;font:700 10.5px/19px Inter,sans-serif;text-align:center;padding:0 5px;box-shadow:0 0 0 2px #0b0b0d}
#mCart.pop b{animation:mcPop .5s ease}@keyframes mcPop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}}
.kits-hd{max-width:1180px;margin:34px auto 26px;padding:0 20px}.kits-k{display:block;font:800 10px Inter,sans-serif;letter-spacing:.24em;color:#e0242f;margin-bottom:8px}.kits-hd h1{font:400 clamp(44px,6vw,76px)/.92 Anton,sans-serif;color:#fff;margin:0;text-transform:uppercase;letter-spacing:.01em}.kits-hd p{max-width:620px;margin:14px 0 0;color:#a2a2a8;font-size:15px;line-height:1.6}
.st-sec.st-picks{order:-1}.st-picks .st-pk{display:block;font:800 10px Inter,sans-serif;letter-spacing:.24em;color:#e0242f;margin-bottom:6px}
@media(prefers-reduced-motion:reduce){.st-sec.st-rel:before{animation:none}}
@media(max-width:640px){.st-sec.st-rel{padding:22px 16px!important}}
.st-rel .st-sinfo{display:flex;flex-direction:column;align-items:flex-start}.st-rel .st-sp{background:none!important;color:#fff!important;padding:0!important;box-shadow:none!important;font:400 34px/1 Anton,sans-serif!important;margin:10px 0 0!important;display:flex!important;align-items:baseline;gap:4px}
.st-rel .st-sbtn{display:inline-block!important;margin-top:18px!important;background:#e0242f!important;color:#fff!important;font:800 11px Inter,sans-serif!important;letter-spacing:.18em!important;text-transform:uppercase;padding:14px 22px!important;text-decoration:none!important;border:0!important;transition:background .15s}.st-rel .st-sl:hover .st-sbtn{background:#fff!important;color:#000!important}
body .bp.play .acts2 .pl i,body.store .bp.play .acts2 .pl i{border:0!important;width:12px;height:14px;margin:0;background:linear-gradient(90deg,#000 0 4px,transparent 4px 8px,#000 8px 12px)!important}
#bpage #bX{color:#000!important}
.st-card.playing .st-play{opacity:1!important;transform:none!important}.st-card.playing .st-play i{border:0!important;width:12px;height:14px;margin:0;border-left:4px solid #111!important;border-right:4px solid #111!important}
.st-feat .d{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:520px}
.pdesc{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line}.pdesc.open{display:block;-webkit-line-clamp:unset}
.rmore{background:none;border:0;border-bottom:1px solid #e0242f;color:#fff;font:800 10px Inter,sans-serif;letter-spacing:.18em;padding:0 0 3px;margin:10px 0 18px;cursor:pointer}.rmore:hover{color:#e0242f}
@media(max-width:600px){#cpStrip{gap:8px;font-size:10px}#cpStrip .cp-go{display:none}}`;document.head.appendChild(css);
load();

/* ---------- phones: a small cart that follows you down the page ---------- */
(function(){const b=document.createElement('button');b.id='mCart';b.type='button';b.setAttribute('aria-label','Open cart');
 b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l2.5 12h11L21 7H6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17.5" cy="19.5" r="1.5"/></svg><b>0</b>';
 document.body.appendChild(b);b.onclick=()=>{const c=document.getElementById('cartBtn');if(c)c.click()};
 const badge=document.getElementById('badge');let last=0;
 const n=()=>{try{return cart.size}catch(e){return +(badge&&badge.textContent)||0}};
 const place=()=>{const bar=document.getElementById('bar'),r=bar&&getComputedStyle(bar).display!=='none'?bar.getBoundingClientRect():null;b.style.bottom=(r&&r.height&&r.top<innerHeight?Math.round(innerHeight-r.top+10):16)+'px'};
 const sync=()=>{const k=n();b.querySelector('b').textContent=k;const far=scrollY>260,bo=document.getElementById('bo'),inBO=bo&&bo.classList.contains('on');
  b.classList.toggle('on',k>0&&far&&!inBO);if(k>last){b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')}last=k;place()};
 if(badge)new MutationObserver(sync).observe(badge,{childList:true,characterData:true,subtree:true});
 let t=0;addEventListener('scroll',()=>{if(!t)t=requestAnimationFrame(()=>{t=0;sync()})},{passive:true});addEventListener('resize',place);
 const bar=document.getElementById('bar');if(bar)new MutationObserver(place).observe(bar,{attributes:true,attributeFilter:['class','style']});sync()})();

/* ---------- back office: SAMPLE PACK COUPONS (PROMO tab) ---------- */
window.MZCouponAdmin=async function(host){const box=document.createElement('div');box.className='bi';box.style.cssText='display:block';host.appendChild(box);
 const draw=async()=>{const {data,error}=await sb.from('pack_coupons').select('*').order('created_at',{ascending:false});
  if(error){box.innerHTML='<b>SAMPLE PACK COUPONS</b><span style="display:block;margin-top:8px">Run <b>supabase/pack_coupons.sql</b> once in Supabase (SQL Editor) to switch coupons on.</span>';return}
  box.innerHTML=`<b>SAMPLE PACK COUPONS</b><span style="display:block;margin:6px 0 12px">Codes give a percent off every sample pack in the cart. The top strip shows one code (tick SHOW IN STRIP). Beats are not affected.</span>
  <div style="display:grid;grid-template-columns:1.2fr .6fr 1fr auto;gap:8px;align-items:end"><div><label>CODE</label><input type="text" id="pcC" placeholder="MZPRD10" maxlength="20" style="text-transform:uppercase"></div><div><label>% OFF</label><input type="number" id="pcP" min="1" max="90" value="10"></div><div><label>ENDS (OPTIONAL)</label><input type="datetime-local" id="pcE" style="background:#0a0a0b;border:1px solid #26262a;color:#fff;padding:11px;width:100%"></div><button type="button" class="go" id="pcAdd" style="padding:13px 16px">ADD CODE</button></div><div id="pcMsg" class="cur" style="margin-top:8px"></div>
  <div style="margin-top:14px;display:grid;gap:8px">${(data||[]).map(c=>`<div data-c="${esc(c.code)}" style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:12px;align-items:center;border:1px solid #26262a;padding:10px 12px"><span><b style="font:400 20px Anton,sans-serif;letter-spacing:.06em">${esc(c.code)}</b> <span>${Number(c.pct)}% OFF PACKS · used ${c.uses||0}× ${c.ends_at?'· ends '+new Date(c.ends_at).toLocaleString():''}</span></span><label class="chk" style="margin:0"><input type="checkbox" data-a ${c.active?'checked':''}> ON</label><label class="chk" style="margin:0"><input type="checkbox" data-b ${c.banner?'checked':''}> SHOW IN STRIP</label><button type="button" data-s style="background:none;border:1px solid #4a4a50;color:#fff;font:700 10px Inter;letter-spacing:.14em;padding:9px 12px">SAVE</button><button type="button" data-d style="background:none;border:1px solid #4a1a1d;color:#ff6b6b;font:700 10px Inter;letter-spacing:.14em;padding:9px 12px">DELETE</button></div>`).join('')||'<span>No codes yet.</span>'}</div>`;
  const msg=t=>box.querySelector('#pcMsg').textContent=t;
  box.querySelector('#pcAdd').onclick=async()=>{const code=box.querySelector('#pcC').value.trim().toUpperCase(),pct=+box.querySelector('#pcP').value,e=box.querySelector('#pcE').value;
   if(!/^[A-Z0-9-]{3,20}$/.test(code))return msg('Codes are 3-20 letters, numbers or dashes.');if(!(pct>0&&pct<=90))return msg('Pick 1 to 90 percent.');
   const {error}=await sb.from('pack_coupons').insert({code,pct,active:true,banner:false,ends_at:e?new Date(e).toISOString():null});if(error)return msg(/duplicate/.test(error.message)?'That code already exists.':error.message);draw();load()};
  box.querySelectorAll('[data-c]').forEach(r=>{const code=r.dataset.c;
   r.querySelector('[data-s]').onclick=async()=>{const banner=r.querySelector('[data-b]').checked;if(banner)await sb.from('pack_coupons').update({banner:false}).neq('code',code);const {error}=await sb.from('pack_coupons').update({active:r.querySelector('[data-a]').checked,banner}).eq('code',code);msg(error?error.message:'Saved.');draw();load()};
   r.querySelector('[data-d]').onclick=async()=>{const ok=window.askConfirm?await askConfirm('Delete the code '+code+'?'):confirm('Delete the code '+code+'?');if(!ok)return;await sb.from('pack_coupons').delete().eq('code',code);draw();load()}})};
 draw()};
})();
