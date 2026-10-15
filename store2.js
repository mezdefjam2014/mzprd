/* STOREFRONT EXTRAS: trust badges, the new bottom player, "You may also like", bundle deals, cart reminder, NEW badges,
   next-drop countdown and slashed "was" prices. Works around the existing site (same data, cart and player). */
(function(){
if(location.pathname.includes('/admin'))return;
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G=n=>{try{return (0,eval)(n)}catch(e){return undefined}};
const S=()=>G('promo')||{},BS=()=>G('beats')||[],PS=()=>G('packs')||[],m=v=>{try{return money(v)}catch(e){return'$'+Number(v).toFixed(2)}};
const NEWDAYS=14,isNew=x=>!!(x&&x.created_at&&(Date.now()-new Date(x.created_at))<NEWDAYS*864e5);
window.MZSlash=p=>{const k=Number(S().slash_pct)||0;return k>0?Math.ceil(p/(1-Math.min(k,90)/100))-.01:0};
function price(k,x){let p=Number(x.price);try{if(k==='b')p=eff(x)}catch(e){}const was=Math.max(Number(x.price)>p?Number(x.price):0,window.MZSlash(p));return(was>p?'<s>'+m(was)+'</s>':'')+m(p)}
window.MZPrice=price;window.MZIsNew=isNew;

/* 3. secure checkout badges */
const TRUST='<div class="st-trust"><span>🔒 Secure checkout</span><b>PayPal</b><b>VISA</b><b>Mastercard</b><b>AMEX</b><span>⚡ Instant download</span></div>';
function trust(){const tot=$('#modal .tot');if(tot&&!$('#modal .st-trust'))tot.insertAdjacentHTML('afterend',TRUST);
 const f=$('.st-feat .lnk');if(f&&!(f.nextElementSibling&&f.nextElementSibling.classList.contains('st-trust')))f.insertAdjacentHTML('afterend',TRUST);
 const bp=$('#bpage');if(bp&&!bp.querySelector('.st-trust')){const btn=bp.querySelector('.cart');if(btn)btn.parentElement.insertAdjacentHTML('afterend',TRUST)}}

/* the new bottom player: cover art, glowing round play, gradient progress, a little equalizer */
function player(){const bar=$('#bar');if(!bar)return;if(!bar.querySelector('.st-pcov')){bar.insertAdjacentHTML('afterbegin','<div class="st-pcov"><img alt=""></div>');bar.insertAdjacentHTML('beforeend','<div class="st-peq"><i></i><i></i><i></i><i></i><i></i></div>')}
 let it=null;const c=G('cur'),cp=G('curPack');it=cp>=0?PS()[cp]:(c>=0?BS()[c]:null);
 const img=bar.querySelector('.st-pcov img');let u='';try{u=it?coverUrl(it,128):''}catch(e){}if(u&&img.getAttribute('src')!==u)img.src=u;bar.querySelector('.st-pcov').style.display=u?'':'none';
 bar.classList.toggle('st-playing',!!G('playing'))}

/* 6. you may also like (beat and pack pages) */
function related(){const bp=$('#bpage');if(!bp||!bp.firstElementChild||!$('#v-beat.on'))return;const path=location.pathname;if(bp.dataset.rel===path&&bp.querySelector('.st-rel'))return;bp.dataset.rel=path;
 const old=bp.querySelector('.st-rel');if(old)old.remove();const isPack=/\/pack\//.test(path),slug=decodeURIComponent((path.match(/\/(beat|pack)\/([^/]+)/)||[])[2]||'');
 const all=[...BS().map((x,i)=>['b',x,i]),...PS().map((x,i)=>['p',x,i])].filter(([k,x])=>{try{return bslug(x)!==slug}catch(e){return true}});
 const same=all.filter(a=>a[0]===(isPack?'p':'b')),pool=(isPack?same:[...same,...all.filter(a=>!same.includes(a))]).slice(0,4);if(!pool.length)return;
 const box=document.createElement('section');box.className='st-sec st-rel';
 box.innerHTML='<h2>You May Also Like</h2><div class="st-grid">'+pool.map(([k,x,i])=>{let th='';try{th=thumb(x,k==='b'?i:i+2,'')}catch(e){}return '<div class="st-card" data-k="'+k+'" data-i="'+i+'"><div class="st-cv">'+th+(isNew(x)?'<span class="st-tag st-new">NEW</span>':'')+'</div><div class="st-nm">'+esc(x.title)+'</div><button class="st-pr">'+price(k,x)+'</button></div>'}).join('')+'</div>';
 bp.appendChild(box);try{paintArt(box)}catch(e){}
 box.querySelectorAll('.st-card').forEach(c=>{const k=c.dataset.k,x=(k==='b'?BS():PS())[+c.dataset.i];c.onclick=()=>{try{goItem(k==='b'?'beat':'pack',bslug(x));scrollTo(0,0)}catch(e){}};c.querySelector('.st-pr').onclick=e=>{e.stopPropagation();try{toggleCart(k+':'+x.id,e.currentTarget)}catch(er){}}})}

/* 7. bundle deals: a banner on the front page and a nudge in the cart */
function bundles(){const bl=(G('bundles')||[]).filter(b=>b.active!==false);const home=$('#v-home');
 if(home&&bl.length&&!home.querySelector('.st-bund')){const h=home.querySelector('.st-sec');const d=document.createElement('div');d.className='st-bund';
  d.innerHTML='<b>🔥 BUNDLE DEALS</b>'+bl.slice(0,3).map(b=>'<span>'+esc(b.name)+(b.kind!=='fixed'&&b.qty?' — any '+b.qty+' '+(b.kind==='any_packs'?'packs':'beats'):'')+' for '+m(b.price)+'</span>').join('');if(h)home.insertBefore(d,h)}
 const items=$('#items');if(!items)return;let note=$('#modal .st-bnudge');const c=G('cart');if(!c||!bl.length){if(note)note.remove();return}
 const nb=[...c].filter(k=>k[0]==='b').length,np=[...c].filter(k=>k[0]==='p').length;let msg='';
 for(const b of bl.filter(b=>b.kind!=='fixed'&&b.qty).sort((a,b)=>a.qty-b.qty)){const have=b.kind==='any_packs'?np:nb,need=b.qty-(have%b.qty);if(have>0&&need>0&&need<b.qty){msg='Add '+need+' more '+(b.kind==='any_packs'?'pack':'beat')+(need>1?'s':'')+' to unlock <b>'+esc(b.name)+'</b> ('+b.qty+' for '+m(b.price)+')';break}}
 if(!msg){if(note)note.remove();return}if(!note){items.insertAdjacentHTML('afterend','<div class="st-bnudge"></div>');note=$('#modal .st-bnudge')}note.innerHTML=msg}

/* 10. cart reminder: the cart is remembered on this device; coming back with items in it shows a reminder */
const CK='mzprd_cart_v1';let restored=false;
function cartMem(){const c=G('cart');if(!c)return;if(!restored){if(!BS().length&&!PS().length)return;restored=true;try{const saved=JSON.parse(localStorage.getItem(CK)||'[]');const ok=saved.filter(k=>{try{return !!lookup(k)}catch(e){return false}});
  if(ok.length&&!c.size){ok.forEach(k=>c.add(k));try{syncCart()}catch(e){}remind(ok.length)}}catch(e){}}
 try{localStorage.setItem(CK,JSON.stringify([...c]))}catch(e){}}
function remind(n){const d=document.createElement('div');d.className='st-remind';d.innerHTML='<b>Welcome back 👋</b><span>You left '+n+' item'+(n>1?'s':'')+' in your cart.</span><button>Checkout</button><a aria-label="Close">×</a>';document.body.appendChild(d);
 requestAnimationFrame(()=>d.classList.add('on'));d.querySelector('button').onclick=()=>{$('#cartBtn').click();d.remove()};d.querySelector('a').onclick=()=>d.remove();setTimeout(()=>d.classList.remove('on'),12000)}

/* 11. next drop countdown under the ticker */
function drop(){const s=S(),tk=$('.st-tick');if(!tk)return;let el=$('#stDrop');if(s.drop_day==null||s.drop_day===''){if(el)el.remove();return}
 if(!el){tk.insertAdjacentHTML('afterend','<div class="st-drop" id="stDrop"></div>');el=$('#stDrop')}
 const now=new Date(),t=new Date(now);t.setHours(Number(s.drop_hour==null?18:s.drop_hour),0,0,0);t.setDate(now.getDate()+(Number(s.drop_day)-now.getDay()+7)%7);if(t<=now)t.setDate(t.getDate()+7);
 const sec=Math.floor((t-now)/1000),d=Math.floor(sec/86400),h=Math.floor(sec%86400/3600),mi=Math.floor(sec%3600/60),se=sec%60,p=n=>String(n).padStart(2,'0');
 el.innerHTML='<span>🔥 NEXT DROP IN</span><b>'+(d?d+'<small>d</small> ':'')+p(h)+'<small>h</small> '+p(mi)+'<small>m</small> '+p(se)+'<small>s</small></b>'}

setInterval(()=>{for(const f of [trust,player,related,bundles,cartMem,drop]){try{f()}catch(e){}}},500);
})();
