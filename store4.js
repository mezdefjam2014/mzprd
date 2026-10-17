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
