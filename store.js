/* STOREFRONT MAKEOVER: builds the shop layout around the existing site (same data, player, cart, pages and admin). */
(function(){
const PROMO='New beats every week  •  Instant download after checkout';
const TICK=['New Beats Every Week','Vinyl Sample Packs','Instant Download','Royalty-Free Loops','Prod. MZPRD'];
const FAQ=[['What do I get when I buy a beat?','An instant download of the beat after checkout, with the license that matches what you picked.'],
 ['Can I use MZPRD sample packs in commercial songs?','Yes. The packs are royalty free for your beats and releases. Just do not resell the samples as they are.'],
 ['How are the samples made?','Every sound is original, recorded and made by MZPRD, so there is nothing to clear.'],
 ['How fast is delivery?','Right away. Your download is ready as soon as the payment goes through.'],
 ['Do you do custom beats?','Yes. Get in touch and tell me what you are working on.']];
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(location.pathname.includes('/admin'))return;
document.body.classList.add('store');

/* top: promo bar, centred logo, tools (the site's own buttons, moved), nav, ticker */
const top=document.createElement('div');top.id='stTop';
top.innerHTML=`<div class="st-bar">${esc(PROMO)}</div><div class="st-head"><a class="st-logo" id="stLogo">MZ<span>PRD</span></a><div class="st-tools" id="stTools"></div></div>
<nav class="st-nav"><a data-h="home" class="on">Home</a><a data-v="beats">Beats</a><a data-v="kits">Sample Packs</a><a data-v="show">Show</a><a data-v="about">About</a><a data-h="faq">FAQ</a></nav>
<div class="st-tick"><div>${Array(8).fill(TICK.map(t=>'<span>⋆ '+esc(t)+'</span>').join('')).join('')}</div></div>`;
document.body.insertBefore(top,document.body.firstChild);
const tools=document.querySelector('header .tools');if(tools)$('#stTools').appendChild(tools);

/* the home view */
const home=document.createElement('div');home.className='view';home.id='v-home';
const caseEl=$('.case');caseEl.insertBefore(home,caseEl.querySelector('.view'));

const navA=[...top.querySelectorAll('.st-nav a')];
function mark(v){navA.forEach(a=>a.classList.toggle('on',(a.dataset.v||a.dataset.h)===v))}
function showHome(push){document.title='MZPRD | Beats & Sample Packs';document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-home'));mark('home');if(push&&location.pathname!==(window.BASEPATH||'/'))history.pushState(null,'',window.BASEPATH||'/');render();scrollTo(0,0)}
navA.forEach(a=>a.onclick=()=>{if(a.dataset.v){const b=document.querySelector('header nav button[data-v="'+a.dataset.v+'"]');if(b)b.click();mark(a.dataset.v)}else if(a.dataset.h==='home')showHome(true);else{showHome(true);setTimeout(()=>{const f=$('#stFaq');if(f)f.scrollIntoView({behavior:'smooth'})},60)}});
$('#stLogo').onclick=()=>showHome(true);
/* keep the nav underline in step with the site's own view changes */
new MutationObserver(()=>{const on=document.querySelector('.view.on');if(!on)return;const v=on.id.slice(2);mark(v==='beat'?'beats':v)}).observe(caseEl,{subtree:true,attributes:true,attributeFilter:['class']});

const B=()=>{try{return beats}catch(e){return[]}},P=()=>{try{return packs}catch(e){return[]}};
const priceOf=x=>{try{return eff(x)}catch(e){return Number(x.price)||0}},m=v=>{try{return money(v)}catch(e){return'$'+Number(v).toFixed(2)}};
const cov=(x,i)=>{try{return thumb(x,i,'')}catch(e){return'<canvas></canvas>'}};
function card(kind,x,i){const isB=kind==='b',p=isB?priceOf(x):Number(x.price),full=Number(x.price),key=kind+':'+x.id,inC=(()=>{try{return cart.has(key)}catch(e){return false}})();
 return`<div class="st-card" data-k="${kind}" data-i="${i}">${''}<div class="st-cv">${cov(x,isB?i:i+2)}${x.free_download?'<span class="st-tag">FREE</span>':(!isB?'<span class="st-tag">PACK</span>':'')}${x.preview_path?'<button class="st-play" aria-label="Play '+esc(x.title)+'"><i></i></button>':''}</div>
 <div class="st-nm">${esc(x.title)}</div><button class="st-pr${inC?' in':''}">${inC?'IN CART':(p<full?'<s>'+m(full)+'</s>':'')+m(p)}</button></div>`}
function wire(root){root.querySelectorAll('.st-card').forEach(c=>{const k=c.dataset.k,i=+c.dataset.i,x=(k==='b'?B():P())[i];if(!x)return;
 c.onclick=()=>{try{goItem(k==='b'?'beat':'pack',bslug(x))}catch(e){}};
 const pl=c.querySelector('.st-play');if(pl)pl.onclick=e=>{e.stopPropagation();try{k==='b'?play(i):playPack(i)}catch(er){}};
 c.querySelector('.st-pr').onclick=e=>{e.stopPropagation();try{toggleCart(k+':'+x.id,e.currentTarget)}catch(er){}render()}});
 try{paintArt(root)}catch(e){}}
let pg=0,sig='';
function render(force){const bs=B(),ps=P(),s=bs.length+'|'+ps.length+'|'+pg+'|'+(()=>{try{return[...cart].join()}catch(e){return''}})();if(s===sig&&!force)return;sig=s;
 const all=[...bs.map((x,i)=>['b',x,i]),...ps.map((x,i)=>['p',x,i])],per=12,pages=Math.max(1,Math.ceil(all.length/per)),f=ps[0]||bs[0],fk=ps[0]?'p':'b';
 home.innerHTML=`${bs.length?`<section class="st-sec"><h2>Hot Beats 🔥</h2><div class="st-row">${bs.slice(0,3).map((x,i)=>card('b',x,i)).join('')}</div><button class="st-all" data-go="beats">View All</button></section>`:''}
 ${ps.length?`<section class="st-sec"><h2>Sample Packs</h2><div class="st-row">${ps.slice(0,3).map((x,i)=>card('p',x,i)).join('')}</div><button class="st-all" data-go="kits">View All</button></section>`:''}
 ${f?`<div class="st-feat"><div class="in"><div>${cov(f,fk==='b'?0:2)}</div><div><h3>${esc(f.title)}</h3><div class="p">${m(fk==='b'?priceOf(f):f.price)}</div>${f.description?'<div class="d">'+esc(f.description)+'</div>':''}<button class="a" id="stFa">Add to Cart</button><button class="b" id="stFb">${f.preview_path?'Play Preview':'View'}</button><button class="lnk" id="stFv">Visit product page →</button></div></div></div>`:''}
 ${all.length?`<section class="st-sec"><h2>Try These</h2><div class="st-grid">${all.slice(pg*per,pg*per+per).map(([k,x,i])=>card(k,x,i)).join('')}</div>${pages>1?'<div class="st-pg">'+[...Array(pages)].map((_,i)=>'<a data-pg="'+i+'"'+(i===pg?' class="on"':'')+'>'+(i+1)+'</a>').join('')+'</div>':''}</section>`:''}
 <section class="st-sec" id="stFaq"><h2>FAQs</h2><div class="st-faq">${FAQ.map(q=>'<details><summary>'+esc(q[0])+'</summary><p>'+esc(q[1])+'</p></details>').join('')}</div></section>`;
 wire(home);
 home.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navA.find(a=>a.dataset.v===b.dataset.go).click());
 home.querySelectorAll('[data-pg]').forEach(a=>a.onclick=()=>{pg=+a.dataset.pg;render();home.querySelector('.st-grid').scrollIntoView({behavior:'smooth',block:'start'})});
 if(f){const k=fk+':'+f.id;$('#stFa').onclick=e=>{try{toggleCart(k,e.currentTarget)}catch(er){}render(true)};$('#stFb').onclick=()=>{try{if(!f.preview_path)return goItem(fk==='b'?'beat':'pack',bslug(f));fk==='b'?play(0):playPack(0)}catch(er){}};$('#stFv').onclick=()=>{try{goItem(fk==='b'?'beat':'pack',bslug(f))}catch(er){}}}}
/* the home page is the front page */
const isRoot=()=>{const b=window.BASEPATH||'/';return location.pathname===b||location.pathname===b+'index.html'};
function tick(){render();{const on=document.querySelector('.case>.view.on');if(on){const v=on.id.slice(2);mark(v==='beat'?'beats':v)}}if(isRoot()&&!location.hash&&!document.querySelector('.view.on:not(#v-beats)')&&document.getElementById('v-beats').classList.contains('on'))showHome(false)}
addEventListener('popstate',()=>setTimeout(()=>{if(isRoot())showHome(false)},0));
setInterval(tick,700);setTimeout(()=>{if(isRoot()&&!location.hash)showHome(false)},50);
})();
