/* BUYER DASHBOARD: the signed-in account becomes a full dashboard (purchases with covers + downloads, inbox with unread
   messages from the back office, new releases since the last visit, saved items). Uses the existing account data. */
(function(){
if(location.pathname.includes('/admin'))return;
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G=n=>{try{return (0,eval)(n)}catch(e){return undefined}};
const BS=()=>G('beats')||[],PS=()=>G('packs')||[],U=()=>G('acUser');
const SEEN='mzprd_rel_seen',seen=()=>{try{return +localStorage.getItem(SEEN)||0}catch(e){return 0}};
const allItems=()=>[...BS().map((x,i)=>['b',x,i]),...PS().map((x,i)=>['p',x,i])];
const newRel=()=>{const s=seen()||Date.now()-14*864e5;return PS().map((x,i)=>['p',x,i]).filter(([k,x])=>x.created_at&&new Date(x.created_at).getTime()>s).sort((a,b)=>new Date(b[1].created_at)-new Date(a[1].created_at))};
const cover=(x,k,i)=>{try{return thumb(x,k==='b'?i:i+2,'')}catch(e){return''}};
const findItem=t=>allItems().find(([k,x])=>String(x.title).toLowerCase()===String(t).toLowerCase());
let unread=0,tab='home';
const api={msgs:async()=>{try{return(await sb.from('messages').select('*').order('created_at',{ascending:false}).limit(30)).data||[]}catch(e){return[]}},
 readAt:async()=>{try{const {data:f}=await sb.from('favorites').select('msgs_read_at').eq('user_id',U().id).maybeSingle();return f&&f.msgs_read_at?new Date(f.msgs_read_at).getTime():0}catch(e){return 0}},
 markRead:async()=>{try{await sb.from('favorites').upsert({user_id:U().id,msgs_read_at:new Date().toISOString()})}catch(e){}},
 orders:async()=>{try{await acctClaim()}catch(e){}return acCall({action:'orders'})},
 download:(t,i)=>acCall({action:'download',token:t,i})};
window.MZDash=api;

async function counts(){if(!U()){badge(0);return}const ms=await api.msgs(),last=await api.readAt();unread=ms.filter(m=>new Date(m.created_at).getTime()>last).length;badge(unread+newRel().length)}
function badge(n){const b=$('#acctBtn');if(!b)return;let d=b.querySelector('.st-abadge');if(!d){d=document.createElement('span');d.className='st-abadge';b.appendChild(d)}d.textContent=n>9?'9+':String(n);d.style.display=n?'':'none'}

async function render(){const u=U(),b=$('#acBody');if(!u||!b)return false;$('#acct').classList.add('st-dash');const rel=newRel();
 b.innerHTML='<div class="sd-head"><div class="sd-av">'+esc(u.email[0].toUpperCase())+'</div><div><b>My account</b><span>'+esc(u.email)+'</span></div></div>'+
 '<div class="sd-tabs"><button data-t="home">Overview</button><button data-t="buys">Purchases</button><button data-t="inbox">Inbox'+(unread?'<i>'+unread+'</i>':'')+'</button><button data-t="new">New releases'+(rel.length?'<i>'+rel.length+'</i>':'')+'</button><button data-t="saved">Saved</button></div>'+
 '<div class="sd-body" id="sdBody"></div><div class="sd-foot"><button id="sdOut">Log out</button></div>';
 b.querySelectorAll('.sd-tabs button').forEach(x=>x.onclick=()=>{tab=x.dataset.t;show.rb=false;show()});
 $('#sdOut').onclick=async()=>{try{await sb.auth.signOut()}catch(e){}try{(0,eval)("isAdmin=false;acUser=null;LINK.textContent='LOGIN'")}catch(e){}$('#acct').classList.remove('on','st-dash');badge(0);try{toast('LOGGED OUT')}catch(e){}};
 show();return true}

let OC=null;async function orders(){if(OC&&Date.now()-OC.t<20000)return OC.o;try{const r=await api.orders();OC={t:Date.now(),o:r.orders||[],rd:r.redownload};return OC.o}catch(e){return null}}
async function show(){const body=$('#sdBody');if(!body)return;document.querySelectorAll('.sd-tabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===tab));body.innerHTML='<div class="sd-load">Loading…</div>';
 if(tab==='home'){const o=await orders(),rel=newRel(),n=o?o.reduce((s,x)=>s+x.items.length,0):0;
  body.innerHTML='<div class="sd-stats"><div><b>'+n+'</b><span>Purchases</span></div><div><b>'+unread+'</b><span>New messages</span></div><div><b>'+rel.length+'</b><span>New releases</span></div><div><b>'+(G('liked')||new Set()).size+'</b><span>Saved</span></div></div>'+
  (unread?'<button class="sd-alert" data-go="inbox">✉ You have '+unread+' new message'+(unread>1?'s':'')+' from MZPRD →</button>':'')+
  (rel.length?'<h4>New since your last visit</h4>'+grid(rel.slice(0,4)):'')+'<h4>Recent purchases</h4>'+(o&&o.length?buyList(o.slice(0,2)):'<p class="sd-empty">Nothing yet. Purchases made while signed in show up here.</p>');
  body.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>{tab=x.dataset.go;show()});wireGrid(body);wireBuys(body);return}
 if(tab==='buys'){const o=await orders();body.innerHTML=o===null?'<p class="sd-empty">Could not load your purchases.</p>':!o.length?'<p class="sd-empty">Nothing yet. Purchases made while signed in show up here.</p>':buyList(o);wireBuys(body);return}
 if(tab==='inbox'){const ms=await api.msgs(),last=await api.readAt();
  body.innerHTML=ms.length?'<div class="sd-inbox">'+ms.map(m=>{const nw=new Date(m.created_at).getTime()>last;return '<details class="sd-msg'+(nw?' new':'')+'"'+(nw?' open':'')+'><summary><span class="sd-dot"></span><b>'+esc(m.subject)+'</b><em>'+(m.kind==='promo'?'Offer':'Message')+' · '+new Date(m.created_at).toLocaleDateString()+'</em></summary><p>'+esc(m.body)+'</p></details>'}).join('')+'</div>':'<p class="sd-empty">No messages yet.</p>';
  await api.markRead();unread=0;counts();const t=document.querySelector('.sd-tabs [data-t="inbox"] i');if(t)t.remove();return}
 if(tab==='new'){const RB=show.rb,K=RB?'b':'p',ARR=RB?BS():PS(),rel=newRel(),isN=new Set(RB?ARR.filter(x=>window.MZIsNew&&MZIsNew(x)).map(x=>x.id):rel.map(r=>r[1].id)),list=ARR.map((x,i)=>[K,x,i]).sort((a,b)=>new Date(b[1].created_at||0)-new Date(a[1].created_at||0)).slice(0,RB?10:99);
  body.innerHTML=(RB?'<h4 style="margin-top:0">Latest beats</h4>':'')+(list.length?'<div class="sd-rel">'+list.map(([k,x,i])=>{const inC=(()=>{try{return cart.has(K+':'+x.id)}catch(e){return false}})();let pr='';try{pr=window.MZPrice?MZPrice(K,x):money(x.price)}catch(e){}return '<div class="sd-rr" data-i="'+i+'"><div class="sd-bc">'+cover(x,K,i)+'</div>'+(x.preview_path?'<button class="sd-rp" aria-label="Play"><i></i></button>':'<span></span>')+'<div class="sd-bt"><b>'+esc(x.title)+(isN.has(x.id)?' <em class="sd-nw">NEW</em>':'')+'</b><span>'+(RB?'Beat':'Sample pack')+'</span></div><div class="sd-rpr">'+pr+'</div><button class="sd-dl sd-add">'+(inC?'In cart':'Add to cart')+'</button></div>'}).join('')+'</div>':'<p class="sd-empty">Nothing here yet.</p>')+
  '<div class="sd-relb"><button class="sd-dl" id="sdCheck">Checkout →</button><button class="sd-beats" id="sdBeats">'+(RB?'← SAMPLE PACKS':'BEATS')+'</button></div>';
  try{paintArt(body)}catch(e){}
  body.querySelectorAll('.sd-rr').forEach(r=>{const i=+r.dataset.i,x=ARR[i];const pl=r.querySelector('.sd-rp');if(pl)pl.onclick=()=>{try{RB?play(i):playPack(i)}catch(e){}setTimeout(()=>body.querySelectorAll('.sd-rp').forEach((b,q)=>b.classList.toggle('on',((RB?G('cur'):G('curPack'))===+b.closest('.sd-rr').dataset.i)&&!!G('playing'))),120)};
   r.querySelector('.sd-add').onclick=e=>{try{toggleCart(K+':'+x.id,e.currentTarget)}catch(er){}const c=G('cart');e.currentTarget.textContent=c&&c.has(K+':'+x.id)?'In cart':'Add to cart'};
   r.querySelector('.sd-bt b').onclick=()=>{$('#acct').classList.remove('on');try{goItem(RB?'beat':'pack',bslug(x))}catch(er){}}});
  $('#sdCheck').onclick=()=>{$('#acct').classList.remove('on');$('#cartBtn').click()};
  $('#sdBeats').onclick=()=>{show.rb=!RB;show()};
  try{localStorage.setItem(SEEN,String(Date.now()))}catch(e){}counts();const t=document.querySelector('.sd-tabs [data-t="new"] i');if(t)t.remove();return}
 if(tab==='saved'){const lk=G('liked')||new Set(),it=[...lk].map(k=>{try{const x=lookup(k);if(!x)return null;const arr=k[0]==='b'?BS():PS();return[k[0],x,arr.indexOf(x)]}catch(e){return null}}).filter(Boolean);
  body.innerHTML=it.length?grid(it):'<p class="sd-empty">Tap the heart on any beat or pack to save it here.</p>';wireGrid(body)}}

function buyList(o){return(OC&&OC.rd===false?'<p class="sd-empty">Re-downloads are switched off right now.</p>':'')+o.map(ord=>'<div class="sd-order"><div class="sd-date">'+new Date(ord.paid_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})+'</div>'+ord.items.map(x=>{const f=findItem(x.title);return '<div class="sd-buy"><div class="sd-bc">'+(f?cover(f[1],f[0],f[2]):'')+'</div><div class="sd-bt"><b>'+esc(x.title)+'</b><span>'+(f?(f[0]==='p'?'Sample pack':'Beat'):'')+'</span></div>'+(x.available?'<button class="sd-dl" data-t="'+esc(ord.token)+'" data-i="'+x.i+'">Download</button>':'<em>—</em>')+'</div>'}).join('')+'</div>').join('')}
function wireBuys(root){try{paintArt(root)}catch(e){}root.querySelectorAll('.sd-dl').forEach(d=>d.onclick=async()=>{d.disabled=true;d.textContent='…';
 try{const j=await api.download(d.dataset.t,Number(d.dataset.i));const a=document.createElement('a');a.href=j.url;a.download='';document.body.appendChild(a);a.click();a.remove();d.textContent='Done ✓'}catch(e){d.textContent='Error'}
 setTimeout(()=>{d.disabled=false;d.textContent='Download'},2500)})}
function grid(list){return '<div class="sd-grid">'+list.map(([k,x,i])=>'<div class="sd-it" data-k="'+k+'" data-i="'+i+'"><div class="sd-ic">'+cover(x,k,i)+'</div><b>'+esc(x.title)+'</b><span>'+(k==='p'?'Sample pack':'Beat')+'</span></div>').join('')+'</div>'}
function wireGrid(root){try{paintArt(root)}catch(e){}root.querySelectorAll('.sd-it').forEach(c=>c.onclick=()=>{const k=c.dataset.k,x=(k==='b'?BS():PS())[+c.dataset.i];if(!x)return;$('#acct').classList.remove('on');try{goItem(k==='b'?'beat':'pack',bslug(x))}catch(e){}})}

const orig=G('acctRender');if(typeof orig==='function'){window.acctRender=async function(){if(U()){await counts();if(await render())return}$('#acct').classList.remove('st-dash');return orig.apply(this,arguments)}}
window.MZDashOpen=async()=>{$('#acct').classList.add('on');await window.acctRender()};
setTimeout(counts,3000);setInterval(counts,60000);
})();
